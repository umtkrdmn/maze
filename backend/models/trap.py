from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TrapType(str, enum.Enum):
    TELEPORT_START = "teleport_start"  # Teleport to starting room
    FREEZE = "freeze"  # Cannot move for X minutes
    BLIND = "blind"  # Screen goes dark temporarily
    SLOW = "slow"  # Movement speed reduced
    REVERSE_CONTROLS = "reverse_controls"  # Controls are reversed
    RANDOM_TELEPORT = "random_teleport"  # Teleport to random room
    LOSE_REWARD = "lose_reward"  # Lose a portion of collected rewards


class Trap(Base):
    __tablename__ = "traps"

    id = Column(Integer, primary_key=True, index=True)
    maze_id = Column(Integer, ForeignKey("mazes.id"), nullable=False)
    room_x = Column(Integer, nullable=False)
    room_y = Column(Integer, nullable=False)

    trap_type = Column(String(50), nullable=False)

    # Effect parameters
    duration = Column(Integer, default=180)  # seconds (default 3 minutes)
    intensity = Column(Float, default=1.0)  # For slow trap: 0.5 = 50% speed

    # Timing
    spawned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_triggered = Column(Boolean, default=False)
    triggered_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    triggered_at = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
