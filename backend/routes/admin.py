from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from services.maze import MazeService
from services.reward import RewardService
from services.trap import TrapService
from routes.auth import get_current_user
from schemas import MazeCreate
from models.maze import Maze

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def get_admin_user(current_user=Depends(get_current_user)):
    """Verify user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.post("/maze/create")
async def create_maze(
    maze_data: MazeCreate,
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new maze"""
    maze_service = MazeService(db)

    maze = await maze_service.create_maze(
        name=maze_data.name,
        width=maze_data.width,
        height=maze_data.height,
        big_reward_chance=maze_data.big_reward_chance,
        small_reward_chance=maze_data.small_reward_chance,
        portal_count=maze_data.portal_count
    )

    return {
        "success": True,
        "maze_id": maze.id,
        "name": maze.name,
        "size": f"{maze.width}x{maze.height}",
        "rooms_count": maze.width * maze.height
    }


@router.get("/mazes")
async def list_mazes(
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """List all mazes"""
    result = await db.execute(select(Maze))
    mazes = result.scalars().all()

    return {
        "mazes": [
            {
                "id": m.id,
                "name": m.name,
                "width": m.width,
                "height": m.height,
                "is_active": m.is_active,
                "big_reward_chance": m.big_reward_chance,
                "small_reward_chance": m.small_reward_chance,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in mazes
        ]
    }


@router.put("/maze/{maze_id}/activate")
async def activate_maze(
    maze_id: int,
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate a maze (deactivate others)"""
    # Deactivate all mazes
    result = await db.execute(select(Maze))
    for maze in result.scalars().all():
        maze.is_active = False

    # Activate selected maze
    result = await db.execute(select(Maze).where(Maze.id == maze_id))
    maze = result.scalar_one_or_none()

    if not maze:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maze not found"
        )

    maze.is_active = True
    await db.commit()

    return {"success": True, "message": f"Maze '{maze.name}' activated"}


@router.delete("/maze/{maze_id}")
async def delete_maze(
    maze_id: int,
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a maze and all its related data"""
    result = await db.execute(select(Maze).where(Maze.id == maze_id))
    maze = result.scalar_one_or_none()

    if not maze:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maze not found"
        )

    maze_name = maze.name
    await db.delete(maze)
    await db.commit()

    return {"success": True, "message": f"Maze '{maze_name}' deleted successfully"}


@router.put("/maze/{maze_id}/rewards")
async def update_reward_chances(
    maze_id: int,
    big_reward_chance: float = None,
    small_reward_chance: float = None,
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update reward spawn chances for a maze"""
    result = await db.execute(select(Maze).where(Maze.id == maze_id))
    maze = result.scalar_one_or_none()

    if not maze:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maze not found"
        )

    if big_reward_chance is not None:
        maze.big_reward_chance = big_reward_chance
    if small_reward_chance is not None:
        maze.small_reward_chance = small_reward_chance

    await db.commit()

    return {
        "success": True,
        "big_reward_chance": maze.big_reward_chance,
        "small_reward_chance": maze.small_reward_chance
    }


@router.post("/maze/{maze_id}/spawn-reward/{reward_type}")
async def spawn_reward(
    maze_id: int,
    reward_type: str,  # big or small
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually spawn a reward"""
    reward_service = RewardService(db)

    if reward_type == "big":
        reward = await reward_service.spawn_big_reward(maze_id)
    elif reward_type == "small":
        reward = await reward_service.spawn_small_reward(maze_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reward type. Use 'big' or 'small'"
        )

    if not reward:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not spawn reward (no empty rooms?)"
        )

    return {
        "success": True,
        "reward_id": reward.id,
        "room": {"x": reward.room_x, "y": reward.room_y},
        "amount": reward.amount,
        "type": reward.reward_type,
        "expires_at": reward.expires_at.isoformat()
    }


@router.post("/maze/{maze_id}/spawn-trap")
async def spawn_trap(
    maze_id: int,
    trap_type: str = None,
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually spawn a trap"""
    trap_service = TrapService(db)

    trap = await trap_service.spawn_trap(maze_id, trap_type)

    if not trap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not spawn trap"
        )

    return {
        "success": True,
        "trap_id": trap.id,
        "room": {"x": trap.room_x, "y": trap.room_y},
        "type": trap.trap_type,
        "duration": trap.duration
    }


@router.get("/stats")
async def get_stats(
    admin_user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system statistics"""
    from models.user import User
    from models.game_session import GameSession
    from models.reward import RewardClaim
    from models.transaction import Transaction
    from sqlalchemy import func

    # Count users
    user_count = await db.scalar(select(func.count(User.id)))

    # Count active sessions
    active_sessions = await db.scalar(
        select(func.count(GameSession.id)).where(GameSession.is_active == True)
    )

    # Total rewards claimed
    total_rewards = await db.scalar(
        select(func.sum(RewardClaim.amount))
    ) or 0

    # Total transactions
    transaction_count = await db.scalar(select(func.count(Transaction.id)))

    return {
        "users": user_count,
        "active_sessions": active_sessions,
        "total_rewards_claimed": round(total_rewards, 2),
        "total_transactions": transaction_count
    }
