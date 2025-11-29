// Room Provider - Abstraction layer for room data
// Bu sistem sayede oda bilgisi local veya server'dan gelebilir

// Template decorations - used when extra_features is empty but template is set
const TEMPLATE_DECORATIONS = {
    default: [
        { type: 'potted_plant', position: [-3.5, 0, -3.5], scale: [1, 1, 1], color: '#228B22' },
        { type: 'floor_lamp', position: [3.5, 0, -3.5], scale: [1, 1, 1], color: '#FFE4B5' }
    ],
    halloween: [
        { type: 'pumpkin', position: [-3, 0, -3], scale: [1.2, 1.2, 1.2], color: '#FF6600', properties: { glowing: true } },
        { type: 'pumpkin', position: [3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#FF7518' },
        { type: 'bat', position: [0, 3.5, -2], scale: [0.6, 0.6, 0.6], color: '#1A1A1A' },
        { type: 'bat', position: [-2, 3.2, 1], scale: [0.5, 0.5, 0.5], color: '#2D2D2D' },
        { type: 'spider_web', position: [-4.9, 3, -4.9], scale: [2, 2, 0.1], color: '#CCCCCC' },
        { type: 'cauldron', position: [3, 0, -3], scale: [1, 1, 1], color: '#2F2F2F', properties: { bubbling: true, smoke_color: '#00FF00' } }
    ],
    christmas: [
        { type: 'christmas_tree', position: [-3, 0, -3], scale: [1.5, 1.5, 1.5], color: '#006400', properties: { lights: true, star_color: '#FFD700' } },
        { type: 'gift_box', position: [-2.5, 0, -2], scale: [0.5, 0.5, 0.5], color: '#FF0000', properties: { ribbon_color: '#FFD700' } },
        { type: 'gift_box', position: [-3.5, 0, -1.8], scale: [0.4, 0.6, 0.4], color: '#00FF00', properties: { ribbon_color: '#FF0000' } },
        { type: 'gift_box', position: [-2.8, 0, -1.5], scale: [0.6, 0.4, 0.6], color: '#0000FF', properties: { ribbon_color: '#FFFFFF' } },
        { type: 'snowman', position: [3.5, 0, -3], scale: [0.8, 0.8, 0.8], color: '#FFFFFF' },
        { type: 'candy_cane', position: [3.5, 0, 3], scale: [1, 1, 1], color: '#FF0000' },
        { type: 'string_lights', position: [0, 3.8, 0], scale: [10, 1, 10], color: '#FF0000', properties: { colors: ['#FF0000', '#00FF00', '#FFD700', '#0000FF'] } }
    ],
    modern_office: [
        { type: 'desk', position: [0, 0, -3.5], scale: [1, 1, 1], color: '#8B4513' },
        { type: 'office_chair', position: [0, 0, -2.5], scale: [1, 1, 1], color: '#1A1A1A' },
        { type: 'potted_plant', position: [-3.5, 0, -3.5], scale: [1.2, 1.2, 1.2], color: '#228B22' },
        { type: 'desk_lamp', position: [0.8, 0.8, -3.5], scale: [0.5, 0.5, 0.5], color: '#C0C0C0' },
        { type: 'water_cooler', position: [3.5, 0, -3.5], scale: [1, 1, 1], color: '#ADD8E6' },
        { type: 'clock', position: [0, 2.5, -4.9], scale: [0.6, 0.6, 0.1], color: '#FFFFFF' }
    ],
    old_salon: [
        { type: 'fireplace', position: [0, 0, -4.5], scale: [1.5, 1.5, 1], color: '#8B0000', properties: { fire: true } },
        { type: 'chandelier', position: [0, 3.5, 0], scale: [1.2, 1, 1.2], color: '#FFD700', properties: { candles: 6 } },
        { type: 'grandfather_clock', position: [-4, 0, 0], scale: [1, 1, 0.5], color: '#654321' },
        { type: 'armchair', position: [-2, 0, -2], scale: [1, 1, 1], color: '#8B0000', properties: { rotation_y: 0.5 } },
        { type: 'armchair', position: [2, 0, -2], scale: [1, 1, 1], color: '#8B0000', properties: { rotation_y: -0.5 } },
        { type: 'candelabra', position: [3.5, 1, -4], scale: [0.5, 0.5, 0.5], color: '#C0C0C0', properties: { lit: true } }
    ],
    spaceship: [
        { type: 'control_panel', position: [0, 0.5, -4.5], scale: [3, 1, 0.5], color: '#1C1C1C', properties: { screen_color: '#00FFFF', blinking: true } },
        { type: 'hologram', position: [0, 1.5, 0], scale: [1, 2, 1], color: '#00FFFF', properties: { rotating: true, shape: 'globe' } },
        { type: 'light_tube', position: [-4.8, 2, 0], scale: [0.1, 3, 0.1], color: '#00FFFF' },
        { type: 'light_tube', position: [4.8, 2, 0], scale: [0.1, 3, 0.1], color: '#00FFFF' },
        { type: 'cryopod', position: [3.5, 0, -3], scale: [1, 2, 1], color: '#4169E1', properties: { frost: true } },
        { type: 'robot', position: [-3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#C0C0C0' }
    ],
    underwater: [
        { type: 'coral', position: [-3, 0, -3], scale: [1.5, 1.5, 1.5], color: '#FF6B6B' },
        { type: 'coral', position: [3.5, 0, -2], scale: [1, 1.2, 1], color: '#FF69B4' },
        { type: 'seashell', position: [2, 0, 3], scale: [0.8, 0.8, 0.8], color: '#FFF5EE' },
        { type: 'starfish', position: [-2, 0.01, 2], scale: [0.6, 0.1, 0.6], color: '#FF4500' },
        { type: 'bubbles', position: [0, 2, 0], scale: [5, 4, 5], color: '#87CEEB', properties: { animated: true } },
        { type: 'fish', position: [2, 2.5, -1], scale: [0.5, 0.5, 0.5], color: '#FFD700', properties: { swimming: true } },
        { type: 'fish', position: [-1, 2, 2], scale: [0.4, 0.4, 0.4], color: '#FF6347', properties: { swimming: true } },
        { type: 'treasure_chest', position: [3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#8B4513', properties: { open: true, gold: true } }
    ],
    forest: [
        { type: 'tree_stump', position: [-3, 0, -3], scale: [1.2, 0.8, 1.2], color: '#8B4513' },
        { type: 'mushroom', position: [-2, 0, -2], scale: [0.5, 0.5, 0.5], color: '#FF0000', properties: { spots: true } },
        { type: 'mushroom', position: [3, 0, -3.5], scale: [0.7, 0.7, 0.7], color: '#DEB887' },
        { type: 'mushroom', position: [3.5, 0, -3], scale: [0.4, 0.4, 0.4], color: '#FFD700' },
        { type: 'fern', position: [3.5, 0, 3], scale: [1.5, 1.5, 1.5], color: '#228B22' },
        { type: 'rock', position: [-3.5, 0, 3], scale: [1, 0.6, 1], color: '#696969' },
        { type: 'fireflies', position: [0, 2, 0], scale: [5, 3, 5], color: '#FFFF00', properties: { animated: true, count: 20 } },
        { type: 'bird', position: [2, 3, -2], scale: [0.4, 0.4, 0.4], color: '#FF6347' }
    ],
    desert: [
        { type: 'cactus', position: [-3, 0, -3], scale: [1.5, 2, 1.5], color: '#228B22' },
        { type: 'cactus', position: [3.5, 0, -2], scale: [1, 1.5, 1], color: '#2E8B57' },
        { type: 'sand_dune', position: [3, 0, 3], scale: [2, 0.5, 2], color: '#DEB887' },
        { type: 'skull', position: [-2, 0.1, 2], scale: [0.4, 0.4, 0.4], color: '#FFFFF0' },
        { type: 'tumbleweed', position: [0, 0.3, 0], scale: [0.6, 0.6, 0.6], color: '#D2B48C' },
        { type: 'pottery', position: [-3.5, 0, 3], scale: [0.8, 1, 0.8], color: '#CD853F' },
        { type: 'sun', position: [0, 4, -4], scale: [1, 1, 0.1], color: '#FFD700', properties: { glowing: true } }
    ],
    cyberpunk: [
        { type: 'neon_sign', position: [0, 2.5, -4.9], scale: [3, 1, 0.1], color: '#FF00FF', properties: { text: 'CYBER', flicker: true } },
        { type: 'neon_tube', position: [-4.8, 2, -2], scale: [0.1, 0.1, 3], color: '#00FFFF' },
        { type: 'neon_tube', position: [4.8, 1.5, 0], scale: [0.1, 0.1, 4], color: '#FF00FF' },
        { type: 'holographic_screen', position: [3, 1.5, -3], scale: [1.5, 1, 0.1], color: '#00FFFF', properties: { animated: true } },
        { type: 'robot_parts', position: [-3, 0, -3], scale: [1, 1, 1], color: '#C0C0C0' },
        { type: 'server_rack', position: [-4, 0, 0], scale: [0.8, 2, 0.5], color: '#1A1A1A', properties: { lights: true } },
        { type: 'drone', position: [2, 2.5, 2], scale: [0.5, 0.3, 0.5], color: '#333333', properties: { hovering: true } }
    ],
    medieval: [
        { type: 'torch', position: [-4.8, 2, -2], scale: [0.3, 0.5, 0.3], color: '#8B4513', properties: { fire: true } },
        { type: 'torch', position: [4.8, 2, -2], scale: [0.3, 0.5, 0.3], color: '#8B4513', properties: { fire: true } },
        { type: 'armor_stand', position: [-3.5, 0, -3.5], scale: [1, 1.8, 1], color: '#C0C0C0' },
        { type: 'barrel', position: [3.5, 0, 3], scale: [0.7, 1, 0.7], color: '#8B4513' },
        { type: 'barrel', position: [3, 0, 3.5], scale: [0.6, 0.9, 0.6], color: '#A0522D' },
        { type: 'banner', position: [0, 2.5, -4.9], scale: [1, 2, 0.1], color: '#8B0000', properties: { emblem: 'lion' } },
        { type: 'sword_display', position: [4, 1.5, 0], scale: [0.2, 1.5, 0.1], color: '#C0C0C0' },
        { type: 'chest', position: [-3, 0, 3], scale: [1, 0.7, 0.6], color: '#654321' }
    ]
};

// Helper function to enrich room data with template decorations if missing
function enrichRoomWithDecorations(room) {
    if (!room || !room.design) return room;

    const template = room.design.template;
    const hasDecorations = room.design.extra_features?.decorations?.length > 0;

    if (template && !hasDecorations && TEMPLATE_DECORATIONS[template]) {
        room.design.extra_features = room.design.extra_features || {};
        room.design.extra_features.decorations = TEMPLATE_DECORATIONS[template];
    }

    return room;
}

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
            this.currentRoom = enrichRoomWithDecorations(data.room);
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
            console.log('🔍 FRONTEND MOVE: Requesting move', direction);
            const data = await api.move(direction, this.sessionToken);

            if (!data.success) {
                console.log('🔍 FRONTEND MOVE: Failed', data.error);
                return {
                    success: false,
                    error: data.error,
                    message: data.error
                };
            }

            console.log('🔍 FRONTEND MOVE: Received room data:', data.room);
            console.log('🔍 FRONTEND MOVE: Room coordinates:', data.room.x, data.room.y);

            // Yeni oda bilgisini sakla (template'e göre dekorasyonları ekle)
            this.currentRoom = enrichRoomWithDecorations(data.room);
            console.log('🔍 FRONTEND MOVE: currentRoom updated to:', this.currentRoom.x, this.currentRoom.y);

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
                room: this.currentRoom,
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
