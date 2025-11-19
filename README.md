# 🎮 3D Labirent Oyunu

Web tabanlı, gerçek zamanlı 3D labirent keşif oyunu.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Educational-green)

## ✨ Özellikler

- 🎯 **3D Görselleştirme**: Three.js ile gerçekçi 3D render
- 🗺️ **Minimap**: Gerçek zamanlı harita ve konum göstergesi
- 🚪 **Dinamik Kapı Sistemi**: Akıllı oda geçiş mekaniği
- 🎮 **Kolay Kontroller**: Klavye ve mouse ile sezgisel hareket
- 🔧 **Debug Modu**: Geliştirici dostu bilgi göstergeleri
- 🖼️ **Duvar Texture Desteği**: Reklam panoları için hazır altyapı

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Modern web tarayıcı (WebGL desteği)
- HTTP sunucusu (CORS için)

### Kurulum

1. Repoyu klonlayın:
```bash
git clone <repo-url>
cd maze
```

2. HTTP sunucusu başlatın:
```bash
# Python 3
python -m http.server 8000

# veya Node.js
npx http-server
```

3. Tarayıcıda açın:
```
http://localhost:8000
```

## 🎮 Kontroller

| Tuş | Aksiyon |
|-----|---------|
| **W** / **↑** | İleri Git |
| **S** / **↓** | Geri Git |
| **A** / **←** | Sola Dön |
| **D** / **→** | Sağa Dön |
| **Mouse** | Etrafı Bak (canvas'a tıkladıktan sonra) |

## 📁 Proje Yapısı

```
maze/
├── index.html              # Ana sayfa
├── css/
│   └── style.css          # Stil dosyası
├── js/
│   ├── maze.js            # Labirent mantığı
│   ├── player.js          # Oyuncu kontrolü
│   ├── renderer.js        # 3D render
│   ├── minimap.js         # Harita sistemi
│   └── game.js            # Ana oyun döngüsü
└── GAME_DOCUMENTATION.md  # Detaylı dokümantasyon
```

## 🎯 Nasıl Çalışır?

1. **Labirent Sistemi**: 4x4 grid tabanlı oda yapısı
2. **Kapı Mekaniği**: Her odada 1-4 kapı (rastgele üretilir)
3. **Hareket**: Kapı varsa odalar arası geçiş yapabilirsiniz
4. **3D Render**: Sadece bulunduğunuz oda render edilir (performans)
5. **Minimap**: Tüm labirent ve konumunuz gösterilir

## 🔧 Özelleştirme

### Labirent Boyutunu Değiştirme

`js/game.js` dosyasında:
```javascript
// 4x4 yerine 10x10
this.maze = new Maze(10, 10);
```

### Duvar Texture Ekleme

```javascript
const room = maze.getRoom(2, 3);
room.setWallTexture('north', 'path/to/image.jpg');
```

## 📚 Detaylı Dokümantasyon

Daha fazla bilgi için [GAME_DOCUMENTATION.md](GAME_DOCUMENTATION.md) dosyasına bakın.

## 🛣️ Yol Haritası

### Mevcut Özellikler (v1.0)
- ✅ 3D labirent render
- ✅ Oyuncu hareketi
- ✅ Minimap
- ✅ Debug bilgileri

### Yakında
- 🔄 Duvar texture UI
- 🔄 Video desteği
- 🔄 Ses efektleri

### Gelecek
- 🔮 Multiplayer mod
- 🔮 Tuzak sistemi
- 🔮 Prosedürel labirent üretimi

## 🐛 Sorun Giderme

### Siyah ekran görüyorum
- Tarayıcınızın WebGL desteğini kontrol edin
- Konsol hatalarını inceleyin (F12)

### Kontroller çalışmıyor
- Canvas'a tıkladığınızdan emin olun
- Sayfa focus'unu kontrol edin

## 📄 Lisans

Bu proje eğitim amaçlıdır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

**Geliştirici**: AI Assistant
**Versiyon**: 1.0.0
**Son Güncelleme**: 2025-11-19
