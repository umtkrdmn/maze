import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.maze import Maze, Room
from models.reward import Reward, RewardClaim, RewardType
from models.user import User
from models.transaction import Transaction, TransactionType
from models.game_session import GameSession
from config import settings


class RewardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def spawn_big_reward(self, maze_id: int) -> Optional[Reward]:
        """Spawn a big reward in a random empty room"""
        # Get all rooms
        result = await self.db.execute(
            select(Room).where(Room.maze_id == maze_id)
        )
        rooms = result.scalars().all()

        if not rooms:
            return None

        # Get rooms with active players
        active_sessions = await self.db.execute(
            select(GameSession)
            .where(and_(GameSession.maze_id == maze_id, GameSession.is_active == True))
        )
        occupied_coords = set()
        for session in active_sessions.scalars().all():
            occupied_coords.add((session.current_room_x, session.current_room_y))

        # Find empty rooms
        empty_rooms = [r for r in rooms if (r.x, r.y) not in occupied_coords]
        if not empty_rooms:
            return None

        # Choose random empty room
        target_room = random.choice(empty_rooms)

        # Generate reward amount
        amount = random.uniform(
            settings.BIG_REWARD_MIN_AMOUNT,
            settings.BIG_REWARD_MAX_AMOUNT
        )

        # Create reward
        reward = Reward(
            maze_id=maze_id,
            room_x=target_room.x,
            room_y=target_room.y,
            reward_type=RewardType.BIG.value,
            amount=round(amount, 2),
            expires_at=datetime.utcnow() + timedelta(seconds=settings.BIG_REWARD_DURATION)
        )
        self.db.add(reward)
        await self.db.commit()
        await self.db.refresh(reward)

        return reward

    async def spawn_small_reward(self, maze_id: int) -> Optional[Reward]:
        """Spawn a small reward in a random ad room"""
        # Get rooms with ads (sold rooms typically have ads)
        result = await self.db.execute(
            select(Room).where(and_(Room.maze_id == maze_id, Room.is_sold == True))
        )
        ad_rooms = result.scalars().all()

        # If no sold rooms, pick any room
        if not ad_rooms:
            result = await self.db.execute(
                select(Room).where(Room.maze_id == maze_id)
            )
            ad_rooms = result.scalars().all()

        if not ad_rooms:
            return None

        # Get rooms with active players
        active_sessions = await self.db.execute(
            select(GameSession)
            .where(and_(GameSession.maze_id == maze_id, GameSession.is_active == True))
        )
        occupied_coords = set()
        for session in active_sessions.scalars().all():
            occupied_coords.add((session.current_room_x, session.current_room_y))

        # Find empty rooms
        empty_rooms = [r for r in ad_rooms if (r.x, r.y) not in occupied_coords]
        if not empty_rooms:
            return None

        # Choose random empty room
        target_room = random.choice(empty_rooms)

        # Generate reward amount
        amount = random.uniform(
            settings.SMALL_REWARD_MIN_AMOUNT,
            settings.SMALL_REWARD_MAX_AMOUNT
        )

        # Create reward
        reward = Reward(
            maze_id=maze_id,
            room_x=target_room.x,
            room_y=target_room.y,
            reward_type=RewardType.SMALL.value,
            amount=round(amount, 2),
            expires_at=datetime.utcnow() + timedelta(seconds=settings.SMALL_REWARD_DURATION)
        )
        self.db.add(reward)
        await self.db.commit()
        await self.db.refresh(reward)

        return reward

    async def get_active_rewards(self, maze_id: int) -> List[Reward]:
        """Get all active rewards in a maze"""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Reward)
            .where(and_(
                Reward.maze_id == maze_id,
                Reward.is_claimed == False,
                Reward.is_expired == False,
                Reward.expires_at > now
            ))
        )
        return result.scalars().all()

    async def get_reward_in_room(self, maze_id: int, x: int, y: int) -> Optional[Reward]:
        """Get active reward in a specific room"""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Reward)
            .where(and_(
                Reward.maze_id == maze_id,
                Reward.room_x == x,
                Reward.room_y == y,
                Reward.is_claimed == False,
                Reward.is_expired == False,
                Reward.expires_at > now
            ))
        )
        return result.scalar_one_or_none()

    async def claim_reward(self, reward: Reward, user: User) -> Dict[str, Any]:
        """Claim a reward"""
        now = datetime.utcnow()

        # Check if reward is still valid
        if reward.is_claimed:
            return {"success": False, "error": "Reward already claimed"}
        if reward.is_expired or reward.expires_at <= now:
            reward.is_expired = True
            await self.db.commit()
            return {"success": False, "error": "Reward has expired"}

        # Claim the reward
        reward.is_claimed = True
        reward.claimed_by_id = user.id
        reward.claimed_at = now

        # Add to user balance
        user.balance += reward.amount
        new_balance = user.balance

        # Create transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.REWARD_CLAIM.value,
            amount=reward.amount,
            balance_after=new_balance,
            reference_type="reward",
            reference_id=reward.id,
            description=f"Claimed {reward.reward_type} reward: ${reward.amount}"
        )
        self.db.add(transaction)

        # Create claim record
        claim = RewardClaim(
            reward_id=reward.id,
            user_id=user.id,
            amount=reward.amount
        )
        self.db.add(claim)

        await self.db.commit()

        return {
            "success": True,
            "amount": reward.amount,
            "reward_type": reward.reward_type,
            "new_balance": new_balance,
            "is_big_reward": reward.reward_type == RewardType.BIG.value
        }

    async def expire_old_rewards(self, maze_id: int) -> int:
        """Mark expired rewards as expired"""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Reward)
            .where(and_(
                Reward.maze_id == maze_id,
                Reward.is_claimed == False,
                Reward.is_expired == False,
                Reward.expires_at <= now
            ))
        )
        rewards = result.scalars().all()

        for reward in rewards:
            reward.is_expired = True

        await self.db.commit()
        return len(rewards)

    async def should_spawn_reward(self, maze: Maze, reward_type: str) -> bool:
        """Check if a reward should spawn based on probability"""
        if reward_type == "big":
            return random.random() < maze.big_reward_chance
        else:
            return random.random() < maze.small_reward_chance
