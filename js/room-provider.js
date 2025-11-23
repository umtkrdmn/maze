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
// Tüm labirent server-side'da, güvenli mimari
// ============================================
class ServerRoomProvider extends RoomProvider {
    constructor() {
        super();
        this.sessionToken = null;
        this.currentRoom = null;
        this.visitedRooms = [];
        this.mazeSize = { width: null, height: null };

        // Trap effects
        this.trapEffects = {
            frozen: false,
            frozenUntil: null,
            blind: false,
            blindUntil: null,
            slow: false,
            slowUntil: null,
            speedMultiplier: 1.0,
            reverseControls: false,
            reverseUntil: null
        };
    }

    async getStartPosition() {
        try {
            // API client'ı kullan (seçilen maze ID ile)
            const mazeId = window.selectedMazeId || null;
            console.log('ServerRoomProvider: Starting game with mazeId:', mazeId);
            const data = await api.startGame(mazeId);

            console.log('ServerRoomProvider: Received data from backend:', data);
            console.log('ServerRoomProvider: Room data:', data.room);
            console.log('ServerRoomProvider: Room doors:', data.room?.doors);

            // Session token sakla
            this.sessionToken = data.session_token;
            this.currentRoom = data.room;
            this.mazeSize = data.maze_size;
            this.mazeName = data.maze_name;

            console.log('ServerRoomProvider: Stored currentRoom:', this.currentRoom);
            console.log('ServerRoomProvider: Maze name:', this.mazeName, 'Size:', this.mazeSize);

            // İlk oda ziyaret edildi
            this.visitedRooms.push({
                x: data.room.x,
                y: data.room.y,
                doors: data.room.doors
            });

            // WebSocket'e bağlan
            if (api.token) {
                gameWS.connect(api.token);
            }

            return {
                x: data.room.x,
                y: data.room.y
            };
        } catch (error) {
            console.error('Failed to start game:', error);
            throw error;
        }
    }

    // Server provider için pozisyon güncellemesi
    updatePosition(x, y) {
        // WebSocket ile diğer oyunculara bildir
        if (gameWS.connected) {
            gameWS.changeRoom(x, y);
        }
    }

    // Player 3D pozisyonunu güncelle (WebSocket için)
    update3DPosition(posX, posY, posZ, yaw, pitch) {
        if (gameWS.connected) {
            gameWS.updatePosition(posX, posY, posZ, yaw, pitch);
        }
    }

    async getCurrentRoom() {
        if (!this.currentRoom) {
            throw new Error("No current room. Call getStartPosition() first.");
        }
        return this.currentRoom;
    }

