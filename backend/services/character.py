from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.character import Character
from models.user import User


class CharacterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_character(self, user_id: int) -> Optional[Character]:
        """Get user's character"""
        result = await self.db.execute(
            select(Character).where(Character.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_character(self, user_id: int, data: Dict[str, Any] = None) -> Character:
        """Create a new character for user"""
        data = data or {}
        character = Character(
            user_id=user_id,
            gender=data.get("gender", "male"),
            skin_color=data.get("skin_color", "#F5DEB3"),
            hair_style=data.get("hair_style", "short"),
            hair_color=data.get("hair_color", "#4A3728"),
            face_shape=data.get("face_shape", "oval"),
            eye_color=data.get("eye_color", "#4A3728"),
            beard_style=data.get("beard_style", "none"),
            mustache_style=data.get("mustache_style", "none"),
            facial_hair_color=data.get("facial_hair_color", "#4A3728"),
            body_type=data.get("body_type", "average"),
            height=data.get("height", 1.75),
            shirt_style=data.get("shirt_style", "tshirt"),
            shirt_color=data.get("shirt_color", "#3498DB"),
            pants_style=data.get("pants_style", "jeans"),
            pants_color=data.get("pants_color", "#2C3E50"),
            shoes_style=data.get("shoes_style", "sneakers"),
            shoes_color=data.get("shoes_color", "#FFFFFF"),
            accessories=data.get("accessories", [])
        )
        self.db.add(character)
        await self.db.commit()
        await self.db.refresh(character)
        return character

    async def update_character(
        self,
        character: Character,
        data: Dict[str, Any]
    ) -> Character:
        """Update character appearance"""
        updatable_fields = [
            "gender", "skin_color", "hair_style", "hair_color",
            "face_shape", "eye_color", "beard_style", "mustache_style",
            "facial_hair_color", "body_type", "height",
            "shirt_style", "shirt_color", "pants_style", "pants_color",
            "shoes_style", "shoes_color", "accessories"
        ]

        for field in updatable_fields:
            if field in data:
                setattr(character, field, data[field])

        await self.db.commit()
        await self.db.refresh(character)
        return character

    def character_to_dict(self, character: Character) -> Dict[str, Any]:
        """Convert character to dictionary"""
        return {
            "id": character.id,
            "user_id": character.user_id,
            "gender": character.gender,
            "skin_color": character.skin_color,
            "hair_style": character.hair_style,
            "hair_color": character.hair_color,
            "face_shape": character.face_shape,
            "eye_color": character.eye_color,
            "beard_style": character.beard_style,
            "mustache_style": character.mustache_style,
            "facial_hair_color": character.facial_hair_color,
            "body_type": character.body_type,
            "height": character.height,
            "shirt_style": character.shirt_style,
            "shirt_color": character.shirt_color,
            "pants_style": character.pants_style,
            "pants_color": character.pants_color,
            "shoes_style": character.shoes_style,
            "shoes_color": character.shoes_color,
            "accessories": character.accessories
        }

    # Available options for character customization
    GENDER_OPTIONS = ["male", "female", "other"]

    SKIN_COLOR_OPTIONS = [
        "#FFDFC4", "#F0D5BE", "#EECEB3", "#E1B899", "#E5C298",
        "#FFDAB9", "#E6BC98", "#D4A574", "#C68642", "#8D5524",
        "#6B4423", "#4A3728", "#3C2415", "#2D1810", "#1C100A"
    ]

    HAIR_STYLE_OPTIONS = [
        "short", "medium", "long", "buzz", "mohawk", "afro",
        "ponytail", "bun", "braids", "dreadlocks", "bald",
        "curly_short", "curly_long", "wavy", "straight"
    ]

    HAIR_COLOR_OPTIONS = [
        "#000000", "#1C1C1C", "#3D2314", "#4A3728", "#8B4513",
        "#A0522D", "#CD853F", "#DAA520", "#FFD700", "#B8860B",
        "#FF4500", "#DC143C", "#800000", "#A52A2A", "#FFFFFF",
        "#C0C0C0", "#808080", "#4169E1", "#9400D3", "#FF1493"
    ]

    FACE_SHAPE_OPTIONS = ["oval", "round", "square", "heart", "oblong", "diamond"]

    EYE_COLOR_OPTIONS = [
        "#4A3728", "#8B4513", "#2E8B57", "#4169E1", "#808080",
        "#00CED1", "#9400D3", "#FF4500", "#000000"
    ]

    BEARD_STYLE_OPTIONS = [
        "none", "stubble", "short", "medium", "long", "goatee",
        "full", "mutton_chops", "soul_patch", "van_dyke"
    ]

    MUSTACHE_STYLE_OPTIONS = [
        "none", "thin", "thick", "handlebar", "chevron",
        "horseshoe", "pencil", "walrus"
    ]

    BODY_TYPE_OPTIONS = ["slim", "average", "athletic", "large"]

    SHIRT_STYLE_OPTIONS = [
        "tshirt", "polo", "button_up", "sweater", "hoodie",
        "tank_top", "jacket", "suit", "dress_shirt"
    ]

    PANTS_STYLE_OPTIONS = [
        "jeans", "chinos", "shorts", "sweatpants", "dress_pants",
        "cargo", "leggings", "skirt"
    ]

    SHOES_STYLE_OPTIONS = [
        "sneakers", "boots", "loafers", "sandals", "heels",
        "dress_shoes", "athletic", "barefoot"
    ]

    ACCESSORY_OPTIONS = [
        "glasses", "sunglasses", "hat", "cap", "beanie",
        "earring_left", "earring_right", "earrings_both",
        "necklace", "watch", "bracelet", "ring", "scarf"
    ]
