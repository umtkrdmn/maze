from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    maze_id = Column(Integer, ForeignKey("mazes.id"), nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)

    # Current position
    current_room_x = Column(Integer, default=0)
    current_room_y = Column(Integer, default=0)

    # Player position within room
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=1.6)  # Eye height
    position_z = Column(Float, default=0.0)

    # Player rotation
    rotation_yaw = Column(Float, default=0.0)
    rotation_pitch = Column(Float, default=0.0)

    # Session state
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Stats
    rooms_visited = Column(Integer, default=1)
    rewards_collected = Column(Integer, default=0)
    traps_triggered = Column(Integer, default=0)

    # Trap effects
    is_frozen = Column(Boolean, default=False)
    frozen_until = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="game_sessions")
    maze = relationship("Maze", back_populates="game_sessions")
    visited_rooms = relationship("VisitedRoom", back_populates="session", cascade="all, delete-orphan")
    player_position = relationship("PlayerPosition", back_populates="session", uselist=False)


class PlayerPosition(Base):
    """Real-time player position for multiplayer"""
    __tablename__ = "player_positions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False, unique=True)

    # Room coordinates
    room_x = Column(Integer, nullable=False)
    room_y = Column(Integer, nullable=False)

    # Position within room
    pos_x = Column(Float, default=0.0)
    pos_y = Column(Float, default=1.6)
    pos_z = Column(Float, default=0.0)

    # Rotation
    yaw = Column(Float, default=0.0)
    pitch = Column(Float, default=0.0)

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    session = relationship("GameSession", back_populates="player_position")


class VisitedRoom(Base):
    __tablename__ = "visited_rooms"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    room_x = Column(Integer, nullable=False)
    room_y = Column(Integer, nullable=False)
    visited_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("GameSession", back_populates="visited_rooms")
