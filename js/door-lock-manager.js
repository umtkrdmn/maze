// Door Lock Manager - Handles door locking system in ad rooms

class DoorLockManager {
    constructor(game) {
        this.game = game;
        this.currentDoorStatus = null;
        this.entryDoor = null;
        this.doorsUnlocked = false;
        this.timerStartTime = null;
        this.timerInterval = null;
        this.cooldownEndTime = null;
        this.currentQuestion = null;

        // Create quiz modal
        this.createQuizModal();
    }

    createQuizModal() {
        // Quiz modal HTML
        const modalHTML = `
            <div id="quiz-modal" class="quiz-modal" style="display: none;">
                <div class="quiz-modal-content">
                    <div class="quiz-header">
                        <h2>🚪 Kapı Kilitli</h2>
                        <p class="quiz-subtitle">Çıkmak için soruyu cevaplayın</p>
                    </div>
                    <div class="quiz-body">
                        <p id="quiz-question" class="quiz-question"></p>
                        <div id="quiz-options" class="quiz-options"></div>
                    </div>
                    <div class="quiz-footer">
                        <div id="quiz-feedback" class="quiz-feedback"></div>
                        <div id="quiz-cooldown" class="quiz-cooldown" style="display: none;">
                            <span>Tekrar deneyebilmek için bekleyin: </span>
                            <span id="cooldown-timer">10</span>s
                        </div>
                    </div>
                </div>
            </div>

            <div id="timer-overlay" class="timer-overlay" style="display: none;">
                <div class="timer-content">
                    <div class="timer-icon">⏱️</div>
                    <div class="timer-text">Kapılar açılıyor...</div>
                    <div id="timer-countdown" class="timer-countdown">10</div>
                </div>
            </div>
        `;

        // Append to body
        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        document.body.appendChild(container);

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            .quiz-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }

            .quiz-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 2px solid #e94560;
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .quiz-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .quiz-header h2 {
                color: #e94560;
                margin: 0;
                font-size: 28px;
            }

            .quiz-subtitle {
                color: #a0a0a0;
                margin: 10px 0 0;
            }

            .quiz-question {
                color: #ffffff;
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }

            .quiz-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .quiz-option {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 15px;
                color: #ffffff;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 16px;
                text-align: left;
            }

            .quiz-option:hover:not(:disabled) {
                background: rgba(233, 69, 96, 0.2);
                border-color: #e94560;
            }

            .quiz-option.selected {
                background: rgba(233, 69, 96, 0.3);
                border-color: #e94560;
            }

            .quiz-option.correct {
                background: rgba(0, 255, 0, 0.2);
                border-color: #00ff00;
            }

            .quiz-option.wrong {
                background: rgba(255, 0, 0, 0.2);
                border-color: #ff0000;
            }

            .quiz-option:disabled {
                cursor: not-allowed;
                opacity: 0.6;
            }

            .quiz-feedback {
                text-align: center;
                font-size: 18px;
                margin-top: 15px;
                min-height: 30px;
            }

            .quiz-feedback.correct {
                color: #00ff00;
            }

            .quiz-feedback.wrong {
                color: #ff0000;
            }

            .quiz-cooldown {
                text-align: center;
                color: #ffaa00;
                font-size: 16px;
                margin-top: 10px;
            }

