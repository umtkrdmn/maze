// Minimap - Labirent Haritası ve Oyuncu Konumu

class Minimap {
    constructor(canvasId, maze, player) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maze = maze;
        this.player = player;
        this.cellSize = 40;
        this.wallThickness = 4;
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Temizle
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Odalari çiz
        const offsetX = (width - this.maze.width * this.cellSize) / 2;
        const offsetY = (height - this.maze.height * this.cellSize) / 2;

        for (let room of this.maze.rooms) {
            this.drawRoom(room, offsetX, offsetY);
        }

        // Oyuncuyu çiz
        this.drawPlayer(offsetX, offsetY);
    }

    drawRoom(room, offsetX, offsetY) {
        const ctx = this.ctx;
        const x = offsetX + room.x * this.cellSize;
        const y = offsetY + room.y * this.cellSize;
        const size = this.cellSize;

        // Oda zemini
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, size, size);

        // Duvarlar (kapı yoksa çiz)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = this.wallThickness;

        // Kuzey duvar
        if (!room.doors.north) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y);
            ctx.stroke();
        } else {
            // Kapı işareti (yeşil)
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = this.wallThickness;
            ctx.beginPath();
            ctx.moveTo(x + size * 0.3, y);
            ctx.lineTo(x + size * 0.7, y);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.wallThickness;
        }

        // Güney duvar
        if (!room.doors.south) {
            ctx.beginPath();
            ctx.moveTo(x, y + size);
            ctx.lineTo(x + size, y + size);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = this.wallThickness;
            ctx.beginPath();
            ctx.moveTo(x + size * 0.3, y + size);
            ctx.lineTo(x + size * 0.7, y + size);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.wallThickness;
        }

        // Doğu duvar
        if (!room.doors.east) {
            ctx.beginPath();
            ctx.moveTo(x + size, y);
            ctx.lineTo(x + size, y + size);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = this.wallThickness;
            ctx.beginPath();
            ctx.moveTo(x + size, y + size * 0.3);
            ctx.lineTo(x + size, y + size * 0.7);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.wallThickness;
        }

        // Batı duvar
        if (!room.doors.west) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + size);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = this.wallThickness;
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.lineTo(x, y + size * 0.7);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.wallThickness;
        }
    }

    drawPlayer(offsetX, offsetY) {
        const ctx = this.ctx;

        // Oda içindeki pozisyonu hesapla
        // player.position.x ve .z, -5 ile +5 arasında değişir (roomSize = 10)
        // Bunu 0-1 aralığına normalize et
        const normalizedX = (this.player.position.x + this.player.roomSize / 2) / this.player.roomSize;
        const normalizedZ = (this.player.position.z + this.player.roomSize / 2) / this.player.roomSize;

        // Minimap koordinatlarına çevir
        const x = offsetX + this.player.roomX * this.cellSize + normalizedX * this.cellSize;
        const y = offsetY + this.player.roomY * this.cellSize + normalizedZ * this.cellSize;
        const radius = 8;

        // Oyuncu dairesi
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Yön göstergesi (ok)
        // player.rotation zaten radyan cinsinden
        const rotation = this.player.rotation;
        const arrowLength = 12;

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - Math.sin(rotation) * arrowLength,
            y + Math.cos(rotation) * arrowLength
        );
        ctx.stroke();
    }
}
