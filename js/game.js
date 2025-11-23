// Ana Oyun Mantığı ve Kontrol

class Game {
    constructor() {
        // Provider seçimi: Server veya Local
        if (window.useServerProvider && api.token) {
            this.roomProvider = new ServerRoomProvider();
        } else {
            this.roomProvider = new LocalRoomProvider(10, 10);
        }

        // ÖNEMLI: Artık maze bilgisi doğrudan erişilebilir değil!
        // Sadece provider üzerinden current room bilgisi alınabilir
        this.currentRoom = null;

        // Oyuncu (sadece 3D pozisyon tutar, oda bilgisi provider'da)
        this.player = new Player(0, 0);

        // Renderer ve Minimap
        this.renderer = null;
        this.minimap = null;

        // Mobile controls
        this.mobileControls = null;

        // Kontroller
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.2;

        // Multiplayer
        this.otherPlayers = new Map();
        this.positionUpdateInterval = null;

        // Footstep sound timing
        this.lastFootstepTime = 0;
        this.footstepInterval = 400; // ms

        // Make game globally accessible
        window.game = this;

        this.initGame();
    }

    async initGame() {
        try {
            // Başlangıç pozisyonu al
            console.log('Getting start position...');
            const startPos = await this.roomProvider.getStartPosition();
            console.log('Start position:', startPos);
            this.player.roomX = startPos.x;
            this.player.roomY = startPos.y;

            // İlk oda bilgisini al
            console.log('Getting current room...');
            this.currentRoom = await this.roomProvider.getCurrentRoom();
            console.log('Current room data:', this.currentRoom);

            // Renderer ve Minimap'i başlat
            console.log('Initializing renderer with room:', this.currentRoom);
            this.renderer = new Renderer('game-canvas', this.currentRoom, this.player);
            this.minimap = new Minimap('minimap', this.roomProvider, this.player);

            // Mobile controls
            this.mobileControls = new MobileControls(this);

            // Initialize sound manager on user interaction
            this.initSoundOnInteraction();

            this.initControls();
            this.initMultiplayer();
            this.updateDebugInfo();
            this.updatePortalIndicator();

            // Start ambient sound
            if (soundManager.initialized) {
                this.startRoomAmbient();
            }

            this.gameLoop();

            console.log('3D Labirent Oyunu başlatıldı!');
            console.log('Kontroller: W/↑ İleri, S/↓ Geri, A Sola, D Sağa');
            console.log('Mouse ile etrafa bakabilirsiniz (Canvas\'a tıklayın)');
        } catch (error) {
            console.error('Oyun başlatılamadı:', error);
            // Fallback to local mode
            if (this.roomProvider instanceof ServerRoomProvider) {
                console.log('Çevrimdışı moda geçiliyor...');
                this.roomProvider = new LocalRoomProvider(10, 10);
                this.initGame();
            }
        }
    }

    initSoundOnInteraction() {
        const initSound = async () => {
            if (!soundManager.initialized) {
                await soundManager.init();
                this.startRoomAmbient();
            }
            await soundManager.resume();
        };

        document.addEventListener('click', initSound, { once: true });
        document.addEventListener('touchstart', initSound, { once: true });
        document.addEventListener('keydown', initSound, { once: true });
    }

