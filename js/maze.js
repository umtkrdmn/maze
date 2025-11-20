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
        // Başlangıç odasına (0,0) reklam ekle
        const startRoom = this.getRoom(0, 0);
        if (startRoom) {
            // Kuzey duvarına resim reklam (Canvas tabanlı - internet gerektirmez)
            startRoom.setAd('north', {
                type: 'image',
                url: 'canvas:welcome',
                text: 'HOŞGELDİNİZ!',
                bgColor: '#FF6B6B',
                textColor: '#FFFFFF',
                width: 2,
                height: 1,
                position: { x: 0, y: 2.5 }
            });

            // Doğu duvarına farklı reklam
            startRoom.setAd('east', {
                type: 'image',
                url: 'canvas:ad1',
                text: 'REKLAM 1',
                bgColor: '#4ECDC4',
                textColor: '#FFFFFF',
                width: 2.5,
                height: 1.2,
                position: { x: 0, y: 2.5 }
            });
        }

        // (1,0) odasına reklam ekle
        const room1 = this.getRoom(1, 0);
        if (room1) {
            room1.setAd('west', {
                type: 'image',
                url: 'canvas:newroom',
                text: 'YENİ ODA!',
                bgColor: '#FFE66D',
                textColor: '#000000',
                width: 2,
                height: 1,
                position: { x: 0, y: 2.5 }
            });

            room1.setAd('north', {
                type: 'image',
                url: 'canvas:discount',
                text: 'ÖZEL İNDİRİM!',
                bgColor: '#95E1D3',
                textColor: '#000000',
                width: 3,
                height: 1.5,
                position: { x: 0, y: 2.5 }
            });
        }

        // (0,1) odasına reklam ekle
        const room2 = this.getRoom(0, 1);
        if (room2) {
            room2.setAd('south', {
                type: 'image',
                url: 'canvas:welcome2',
                text: 'HOŞGELDİNİZ 2',
                bgColor: '#F38181',
                textColor: '#FFFFFF',
                width: 2,
                height: 1,
                position: { x: 0, y: 2.5 }
            });
        }

        // (1,1) odasına reklam ekle
        const room3 = this.getRoom(1, 1);
        if (room3) {
            room3.setAd('north', {
                type: 'image',
                url: 'canvas:test',
                text: 'TEST ODA 1,1',
                bgColor: '#A8E6CF',
                textColor: '#000000',
                width: 2.5,
                height: 1.2,
                position: { x: 0, y: 2.5 }
            });

            room3.setAd('west', {
                type: 'image',
                url: 'canvas:here',
                text: 'BURASI 1,1',
                bgColor: '#FFD3B6',
                textColor: '#000000',
                width: 2,
                height: 1,
                position: { x: 0, y: 2.5 }
            });
        }

        console.log('Örnek reklamlar eklendi!');
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
