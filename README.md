# 🎮 3D Labirent Oyunu / 3D Maze Game

Modern web tabanlı 3D labirent oyunu. Çok oyunculu, ödül sistemi, tuzaklar, portal mekaniği, karakter özelleştirme ve oda tasarımı içerir.

Modern web-based 3D maze game with multiplayer support, reward system, traps, portals, character customization, and room design features.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-Educational-green)

## ✨ Özellikler / Features

- 🎯 **3D Görselleştirme**: Three.js ile gerçekçi 3D render
- 👥 **Çok Oyunculu**: WebSocket ile gerçek zamanlı multiplayer
- 💰 **Ödül Sistemi**: Odalarda rastgele ödüller ve büyük ödül
- 🪤 **Tuzaklar**: 7 farklı tuzak tipi (donma, körlük, yavaşlatma, vb.)
- 🌀 **Portallar**: Labirentte hızlı seyahat
- 🎨 **Karakter Editörü**: Detaylı karakter özelleştirme
- 🏠 **Oda Tasarımı**: 11 tema, özel renkler ve reklamlar
- 🎵 **3D Ses**: Spatial audio ile adım sesleri ve ortam efektleri
- 📱 **Mobil Destek**: Touch kontroller ile mobil uyumlu
- 🗺️ **Minimap**: Keşfedilen bölgeler ve sis sistemi
- 🔐 **Güvenlik**: JWT authentication ve server-side maze generation

## 🚀 Hızlı Başlangıç / Quick Start

### Gereksinimler / Requirements

- Python 3.11 veya üzeri / Python 3.11 or higher
- pip (Python package manager)
- Modern web tarayıcı (WebGL desteği) / Modern web browser (WebGL support)

### Kurulum / Installation

#### 1. Backend Kurulumu / Backend Setup

```bash
# Repository'yi klonlayın / Clone the repository
git clone <repository-url>
cd maze

# Backend dizinine gidin / Navigate to backend directory
cd backend

# Virtual environment oluşturun (opsiyonel ama önerilen)
# Create virtual environment (optional but recommended)
python -m venv venv

# Virtual environment'ı aktif edin / Activate virtual environment
# Linux/Mac:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Bağımlılıkları yükleyin / Install dependencies
pip install -r requirements.txt

# Kurulumu doğrulayın / Verify installation
python check_setup.py
```

#### 2. Backend'i Çalıştırma / Running Backend

```bash
# Backend dizininde / In backend directory
python main.py
```

Backend şu adreslerde çalışacak / Backend will run at:
- API: http://localhost:7000
- API Docs (Swagger): http://localhost:7000/docs
- WebSocket: ws://localhost:7000/ws

#### 3. Frontend'i Çalıştırma / Running Frontend

Başka bir terminal'de / In another terminal:

```bash
# Ana dizine dönün / Return to main directory
cd /home/user/maze

# Basit HTTP server başlatın / Start simple HTTP server
# Python 3:
python -m http.server 7080

# veya Python 2:
# python -m SimpleHTTPServer 7080

# veya Node.js varsa:
# npx http-server -p 7080
```

Frontend şu adreste çalışacak / Frontend will run at:
- Game: http://localhost:7080

#### 4. Oyunu Başlatma / Starting the Game

1. Tarayıcınızda http://localhost:7080 adresini açın / Open http://localhost:7080 in your browser
2. **Kayıt Ol** / **Register** butonuna tıklayın ve hesap oluşturun / click and create account
3. Giriş yapın / Login
4. Oyun otomatik olarak başlayacak! / Game will start automatically!

**veya / or**

**Çevrimdışı Oyna** / **Play Offline** butonuna tıklayarak backend'siz test edebilirsiniz.

## 🎮 Kontroller / Controls

