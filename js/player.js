// Oyuncu Kontrolü ve Hareket

class Player {
    constructor(startX, startY) {
        this.roomX = startX;
        this.roomY = startY;
        this.rotation = 0; // Derece cinsinden (0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı)
        this.isMoving = false;
        this.moveSpeed = 0.05;
        this.rotationSpeed = 2;
    }

    getDirection() {
        // Rotasyonu yön olarak döndür
        const normalized = ((this.rotation % 360) + 360) % 360;
        if (normalized >= 315 || normalized < 45) return 'north';
        if (normalized >= 45 && normalized < 135) return 'east';
        if (normalized >= 135 && normalized < 225) return 'south';
        return 'west';
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

    moveForward(maze) {
        const direction = this.getDirection();
        if (maze.canMoveTo(this.roomX, this.roomY, direction)) {
            switch(direction) {
                case 'north': this.roomY--; break;
                case 'south': this.roomY++; break;
                case 'east': this.roomX++; break;
                case 'west': this.roomX--; break;
            }
            return true;
        }
        return false;
    }

    moveBackward(maze) {
        const direction = this.getOppositeDirection();
        if (maze.canMoveTo(this.roomX, this.roomY, direction)) {
            switch(direction) {
                case 'north': this.roomY--; break;
                case 'south': this.roomY++; break;
                case 'east': this.roomX++; break;
                case 'west': this.roomX--; break;
            }
            return true;
        }
        return false;
    }

    getOppositeDirection() {
        const dir = this.getDirection();
        const opposite = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposite[dir];
    }

    rotateLeft() {
        this.rotation -= 90;
    }

    rotateRight() {
        this.rotation += 90;
    }

    getCurrentRoom(maze) {
        return maze.getRoom(this.roomX, this.roomY);
    }
}
