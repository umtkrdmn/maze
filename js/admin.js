// Admin Panel JavaScript

class AdminPanel {
    constructor() {
        this.currentSection = 'mazes';
        this.mazes = [];
        this.adminMap = null;

        this.init();
    }

    init() {
        // Check if user is admin
        if (!api.token) {
            window.location.href = 'index.html';
            return;
        }

        // Initialize admin map
        this.adminMap = new AdminMap('admin-map-canvas');

        this.setupEventListeners();
        this.loadMazes();
        this.loadStats();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });

        // Create maze button
        document.getElementById('create-maze-btn').addEventListener('click', () => {
            this.showMazeModal();
        });

        // Modal close buttons
        document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeMazeModal();
            });
        });

        // Maze form submit
        document.getElementById('maze-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createMaze();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            api.logout();
            window.location.href = 'index.html';
        });

        // Map maze selector
        document.getElementById('map-maze-select').addEventListener('change', (e) => {
            const mazeId = parseInt(e.target.value);
            if (mazeId) {
                this.loadMapData(mazeId);
            }
        });

        // Room selection event
        window.addEventListener('roomSelected', (e) => {
            this.showRoomDetails(e.detail);
        });
    }

    switchSection(section) {
        this.currentSection = section;

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) {
                btn.classList.add('active');
            }
        });

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Load section data
        if (section === 'stats') {
            this.loadStats();
        } else if (section === 'map') {
            this.populateMapMazeSelect();
        }
    }

    async loadMazes() {
        try {
            const response = await fetch('http://localhost:7100/api/admin/mazes', {
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load mazes');

            const data = await response.json();
            this.mazes = data.mazes;
            this.renderMazes();

            // Update map select if in map section
            if (this.currentSection === 'map') {
                this.populateMapMazeSelect();
            }
        } catch (error) {
            console.error('Error loading mazes:', error);
            this.showError('Labirentler yüklenemedi');
        }
    }

    renderMazes() {
        const container = document.getElementById('mazes-list');

        if (this.mazes.length === 0) {
            container.innerHTML = '<div class="placeholder">Henüz labirent oluşturulmadı. Hemen bir tane oluşturun!</div>';
            return;
        }

        container.innerHTML = this.mazes.map(maze => `
            <div class="maze-card ${maze.is_active ? 'active' : ''}">
                <div class="maze-card-header">
                    <div>
                        <div class="maze-name">${maze.name}</div>
                        <span class="maze-status ${maze.is_active ? 'active' : 'inactive'}">
                            ${maze.is_active ? '✓ Aktif' : 'Pasif'}
                        </span>
                    </div>
                </div>
                <div class="maze-info">
                    <div class="maze-info-item">
                        <div class="maze-info-label">Boyut</div>
                        <div class="maze-info-value">${maze.width}×${maze.height}</div>
                    </div>
                    <div class="maze-info-item">
                        <div class="maze-info-label">Toplam Oda</div>
                        <div class="maze-info-value">${maze.width * maze.height}</div>
                    </div>
                    <div class="maze-info-item">
                        <div class="maze-info-label">Büyük Ödül</div>
                        <div class="maze-info-value">${maze.big_reward_chance || 0}%</div>
                    </div>
                    <div class="maze-info-item">
                        <div class="maze-info-label">Küçük Ödül</div>
                        <div class="maze-info-value">${maze.small_reward_chance || 0}%</div>
                    </div>
                </div>
                <div class="maze-actions">
                    ${!maze.is_active ? `
                        <button class="btn btn-success" onclick="adminPanel.activateMaze(${maze.id})">
                            Aktifleştir
                        </button>
                    ` : `
                        <button class="btn btn-secondary" disabled>
                            Aktif
                        </button>
                    `}
                    <button class="btn btn-warning" onclick="adminPanel.spawnReward(${maze.id}, 'big')">
                        💰 Ödül
                    </button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteMaze(${maze.id}, '${maze.name}')">
                        🗑️ Sil
                    </button>
                </div>
            </div>
        `).join('');
    }

    showMazeModal() {
        document.getElementById('maze-modal').classList.add('active');
        document.getElementById('maze-form').reset();
    }

    closeMazeModal() {
        document.getElementById('maze-modal').classList.remove('active');
    }

    async createMaze() {
        const name = document.getElementById('maze-name').value;
        const width = parseInt(document.getElementById('maze-width').value);
        const height = parseInt(document.getElementById('maze-height').value);
        const portalCount = parseInt(document.getElementById('maze-portals').value);
        const bigRewardChance = parseFloat(document.getElementById('big-reward-chance').value) || null;
        const smallRewardChance = parseFloat(document.getElementById('small-reward-chance').value) || null;

        try {
            const response = await fetch('http://localhost:7100/api/admin/maze/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.token}`
                },
                body: JSON.stringify({
                    name,
                    width,
                    height,
                    portal_count: portalCount,
                    big_reward_chance: bigRewardChance,
                    small_reward_chance: smallRewardChance
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create maze');
            }

            const data = await response.json();
            this.showSuccess(`Labirent "${name}" başarıyla oluşturuldu!`);
            this.closeMazeModal();
            this.loadMazes();
        } catch (error) {
            console.error('Error creating maze:', error);
            this.showError('Labirent oluşturulamadı: ' + error.message);
        }
    }

    async activateMaze(mazeId) {
        try {
            const response = await fetch(`http://localhost:7100/api/admin/maze/${mazeId}/activate`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to activate maze');

            const data = await response.json();
            this.showSuccess(data.message);
            this.loadMazes();
        } catch (error) {
            console.error('Error activating maze:', error);
            this.showError('Labirent aktifleştirilemedi');
        }
    }

    async deleteMaze(mazeId, mazeName) {
        // Confirm before deleting
        if (!confirm(`"${mazeName}" labirentini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:7100/api/admin/maze/${mazeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete maze');

            const data = await response.json();
            this.showSuccess(data.message);
            this.loadMazes();
        } catch (error) {
            console.error('Error deleting maze:', error);
            this.showError('Labirent silinemedi: ' + error.message);
        }
    }

    async spawnReward(mazeId, type) {
        try {
            const response = await fetch(`http://localhost:7100/api/admin/maze/${mazeId}/spawn-reward/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to spawn reward');

            const data = await response.json();
            this.showSuccess(`Ödül spawn edildi: $${data.amount} (${data.room.x}, ${data.room.y})`);
        } catch (error) {
            console.error('Error spawning reward:', error);
            this.showError('Ödül spawn edilemedi');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('http://localhost:7100/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load stats');

            const data = await response.json();

            document.getElementById('stat-users').textContent = data.users;
            document.getElementById('stat-sessions').textContent = data.active_sessions;
            document.getElementById('stat-rewards').textContent = '$' + data.total_rewards_claimed.toFixed(2);
            document.getElementById('stat-transactions').textContent = data.total_transactions;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    populateMapMazeSelect() {
        const select = document.getElementById('map-maze-select');

        // Clear existing options except first
        select.innerHTML = '<option value="">Labirent Seçin</option>';

        // Add mazes
        this.mazes.forEach(maze => {
            const option = document.createElement('option');
            option.value = maze.id;
            option.textContent = `${maze.name} (${maze.width}×${maze.height})`;
            if (maze.is_active) {
                option.textContent += ' ✓';
            }
            select.appendChild(option);
        });

        // Auto-select active maze
        const activeMaze = this.mazes.find(m => m.is_active);
        if (activeMaze) {
            select.value = activeMaze.id;
            this.loadMapData(activeMaze.id);
        }
    }

    async loadMapData(mazeId) {
        try {
            const response = await fetch(`http://localhost:7100/api/admin/maze/${mazeId}/rooms`, {
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load map data');

            const data = await response.json();

            console.log('Map data loaded:', data);

            // Set maze data to admin map
            this.adminMap.setMazeData(data.maze, data.rooms);

            // Reset room details
            document.getElementById('room-details').innerHTML = `
                <h3>Oda Detayları</h3>
                <p>Harita üzerinde bir odaya tıklayın</p>
            `;
        } catch (error) {
            console.error('Error loading map data:', error);
            this.showError('Harita yüklenemedi: ' + error.message);
        }
    }

    showRoomDetails(room) {
        const detailsDiv = document.getElementById('room-details');

        const statusBadges = [];
        if (room.is_sold) statusBadges.push('<span class="badge badge-blue">Satılmış</span>');
        if (room.has_portal) statusBadges.push('<span class="badge badge-purple">Portal</span>');
        if (room.has_reward) statusBadges.push(`<span class="badge badge-gold">Ödül (${room.reward_type})</span>`);
        if (room.has_trap) statusBadges.push(`<span class="badge badge-red">Tuzak (${room.trap_type})</span>`);
        if (!room.is_sold && !room.has_portal && !room.has_reward && !room.has_trap) {
            statusBadges.push('<span class="badge badge-gray">Boş</span>');
        }

        const doors = [];
        if (room.doors.north) doors.push('Kuzey');
        if (room.doors.south) doors.push('Güney');
        if (room.doors.east) doors.push('Doğu');
        if (room.doors.west) doors.push('Batı');

        detailsDiv.innerHTML = `
            <h3>Oda Detayları</h3>
            <div class="room-detail-grid">
                <div class="room-detail-item">
                    <strong>Koordinatlar:</strong> (${room.x}, ${room.y})
                </div>
                <div class="room-detail-item">
                    <strong>Oda ID:</strong> ${room.id}
                </div>
                <div class="room-detail-item">
                    <strong>Durum:</strong><br>
                    ${statusBadges.join(' ')}
                </div>
                <div class="room-detail-item">
                    <strong>Kapılar:</strong> ${doors.length > 0 ? doors.join(', ') : 'Yok'}
                </div>
                ${room.owner_id ? `
                    <div class="room-detail-item">
                        <strong>Sahip ID:</strong> ${room.owner_id}
                    </div>
                ` : ''}
            </div>
        `;
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Initialize admin panel when page loads
let adminPanel;
window.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
