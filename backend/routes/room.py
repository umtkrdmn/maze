from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from database import get_db
from services.room import RoomService
from services.maze import MazeService
from routes.auth import get_current_user
from schemas import RoomDesignUpdate, RoomAdCreate

router = APIRouter(prefix="/api/room", tags=["room"])


class FindRoomRequest(BaseModel):
    maze_id: int
    door_count: int


@router.post("/find-available")
async def find_available_room(
    request: FindRoomRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Find a random available room matching the door count"""
    room_service = RoomService(db)

    room = await room_service.find_random_room_by_doors(request.maze_id, request.door_count)

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No available rooms with {request.door_count} doors found in this maze"
        )

    return {
        "room_id": room.id,
        "x": room.x,
        "y": room.y,
        "door_north": room.door_north,
        "door_south": room.door_south,
        "door_east": room.door_east,
        "door_west": room.door_west,
        "door_count": sum([room.door_north, room.door_south, room.door_east, room.door_west])
    }


@router.get("/my-rooms")
async def get_my_rooms(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all rooms owned by the current user"""
    room_service = RoomService(db)
    rooms = await room_service.get_user_rooms(current_user.id)

    return {
        "rooms": [
            {
                "id": r.id,
                "x": r.x,
                "y": r.y,
                "maze_id": r.maze_id,
                "maze_name": r.maze.name,
                "door_north": r.door_north,
                "door_south": r.door_south,
                "door_east": r.door_east,
                "door_west": r.door_west,
                "has_portal": r.has_portal,
                "sold_at": r.sold_at.isoformat() if r.sold_at else None,
                "design": {
                    "template": r.design.template if r.design else "default",
                    "wall_color": r.design.wall_color if r.design else "#808080",
                    "floor_color": r.design.floor_color if r.design else "#6B4E3D",
                    "ceiling_color": r.design.ceiling_color if r.design else "#EEEEEE",
                    "ambient_light_color": r.design.ambient_light_color if r.design else "#FFFFFF",
                    "ambient_light_intensity": r.design.ambient_light_intensity if r.design else 0.5,
                } if r.design else {
                    "template": "default",
                    "wall_color": "#808080",
                    "floor_color": "#6B4E3D",
                    "ceiling_color": "#EEEEEE",
                    "ambient_light_color": "#FFFFFF",
                    "ambient_light_intensity": 0.5,
                },
                "ads": [
                    {
                        "id": ad.id,
                        "wall": ad.wall,
                        "ad_type": ad.ad_type,
                        "content_url": ad.content_url,
                        "content_text": ad.content_text,
                        "click_url": ad.click_url,
                        "is_active": ad.is_active
                    }
                    for ad in r.ads if ad.is_active
                ]
            }
            for r in rooms
        ],
        "count": len(rooms)
    }


@router.post("/{room_id}/purchase")
async def purchase_room(
    room_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Purchase a room"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    result = await room_service.purchase_room(current_user, room)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.put("/{room_id}/design")
async def update_room_design(
    room_id: int,
    design_data: RoomDesignUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update room design (owner only)"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    result = await room_service.update_room_design(
        room,
        current_user,
        design_data.model_dump(exclude_none=True)
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=result["error"]
        )

    return {"success": True, "message": "Design updated"}


@router.post("/{room_id}/template/{template_name}")
async def apply_template(
    room_id: int,
    template_name: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply a design template to a room"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    result = await room_service.apply_template(room, current_user, template_name)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.post("/{room_id}/template/random")
async def apply_random_template(
    room_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply a random design template (I'm feeling lucky!)"""
    import random

    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    templates = [
        "halloween", "christmas", "modern_office", "old_salon",
        "spaceship", "underwater", "forest", "desert", "cyberpunk", "medieval"
    ]
    template = random.choice(templates)

    result = await room_service.apply_template(room, current_user, template)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.post("/{room_id}/ad")
async def add_room_ad(
    room_id: int,
    ad_data: RoomAdCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or update an ad on a room wall"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    result = await room_service.add_room_ad(
        room,
        current_user,
        ad_data.wall,
        ad_data.ad_type,
        ad_data.content_url,
        ad_data.content_text,
        ad_data.click_url
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.delete("/{room_id}/ad/{wall}")
async def remove_room_ad(
    room_id: int,
    wall: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove an ad from a room wall"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    result = await room_service.remove_room_ad(room, current_user, wall)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {"success": True, "message": "Ad removed"}


@router.post("/{room_id}/ad/{ad_id}/view")
async def record_ad_view(
    room_id: int,
    ad_id: int,
    duration: float = 0,
    db: AsyncSession = Depends(get_db)
):
    """Record an ad view (for analytics)"""
    room_service = RoomService(db)
    await room_service.record_ad_view(ad_id, duration)
    return {"success": True}


@router.post("/{room_id}/ad/{ad_id}/click")
async def record_ad_click(
    room_id: int,
    ad_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Record an ad click (for analytics)"""
    room_service = RoomService(db)
    await room_service.record_ad_click(ad_id)
    return {"success": True}


@router.get("/available/{maze_id}")
async def get_available_rooms(
    maze_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all available (unsold) rooms in a maze"""
    room_service = RoomService(db)
    rooms = await room_service.get_available_rooms(maze_id)

    return {
        "rooms": [
            {"id": r.id, "x": r.x, "y": r.y}
            for r in rooms
        ],
        "count": len(rooms)
    }


@router.get("/templates")
async def get_templates():
    """Get available room templates"""
    return {
        "templates": [
            {"name": "default", "display_name": "Varsayılan"},
            {"name": "halloween", "display_name": "Halloween"},
            {"name": "christmas", "display_name": "Noel"},
            {"name": "modern_office", "display_name": "Modern Ofis"},
            {"name": "old_salon", "display_name": "Eski Salon"},
            {"name": "spaceship", "display_name": "Uzay Gemisi"},
            {"name": "underwater", "display_name": "Denizaltı"},
            {"name": "forest", "display_name": "Orman"},
            {"name": "desert", "display_name": "Çöl"},
            {"name": "cyberpunk", "display_name": "Cyberpunk"},
            {"name": "medieval", "display_name": "Ortaçağ"}
        ]
    }
