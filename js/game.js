// Ana Oyun Mantığı ve Kontrol

class Game {
    constructor() {
        // Room Provider kullan (Local veya Server)
        // Şu an Local provider kullanıyoruz, backend hazır olunca ServerRoomProvider'a geçilecek
        this.roomProvider = new LocalRoomProvider(4, 4);

        // ÖNEMLI: Artık maze bilgisi doğrudan erişilebilir değil!
        // Sadece provider üzerinden current room bilgisi alınabilir
        this.currentRoom = null;

        // Oyuncu (sadece 3D pozisyon tutar, oda bilgisi provider'da)
        this.player = new Player(0, 0);

        // Renderer ve Minimap
        this.renderer = null; // Async init sonrası
        this.minimap = null;   // Async init sonrası

        // Kontroller
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.2;

        this.initGame();
    }

    async initGame() {
        // Oyunu başlat (async çünkü provider ile iletişim async olabilir)
        try {
            // Başlangıç pozisyonu al
            const startPos = await this.roomProvider.getStartPosition();
            this.player.roomX = startPos.x;
            this.player.roomY = startPos.y;

            // İlk oda bilgisini al
            this.currentRoom = await this.roomProvider.getCurrentRoom();

            // Renderer ve Minimap'i başlat
            this.renderer = new Renderer('game-canvas', this.currentRoom, this.player);
            this.minimap = new Minimap('minimap', this.roomProvider, this.player);

            this.initControls();
            this.updateDebugInfo();
            this.gameLoop();

            console.log('3D Labirent Oyunu başlatıldı!');
            console.log('Kontroller: W/↑ İleri, S/↓ Geri, A Sola, D Sağa');
            console.log('Mouse ile etrafa bakabilirsiniz (Canvas\'a tıklayın)');
        } catch (error) {
            console.error('Oyun başlatılamadı:', error);
        }
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

    async onRoomChange() {
        // Yeni odaya geçildiğinde
        // Provider'a yeni pozisyonu bildir (LocalRoomProvider için gerekli)
        if (this.roomProvider.updatePosition) {
            this.roomProvider.updatePosition(this.player.roomX, this.player.roomY);
        }

        // Provider'dan yeni oda bilgisini al
        this.currentRoom = await this.roomProvider.getCurrentRoom();

        // Renderer'ı güncelle (yeni oda render edilsin)
        this.renderer.updateRoom(this.currentRoom);

        this.updateDebugInfo();
    }

    updateDebugInfo() {
        // Debug bilgilerini güncelle
        document.getElementById('current-room').textContent =
            `Oda: (${this.player.roomX}, ${this.player.roomY})`;

        document.getElementById('player-direction').textContent =
            `Yön: ${this.player.getDirectionName()}`;

        // Mevcut kapılar
        const doors = [];
        if (this.currentRoom.doors.north) doors.push('Kuzey');
        if (this.currentRoom.doors.south) doors.push('Güney');
        if (this.currentRoom.doors.east) doors.push('Doğu');
        if (this.currentRoom.doors.west) doors.push('Batı');

        document.getElementById('available-doors').textContent =
            `Kapılar: ${doors.join(', ') || 'Yok'}`;
    }

    gameLoop() {
        // Ana oyun döngüsü
        requestAnimationFrame(() => this.gameLoop());

        // Oyuncu hareketini güncelle
        // canMoveTo için currentRoom geçiyoruz
        this.player.updateWithRoom(this.keys, this.currentRoom);

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
});
