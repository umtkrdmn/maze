# 3D Labirent Oyunu - Dokümantasyon

## Proje Genel Bakış

Web tabanlı, 3D görselleştirmeli labirent oyunu. Oyuncular odadan odaya geçiş yaparak labirentte dolaşabilirler.

### Temel Özellikler

- ✅ **3D Görselleştirme**: Three.js kullanılarak gerçekçi 3D render
- ✅ **Oda Tabanlı Labirent**: 4x4 grid sisteminde odalar
- ✅ **Kapı Sistemi**: Her odada 1-4 kapı (Kuzey, Güney, Doğu, Batı)
- ✅ **Oyuncu Hareketi**: İleri/geri hareket ve sağa/sola dönüş
- ✅ **Minimap**: Labirent haritası ve oyuncu konumu gösterimi
- ✅ **Debug Bilgileri**: Oda koordinatları, yön ve mevcut kapılar
- ✅ **Duvar Texture Desteği**: Duvarlara resim/video ekleme altyapısı

### Gelecek Özellikler

- ⏳ **Multiplayer Destek**: Çok oyunculu mod
- ⏳ **Tuzaklar**: Odalara tuzak yerleştirme
- ⏳ **Büyük Haritalar**: Dinamik harita boyutlandırma
- ⏳ **Video Desteği**: Duvarlarda video oynatma

---

## Proje Yapısı

```
maze/
│
├── index.html              # Ana HTML dosyası
├── GAME_DOCUMENTATION.md   # Bu dokümantasyon
│
├── css/
│   └── style.css          # Stil dosyası
│
├── js/
│   ├── maze.js            # Labirent veri yapısı ve mantığı
│   ├── player.js          # Oyuncu kontrolü ve hareketi
│   ├── renderer.js        # Three.js 3D render
│   ├── minimap.js         # Minimap/kroki sistemi
│   └── game.js            # Ana oyun döngüsü ve kontroller
│
└── assets/                # (Gelecekte) Resim/video dosyaları
```

---

## Teknik Detaylar

### 1. Labirent Sistemi (`maze.js`)

#### Maze Class
- **Boyut**: `width x height` (varsayılan 4x4)
- **Odalar**: Grid sistemi, her koordinat bir oda
- **Kapı Üretimi**: Rastgele algoritma ile kapılar oluşturulur

```javascript
// Örnek kullanım
const maze = new Maze(4, 4);
const room = maze.getRoom(0, 0);
console.log(room.doors); // { north: true, south: false, east: true, west: false }
```

#### Room Class
Her oda şunları içerir:
- **Koordinatlar**: `x, y` pozisyonu
- **Kapılar**: 4 yönde kapı durumu (boolean)
- **Duvar Textures**: Her duvar için texture URL'si

```javascript
room.setWallTexture('north', 'path/to/image.jpg');
```

### 2. Oyuncu Sistemi (`player.js`)

#### Player Class
- **Konum**: `roomX, roomY` (grid koordinatları)
- **Rotasyon**: Derece cinsinden (0° = Kuzey, 90° = Doğu, vb.)
- **Hareket**: Kapı kontrolü ile oda değiştirme

```javascript
// Hareket metodları
player.moveForward(maze);  // Önde kapı varsa ilerle
player.rotateLeft();        // 90° sola dön
player.rotateRight();       // 90° sağa dön
```

### 3. 3D Render (`renderer.js`)

#### Renderer Class
Three.js kullanarak 3D sahne oluşturur:

**Sahne Bileşenleri**:
- Zemin (gri, düz yüzey)
- Tavan (beyaz, düz yüzey)
- Duvarlar (kapı varsa bölünmüş, yoksa tam)
- Işıklandırma (ambient + directional)

**Kapı Sistemi**:
- Kapı genişliği: 2 birim
- Kapı yüksekliği: 3 birim
- Duvarlar kapı etrafında bölünmüş

**Etiketler** (Debug):
- Her kapının üstünde yön ve oda koordinatları
- Sprite tabanlı 3D metin

```javascript
// Oda değiştiğinde render güncellenir
renderer.createCurrentRoom();
renderer.update();
```

### 4. Minimap (`minimap.js`)

#### Minimap Class
Canvas 2D ile labirent haritası çizer:

**Gösterimler**:
- Odalar: Gri kareler
- Duvarlar: Beyaz çizgiler (kapı yoksa)
- Kapılar: Yeşil çizgiler
- Oyuncu: Kırmızı daire + yön oku

