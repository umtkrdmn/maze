from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class RewardType(str, enum.Enum):
    BIG = "big"
    SMALL = "small"


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    maze_id = Column(Integer, ForeignKey("mazes.id"), nullable=False)
    room_x = Column(Integer, nullable=False)
    room_y = Column(Integer, nullable=False)

    reward_type = Column(String(20), nullable=False)  # big, small
    amount = Column(Float, nullable=False)

    # Timing
    spawned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Status
    is_claimed = Column(Boolean, default=False)
    claimed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    claimed_at = Column(DateTime(timezone=True), nullable=True)

    is_expired = Column(Boolean, default=False)

    # Relationships
    claims = relationship("RewardClaim", back_populates="reward")


class RewardClaim(Base):
    __tablename__ = "reward_claims"

    id = Column(Integer, primary_key=True, index=True)
    reward_id = Column(Integer, ForeignKey("rewards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    claimed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    reward = relationship("Reward", back_populates="claims")
    user = relationship("User", back_populates="reward_claims")
