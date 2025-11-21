from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Basic appearance
    gender = Column(String(20), default="male")  # male, female, other
    skin_color = Column(String(7), default="#F5DEB3")  # Hex color

    # Hair
    hair_style = Column(String(50), default="short")
    hair_color = Column(String(7), default="#4A3728")

    # Face
    face_shape = Column(String(50), default="oval")  # oval, round, square, heart
    eye_color = Column(String(7), default="#4A3728")

    # Facial hair (for male/other)
    beard_style = Column(String(50), default="none")
    mustache_style = Column(String(50), default="none")
    facial_hair_color = Column(String(7), default="#4A3728")

    # Body
    body_type = Column(String(50), default="average")  # slim, average, athletic, large
    height = Column(Float, default=1.75)  # meters

    # Clothing
    shirt_style = Column(String(50), default="tshirt")
    shirt_color = Column(String(7), default="#3498DB")
    pants_style = Column(String(50), default="jeans")
    pants_color = Column(String(7), default="#2C3E50")
    shoes_style = Column(String(50), default="sneakers")
    shoes_color = Column(String(7), default="#FFFFFF")

    # Accessories (JSON for flexibility)
    accessories = Column(JSON, default=list)  # ["glasses", "hat", "earring"]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="character")
