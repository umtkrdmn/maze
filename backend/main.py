import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession

from database import init_db, get_db
from routes.auth import router as auth_router
from routes.maze import router as maze_router
from routes.room import router as room_router
from routes.character import router as character_router
from routes.admin import router as admin_router
from websocket_handler import websocket_endpoint, manager
from services.maze import MazeService
from services.reward import RewardService


async def reward_spawner_task():
    """Background task to spawn rewards periodically"""
    from database import async_session
    from models.maze import Maze
    from sqlalchemy import select

    while True:
        try:
            async with async_session() as db:
                # Get active maze
                result = await db.execute(
                    select(Maze).where(Maze.is_active == True)
                )
                maze = result.scalar_one_or_none()

                if maze:
                    reward_service = RewardService(db)

                    # Expire old rewards
                    await reward_service.expire_old_rewards(maze.id)

                    # Try to spawn rewards based on probability
                    if await reward_service.should_spawn_reward(maze, "big"):
                        reward = await reward_service.spawn_big_reward(maze.id)
                        if reward:
                            await manager.notify_reward_spawn(
                                maze.id,
                                reward.room_x,
                                reward.room_y,
                                reward.reward_type,
                                reward.amount,
                                reward.expires_at
                            )

                    if await reward_service.should_spawn_reward(maze, "small"):
                        reward = await reward_service.spawn_small_reward(maze.id)
                        if reward:
                            await manager.notify_reward_spawn(
                                maze.id,
                                reward.room_x,
                                reward.room_y,
                                reward.reward_type,
                                reward.amount,
                                reward.expires_at
                            )

        except Exception as e:
            print(f"Reward spawner error: {e}")

        # Check every 10 seconds
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    print("Database initialized")

    # Start background tasks
    reward_task = asyncio.create_task(reward_spawner_task())

    yield

    # Shutdown
    reward_task.cancel()
    try:
        await reward_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="3D Maze Game API",
    description="Backend API for the 3D Maze Game with multiplayer support",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(maze_router)
app.include_router(room_router)
app.include_router(character_router)
app.include_router(admin_router)


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_route(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    await websocket_endpoint(websocket, token, db)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "maze-backend"}


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "3D Maze Game API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7000)
