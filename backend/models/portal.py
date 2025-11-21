from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Portal(Base):
    __tablename__ = "portals"

    id = Column(Integer, primary_key=True, index=True)
    maze_id = Column(Integer, ForeignKey("mazes.id"), nullable=False)
    room_x = Column(Integer, nullable=False)
    room_y = Column(Integer, nullable=False)

    # Portal position in room
    position_x = Column(Integer, default=0)
    position_z = Column(Integer, default=0)

    # Visual style
    portal_style = Column(String(50), default="default")  # default, fire, ice, electric
    portal_color = Column(String(7), default="#8B00FF")  # Purple default

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Stats
    use_count = Column(Integer, default=0)
