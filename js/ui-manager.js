// UI Manager - Handles all UI interactions

class UIManager {
    constructor() {
        this.isLoggedIn = false;
        this.isRegisterMode = false;
        this.currentUser = null;

        this.initAuthUI();
        this.initGameUI();
        this.initChatUI();
        this.initMenuUI();
        this.initCharacterEditor();
        this.initRoomDesigner();

        // Check if already logged in
        if (api.token) {
            this.checkAuth();
        }
    }

    // ==================== AUTH UI ====================
    initAuthUI() {
        const authForm = document.getElementById('auth-form');
        const authSwitchLink = document.getElementById('auth-switch-link');
        const playOfflineBtn = document.getElementById('play-offline');

        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        }

        if (authSwitchLink) {
            authSwitchLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }

        if (playOfflineBtn) {
            playOfflineBtn.addEventListener('click', () => this.startOfflineGame());
        }
    }

    toggleAuthMode() {
        this.isRegisterMode = !this.isRegisterMode;
        const title = document.getElementById('auth-title');
        const submit = document.getElementById('auth-submit');
        const switchText = document.getElementById('auth-switch-text');
        const switchLink = document.getElementById('auth-switch-link');
        const usernameGroup = document.getElementById('username-group');

        if (this.isRegisterMode) {
            title.textContent = 'Kayıt Ol';
            submit.textContent = 'Kayıt Ol';
            switchText.textContent = 'Zaten hesabınız var mı?';
            switchLink.textContent = 'Giriş Yap';
            usernameGroup.style.display = 'block';
        } else {
            title.textContent = 'Giriş Yap';
            submit.textContent = 'Giriş Yap';
            switchText.textContent = 'Hesabınız yok mu?';
            switchLink.textContent = 'Kayıt Ol';
            usernameGroup.style.display = 'none';
        }
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;

        const submitBtn = document.getElementById('auth-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>';

        try {
            if (this.isRegisterMode) {
                await api.register(username, email, password);
                this.showNotification('Hesap oluşturuldu! Giriş yapılıyor...', 'success');
            }

            await api.login(email, password);
            this.currentUser = await api.getMe();
            this.isLoggedIn = true;

            this.hideAuthModal();
            this.startOnlineGame();
        } catch (error) {
            this.showNotification(error.message || 'Bir hata oluştu', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = this.isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap';
        }
    }

    async checkAuth() {
        try {
            this.currentUser = await api.getMe();
            this.isLoggedIn = true;
            this.hideAuthModal();
            this.startOnlineGame();
        } catch {
            api.clearToken();
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }
    }

    startOfflineGame() {
        this.hideAuthModal();
        // Game will start with LocalRoomProvider
        window.useServerProvider = false;
    }

    startOnlineGame() {
        window.useServerProvider = true;
        // Update balance display
        if (this.currentUser) {
            const balanceEl = document.getElementById('player-balance');
            if (balanceEl) {
                balanceEl.style.display = 'block';
                balanceEl.textContent = `Bakiye: $${this.currentUser.balance.toFixed(2)}`;
            }
        }
    }

    // ==================== GAME UI ====================
    initGameUI() {
        // Portal key (P)
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                this.usePortal();
            }
            if (e.key.toLowerCase() === 't') {
                this.toggleChat();
            }
            if (e.key.toLowerCase() === 'm') {
                this.toggleSound();
            }
            if (e.key === 'Escape') {
                this.toggleMenu();
            }
        });
    }

    async usePortal() {
        if (window.game && window.game.roomProvider.usePortal) {
            const result = await window.game.roomProvider.usePortal();
            if (result.success) {
                this.showNotification('Işınlandınız!', 'info');
                if (soundManager) soundManager.playPortalUse();
            } else {
                this.showNotification(result.message || 'Bu odada portal yok', 'error');
            }
        }
    }

    toggleChat() {
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            const isVisible = chatPanel.style.display !== 'none';
            chatPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                document.getElementById('chat-input').focus();
            }
        }
    }

    toggleSound() {
        if (soundManager) {
            const enabled = soundManager.toggle();
            this.showNotification(enabled ? 'Ses açıldı' : 'Ses kapatıldı', 'info');
        }
    }

    toggleMenu() {
        const menu = document.getElementById('game-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // ==================== CHAT UI ====================
    initChatUI() {
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }

        if (chatSend) {
            chatSend.addEventListener('click', () => this.sendChatMessage());
        }

        // WebSocket chat handler
        gameWS.onChatMessage = (data) => {
            this.addChatMessage(data.username, data.message, data.timestamp);
        };
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const message = input.value.trim();
        if (message) {
            if (window.game && window.game.roomProvider.sendChatMessage) {
                window.game.roomProvider.sendChatMessage(message);
            }
            input.value = '';
        }
    }

    addChatMessage(username, message, timestamp) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const time = new Date(timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.innerHTML = `
            <span class="username">${this.escapeHtml(username)}:</span>
            <span class="text">${this.escapeHtml(message)}</span>
            <span class="time">${time}</span>
        `;
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (soundManager) soundManager.playChatMessage();
    }

    // ==================== MENU UI ====================
    initMenuUI() {
        document.getElementById('menu-character')?.addEventListener('click', () => {
            this.toggleMenu();
            this.showCharacterEditor();
        });

        document.getElementById('menu-rooms')?.addEventListener('click', () => {
            this.toggleMenu();
            this.showMyRooms();
        });

        document.getElementById('menu-shop')?.addEventListener('click', () => {
            this.toggleMenu();
            this.showRoomShop();
        });

        document.getElementById('menu-settings')?.addEventListener('click', () => {
            this.toggleMenu();
            this.showSettings();
        });

        document.getElementById('menu-close')?.addEventListener('click', () => {
            this.toggleMenu();
        });
    }

    // ==================== CHARACTER EDITOR ====================
    initCharacterEditor() {
        document.getElementById('char-randomize')?.addEventListener('click', () => {
            this.randomizeCharacter();
        });

        document.getElementById('char-save')?.addEventListener('click', () => {
            this.saveCharacter();
        });

        document.getElementById('char-close')?.addEventListener('click', () => {
            this.hideCharacterEditor();
        });
    }

    async showCharacterEditor() {
        const modal = document.getElementById('character-modal');
        if (!modal) return;

        modal.style.display = 'flex';

        // Load character options
        try {
            const options = await api.getCharacterOptions();
            this.populateCharacterOptions(options);

            const character = await api.getMyCharacter();
            this.populateCharacterValues(character);
        } catch (error) {
            console.error('Failed to load character data:', error);
        }
    }

    populateCharacterOptions(options) {
        const container = document.querySelector('.editor-options');
        if (!container) return;

        container.innerHTML = '';

        const fields = [
            { key: 'gender', label: 'Cinsiyet', type: 'select' },
            { key: 'skin_color', label: 'Ten Rengi', type: 'color' },
            { key: 'hair_style', label: 'Saç Stili', type: 'select' },
            { key: 'hair_color', label: 'Saç Rengi', type: 'color' },
            { key: 'face_shape', label: 'Yüz Şekli', type: 'select' },
            { key: 'eye_color', label: 'Göz Rengi', type: 'color' },
            { key: 'beard_style', label: 'Sakal', type: 'select' },
            { key: 'mustache_style', label: 'Bıyık', type: 'select' },
            { key: 'body_type', label: 'Vücut Tipi', type: 'select' },
            { key: 'shirt_style', label: 'Üst Giysi', type: 'select' },
            { key: 'shirt_color', label: 'Üst Rengi', type: 'color' },
            { key: 'pants_style', label: 'Alt Giysi', type: 'select' },
            { key: 'pants_color', label: 'Alt Rengi', type: 'color' },
            { key: 'shoes_style', label: 'Ayakkabı', type: 'select' },
            { key: 'shoes_color', label: 'Ayakkabı Rengi', type: 'color' }
        ];

        fields.forEach(field => {
            const row = document.createElement('div');
            row.className = 'option-row';

            const label = document.createElement('label');
            label.textContent = field.label;
            row.appendChild(label);

            if (field.type === 'select') {
                const select = document.createElement('select');
                select.id = `char-${field.key}`;
                (options[field.key] || []).forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    select.appendChild(option);
                });
                row.appendChild(select);
            } else if (field.type === 'color') {
                const input = document.createElement('input');
                input.type = 'color';
                input.id = `char-${field.key}`;
                row.appendChild(input);
            }

            container.appendChild(row);
        });
    }

    populateCharacterValues(character) {
        Object.keys(character).forEach(key => {
            const el = document.getElementById(`char-${key}`);
            if (el) {
                el.value = character[key];
            }
        });
    }

    async randomizeCharacter() {
        try {
            const character = await api.randomizeCharacter();
            this.populateCharacterValues(character);
            this.showNotification('Karakter rastgele oluşturuldu!', 'success');
        } catch (error) {
            this.showNotification('Hata oluştu', 'error');
        }
    }

    async saveCharacter() {
        const data = {};
        document.querySelectorAll('.editor-options [id^="char-"]').forEach(el => {
            const key = el.id.replace('char-', '');
            data[key] = el.value;
        });

        try {
            await api.updateCharacter(data);
            this.showNotification('Karakter kaydedildi!', 'success');
            this.hideCharacterEditor();
        } catch (error) {
            this.showNotification('Kayıt başarısız', 'error');
        }
    }

    hideCharacterEditor() {
        const modal = document.getElementById('character-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ==================== ROOM DESIGNER ====================
    initRoomDesigner() {
        document.getElementById('room-random')?.addEventListener('click', () => {
            this.randomRoomDesign();
        });

        document.getElementById('room-save')?.addEventListener('click', () => {
            this.saveRoomDesign();
        });

        document.getElementById('room-close')?.addEventListener('click', () => {
            this.hideRoomDesigner();
        });
    }

    async showRoomDesigner(roomId) {
        const modal = document.getElementById('room-designer-modal');
        if (!modal) return;

        this.currentEditingRoomId = roomId;
        modal.style.display = 'flex';

        // Load templates
        try {
            const { templates } = await api.getTemplates();
            this.populateTemplates(templates);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    populateTemplates(templates) {
        const grid = document.getElementById('template-grid');
        if (!grid) return;

        const icons = {
            'default': '🏠',
            'halloween': '🎃',
            'christmas': '🎄',
            'modern_office': '🏢',
            'old_salon': '🏚️',
            'spaceship': '🚀',
            'underwater': '🐠',
            'forest': '🌲',
            'desert': '🏜️',
            'cyberpunk': '🌃',
            'medieval': '🏰'
        };

        grid.innerHTML = '';
        templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.dataset.template = t.name;
            card.innerHTML = `
                <div class="icon">${icons[t.name] || '🏠'}</div>
                <div class="name">${t.display_name}</div>
            `;
            card.addEventListener('click', () => this.selectTemplate(t.name));
            grid.appendChild(card);
        });
    }

    selectTemplate(templateName) {
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.template === templateName);
        });
        this.selectedTemplate = templateName;
    }

    async randomRoomDesign() {
        if (!this.currentEditingRoomId) return;

        try {
            await api.applyRandomTemplate(this.currentEditingRoomId);
            this.showNotification('Rastgele tasarım uygulandı!', 'success');
        } catch (error) {
            this.showNotification('Hata oluştu', 'error');
        }
    }

    async saveRoomDesign() {
        if (!this.currentEditingRoomId) return;

        const data = {
            wall_color: document.getElementById('wall-color')?.value,
            floor_color: document.getElementById('floor-color')?.value,
            ceiling_color: document.getElementById('ceiling-color')?.value
        };

        if (this.selectedTemplate) {
            try {
                await api.applyTemplate(this.currentEditingRoomId, this.selectedTemplate);
            } catch (error) {
                console.error('Template error:', error);
            }
        }

        try {
            await api.updateRoomDesign(this.currentEditingRoomId, data);
            this.showNotification('Tasarım kaydedildi!', 'success');
            this.hideRoomDesigner();
        } catch (error) {
            this.showNotification('Kayıt başarısız', 'error');
        }
    }

    hideRoomDesigner() {
        const modal = document.getElementById('room-designer-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // ==================== NOTIFICATIONS ====================
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showRewardPopup(amount, isBigReward = false) {
        const popup = document.getElementById('reward-popup');
        if (!popup) return;

        popup.querySelector('.reward-amount').textContent = `$${amount.toFixed(2)}`;
        popup.querySelector('.reward-message').textContent = isBigReward
            ? 'Büyük Ödülü Kazandınız!'
            : 'Ödül Kazandınız!';

        popup.style.display = 'block';

        setTimeout(() => {
            popup.style.display = 'none';
        }, 3000);

        if (soundManager) {
            soundManager.playRewardPickup(isBigReward);
        }
    }

    showTrapEffect(trapType) {
        const overlay = document.getElementById('trap-overlay');
        if (!overlay) return;

        overlay.className = trapType;
        overlay.style.display = 'block';

        if (soundManager) {
            soundManager.playTrapTrigger(trapType);
        }
    }

    hideTrapEffect() {
        const overlay = document.getElementById('trap-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.className = '';
        }
    }

    updatePortalIndicator(hasPortal) {
        const indicator = document.getElementById('portal-indicator');
        if (indicator) {
            indicator.style.display = hasPortal ? 'block' : 'none';
        }
    }

    updateBalance(balance) {
        const balanceEl = document.getElementById('player-balance');
        if (balanceEl) {
            balanceEl.textContent = `Bakiye: $${balance.toFixed(2)}`;
        }
    }

    // ==================== HELPERS ====================
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMyRooms() {
        this.showNotification('Odalarım özelliği yakında!', 'info');
    }

    showRoomShop() {
        this.showNotification('Oda satın alma özelliği yakında!', 'info');
    }

    showSettings() {
        this.showNotification('Ayarlar özelliği yakında!', 'info');
    }
}

// Global UI manager instance
let uiManager;
document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
});
