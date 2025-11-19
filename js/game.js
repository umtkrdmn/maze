// Ana Oyun Mantığı ve Kontrol

class Game {
    constructor() {
        // 4x4 labirent oluştur
        this.maze = new Maze(4, 4);

        // Oyuncu (0,0) konumunda başlasın
        this.player = new Player(0, 0);

        // Renderer ve Minimap
        this.renderer = new Renderer('game-canvas', this.maze, this.player);
        this.minimap = new Minimap('minimap', this.maze, this.player);

        // Kontroller
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.2;

        this.initControls();
        this.updateDebugInfo();
        this.gameLoop();
    }

    initControls() {
        // Klavye olayları
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse olayları (opsiyonel - etrafı bakma)
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Canvas'a tıklandığında pointer lock
        this.renderer.canvas.addEventListener('click', () => {
            this.renderer.canvas.requestPointerLock();
        });

        // Son oda pozisyonu (oda değişimi algılama için)
        this.lastRoomX = this.player.roomX;
        this.lastRoomY = this.player.roomY;
    }

    onKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
    }

    onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    onMouseMove(e) {
        if (document.pointerLockElement === this.renderer.canvas) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            this.player.rotate(movementX, movementY);
        }
    }

    onRoomChange() {
        // Yeni odaya geçildiğinde
        this.renderer.createCurrentRoom();
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        // Debug bilgilerini güncelle
        const room = this.player.getCurrentRoom(this.maze);

        document.getElementById('current-room').textContent =
            `Oda: (${this.player.roomX}, ${this.player.roomY})`;

        document.getElementById('player-direction').textContent =
            `Yön: ${this.player.getDirectionName()}`;

        // Mevcut kapılar
        const doors = [];
        if (room.doors.north) doors.push('Kuzey');
        if (room.doors.south) doors.push('Güney');
        if (room.doors.east) doors.push('Doğu');
        if (room.doors.west) doors.push('Batı');

        document.getElementById('available-doors').textContent =
            `Kapılar: ${doors.join(', ') || 'Yok'}`;
    }

    gameLoop() {
        // Ana oyun döngüsü
        requestAnimationFrame(() => this.gameLoop());

        // Oyuncu hareketini güncelle
        this.player.update(this.keys, this.maze);

        // Oda değişimi kontrolü
        if (this.player.roomX !== this.lastRoomX || this.player.roomY !== this.lastRoomY) {
            this.lastRoomX = this.player.roomX;
            this.lastRoomY = this.player.roomY;
            this.onRoomChange();
        }

        // Renderer güncelle
        this.renderer.update();

        // Minimap güncelle
        this.minimap.draw();

        // Debug bilgilerini sürekli güncelle (yön değişimi için)
        this.updateDebugInfo();
    }
}

// Sayfa yüklendiğinde oyunu başlat
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    console.log('3D Labirent Oyunu başlatıldı!');
    console.log('Kontroller: W/↑ İleri, S/↓ Geri, A/← Sola Dön, D/→ Sağa Dön');
});
