// Mobile Controls - Touch-based input system

class MobileControls {
    constructor(game) {
        this.game = game;
        this.enabled = false;

        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;

        // Virtual joystick state
        this.joystickActive = false;
        this.joystickX = 0;
        this.joystickY = 0;

        // Look state
        this.lookActive = false;
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;

        // DOM elements
        this.joystickContainer = null;
        this.joystickKnob = null;
        this.lookArea = null;
        this.actionButtons = null;

        // Touch sensitivity
        this.lookSensitivity = 0.3;
        this.joystickSize = 120;

        this.detectMobile();
    }

    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (isMobile || hasTouch) {
            this.enabled = true;
            this.createControls();
            this.setupTouchEvents();
        }
    }

    createControls() {
        // Create mobile UI container
        const container = document.createElement('div');
        container.id = 'mobile-controls';
        container.innerHTML = `
            <div id="joystick-container">
                <div id="joystick-base">
                    <div id="joystick-knob"></div>
                </div>
            </div>
            <div id="look-area"></div>
            <div id="action-buttons">
                <button id="btn-portal" class="action-btn" title="Portal">
                    <span>&#x2728;</span>
                </button>
                <button id="btn-chat" class="action-btn" title="Chat">
                    <span>&#x1F4AC;</span>
                </button>
                <button id="btn-menu" class="action-btn" title="Menu">
                    <span>&#x2630;</span>
                </button>
            </div>
        `;
        document.body.appendChild(container);

        // Add mobile styles
        const styles = document.createElement('style');
        styles.textContent = `
            #mobile-controls {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            }

            @media (max-width: 768px), (pointer: coarse) {
                #mobile-controls {
                    display: block;
                }
                #debug-info {
                    font-size: 10px;
                    top: 5px;
                    left: 5px;
                }
                #minimap {
                    width: 120px;
                    height: 120px;
                    top: 5px;
                    right: 5px;
                }
            }

            #joystick-container {
                position: absolute;
                bottom: 30px;
                left: 30px;
                pointer-events: auto;
            }

            #joystick-base {
                width: 120px;
                height: 120px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #joystick-knob {
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.6);
                border-radius: 50%;
                transition: transform 0.05s;
            }

            #look-area {
                position: absolute;
                top: 0;
                right: 0;
                width: 50%;
                height: 100%;
                pointer-events: auto;
            }

            #action-buttons {
                position: absolute;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                pointer-events: auto;
            }

            .action-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.5);
                background: rgba(0, 0, 0, 0.4);
                color: white;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                touch-action: manipulation;
            }

            .action-btn:active {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0.95);
            }

            .action-btn span {
                line-height: 1;
            }
        `;
        document.head.appendChild(styles);

        // Store references
        this.joystickContainer = document.getElementById('joystick-container');
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickKnob = document.getElementById('joystick-knob');
        this.lookArea = document.getElementById('look-area');
        this.actionButtons = document.getElementById('action-buttons');
    }

    setupTouchEvents() {
        // Joystick events
        this.joystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        this.joystickBase.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        this.joystickBase.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        this.joystickBase.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });

        // Look area events
        this.lookArea.addEventListener('touchstart', (e) => this.onLookStart(e), { passive: false });
        this.lookArea.addEventListener('touchmove', (e) => this.onLookMove(e), { passive: false });
        this.lookArea.addEventListener('touchend', (e) => this.onLookEnd(e), { passive: false });
        this.lookArea.addEventListener('touchcancel', (e) => this.onLookEnd(e), { passive: false });

        // Action buttons
        document.getElementById('btn-portal').addEventListener('click', () => this.onPortalPress());
        document.getElementById('btn-chat').addEventListener('click', () => this.onChatPress());
        document.getElementById('btn-menu').addEventListener('click', () => this.onMenuPress());

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#mobile-controls')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    onJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        const touch = e.touches[0];
        const rect = this.joystickBase.getBoundingClientRect();
        this.touchStartX = rect.left + rect.width / 2;
        this.touchStartY = rect.top + rect.height / 2;
        this.updateJoystick(touch.clientX, touch.clientY);
    }

    onJoystickMove(e) {
        if (!this.joystickActive) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateJoystick(touch.clientX, touch.clientY);
    }

    onJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.joystickX = 0;
        this.joystickY = 0;
        this.joystickKnob.style.transform = 'translate(0, 0)';

        // Clear movement keys
        if (this.game) {
            this.game.keys['w'] = false;
            this.game.keys['s'] = false;
            this.game.keys['a'] = false;
            this.game.keys['d'] = false;
        }
    }

    updateJoystick(touchX, touchY) {
        const maxDistance = this.joystickSize / 2 - 25;

        let deltaX = touchX - this.touchStartX;
        let deltaY = touchY - this.touchStartY;

        // Clamp to circle
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        // Update knob position
        this.joystickKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Normalize to -1 to 1
        this.joystickX = deltaX / maxDistance;
        this.joystickY = deltaY / maxDistance;

        // Apply to game keys
        if (this.game) {
            const threshold = 0.3;
            this.game.keys['w'] = this.joystickY < -threshold;
            this.game.keys['s'] = this.joystickY > threshold;
            this.game.keys['a'] = this.joystickX < -threshold;
            this.game.keys['d'] = this.joystickX > threshold;
        }
    }

    onLookStart(e) {
        e.preventDefault();
        this.lookActive = true;
        const touch = e.touches[0];
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;

        // Initialize sound on first touch
        if (soundManager && !soundManager.initialized) {
            soundManager.init();
        }
    }

    onLookMove(e) {
        if (!this.lookActive) return;
        e.preventDefault();

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;

        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;

        // Apply look rotation
        if (this.game && this.game.player) {
            this.game.player.rotate(
                deltaX * this.lookSensitivity,
                deltaY * this.lookSensitivity
            );
        }
    }

    onLookEnd(e) {
        e.preventDefault();
        this.lookActive = false;
    }

    onPortalPress() {
        if (this.game && this.game.roomProvider && this.game.roomProvider.usePortal) {
            this.game.roomProvider.usePortal().then(result => {
                if (result.success) {
                    console.log('Portal kullanıldı!');
                    if (soundManager) soundManager.playPortalUse();
                } else {
                    console.log(result.message);
                }
            });
        }
    }

    onChatPress() {
        // Toggle chat panel
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            chatPanel.style.display = chatPanel.style.display === 'none' ? 'block' : 'none';
        }
    }

    onMenuPress() {
        // Toggle menu
        const menu = document.getElementById('game-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
        }
    }

    // Get joystick values for smooth movement
    getJoystickValues() {
        return {
            x: this.joystickX,
            y: this.joystickY
        };
    }

    isEnabled() {
        return this.enabled;
    }
}
