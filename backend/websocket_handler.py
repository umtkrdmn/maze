import json
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.game_session import GameSession, PlayerPosition
from models.user import User
from models.character import Character
from services.auth import AuthService


class ConnectionManager:
    """Manages WebSocket connections for multiplayer"""

    def __init__(self):
        # room_key -> set of (websocket, user_id, session_id)
        self.room_connections: Dict[str, Set[tuple]] = {}
        # user_id -> websocket
        self.user_connections: Dict[int, WebSocket] = {}
        # websocket -> user data
        self.connection_data: Dict[WebSocket, dict] = {}

    def _room_key(self, maze_id: int, room_x: int, room_y: int) -> str:
        return f"{maze_id}:{room_x}:{room_y}"

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
        username: str,
        session_id: int,
        maze_id: int,
        room_x: int,
        room_y: int,
        character_data: dict = None
    ):
        """Connect a user to a room"""
        await websocket.accept()

        room_key = self._room_key(maze_id, room_x, room_y)

        if room_key not in self.room_connections:
            self.room_connections[room_key] = set()

        connection_tuple = (websocket, user_id, session_id)
        self.room_connections[room_key].add(connection_tuple)
        self.user_connections[user_id] = websocket
        self.connection_data[websocket] = {
            "user_id": user_id,
            "username": username,
            "session_id": session_id,
            "maze_id": maze_id,
            "room_x": room_x,
            "room_y": room_y,
            "pos_x": 0,
            "pos_y": 1.6,
            "pos_z": 0,
            "yaw": 0,
            "pitch": 0,
            "character": character_data
        }

        # Notify others in room
        await self.broadcast_to_room(
            room_key,
            {
                "type": "player_joined",
                "user_id": user_id,
                "username": username,
                "character": character_data
            },
            exclude_websocket=websocket
        )

        # Send current players in room to new connection
        players_in_room = await self.get_players_in_room(room_key, exclude_user=user_id)
        await websocket.send_json({
            "type": "room_players",
            "players": players_in_room
        })

    async def disconnect(self, websocket: WebSocket):
        """Disconnect a user"""
        if websocket not in self.connection_data:
            return

        data = self.connection_data[websocket]
        user_id = data["user_id"]
        room_key = self._room_key(data["maze_id"], data["room_x"], data["room_y"])

        # Remove from room
        if room_key in self.room_connections:
            self.room_connections[room_key] = {
                conn for conn in self.room_connections[room_key]
                if conn[0] != websocket
            }
            if not self.room_connections[room_key]:
                del self.room_connections[room_key]

        # Remove user connection
        if user_id in self.user_connections:
            del self.user_connections[user_id]

        # Remove connection data
        del self.connection_data[websocket]

        # Notify others
        await self.broadcast_to_room(
            room_key,
            {
                "type": "player_left",
                "user_id": user_id,
                "username": data["username"]
            }
        )

    async def change_room(
        self,
        websocket: WebSocket,
        new_room_x: int,
        new_room_y: int
    ):
        """Move player to a new room"""
        if websocket not in self.connection_data:
            return

        data = self.connection_data[websocket]
        old_room_key = self._room_key(data["maze_id"], data["room_x"], data["room_y"])
        new_room_key = self._room_key(data["maze_id"], new_room_x, new_room_y)

        # Remove from old room
        if old_room_key in self.room_connections:
            self.room_connections[old_room_key] = {
                conn for conn in self.room_connections[old_room_key]
                if conn[0] != websocket
            }

            # Notify old room
            await self.broadcast_to_room(
                old_room_key,
                {
                    "type": "player_left",
                    "user_id": data["user_id"],
                    "username": data["username"]
                }
            )

        # Update data
        data["room_x"] = new_room_x
        data["room_y"] = new_room_y

        # Add to new room
        if new_room_key not in self.room_connections:
            self.room_connections[new_room_key] = set()

        self.room_connections[new_room_key].add(
            (websocket, data["user_id"], data["session_id"])
        )

        # Notify new room
        await self.broadcast_to_room(
            new_room_key,
            {
                "type": "player_joined",
                "user_id": data["user_id"],
                "username": data["username"],
                "character": data["character"]
            },
            exclude_websocket=websocket
        )

        # Send players in new room
        players = await self.get_players_in_room(new_room_key, exclude_user=data["user_id"])
        await websocket.send_json({
            "type": "room_players",
            "players": players
        })

    async def update_position(
        self,
        websocket: WebSocket,
        pos_x: float,
        pos_y: float,
        pos_z: float,
        yaw: float,
        pitch: float
    ):
        """Update player position and broadcast to room"""
        if websocket not in self.connection_data:
            return

        data = self.connection_data[websocket]
        data["pos_x"] = pos_x
        data["pos_y"] = pos_y
        data["pos_z"] = pos_z
        data["yaw"] = yaw
        data["pitch"] = pitch

        room_key = self._room_key(data["maze_id"], data["room_x"], data["room_y"])

        await self.broadcast_to_room(
            room_key,
            {
                "type": "player_moved",
                "user_id": data["user_id"],
                "pos_x": pos_x,
                "pos_y": pos_y,
                "pos_z": pos_z,
                "yaw": yaw,
                "pitch": pitch
            },
            exclude_websocket=websocket
        )

    async def send_chat(self, websocket: WebSocket, message: str):
        """Send chat message to room"""
        if websocket not in self.connection_data:
            return

        data = self.connection_data[websocket]
        room_key = self._room_key(data["maze_id"], data["room_x"], data["room_y"])

        await self.broadcast_to_room(
            room_key,
            {
                "type": "chat_message",
                "user_id": data["user_id"],
                "username": data["username"],
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    async def broadcast_to_room(
        self,
        room_key: str,
        message: dict,
        exclude_websocket: WebSocket = None
    ):
        """Broadcast message to all users in a room"""
        if room_key not in self.room_connections:
            return

        for ws, user_id, session_id in self.room_connections[room_key]:
            if ws != exclude_websocket:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_maze(self, maze_id: int, message: dict):
        """Broadcast message to all users in a maze"""
        for room_key in self.room_connections:
            if room_key.startswith(f"{maze_id}:"):
                for ws, user_id, session_id in self.room_connections[room_key]:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass

    async def get_players_in_room(
        self,
        room_key: str,
        exclude_user: int = None
    ) -> list:
        """Get all players in a room"""
        players = []
        if room_key not in self.room_connections:
            return players

        for ws, user_id, session_id in self.room_connections[room_key]:
            if user_id != exclude_user and ws in self.connection_data:
                data = self.connection_data[ws]
                players.append({
                    "user_id": user_id,
                    "username": data["username"],
                    "pos_x": data["pos_x"],
                    "pos_y": data["pos_y"],
                    "pos_z": data["pos_z"],
                    "yaw": data["yaw"],
                    "pitch": data["pitch"],
                    "character": data["character"]
                })

        return players

    async def notify_reward_spawn(
        self,
        maze_id: int,
        room_x: int,
        room_y: int,
        reward_type: str,
        amount: float,
        expires_at: datetime
    ):
        """Notify about a reward spawn"""
        room_key = self._room_key(maze_id, room_x, room_y)

        # Only notify players in that room
        await self.broadcast_to_room(
            room_key,
            {
                "type": "reward_spawned",
                "room_x": room_x,
                "room_y": room_y,
                "reward_type": reward_type,
                "amount": amount,
                "expires_at": expires_at.isoformat()
            }
        )

    async def notify_reward_claimed(
        self,
        maze_id: int,
        reward_type: str,
        amount: float,
        winner_username: str,
        is_big_reward: bool
    ):
        """Notify all players about a claimed reward"""
        message = {
            "type": "reward_claimed",
            "reward_type": reward_type,
            "amount": amount,
            "winner": winner_username,
            "is_big_reward": is_big_reward
        }

        if is_big_reward:
            message["game_ended"] = True
            message["message"] = f"{winner_username} büyük ödülü kazandı: ${amount}!"

        await self.broadcast_to_maze(maze_id, message)


# Global connection manager
manager = ConnectionManager()


async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: AsyncSession
):
    """Main WebSocket endpoint handler"""
    # Authenticate
    auth_service = AuthService(db)
    payload = auth_service.decode_token(token)

    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = int(payload.get("sub"))
    user = await auth_service.get_user_by_id(user_id)

    if not user:
        await websocket.close(code=4001, reason="User not found")
        return

    # Get active session
    result = await db.execute(
        select(GameSession)
        .where(and_(GameSession.user_id == user_id, GameSession.is_active == True))
        .order_by(GameSession.started_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()

    if not session:
        await websocket.close(code=4002, reason="No active game session")
        return

    # Get character
    result = await db.execute(
        select(Character).where(Character.user_id == user_id)
    )
    character = result.scalar_one_or_none()
    character_data = None
    if character:
        character_data = {
            "gender": character.gender,
            "skin_color": character.skin_color,
            "hair_style": character.hair_style,
            "hair_color": character.hair_color,
            "shirt_style": character.shirt_style,
            "shirt_color": character.shirt_color,
            "pants_style": character.pants_style,
            "pants_color": character.pants_color
        }

    # Connect
    await manager.connect(
        websocket,
        user.id,
        user.username,
        session.id,
        session.maze_id,
        session.current_room_x,
        session.current_room_y,
        character_data
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "position_update":
                await manager.update_position(
                    websocket,
                    data.get("pos_x", 0),
                    data.get("pos_y", 1.6),
                    data.get("pos_z", 0),
                    data.get("yaw", 0),
                    data.get("pitch", 0)
                )

            elif msg_type == "room_change":
                await manager.change_room(
                    websocket,
                    data.get("room_x"),
                    data.get("room_y")
                )

            elif msg_type == "chat":
                message = data.get("message", "").strip()
                if message and len(message) <= 500:
                    await manager.send_chat(websocket, message)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)