### Klavye / Keyboard
| Tuş / Key | Aksiyon / Action |
|-----------|------------------|
| **W** / **↑** | İleri Git / Move Forward |
| **S** / **↓** | Geri Git / Move Backward |
| **A** | Sola Git / Move Left |
| **D** | Sağa Git / Move Right |
| **←** / **→** | Dön / Rotate |
| **P** | Portal Kullan / Use Portal |
| **T** | Chat Aç / Open Chat |
| **M** | Ses Aç/Kapat / Toggle Sound |
| **Mouse** | Etrafı Bak / Look Around (canvas'a tıkla / click canvas) |

### Mobil / Mobile
- **Sol Joystick** / **Left Joystick**: Hareket / Movement
- **Sağ Joystick** / **Right Joystick**: Bakış / Look Around

## 📁 Proje Yapısı / Project Structure

```
maze/
├── backend/                    # Backend (Python/FastAPI)
│   ├── main.py                # FastAPI app entry point
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database setup
│   ├── websocket_handler.py   # WebSocket manager
│   ├── check_setup.py         # Dependency validator
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py
│   │   ├── maze.py
│   │   ├── game_session.py
│   │   ├── reward.py
│   │   ├── trap.py
│   │   └── character.py
│   ├── routes/                # API endpoints
│   │   ├── auth.py
│   │   ├── maze.py
│   │   ├── room.py
│   │   ├── character.py
│   │   └── admin.py
│   ├── services/              # Business logic
│   │   ├── maze.py
│   │   └── reward.py
│   └── requirements.txt       # Python dependencies
├── js/                        # Frontend (JavaScript)
│   ├── game.js               # Main game loop
│   ├── renderer.js           # 3D rendering (Three.js)
│   ├── player.js             # Player movement
│   ├── maze.js               # Local maze generation
│   ├── room-provider.js      # Room data provider
│   ├── api.js                # REST API client
│   ├── websocket-client.js   # WebSocket client
│   ├── sound-manager.js      # 3D audio system
│   ├── ui-manager.js         # UI components
│   ├── mobile-controls.js    # Touch controls
│   └── minimap.js            # Minimap renderer
├── css/
│   ├── style.css             # Main styles
│   └── ui.css                # UI component styles
├── index.html                # Main HTML file
└── README.md                 # This file
```

## 🎯 Teknoloji Stack'i / Technology Stack

### Frontend
- **Three.js** - 3D rendering engine
- **JavaScript ES6+** - Modern JavaScript
- **Web Audio API** - 3D spatial audio
- **WebSocket** - Real-time multiplayer
- **Pointer Lock API** - Mouse control

### Backend
- **Python 3.11+** - Programming language
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - Async ORM
- **SQLite** - Database (via aiosqlite)
- **JWT** - Authentication
- **Pydantic** - Data validation
- **WebSocket** - Real-time communication

## 🎮 Oyun Mekaniği / Game Mechanics

### Ödüller / Rewards
- **Küçük Ödüller / Small Rewards**: $0.10 - $5.00, birden fazla oyuncu toplayabilir / multiple players can collect
- **Büyük Ödül / Big Reward**: $50.00 - $500.00, tek oyuncu kazanır ve oyun biter / one player wins and game ends
- Rastgele odalarda spawn olur / Spawns in random rooms
- 5-15 dakika arası aktif kalır / Active for 5-15 minutes

### Tuzaklar / Traps
1. **Donma / Freeze**: 3 saniye hareketsiz / immobile for 3 seconds
2. **Körlük / Blind**: 5 saniye ekran kararır / screen goes dark for 5 seconds
3. **Yavaşlatma / Slow**: 10 saniye %50 yavaş / 50% slower for 10 seconds
4. **Ters Kontrol / Reverse**: 8 saniye kontroller ters / controls reversed for 8 seconds
5. **Başa Dön / Teleport Start**: Başlangıç noktasına / teleport to start
6. **Rastgele Işınlanma / Random Teleport**: Rastgele odaya / teleport to random room
7. **Ödül Kaybı / Lose Reward**: Son ödülü kaybedersin / lose last reward

### Portallar / Portals
- Her labirentte 2-3 portal odası / 2-3 portal rooms per maze
- Rastgele portal odalarına ışınlanma / Teleport to random portal rooms
- Hızlı keşif için kullanışlı / Useful for quick exploration

### Oda Sahipliği / Room Ownership
- Oyuncular oda satın alabilir ($10/oda) / Players can purchase rooms ($10/room)
- Sahip olunan odalarda reklam gösterilebilir / Show ads in owned rooms
- 11 farklı tema seçilebilir / Choose from 11 different themes
- Özel duvar/zemin/tavan renkleri / Custom wall/floor/ceiling colors

## 🔧 API Endpoints

Tüm API endpoint'lerini görmek için backend çalışırken şu adresi ziyaret edin:
**http://localhost:7000/docs**

### Ana Endpoint'ler / Main Endpoints

**Authentication**
- `POST /auth/register` - Kullanıcı kaydı / User registration
- `POST /auth/login` - Giriş yap / Login
- `GET /auth/me` - Kullanıcı bilgisi / User info

**Game**
- `POST /maze/start` - Oyun başlat / Start game
- `POST /maze/move` - Hareket et / Move
- `GET /maze/current` - Mevcut oda / Current room
- `GET /maze/visited` - Ziyaret edilen odalar / Visited rooms
- `POST /maze/portal` - Portal kullan / Use portal

**Rooms**
- `GET /room/my-rooms` - Odalarım / My rooms
- `POST /room/{room_id}/design` - Oda tasarımı / Room design
- `POST /room/{room_id}/template` - Tema uygula / Apply template
- `GET /room/templates` - Tema listesi / Template list

**Character**
- `GET /character` - Karakter bilgisi / Character info
- `PUT /character` - Karakter güncelle / Update character
- `POST /character/randomize` - Rastgele karakter / Random character

### WebSocket Events

**Client → Server**
- `update_position` - Pozisyon güncelleme / Position update
- `chat_message` - Chat mesajı / Chat message

**Server → Client**
- `player_joined` - Oyuncu katıldı / Player joined
- `player_left` - Oyuncu ayrıldı / Player left
- `player_moved` - Oyuncu hareket etti / Player moved
- `room_players` - Odadaki oyuncular / Room players
- `chat_message` - Chat mesajı / Chat message
- `reward_spawned` - Ödül spawn oldu / Reward spawned
- `reward_claimed` - Ödül toplandı / Reward claimed
- `game_ended` - Oyun bitti / Game ended

## 🛣️ Yol Haritası / Roadmap

### Mevcut Özellikler (v2.0) / Current Features
- ✅ 3D labirent render / 3D maze rendering
- ✅ Oyuncu hareketi / Player movement
- ✅ Minimap + Sis sistemi / Minimap + Fog of war
- ✅ Çok oyunculu / Multiplayer
- ✅ Ödül sistemi / Reward system
- ✅ Tuzak sistemi / Trap system
- ✅ Portal mekaniği / Portal mechanics
- ✅ Karakter editörü / Character editor
- ✅ Oda tasarımı / Room designer
- ✅ 3D ses sistemi / 3D audio system
- ✅ Mobil kontroller / Mobile controls
- ✅ JWT authentication
- ✅ WebSocket multiplayer
- ✅ Reklam sistemi / Ad system

### Yakında / Coming Soon
- 🔄 Video reklam desteği / Video ad support
- 🔄 Liderboard / Leaderboard
- 🔄 Başarımlar / Achievements
- 🔄 Oyuncu sıralaması / Player ranking
- 🔄 Turnuvalar / Tournaments

### Gelecek / Future
- 🔮 AI destekli düşmanlar / AI-powered enemies
- 🔮 Daha fazla tema / More themes
- 🔮 Özel labirent tasarım editörü / Custom maze designer
- 🔮 Sosyal özellikler / Social features
- 🔮 Clan/Guild sistemi / Clan/Guild system

## 🐛 Sorun Giderme / Troubleshooting

### Backend başlamıyor / Backend won't start

```bash
# Bağımlılıkları kontrol edin / Check dependencies
cd backend
python check_setup.py

# Eksik paket varsa yeniden yükleyin / Reinstall if packages missing
pip install --force-reinstall -r requirements.txt

# Python versiyonunu kontrol edin / Check Python version
python --version  # Should be 3.11 or higher
```

### Frontend backend'e bağlanamıyor / Frontend can't connect to backend

1. Backend'in çalıştığından emin olun / Make sure backend is running
   - http://localhost:7000/docs açılmalı / should open
2. CORS hatası varsa / If CORS error:
   - `backend/main.py` içinde CORS ayarlarını kontrol edin / check CORS settings in `backend/main.py`
3. Browser console'da hata mesajlarını kontrol edin (F12) / Check error messages in browser console

### WebSocket bağlantı hatası / WebSocket connection error

1. Backend'de WebSocket endpoint'inin aktif olduğundan emin olun / Ensure WebSocket endpoint is active
2. Önce login olup JWT token aldığınızdan emin olun / Make sure you logged in and got JWT token
3. Browser console'da WebSocket hatalarını kontrol edin / Check WebSocket errors in browser console

### Ses çalışmıyor / Audio not working

1. Sayfaya tıklayın (browser autoplay policy) / Click on page (browser autoplay policy)
2. `M` tuşuna basarak ses kontrolünü test edin / Press `M` key to test audio control
3. Browser sound permission'larını kontrol edin / Check browser sound permissions

### Siyah ekran görüyorum / Black screen

- Tarayıcınızın WebGL desteğini kontrol edin / Check WebGL support
- Konsol hatalarını inceleyin (F12) / Check console errors (F12)
- Backend çalışıyor mu kontrol edin / Check if backend is running

### Kontroller çalışmıyor / Controls not working

- Canvas'a tıkladığınızdan emin olun / Make sure you clicked on canvas
- Sayfa focus'unu kontrol edin / Check page focus
- Pointer lock aktif mi kontrol edin / Check if pointer lock is active

## 📄 Lisans / License

Bu proje eğitim amaçlıdır. / This project is for educational purposes.

## 🤝 Katkıda Bulunma / Contributing

Pull request'ler memnuniyetle karşılanır! / Pull requests are welcome!

1. Fork edin / Fork the project
2. Feature branch oluşturun / Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit edin / Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push edin / Push to branch (`git push origin feature/amazing-feature`)
5. Pull Request açın / Open a Pull Request

## 📞 İletişim / Contact

Sorularınız için issue açabilirsiniz. / Feel free to open an issue for questions.

## 🙏 Teşekkürler / Acknowledgments

- **Three.js** - 3D rendering
- **FastAPI** - Backend framework
- **SQLAlchemy** - ORM

---

**Versiyon / Version**: 2.0.0
**Son Güncelleme / Last Update**: 2025-11-21
