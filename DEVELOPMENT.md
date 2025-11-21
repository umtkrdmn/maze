# 🛠️ Geliştirici Rehberi / Developer Guide

3D Maze Game projesine katkıda bulunmak veya geliştirmek için detaylı rehber.

## 📋 İçindekiler / Table of Contents

1. [Proje Mimarisi](#proje-mimarisi)
2. [Backend Geliştirme](#backend-geliştirme)
3. [Frontend Geliştirme](#frontend-geliştirme)
4. [API Kullanımı](#api-kullanımı)
5. [WebSocket Protokolü](#websocket-protokolü)
6. [Veritabanı](#veritabanı)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## 🏗️ Proje Mimarisi

### Genel Yapı / Architecture Overview

```
┌─────────────┐         ┌──────────────┐
│   Browser   │ ◄──────►│   Frontend   │
│  (Three.js) │  HTTP   │  (HTML/JS)   │
└─────────────┘         └──────┬───────┘
                               │
                               │ HTTP/WS
                               ▼
                        ┌──────────────┐
                        │   Backend    │
                        │  (FastAPI)   │
                        └──────┬───────┘
                               │
                               │ SQLAlchemy
                               ▼
                        ┌──────────────┐
                        │   Database   │
                        │   (SQLite)   │
                        └──────────────┘
```

### Veri Akışı / Data Flow

1. **Authentication Flow**:
   ```
   User → Register/Login → JWT Token → Authenticated Requests
   ```

2. **Game Flow**:
   ```
   Start Game → Get Room → Move → Update Position → Sync via WebSocket
   ```

3. **Multiplayer Flow**:
   ```
   Player A Moves → WebSocket Server → Broadcast → Player B Receives
   ```

---

## 🐍 Backend Geliştirme

### Dizin Yapısı / Directory Structure

```
backend/
├── main.py                  # FastAPI app
├── config.py               # Settings
├── database.py             # DB setup
├── websocket_handler.py    # WebSocket manager
├── models/                 # SQLAlchemy models
│   ├── user.py
│   ├── maze.py
│   ├── game_session.py
│   ├── reward.py
│   ├── trap.py
│   └── character.py
├── routes/                 # API endpoints
│   ├── auth.py            # Authentication
│   ├── maze.py            # Game logic
│   ├── room.py            # Room management
│   ├── character.py       # Character customization
│   └── admin.py           # Admin panel
└── services/              # Business logic
    ├── maze.py            # Maze generation
    └── reward.py          # Reward spawning
```

### Yeni Endpoint Ekleme / Adding New Endpoint

1. **Route dosyası oluştur** (`routes/my_feature.py`):

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from routes.auth import get_current_user

router = APIRouter(prefix="/my-feature", tags=["My Feature"])

@router.get("/")
async def get_feature(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Your logic here
    return {"message": "Hello from my feature!"}
```

2. **main.py'a ekle**:

```python
from routes import my_feature

app.include_router(my_feature.router)
```

### Yeni Model Ekleme / Adding New Model

1. **Model dosyası oluştur** (`models/my_model.py`):

```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class MyModel(Base):
    __tablename__ = "my_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    user = relationship("User", back_populates="my_models")
```

2. **Alembic migration oluştur**:

```bash
cd backend
alembic revision --autogenerate -m "Add MyModel table"
alembic upgrade head
```

### Environment Variables

`.env` dosyası oluşturun (`.env.example`'dan kopyalayın):

```bash
cp .env.example .env
# Düzenleyin / Edit:
nano .env
```

---

## 🎨 Frontend Geliştirme

### Dizin Yapısı / Directory Structure

```
js/
├── game.js              # Ana oyun döngüsü
├── renderer.js          # Three.js rendering
├── player.js            # Oyuncu kontrolü
├── maze.js              # Lokal maze (offline mode)
├── room-provider.js     # Room data soyutlaması
├── api.js               # REST API client
├── websocket-client.js  # WebSocket client
├── sound-manager.js     # 3D audio
├── ui-manager.js        # UI components
├── mobile-controls.js   # Touch controls
└── minimap.js           # Minimap renderer
```

### Yeni Özellik Ekleme / Adding New Feature

1. **Yeni JS dosyası oluştur** (`js/my-feature.js`):

```javascript
class MyFeature {
    constructor(game) {
        this.game = game;
        this.init();
    }

    init() {
        console.log('MyFeature initialized');
        // Setup code
    }

    update() {
        // Per-frame update
    }
}
```

2. **index.html'e ekle**:

```html
<script src="js/my-feature.js"></script>
```

3. **game.js'de kullan**:

```javascript
// Game constructor
this.myFeature = new MyFeature(this);

// Game loop
this.myFeature.update();
```

### UI Komponenti Ekleme / Adding UI Component

`ui-manager.js` içinde:

```javascript
showMyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>My Modal</h2>
            <!-- Content -->
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}
```

---

## 🔌 API Kullanımı

### Authentication

```javascript
// Register
const response = await api.register('user@example.com', 'password123', 'username');

// Login
const loginData = await api.login('user@example.com', 'password123');
api.setToken(loginData.access_token);

// Get current user
const user = await api.me();
```

### Game Operations

```javascript
// Start game
const session = await api.startGame();

// Move
const moveResult = await api.move('north');

// Get current room
const room = await api.getCurrentRoom();

// Use portal
const portalResult = await api.usePortal();
```

### Room Management

```javascript
// Get my rooms
const rooms = await api.getMyRooms();

// Update room design
await api.updateRoomDesign(roomId, {
    wall_color: '#ff0000',
    floor_color: '#00ff00',
    ceiling_color: '#0000ff'
});

// Apply template
await api.applyRoomTemplate(roomId, 'spaceship');
```

---

## 📡 WebSocket Protokolü

### Connection

```javascript
// Connect
gameWS.connect(token);

// Disconnect
gameWS.disconnect();
```

### Events - Client → Server

```javascript
// Update position
gameWS.updatePosition(posX, posY, posZ, yaw, pitch);

// Send chat message
gameWS.sendChat('Hello world!');
```

### Events - Server → Client

```javascript
// Player joined
gameWS.onPlayerJoined = (data) => {
    console.log(`${data.username} joined`);
};

// Player moved
gameWS.onPlayerMoved = (data) => {
    console.log(`Player moved to ${data.pos_x}, ${data.pos_z}`);
};

// Chat message
gameWS.onChatMessage = (data) => {
    console.log(`${data.username}: ${data.message}`);
};

// Reward spawned
gameWS.onRewardSpawned = (data) => {
    console.log(`Reward spawned: $${data.amount}`);
};
```

---

## 🗄️ Veritabanı

### Tablo İlişkileri / Table Relationships

```
users
  ├─► mazes (one-to-many)
  ├─► rooms (one-to-many, owned rooms)
  ├─► game_sessions (one-to-many)
  ├─► characters (one-to-one)
  └─► transactions (one-to-many)

mazes
  ├─► rooms (one-to-many)
  ├─► rewards (one-to-many)
  └─► traps (one-to-many)

rooms
  ├─► room_designs (one-to-one)
  ├─► room_ads (one-to-many)
  └─► visited_rooms (one-to-many)

game_sessions
  ├─► visited_rooms (one-to-many)
  └─► player_positions (one-to-many)
```

### Database Migration

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1

# Show history
alembic history
```

### Query Examples

```python
from sqlalchemy import select
from models.user import User
from models.maze import Maze, Room

# Get user with mazes
result = await db.execute(
    select(User).where(User.id == user_id)
)
user = result.scalar_one()
await db.refresh(user, ["mazes"])

# Get room with design
result = await db.execute(
    select(Room)
    .where(Room.id == room_id)
    .options(selectinload(Room.design))
)
room = result.scalar_one()
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Frontend Tests

```javascript
// Manual testing checklist:
// 1. Login/Register works
// 2. Game starts
// 3. Movement works
// 4. Minimap updates
// 5. Multiplayer sync works
// 6. Sounds play
// 7. Mobile controls work
```

---

## 🚀 Deployment

### Production Checklist

Backend:
- [ ] `.env` dosyası production değerleri ile güncellendi
- [ ] `SECRET_KEY` değiştirildi
- [ ] Database backup stratejisi var
- [ ] HTTPS kuruldu
- [ ] CORS production domain'leri eklendi
- [ ] Logging yapılandırıldı
- [ ] Rate limiting eklendi

Frontend:
- [ ] API URL production'a güncellendi
- [ ] WebSocket URL production'a güncellendi
- [ ] Error handling eklendi
- [ ] Analytics eklendi (opsiyonel)
- [ ] CDN için static dosyalar optimize edildi

### Docker Deployment (Opsiyonel)

**Dockerfile** (backend):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7100"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "7100:7100"
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./data/maze_game.db
    volumes:
      - ./data:/app/data

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./:/usr/share/nginx/html
```

---

## 📝 Code Style

### Python (Backend)

- PEP 8 standardı
- Type hints kullanın
- Docstring ekleyin

```python
from typing import List, Optional

async def get_rooms(
    user_id: int,
    limit: int = 10
) -> List[Room]:
    """
    Get user's rooms.

    Args:
        user_id: User ID
        limit: Maximum number of rooms to return

    Returns:
        List of Room objects
    """
    # Implementation
```

### JavaScript (Frontend)

- ES6+ syntax
- JSDoc comments
- Meaningful variable names

```javascript
/**
 * Update player position
 * @param {number} deltaTime - Time since last update
 */
updatePosition(deltaTime) {
    // Implementation
}
```

---

## 🤝 Contribution Guidelines

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Commit Message Format

```
type: kısa açıklama

Detaylı açıklama (opsiyonel)

type: feat, fix, docs, style, refactor, test, chore
```

**Örnekler**:
```
feat: Yeni tuzak tipi eklendi
fix: Portal kullanımı hatası düzeltildi
docs: API dokümantasyonu güncellendi
```

---

## 📚 Kaynaklar / Resources

- **Three.js Docs**: https://threejs.org/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **WebSocket Spec**: https://websockets.spec.whatwg.org/

---

**Happy Coding! 💻**
