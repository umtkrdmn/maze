from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
import secrets


class Settings(BaseSettings):
    model_config = ConfigDict(extra='ignore')  # Ignore extra fields from .env

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./maze.db"

    # JWT
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Game Settings
    DEFAULT_MAZE_SIZE: int = 10
    ROOM_PRICE: float = 1.0

    # Reward Settings
    BIG_REWARD_MIN_AMOUNT: float = 1000.0
    BIG_REWARD_MAX_AMOUNT: float = 10000.0
    SMALL_REWARD_MIN_AMOUNT: float = 1.0
    SMALL_REWARD_MAX_AMOUNT: float = 50.0
    BIG_REWARD_SPAWN_CHANCE: float = 0.001  # 0.1%
    SMALL_REWARD_SPAWN_CHANCE: float = 0.05  # 5%
    BIG_REWARD_DURATION: int = 3  # seconds
    SMALL_REWARD_DURATION: int = 10  # seconds

    # Company Revenue Share
    COMPANY_REVENUE_SHARE: float = 0.3  # 30%


settings = Settings()
