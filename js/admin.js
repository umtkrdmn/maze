// Admin Panel JavaScript

class AdminPanel {
    constructor() {
        this.currentSection = 'mazes';
        this.mazes = [];

        this.init();
    }

    init() {
        // Check if user is admin
        if (!api.token) {
            window.location.href = 'index.html';
            return;
        }

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
