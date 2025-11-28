from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
import random

from models.maze import Room, RoomDesign, RoomAd, RoomTemplate
from models.user import User
from models.transaction import Transaction, TransactionType
from config import settings


class RoomService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_room_by_id(self, room_id: int) -> Optional[Room]:
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.design), selectinload(Room.ads))
            .where(Room.id == room_id)
        )
        return result.scalar_one_or_none()

    async def get_room_by_coords(self, maze_id: int, x: int, y: int) -> Optional[Room]:
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.design), selectinload(Room.ads))
            .where(and_(Room.maze_id == maze_id, Room.x == x, Room.y == y))
        )
        return result.scalar_one_or_none()

    async def get_user_rooms(self, user_id: int) -> List[Room]:
        """Get all rooms owned by a user"""
        from models.maze import Maze
        result = await self.db.execute(
            select(Room)
            .options(
                selectinload(Room.design),
                selectinload(Room.ads),
                selectinload(Room.maze)
            )
            .where(Room.owner_id == user_id)
            .order_by(Room.sold_at.desc())
        )
        return result.scalars().all()

    async def find_random_room_by_doors(self, maze_id: int, door_count: int) -> Optional[Room]:
        """Find a random available room with the specified number of doors"""
        # Get all unsold rooms in the maze
        result = await self.db.execute(
            select(Room)
            .where(
                and_(
                    Room.maze_id == maze_id,
                    Room.is_sold == False
                )
            )
        )
        rooms = result.scalars().all()

        # Filter by door count in Python
        matching_rooms = []
        for room in rooms:
            actual_door_count = sum([
                1 if room.door_north else 0,
                1 if room.door_south else 0,
                1 if room.door_east else 0,
                1 if room.door_west else 0
            ])
            if actual_door_count == door_count:
                matching_rooms.append(room)

        if not matching_rooms:
            return None

        # Return a random room from the available ones
        return random.choice(matching_rooms)

    async def purchase_room(self, user: User, room: Room, price: float = None) -> Dict[str, Any]:
        """Purchase a room"""
        if room.is_sold:
            return {"success": False, "error": "Room is already sold"}

        # TODO: Implement real payment system
        # For now, just mark the room as purchased without deducting balance
        # price = price or settings.ROOM_PRICE
        # if user.balance < price:
        #     return {"success": False, "error": "Insufficient balance"}
        # user.balance -= price

        # Update room ownership
        room.owner_id = user.id
        room.is_sold = True
        room.sold_at = datetime.utcnow()

        # Create default design if it doesn't exist (lazy loading)
        if not room.design:
            design = RoomDesign(
                room_id=room.id,
                template="default",
                wall_color="#808080",
                floor_color="#6B4E3D",
                ceiling_color="#EEEEEE",
                ambient_light_intensity=0.5
            )
            self.db.add(design)

        # TODO: Create transaction record when payment is implemented
        # price = price or settings.ROOM_PRICE
        # transaction = Transaction(
        #     user_id=user.id,
        #     transaction_type=TransactionType.ROOM_PURCHASE.value,
        #     amount=-price,
        #     balance_after=user.balance,
        #     reference_type="room",
        #     reference_id=room.id,
        #     description=f"Purchased room at ({room.x}, {room.y})"
        # )
        # self.db.add(transaction)

        await self.db.commit()

        return {
            "success": True,
            "room_id": room.id,
            "new_balance": user.balance  # Return current balance without change
        }

    async def update_room_design(
        self,
        room: Room,
        user: User,
        design_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update room design (only owner can update)"""
        if room.owner_id != user.id:
            return {"success": False, "error": "You don't own this room"}

        design = room.design
        if not design:
            design = RoomDesign(room_id=room.id)
            self.db.add(design)

        # Update design fields
        for field in [
            "template", "wall_color", "wall_texture_url",
            "floor_color", "floor_texture_url",
            "ceiling_color", "ceiling_texture_url",
            "door_model", "door_color", "door_handle_type",
            "baseboard_color", "baseboard_height",
            "ambient_light_color", "ambient_light_intensity",
            "spotlight_enabled", "spotlight_color", "extra_features"
        ]:
            if field in design_data:
                setattr(design, field, design_data[field])

        await self.db.commit()
        return {"success": True}

    async def add_room_ad(
        self,
        room: Room,
        user: User,
        wall: str,
        ad_type: str,
        content_url: str = None,
        content_text: str = None,
        click_url: str = None
    ) -> Dict[str, Any]:
        """Add an ad to a room wall"""
        if room.owner_id != user.id:
            return {"success": False, "error": "You don't own this room"}

        # Check if wall has a door
        door_attr = f"door_{wall}"
        if getattr(room, door_attr, False):
            return {"success": False, "error": "Cannot place ad on wall with door"}

        # Check if wall already has an ad
        for ad in room.ads:
            if ad.wall == wall:
                # Update existing ad
                ad.ad_type = ad_type
                ad.content_url = content_url
                ad.content_text = content_text
                ad.click_url = click_url
                await self.db.commit()
                return {"success": True, "ad_id": ad.id, "updated": True}

        # Create new ad
        ad = RoomAd(
            room_id=room.id,
            wall=wall,
            ad_type=ad_type,
            content_url=content_url,
            content_text=content_text,
            click_url=click_url
        )
        self.db.add(ad)
        await self.db.commit()
        await self.db.refresh(ad)

        return {"success": True, "ad_id": ad.id, "updated": False}

    async def remove_room_ad(self, room: Room, user: User, wall: str) -> Dict[str, Any]:
        """Remove an ad from a room wall"""
        if room.owner_id != user.id:
            return {"success": False, "error": "You don't own this room"}

        for ad in room.ads:
            if ad.wall == wall:
                await self.db.delete(ad)
                await self.db.commit()
                return {"success": True}

        return {"success": False, "error": "No ad found on that wall"}

    async def apply_template(self, room: Room, user: User, template: str) -> Dict[str, Any]:
        """Apply a design template to a room"""
        if room.owner_id != user.id:
            return {"success": False, "error": "You don't own this room"}

        template_styles = {
            "default": {
                "wall_color": "#808080",
                "floor_color": "#6B4E3D",
                "ceiling_color": "#EEEEEE",
                "ambient_light_intensity": 0.5,
                "decorations": [
                    {"type": "potted_plant", "position": [-3.5, 0, -3.5], "scale": [1, 1, 1], "color": "#228B22"},
                    {"type": "floor_lamp", "position": [3.5, 0, -3.5], "scale": [1, 1, 1], "color": "#FFE4B5"}
                ]
            },
            "halloween": {
                "wall_color": "#2D1B2D",
                "floor_color": "#1A1A1A",
                "ceiling_color": "#0D0D0D",
                "ambient_light_color": "#FF6600",
                "ambient_light_intensity": 0.3,
                "decorations": [
                    {"type": "pumpkin", "position": [-3, 0, -3], "scale": [1.2, 1.2, 1.2], "color": "#FF6600", "properties": {"glowing": True}},
                    {"type": "pumpkin", "position": [3.5, 0, 3], "scale": [0.8, 0.8, 0.8], "color": "#FF7518"},
                    {"type": "bat", "position": [0, 3.5, -2], "scale": [0.6, 0.6, 0.6], "color": "#1A1A1A"},
                    {"type": "bat", "position": [-2, 3.2, 1], "scale": [0.5, 0.5, 0.5], "color": "#2D2D2D"},
                    {"type": "spider_web", "position": [-4.9, 3, -4.9], "scale": [2, 2, 0.1], "color": "#CCCCCC"},
                    {"type": "cauldron", "position": [3, 0, -3], "scale": [1, 1, 1], "color": "#2F2F2F", "properties": {"bubbling": True, "smoke_color": "#00FF00"}}
                ]
            },
            "christmas": {
                "wall_color": "#C41E3A",
                "floor_color": "#228B22",
                "ceiling_color": "#FFFFFF",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.6,
                "decorations": [
                    {"type": "christmas_tree", "position": [-3, 0, -3], "scale": [1.5, 1.5, 1.5], "color": "#006400", "properties": {"lights": True, "star_color": "#FFD700"}},
                    {"type": "gift_box", "position": [-2.5, 0, -2], "scale": [0.5, 0.5, 0.5], "color": "#FF0000", "properties": {"ribbon_color": "#FFD700"}},
                    {"type": "gift_box", "position": [-3.5, 0, -1.8], "scale": [0.4, 0.6, 0.4], "color": "#00FF00", "properties": {"ribbon_color": "#FF0000"}},
                    {"type": "gift_box", "position": [-2.8, 0, -1.5], "scale": [0.6, 0.4, 0.6], "color": "#0000FF", "properties": {"ribbon_color": "#FFFFFF"}},
                    {"type": "snowman", "position": [3.5, 0, -3], "scale": [0.8, 0.8, 0.8], "color": "#FFFFFF"},
                    {"type": "candy_cane", "position": [3.5, 0, 3], "scale": [1, 1, 1], "color": "#FF0000"},
                    {"type": "string_lights", "position": [0, 3.8, 0], "scale": [10, 1, 10], "color": "#FF0000", "properties": {"colors": ["#FF0000", "#00FF00", "#FFD700", "#0000FF"]}}
                ]
            },
            "modern_office": {
                "wall_color": "#F5F5F5",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#FFFFFF",
                "ambient_light_intensity": 0.7,
                "decorations": [
                    {"type": "desk", "position": [0, 0, -3.5], "scale": [1, 1, 1], "color": "#8B4513"},
                    {"type": "office_chair", "position": [0, 0, -2.5], "scale": [1, 1, 1], "color": "#1A1A1A"},
                    {"type": "potted_plant", "position": [-3.5, 0, -3.5], "scale": [1.2, 1.2, 1.2], "color": "#228B22"},
                    {"type": "desk_lamp", "position": [0.8, 0.8, -3.5], "scale": [0.5, 0.5, 0.5], "color": "#C0C0C0"},
                    {"type": "water_cooler", "position": [3.5, 0, -3.5], "scale": [1, 1, 1], "color": "#ADD8E6"},
                    {"type": "clock", "position": [0, 2.5, -4.9], "scale": [0.6, 0.6, 0.1], "color": "#FFFFFF"}
                ]
            },
            "old_salon": {
                "wall_color": "#8B4513",
                "floor_color": "#654321",
                "ceiling_color": "#DEB887",
                "ambient_light_color": "#FFF8DC",
                "ambient_light_intensity": 0.4,
                "decorations": [
                    {"type": "fireplace", "position": [0, 0, -4.5], "scale": [1.5, 1.5, 1], "color": "#8B0000", "properties": {"fire": True}},
                    {"type": "chandelier", "position": [0, 3.5, 0], "scale": [1.2, 1, 1.2], "color": "#FFD700", "properties": {"candles": 6}},
                    {"type": "grandfather_clock", "position": [-4, 0, 0], "scale": [1, 1, 0.5], "color": "#654321"},
                    {"type": "armchair", "position": [-2, 0, -2], "scale": [1, 1, 1], "color": "#8B0000", "properties": {"rotation_y": 0.5}},
                    {"type": "armchair", "position": [2, 0, -2], "scale": [1, 1, 1], "color": "#8B0000", "properties": {"rotation_y": -0.5}},
                    {"type": "candelabra", "position": [3.5, 1, -4], "scale": [0.5, 0.5, 0.5], "color": "#C0C0C0", "properties": {"lit": True}}
                ]
            },
            "spaceship": {
                "wall_color": "#1C1C1C",
                "floor_color": "#2F2F2F",
                "ceiling_color": "#0A0A0A",
                "ambient_light_color": "#00FFFF",
                "ambient_light_intensity": 0.4,
                "decorations": [
                    {"type": "control_panel", "position": [0, 0.5, -4.5], "scale": [3, 1, 0.5], "color": "#1C1C1C", "properties": {"screen_color": "#00FFFF", "blinking": True}},
                    {"type": "hologram", "position": [0, 1.5, 0], "scale": [1, 2, 1], "color": "#00FFFF", "properties": {"rotating": True, "shape": "globe"}},
                    {"type": "light_tube", "position": [-4.8, 2, 0], "scale": [0.1, 3, 0.1], "color": "#00FFFF"},
                    {"type": "light_tube", "position": [4.8, 2, 0], "scale": [0.1, 3, 0.1], "color": "#00FFFF"},
                    {"type": "cryopod", "position": [3.5, 0, -3], "scale": [1, 2, 1], "color": "#4169E1", "properties": {"frost": True}},
                    {"type": "robot", "position": [-3.5, 0, 3], "scale": [0.8, 0.8, 0.8], "color": "#C0C0C0"}
                ]
            },
            "underwater": {
                "wall_color": "#006994",
                "floor_color": "#0077BE",
                "ceiling_color": "#00CED1",
                "ambient_light_color": "#40E0D0",
                "ambient_light_intensity": 0.5,
                "decorations": [
                    {"type": "coral", "position": [-3, 0, -3], "scale": [1.5, 1.5, 1.5], "color": "#FF6B6B"},
                    {"type": "coral", "position": [3.5, 0, -2], "scale": [1, 1.2, 1], "color": "#FF69B4"},
                    {"type": "seashell", "position": [2, 0, 3], "scale": [0.8, 0.8, 0.8], "color": "#FFF5EE"},
                    {"type": "starfish", "position": [-2, 0.01, 2], "scale": [0.6, 0.1, 0.6], "color": "#FF4500"},
                    {"type": "bubbles", "position": [0, 2, 0], "scale": [5, 4, 5], "color": "#87CEEB", "properties": {"animated": True}},
                    {"type": "fish", "position": [2, 2.5, -1], "scale": [0.5, 0.5, 0.5], "color": "#FFD700", "properties": {"swimming": True}},
                    {"type": "fish", "position": [-1, 2, 2], "scale": [0.4, 0.4, 0.4], "color": "#FF6347", "properties": {"swimming": True}},
                    {"type": "treasure_chest", "position": [3.5, 0, 3], "scale": [0.8, 0.8, 0.8], "color": "#8B4513", "properties": {"open": True, "gold": True}}
                ]
            },
            "forest": {
                "wall_color": "#228B22",
                "floor_color": "#3D2914",
                "ceiling_color": "#90EE90",
                "ambient_light_color": "#ADFF2F",
                "ambient_light_intensity": 0.5,
                "decorations": [
                    {"type": "tree_stump", "position": [-3, 0, -3], "scale": [1.2, 0.8, 1.2], "color": "#8B4513"},
                    {"type": "mushroom", "position": [-2, 0, -2], "scale": [0.5, 0.5, 0.5], "color": "#FF0000", "properties": {"spots": True}},
                    {"type": "mushroom", "position": [3, 0, -3.5], "scale": [0.7, 0.7, 0.7], "color": "#DEB887"},
                    {"type": "mushroom", "position": [3.5, 0, -3], "scale": [0.4, 0.4, 0.4], "color": "#FFD700"},
                    {"type": "fern", "position": [3.5, 0, 3], "scale": [1.5, 1.5, 1.5], "color": "#228B22"},
                    {"type": "rock", "position": [-3.5, 0, 3], "scale": [1, 0.6, 1], "color": "#696969"},
                    {"type": "fireflies", "position": [0, 2, 0], "scale": [5, 3, 5], "color": "#FFFF00", "properties": {"animated": True, "count": 20}},
                    {"type": "bird", "position": [2, 3, -2], "scale": [0.4, 0.4, 0.4], "color": "#FF6347"}
                ]
            },
            "desert": {
                "wall_color": "#EDC9AF",
                "floor_color": "#C2B280",
                "ceiling_color": "#87CEEB",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.8,
                "decorations": [
                    {"type": "cactus", "position": [-3, 0, -3], "scale": [1.5, 2, 1.5], "color": "#228B22"},
                    {"type": "cactus", "position": [3.5, 0, -2], "scale": [1, 1.5, 1], "color": "#2E8B57"},
                    {"type": "sand_dune", "position": [3, 0, 3], "scale": [2, 0.5, 2], "color": "#DEB887"},
                    {"type": "skull", "position": [-2, 0.1, 2], "scale": [0.4, 0.4, 0.4], "color": "#FFFFF0"},
                    {"type": "tumbleweed", "position": [0, 0.3, 0], "scale": [0.6, 0.6, 0.6], "color": "#D2B48C"},
                    {"type": "pottery", "position": [-3.5, 0, 3], "scale": [0.8, 1, 0.8], "color": "#CD853F"},
                    {"type": "sun", "position": [0, 4, -4], "scale": [1, 1, 0.1], "color": "#FFD700", "properties": {"glowing": True}}
                ]
            },
            "cyberpunk": {
                "wall_color": "#0D0D0D",
                "floor_color": "#1A1A2E",
                "ceiling_color": "#16213E",
                "ambient_light_color": "#FF00FF",
                "ambient_light_intensity": 0.4,
                "decorations": [
                    {"type": "neon_sign", "position": [0, 2.5, -4.9], "scale": [3, 1, 0.1], "color": "#FF00FF", "properties": {"text": "CYBER", "flicker": True}},
                    {"type": "neon_tube", "position": [-4.8, 2, -2], "scale": [0.1, 0.1, 3], "color": "#00FFFF"},
                    {"type": "neon_tube", "position": [4.8, 1.5, 0], "scale": [0.1, 0.1, 4], "color": "#FF00FF"},
                    {"type": "holographic_screen", "position": [3, 1.5, -3], "scale": [1.5, 1, 0.1], "color": "#00FFFF", "properties": {"animated": True}},
                    {"type": "robot_parts", "position": [-3, 0, -3], "scale": [1, 1, 1], "color": "#C0C0C0"},
                    {"type": "server_rack", "position": [-4, 0, 0], "scale": [0.8, 2, 0.5], "color": "#1A1A1A", "properties": {"lights": True}},
                    {"type": "drone", "position": [2, 2.5, 2], "scale": [0.5, 0.3, 0.5], "color": "#333333", "properties": {"hovering": True}}
                ]
            },
            "medieval": {
                "wall_color": "#696969",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#2F2F2F",
                "ambient_light_color": "#FFA500",
                "ambient_light_intensity": 0.3,
                "decorations": [
                    {"type": "torch", "position": [-4.8, 2, -2], "scale": [0.3, 0.5, 0.3], "color": "#8B4513", "properties": {"fire": True}},
                    {"type": "torch", "position": [4.8, 2, -2], "scale": [0.3, 0.5, 0.3], "color": "#8B4513", "properties": {"fire": True}},
                    {"type": "armor_stand", "position": [-3.5, 0, -3.5], "scale": [1, 1.8, 1], "color": "#C0C0C0"},
                    {"type": "barrel", "position": [3.5, 0, 3], "scale": [0.7, 1, 0.7], "color": "#8B4513"},
                    {"type": "barrel", "position": [3, 0, 3.5], "scale": [0.6, 0.9, 0.6], "color": "#A0522D"},
                    {"type": "banner", "position": [0, 2.5, -4.9], "scale": [1, 2, 0.1], "color": "#8B0000", "properties": {"emblem": "lion"}},
                    {"type": "sword_display", "position": [4, 1.5, 0], "scale": [0.2, 1.5, 0.1], "color": "#C0C0C0"},
                    {"type": "chest", "position": [-3, 0, 3], "scale": [1, 0.7, 0.6], "color": "#654321"}
                ]
            }
        }

        if template not in template_styles:
            return {"success": False, "error": "Invalid template"}

        style = template_styles[template].copy()
        design = room.design
        if not design:
            design = RoomDesign(room_id=room.id)
            self.db.add(design)

        design.template = template

        # Extract decorations for extra_features
        decorations = style.pop("decorations", [])

        # Apply style properties
        for key, value in style.items():
            setattr(design, key, value)

        # Store decorations in extra_features
        if decorations:
            current_extra = design.extra_features or {}
            current_extra["decorations"] = decorations
            design.extra_features = current_extra

        await self.db.commit()
        return {"success": True, "template": template, "decorations": decorations}

    async def get_available_rooms(self, maze_id: int) -> List[Room]:
        """Get all unsold rooms in a maze"""
        result = await self.db.execute(
            select(Room)
            .where(and_(Room.maze_id == maze_id, Room.is_sold == False))
        )
        return result.scalars().all()

    async def get_all_rooms(self, maze_id: int) -> List[Room]:
        """Get all rooms in a maze (for admin use)"""
        result = await self.db.execute(
            select(Room)
            .options(selectinload(Room.design))
            .where(Room.maze_id == maze_id)
            .order_by(Room.x, Room.y)
        )
        return result.scalars().all()

    async def record_ad_view(self, ad_id: int, duration: float = 0):
        """Record an ad view"""
        result = await self.db.execute(
            select(RoomAd).where(RoomAd.id == ad_id)
        )
        ad = result.scalar_one_or_none()
        if ad:
            ad.view_count += 1
            ad.total_view_duration += duration
            await self.db.commit()

    async def record_ad_click(self, ad_id: int):
        """Record an ad click"""
        result = await self.db.execute(
            select(RoomAd).where(RoomAd.id == ad_id)
        )
        ad = result.scalar_one_or_none()
        if ad:
            ad.click_count += 1
            await self.db.commit()
