// Labirent Veri Yapısı ve Yönetimi

class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.rooms = [];
        this.initializeMaze();
    }

    initializeMaze() {
        // Tüm odaları oluştur
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.rooms.push(new Room(x, y));
            }
        }

        // Rastgele kapılar oluştur (basit algoritma)
        this.generateDoors();

        // Örnek reklamlar ekle (test için)
        this.addSampleAds();
    }

    addSampleAds() {
        // Her odayı dolaş ve kapısız duvarlara reklam ekle
        const adColors = [
            { bg: '#FF6B6B', text: '#FFFFFF', label: 'REKLAM 1' },
            { bg: '#4ECDC4', text: '#FFFFFF', label: 'REKLAM 2' },
            { bg: '#FFE66D', text: '#000000', label: 'ÖZEL TEKLİF' },
            { bg: '#95E1D3', text: '#000000', label: 'İNDİRİM' },
            { bg: '#F38181', text: '#FFFFFF', label: 'YENİ ÜRÜN' },
            { bg: '#A8E6CF', text: '#000000', label: 'KAMPANYA' },
            { bg: '#FFD3B6', text: '#000000', label: 'FIRSAT' },
            { bg: '#C7CEEA', text: '#000000', label: 'SÜPER FİYAT' }
        ];

        let adIndex = 0;
        let nikeAdAdded = false; // Nike reklamını bir kere eklemek için

        for (let room of this.rooms) {
            // Her yön için kontrol et
            const directions = ['north', 'south', 'east', 'west'];

            for (let direction of directions) {
                // Eğer bu yönde kapı yoksa reklam ekle
                if (!room.doors[direction]) {
                    // İlk kapısız duvara Nike reklamı ekle
                    if (!nikeAdAdded) {
                        room.setAd(direction, {
                            type: 'image',
                            url: 'https://static.nike.com/a/images/f_auto/dpr_1.0,cs_srgb/h_1513,c_limit/f3610e3a-2415-4892-9fe5-6c7646d21a86/never-done-inspiring-ad-revolution.jpg',
                            width: 3,
                            height: 2,
                            position: { x: 0, y: 2.5 }
                        });
                        nikeAdAdded = true;
                        console.log(`Nike reklamı eklendi: Oda (${room.x}, ${room.y}), Duvar: ${direction}`);
                    } else {
                        // Diğer duvarlara canvas reklamlar ekle
                        const ad = adColors[adIndex % adColors.length];
                        room.setAd(direction, {
                            type: 'image',
                            url: `canvas:ad-${room.x}-${room.y}-${direction}`,
                            text: `${ad.label}\nOda: ${room.x},${room.y}`,
                            bgColor: ad.bg,
                            textColor: ad.text,
                            width: 2.5,
                            height: 1.2,
                            position: { x: 0, y: 2.5 }
                        });
                    }
                    adIndex++;
                }
            }
        }

        console.log('Örnek reklamlar eklendi (sadece kapısız duvarlara)!');
    }

    generateDoors() {
        // Her oda için rastgele kapılar oluştur
        for (let room of this.rooms) {
            const { x, y } = room;

            // Kuzey kapısı (yukarı)
            if (y > 0 && Math.random() > 0.4) {
                room.doors.north = true;
                this.getRoom(x, y - 1).doors.south = true;
            }

            // Doğu kapısı (sağ)
            if (x < this.width - 1 && Math.random() > 0.4) {
                room.doors.east = true;
                this.getRoom(x + 1, y).doors.west = true;
            }
        }

        // Başlangıç odasının en az bir kapısı olsun
        const startRoom = this.getRoom(0, 0);
        if (!this.hasAnyDoor(startRoom)) {
            if (this.width > 1) startRoom.doors.east = true;
            else if (this.height > 1) startRoom.doors.south = true;
        }
    }

    hasAnyDoor(room) {
        return room.doors.north || room.doors.south ||
               room.doors.east || room.doors.west;
    }

    getRoom(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.rooms[y * this.width + x];
    }

    getDoorCount(x, y) {
        const room = this.getRoom(x, y);
        if (!room) return 0;

        let count = 0;
        if (room.doors.north) count++;
        if (room.doors.south) count++;
        if (room.doors.east) count++;
        if (room.doors.west) count++;
        return count;
    }

    canMoveTo(fromX, fromY, direction) {
        const room = this.getRoom(fromX, fromY);
        if (!room) return false;

        switch(direction) {
            case 'north':
                return room.doors.north && fromY > 0;
            case 'south':
                return room.doors.south && fromY < this.height - 1;
            case 'east':
                return room.doors.east && fromX < this.width - 1;
            case 'west':
                return room.doors.west && fromX > 0;
            default:
                return false;
        }
    }
}

class Room {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.doors = {
            north: false,
            south: false,
            east: false,
            west: false
        };
        this.wallTextures = {
            north: null,
            south: null,
            east: null,
            west: null
        };
        // Reklam sistemi - her duvar için reklam bilgisi
        this.ads = {
            north: null,
            south: null,
            east: null,
            west: null
        };
    }

    setWallTexture(direction, textureUrl) {
        if (this.wallTextures.hasOwnProperty(direction)) {
            this.wallTextures[direction] = textureUrl;
        }
    }

    hasTexture(direction) {
        return this.wallTextures[direction] !== null;
    }

    // Reklam ekleme metodu
    setAd(direction, adConfig) {
        // adConfig: { type: 'image' | 'video', url: 'path/to/file', width: 2, height: 1, position: { x: 0, y: 2 } }
        if (this.ads.hasOwnProperty(direction)) {
            this.ads[direction] = adConfig;
        }
    }

    hasAd(direction) {
        return this.ads[direction] !== null;
    }

    getAd(direction) {
        return this.ads[direction];
    }
}
