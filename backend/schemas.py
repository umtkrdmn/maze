from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# Auth Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    balance: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Maze Schemas
class MazeCreate(BaseModel):
    name: str
    width: int = 10
    height: int = 10
    big_reward_chance: Optional[float] = None
    small_reward_chance: Optional[float] = None
    portal_count: int = 5


class RoomResponse(BaseModel):
    x: int
    y: int
    doors: Dict[str, bool]
    has_portal: bool
    is_sold: bool
    owner_id: Optional[int]
    design: Optional[Dict[str, Any]]
    ads: Dict[str, Any]  # wall -> ad data mapping (north, south, east, west)


class GameStartResponse(BaseModel):
    session_token: str
    room: RoomResponse
    maze_size: Dict[str, int]
    maze_name: str


class MoveRequest(BaseModel):
    direction: str  # north, south, east, west


class MoveResponse(BaseModel):
    success: bool
    room: Optional[RoomResponse] = None
    error: Optional[str] = None
    reward: Optional[Dict[str, Any]] = None
    trap: Optional[Dict[str, Any]] = None


# Room Design Schemas
class RoomDesignUpdate(BaseModel):
    template: Optional[str] = None
    wall_color: Optional[str] = None
    wall_texture_url: Optional[str] = None
    floor_color: Optional[str] = None
    floor_texture_url: Optional[str] = None
    ceiling_color: Optional[str] = None
    ceiling_texture_url: Optional[str] = None
    door_model: Optional[str] = None
    door_color: Optional[str] = None
    door_handle_type: Optional[str] = None
    baseboard_color: Optional[str] = None
    baseboard_height: Optional[float] = None
    ambient_light_color: Optional[str] = None
    ambient_light_intensity: Optional[float] = None
    spotlight_enabled: Optional[bool] = None
    spotlight_color: Optional[str] = None
    extra_features: Optional[Dict[str, Any]] = None


class RoomAdCreate(BaseModel):
    wall: str  # north, south, east, west
    ad_type: str  # image, video, canvas
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    click_url: Optional[str] = None


# Character Schemas
class CharacterCreate(BaseModel):
    gender: Optional[str] = "male"
    skin_color: Optional[str] = "#F5DEB3"
    hair_style: Optional[str] = "short"
    hair_color: Optional[str] = "#4A3728"
    face_shape: Optional[str] = "oval"
    eye_color: Optional[str] = "#4A3728"
    beard_style: Optional[str] = "none"
    mustache_style: Optional[str] = "none"
    facial_hair_color: Optional[str] = "#4A3728"
    body_type: Optional[str] = "average"
    height: Optional[float] = 1.75
    shirt_style: Optional[str] = "tshirt"
    shirt_color: Optional[str] = "#3498DB"
    pants_style: Optional[str] = "jeans"
    pants_color: Optional[str] = "#2C3E50"
    shoes_style: Optional[str] = "sneakers"
    shoes_color: Optional[str] = "#FFFFFF"
    accessories: Optional[List[str]] = []


class CharacterUpdate(CharacterCreate):
    pass


class CharacterResponse(BaseModel):
    id: int
    user_id: int
    gender: str
    skin_color: str
    hair_style: str
    hair_color: str
    face_shape: str
    eye_color: str
    beard_style: str
    mustache_style: str
    facial_hair_color: str
    body_type: str
    height: float
    shirt_style: str
    shirt_color: str
    pants_style: str
    pants_color: str
    shoes_style: str
    shoes_color: str
    accessories: List[str]

    class Config:
        from_attributes = True


# Player Position (for multiplayer)
class PlayerPositionUpdate(BaseModel):
    room_x: int
    room_y: int
    pos_x: float
    pos_y: float
    pos_z: float
    yaw: float
    pitch: float


class OtherPlayerResponse(BaseModel):
    user_id: int
    username: str
    room_x: int
    room_y: int
    pos_x: float
    pos_y: float
    pos_z: float
    yaw: float
    pitch: float
    character: Optional[CharacterResponse]


# Reward Response
class RewardResponse(BaseModel):
    id: int
    room_x: int
    room_y: int
    reward_type: str
    amount: float
    expires_at: datetime


# Trap Response
class TrapEffect(BaseModel):
    trap_type: str
    duration: int
    message: str
    teleport_to: Optional[Dict[str, int]] = None
    speed_multiplier: Optional[float] = None
    penalty: Optional[float] = None
    new_balance: Optional[float] = None


# Chat Message
class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    user_id: int
    username: str
    message: str
    timestamp: datetime
    room_x: int
    room_y: int
