// API Client for Backend Communication

class ApiClient {
    constructor(baseUrl = 'http://localhost:7100') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('maze_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('maze_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('maze_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth endpoints
    async register(username, email, password) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        this.setToken(data.access_token);
        return data;
    }

    async getMe() {
        return this.request('/api/auth/me');
    }

    // Maze endpoints
    async startGame(mazeId = null) {
        const endpoint = mazeId ? `/api/maze/start/${mazeId}` : '/api/maze/start';
        return this.request(endpoint, { method: 'POST' });
    }

    async move(direction, sessionToken) {
        return this.request(`/api/maze/move?session_token=${sessionToken}`, {
            method: 'POST',
            body: JSON.stringify({ direction })
        });
    }

    async getCurrentRoom(sessionToken) {
        return this.request(`/api/maze/current?session_token=${sessionToken}`);
    }

    async getVisitedRooms(sessionToken) {
        return this.request(`/api/maze/visited?session_token=${sessionToken}`);
    }

    async usePortal(sessionToken) {
        return this.request(`/api/maze/use-portal?session_token=${sessionToken}`, {
            method: 'POST'
        });
    }

    // Room endpoints
    async purchaseRoom(roomId) {
        return this.request(`/api/room/${roomId}/purchase`, { method: 'POST' });
    }

    async updateRoomDesign(roomId, designData) {
        return this.request(`/api/room/${roomId}/design`, {
            method: 'PUT',
            body: JSON.stringify(designData)
        });
    }

    async applyTemplate(roomId, templateName) {
        return this.request(`/api/room/${roomId}/template/${templateName}`, {
            method: 'POST'
        });
    }

    async applyRandomTemplate(roomId) {
        return this.request(`/api/room/${roomId}/template/random`, {
            method: 'POST'
        });
    }

    async addRoomAd(roomId, adData) {
        return this.request(`/api/room/${roomId}/ad`, {
            method: 'POST',
            body: JSON.stringify(adData)
        });
    }

    async removeRoomAd(roomId, wall) {
        return this.request(`/api/room/${roomId}/ad/${wall}`, {
            method: 'DELETE'
        });
    }

    async recordAdView(roomId, adId, duration = 0) {
        return this.request(`/api/room/${roomId}/ad/${adId}/view?duration=${duration}`, {
            method: 'POST'
        });
    }

    async recordAdClick(roomId, adId) {
        return this.request(`/api/room/${roomId}/ad/${adId}/click`, {
            method: 'POST'
        });
    }

    async getAvailableRooms(mazeId) {
        return this.request(`/api/room/available/${mazeId}`);
    }

    async getTemplates() {
        return this.request('/api/room/templates');
    }

    // Character endpoints
    async getMyCharacter() {
        return this.request('/api/character/me');
    }

    async updateCharacter(characterData) {
        return this.request('/api/character/me', {
            method: 'PUT',
            body: JSON.stringify(characterData)
        });
    }

    async getCharacterOptions() {
        return this.request('/api/character/options');
    }

    async randomizeCharacter() {
        return this.request('/api/character/randomize', { method: 'POST' });
    }

    // Admin endpoints (requires admin access)
    async createMaze(name, width, height, options = {}) {
        return this.request('/api/admin/maze/create', {
            method: 'POST',
            body: JSON.stringify({
                name,
                width,
                height,
                ...options
            })
        });
    }

    async listMazes() {
        return this.request('/api/admin/mazes');
    }

    async activateMaze(mazeId) {
        return this.request(`/api/admin/maze/${mazeId}/activate`, { method: 'PUT' });
    }

    async spawnReward(mazeId, rewardType) {
        return this.request(`/api/admin/maze/${mazeId}/spawn-reward/${rewardType}`, {
            method: 'POST'
        });
    }

    async spawnTrap(mazeId, trapType = null) {
        const url = trapType
            ? `/api/admin/maze/${mazeId}/spawn-trap?trap_type=${trapType}`
            : `/api/admin/maze/${mazeId}/spawn-trap`;
        return this.request(url, { method: 'POST' });
    }

    async getStats() {
        return this.request('/api/admin/stats');
    }
}

// Global API client instance
const api = new ApiClient();
