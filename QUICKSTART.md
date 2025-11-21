# 🚀 Hızlı Başlangıç Rehberi / Quick Start Guide

3D Labirent Oyunu'nu 5 dakikada çalıştırın! / Get the 3D Maze Game running in 5 minutes!

## 📋 Ön Gereksinimler / Prerequisites

- ✅ Python 3.11 veya üzeri / Python 3.11 or higher
- ✅ Modern web tarayıcı / Modern web browser
- ✅ İnternet bağlantısı (ilk kurulum için) / Internet connection (for initial setup)

## 🎯 3 Adımda Başlat / Start in 3 Steps

### Linux/Mac Kullanıcıları / Linux/Mac Users

#### 1. Repository'yi Klonlayın / Clone the Repository

```bash
git clone <repository-url>
cd maze
```

#### 2. Backend'i Başlatın / Start Backend

```bash
./start_backend.sh
```

Bu script otomatik olarak:
- Virtual environment oluşturur
- Bağımlılıkları yükler
- Backend'i başlatır

#### 3. Frontend'i Başlatın / Start Frontend

Yeni bir terminal açın / Open a new terminal:

```bash
./start_frontend.sh
```

#### 4. Oyunu Açın / Open the Game

Tarayıcınızda / In your browser:
```
http://localhost:7080
```

---

### Windows Kullanıcıları / Windows Users

#### 1. Repository'yi Klonlayın / Clone the Repository

```cmd
git clone <repository-url>
cd maze
```

#### 2. Backend'i Başlatın / Start Backend

```cmd
start_backend.bat
```

Bu script otomatik olarak:
- Virtual environment oluşturur
- Bağımlılıkları yükler
- Backend'i başlatır

#### 3. Frontend'i Başlatın / Start Frontend

Yeni bir terminal açın / Open a new terminal:

```cmd
start_frontend.bat
```

#### 4. Oyunu Açın / Open the Game

Tarayıcınızda / In your browser:
```
http://localhost:7080
```

---

## 🎮 İlk Oyun / First Game

1. **Kayıt Ol** / **Register**
   - Kullanıcı adı, email ve şifre girin
   - Register butonuna tıklayın

2. **Oyna!** / **Play!**
   - Oyun otomatik olarak başlar
   - Canvas'a tıklayarak mouse kontrolünü aktif edin
   - WASD veya ok tuşları ile hareket edin

3. **Keşfet** / **Explore**
   - Ödülleri bulun 💰
   - Tuzaklardan kaçının 🪤
   - Portalları kullanın 🌀
   - Diğer oyuncularla tanışın 👥

---

## 🔧 Manuel Kurulum / Manual Installation

Otomatik scriptler çalışmazsa / If automatic scripts don't work:

### Backend

```bash
# Dizine git / Navigate to directory
cd backend

# Virtual environment oluştur / Create virtual environment
python3 -m venv venv

# Aktif et / Activate
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Bağımlılıkları yükle / Install dependencies
pip install -r requirements.txt

# Doğrula / Verify
python check_setup.py

# Başlat / Start
python main.py
```

### Frontend

```bash
# Ana dizinde / In main directory
python3 -m http.server 7080
```

---

## 📊 Başarı Kontrolü / Success Check

Backend doğru çalışıyorsa / If backend is running correctly:
- ✅ Terminal'de "Uvicorn running on..." mesajı görünür
- ✅ http://localhost:7100/docs açılır
- ✅ Swagger UI görünür

Frontend doğru çalışıyorsa / If frontend is running correctly:
- ✅ http://localhost:7080 açılır
- ✅ Login/Register modal'ı görünür
- ✅ Console'da (F12) hata yok

---

## 🐛 Hata Giderme / Troubleshooting

### "Python bulunamadı" / "Python not found"

```bash
# Python kurulu mu kontrol edin / Check if Python is installed
python3 --version
# veya / or
python --version

# Kurulu değilse / If not installed:
# Ubuntu/Debian:
sudo apt install python3

# macOS:
brew install python@3.11

# Windows:
# https://www.python.org/downloads/ adresinden indirin
```

### "Port zaten kullanımda" / "Port already in use"

Backend için / For backend:
```bash
# Hangi processin kullandığını bulun / Find which process is using it
lsof -i :7100
# Process'i durdurun / Stop the process
kill -9 <PID>
```

Frontend için / For frontend:
```bash
# Farklı port kullanın / Use different port
python3 -m http.server 7081
# Tarayıcıda / In browser: http://localhost:7081
```

### "Bağımlılık hatası" / "Dependency error"

```bash
cd backend

# Tüm bağımlılıkları yeniden yükle / Reinstall all dependencies
pip install --force-reinstall -r requirements.txt

# Veya tek tek / Or one by one:
pip install --upgrade pip
pip install -r requirements.txt
```

### "WebGL desteklenmiyor" / "WebGL not supported"

- Farklı tarayıcı deneyin / Try different browser (Chrome, Firefox, Edge)
- GPU driver'larını güncelleyin / Update GPU drivers
- Donanım hızlandırmayı aktif edin / Enable hardware acceleration

---

## 🎯 İlk Adımlar / First Steps

### 1. Karakterini Özelleştir / Customize Your Character

- Oyun başladıktan sonra **ESC** tuşuna basın
- **Karakter Düzenle** seçeneğine tıklayın
- Görünümünüzü değiştirin

### 2. İlk Odanı Satın Al / Buy Your First Room

- **ESC** → **Oda Satın Al**
- $10 karşılığında bir oda satın alın
- Reklamlarla para kazanın!

### 3. Multiplayer'ı Dene / Try Multiplayer

- Başka bir browser tab'i açın
- Farklı bir hesap oluşturun
- İki oyuncu aynı labirentte oynayabilir!

---

## 📚 Daha Fazla Bilgi / More Information

- 📖 Detaylı dokümantasyon: [README.md](README.md)
- 🔧 API Dokümantasyonu: http://localhost:7100/docs
- 🐛 Sorun bildirin: GitHub Issues

---

## ✅ Checklist

İlk çalıştırmadan önce kontrol edin / Check before first run:

- [ ] Python 3.11+ kurulu / Python 3.11+ installed
- [ ] Git kurulu / Git installed
- [ ] Repository klonlandı / Repository cloned
- [ ] Backend script çalıştırıldı / Backend script executed
- [ ] Frontend script çalıştırıldı / Frontend script executed
- [ ] http://localhost:7100/docs açılıyor / opens
- [ ] http://localhost:7080 açılıyor / opens
- [ ] Hesap oluşturuldu / Account created
- [ ] Oyun başladı / Game started

---

**Kolay gelsin! / Have fun!** 🎮🎉
