# Gerekli Ses Dosyaları

Oyun için aşağıdaki ses dosyalarına ihtiyaç var. Tüm dosyalar `assets/sounds/` klasörüne konulmalıdır.

## Klasör Yapısı
```
assets/
  sounds/
    footstep_wood.mp3
    footstep_stone.mp3
    footstep_carpet.mp3
    footstep_metal.mp3
    door_open.mp3
    door_close.mp3
    door_locked.mp3
    coin_pickup.mp3
    jackpot.mp3
    trap_trigger.mp3
    freeze.mp3
    teleport.mp3
    portal_hum.mp3
    portal_use.mp3
    ui_click.mp3
    ui_hover.mp3
    chat_message.mp3
    notification.mp3
    ambient_default.mp3
    ambient_spaceship.mp3
    ambient_underwater.mp3
    ambient_forest.mp3
    ambient_medieval.mp3
    ambient_cyberpunk.mp3
```

## Ses Dosyası Kategorileri

### 1. Ayak Sesleri (Footsteps) - 4 adet
- `footstep_wood.mp3` - Ahşap zemin
- `footstep_stone.mp3` - Taş zemin
- `footstep_carpet.mp3` - Halı zemin
- `footstep_metal.mp3` - Metal zemin

**Arama Terimleri:** "footstep wood", "walking stone", "footstep carpet", "metal footstep"

### 2. Kapı Sesleri (Doors) - 3 adet
- `door_open.mp3` - Kapı açılma
- `door_close.mp3` - Kapı kapanma
- `door_locked.mp3` - Kilitli kapı

**Arama Terimleri:** "door open", "door close", "door locked"

### 3. Ödül Sesleri (Rewards) - 2 adet
- `coin_pickup.mp3` - Küçük ödül (para toplama)
- `jackpot.mp3` - Büyük ödül (jackpot kazanma)

**Arama Terimleri:** "coin pickup", "collect coin", "jackpot win", "big win"

### 4. Tuzak Sesleri (Traps) - 3 adet
- `trap_trigger.mp3` - Tuzak tetikleme
- `freeze.mp3` - Donma efekti
- `teleport.mp3` - Işınlanma

**Arama Terimleri:** "trap trigger", "freeze ice", "teleport magic"

### 5. Portal Sesleri - 2 adet
- `portal_hum.mp3` - Portal ambient (döngü)
- `portal_use.mp3` - Portal kullanma

**Arama Terimleri:** "portal loop", "portal hum", "portal use", "teleport"

### 6. UI Sesleri - 4 adet
- `ui_click.mp3` - Butona tıklama
- `ui_hover.mp3` - Mouse hover
- `chat_message.mp3` - Mesaj geldiğinde
- `notification.mp3` - Bildirim

**Arama Terimleri:** "ui click", "button click", "notification", "message ping"

### 7. Ambient Müzikler (Loop) - 6 adet
- `ambient_default.mp3` - Varsayılan ortam
- `ambient_spaceship.mp3` - Uzay gemisi teması
- `ambient_underwater.mp3` - Su altı teması
- `ambient_forest.mp3` - Orman teması
- `ambient_medieval.mp3` - Ortaçağ teması
- `ambient_cyberpunk.mp3` - Cyberpunk teması

**Arama Terimleri:** "ambient loop", "space ambient", "underwater loop", "forest ambience", "medieval ambient", "cyberpunk music"

## Ücretsiz Ses Kaynakları

1. **Freesound.org** - https://freesound.org
   - Creative Commons lisanslı
   - Geniş arşiv
   - Kayıt gerekli

2. **Zapsplat.com** - https://www.zapsplat.com
   - Ücretsiz (kayıt gerekli)
   - Profesyonel kalite
   - Koleksiyonlar mevcut

3. **Mixkit.co** - https://mixkit.co/free-sound-effects
   - Tamamen ücretsiz
   - Kayıt gerektirmez
   - Yüksek kalite

4. **Pixabay** - https://pixabay.com/sound-effects
   - Telif hakkı yok
   - Ücretsiz kullanım
   - MP3 formatında

## İndirme ve Kurulum

1. Ses dosyalarını yukarıdaki kaynaklardan indirin
2. `assets/sounds/` klasörünü oluşturun
3. Tüm ses dosyalarını bu klasöre kopyalayın
4. Dosya isimlerinin tam olarak yukarıdaki liste ile eşleştiğinden emin olun

## Not

- Ses dosyaları **MP3 formatında** olmalı
- Ambient müzikler **döngü (loop) olarak** çalmalı
- Dosya boyutlarını makul tutun (her biri max 500KB önerilir)
- Tüm sesler oyun içi volume kontrolü ile ayarlanabilir
