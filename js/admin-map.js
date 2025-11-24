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

        // Zoom and pan properties
        this.zoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Canvas boyutlarını ayarla
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Mouse event listeners
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        console.log('AdminMap initialized with zoom controls');
    }

    setMazeData(mazeData, rooms) {
        this.mazeData = mazeData;
        this.rooms = rooms;

        // Reset zoom and pan
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;

        // Cell size'ı dinamik hesapla
        const padding = 40;
        const availableWidth = this.canvas.width - padding * 2;
        const availableHeight = this.canvas.height - padding * 2;
        this.baseCellSize = Math.min(
            Math.floor(availableWidth / mazeData.width),
            Math.floor(availableHeight / mazeData.height)
        );

        // Harita offsetlerini hesapla (merkeze hizala)
        this.baseOffsetX = (this.canvas.width - mazeData.width * this.baseCellSize) / 2;
        this.baseOffsetY = (this.canvas.height - mazeData.height * this.baseCellSize) / 2;

        console.log('Maze data loaded:', {
            maze: mazeData.name,
            size: `${mazeData.width}x${mazeData.height}`,
            rooms: rooms.length,
            baseCellSize: this.baseCellSize
        });

        this.draw();
    }

    draw() {
        if (!this.canvas || !this.ctx || !this.mazeData) {
            return;
        }

        const ctx = this.ctx;

        // Apply zoom and pan transformations
        this.cellSize = this.baseCellSize * this.zoom;
        this.offsetX = this.baseOffsetX * this.zoom + this.panX;
        this.offsetY = this.baseOffsetY * this.zoom + this.panY;

        // Temizle
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Başlık ve zoom info
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.mazeData.name} - ${this.mazeData.width}x${this.mazeData.height} (Zoom: ${(this.zoom * 100).toFixed(0)}%)`,
            this.canvas.width / 2,
            20
        );

        // Tüm odaları çiz
        for (let room of this.rooms) {
            this.drawRoom(room);
        }

        // Legend (açıklama) ve kontroller
        this.drawLegend();
        this.drawControls();
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

        // Panning
        if (this.isPanning) {
            const dx = mouseX - this.lastMouseX;
            const dy = mouseY - this.lastMouseY;
            this.panX += dx;
            this.panY += dy;
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
            this.draw();
            this.canvas.style.cursor = 'grabbing';
            return;
        }

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

        this.canvas.style.cursor = isOverRoom ? 'pointer' : 'grab';
    }

    handleMouseDown(event) {
        if (!this.mazeData) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.isPanning = true;
        this.lastMouseX = (event.clientX - rect.left) * scaleX;
        this.lastMouseY = (event.clientY - rect.top) * scaleY;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseUp(event) {
        this.isPanning = false;
        this.canvas.style.cursor = 'grab';
    }

    handleWheel(event) {
        if (!this.mazeData) return;

        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Mouse position in canvas coordinates
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Zoom factor
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

        // Calculate zoom point offset
        const zoomPointX = (mouseX - this.panX) / this.zoom;
        const zoomPointY = (mouseY - this.panY) / this.zoom;

        // Apply new zoom
        this.zoom = newZoom;

        // Adjust pan to keep zoom point in place
        this.panX = mouseX - zoomPointX * this.zoom;
        this.panY = mouseY - zoomPointY * this.zoom;

        this.draw();
    }

    drawControls() {
        const ctx = this.ctx;

        // Zoom controls info (bottom right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - 200, this.canvas.height - 80, 190, 70);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🖱️ Scroll: Zoom In/Out', this.canvas.width - 190, this.canvas.height - 55);
        ctx.fillText('🖱️ Drag: Pan (Move)', this.canvas.width - 190, this.canvas.height - 35);
        ctx.fillText('🖱️ Click: Select Room', this.canvas.width - 190, this.canvas.height - 15);
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
