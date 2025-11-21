import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.maze import Maze, Room
from models.trap import Trap, TrapType
from models.game_session import GameSession
from models.user import User


class TrapService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def spawn_trap(self, maze_id: int, trap_type: str = None) -> Optional[Trap]:
        """Spawn a trap in a random room"""
        # Get all rooms
        result = await self.db.execute(
            select(Room).where(Room.maze_id == maze_id)
        )
        rooms = result.scalars().all()

        if not rooms:
            return None

        # Exclude starting room
        rooms = [r for r in rooms if (r.x, r.y) != (0, 0)]
        if not rooms:
            return None

        # Choose random room
        target_room = random.choice(rooms)

        # Choose trap type if not specified
        if not trap_type:
            trap_types = [t.value for t in TrapType]
            trap_type = random.choice(trap_types)

        # Set duration based on trap type
        duration_map = {
            TrapType.TELEPORT_START.value: 0,
            TrapType.FREEZE.value: 180,  # 3 minutes
            TrapType.BLIND.value: 30,  # 30 seconds
            TrapType.SLOW.value: 60,  # 1 minute
            TrapType.REVERSE_CONTROLS.value: 45,  # 45 seconds
            TrapType.RANDOM_TELEPORT.value: 0,
            TrapType.LOSE_REWARD.value: 0
        }

        # Create trap
        trap = Trap(
            maze_id=maze_id,
            room_x=target_room.x,
            room_y=target_room.y,
            trap_type=trap_type,
            duration=duration_map.get(trap_type, 60)
        )
        self.db.add(trap)
        await self.db.commit()
        await self.db.refresh(trap)

        return trap

    async def get_active_trap_in_room(self, maze_id: int, x: int, y: int) -> Optional[Trap]:
        """Get active trap in a specific room"""
        result = await self.db.execute(
            select(Trap)
            .where(and_(
                Trap.maze_id == maze_id,
                Trap.room_x == x,
                Trap.room_y == y,
                Trap.is_active == True,
                Trap.is_triggered == False
            ))
        )
        return result.scalar_one_or_none()

    async def trigger_trap(
        self,
        trap: Trap,
        session: GameSession,
        user: User,
        maze_rooms: List[Room]
    ) -> Dict[str, Any]:
        """Trigger a trap and apply its effect"""
        trap.is_triggered = True
        trap.triggered_by_id = user.id
        trap.triggered_at = datetime.utcnow()
        trap.is_active = False

        session.traps_triggered += 1

        effect_result = {
            "trap_type": trap.trap_type,
            "duration": trap.duration
        }

        if trap.trap_type == TrapType.TELEPORT_START.value:
            # Teleport to starting room
            session.current_room_x = 0
            session.current_room_y = 0
            effect_result["teleport_to"] = {"x": 0, "y": 0}
            effect_result["message"] = "You've been teleported back to start!"

        elif trap.trap_type == TrapType.FREEZE.value:
            # Freeze player for duration
            session.is_frozen = True
            session.frozen_until = datetime.utcnow() + timedelta(seconds=trap.duration)
            effect_result["frozen_until"] = session.frozen_until.isoformat()
            effect_result["message"] = f"You're frozen for {trap.duration // 60} minutes!"

        elif trap.trap_type == TrapType.BLIND.value:
            # Client-side effect
            effect_result["message"] = f"Your vision goes dark for {trap.duration} seconds!"

        elif trap.trap_type == TrapType.SLOW.value:
            # Client-side effect
            effect_result["speed_multiplier"] = 0.5
            effect_result["message"] = f"Your movement is slowed for {trap.duration} seconds!"

        elif trap.trap_type == TrapType.REVERSE_CONTROLS.value:
            # Client-side effect
            effect_result["message"] = f"Your controls are reversed for {trap.duration} seconds!"

        elif trap.trap_type == TrapType.RANDOM_TELEPORT.value:
            # Teleport to random room
            if maze_rooms:
                target = random.choice(maze_rooms)
                session.current_room_x = target.x
                session.current_room_y = target.y
                effect_result["teleport_to"] = {"x": target.x, "y": target.y}
                effect_result["message"] = f"You've been teleported to ({target.x}, {target.y})!"

        elif trap.trap_type == TrapType.LOSE_REWARD.value:
            # Lose 10% of balance
            penalty = user.balance * 0.1
            user.balance -= penalty
            effect_result["penalty"] = penalty
            effect_result["new_balance"] = user.balance
            effect_result["message"] = f"You lost ${penalty:.2f}!"

        await self.db.commit()

        return {
            "success": True,
            "effect": effect_result
        }

    async def check_freeze_status(self, session: GameSession) -> bool:
        """Check if player is still frozen"""
        if not session.is_frozen:
            return False

        if session.frozen_until and session.frozen_until <= datetime.utcnow():
            session.is_frozen = False
            session.frozen_until = None
            await self.db.commit()
            return False

        return True

    async def get_all_traps(self, maze_id: int) -> List[Trap]:
        """Get all active traps in a maze"""
        result = await self.db.execute(
            select(Trap)
            .where(and_(
                Trap.maze_id == maze_id,
                Trap.is_active == True,
                Trap.is_triggered == False
            ))
        )
        return result.scalars().all()
