from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class TransactionType(str, enum.Enum):
    ROOM_PURCHASE = "room_purchase"
    ROOM_UPGRADE = "room_upgrade"
    REWARD_CLAIM = "reward_claim"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRAP_PENALTY = "trap_penalty"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    transaction_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)  # Positive for income, negative for expense
    balance_after = Column(Float, nullable=False)

    # Reference to related entity
    reference_type = Column(String(50), nullable=True)  # room, reward, etc.
    reference_id = Column(Integer, nullable=True)

    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
