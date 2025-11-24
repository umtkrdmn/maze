from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

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

    async def purchase_room(self, user: User, room: Room, price: float = None) -> Dict[str, Any]:
        """Purchase a room"""
        if room.is_sold:
            return {"success": False, "error": "Room is already sold"}

        price = price or settings.ROOM_PRICE

        if user.balance < price:
            return {"success": False, "error": "Insufficient balance"}

        # Deduct balance
        user.balance -= price
        new_balance = user.balance

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

        # Create transaction
        transaction = Transaction(
            user_id=user.id,
            transaction_type=TransactionType.ROOM_PURCHASE.value,
            amount=-price,
            balance_after=new_balance,
            reference_type="room",
            reference_id=room.id,
            description=f"Purchased room at ({room.x}, {room.y})"
        )
        self.db.add(transaction)

        await self.db.commit()

        return {
            "success": True,
            "room_id": room.id,
            "new_balance": new_balance
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
                "ambient_light_intensity": 0.5
            },
            "halloween": {
                "wall_color": "#2D1B2D",
                "floor_color": "#1A1A1A",
                "ceiling_color": "#0D0D0D",
                "ambient_light_color": "#FF6600",
                "ambient_light_intensity": 0.3
            },
            "christmas": {
                "wall_color": "#C41E3A",
                "floor_color": "#228B22",
                "ceiling_color": "#FFFFFF",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.6
            },
            "modern_office": {
                "wall_color": "#F5F5F5",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#FFFFFF",
                "ambient_light_intensity": 0.7
            },
            "old_salon": {
                "wall_color": "#8B4513",
                "floor_color": "#654321",
                "ceiling_color": "#DEB887",
                "ambient_light_color": "#FFF8DC",
                "ambient_light_intensity": 0.4
            },
            "spaceship": {
                "wall_color": "#1C1C1C",
                "floor_color": "#2F2F2F",
                "ceiling_color": "#0A0A0A",
                "ambient_light_color": "#00FFFF",
                "ambient_light_intensity": 0.4
            },
            "underwater": {
                "wall_color": "#006994",
                "floor_color": "#0077BE",
                "ceiling_color": "#00CED1",
                "ambient_light_color": "#40E0D0",
                "ambient_light_intensity": 0.5
            },
            "forest": {
                "wall_color": "#228B22",
                "floor_color": "#3D2914",
                "ceiling_color": "#90EE90",
                "ambient_light_color": "#ADFF2F",
                "ambient_light_intensity": 0.5
            },
            "desert": {
                "wall_color": "#EDC9AF",
                "floor_color": "#C2B280",
                "ceiling_color": "#87CEEB",
                "ambient_light_color": "#FFD700",
                "ambient_light_intensity": 0.8
            },
            "cyberpunk": {
                "wall_color": "#0D0D0D",
                "floor_color": "#1A1A2E",
                "ceiling_color": "#16213E",
                "ambient_light_color": "#FF00FF",
                "ambient_light_intensity": 0.4
            },
            "medieval": {
                "wall_color": "#696969",
                "floor_color": "#4A4A4A",
                "ceiling_color": "#2F2F2F",
                "ambient_light_color": "#FFA500",
                "ambient_light_intensity": 0.3
            }
        }

        if template not in template_styles:
            return {"success": False, "error": "Invalid template"}

        style = template_styles[template]
        design = room.design
        if not design:
            design = RoomDesign(room_id=room.id)
            self.db.add(design)

        design.template = template
        for key, value in style.items():
            setattr(design, key, value)

        await self.db.commit()
        return {"success": True, "template": template}

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
