from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel
import httpx

from database import get_db
from services.room import RoomService
from services.maze import MazeService
from routes.auth import get_current_user
from schemas import (
    RoomDesignUpdate, RoomAdCreate, AdLockSettingsUpdate,
    GenerateQuestionsRequest, AdQuestionCreate, AdQuestionUpdate,
    AdQuestionResponse, QuizAnswerRequest
)

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
                    "extra_features": r.design.extra_features if r.design else {},
                } if r.design else {
                    "template": "default",
                    "wall_color": "#808080",
                    "floor_color": "#6B4E3D",
                    "ceiling_color": "#EEEEEE",
                    "ambient_light_color": "#FFFFFF",
                    "ambient_light_intensity": 0.5,
                    "extra_features": {},
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


@router.get("/proxy")
async def proxy_media(url: str = Query(..., description="URL of the media to proxy")):
    """Proxy external media files to avoid CORS issues"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Get content type from response
            content_type = response.headers.get('content-type', 'application/octet-stream')

            # Return streaming response with CORS headers
            return StreamingResponse(
                iter([response.content]),
                media_type=content_type,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Cache-Control": "public, max-age=3600"
                }
            )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch media: {str(e)}"
        )


# ==================== Door Lock System Endpoints ====================

@router.put("/{room_id}/ad/{ad_id}/lock-settings")
async def update_ad_lock_settings(
    room_id: int,
    ad_id: int,
    settings: AdLockSettingsUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update door lock settings for an ad"""
    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    result = await room_service.update_ad_lock_settings(
        ad,
        current_user,
        settings.lock_type,
        settings.lock_timer_seconds or 10,
        settings.ad_description
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {"success": True, "message": "Lock settings updated"}


@router.post("/{room_id}/ad/{ad_id}/generate-questions")
async def generate_questions(
    room_id: int,
    ad_id: int,
    request: GenerateQuestionsRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate questions using Gemini AI"""
    from services.gemini import gemini_service

    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    if ad.room.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't own this room"
        )

    if not ad.ad_description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ad description is required for question generation"
        )

    try:
        questions = await gemini_service.generate_questions(
            ad.ad_description,
            request.question_count,
            request.option_count
        )

        return {
            "success": True,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{room_id}/ad/{ad_id}/questions")
async def get_ad_questions(
    room_id: int,
    ad_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for an ad"""
    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    questions = await room_service.get_ad_questions(ad_id)

    return {
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": q.options,
                "correct_option_index": q.correct_option_index,
                "order": q.order
            }
            for q in questions
        ]
    }


@router.post("/{room_id}/ad/{ad_id}/questions")
async def add_question(
    room_id: int,
    ad_id: int,
    question_data: AdQuestionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a question to an ad"""
    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    result = await room_service.add_question(
        ad,
        current_user,
        question_data.question_text,
        question_data.options,
        question_data.correct_option_index,
        question_data.order or 0
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.post("/{room_id}/ad/{ad_id}/questions/bulk")
async def bulk_add_questions(
    room_id: int,
    ad_id: int,
    questions: List[AdQuestionCreate],
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add multiple questions at once (for Gemini-generated questions)"""
    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    questions_data = [
        {
            "question_text": q.question_text,
            "options": q.options,
            "correct_option_index": q.correct_option_index,
            "order": q.order or i
        }
        for i, q in enumerate(questions)
    ]

    result = await room_service.bulk_add_questions(ad, current_user, questions_data)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return result


@router.put("/{room_id}/ad/{ad_id}/questions/{question_id}")
async def update_question(
    room_id: int,
    ad_id: int,
    question_id: int,
    question_data: AdQuestionUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a question"""
    room_service = RoomService(db)

    result = await room_service.update_question(
        question_id,
        current_user,
        question_data.question_text,
        question_data.options,
        question_data.correct_option_index,
        question_data.order
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {"success": True, "message": "Question updated"}


@router.delete("/{room_id}/ad/{ad_id}/questions/{question_id}")
async def delete_question(
    room_id: int,
    ad_id: int,
    question_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a question"""
    room_service = RoomService(db)

    result = await room_service.delete_question(question_id, current_user)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {"success": True, "message": "Question deleted"}


@router.delete("/{room_id}/ad/{ad_id}/questions")
async def delete_all_questions(
    room_id: int,
    ad_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all questions for an ad"""
    room_service = RoomService(db)

    ad = await room_service.get_ad_by_id(ad_id)
    if not ad or ad.room_id != room_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ad not found"
        )

    result = await room_service.delete_all_questions(ad, current_user)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {"success": True, "message": "All questions deleted"}


# ==================== Game-time Quiz Endpoints ====================

@router.get("/{room_id}/door-status")
async def get_door_status(
    room_id: int,
    entry_door: str = Query(None, description="The door player entered from"),
    db: AsyncSession = Depends(get_db)
):
    """Get door lock status for a room (used during gameplay)"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    ads = await room_service.get_room_ads_with_lock_info(room)

    # Check if room has any ads with lock enabled
    has_lock = any(ad["lock_type"] != "none" for ad in ads)

    # Build door status
    doors = []
    for direction in ["north", "south", "east", "west"]:
        has_door = getattr(room, f"door_{direction}", False)
        if not has_door:
            continue

        # Entry door is always unlocked
        is_entry = direction == entry_door
        is_locked = has_lock and not is_entry

        # Find lock info for this direction
        lock_type = None
        lock_timer = None
        has_quiz = False

        for ad in ads:
            if ad["lock_type"] != "none":
                lock_type = ad["lock_type"]
                lock_timer = ad["lock_timer_seconds"]
                has_quiz = ad["has_questions"]
                break

        doors.append({
            "direction": direction,
            "is_locked": is_locked,
            "lock_type": lock_type if is_locked else None,
            "remaining_seconds": lock_timer if is_locked and lock_type == "timer" else None,
            "has_quiz": has_quiz if is_locked else False
        })

    return {
        "entry_door": entry_door,
        "doors": doors,
        "has_ads": len(ads) > 0,
        "ads": ads
    }


@router.get("/{room_id}/quiz-question")
async def get_quiz_question(
    room_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a random quiz question for the room's ad"""
    room_service = RoomService(db)

    room = await room_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    # Find an ad with quiz lock type
    ads = await room_service.get_room_ads_with_lock_info(room)
    quiz_ad = None
    for ad in ads:
        if ad["lock_type"] == "quiz" and ad["has_questions"]:
            quiz_ad = ad
            break

    if not quiz_ad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quiz available for this room"
        )

    question = await room_service.get_random_question_for_ad(quiz_ad["id"])
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No questions available"
        )

    return {
        "question_id": question.id,
        "question_text": question.question_text,
        "options": question.options
        # Note: correct_option_index is NOT sent to client
    }


@router.post("/{room_id}/quiz-answer")
async def check_quiz_answer(
    room_id: int,
    answer: QuizAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """Check quiz answer and unlock doors if correct"""
    room_service = RoomService(db)

    result = await room_service.check_quiz_answer(
        answer.question_id,
        answer.selected_option_index
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    return {
        "correct": result["correct"],
        "correct_option_index": result["correct_option_index"],
        "unlock_doors": result["correct"],
        "cooldown_seconds": 10 if not result["correct"] else None
    }
