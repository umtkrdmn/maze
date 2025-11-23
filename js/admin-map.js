// AdminMap - Admin harita görselleştirmesi

class AdminMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('AdminMap canvas not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.wallThickness = 2;
        this.rooms = [];
        this.mazeData = null;
        this.selectedRoom = null;

        // Canvas boyutlarını ayarla
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Mouse event listeners
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        console.log('AdminMap initialized');
    }

    setMazeData(mazeData, rooms) {
        this.mazeData = mazeData;
        this.rooms = rooms;

        // Cell size'ı dinamik hesapla
        const padding = 40;
        const availableWidth = this.canvas.width - padding * 2;
        const availableHeight = this.canvas.height - padding * 2;
        this.cellSize = Math.min(
            Math.floor(availableWidth / mazeData.width),
            Math.floor(availableHeight / mazeData.height)
        );

        // Harita offsetlerini hesapla (merkeze hizala)
        this.offsetX = (this.canvas.width - mazeData.width * this.cellSize) / 2;
        this.offsetY = (this.canvas.height - mazeData.height * this.cellSize) / 2;

        console.log('Maze data loaded:', {
            maze: mazeData.name,
            size: `${mazeData.width}x${mazeData.height}`,
            rooms: rooms.length,
            cellSize: this.cellSize
        });

        this.draw();
    }

    draw() {
        if (!this.canvas || !this.ctx || !this.mazeData) {
            return;
        }

        const ctx = this.ctx;

        // Temizle
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Başlık
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.mazeData.name} - ${this.mazeData.width}x${this.mazeData.height}`,
            this.canvas.width / 2,
            20
        );

        // Tüm odaları çiz
        for (let room of this.rooms) {
            this.drawRoom(room);
        }

        // Legend (açıklama)
        this.drawLegend();
    }

    drawRoom(room) {
        const ctx = this.ctx;
        const x = this.offsetX + room.x * this.cellSize;
        const y = this.offsetY + (this.mazeData.height - 1 - room.y) * this.cellSize; // Y ekseni ters
        const size = this.cellSize;

        // Oda durumuna göre renk
        let roomColor;
        if (room.has_reward) {
            roomColor = '#FFD700'; // Altın - Ödül
        } else if (room.has_trap) {
            roomColor = '#8B0000'; // Koyu kırmızı - Tuzak
        } else if (room.has_portal) {
            roomColor = '#9C27B0'; // Mor - Portal
        } else if (room.is_sold) {
            roomColor = '#2196F3'; // Mavi - Satılmış
        } else {
            roomColor = '#424242'; // Gri - Boş
        }

        // Seçili oda vurgusu
        if (this.selectedRoom && this.selectedRoom.id === room.id) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
        }

        // Oda zemini
        ctx.fillStyle = roomColor;
        ctx.fillRect(x, y, size, size);

        // Duvarlar
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
            ctx.lineWidth = this.wallThickness + 1;
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
            ctx.lineWidth = this.wallThickness + 1;
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
            ctx.lineWidth = this.wallThickness + 1;
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
            ctx.lineWidth = this.wallThickness + 1;
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.lineTo(x, y + size * 0.7);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.wallThickness;
        }

        // Oda koordinatlarını göster (eğer yeterince büyükse)
        if (size > 30) {
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.max(10, size / 5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${room.x},${room.y}`, x + size / 2, y + size / 2);
        }
    }

    drawLegend() {
        const ctx = this.ctx;
        const legendX = 10;
        const legendY = this.canvas.height - 120;
        const boxSize = 20;
        const spacing = 25;

        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const legend = [
            { color: '#424242', label: 'Boş Oda' },
            { color: '#2196F3', label: 'Satılmış' },
            { color: '#9C27B0', label: 'Portal' },
            { color: '#FFD700', label: 'Ödül' },
            { color: '#8B0000', label: 'Tuzak' }
        ];

        legend.forEach((item, index) => {
            const y = legendY + index * spacing;

            // Kutu
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, y, boxSize, boxSize);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(legendX, y, boxSize, boxSize);

            // Etiket
            ctx.fillStyle = '#fff';
            ctx.fillText(item.label, legendX + boxSize + 10, y + boxSize / 2);
        });
    }

    handleClick(event) {
        if (!this.mazeData) return;

        const rect = this.canvas.getBoundingClientRect();

        // Canvas scaling'i hesapla (CSS boyutu vs gerçek boyut)
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Mouse koordinatlarını canvas koordinatlarına çevir
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;

        // Tıklanan odayı bul
        for (let room of this.rooms) {
            const x = this.offsetX + room.x * this.cellSize;
            const y = this.offsetY + (this.mazeData.height - 1 - room.y) * this.cellSize;
            const size = this.cellSize;

            if (clickX >= x && clickX < x + size &&
                clickY >= y && clickY < y + size) {
                this.selectedRoom = room;
                this.draw();
                this.showRoomDetails(room);
                break;
            }
        }
    }

    handleMouseMove(event) {
        if (!this.mazeData) return;

        const rect = this.canvas.getBoundingClientRect();

        // Canvas scaling'i hesapla
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Mouse koordinatlarını canvas koordinatlarına çevir
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Mouse altındaki odayı kontrol et
        let isOverRoom = false;
        for (let room of this.rooms) {
            const x = this.offsetX + room.x * this.cellSize;
            const y = this.offsetY + (this.mazeData.height - 1 - room.y) * this.cellSize;
            const size = this.cellSize;

            if (mouseX >= x && mouseX < x + size &&
                mouseY >= y && mouseY < y + size) {
                isOverRoom = true;
                break;
            }
        }

        this.canvas.style.cursor = isOverRoom ? 'pointer' : 'default';
    }

    showRoomDetails(room) {
        // Oda detaylarını göstermek için custom event trigger
        const event = new CustomEvent('roomSelected', { detail: room });
        window.dispatchEvent(event);
    }

    refresh() {
        this.draw();
    }
}
