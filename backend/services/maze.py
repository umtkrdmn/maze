import random
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from models.maze import Maze, Room, RoomDesign, RoomAd, RoomTemplate
from models.game_session import GameSession, VisitedRoom, PlayerPosition
from models.portal import Portal
from config import settings


class MazeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_maze(
        self,
        name: str,
        width: int = 10,
        height: int = 10,
        big_reward_chance: float = None,
        small_reward_chance: float = None,
        portal_count: int = 5
    ) -> Maze:
        """Create a new maze with rooms"""
        maze = Maze(
            name=name,
            width=width,
            height=height,
            big_reward_chance=big_reward_chance or settings.BIG_REWARD_SPAWN_CHANCE,
            small_reward_chance=small_reward_chance or settings.SMALL_REWARD_SPAWN_CHANCE
        )
        self.db.add(maze)
        await self.db.flush()

        # Generate rooms
        rooms = []
        for y in range(height):
            for x in range(width):
                room = Room(
                    maze_id=maze.id,
                    x=x,
                    y=y
                )
                rooms.append(room)
                self.db.add(room)

        await self.db.flush()

        # Generate doors (ensure connectivity)
        await self._generate_doors(rooms, width, height)

        # Generate random designs for all rooms
        for room in rooms:
            design = self._generate_random_design(room.id)
            self.db.add(design)

            # Generate ads for walls without doors
            await self._generate_random_ads(room)

        # Add portals
        await self._add_portals(maze.id, rooms, portal_count)

        await self.db.commit()
        await self.db.refresh(maze)
        return maze

    async def _generate_doors(self, rooms: List[Room], width: int, height: int):
        """Generate doors using iterative DFS to ensure all rooms are connected"""
        room_map = {(r.x, r.y): r for r in rooms}
        visited = set()

        # Iterative DFS using explicit stack
        stack = [(0, 0)]  # Start from (0, 0)

        while stack:
            x, y = stack[-1]  # Peek at top of stack

            if (x, y) in visited:
                stack.pop()
                continue

            visited.add((x, y))
            room = room_map.get((x, y))

            # Possible directions: North, South, East, West
            directions = [
                ('north', 0, 1, 'south'),   # (direction, dx, dy, opposite_direction)
                ('south', 0, -1, 'north'),
                ('east', 1, 0, 'west'),
                ('west', -1, 0, 'east')
            ]

            # Shuffle for randomness
            random.shuffle(directions)

            found_unvisited = False
            for direction, dx, dy, opposite in directions:
                nx, ny = x + dx, y + dy

                # Check bounds
                if not (0 <= nx < width and 0 <= ny < height):
                    continue

                neighbor = room_map.get((nx, ny))
                if not neighbor or (nx, ny) in visited:
                    continue

                # Create door connection
                setattr(room, f'door_{direction}', True)
                setattr(neighbor, f'door_{opposite}', True)

                # Add neighbor to stack for exploration
                stack.append((nx, ny))
                found_unvisited = True
                break  # Process one neighbor at a time (DFS behavior)

            if not found_unvisited:
                stack.pop()  # Backtrack if no unvisited neighbors

        # Add extra doors for loops (30% chance per unconnected edge)
        for room in rooms:
            x, y = room.x, room.y

            # Check north
            if y < height - 1 and not room.door_north and random.random() < 0.3:
                neighbor = room_map.get((x, y + 1))
                if neighbor:
                    room.door_north = True
                    neighbor.door_south = True

            # Check east
            if x < width - 1 and not room.door_east and random.random() < 0.3:
                neighbor = room_map.get((x + 1, y))
                if neighbor:
                    room.door_east = True
                    neighbor.door_west = True

    def _generate_random_design(self, room_id: int) -> RoomDesign:
        """Generate random room design"""
        templates = list(RoomTemplate)
        template = random.choice(templates)

        # Define template colors/styles
        template_styles = {
            RoomTemplate.DEFAULT: {
                "wall_color": "#808080",
                "floor_color": "#6B4E3D",
                "ceiling_color": "#EEEEEE",
                "ambient_light_intensity": 0.5
            },
            RoomTemplate.HALLOWEEN: {
                "wall_color": "#2D1B2D",
                "floor_color": "#1A1A1A",
                "ceiling_color": "#0D0D0D",
                "ambient_light_color": "#FF6600",
                "ambient_light_intensity": 0.3
            },
            RoomTemplate.CHRISTMAS: {
                "wall_color": "#C41E3A",
                "floor_color": "#228B22",
                "ceiling_color": "#FFFFFF",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.6
            },
            RoomTemplate.MODERN_OFFICE: {
                "wall_color": "#F5F5F5",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#FFFFFF",
                "ambient_light_intensity": 0.7
            },
            RoomTemplate.OLD_SALON: {
                "wall_color": "#8B4513",
                "floor_color": "#654321",
                "ceiling_color": "#DEB887",
                "ambient_light_color": "#FFF8DC",
                "ambient_light_intensity": 0.4
            },
            RoomTemplate.SPACESHIP: {
                "wall_color": "#1C1C1C",
                "floor_color": "#2F2F2F",
                "ceiling_color": "#0A0A0A",
                "ambient_light_color": "#00FFFF",
                "ambient_light_intensity": 0.4
            },
            RoomTemplate.UNDERWATER: {
                "wall_color": "#006994",
                "floor_color": "#0077BE",
                "ceiling_color": "#00CED1",
                "ambient_light_color": "#40E0D0",
                "ambient_light_intensity": 0.5
            },
            RoomTemplate.FOREST: {
                "wall_color": "#228B22",
                "floor_color": "#3D2914",
                "ceiling_color": "#90EE90",
                "ambient_light_color": "#ADFF2F",
                "ambient_light_intensity": 0.5
            },
            RoomTemplate.DESERT: {
                "wall_color": "#EDC9AF",
                "floor_color": "#C2B280",
                "ceiling_color": "#87CEEB",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.8
            },
            RoomTemplate.CYBERPUNK: {
                "wall_color": "#0D0D0D",
                "floor_color": "#1A1A2E",
                "ceiling_color": "#16213E",
                "ambient_light_color": "#FF00FF",
                "ambient_light_intensity": 0.4
            },
            RoomTemplate.MEDIEVAL: {
                "wall_color": "#696969",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#2F2F2F",
                "ambient_light_color": "#FFA500",
                "ambient_light_intensity": 0.3
            }
        }

        style = template_styles.get(template, template_styles[RoomTemplate.DEFAULT])

        return RoomDesign(
            room_id=room_id,
            template=template.value if template != RoomTemplate.RANDOM else random.choice(list(RoomTemplate)[:-1]).value,
            wall_color=style.get("wall_color", "#808080"),
            floor_color=style.get("floor_color", "#6B4E3D"),
            ceiling_color=style.get("ceiling_color", "#EEEEEE"),
            ambient_light_color=style.get("ambient_light_color", "#FFFFFF"),
            ambient_light_intensity=style.get("ambient_light_intensity", 0.5)
        )

    async def _generate_random_ads(self, room: Room):
        """Generate placeholder ads for walls without doors"""
        walls_without_doors = []
        if not room.door_north:
            walls_without_doors.append("north")
        if not room.door_south:
            walls_without_doors.append("south")
        if not room.door_east:
            walls_without_doors.append("east")
        if not room.door_west:
            walls_without_doors.append("west")

        ad_types = ["image", "video", "canvas"]
        sample_ads = [
            {"type": "canvas", "text": "Reklam Alanı", "color": "#3498DB"},
            {"type": "canvas", "text": "Sponsor", "color": "#E74C3C"},
            {"type": "canvas", "text": "İlan Ver", "color": "#2ECC71"},
        ]

        for wall in walls_without_doors:
            ad_config = random.choice(sample_ads)
            ad = RoomAd(
                room_id=room.id,
                wall=wall,
                ad_type=ad_config["type"],
                content_text=ad_config.get("text"),
                content_url=ad_config.get("url")
            )
            self.db.add(ad)

    async def _add_portals(self, maze_id: int, rooms: List[Room], count: int):
        """Add portals to random rooms"""
        eligible_rooms = [r for r in rooms if (r.x, r.y) != (0, 0)]
        portal_rooms = random.sample(eligible_rooms, min(count, len(eligible_rooms)))

        for room in portal_rooms:
            room.has_portal = True
            portal = Portal(
                maze_id=maze_id,
                room_x=room.x,
                room_y=room.y,
                portal_style=random.choice(["default", "fire", "ice", "electric"]),
                portal_color=random.choice(["#8B00FF", "#FF4500", "#00CED1", "#FFD700"])
            )
            self.db.add(portal)

    async def get_maze(self, maze_id: int) -> Optional[Maze]:
        result = await self.db.execute(
            select(Maze).where(Maze.id == maze_id)
        )
        return result.scalar_one_or_none()

    async def get_active_maze(self) -> Optional[Maze]:
        result = await self.db.execute(
            select(Maze).where(Maze.is_active == True).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_room(self, maze_id: int, x: int, y: int) -> Optional[Room]:
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.design), selectinload(Room.ads))
            .where(and_(Room.maze_id == maze_id, Room.x == x, Room.y == y))
        )
        return result.scalar_one_or_none()

    async def start_game_session(self, user_id: int, maze_id: int) -> GameSession:
        """Start a new game session"""
        session_token = secrets.token_urlsafe(32)

        session = GameSession(
            user_id=user_id,
            maze_id=maze_id,
            session_token=session_token,
            current_room_x=0,
            current_room_y=0
        )
        self.db.add(session)
        await self.db.flush()

        # Add starting room to visited
        visited = VisitedRoom(
            session_id=session.id,
            room_x=0,
            room_y=0
        )
        self.db.add(visited)

        # Create player position
        position = PlayerPosition(
            session_id=session.id,
            room_x=0,
            room_y=0
        )
        self.db.add(position)

        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_session_by_token(self, token: str) -> Optional[GameSession]:
        result = await self.db.execute(
            select(GameSession)
            .options(selectinload(GameSession.visited_rooms))
            .where(and_(GameSession.session_token == token, GameSession.is_active == True))
        )
        return result.scalar_one_or_none()

    async def move_player(
        self,
        session: GameSession,
        direction: str
    ) -> Dict[str, Any]:
        """Move player to adjacent room"""
        dx, dy = 0, 0
        if direction == "north":
            dy = 1
        elif direction == "south":
            dy = -1
        elif direction == "east":
            dx = 1
        elif direction == "west":
            dx = -1
        else:
            return {"success": False, "error": "Invalid direction"}

        # Get current room
        current_room = await self.get_room(session.maze_id, session.current_room_x, session.current_room_y)
        if not current_room:
            return {"success": False, "error": "Current room not found"}

        # Check if door exists
        door_attr = f"door_{direction}"
        if not getattr(current_room, door_attr):
            return {"success": False, "error": "No door in that direction"}

        # Calculate new position
        new_x = session.current_room_x + dx
        new_y = session.current_room_y + dy

        print(f"🔍 MOVE DEBUG: direction={direction}, dx={dx}, dy={dy}")
        print(f"🔍 MOVE DEBUG: current=({session.current_room_x}, {session.current_room_y})")
        print(f"🔍 MOVE DEBUG: calculated new=({new_x}, {new_y})")

        # Get new room
        new_room = await self.get_room(session.maze_id, new_x, new_y)
        print(f"🔍 MOVE DEBUG: new_room found: {new_room is not None}")
        if new_room:
            print(f"🔍 MOVE DEBUG: new_room coordinates: ({new_room.x}, {new_room.y})")

        if not new_room:
            return {"success": False, "error": "No room in that direction"}

        # Update session
        session.current_room_x = new_x
        session.current_room_y = new_y
        session.rooms_visited += 1

        # Add to visited rooms if not already visited
        existing_visit = None
        for v in session.visited_rooms:
            if v.room_x == new_x and v.room_y == new_y:
                existing_visit = v
                break

        if not existing_visit:
            visited = VisitedRoom(
                session_id=session.id,
                room_x=new_x,
                room_y=new_y
            )
            self.db.add(visited)

        await self.db.commit()

        return {
            "success": True,
            "room": await self._room_to_dict(new_room)
        }

    async def _room_to_dict(self, room: Room) -> Dict[str, Any]:
        """Convert room to dictionary for API response"""
        # Convert ads array to dict keyed by wall direction
        ads_dict = {}
        wallTextures_dict = {}
        if room.ads:
            for ad in room.ads:
                ads_dict[ad.wall] = {
                    "type": ad.ad_type,
                    "url": ad.content_url,
                    "text": ad.content_text,
                    "click_url": ad.click_url
                }
                # Also set wallTextures for compatibility
                if ad.content_url:
                    wallTextures_dict[ad.wall] = ad.content_url

        return {
            "x": room.x,
            "y": room.y,
            "doors": {
                "north": room.door_north,
                "south": room.door_south,
                "east": room.door_east,
                "west": room.door_west
            },
            "has_portal": room.has_portal,
            "is_sold": room.is_sold,
            "owner_id": room.owner_id,
            "design": {
                "template": room.design.template if room.design else "default",
                "wall_color": room.design.wall_color if room.design else "#808080",
                "floor_color": room.design.floor_color if room.design else "#6B4E3D",
                "ceiling_color": room.design.ceiling_color if room.design else "#EEEEEE",
                "door_color": room.design.door_color if room.design else "#8B4513",
                "door_handle_type": room.design.door_handle_type if room.design else "gold_round",
                "baseboard_color": room.design.baseboard_color if room.design else "#4A3728",
                "ambient_light_color": room.design.ambient_light_color if room.design else "#FFFFFF",
                "ambient_light_intensity": room.design.ambient_light_intensity if room.design else 0.5
            } if room.design else None,
            "ads": ads_dict,
            "wallTextures": wallTextures_dict
        }