            #cooldown-timer {
                font-weight: bold;
                font-size: 20px;
            }

            .timer-overlay {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                padding: 15px 25px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 2px solid #00aaff;
                z-index: 9999;
                animation: slideInRight 0.3s ease-out;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .timer-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .timer-icon {
                font-size: 30px;
            }

            .timer-text {
                color: #ffffff;
                font-size: 14px;
            }

            .timer-countdown {
                color: #00aaff;
                font-size: 32px;
                font-weight: bold;
                min-width: 50px;
                text-align: center;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Called when player enters a new room
    async onRoomEnter(room, entryDirection) {
        this.entryDoor = this.getOppositeDirection(entryDirection);
        this.doorsUnlocked = false;
        this.currentDoorStatus = null;

        // Check if room has ads with lock
        if (!room.id) return;

        try {
            const response = await fetch(`/api/room/${room.id}/door-status?entry_door=${this.entryDoor}`);
            if (!response.ok) return;

            const doorStatus = await response.json();
            this.currentDoorStatus = doorStatus;

            // If room has locked ads
            if (doorStatus.has_ads && doorStatus.doors.some(d => d.is_locked)) {
                // Create card readers
                if (this.game.renderer) {
                    this.game.renderer.createCardReadersForRoom(room, doorStatus);
                }

                // Start timer if timer mode
                const lockedDoor = doorStatus.doors.find(d => d.is_locked);
                if (lockedDoor && lockedDoor.lock_type === 'timer') {
                    this.startTimer(lockedDoor.remaining_seconds || 10);
                }
            }
        } catch (error) {
            console.error('Error fetching door status:', error);
        }
    }

    getOppositeDirection(direction) {
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposites[direction] || null;
    }

    // Check if a specific door is locked
    isDoorLocked(direction) {
        if (!this.currentDoorStatus || this.doorsUnlocked) return false;

        // Entry door is always unlocked
        if (direction === this.entryDoor) return false;

        const door = this.currentDoorStatus.doors.find(d => d.direction === direction);
        return door ? door.is_locked : false;
    }

    // Called when player tries to go through a locked door
    async onLockedDoorAttempt(direction) {
        if (!this.currentDoorStatus) return;

        const door = this.currentDoorStatus.doors.find(d => d.direction === direction);
        if (!door || !door.is_locked) return;

        if (door.lock_type === 'quiz' && door.has_quiz) {
            await this.showQuizModal();
        } else if (door.lock_type === 'timer') {
            // Timer already running, just show notification
            if (window.uiManager) {
                uiManager.showNotification('Kapılar kısa süre içinde açılacak...', 'info');
            }
        }
    }

    // Timer mode
    startTimer(seconds) {
        this.timerStartTime = Date.now();
        const overlay = document.getElementById('timer-overlay');
        const countdown = document.getElementById('timer-countdown');

        overlay.style.display = 'block';
        countdown.textContent = seconds;

        let remaining = seconds;
        this.timerInterval = setInterval(() => {
            remaining--;
            countdown.textContent = remaining;

            if (remaining <= 0) {
                this.stopTimer();
                this.unlockAllDoors();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        const overlay = document.getElementById('timer-overlay');
        overlay.style.display = 'none';
    }

    // Quiz mode
    async showQuizModal() {
        const room = this.game.currentRoom;
        if (!room || !room.id) return;

        try {
            const response = await fetch(`/api/room/${room.id}/quiz-question`);
            if (!response.ok) {
                throw new Error('Failed to fetch question');
            }

            const question = await response.json();
            this.currentQuestion = question;

            // Populate modal
            const modal = document.getElementById('quiz-modal');
            const questionEl = document.getElementById('quiz-question');
            const optionsEl = document.getElementById('quiz-options');
            const feedbackEl = document.getElementById('quiz-feedback');
            const cooldownEl = document.getElementById('quiz-cooldown');

            questionEl.textContent = question.question_text;
            optionsEl.innerHTML = '';
            feedbackEl.textContent = '';
            feedbackEl.className = 'quiz-feedback';
            cooldownEl.style.display = 'none';

            // Create option buttons
            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-option';
                btn.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
                btn.onclick = () => this.selectAnswer(index, btn);
                optionsEl.appendChild(btn);
            });

            modal.style.display = 'flex';

            // Exit pointer lock for quiz
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

        } catch (error) {
            console.error('Error showing quiz:', error);
            if (window.uiManager) {
                uiManager.showNotification('Quiz yüklenemedi', 'error');
            }
        }
    }

    async selectAnswer(optionIndex, buttonEl) {
        if (this.cooldownEndTime && Date.now() < this.cooldownEndTime) {
            return; // Still in cooldown
        }

        const room = this.game.currentRoom;
        if (!room || !room.id || !this.currentQuestion) return;

        // Disable all buttons
        const buttons = document.querySelectorAll('.quiz-option');
        buttons.forEach(btn => btn.disabled = true);

        // Highlight selected
        buttonEl.classList.add('selected');

        try {
            const response = await fetch(`/api/room/${room.id}/quiz-answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question_id: this.currentQuestion.question_id,
                    selected_option_index: optionIndex
                })
            });

            const result = await response.json();
            const feedbackEl = document.getElementById('quiz-feedback');

            if (result.correct) {
                // Correct answer
                buttonEl.classList.remove('selected');
                buttonEl.classList.add('correct');
                feedbackEl.textContent = '✅ Doğru! Kapılar açılıyor...';
                feedbackEl.className = 'quiz-feedback correct';

                setTimeout(() => {
                    this.hideQuizModal();
                    this.unlockAllDoors();
                }, 1500);
            } else {
                // Wrong answer
                buttonEl.classList.remove('selected');
                buttonEl.classList.add('wrong');

                // Show correct answer
                buttons[result.correct_option_index].classList.add('correct');

                feedbackEl.textContent = '❌ Yanlış cevap!';
                feedbackEl.className = 'quiz-feedback wrong';

                // Start cooldown
                this.startCooldown(result.cooldown_seconds || 10, buttons);
            }

        } catch (error) {
            console.error('Error checking answer:', error);
            const feedbackEl = document.getElementById('quiz-feedback');
            feedbackEl.textContent = 'Bir hata oluştu';
            feedbackEl.className = 'quiz-feedback wrong';

            // Re-enable buttons
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    startCooldown(seconds, buttons) {
        this.cooldownEndTime = Date.now() + (seconds * 1000);
        const cooldownEl = document.getElementById('quiz-cooldown');
        const timerEl = document.getElementById('cooldown-timer');

        cooldownEl.style.display = 'block';
        timerEl.textContent = seconds;

        const interval = setInterval(() => {
            seconds--;
            timerEl.textContent = seconds;

            if (seconds <= 0) {
                clearInterval(interval);
                cooldownEl.style.display = 'none';
                this.cooldownEndTime = null;

                // Reset and fetch new question
                this.showQuizModal();
            }
        }, 1000);
    }

    hideQuizModal() {
        const modal = document.getElementById('quiz-modal');
        modal.style.display = 'none';
        this.currentQuestion = null;
    }

    unlockAllDoors() {
        this.doorsUnlocked = true;
        this.stopTimer();

        // Update card reader LEDs to green
        if (this.game.renderer && this.currentDoorStatus) {
            this.currentDoorStatus.doors.forEach(door => {
                this.game.renderer.updateCardReaderStatus(door.direction, false);
            });
        }

        // Notification
        if (window.uiManager) {
            uiManager.showNotification('🔓 Kapılar açıldı!', 'success');
        }

        // Play door unlock sound
        if (window.soundManager && soundManager.initialized) {
            soundManager.playDoorOpen();
        }
    }

    // Clean up when leaving room
    onRoomLeave() {
        this.stopTimer();
        this.hideQuizModal();
        this.currentDoorStatus = null;
        this.entryDoor = null;
        this.doorsUnlocked = false;
    }
}

// Export for use in game.js
window.DoorLockManager = DoorLockManager;
