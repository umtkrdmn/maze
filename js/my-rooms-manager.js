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
        this.currentDecorations = null;  // Track decoration positions

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
                // Set callback for when decorations are moved
                this.roomPreview.setOnDecorationMoved((decorations) => {
                    this.currentDecorations = decorations;
                });
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
        // Close button - goes back to maze selection
        document.getElementById('my-rooms-close')?.addEventListener('click', () => this.backToMazeSelection());

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

        // If design has a template but no decorations, get decorations from template
        let designToRender = room.design;
        if (room.design && room.design.template) {
            const hasDecorations = room.design.extra_features?.decorations?.length > 0;
            if (!hasDecorations) {
                // Get template decorations and merge with existing design
                const templateDesign = this.getTemplateDesign(room.design.template);
                designToRender = {
                    ...room.design,
                    extra_features: templateDesign.extra_features
                };
            }
        }

        // Initialize currentDecorations with the decorations being rendered
        this.currentDecorations = designToRender.extra_features?.decorations || null;

        // Render room in 3D
        this.roomPreview.renderRoom(room, designToRender);
    }

    async startPurchaseFlow() {
        // Reset purchase state
        this.purchaseState = {
            mazeId: null,
            selectedRoom: null,
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

        // Show maze selection step
        this.showStep('maze');
        await this.renderMazeSelection();
    }

    async renderMazeSelection() {
        const container = document.getElementById('purchase-mazes');
        container.innerHTML = '<p style="text-align: center; color: #888;">Yükleniyor...</p>';

        try {
            const response = await fetch('http://localhost:7100/api/maze/list');
            const data = await response.json();
            const mazes = data.mazes || [];

            if (mazes.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #888;">Aktif labirent bulunamadı</p>';
                return;
            }

            container.innerHTML = '';

            mazes.forEach(maze => {
                const option = document.createElement('div');
                option.className = 'template-option';

                option.innerHTML = `
                    <div class="template-icon">🏰</div>
                    <div class="template-info">
                        <div class="template-name">${maze.name}</div>
                        <div class="template-desc">${maze.width}×${maze.height} - ${maze.total_rooms} oda</div>
                    </div>
                `;

                option.addEventListener('click', () => {
                    this.selectMaze(maze.id, maze.name);
                });

                container.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load mazes:', error);
            container.innerHTML = '<p style="text-align: center; color: #f44336;">Labirentler yüklenemedi</p>';
        }
    }

    selectMaze(mazeId, mazeName) {
        this.purchaseState.mazeId = mazeId;
        this.purchaseState.mazeName = mazeName;

        // Update UI
        document.querySelectorAll('#purchase-mazes .template-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');

        // Move to door selection
        setTimeout(() => {
            this.showStep('doors');
        }, 300);
    }

    async selectDoorCount(doorCount) {
        this.purchaseState.doorCount = doorCount;

        // Update UI
        document.querySelectorAll('.door-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`.door-option[data-doors="${doorCount}"]`)?.classList.add('selected');

        try {
            // Find available room from backend
            const room = await this.api.findAvailableRoom(this.purchaseState.mazeId, doorCount);
            this.purchaseState.selectedRoom = room;

            // Preview the room
            this.previewPurchaseRoom();

            // Move to design selection
            setTimeout(() => {
                this.showStep('design');
                this.renderTemplateSelection();
            }, 300);
        } catch (error) {
            console.error('Failed to find available room:', error);
            this.showNotification(`${doorCount} kapılı uygun oda bulunamadı!`, 'error');
            // Deselect
            document.querySelector(`.door-option[data-doors="${doorCount}"]`)?.classList.remove('selected');
            this.purchaseState.doorCount = null;
            this.purchaseState.selectedRoom = null;
        }
    }

    showStep(step) {
        document.getElementById('step-maze').style.display = step === 'maze' ? 'block' : 'none';
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
        if (!this.purchaseState.selectedRoom) return;

        // Use the actual room from backend
        const room = {
            door_north: this.purchaseState.selectedRoom.door_north,
            door_south: this.purchaseState.selectedRoom.door_south,
            door_east: this.purchaseState.selectedRoom.door_east,
            door_west: this.purchaseState.selectedRoom.door_west,
            ads: []
        };

        // Get template design (simplified)
        const design = this.getTemplateDesign(this.purchaseState.selectedTemplate);

        this.roomPreview.renderRoom(room, design);
    }

    getTemplateDesign(templateName) {
        // Template designs with decorations (synced with backend)
        const designs = {
            default: {
                wall_color: '#808080',
                floor_color: '#6B4E3D',
                ceiling_color: '#EEEEEE',
                ambient_light_intensity: 0.5,
                extra_features: {
                    decorations: [
                        { type: 'potted_plant', position: [-3.5, 0, -3.5], scale: [1, 1, 1], color: '#228B22' },
                        { type: 'floor_lamp', position: [3.5, 0, -3.5], scale: [1, 1, 1], color: '#FFE4B5' }
                    ]
                }
            },
            halloween: {
                wall_color: '#2D1B2D',
                floor_color: '#1A1A1A',
                ceiling_color: '#0D0D0D',
                ambient_light_color: '#FF6600',
                ambient_light_intensity: 0.3,
                extra_features: {
                    decorations: [
                        { type: 'pumpkin', position: [-3, 0, -3], scale: [1.2, 1.2, 1.2], color: '#FF6600', properties: { glowing: true } },
                        { type: 'pumpkin', position: [3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#FF7518' },
                        { type: 'bat', position: [0, 3.5, -2], scale: [0.6, 0.6, 0.6], color: '#1A1A1A' },
                        { type: 'bat', position: [-2, 3.2, 1], scale: [0.5, 0.5, 0.5], color: '#2D2D2D' },
                        { type: 'spider_web', position: [-4.9, 3, -4.9], scale: [2, 2, 0.1], color: '#CCCCCC' },
                        { type: 'cauldron', position: [3, 0, -3], scale: [1, 1, 1], color: '#2F2F2F', properties: { bubbling: true, smoke_color: '#00FF00' } }
                    ]
                }
            },
            christmas: {
                wall_color: '#C41E3A',
                floor_color: '#228B22',
                ceiling_color: '#FFFFFF',
                ambient_light_color: '#FFD700',
                ambient_light_intensity: 0.6,
                extra_features: {
                    decorations: [
                        { type: 'christmas_tree', position: [-3, 0, -3], scale: [1.5, 1.5, 1.5], color: '#006400', properties: { lights: true, star_color: '#FFD700' } },
                        { type: 'gift_box', position: [-2.5, 0, -2], scale: [0.5, 0.5, 0.5], color: '#FF0000', properties: { ribbon_color: '#FFD700' } },
                        { type: 'gift_box', position: [-3.5, 0, -1.8], scale: [0.4, 0.6, 0.4], color: '#00FF00', properties: { ribbon_color: '#FF0000' } },
                        { type: 'gift_box', position: [-2.8, 0, -1.5], scale: [0.6, 0.4, 0.6], color: '#0000FF', properties: { ribbon_color: '#FFFFFF' } },
                        { type: 'snowman', position: [3.5, 0, -3], scale: [0.8, 0.8, 0.8], color: '#FFFFFF' },
                        { type: 'candy_cane', position: [3.5, 0, 3], scale: [1, 1, 1], color: '#FF0000' },
                        { type: 'string_lights', position: [0, 3.8, 0], scale: [10, 1, 10], color: '#FF0000', properties: { colors: ['#FF0000', '#00FF00', '#FFD700', '#0000FF'] } }
                    ]
                }
            },
            modern_office: {
                wall_color: '#F5F5F5',
                floor_color: '#4A4A4A',
                ceiling_color: '#FFFFFF',
                ambient_light_intensity: 0.7,
                extra_features: {
                    decorations: [
                        { type: 'desk', position: [0, 0, -3.5], scale: [1, 1, 1], color: '#8B4513' },
                        { type: 'office_chair', position: [0, 0, -2.5], scale: [1, 1, 1], color: '#1A1A1A' },
                        { type: 'potted_plant', position: [-3.5, 0, -3.5], scale: [1.2, 1.2, 1.2], color: '#228B22' },
                        { type: 'desk_lamp', position: [0.8, 0.8, -3.5], scale: [0.5, 0.5, 0.5], color: '#C0C0C0' },
                        { type: 'water_cooler', position: [3.5, 0, -3.5], scale: [1, 1, 1], color: '#ADD8E6' },
                        { type: 'clock', position: [0, 2.5, -4.9], scale: [0.6, 0.6, 0.1], color: '#FFFFFF' }
                    ]
                }
            },
            old_salon: {
                wall_color: '#8B4513',
                floor_color: '#654321',
                ceiling_color: '#DEB887',
                ambient_light_color: '#FFF8DC',
                ambient_light_intensity: 0.4,
                extra_features: {
                    decorations: [
                        { type: 'fireplace', position: [0, 0, -4.5], scale: [1.5, 1.5, 1], color: '#8B0000', properties: { fire: true } },
                        { type: 'chandelier', position: [0, 3.5, 0], scale: [1.2, 1, 1.2], color: '#FFD700', properties: { candles: 6 } },
                        { type: 'grandfather_clock', position: [-4, 0, 0], scale: [1, 1, 0.5], color: '#654321' },
                        { type: 'armchair', position: [-2, 0, -2], scale: [1, 1, 1], color: '#8B0000', properties: { rotation_y: 0.5 } },
                        { type: 'armchair', position: [2, 0, -2], scale: [1, 1, 1], color: '#8B0000', properties: { rotation_y: -0.5 } },
                        { type: 'candelabra', position: [3.5, 1, -4], scale: [0.5, 0.5, 0.5], color: '#C0C0C0', properties: { lit: true } }
                    ]
                }
            },
            spaceship: {
                wall_color: '#1C1C1C',
                floor_color: '#2F2F2F',
                ceiling_color: '#0A0A0A',
                ambient_light_color: '#00FFFF',
                ambient_light_intensity: 0.4,
                extra_features: {
                    decorations: [
                        { type: 'control_panel', position: [0, 0.5, -4.5], scale: [3, 1, 0.5], color: '#1C1C1C', properties: { screen_color: '#00FFFF', blinking: true } },
                        { type: 'hologram', position: [0, 1.5, 0], scale: [1, 2, 1], color: '#00FFFF', properties: { rotating: true, shape: 'globe' } },
                        { type: 'light_tube', position: [-4.8, 2, 0], scale: [0.1, 3, 0.1], color: '#00FFFF' },
                        { type: 'light_tube', position: [4.8, 2, 0], scale: [0.1, 3, 0.1], color: '#00FFFF' },
                        { type: 'cryopod', position: [3.5, 0, -3], scale: [1, 2, 1], color: '#4169E1', properties: { frost: true } },
                        { type: 'robot', position: [-3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#C0C0C0' }
                    ]
                }
            },
            underwater: {
                wall_color: '#006994',
                floor_color: '#0077BE',
                ceiling_color: '#00CED1',
                ambient_light_color: '#40E0D0',
                ambient_light_intensity: 0.5,
                extra_features: {
                    decorations: [
                        { type: 'coral', position: [-3, 0, -3], scale: [1.5, 1.5, 1.5], color: '#FF6B6B' },
                        { type: 'coral', position: [3.5, 0, -2], scale: [1, 1.2, 1], color: '#FF69B4' },
                        { type: 'seashell', position: [2, 0, 3], scale: [0.8, 0.8, 0.8], color: '#FFF5EE' },
                        { type: 'starfish', position: [-2, 0.01, 2], scale: [0.6, 0.1, 0.6], color: '#FF4500' },
                        { type: 'bubbles', position: [0, 2, 0], scale: [5, 4, 5], color: '#87CEEB', properties: { animated: true } },
                        { type: 'fish', position: [2, 2.5, -1], scale: [0.5, 0.5, 0.5], color: '#FFD700', properties: { swimming: true } },
                        { type: 'fish', position: [-1, 2, 2], scale: [0.4, 0.4, 0.4], color: '#FF6347', properties: { swimming: true } },
                        { type: 'treasure_chest', position: [3.5, 0, 3], scale: [0.8, 0.8, 0.8], color: '#8B4513', properties: { open: true, gold: true } }
                    ]
                }
            },
            forest: {
                wall_color: '#228B22',
                floor_color: '#3D2914',
                ceiling_color: '#90EE90',
                ambient_light_color: '#ADFF2F',
                ambient_light_intensity: 0.5,
                extra_features: {
                    decorations: [
                        { type: 'tree_stump', position: [-3, 0, -3], scale: [1.2, 0.8, 1.2], color: '#8B4513' },
                        { type: 'mushroom', position: [-2, 0, -2], scale: [0.5, 0.5, 0.5], color: '#FF0000', properties: { spots: true } },
                        { type: 'mushroom', position: [3, 0, -3.5], scale: [0.7, 0.7, 0.7], color: '#DEB887' },
                        { type: 'mushroom', position: [3.5, 0, -3], scale: [0.4, 0.4, 0.4], color: '#FFD700' },
                        { type: 'fern', position: [3.5, 0, 3], scale: [1.5, 1.5, 1.5], color: '#228B22' },
                        { type: 'rock', position: [-3.5, 0, 3], scale: [1, 0.6, 1], color: '#696969' },
                        { type: 'fireflies', position: [0, 2, 0], scale: [5, 3, 5], color: '#FFFF00', properties: { animated: true, count: 20 } },
                        { type: 'bird', position: [2, 3, -2], scale: [0.4, 0.4, 0.4], color: '#FF6347' }
                    ]
                }
            },
            desert: {
                wall_color: '#EDC9AF',
                floor_color: '#C2B280',
                ceiling_color: '#87CEEB',
                ambient_light_color: '#FFD700',
                ambient_light_intensity: 0.8,
                extra_features: {
                    decorations: [
                        { type: 'cactus', position: [-3, 0, -3], scale: [1.5, 2, 1.5], color: '#228B22' },
                        { type: 'cactus', position: [3.5, 0, -2], scale: [1, 1.5, 1], color: '#2E8B57' },
                        { type: 'sand_dune', position: [3, 0, 3], scale: [2, 0.5, 2], color: '#DEB887' },
                        { type: 'skull', position: [-2, 0.1, 2], scale: [0.4, 0.4, 0.4], color: '#FFFFF0' },
                        { type: 'tumbleweed', position: [0, 0.3, 0], scale: [0.6, 0.6, 0.6], color: '#D2B48C' },
                        { type: 'pottery', position: [-3.5, 0, 3], scale: [0.8, 1, 0.8], color: '#CD853F' },
                        { type: 'sun', position: [0, 4, -4], scale: [1, 1, 0.1], color: '#FFD700', properties: { glowing: true } }
                    ]
                }
            },
            cyberpunk: {
                wall_color: '#0D0D0D',
                floor_color: '#1A1A2E',
                ceiling_color: '#16213E',
                ambient_light_color: '#FF00FF',
                ambient_light_intensity: 0.4,
                extra_features: {
                    decorations: [
                        { type: 'neon_sign', position: [0, 2.5, -4.9], scale: [3, 1, 0.1], color: '#FF00FF', properties: { text: 'CYBER', flicker: true } },
                        { type: 'neon_tube', position: [-4.8, 2, -2], scale: [0.1, 0.1, 3], color: '#00FFFF' },
                        { type: 'neon_tube', position: [4.8, 1.5, 0], scale: [0.1, 0.1, 4], color: '#FF00FF' },
                        { type: 'holographic_screen', position: [3, 1.5, -3], scale: [1.5, 1, 0.1], color: '#00FFFF', properties: { animated: true } },
                        { type: 'robot_parts', position: [-3, 0, -3], scale: [1, 1, 1], color: '#C0C0C0' },
                        { type: 'server_rack', position: [-4, 0, 0], scale: [0.8, 2, 0.5], color: '#1A1A1A', properties: { lights: true } },
                        { type: 'drone', position: [2, 2.5, 2], scale: [0.5, 0.3, 0.5], color: '#333333', properties: { hovering: true } }
                    ]
                }
            },
            medieval: {
                wall_color: '#696969',
                floor_color: '#4A4A4A',
                ceiling_color: '#2F2F2F',
                ambient_light_color: '#FFA500',
                ambient_light_intensity: 0.3,
                extra_features: {
                    decorations: [
                        { type: 'torch', position: [-4.8, 2, -2], scale: [0.3, 0.5, 0.3], color: '#8B4513', properties: { fire: true } },
                        { type: 'torch', position: [4.8, 2, -2], scale: [0.3, 0.5, 0.3], color: '#8B4513', properties: { fire: true } },
                        { type: 'armor_stand', position: [-3.5, 0, -3.5], scale: [1, 1.8, 1], color: '#C0C0C0' },
                        { type: 'barrel', position: [3.5, 0, 3], scale: [0.7, 1, 0.7], color: '#8B4513' },
                        { type: 'barrel', position: [3, 0, 3.5], scale: [0.6, 0.9, 0.6], color: '#A0522D' },
                        { type: 'banner', position: [0, 2.5, -4.9], scale: [1, 2, 0.1], color: '#8B0000', properties: { emblem: 'lion' } },
                        { type: 'sword_display', position: [4, 1.5, 0], scale: [0.2, 1.5, 0.1], color: '#C0C0C0' },
                        { type: 'chest', position: [-3, 0, 3], scale: [1, 0.7, 0.6], color: '#654321' }
                    ]
                }
            }
        };
        return designs[templateName] || designs.default;
    }

    async completePurchase() {
        if (!this.purchaseState.selectedRoom) {
            this.showNotification('Lütfen önce bir oda seçin!', 'error');
            return;
        }

        try {
            // Purchase the room
            const result = await this.api.purchaseRoom(this.purchaseState.selectedRoom.room_id);

            if (result.success) {
                // Apply the selected template
                await this.api.applyTemplate(this.purchaseState.selectedRoom.room_id, this.purchaseState.selectedTemplate);

                // Update balance
                this.updateBalance(result.new_balance);
                this.currentUser.balance = result.new_balance;

                this.showNotification('Oda başarıyla satın alındı!', 'success');

                // Reload rooms list
                await this.loadMyRooms();

                // Close purchase flow
                this.purchaseFlow.style.display = 'none';
                this.editFlow.style.display = 'none';
                this.loadingMessage.style.display = 'block';
                this.loadingMessage.innerHTML = '<p>Yeni odanız başarıyla eklendi!</p>';
            }
        } catch (error) {
            console.error('Failed to purchase room:', error);
            this.showNotification('Oda satın alınamadı: ' + error.message, 'error');
        }
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

                    // Dekorasyon pozisyonlarını güncelle
                    this.currentDecorations = this.selectedRoom.design.extra_features?.decorations || null;

                    this.roomPreview.renderRoom(this.selectedRoom, this.selectedRoom.design);

                    // Renk panelini güncelle
                    const wallColorInput = document.getElementById('edit-wall-color');
                    const floorColorInput = document.getElementById('edit-floor-color');
                    const ceilingColorInput = document.getElementById('edit-ceiling-color');

                    if (wallColorInput) wallColorInput.value = this.selectedRoom.design.wall_color || '#E8E8E8';
                    if (floorColorInput) floorColorInput.value = this.selectedRoom.design.floor_color || '#6B4E3D';
                    if (ceilingColorInput) ceilingColorInput.value = this.selectedRoom.design.ceiling_color || '#EEEEEE';

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
                        ${ad ? this.renderLockSettings(ad, room.id) : ''}
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

                // Bind lock settings events
                if (ad) {
                    this.bindLockSettingsEvents(section, ad, room.id);
                }
            }
        });
    }

    renderLockSettings(ad, roomId) {
        const lockType = ad.lock_type || 'none';
        const timerSeconds = ad.lock_timer_seconds || 10;

        return `
            <div class="lock-settings">
                <h4>🔐 Kapı Kilidi Ayarları</h4>
                <div class="lock-type-options">
                    <label class="lock-option">
                        <input type="radio" name="lock-type-${ad.id}" value="none" ${lockType === 'none' ? 'checked' : ''}>
                        <span>Kilit Yok</span>
                    </label>
                    <label class="lock-option">
                        <input type="radio" name="lock-type-${ad.id}" value="timer" ${lockType === 'timer' ? 'checked' : ''}>
                        <span>⏱️ Zamanlayıcı</span>
                    </label>
                    <label class="lock-option">
                        <input type="radio" name="lock-type-${ad.id}" value="quiz" ${lockType === 'quiz' ? 'checked' : ''}>
                        <span>❓ Soru-Cevap</span>
                    </label>
                </div>

                <div class="timer-settings" style="display: ${lockType === 'timer' ? 'block' : 'none'};">
                    <label>Bekleme Süresi (saniye):</label>
                    <input type="number" class="timer-seconds-input" value="${timerSeconds}" min="5" max="60">
                </div>

                <div class="quiz-settings" style="display: ${lockType === 'quiz' ? 'block' : 'none'};">
                    <label>Reklam Açıklaması (Soru üretimi için):</label>
                    <textarea class="ad-description-input" placeholder="Reklamın içeriğini açıklayın. Örn: Nike Air Max spor ayakkabı reklamı. Slogan: Just Do It. Fiyat: 2499 TL...">${ad.ad_description || ''}</textarea>

                    <div class="gemini-generate-section">
                        <div class="generate-options">
                            <label>Soru Sayısı: <input type="number" class="question-count-input" value="3" min="1" max="10"></label>
                            <label>Şık Sayısı: <input type="number" class="option-count-input" value="4" min="2" max="6"></label>
                        </div>
                        <button class="btn btn-primary btn-generate-questions" data-ad-id="${ad.id}" data-room-id="${roomId}">
                            🤖 Gemini ile Soru Oluştur
                        </button>
                    </div>

                    <div class="questions-list" id="questions-list-${ad.id}">
                        <p class="loading-questions">Sorular yükleniyor...</p>
                    </div>

                    <button class="btn btn-secondary btn-add-manual-question" data-ad-id="${ad.id}" data-room-id="${roomId}">
                        + Manuel Soru Ekle
                    </button>
                </div>

                <button class="btn btn-primary btn-save-lock-settings" data-ad-id="${ad.id}" data-room-id="${roomId}">
                    💾 Kilit Ayarlarını Kaydet
                </button>
            </div>
        `;
    }

    bindLockSettingsEvents(section, ad, roomId) {
        // Lock type radio buttons
        const lockRadios = section.querySelectorAll(`input[name="lock-type-${ad.id}"]`);
        const timerSettings = section.querySelector('.timer-settings');
        const quizSettings = section.querySelector('.quiz-settings');

        lockRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                timerSettings.style.display = radio.value === 'timer' ? 'block' : 'none';
                quizSettings.style.display = radio.value === 'quiz' ? 'block' : 'none';
            });
        });

        // Generate questions button
        const generateBtn = section.querySelector('.btn-generate-questions');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateQuestions(section, ad, roomId));
        }

        // Add manual question button
        const addQuestionBtn = section.querySelector('.btn-add-manual-question');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', () => this.showManualQuestionForm(section, ad, roomId));
        }

        // Save lock settings button
        const saveLockBtn = section.querySelector('.btn-save-lock-settings');
        if (saveLockBtn) {
            saveLockBtn.addEventListener('click', () => this.saveLockSettings(section, ad, roomId));
        }

        // Load existing questions
        this.loadQuestions(ad.id, roomId, section);
    }

    async loadQuestions(adId, roomId, section) {
        const questionsList = section.querySelector(`#questions-list-${adId}`);
        if (!questionsList) return;

        try {
            const response = await fetch(`/api/room/${roomId}/ad/${adId}/questions`, {
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });
            const data = await response.json();

            if (data.questions && data.questions.length > 0) {
                questionsList.innerHTML = data.questions.map(q => this.renderQuestion(q, adId, roomId)).join('');
                this.bindQuestionEvents(questionsList, adId, roomId);
            } else {
                questionsList.innerHTML = '<p class="no-questions">Henüz soru eklenmemiş.</p>';
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
            questionsList.innerHTML = '<p class="error">Sorular yüklenemedi.</p>';
        }
    }

    renderQuestion(question, adId, roomId) {
        const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        return `
            <div class="question-item" data-question-id="${question.id}">
                <div class="question-header">
                    <span class="question-number">#${question.order + 1}</span>
                    <div class="question-actions">
                        <button class="btn-icon btn-edit-question" title="Düzenle">✏️</button>
                        <button class="btn-icon btn-delete-question" title="Sil">🗑️</button>
                    </div>
                </div>
                <p class="question-text">${question.question_text}</p>
                <div class="question-options">
                    ${question.options.map((opt, i) => `
                        <div class="option-item ${i === question.correct_option_index ? 'correct' : ''}">
                            <span class="option-label">${optionLabels[i]})</span>
                            <span class="option-text">${opt}</span>
                            ${i === question.correct_option_index ? '<span class="correct-badge">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindQuestionEvents(questionsList, adId, roomId) {
        questionsList.querySelectorAll('.btn-delete-question').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const questionItem = e.target.closest('.question-item');
                const questionId = questionItem.dataset.questionId;

                if (confirm('Bu soruyu silmek istediğinizden emin misiniz?')) {
                    await this.deleteQuestion(questionId, adId, roomId, questionItem);
                }
            });
        });

        questionsList.querySelectorAll('.btn-edit-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionItem = e.target.closest('.question-item');
                const questionId = questionItem.dataset.questionId;
                this.showEditQuestionForm(questionId, adId, roomId, questionItem);
            });
        });
    }

    async deleteQuestion(questionId, adId, roomId, questionItem) {
        try {
            await fetch(`/api/room/${roomId}/ad/${adId}/questions/${questionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });
            questionItem.remove();
            this.showNotification('Soru silindi!', 'success');
        } catch (error) {
            console.error('Failed to delete question:', error);
            this.showNotification('Soru silinemedi!', 'error');
        }
    }

    async generateQuestions(section, ad, roomId) {
        const descriptionInput = section.querySelector('.ad-description-input');
        const questionCountInput = section.querySelector('.question-count-input');
        const optionCountInput = section.querySelector('.option-count-input');
        const generateBtn = section.querySelector('.btn-generate-questions');

        const description = descriptionInput.value.trim();
        if (!description) {
            this.showNotification('Lütfen reklam açıklaması girin!', 'error');
            return;
        }

        // First save the description
        await this.saveLockSettings(section, ad, roomId);

        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ Oluşturuluyor...';

        try {
            const response = await fetch(`/api/room/${roomId}/ad/${ad.id}/generate-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.token}`
                },
                body: JSON.stringify({
                    question_count: parseInt(questionCountInput.value) || 3,
                    option_count: parseInt(optionCountInput.value) || 4
                })
            });

            const data = await response.json();

            if (data.success && data.questions) {
                // Show questions for review
                this.showGeneratedQuestionsForReview(section, data.questions, ad.id, roomId);
                this.showNotification('Sorular oluşturuldu! İnceleyip kaydedin.', 'success');
            } else {
                throw new Error(data.detail || 'Soru oluşturulamadı');
            }
        } catch (error) {
            console.error('Failed to generate questions:', error);
            this.showNotification('Sorular oluşturulamadı: ' + error.message, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '🤖 Gemini ile Soru Oluştur';
        }
    }

    showGeneratedQuestionsForReview(section, questions, adId, roomId) {
        const questionsList = section.querySelector(`#questions-list-${adId}`);
        const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

        questionsList.innerHTML = `
            <div class="generated-questions-review">
                <h5>Oluşturulan Sorular (İnceleyip onaylayın)</h5>
                ${questions.map((q, idx) => `
                    <div class="review-question" data-index="${idx}">
                        <div class="review-question-header">
                            <span>Soru ${idx + 1}</span>
                            <button class="btn-icon btn-remove-generated" title="Kaldır">❌</button>
                        </div>
                        <textarea class="review-question-text">${q.question_text}</textarea>
                        <div class="review-options">
                            ${q.options.map((opt, i) => `
                                <div class="review-option">
                                    <input type="radio" name="correct-${idx}" value="${i}" ${i === q.correct_option_index ? 'checked' : ''}>
                                    <span>${optionLabels[i]})</span>
                                    <input type="text" class="review-option-text" value="${opt}">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                <div class="review-actions">
                    <button class="btn btn-secondary btn-cancel-review">İptal</button>
                    <button class="btn btn-primary btn-save-generated">💾 Soruları Kaydet</button>
                </div>
            </div>
        `;

        // Bind review events
        questionsList.querySelector('.btn-cancel-review').addEventListener('click', () => {
            this.loadQuestions(adId, roomId, section);
        });

        questionsList.querySelector('.btn-save-generated').addEventListener('click', () => {
            this.saveGeneratedQuestions(questionsList, adId, roomId, section);
        });

        questionsList.querySelectorAll('.btn-remove-generated').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.review-question').remove();
            });
        });
    }

    async saveGeneratedQuestions(questionsList, adId, roomId, section) {
        const reviewQuestions = questionsList.querySelectorAll('.review-question');
        const questions = [];

        reviewQuestions.forEach((rq, order) => {
            const questionText = rq.querySelector('.review-question-text').value.trim();
            const options = Array.from(rq.querySelectorAll('.review-option-text')).map(input => input.value.trim());
            const correctIndex = parseInt(rq.querySelector('input[type="radio"]:checked')?.value || 0);

            if (questionText) {
                questions.push({
                    question_text: questionText,
                    options: options,
                    correct_option_index: correctIndex,
                    order: order
                });
            }
        });

        if (questions.length === 0) {
            this.showNotification('En az bir soru olmalı!', 'error');
            return;
        }

        try {
            // First delete existing questions
            await fetch(`/api/room/${roomId}/ad/${adId}/questions`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                }
            });

            // Then add new questions
            await fetch(`/api/room/${roomId}/ad/${adId}/questions/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.token}`
                },
                body: JSON.stringify(questions)
            });

            this.showNotification('Sorular kaydedildi!', 'success');
            this.loadQuestions(adId, roomId, section);
        } catch (error) {
            console.error('Failed to save questions:', error);
            this.showNotification('Sorular kaydedilemedi!', 'error');
        }
    }

    showManualQuestionForm(section, ad, roomId) {
        const questionsList = section.querySelector(`#questions-list-${ad.id}`);
        const optionLabels = ['A', 'B', 'C', 'D'];

        const form = document.createElement('div');
        form.className = 'manual-question-form';
        form.innerHTML = `
            <h5>Yeni Soru Ekle</h5>
            <textarea class="manual-question-text" placeholder="Soru metnini girin..."></textarea>
            <div class="manual-options">
                ${optionLabels.map((label, i) => `
                    <div class="manual-option">
                        <input type="radio" name="manual-correct" value="${i}" ${i === 0 ? 'checked' : ''}>
                        <span>${label})</span>
                        <input type="text" class="manual-option-text" placeholder="Şık ${label}">
                    </div>
                `).join('')}
            </div>
            <div class="manual-form-actions">
                <button class="btn btn-secondary btn-cancel-manual">İptal</button>
                <button class="btn btn-primary btn-save-manual">Kaydet</button>
            </div>
        `;

        questionsList.appendChild(form);

        form.querySelector('.btn-cancel-manual').addEventListener('click', () => form.remove());
        form.querySelector('.btn-save-manual').addEventListener('click', async () => {
            const questionText = form.querySelector('.manual-question-text').value.trim();
            const options = Array.from(form.querySelectorAll('.manual-option-text')).map(input => input.value.trim());
            const correctIndex = parseInt(form.querySelector('input[name="manual-correct"]:checked').value);

            if (!questionText || options.some(o => !o)) {
                this.showNotification('Tüm alanları doldurun!', 'error');
                return;
            }

            try {
                await fetch(`/api/room/${roomId}/ad/${ad.id}/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${api.token}`
                    },
                    body: JSON.stringify({
                        question_text: questionText,
                        options: options,
                        correct_option_index: correctIndex,
                        order: 0
                    })
                });

                this.showNotification('Soru eklendi!', 'success');
                this.loadQuestions(ad.id, roomId, section);
            } catch (error) {
                console.error('Failed to add question:', error);
                this.showNotification('Soru eklenemedi!', 'error');
            }
        });
    }

    showEditQuestionForm(questionId, adId, roomId, questionItem) {
        // TODO: Implement edit question form
        this.showNotification('Düzenleme özelliği yakında eklenecek!', 'info');
    }

    async saveLockSettings(section, ad, roomId) {
        const lockType = section.querySelector(`input[name="lock-type-${ad.id}"]:checked`)?.value || 'none';
        const timerSeconds = parseInt(section.querySelector('.timer-seconds-input')?.value) || 10;
        const description = section.querySelector('.ad-description-input')?.value.trim() || null;

        try {
            await fetch(`/api/room/${roomId}/ad/${ad.id}/lock-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.token}`
                },
                body: JSON.stringify({
                    lock_type: lockType,
                    lock_timer_seconds: timerSeconds,
                    ad_description: description
                })
            });

            // Update local ad object
            ad.lock_type = lockType;
            ad.lock_timer_seconds = timerSeconds;
            ad.ad_description = description;

            this.showNotification('Kilit ayarları kaydedildi!', 'success');
        } catch (error) {
            console.error('Failed to save lock settings:', error);
            this.showNotification('Kilit ayarları kaydedilemedi!', 'error');
        }
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

            // Include decoration positions if they've been modified
            if (this.currentDecorations) {
                designData.extra_features = {
                    decorations: this.currentDecorations
                };
            }

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

            // Force resize after modal is visible (fixes black screen issue)
            // Use multiple requestAnimationFrame calls to ensure CSS layout is complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (this.roomPreview) {
                        this.roomPreview.forceResize();
                    }
                    // Also trigger resize after a short delay for good measure
                    setTimeout(() => {
                        if (this.roomPreview) {
                            this.roomPreview.forceResize();
                        }
                    }, 100);
                });
            });

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
