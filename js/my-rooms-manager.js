// My Rooms Manager - Manages the room purchase and customization UI

class MyRoomsManager {
    constructor(api) {
        this.api = api;
        this.roomPreview = null;
        this.myRooms = [];
        this.currentUser = null;
        this.selectedRoom = null;
        this.templates = [];
        this.initialized = false;

        // Purchase flow state
        this.purchaseState = {
            doorCount: null,
            selectedTemplate: 'default',
            ads: {}
        };

        // Initialize UI elements immediately
        this.modal = document.getElementById('my-rooms-modal');
        this.canvas = document.getElementById('my-rooms-canvas');
        this.roomsList = document.getElementById('my-rooms-list');
        this.balanceElement = document.getElementById('my-rooms-balance');
        this.loadingMessage = document.getElementById('my-rooms-loading');
        this.purchaseFlow = document.getElementById('purchase-flow');
        this.editFlow = document.getElementById('edit-flow');

        // Bind event listeners immediately
        this.bindEvents();
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize RoomPreview if not already done
            if (!this.roomPreview) {
                this.roomPreview = new RoomPreview(this.canvas);
            }

            // Get current user info
            this.currentUser = await this.api.getMe();

            // Load templates
            await this.loadTemplates();

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize MyRoomsManager:', error);
            throw error;
        }
    }

    bindEvents() {
        // Close button
        document.getElementById('my-rooms-close')?.addEventListener('click', () => this.close());

        // Back to maze selection button
        document.getElementById('my-rooms-back')?.addEventListener('click', () => this.backToMazeSelection());

        // Purchase new room button
        document.getElementById('purchase-new-room')?.addEventListener('click', () => this.startPurchaseFlow());

        // Purchase flow: Door selection
        document.querySelectorAll('.door-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const doorCount = parseInt(e.currentTarget.dataset.doors);
                this.selectDoorCount(doorCount);
            });
        });

        // Purchase flow: Navigation
        document.getElementById('back-to-doors')?.addEventListener('click', () => this.showStep('doors'));
        document.getElementById('back-to-design')?.addEventListener('click', () => this.showStep('design'));
        document.getElementById('skip-ads')?.addEventListener('click', () => this.completePurchase());
        document.getElementById('complete-purchase')?.addEventListener('click', () => this.completePurchase());

        // Edit flow
        document.getElementById('cancel-edit')?.addEventListener('click', () => this.cancelEdit());
        document.getElementById('save-room')?.addEventListener('click', () => this.saveRoomChanges());

        // Color pickers (edit mode)
        ['edit-wall-color', 'edit-floor-color', 'edit-ceiling-color'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.updatePreview());
            }
        });
    }

    async loadTemplates() {
        try {
            const response = await this.api.getTemplates();
            this.templates = response.templates;
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = [
                { name: 'default', display_name: 'Varsayılan' }
            ];
        }
    }

    async loadMyRooms() {
        try {
            const response = await this.api.getMyRooms();
            this.myRooms = response.rooms || [];
            this.updateBalance(this.currentUser.balance);
            this.renderRoomsList();

            if (this.myRooms.length === 0) {
                this.loadingMessage.innerHTML = '<p>Henüz hiç odanız yok. Yeni oda satın alın!</p>';
                this.loadingMessage.style.display = 'block';
            } else {
                this.loadingMessage.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
            this.loadingMessage.innerHTML = '<p>Odalar yüklenemedi. Lütfen tekrar deneyin.</p>';
        }
    }

    renderRoomsList() {
        this.roomsList.innerHTML = '';

        this.myRooms.forEach(room => {
            const card = this.createRoomCard(room);
            this.roomsList.appendChild(card);
        });
    }

    createRoomCard(room) {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.dataset.roomId = room.id;

        const doorCount = [room.door_north, room.door_south, room.door_east, room.door_west]
            .filter(d => d).length;

        card.innerHTML = `
            <div class="room-card-header">
                <div>
                    <div class="room-card-title">Oda (${room.x}, ${room.y})</div>
                    <div class="room-card-maze">${room.maze_name}</div>
                </div>
            </div>
            <div class="room-card-info">
                <div class="room-card-info-item">
                    <span>🚪</span>
                    <span>${doorCount} Kapı</span>
                </div>
                <div class="room-card-info-item">
                    <span>📢</span>
                    <span>${room.ads.length} Reklam</span>
                </div>
            </div>
            ${room.design.template !== 'default' ? `
            <div class="room-card-template">
                ${this.getTemplateDisplayName(room.design.template)}
            </div>
            ` : ''}
        `;

        card.addEventListener('click', () => this.selectRoom(room));

        return card;
    }

    getTemplateDisplayName(templateName) {
        const template = this.templates.find(t => t.name === templateName);
        return template ? template.display_name : templateName;
    }

    selectRoom(room) {
        this.selectedRoom = room;

        // Update active state in list
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`.room-card[data-room-id="${room.id}"]`)?.classList.add('active');

        // Hide loading message
        this.loadingMessage.style.display = 'none';

        // Show edit flow
        this.showEditFlow(room);

        // Render room in 3D
        this.roomPreview.renderRoom(room, room.design);
    }

    startPurchaseFlow() {
        // Reset purchase state
        this.purchaseState = {
            doorCount: null,
            selectedTemplate: 'default',
            ads: {}
        };

        // Show purchase flow
        this.purchaseFlow.style.display = 'block';
        this.editFlow.style.display = 'none';
        this.loadingMessage.style.display = 'none';

        // Clear room selection
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('active');
        });

        // Show door selection step
        this.showStep('doors');
    }

    selectDoorCount(doorCount) {
        this.purchaseState.doorCount = doorCount;

        // Update UI
        document.querySelectorAll('.door-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`.door-option[data-doors="${doorCount}"]`)?.classList.add('selected');

        // Move to design selection
        setTimeout(() => {
            this.showStep('design');
            this.renderTemplateSelection();
        }, 300);
    }

    showStep(step) {
        document.getElementById('step-doors').style.display = step === 'doors' ? 'block' : 'none';
        document.getElementById('step-design').style.display = step === 'design' ? 'block' : 'none';
        document.getElementById('step-ads').style.display = step === 'ads' ? 'block' : 'none';
    }

    renderTemplateSelection() {
        const container = document.getElementById('purchase-templates');
        container.innerHTML = '';

        this.templates.forEach(template => {
            const option = document.createElement('div');
            option.className = 'template-option';
            if (template.name === this.purchaseState.selectedTemplate) {
                option.classList.add('selected');
            }

            option.innerHTML = `
                <div class="template-icon">${this.getTemplateIcon(template.name)}</div>
                <div class="template-info">
                    <div class="template-name">${template.display_name}</div>
                    <div class="template-desc">${this.getTemplateDescription(template.name)}</div>
                </div>
            `;

            option.addEventListener('click', () => {
                this.purchaseState.selectedTemplate = template.name;
                document.querySelectorAll('#purchase-templates .template-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');

                // Preview the template
                this.previewPurchaseRoom();

                // Move to ads step
                setTimeout(() => {
                    this.showStep('ads');
                }, 300);
            });

            container.appendChild(option);
        });
    }

    getTemplateIcon(templateName) {
        const icons = {
            default: '🏠',
            halloween: '🎃',
            christmas: '🎄',
            modern_office: '🏢',
            old_salon: '🪑',
            spaceship: '🚀',
            underwater: '🌊',
            forest: '🌲',
            desert: '🏜️',
            cyberpunk: '🤖',
            medieval: '🏰'
        };
        return icons[templateName] || '🏠';
    }

    getTemplateDescription(templateName) {
        const descriptions = {
            default: 'Basit gri duvarlar',
            halloween: 'Karanlık ve turuncu',
            christmas: 'Kırmızı, yeşil, beyaz',
            modern_office: 'Temiz ve aydınlık',
            old_salon: 'Kahverengi ahşap tonları',
            spaceship: 'Karanlık ve mavi ışıklı',
            underwater: 'Mavi tonlar',
            forest: 'Yeşil ve kahverengi',
            desert: 'Kum renkleri',
            cyberpunk: 'Karanlık ve mor ışıklı',
            medieval: 'Taş gri ve turuncu'
        };
        return descriptions[templateName] || '';
    }

    previewPurchaseRoom() {
        // Create a mock room with selected configuration
        const mockRoom = {
            door_north: this.purchaseState.doorCount >= 1,
            door_south: this.purchaseState.doorCount >= 2,
            door_east: this.purchaseState.doorCount >= 3,
            door_west: this.purchaseState.doorCount >= 4,
            ads: []
        };

        // Get template design (simplified)
        const design = this.getTemplateDesign(this.purchaseState.selectedTemplate);

        this.roomPreview.renderRoom(mockRoom, design);
    }

    getTemplateDesign(templateName) {
        // Simplified template designs for preview
        const designs = {
            default: { wall_color: '#808080', floor_color: '#6B4E3D', ceiling_color: '#EEEEEE' },
            halloween: { wall_color: '#1a0a0a', floor_color: '#2d1a0f', ceiling_color: '#0d0d0d', ambient_light_color: '#ff6600', ambient_light_intensity: 0.3 },
            christmas: { wall_color: '#cc0000', floor_color: '#006600', ceiling_color: '#ffffff' },
            modern_office: { wall_color: '#f0f0f0', floor_color: '#d0d0d0', ceiling_color: '#ffffff' },
            old_salon: { wall_color: '#8B4513', floor_color: '#654321', ceiling_color: '#DEB887' },
            spaceship: { wall_color: '#1a1a2e', floor_color: '#0f0f1e', ceiling_color: '#16213e', ambient_light_color: '#00ffff', ambient_light_intensity: 0.4 },
            underwater: { wall_color: '#006994', floor_color: '#004d6d', ceiling_color: '#00aacc', ambient_light_color: '#40e0d0', ambient_light_intensity: 0.5 },
            forest: { wall_color: '#228B22', floor_color: '#654321', ceiling_color: '#90EE90' },
            desert: { wall_color: '#D2B48C', floor_color: '#C19A6B', ceiling_color: '#FFE4B5' },
            cyberpunk: { wall_color: '#0a0a0a', floor_color: '#1a0a1a', ceiling_color: '#0d0014', ambient_light_color: '#ff00ff', ambient_light_intensity: 0.3 },
            medieval: { wall_color: '#708090', floor_color: '#696969', ceiling_color: '#778899', ambient_light_color: '#ff8c00', ambient_light_intensity: 0.4 }
        };
        return designs[templateName] || designs.default;
    }

    async completePurchase() {
        // This is a placeholder - actual purchase requires selecting an available room
        alert('Satın alma özelliği için önce aktif bir labirentte oyun oynamalısınız. Oyun sırasında boş odaları satın alabilirsiniz.');
        this.close();
    }

    showEditFlow(room) {
        this.purchaseFlow.style.display = 'none';
        this.editFlow.style.display = 'block';

        // Update room info
        const roomInfo = document.getElementById('editing-room-info');
        const doorCount = [room.door_north, room.door_south, room.door_east, room.door_west]
            .filter(d => d).length;

        roomInfo.innerHTML = `
            <div class="room-info-item">
                <span class="room-info-label">Konum:</span>
                <span class="room-info-value">(${room.x}, ${room.y})</span>
            </div>
            <div class="room-info-item">
                <span class="room-info-label">Labirent:</span>
                <span class="room-info-value">${room.maze_name}</span>
            </div>
            <div class="room-info-item">
                <span class="room-info-label">Kapı Sayısı:</span>
                <span class="room-info-value">${doorCount}</span>
            </div>
        `;

        // Render template options
        this.renderEditTemplates();

        // Set current colors
        document.getElementById('edit-wall-color').value = room.design.wall_color || '#808080';
        document.getElementById('edit-floor-color').value = room.design.floor_color || '#6B4E3D';
        document.getElementById('edit-ceiling-color').value = room.design.ceiling_color || '#EEEEEE';

        // Render ad management
        this.renderAdManagement(room);
    }

    renderEditTemplates() {
        const container = document.getElementById('edit-templates');
        container.innerHTML = '';

        this.templates.forEach(template => {
            const option = document.createElement('div');
            option.className = 'template-option';
            if (template.name === this.selectedRoom.design.template) {
                option.classList.add('selected');
            }

            option.innerHTML = `
                <div class="template-icon">${this.getTemplateIcon(template.name)}</div>
                <div class="template-info">
                    <div class="template-name">${template.display_name}</div>
                </div>
            `;

            option.addEventListener('click', async () => {
                try {
                    await this.api.applyTemplate(this.selectedRoom.id, template.name);
                    this.selectedRoom.design = this.getTemplateDesign(template.name);
                    this.selectedRoom.design.template = template.name;
                    this.roomPreview.renderRoom(this.selectedRoom, this.selectedRoom.design);

                    document.querySelectorAll('#edit-templates .template-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');

                    this.showNotification('Şablon uygulandı!', 'success');
                } catch (error) {
                    console.error('Failed to apply template:', error);
                    this.showNotification('Şablon uygulanamadı!', 'error');
                }
            });

            container.appendChild(option);
        });
    }

    updatePreview() {
        if (!this.selectedRoom) return;

        const design = {
            ...this.selectedRoom.design,
            wall_color: document.getElementById('edit-wall-color').value,
            floor_color: document.getElementById('edit-floor-color').value,
            ceiling_color: document.getElementById('edit-ceiling-color').value
        };

        this.roomPreview.renderRoom(this.selectedRoom, design);
    }

    renderAdManagement(room) {
        const container = document.getElementById('edit-ads');
        container.innerHTML = '';

        const walls = ['north', 'south', 'east', 'west'];
        const wallNames = { north: 'Kuzey', south: 'Güney', east: 'Doğu', west: 'Batı' };
        const doorMap = { north: room.door_north, south: room.door_south, east: room.door_east, west: room.door_west };

        walls.forEach(wall => {
            const hasDoor = doorMap[wall];
            const ad = room.ads.find(a => a.wall === wall);

            const section = document.createElement('div');
            section.className = 'ad-wall-section';

            section.innerHTML = `
                <div class="ad-wall-header">
                    <span class="ad-wall-name">${wallNames[wall]}</span>
                    <span class="ad-status ${hasDoor ? 'has-door' : ad ? 'has-ad' : ''}">
                        ${hasDoor ? 'Kapı var' : ad ? 'Reklam var' : 'Boş'}
                    </span>
                </div>
                ${!hasDoor ? `
                    <div class="ad-form">
                        <select class="ad-type-select">
                            <option value="image">Resim</option>
                            <option value="canvas">Metin</option>
                        </select>
                        <input type="text" class="ad-content-input" placeholder="${ad && ad.ad_type === 'image' ? 'Resim URL' : 'Metin'}" value="${ad ? (ad.ad_type === 'image' ? ad.content_url || '' : ad.content_text || '') : ''}">
                        <input type="text" class="ad-click-url" placeholder="Tıklama URL (opsiyonel)" value="${ad ? ad.click_url || '' : ''}">
                        <div class="ad-actions">
                            <button class="btn btn-primary btn-add-ad" data-wall="${wall}">${ad ? 'Güncelle' : 'Ekle'}</button>
                            ${ad ? `<button class="btn btn-secondary btn-remove-ad" data-wall="${wall}">Kaldır</button>` : ''}
                        </div>
                    </div>
                ` : ''}
            `;

            container.appendChild(section);

            // Bind events
            if (!hasDoor) {
                const addBtn = section.querySelector('.btn-add-ad');
                const removeBtn = section.querySelector('.btn-remove-ad');
                const typeSelect = section.querySelector('.ad-type-select');
                const contentInput = section.querySelector('.ad-content-input');

                if (ad) {
                    typeSelect.value = ad.ad_type;
                }

                typeSelect.addEventListener('change', () => {
                    contentInput.placeholder = typeSelect.value === 'image' ? 'Resim URL' : 'Metin';
                });

                addBtn.addEventListener('click', () => this.addOrUpdateAd(wall, section));
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => this.removeAd(wall));
                }
            }
        });
    }

    async addOrUpdateAd(wall, section) {
        const adType = section.querySelector('.ad-type-select').value;
        const contentInput = section.querySelector('.ad-content-input').value.trim();
        const clickUrl = section.querySelector('.ad-click-url').value.trim();

        if (!contentInput) {
            this.showNotification('Lütfen içerik girin!', 'error');
            return;
        }

        try {
            const adData = {
                wall: wall,
                ad_type: adType,
                content_url: adType === 'image' ? contentInput : null,
                content_text: adType === 'canvas' ? contentInput : null,
                click_url: clickUrl || null
            };

            await this.api.addRoomAd(this.selectedRoom.id, adData);

            // Update local data
            const existingAdIndex = this.selectedRoom.ads.findIndex(a => a.wall === wall);
            const newAd = { ...adData, is_active: true };

            if (existingAdIndex >= 0) {
                this.selectedRoom.ads[existingAdIndex] = newAd;
            } else {
                this.selectedRoom.ads.push(newAd);
            }

            // Re-render
            this.roomPreview.renderRoom(this.selectedRoom, this.selectedRoom.design);
            this.renderAdManagement(this.selectedRoom);
            this.showNotification('Reklam eklendi!', 'success');
        } catch (error) {
            console.error('Failed to add ad:', error);
            this.showNotification('Reklam eklenemedi!', 'error');
        }
    }

    async removeAd(wall) {
        try {
            await this.api.removeRoomAd(this.selectedRoom.id, wall);

            // Update local data
            this.selectedRoom.ads = this.selectedRoom.ads.filter(a => a.wall !== wall);

            // Re-render
            this.roomPreview.renderRoom(this.selectedRoom, this.selectedRoom.design);
            this.renderAdManagement(this.selectedRoom);
            this.showNotification('Reklam kaldırıldı!', 'success');
        } catch (error) {
            console.error('Failed to remove ad:', error);
            this.showNotification('Reklam kaldırılamadı!', 'error');
        }
    }

    async saveRoomChanges() {
        try {
            const designData = {
                wall_color: document.getElementById('edit-wall-color').value,
                floor_color: document.getElementById('edit-floor-color').value,
                ceiling_color: document.getElementById('edit-ceiling-color').value
            };

            await this.api.updateRoomDesign(this.selectedRoom.id, designData);

            // Update local data
            this.selectedRoom.design = { ...this.selectedRoom.design, ...designData };

            // Re-render
            this.roomPreview.renderRoom(this.selectedRoom, this.selectedRoom.design);
            await this.loadMyRooms();
            this.showNotification('Değişiklikler kaydedildi!', 'success');
        } catch (error) {
            console.error('Failed to save changes:', error);
            this.showNotification('Değişiklikler kaydedilemedi!', 'error');
        }
    }

    cancelEdit() {
        this.selectedRoom = null;
        this.purchaseFlow.style.display = 'none';
        this.editFlow.style.display = 'none';
        this.loadingMessage.style.display = 'block';
        this.loadingMessage.innerHTML = '<p>Oda seçin veya yeni oda satın alın</p>';

        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('active');
        });

        this.roomPreview.clearRoom();
    }

    updateBalance(balance) {
        this.balanceElement.textContent = `$${balance.toFixed(2)}`;
    }

    showNotification(message, type = 'info') {
        // Simple notification (can be enhanced)
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.getElementById('notifications').appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async open() {
        try {
            // Initialize if not already done
            await this.init();

            // Show modal
            this.modal.style.display = 'flex';

            // Load rooms and update balance
            await this.loadMyRooms();

            // Update user balance
            this.api.getMe().then(user => {
                this.currentUser = user;
                this.updateBalance(user.balance);
            });
        } catch (error) {
            console.error('Failed to open My Rooms:', error);
            this.showNotification('Odalarım ekranı açılamadı!', 'error');
        }
    }

    close() {
        this.modal.style.display = 'none';
        this.cancelEdit();
    }

    backToMazeSelection() {
        this.close();
        // Show maze selection modal
        const mazeSelection = document.getElementById('maze-selection-modal');
        if (mazeSelection) {
            mazeSelection.style.display = 'flex';
        }
    }

    destroy() {
        if (this.roomPreview) {
            this.roomPreview.destroy();
        }
    }
}