```javascript
minimap.draw(); // Her frame'de çağrılır
```

### 5. Ana Oyun (`game.js`)

#### Game Class
Tüm sistemleri yönetir ve kontrol sağlar.

**Kontroller**:
- **W / ↑**: İleri git
- **S / ↓**: Geri git
- **A / ←**: Sola dön (90°)
- **D / →**: Sağa dön (90°)
- **Mouse**: Etrafı bak (pointer lock ile)

**Debug Bilgileri**:
- Mevcut oda koordinatları
- Oyuncu yönü
- Kullanılabilir kapılar listesi

---

## Oyun Mekaniği

### Kapı Kuralları

1. **1 Kapılı Oda**: Sadece giriş/çıkış, başka odaya geçiş yok
2. **2+ Kapılı Oda**: Farklı odaya geçiş mümkün
3. **Karşılıklı Kapılar**: İki oda arasında kapı varsa, her iki odada da olmalı

### Hareket Sistemi

```
Oyuncu (0,0)'da, Kuzey'e bakıyor
→ W tuşuna bas
→ Kuzey kapısı var mı kontrol et
→ Varsa (0, -1)'e geç
→ Yeni odayı render et
→ Debug bilgilerini güncelle
```

### Rotasyon Sistemi

```
Rotasyon Değeri → Yön
0°   → Kuzey (North)
90°  → Doğu (East)
180° → Güney (South)
270° → Batı (West)
```

---

## Geliştirme Notları

### Performans

- **Current Room Only**: Sadece mevcut oda render edilir (performans için)
- **Mesh Yönetimi**: Oda değişiminde eski mesh'ler temizlenir
- **RequestAnimationFrame**: 60 FPS hedefi

### Genişletilebilirlik

#### Büyük Haritalar İçin
```javascript
// Harita boyutunu artır
const maze = new Maze(10, 10); // 10x10 grid
const maze = new Maze(50, 50); // 50x50 grid
```

#### Duvar Texture Ekleme
```javascript
const room = maze.getRoom(2, 3);
room.setWallTexture('north', 'assets/ad-banner-1.jpg');
room.setWallTexture('east', 'assets/video-poster.jpg');
```

#### Video Desteği (Gelecek)
```javascript
// Video texture için Three.js VideoTexture kullanılabilir
const video = document.createElement('video');
video.src = 'assets/ad-video.mp4';
const texture = new THREE.VideoTexture(video);
```

---

## Çalıştırma

### Lokal Sunucu Gereksinimi

Three.js dosya yükleme için HTTP sunucusu gerektirir:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (http-server)
npx http-server
```

Tarayıcıda: `http://localhost:8000`

### Tarayıcı Desteği

- ✅ Chrome (önerilen)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

WebGL desteği gereklidir.

---

## Versiyon Geçmişi

### v1.0.0 (İlk Versiyon)
- ✅ 4x4 labirent sistemi
- ✅ 3D görselleştirme
- ✅ Oyuncu hareketi ve rotasyonu
- ✅ Minimap
- ✅ Debug bilgileri
- ✅ Kapı sistemi
- ✅ Duvar texture altyapısı

---

## Gelecek Geliştirmeler

### Öncelikli
1. **Texture Sistemi**: Resimleri duvarlara ekleme UI'ı
2. **Video Desteği**: Video texture entegrasyonu
3. **Labirent Editörü**: Drag-drop ile labirent tasarlama

### Orta Vadeli
4. **Tuzak Sistemi**: Odaya tuzak yerleştirme
5. **Ses Efektleri**: Kapı açılma, ayak sesi vb.
6. **Parçacık Efektleri**: Atmosfer için

### Uzun Vadeli
7. **Multiplayer**: WebSocket ile çok oyunculu mod
8. **Prosedürel Üretim**: Otomatik labirent oluşturma
9. **Mobil Destek**: Touch kontroller

---

## Sorun Giderme

### Three.js Yüklenmiyor
- İnternet bağlantınızı kontrol edin
- CDN linkini güncelleyin

### Siyah Ekran
- Tarayıcı konsolunu kontrol edin
- WebGL desteğini kontrol edin: `chrome://gpu`

### Kontroller Çalışmıyor
- Canvas'a tıkladığınızdan emin olun
- Klavye focus'unu kontrol edin

---

## Lisans

Bu proje eğitim amaçlıdır. Ticari kullanım için uygun değildir.

---

**Son Güncelleme**: 2025-11-19
**Versiyon**: 1.0.0
