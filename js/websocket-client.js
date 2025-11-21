// WebSocket Client for Multiplayer

class GameWebSocket {
    constructor(serverUrl = 'ws://localhost:7100/ws') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        // Event callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerMoved = null;
        this.onRoomPlayers = null;
        this.onChatMessage = null;
        this.onRewardSpawned = null;
        this.onRewardClaimed = null;
        this.onGameEnded = null;
        this.onConnect = null;
        this.onDisconnect = null;

        // Players in current room
        this.playersInRoom = new Map();
    }

    connect(token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        const url = `${this.serverUrl}?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            if (this.onConnect) this.onConnect();
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected', event.code, event.reason);
            this.connected = false;
            this.playersInRoom.clear();
            if (this.onDisconnect) this.onDisconnect(event);

            // Auto-reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
                setTimeout(() => this.connect(token), this.reconnectDelay);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data));
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.playersInRoom.clear();
    }

    handleMessage(data) {
        switch (data.type) {
            case 'player_joined':
                this.playersInRoom.set(data.user_id, {
                    userId: data.user_id,
                    username: data.username,
                    character: data.character,
                    posX: 0,
                    posY: 1.6,
                    posZ: 0,
                    yaw: 0,
                    pitch: 0
                });
                if (this.onPlayerJoined) this.onPlayerJoined(data);
                break;

            case 'player_left':
                this.playersInRoom.delete(data.user_id);
                if (this.onPlayerLeft) this.onPlayerLeft(data);
                break;

            case 'player_moved':
                if (this.playersInRoom.has(data.user_id)) {
                    const player = this.playersInRoom.get(data.user_id);
                    player.posX = data.pos_x;
                    player.posY = data.pos_y;
                    player.posZ = data.pos_z;
                    player.yaw = data.yaw;
                    player.pitch = data.pitch;
                }
                if (this.onPlayerMoved) this.onPlayerMoved(data);
                break;

            case 'room_players':
                this.playersInRoom.clear();
                data.players.forEach(p => {
                    this.playersInRoom.set(p.user_id, {
                        userId: p.user_id,
                        username: p.username,
                        character: p.character,
                        posX: p.pos_x,
                        posY: p.pos_y,
                        posZ: p.pos_z,
                        yaw: p.yaw,
                        pitch: p.pitch
                    });
                });
                if (this.onRoomPlayers) this.onRoomPlayers(data.players);
                break;

            case 'chat_message':
                if (this.onChatMessage) this.onChatMessage(data);
                break;

            case 'reward_spawned':
                if (this.onRewardSpawned) this.onRewardSpawned(data);
                break;

            case 'reward_claimed':
                if (this.onRewardClaimed) this.onRewardClaimed(data);
                if (data.is_big_reward && data.game_ended) {
                    if (this.onGameEnded) this.onGameEnded(data);
                }
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Send position update
    updatePosition(posX, posY, posZ, yaw, pitch) {
        this.send({
            type: 'position_update',
            pos_x: posX,
            pos_y: posY,
            pos_z: posZ,
            yaw: yaw,
            pitch: pitch
        });
    }

    // Notify room change
    changeRoom(roomX, roomY) {
        this.send({
            type: 'room_change',
            room_x: roomX,
            room_y: roomY
        });
    }

    // Send chat message
    sendChat(message) {
        this.send({
            type: 'chat',
            message: message
        });
    }

    // Heartbeat
    ping() {
        this.send({ type: 'ping' });
    }

    // Get players in current room
    getPlayersInRoom() {
        return Array.from(this.playersInRoom.values());
    }
}

// Global WebSocket client instance
const gameWS = new GameWebSocket();
