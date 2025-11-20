// Room Provider - Abstraction layer for room data
// Bu sistem sayede oda bilgisi local veya server'dan gelebilir

// Base class (Interface pattern)
class RoomProvider {
    async getCurrentRoom() {
        throw new Error("getCurrentRoom() must be implemented");
    }

    async moveToRoom(direction) {
        throw new Error("moveToRoom() must be implemented");
    }

    async getStartPosition() {
        throw new Error("getStartPosition() must be implemented");
    }
}

// ============================================
// LOCAL PROVIDER (Test/Development için)
// Tüm labirent client-side'da
// ============================================
class LocalRoomProvider extends RoomProvider {
    constructor(mazeWidth, mazeHeight) {
        super();
        this.maze = new Maze(mazeWidth, mazeHeight);
        this.currentX = 0;
        this.currentY = 0;
        this.visitedRooms = new Set(); // Fog of war için
        this.visitedRooms.add(`${this.currentX},${this.currentY}`);
    }

    async getStartPosition() {
        return {
            x: this.currentX,
            y: this.currentY
        };
    }

    // Player pozisyonunu güncelle (oda geçişlerinde çağrılır)
    updatePosition(x, y) {
        this.currentX = x;
        this.currentY = y;
        this.visitedRooms.add(`${x},${y}`);
    }

    async getCurrentRoom() {
        const room = this.maze.getRoom(this.currentX, this.currentY);
        if (!room) {
            console.error(`Room not found at (${this.currentX}, ${this.currentY})`);
            return null;
        }

        // Sadece mevcut oda bilgisi dön
        return {
            x: room.x,
            y: room.y,
            doors: {
                north: room.doors.north,
                south: room.doors.south,
                east: room.doors.east,
                west: room.doors.west
            },
            wallTextures: room.wallTextures,
            ads: room.ads, // Reklam bilgisi
            features: room.features || {} // Gelecekte: ödüller, tuzaklar, vb.
        };
    }

    async moveToRoom(direction) {
        const currentRoom = this.maze.getRoom(this.currentX, this.currentY);

        // Kapı kontrolü
        if (!currentRoom.doors[direction]) {
            return {
                success: false,
                error: "NO_DOOR",
                message: "Bu yönde kapı yok!"
            };
        }

        // Yeni pozisyon hesapla
        let newX = this.currentX;
        let newY = this.currentY;

        switch(direction) {
            case 'north': newY--; break;
            case 'south': newY++; break;
            case 'east': newX++; break;
            case 'west': newX--; break;
        }

        // Sınır kontrolü
        if (!this.maze.canMoveTo(newX, newY)) {
            return {
                success: false,
                error: "OUT_OF_BOUNDS",
                message: "Labirentin dışına çıkamazsınız!"
            };
        }

        // Hareket başarılı
        this.currentX = newX;
        this.currentY = newY;
        this.visitedRooms.add(`${newX},${newY}`);

        const newRoom = await this.getCurrentRoom();

        return {
            success: true,
            room: newRoom
        };
    }

    // Minimap için - sadece ziyaret edilen odalar
    getVisitedRooms() {
        const visited = [];
        this.visitedRooms.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            const room = this.maze.getRoom(x, y);
            if (room) {
                visited.push({
                    x: room.x,
                    y: room.y,
                    doors: room.doors
                });
            }
        });
        return visited;
    }

    // Development/debug için
    getMazeSize() {
        return {
            width: this.maze.width,
            height: this.maze.height
        };
    }
}

// ============================================
// SERVER PROVIDER (Production için)
// Tüm labirent server-side'da
// ============================================
class ServerRoomProvider extends RoomProvider {
    constructor(apiBaseUrl = '/api/maze') {
        super();
        this.apiBaseUrl = apiBaseUrl;
        this.sessionToken = null;
        this.currentRoom = null;
        this.visitedRooms = [];
    }

    async getStartPosition() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Session token sakla
            this.sessionToken = data.sessionToken;
            this.currentRoom = data.room;
            this.visitedRooms.push({
                x: data.room.x,
                y: data.room.y,
                doors: data.room.doors
            });

            return {
                x: data.room.x,
                y: data.room.y
            };
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    // Server provider için pozisyon güncellemesi gerekmez (server takip ediyor)
    // Ama interface uyumluluğu için boş method
    updatePosition(x, y) {
        // Server-side tracking, no action needed
    }

    async getCurrentRoom() {
        if (!this.currentRoom) {
            throw new Error("No current room. Call getStartPosition() first.");
        }
        return this.currentRoom;
    }

    async moveToRoom(direction) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ direction })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                return {
                    success: false,
                    error: data.error,
                    message: data.message
                };
            }

            // Yeni oda bilgisini sakla
            this.currentRoom = data.room;
            this.visitedRooms.push({
                x: data.room.x,
                y: data.room.y,
                doors: data.room.doors
            });

            return {
                success: true,
                room: data.room,
                rewards: data.rewards || [] // Ödüller varsa
            };
        } catch (error) {
            console.error('Failed to move:', error);
            return {
                success: false,
                error: "NETWORK_ERROR",
                message: "Sunucuya bağlanılamadı!"
            };
        }
    }

    // Minimap için - sadece ziyaret edilen odalar
    getVisitedRooms() {
        return this.visitedRooms;
    }

    // Server provider için maze size bilinmez
    getMazeSize() {
        return {
            width: null,
            height: null
        };
    }
}