    async moveToRoom(direction) {
        // Freeze kontrolü
        if (this.trapEffects.frozen) {
            if (new Date() < new Date(this.trapEffects.frozenUntil)) {
                return {
                    success: false,
                    error: "FROZEN",
                    message: "Donduruldunuz! Hareket edemezsiniz."
                };
            } else {
                this.trapEffects.frozen = false;
                this.trapEffects.frozenUntil = null;
            }
        }

        try {
            const data = await api.move(direction, this.sessionToken);

            if (!data.success) {
                return {
                    success: false,
                    error: data.error,
                    message: data.error
                };
            }

            // Yeni oda bilgisini sakla
            this.currentRoom = data.room;

            // Ziyaret edilen odalara ekle (eğer yoksa)
            const exists = this.visitedRooms.some(
                r => r.x === data.room.x && r.y === data.room.y
            );
            if (!exists) {
                this.visitedRooms.push({
                    x: data.room.x,
                    y: data.room.y,
                    doors: data.room.doors
                });
            }

            // WebSocket ile oda değişikliğini bildir
            if (gameWS.connected) {
                gameWS.changeRoom(data.room.x, data.room.y);
            }

            // Ödül kontrolü
            let rewardResult = null;
            if (data.reward && data.reward.claimed) {
                rewardResult = {
                    claimed: true,
                    amount: data.reward.amount,
                    type: data.reward.type,
                    isBigReward: data.reward.is_big_reward
                };
            }

            // Tuzak kontrolü
            let trapResult = null;
            if (data.trap) {
                trapResult = this.applyTrapEffect(data.trap);
            }

            return {
                success: true,
                room: data.room,
                reward: rewardResult,
                trap: trapResult
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

    applyTrapEffect(trapData) {
        const now = new Date();

        switch (trapData.trap_type) {
            case 'freeze':
                this.trapEffects.frozen = true;
                this.trapEffects.frozenUntil = new Date(now.getTime() + trapData.duration * 1000);
                break;

            case 'blind':
                this.trapEffects.blind = true;
                this.trapEffects.blindUntil = new Date(now.getTime() + trapData.duration * 1000);
                break;

            case 'slow':
                this.trapEffects.slow = true;
                this.trapEffects.slowUntil = new Date(now.getTime() + trapData.duration * 1000);
                this.trapEffects.speedMultiplier = trapData.speed_multiplier || 0.5;
                break;

            case 'reverse_controls':
                this.trapEffects.reverseControls = true;
                this.trapEffects.reverseUntil = new Date(now.getTime() + trapData.duration * 1000);
                break;
        }

        return {
            type: trapData.trap_type,
            message: trapData.message,
            duration: trapData.duration
        };
    }

    // Tuzak efektlerini kontrol et ve güncelle
    updateTrapEffects() {
        const now = new Date();

        if (this.trapEffects.frozen && now >= new Date(this.trapEffects.frozenUntil)) {
            this.trapEffects.frozen = false;
            this.trapEffects.frozenUntil = null;
        }

        if (this.trapEffects.blind && now >= new Date(this.trapEffects.blindUntil)) {
            this.trapEffects.blind = false;
            this.trapEffects.blindUntil = null;
        }

        if (this.trapEffects.slow && now >= new Date(this.trapEffects.slowUntil)) {
            this.trapEffects.slow = false;
            this.trapEffects.slowUntil = null;
            this.trapEffects.speedMultiplier = 1.0;
        }

        if (this.trapEffects.reverseControls && now >= new Date(this.trapEffects.reverseUntil)) {
            this.trapEffects.reverseControls = false;
            this.trapEffects.reverseUntil = null;
        }
    }

    getSpeedMultiplier() {
        this.updateTrapEffects();
        return this.trapEffects.slow ? this.trapEffects.speedMultiplier : 1.0;
    }

    isBlinded() {
        this.updateTrapEffects();
        return this.trapEffects.blind;
    }

    areControlsReversed() {
        this.updateTrapEffects();
        return this.trapEffects.reverseControls;
    }

    async usePortal() {
        if (!this.currentRoom || !this.currentRoom.has_portal) {
            return {
                success: false,
                error: "NO_PORTAL",
                message: "Bu odada portal yok!"
            };
        }

        try {
            const data = await api.usePortal(this.sessionToken);

            if (data.success) {
                this.currentRoom = data.room;

                // Ziyaret edilen odalara ekle
                const exists = this.visitedRooms.some(
                    r => r.x === data.room.x && r.y === data.room.y
                );
                if (!exists) {
                    this.visitedRooms.push({
                        x: data.room.x,
                        y: data.room.y,
                        doors: data.room.doors
                    });
                }

                // WebSocket bildir
                if (gameWS.connected) {
                    gameWS.changeRoom(data.teleported_to.x, data.teleported_to.y);
                }
            }

            return data;
        } catch (error) {
            console.error('Portal kullanılamadı:', error);
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

    getMazeSize() {
        return this.mazeSize;
    }

    // Odadaki diğer oyuncuları al
    getOtherPlayers() {
        return gameWS.getPlayersInRoom();
    }

    // Chat mesajı gönder
    sendChatMessage(message) {
        if (gameWS.connected) {
            gameWS.sendChat(message);
        }
    }
}
