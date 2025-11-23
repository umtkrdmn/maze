from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class RoomTemplate(str, enum.Enum):
    DEFAULT = "default"
    HALLOWEEN = "halloween"
    CHRISTMAS = "christmas"
    MODERN_OFFICE = "modern_office"
    OLD_SALON = "old_salon"
    SPACESHIP = "spaceship"
    UNDERWATER = "underwater"
    FOREST = "forest"
    DESERT = "desert"
    CYBERPUNK = "cyberpunk"
    MEDIEVAL = "medieval"
    RANDOM = "random"


class Maze(Base):
    __tablename__ = "mazes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    width = Column(Integer, nullable=False, default=10)
    height = Column(Integer, nullable=False, default=10)
    is_active = Column(Boolean, default=True)
    big_reward_chance = Column(Float, default=0.001)
    small_reward_chance = Column(Float, default=0.05)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    rooms = relationship("Room", back_populates="maze", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="maze", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    maze_id = Column(Integer, ForeignKey("mazes.id"), nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)

    # Doors
    door_north = Column(Boolean, default=False)
    door_south = Column(Boolean, default=False)
    door_east = Column(Boolean, default=False)
    door_west = Column(Boolean, default=False)

    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_sold = Column(Boolean, default=False)
    sold_at = Column(DateTime(timezone=True), nullable=True)

    # Portal
    has_portal = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    maze = relationship("Maze", back_populates="rooms")
    owner = relationship("User", back_populates="owned_rooms")
    design = relationship("RoomDesign", back_populates="room", uselist=False, cascade="all, delete-orphan")
    ads = relationship("RoomAd", back_populates="room", cascade="all, delete-orphan")


class RoomDesign(Base):
    __tablename__ = "room_designs"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, unique=True)

    # Template or custom
    template = Column(String(50), default=RoomTemplate.DEFAULT.value)

    # Wall customization
    wall_color = Column(String(7), default="#808080")  # Hex color
    wall_texture_url = Column(String(500), nullable=True)

    # Floor customization
    floor_color = Column(String(7), default="#6B4E3D")
    floor_texture_url = Column(String(500), nullable=True)

    # Ceiling customization
    ceiling_color = Column(String(7), default="#EEEEEE")
    ceiling_texture_url = Column(String(500), nullable=True)

    # Door customization
    door_model = Column(String(50), default="standard")
    door_color = Column(String(7), default="#8B4513")
    door_handle_type = Column(String(50), default="gold_round")

    # Baseboard
    baseboard_color = Column(String(7), default="#4A3728")
    baseboard_height = Column(Float, default=0.3)

    # Lighting
    ambient_light_color = Column(String(7), default="#FFFFFF")
    ambient_light_intensity = Column(Float, default=0.5)
    spotlight_enabled = Column(Boolean, default=False)
    spotlight_color = Column(String(7), default="#FFFFFF")

    # Extra features (JSON for flexibility)
    extra_features = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    room = relationship("Room", back_populates="design")


class RoomAd(Base):
    __tablename__ = "room_ads"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)

    # Which wall
    wall = Column(String(10), nullable=False)  # north, south, east, west

    # Ad type
    ad_type = Column(String(20), nullable=False)  # image, video, canvas

    # Content
    content_url = Column(String(500), nullable=True)
    content_text = Column(String(200), nullable=True)

    # Click tracking
    click_url = Column(String(500), nullable=True)
    click_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    total_view_duration = Column(Float, default=0.0)  # seconds

    # Display settings
    width = Column(Float, default=9.0)
    height = Column(Float, default=4.5)
    position_y = Column(Float, default=2.5)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    room = relationship("Room", back_populates="ads")
