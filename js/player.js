// Oyuncu Kontrolü ve Hareket

class Player {
    constructor(startX, startY, roomSize = 10) {
        this.roomX = startX;
        this.roomY = startY;
        this.roomSize = roomSize;

        // 3D pozisyon (odanın merkezi)
        this.position = {
            x: 0,
            y: 1.6, // İnsan göz yüksekliği
            z: 0
        };

        // Hareket
        this.velocity = { x: 0, z: 0 };
        this.moveSpeed = 0.05; // Yürüme hızı
        this.rotationSpeed = 0.002; // Mouse sensitivitesi (yatay)
        this.pitchSpeed = 0.002; // Mouse sensitivitesi (dikey)
        this.rotation = 0; // Radyan cinsinden (yaw - yatay)
        this.pitch = 0; // Radyan cinsinden (pitch - dikey bakış)
        this.maxPitch = Math.PI / 3; // Maksimum yukarı/aşağı bakış açısı (60 derece)

        // Collision
        this.radius = 0.3; // Oyuncu yarıçapı (collision için)
        this.doorThreshold = 4.5; // Kapıya ne kadar yaklaşınca geçiş yapılır
    }

    update(keys, maze) {
        // Hareket vektörünü hesapla
        let moveX = 0;
        let moveZ = 0;

        if (keys['w'] || keys['arrowup']) {
            moveZ -= this.moveSpeed; // İleri (Three.js: -Z = ileri)
        }
        if (keys['s'] || keys['arrowdown']) {
            moveZ += this.moveSpeed; // Geri (Three.js: +Z = geri)
        }
        if (keys['a']) {
            moveX -= this.moveSpeed; // Sola
        }
        if (keys['d']) {
            moveX += this.moveSpeed; // Sağa
        }

        // Rotasyona göre hareket vektörünü döndür
        if (moveX !== 0 || moveZ !== 0) {
            const rotatedMove = this.rotateVector(moveX, moveZ, this.rotation);

            // Yeni pozisyonu hesapla
            const newX = this.position.x + rotatedMove.x;
            const newZ = this.position.z + rotatedMove.z;

            // Collision kontrolü
            if (this.canMoveTo(newX, this.position.z, maze)) {
                this.position.x = newX;
            }
            if (this.canMoveTo(this.position.x, newZ, maze)) {
                this.position.z = newZ;
            }
        }

        // Ok tuşları ile yatay rotasyon (bakış açısı)
        if (keys['arrowleft']) {
            this.rotation -= 0.05; // Düzeltildi: sola bak
        }
        if (keys['arrowright']) {
            this.rotation += 0.05; // Düzeltildi: sağa bak
        }

        // Kapıya yaklaşma kontrolü
        this.checkDoorTransition(maze);
    }

    rotateVector(x, z, rotation) {
        return {
            x: x * Math.cos(rotation) + z * Math.sin(rotation),
            z: -x * Math.sin(rotation) + z * Math.cos(rotation)
        };
    }

    canMoveTo(newX, newZ, maze) {
        const halfSize = this.roomSize / 2;
        const room = this.getCurrentRoom(maze);
        const doorWidth = 2; // Kapı genişliği

        // Kuzey duvarı kontrolü
        if (newZ < -(halfSize - this.radius)) {
            if (!room.doors.north) {
                return false; // Kapı yok, geçemezsin
            } else {
                // Kapı var ama kapı alanında mısın?
                if (Math.abs(newX) > doorWidth / 2) {
                    return false; // Kapı dışındasın, duvara çarpıyorsun
                }
            }
        }

        // Güney duvarı kontrolü
        if (newZ > (halfSize - this.radius)) {
            if (!room.doors.south) {
                return false;
            } else {
                if (Math.abs(newX) > doorWidth / 2) {
                    return false;
                }
            }
        }

        // Doğu duvarı kontrolü
        if (newX > (halfSize - this.radius)) {
            if (!room.doors.east) {
                return false;
            } else {
                if (Math.abs(newZ) > doorWidth / 2) {
                    return false;
                }
            }
        }

        // Batı duvarı kontrolü
        if (newX < -(halfSize - this.radius)) {
            if (!room.doors.west) {
                return false;
            } else {
                if (Math.abs(newZ) > doorWidth / 2) {
                    return false;
                }
            }
        }

        return true;
    }

    checkDoorTransition(maze) {
        const halfSize = this.roomSize / 2;
        const room = this.getCurrentRoom(maze);
        const doorWidth = 2;
        let roomChanged = false;

        // Kuzey kapısından geçiş
        if (room.doors.north && this.position.z < -(halfSize - 0.5)) {
            if (Math.abs(this.position.x) <= doorWidth / 2 && this.roomY > 0) {
                this.roomY--;
                this.position.z = halfSize - 1; // Yeni odanın güneyinden başla
                roomChanged = true;
            }
        }

        // Güney kapısından geçiş
        if (room.doors.south && this.position.z > (halfSize - 0.5)) {
            if (Math.abs(this.position.x) <= doorWidth / 2 && this.roomY < maze.height - 1) {
                this.roomY++;
                this.position.z = -(halfSize - 1); // Yeni odanın kuzeyinden başla
                roomChanged = true;
            }
        }

        // Doğu kapısından geçiş
        if (room.doors.east && this.position.x > (halfSize - 0.5)) {
            if (Math.abs(this.position.z) <= doorWidth / 2 && this.roomX < maze.width - 1) {
                this.roomX++;
                this.position.x = -(halfSize - 1); // Yeni odanın batısından başla
                roomChanged = true;
            }
        }

        // Batı kapısından geçiş
        if (room.doors.west && this.position.x < -(halfSize - 0.5)) {
            if (Math.abs(this.position.z) <= doorWidth / 2 && this.roomX > 0) {
                this.roomX--;
                this.position.x = halfSize - 1; // Yeni odanın doğusundan başla
                roomChanged = true;
            }
        }

        return roomChanged;
    }

    rotate(deltaX, deltaY) {
        // Yatay rotasyon (yaw) - Düzeltildi: ters yön
        this.rotation -= deltaX * this.rotationSpeed;

        // Dikey rotasyon (pitch) - Düzeltildi: ters yön
        this.pitch -= deltaY * this.pitchSpeed;

        // Pitch sınırla (çok yukarı veya aşağı bakmasın)
        this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
    }

    getDirection() {
        // Rotasyonu yön olarak döndür
        // Three.js'de +rotation = sola dönüş, bu yüzden doğu/batı ters
        const degrees = (this.rotation * 180 / Math.PI) % 360;
        const normalized = ((degrees % 360) + 360) % 360;
        if (normalized >= 315 || normalized < 45) return 'north';
        if (normalized >= 45 && normalized < 135) return 'west'; // Ters!
        if (normalized >= 135 && normalized < 225) return 'south';
        return 'east'; // Ters!
    }

    getDirectionName() {
        const dir = this.getDirection();
        const names = {
            'north': 'Kuzey',
            'south': 'Güney',
            'east': 'Doğu',
            'west': 'Batı'
        };
        return names[dir];
    }

    getCurrentRoom(maze) {
        return maze.getRoom(this.roomX, this.roomY);
    }
}
