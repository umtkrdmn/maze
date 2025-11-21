// Sound Manager - 3D Spatial Audio System

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.listener = null;
        this.sounds = {};
        this.isEnabled = true;
        this.masterVolume = 0.7;

        // Sound pools for frequently played sounds
        this.soundPools = {};

        // Ambient sounds
        this.ambientSounds = {};
        this.currentAmbient = null;

        // Initialize on first user interaction
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Create listener for 3D audio
            this.listener = this.audioContext.listener;

            // Load all sounds
            await this.loadSounds();

            this.initialized = true;
            console.log('Sound Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Sound Manager:', error);
        }
    }

    async loadSounds() {
        // Define all game sounds
        const soundDefinitions = {
            // Footsteps
            footstep_wood: { url: 'assets/sounds/footstep_wood.mp3', pool: 4 },
            footstep_stone: { url: 'assets/sounds/footstep_stone.mp3', pool: 4 },
            footstep_carpet: { url: 'assets/sounds/footstep_carpet.mp3', pool: 4 },
            footstep_metal: { url: 'assets/sounds/footstep_metal.mp3', pool: 4 },

            // Door sounds
            door_open: { url: 'assets/sounds/door_open.mp3' },
            door_close: { url: 'assets/sounds/door_close.mp3' },
            door_locked: { url: 'assets/sounds/door_locked.mp3' },

            // Rewards
            reward_small: { url: 'assets/sounds/coin_pickup.mp3' },
            reward_big: { url: 'assets/sounds/jackpot.mp3' },

            // Traps
            trap_trigger: { url: 'assets/sounds/trap_trigger.mp3' },
            trap_freeze: { url: 'assets/sounds/freeze.mp3' },
            trap_teleport: { url: 'assets/sounds/teleport.mp3' },

            // Portal
            portal_ambient: { url: 'assets/sounds/portal_hum.mp3', loop: true },
            portal_use: { url: 'assets/sounds/portal_use.mp3' },

            // UI
            ui_click: { url: 'assets/sounds/ui_click.mp3' },
            ui_hover: { url: 'assets/sounds/ui_hover.mp3' },
            chat_message: { url: 'assets/sounds/chat_message.mp3' },
            notification: { url: 'assets/sounds/notification.mp3' },

            // Ambient room types
            ambient_default: { url: 'assets/sounds/ambient_default.mp3', loop: true },
            ambient_spaceship: { url: 'assets/sounds/ambient_spaceship.mp3', loop: true },
            ambient_underwater: { url: 'assets/sounds/ambient_underwater.mp3', loop: true },
            ambient_forest: { url: 'assets/sounds/ambient_forest.mp3', loop: true },
            ambient_medieval: { url: 'assets/sounds/ambient_medieval.mp3', loop: true },
            ambient_cyberpunk: { url: 'assets/sounds/ambient_cyberpunk.mp3', loop: true }
        };

        // Create placeholder sounds (since we don't have actual audio files)
        for (const [name, def] of Object.entries(soundDefinitions)) {
            this.sounds[name] = {
                buffer: null,
                url: def.url,
                loop: def.loop || false,
                loaded: false
            };

            // Create sound pool if needed
            if (def.pool) {
                this.soundPools[name] = {
                    index: 0,
                    size: def.pool
                };
            }
        }

        // Try to load sounds (will fail gracefully if files don't exist)
        for (const [name, sound] of Object.entries(this.sounds)) {
            this.loadSound(name, sound.url).catch(() => {
                // Generate placeholder sound
                sound.buffer = this.generatePlaceholderSound(name);
                sound.loaded = true;
            });
        }
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name].buffer = audioBuffer;
            this.sounds[name].loaded = true;
        } catch (error) {
            throw error;
        }
    }

    generatePlaceholderSound(name) {
        // Generate simple placeholder sounds based on type
        const duration = name.includes('ambient') ? 5 : 0.3;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        if (name.includes('footstep')) {
            // Short click sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(150 * Math.PI * t) * Math.exp(-10 * t) * 0.3;
            }
        } else if (name.includes('door')) {
            // Creak sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(200 * Math.PI * t * (1 + 0.5 * t)) * Math.exp(-3 * t) * 0.4;
            }
        } else if (name.includes('reward') || name.includes('coin')) {
            // Ding sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(880 * Math.PI * t) * Math.exp(-5 * t) * 0.5;
            }
        } else if (name.includes('trap') || name.includes('freeze')) {
            // Zap sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-8 * t) * 0.4;
            }
        } else if (name.includes('portal') || name.includes('teleport')) {
            // Whoosh sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const freq = 100 + 400 * t;
                data[i] = Math.sin(freq * Math.PI * t) * Math.exp(-2 * t) * 0.3;
            }
        } else if (name.includes('ambient')) {
            // Low rumble
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = (Math.sin(50 * Math.PI * t) + Math.random() * 0.1) * 0.1;
            }
        } else {
            // Generic click
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] = Math.sin(440 * Math.PI * t) * Math.exp(-10 * t) * 0.3;
            }
        }

        return buffer;
    }

    play(soundName, options = {}) {
        if (!this.initialized || !this.isEnabled) return null;
        if (!this.sounds[soundName] || !this.sounds[soundName].buffer) return null;

        const sound = this.sounds[soundName];
        const source = this.audioContext.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = options.loop || sound.loop;

        // Create gain node for this sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : 1;

        // Connect: source -> gain -> master
        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(0);

        return { source, gainNode };
    }

    play3D(soundName, position, options = {}) {
        if (!this.initialized || !this.isEnabled) return null;
        if (!this.sounds[soundName] || !this.sounds[soundName].buffer) return null;

        const sound = this.sounds[soundName];
        const source = this.audioContext.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = options.loop || sound.loop;

        // Create panner for 3D positioning
        const panner = this.audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 50;
        panner.rolloffFactor = 1;

        // Set position
        panner.positionX.value = position.x || 0;
        panner.positionY.value = position.y || 0;
        panner.positionZ.value = position.z || 0;

        // Create gain node
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : 1;

        // Connect: source -> panner -> gain -> master
        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(0);

        return { source, panner, gainNode };
    }

    updateListenerPosition(position, forward, up) {
        if (!this.initialized || !this.listener) return;

        // Update listener position
        if (this.listener.positionX) {
            this.listener.positionX.value = position.x;
            this.listener.positionY.value = position.y;
            this.listener.positionZ.value = position.z;

            this.listener.forwardX.value = forward.x;
            this.listener.forwardY.value = forward.y;
            this.listener.forwardZ.value = forward.z;

            this.listener.upX.value = up.x;
            this.listener.upY.value = up.y;
            this.listener.upZ.value = up.z;
        } else {
            // Legacy API
            this.listener.setPosition(position.x, position.y, position.z);
            this.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
        }
    }

    // Footstep sounds based on floor material
    playFootstep(material = 'wood') {
        const soundName = `footstep_${material}`;
        if (this.sounds[soundName]) {
            this.play(soundName, { volume: 0.3 });
        } else {
            this.play('footstep_wood', { volume: 0.3 });
        }
    }

    // Door sounds
    playDoorOpen() {
        this.play('door_open', { volume: 0.5 });
    }

    playDoorClose() {
        this.play('door_close', { volume: 0.4 });
    }

    playDoorLocked() {
        this.play('door_locked', { volume: 0.5 });
    }

    // Reward sounds
    playRewardPickup(isBigReward = false) {
        if (isBigReward) {
            this.play('reward_big', { volume: 0.8 });
        } else {
            this.play('reward_small', { volume: 0.6 });
        }
    }

    // Trap sounds
    playTrapTrigger(trapType) {
        this.play('trap_trigger', { volume: 0.6 });

        if (trapType === 'freeze') {
            this.play('trap_freeze', { volume: 0.5 });
        } else if (trapType === 'teleport_start' || trapType === 'random_teleport') {
            this.play('trap_teleport', { volume: 0.6 });
        }
    }

    // Portal sounds
    playPortalUse() {
        this.play('portal_use', { volume: 0.7 });
    }

    // Start ambient sound based on room type
    startAmbient(roomType = 'default') {
        const soundName = `ambient_${roomType}`;
        const actualSound = this.sounds[soundName] ? soundName : 'ambient_default';

        if (this.currentAmbient) {
            // Fade out current ambient
            if (this.ambientSounds[this.currentAmbient]) {
                const current = this.ambientSounds[this.currentAmbient];
                this.fadeOut(current.gainNode, 1);
                setTimeout(() => {
                    if (current.source) {
                        current.source.stop();
                    }
                }, 1000);
            }
        }

        // Start new ambient
        const ambient = this.play(actualSound, { loop: true, volume: 0.15 });
        if (ambient) {
            this.ambientSounds[actualSound] = ambient;
            this.currentAmbient = actualSound;
            this.fadeIn(ambient.gainNode, 0.15, 2);
        }
    }

    stopAmbient() {
        if (this.currentAmbient && this.ambientSounds[this.currentAmbient]) {
            const ambient = this.ambientSounds[this.currentAmbient];
            this.fadeOut(ambient.gainNode, 1);
            setTimeout(() => {
                if (ambient.source) {
                    ambient.source.stop();
                }
            }, 1000);
            this.currentAmbient = null;
        }
    }

    fadeIn(gainNode, targetVolume, duration) {
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + duration);
    }

    fadeOut(gainNode, duration) {
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    }

    // UI sounds
    playUIClick() {
        this.play('ui_click', { volume: 0.3 });
    }

    playChatMessage() {
        this.play('chat_message', { volume: 0.4 });
    }

    playNotification() {
        this.play('notification', { volume: 0.5 });
    }

    // Volume controls
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    mute() {
        this.isEnabled = false;
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
    }

    unmute() {
        this.isEnabled = true;
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    toggle() {
        if (this.isEnabled) {
            this.mute();
        } else {
            this.unmute();
        }
        return this.isEnabled;
    }

    // Resume audio context (needed after user interaction)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

// Global sound manager instance
const soundManager = new SoundManager();
