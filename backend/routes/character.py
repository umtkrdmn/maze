from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.character import CharacterService
from routes.auth import get_current_user
from schemas import CharacterCreate, CharacterUpdate, CharacterResponse

router = APIRouter(prefix="/api/character", tags=["character"])


@router.get("/me", response_model=CharacterResponse)
async def get_my_character(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's character"""
    char_service = CharacterService(db)

    character = await char_service.get_character(current_user.id)
    if not character:
        # Create default character if not exists
        character = await char_service.create_character(current_user.id)

    return character


@router.put("/me", response_model=CharacterResponse)
async def update_my_character(
    char_data: CharacterUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's character"""
    char_service = CharacterService(db)

    character = await char_service.get_character(current_user.id)
    if not character:
        character = await char_service.create_character(
            current_user.id,
            char_data.model_dump(exclude_none=True)
        )
    else:
        character = await char_service.update_character(
            character,
            char_data.model_dump(exclude_none=True)
        )

    return character


@router.get("/options")
async def get_character_options():
    """Get all available character customization options"""
    return {
        "gender": CharacterService.GENDER_OPTIONS,
        "skin_color": CharacterService.SKIN_COLOR_OPTIONS,
        "hair_style": CharacterService.HAIR_STYLE_OPTIONS,
        "hair_color": CharacterService.HAIR_COLOR_OPTIONS,
        "face_shape": CharacterService.FACE_SHAPE_OPTIONS,
        "eye_color": CharacterService.EYE_COLOR_OPTIONS,
        "beard_style": CharacterService.BEARD_STYLE_OPTIONS,
        "mustache_style": CharacterService.MUSTACHE_STYLE_OPTIONS,
        "body_type": CharacterService.BODY_TYPE_OPTIONS,
        "shirt_style": CharacterService.SHIRT_STYLE_OPTIONS,
        "pants_style": CharacterService.PANTS_STYLE_OPTIONS,
        "shoes_style": CharacterService.SHOES_STYLE_OPTIONS,
        "accessories": CharacterService.ACCESSORY_OPTIONS
    }


@router.post("/randomize", response_model=CharacterResponse)
async def randomize_character(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Randomize character appearance"""
    import random

    char_service = CharacterService(db)

    random_data = {
        "gender": random.choice(CharacterService.GENDER_OPTIONS),
        "skin_color": random.choice(CharacterService.SKIN_COLOR_OPTIONS),
        "hair_style": random.choice(CharacterService.HAIR_STYLE_OPTIONS),
        "hair_color": random.choice(CharacterService.HAIR_COLOR_OPTIONS),
        "face_shape": random.choice(CharacterService.FACE_SHAPE_OPTIONS),
        "eye_color": random.choice(CharacterService.EYE_COLOR_OPTIONS),
        "body_type": random.choice(CharacterService.BODY_TYPE_OPTIONS),
        "height": round(random.uniform(1.5, 2.0), 2),
        "shirt_style": random.choice(CharacterService.SHIRT_STYLE_OPTIONS),
        "shirt_color": f"#{random.randint(0, 0xFFFFFF):06x}",
        "pants_style": random.choice(CharacterService.PANTS_STYLE_OPTIONS),
        "pants_color": f"#{random.randint(0, 0xFFFFFF):06x}",
        "shoes_style": random.choice(CharacterService.SHOES_STYLE_OPTIONS),
        "shoes_color": f"#{random.randint(0, 0xFFFFFF):06x}",
        "accessories": random.sample(
            CharacterService.ACCESSORY_OPTIONS,
            k=random.randint(0, 3)
        )
    }

    # Add facial hair for male/other
    if random_data["gender"] in ["male", "other"]:
        random_data["beard_style"] = random.choice(CharacterService.BEARD_STYLE_OPTIONS)
        random_data["mustache_style"] = random.choice(CharacterService.MUSTACHE_STYLE_OPTIONS)
        random_data["facial_hair_color"] = random_data["hair_color"]
    else:
        random_data["beard_style"] = "none"
        random_data["mustache_style"] = "none"

    character = await char_service.get_character(current_user.id)
    if not character:
        character = await char_service.create_character(current_user.id, random_data)
    else:
        character = await char_service.update_character(character, random_data)

    return character
