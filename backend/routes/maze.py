from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from database import get_db
from services.maze import MazeService
from services.reward import RewardService
from services.trap import TrapService
from routes.auth import get_current_user
from schemas import (
    GameStartResponse, MoveRequest, MoveResponse,
    RoomResponse, RewardResponse
)

router = APIRouter(prefix="/api/maze", tags=["maze"])


@router.get("/list")
async def list_available_mazes(db: AsyncSession = Depends(get_db)):
    """Get list of all active mazes for player selection"""
    from sqlalchemy import select
    from models.maze import Maze

    result = await db.execute(
        select(Maze).where(Maze.is_active == True)
    )
    mazes = result.scalars().all()

    return {
        "mazes": [
            {
                "id": m.id,
                "name": m.name,
                "width": m.width,
                "height": m.height,
                "total_rooms": m.width * m.height
            }
            for m in mazes
        ]
    }


@router.post("/start/{maze_id}", response_model=GameStartResponse)
async def start_game_with_maze(
    maze_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a new game session with specific maze"""
    maze_service = MazeService(db)

    # Get selected maze
    maze = await maze_service.get_maze(maze_id)
    if not maze or not maze.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maze not found or not active"
        )

    # Start session
    session = await maze_service.start_game_session(current_user.id, maze.id)

    # Get starting room
    room = await maze_service.get_room(maze.id, 0, 0)
    room_data = await maze_service._room_to_dict(room)

    return GameStartResponse(
        session_token=session.session_token,
        room=RoomResponse(**room_data),
        maze_size={"width": maze.width, "height": maze.height}
    )


@router.post("/start", response_model=GameStartResponse)
async def start_game(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a new game session"""
    maze_service = MazeService(db)

    # Get active maze
    maze = await maze_service.get_active_maze()
    if not maze:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active maze found"
        )

    # Start session
    session = await maze_service.start_game_session(current_user.id, maze.id)

    # Get starting room
    room = await maze_service.get_room(maze.id, 0, 0)
    room_data = await maze_service._room_to_dict(room)

    return GameStartResponse(
        session_token=session.session_token,
        room=RoomResponse(**room_data),
        maze_size={"width": maze.width, "height": maze.height}
    )


@router.post("/move", response_model=MoveResponse)
async def move(
    move_data: MoveRequest,
    session_token: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Move to an adjacent room"""
    maze_service = MazeService(db)
    reward_service = RewardService(db)
    trap_service = TrapService(db)

    # Get session
    session = await maze_service.get_session_by_token(session_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session does not belong to you"
        )

    # Check if frozen
    is_frozen = await trap_service.check_freeze_status(session)
    if is_frozen:
        return MoveResponse(
            success=False,
            error=f"You are frozen until {session.frozen_until.isoformat()}"
        )

    # Move player
    result = await maze_service.move_player(session, move_data.direction)

    if not result["success"]:
        return MoveResponse(success=False, error=result.get("error"))

    new_x = session.current_room_x
    new_y = session.current_room_y

    # Check for reward in new room
    reward = await reward_service.get_reward_in_room(session.maze_id, new_x, new_y)
    reward_result = None
    if reward:
        claim_result = await reward_service.claim_reward(reward, current_user)
        if claim_result["success"]:
            reward_result = {
                "claimed": True,
                "amount": claim_result["amount"],
                "type": claim_result["reward_type"],
                "new_balance": claim_result["new_balance"],
                "is_big_reward": claim_result["is_big_reward"]
            }

    # Check for trap in new room
    trap = await trap_service.get_active_trap_in_room(session.maze_id, new_x, new_y)
    trap_result = None
    if trap:
        # Get all rooms for random teleport
        maze = await maze_service.get_maze(session.maze_id)
        rooms_result = await db.execute(
            "SELECT * FROM rooms WHERE maze_id = :maze_id",
            {"maze_id": session.maze_id}
        )
        rooms = []  # Simplified, would need proper query

        trigger_result = await trap_service.trigger_trap(trap, session, current_user, rooms)
        trap_result = trigger_result.get("effect")

        # If teleported, get new room data
        if trap_result.get("teleport_to"):
            new_x = trap_result["teleport_to"]["x"]
            new_y = trap_result["teleport_to"]["y"]
            room = await maze_service.get_room(session.maze_id, new_x, new_y)
            result["room"] = await maze_service._room_to_dict(room)

    return MoveResponse(
        success=True,
        room=RoomResponse(**result["room"]),
        reward=reward_result,
        trap=trap_result
    )


@router.get("/current", response_model=RoomResponse)
async def get_current_room(
    session_token: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current room info"""
    maze_service = MazeService(db)

    session = await maze_service.get_session_by_token(session_token)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )

    room = await maze_service.get_room(
        session.maze_id,
        session.current_room_x,
        session.current_room_y
    )

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    room_data = await maze_service._room_to_dict(room)

    # Check for active reward
    reward_service = RewardService(db)
    reward = await reward_service.get_reward_in_room(
        session.maze_id,
        session.current_room_x,
        session.current_room_y
    )

    if reward:
        room_data["reward"] = {
            "id": reward.id,
            "type": reward.reward_type,
            "amount": reward.amount,
            "expires_at": reward.expires_at.isoformat()
        }

    return RoomResponse(**room_data)


@router.get("/visited")
async def get_visited_rooms(
    session_token: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of visited rooms (for minimap)"""
    maze_service = MazeService(db)

    session = await maze_service.get_session_by_token(session_token)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )

    visited = [{"x": v.room_x, "y": v.room_y} for v in session.visited_rooms]

    return {
        "visited_rooms": visited,
        "current_position": {
            "x": session.current_room_x,
            "y": session.current_room_y
        }
    }


@router.post("/use-portal")
async def use_portal(
    session_token: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Use portal in current room to teleport randomly"""
    import random

    maze_service = MazeService(db)

    session = await maze_service.get_session_by_token(session_token)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )

    # Get current room
    room = await maze_service.get_room(
        session.maze_id,
        session.current_room_x,
        session.current_room_y
    )

    if not room or not room.has_portal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No portal in current room"
        )

    # Get maze
    maze = await maze_service.get_maze(session.maze_id)

    # Random destination
    new_x = random.randint(0, maze.width - 1)
    new_y = random.randint(0, maze.height - 1)

    # Update session
    session.current_room_x = new_x
    session.current_room_y = new_y

    # Add to visited
    from models.game_session import VisitedRoom
    visited = VisitedRoom(session_id=session.id, room_x=new_x, room_y=new_y)
    db.add(visited)
    await db.commit()

    # Get new room
    new_room = await maze_service.get_room(session.maze_id, new_x, new_y)
    room_data = await maze_service._room_to_dict(new_room)

    return {
        "success": True,
        "teleported_to": {"x": new_x, "y": new_y},
        "room": room_data
    }
