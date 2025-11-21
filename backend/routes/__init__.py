from routes.auth import router as auth_router
from routes.maze import router as maze_router
from routes.room import router as room_router
from routes.character import router as character_router
from routes.admin import router as admin_router

__all__ = [
    "auth_router",
    "maze_router",
    "room_router",
    "character_router",
    "admin_router",
]