    initControls() {
        console.log('Initializing controls...');

        // Klavye olayları
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        console.log('Keyboard events registered');

        // Mouse olayları
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        console.log('Mouse events registered');

        // Canvas'a tıklandığında pointer lock
        this.renderer.canvas.addEventListener('click', () => {
            console.log('Canvas clicked, requesting pointer lock...');
            this.renderer.canvas.requestPointerLock();
        });

        // Pointer lock başarılı olduğunda
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.renderer.canvas) {
                console.log('Pointer lock activated!');
                this.renderer.enableAudio();
                soundManager.resume();
            } else {
                console.log('Pointer lock released');
            }
        });

        // Son oda pozisyonu (oda değişimi algılama için)
        this.lastRoomX = this.player.roomX;
        this.lastRoomY = this.player.roomY;

        console.log('Controls initialized. Click on screen to start playing!');
    }

    initMultiplayer() {
        // WebSocket event handlers
        gameWS.onPlayerJoined = (data) => {
            console.log(`${data.username} odaya katıldı`);
            if (uiManager) {
                uiManager.showNotification(`${data.username} odaya katıldı`, 'info');
            }
            this.addOtherPlayer(data);
        };

        gameWS.onPlayerLeft = (data) => {
            console.log(`${data.username} ayrıldı`);
            this.removeOtherPlayer(data.user_id);
        };

        gameWS.onPlayerMoved = (data) => {
            this.updateOtherPlayer(data);
        };

        gameWS.onRoomPlayers = (players) => {
            // Clear and re-add all players
            this.otherPlayers.clear();
            players.forEach(p => this.addOtherPlayer(p));
        };

        gameWS.onRewardSpawned = (data) => {
            console.log('Ödül spawn oldu:', data);
            // Only show notification, actual reward is in room
            if (uiManager) {
                uiManager.showNotification(
                    `Bu odada $${data.amount.toFixed(2)} ödül var!`,
                    'reward'
                );
            }
        };

        gameWS.onRewardClaimed = (data) => {
            if (uiManager) {
                if (data.is_big_reward) {
                    uiManager.showNotification(
                        `${data.winner} büyük ödülü kazandı: $${data.amount}!`,
                        'reward'
                    );
                } else {
                    uiManager.showNotification(
                        `${data.winner} $${data.amount} kazandı!`,
                        'info'
                    );
                }
            }
        };

        gameWS.onGameEnded = (data) => {
            // Big reward claimed - game over
            alert(`Oyun bitti! ${data.winner} büyük ödülü kazandı: $${data.amount}!`);
            location.reload();
        };

        // Start position broadcasting
        this.startPositionBroadcast();
    }

    startPositionBroadcast() {
        // Send position updates every 100ms
        this.positionUpdateInterval = setInterval(() => {
            if (this.roomProvider.update3DPosition) {
                this.roomProvider.update3DPosition(
                    this.player.x,
                    this.player.y,
                    this.player.z,
                    this.player.rotationY,
                    this.player.rotationX
                );
            }
        }, 100);
    }

    addOtherPlayer(data) {
        const playerData = {
            userId: data.user_id,
            username: data.username,
            character: data.character,
            posX: data.pos_x || 0,
            posY: data.pos_y || 1.6,
            posZ: data.pos_z || 0,
            yaw: data.yaw || 0,
            pitch: data.pitch || 0
        };
        this.otherPlayers.set(data.user_id, playerData);

        // Create 3D representation
        if (this.renderer) {
            this.renderer.addOtherPlayer(playerData);
        }
    }

    removeOtherPlayer(userId) {
        this.otherPlayers.delete(userId);
        if (this.renderer) {
            this.renderer.removeOtherPlayer(userId);
        }
    }

    updateOtherPlayer(data) {
        const player = this.otherPlayers.get(data.user_id);
        if (player) {
            player.posX = data.pos_x;
            player.posY = data.pos_y;
            player.posZ = data.pos_z;
            player.yaw = data.yaw;
            player.pitch = data.pitch;

            if (this.renderer) {
                this.renderer.updateOtherPlayer(data.user_id, player);
            }
        }
    }

    onKeyDown(e) {
        // Don't handle keys when typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!e.key) return; // Guard against undefined key

        this.keys[e.key.toLowerCase()] = true;

        // Arrow keys for rotation
        if (e.key === 'ArrowLeft') this.keys['arrowleft'] = true;
        if (e.key === 'ArrowRight') this.keys['arrowright'] = true;
    }

    onKeyUp(e) {
        if (!e.key) return; // Guard against undefined key

        this.keys[e.key.toLowerCase()] = false;

        if (e.key === 'ArrowLeft') this.keys['arrowleft'] = false;
        if (e.key === 'ArrowRight') this.keys['arrowright'] = false;
    }

    onMouseMove(e) {
        if (document.pointerLockElement === this.renderer.canvas) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            this.player.rotate(movementX, movementY);
        }
    }

    async onRoomChange() {
        // Play door sound
        if (soundManager.initialized) {
            soundManager.playDoorOpen();
        }

        // Provider'a yeni pozisyonu bildir
        if (this.roomProvider.updatePosition) {
            this.roomProvider.updatePosition(this.player.roomX, this.player.roomY);
        }

        // Provider'dan yeni oda bilgisini al
        this.currentRoom = await this.roomProvider.getCurrentRoom();

        // Renderer'ı güncelle
        this.renderer.updateRoom(this.currentRoom);

        // Check for reward/trap in move result
        if (this.lastMoveResult) {
            if (this.lastMoveResult.reward) {
                this.handleReward(this.lastMoveResult.reward);
            }
            if (this.lastMoveResult.trap) {
                this.handleTrap(this.lastMoveResult.trap);
            }
        }

        // Update ambient sound for new room
        this.startRoomAmbient();

        // Clear other players (they're in different room now)
        this.otherPlayers.clear();
        if (this.renderer) {
            this.renderer.clearOtherPlayers();
        }

        this.updateDebugInfo();
        this.updatePortalIndicator();
    }

    handleReward(reward) {
        if (uiManager) {
            uiManager.showRewardPopup(reward.amount, reward.isBigReward);
            if (reward.newBalance !== undefined) {
                uiManager.updateBalance(reward.newBalance);
            }
        }
    }

    handleTrap(trap) {
        if (uiManager) {
            uiManager.showNotification(trap.message, 'error');
            uiManager.showTrapEffect(trap.type);

            // Hide trap effect after duration
            setTimeout(() => {
                uiManager.hideTrapEffect();
            }, trap.duration * 1000);
        }

        // Handle teleport traps - update position
        if (trap.teleportTo) {
            this.player.roomX = trap.teleportTo.x;
            this.player.roomY = trap.teleportTo.y;
            this.player.x = 0;
            this.player.z = 0;
            this.lastRoomX = this.player.roomX;
            this.lastRoomY = this.player.roomY;
            this.onRoomChange();
        }
    }

    startRoomAmbient() {
        if (!soundManager.initialized) return;

        // Determine room type from design
        let roomType = 'default';
        if (this.currentRoom && this.currentRoom.design) {
            const template = this.currentRoom.design.template;
            if (['spaceship', 'underwater', 'forest', 'medieval', 'cyberpunk'].includes(template)) {
                roomType = template;
            }
        }

        soundManager.startAmbient(roomType);
    }

    updatePortalIndicator() {
        if (uiManager && this.currentRoom) {
            uiManager.updatePortalIndicator(this.currentRoom.has_portal);
        }
    }

    updateDebugInfo() {
        const mazeEl = document.getElementById('maze-name');
        const roomEl = document.getElementById('current-room');
        const dirEl = document.getElementById('player-direction');
        const doorsEl = document.getElementById('available-doors');

        // Update maze info
        if (mazeEl && this.roomProvider) {
            let mazeName = 'Çevrimdışı';
            let mazeSize = '';

            if (this.roomProvider.mazeName) {
                // ServerRoomProvider
                mazeName = this.roomProvider.mazeName;
                if (this.roomProvider.mazeSize) {
                    mazeSize = ` (${this.roomProvider.mazeSize.width}×${this.roomProvider.mazeSize.height})`;
                }
            } else if (this.roomProvider.getMazeSize) {
                // LocalRoomProvider
                const size = this.roomProvider.getMazeSize();
                mazeSize = ` (${size.width}×${size.height})`;
            }

            mazeEl.textContent = `Labirent: ${mazeName}${mazeSize}`;
        }

        if (roomEl) {
            roomEl.textContent = `Oda: (${this.player.roomX}, ${this.player.roomY})`;
        }

        if (dirEl) {
            dirEl.textContent = `Yön: ${this.player.getDirectionName()}`;
        }

        if (doorsEl && this.currentRoom) {
            const doors = [];
            if (this.currentRoom.doors.north) doors.push('K');
            if (this.currentRoom.doors.south) doors.push('G');
            if (this.currentRoom.doors.east) doors.push('D');
            if (this.currentRoom.doors.west) doors.push('B');
            doorsEl.textContent = `Kapılar: ${doors.join(', ') || '-'}`;
        }
    }

    playFootstepSound() {
        if (!soundManager.initialized) return;

        const now = Date.now();
        if (now - this.lastFootstepTime > this.footstepInterval) {
            // Determine floor material from room design
            let material = 'wood';
            if (this.currentRoom && this.currentRoom.design) {
                const template = this.currentRoom.design.template;
                if (template === 'spaceship' || template === 'cyberpunk') {
                    material = 'metal';
                } else if (template === 'medieval') {
                    material = 'stone';
                } else if (template === 'old_salon' || template === 'christmas') {
                    material = 'carpet';
                }
            }
            soundManager.playFootstep(material);
            this.lastFootstepTime = now;
        }
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        // Check trap effects
        if (this.roomProvider.updateTrapEffects) {
            this.roomProvider.updateTrapEffects();
        }

        // Get speed multiplier (for slow trap)
        let speedMultiplier = 1.0;
        if (this.roomProvider.getSpeedMultiplier) {
            speedMultiplier = this.roomProvider.getSpeedMultiplier();
        }

        // Check if controls are reversed
        let keysToUse = { ...this.keys };
        if (this.roomProvider.areControlsReversed && this.roomProvider.areControlsReversed()) {
            // Reverse WASD
            keysToUse = {
                ...this.keys,
                'w': this.keys['s'],
                's': this.keys['w'],
                'a': this.keys['d'],
                'd': this.keys['a']
            };
        }

        // Check if frozen
        let canMove = true;
        if (this.roomProvider.trapEffects && this.roomProvider.trapEffects.frozen) {
            canMove = false;
        }

        // Track if player is moving
        const wasMoving = this.player.isMoving;

        // Oyuncu hareketini güncelle
        if (canMove) {
            this.player.updateWithRoom(keysToUse, this.currentRoom, speedMultiplier);
        }

        // Play footstep sound if moving
        if (this.player.isMoving && canMove) {
            this.playFootstepSound();
        }

        // Oda değişimi kontrolü
        if (this.player.roomX !== this.lastRoomX || this.player.roomY !== this.lastRoomY) {
            this.lastRoomX = this.player.roomX;
            this.lastRoomY = this.player.roomY;
            this.onRoomChange();
        }

        // Update 3D audio listener position
        if (soundManager.initialized) {
            const forward = {
                x: Math.sin(this.player.rotation),
                y: 0,
                z: Math.cos(this.player.rotation)
            };
            soundManager.updateListenerPosition(
                { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
                forward,
                { x: 0, y: 1, z: 0 }
            );
        }

        // Renderer güncelle
        this.renderer.update();

        // Update other players
        this.otherPlayers.forEach((player, userId) => {
            if (this.renderer) {
                this.renderer.updateOtherPlayer(userId, player);
            }
        });

        // Minimap güncelle
        this.minimap.draw();

        // Arrow key rotation
        if (keysToUse['arrowleft']) {
            this.player.rotationY += 0.03;
        }
        if (keysToUse['arrowright']) {
            this.player.rotationY -= 0.03;
        }
    }

    destroy() {
        if (this.positionUpdateInterval) {
            clearInterval(this.positionUpdateInterval);
        }
        if (gameWS.connected) {
            gameWS.disconnect();
        }
        soundManager.stopAmbient();
    }
}

// Sayfa yüklendiğinde oyunu başlat
window.addEventListener('DOMContentLoaded', () => {
    // Wait for UI manager to determine online/offline mode
    setTimeout(() => {
        // Only start if auth modal is hidden (user logged in or chose offline)
        const authModal = document.getElementById('auth-modal');
        if (!authModal || authModal.style.display === 'none') {
            window.game = new Game();
        }
    }, 100);
});

// Also start game when offline mode is selected
document.addEventListener('startOfflineGame', () => {
    window.game = new Game();
});

// Handle auth completion
window.startGame = function() {
    if (!window.game) {
        window.game = new Game();
    }
};
