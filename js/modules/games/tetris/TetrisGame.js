// ============================================
// js/modules/games/tetris/TetrisGame.js
// Описание: Классический Тетрис (финальная версия)
// Версия: 2.0.4 - ВСЯ ИНФОРМАЦИЯ ВНУТРИ ПОЛЯ + 4 КНОПКИ
// ============================================

class TetrisGame {
    constructor() {
        this.container = null;
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.highScore = 0;
        this.animationId = null;
        this.dropInterval = 1000;
        this.lastDropTime = 0;
        
        // Игровое поле
        this.cols = 10;
        this.rows = 20;
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.ghostRow = 0;
        
        // Статистика
        this.totalGames = 0;
        this.totalLines = 0;
        this.bestScore = 0;
        this.gamesWon = 0;
        
        // Фигуры
        this.pieces = [
            { shape: [[1, 1, 1, 1]], color: 'I' },
            { shape: [[1, 1], [1, 1]], color: 'O' },
            { shape: [[0, 1, 0], [1, 1, 1]], color: 'T' },
            { shape: [[0, 1, 1], [1, 1, 0]], color: 'S' },
            { shape: [[1, 1, 0], [0, 1, 1]], color: 'Z' },
            { shape: [[1, 0, 0], [1, 1, 1]], color: 'J' },
            { shape: [[0, 0, 1], [1, 1, 1]], color: 'L' }
        ];
        
        // Управление
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isTouching = false;
        
        // Достижения
        this.achievements = {
            firstGame: false,
            line10: false,
            line50: false,
            line100: false,
            score1000: false,
            score5000: false,
            level5: false,
            level10: false,
            tetris: false,
            perfectClear: false
        };
        
        // Бинды
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this._gameLoop = this._gameLoop.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================

    init(container) {
        this.container = container;
        this._loadStats();
        this._initBoard();
        this._spawnPiece();
        this._spawnNextPiece();
        this._render();
        this._setupControls();
        
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isRunning = false;
        this.isPaused = false;
        
        console.log('🧩 Тетрис v2.0.4 инициализирован');
    }

    // ==========================================
    // СТАТИСТИКА
    // ==========================================

    _loadStats() {
        const store = window.tasksStore;
        if (!store) return;
        
        this.highScore = store.get('tetris_high_score') || 0;
        this.totalGames = store.get('tetris_total_games') || 0;
        this.totalLines = store.get('tetris_total_lines') || 0;
        this.bestScore = store.get('tetris_best_score') || 0;
        this.gamesWon = store.get('tetris_games_won') || 0;
        
        const savedAchievements = store.get('tetris_achievements');
        if (savedAchievements) {
            this.achievements = { ...this.achievements, ...savedAchievements };
        }
    }

    _saveStats() {
        const store = window.tasksStore;
        if (!store) return;
        
        store.set('tetris_high_score', this.highScore);
        store.set('tetris_total_games', this.totalGames);
        store.set('tetris_total_lines', this.totalLines);
        store.set('tetris_best_score', this.bestScore);
        store.set('tetris_games_won', this.gamesWon);
        store.set('tetris_achievements', this.achievements);
    }

    // ==========================================
    // УПРАВЛЕНИЕ
    // ==========================================

    start() {
        if (this.isRunning) return;
        if (this.gameOver) {
            this._resetGame();
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastDropTime = performance.now();
        this.totalGames++;
        this._saveStats();
        this._gameLoop();
        
        console.log('▶️ Тетрис запущен');
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this._updateUI();
        console.log('⏸️ Тетрис на паузе');
    }

    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        this.lastDropTime = performance.now();
        this._gameLoop();
        this._updateUI();
        console.log('▶️ Тетрис продолжен');
    }

    destroy() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this._removeControls();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 Тетрис уничтожен');
    }

    // ==========================================
    // ИГРОВОЙ ЦИКЛ
    // ==========================================

    _gameLoop(timestamp) {
        if (!this.isRunning || this.isPaused || this.gameOver) {
            return;
        }
        
        this.animationId = requestAnimationFrame(this._gameLoop);
        
        const delta = timestamp - this.lastDropTime;
        const interval = Math.max(80, this.dropInterval - (this.level - 1) * 80);
        
        if (delta >= interval) {
            this.lastDropTime = timestamp;
            this._movePieceDown();
        }
    }

    // ==========================================
    // ✅ НОВЫЙ РЕНДЕРИНГ (ВСЁ ВНУТРИ ПОЛЯ!)
    // ==========================================

    _render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="tetris-container" id="tetris-container">
                <!-- Игровое поле (теперь на всю ширину) -->
                <div class="tetris-game-wrapper" style="width:100%; justify-content:center;">
                    <div style="position:relative; display:inline-block;">
                        <!-- Игровое поле -->
                        <div class="tetris-board" id="tetris-board" style="grid-template-columns: repeat(${this.cols}, 1fr);">
                            ${this._renderBoardWithPiece()}
                        </div>
                        
                        <!-- ✅ ВСЯ ИНФОРМАЦИЯ ВНУТРИ ПОЛЯ (верхний правый угол) -->
                        <div id="tetris-hud" style="
                            position: absolute;
                            top: 4px;
                            right: 4px;
                            display: flex;
                            flex-direction: column;
                            gap: 3px;
                            pointer-events: none;
                            z-index: 5;
                        ">
                            <!-- Следующая фигура -->
                            <div style="
                                background: rgba(0,0,0,0.6);
                                backdrop-filter: blur(4px);
                                -webkit-backdrop-filter: blur(4px);
                                border-radius: 6px;
                                padding: 4px 6px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                border: 1px solid rgba(255,255,255,0.08);
                            ">
                                <span style="font-size: 7px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px;">След.</span>
                                <div class="tetris-preview-grid" id="tetris-preview-grid" style="
                                    display: grid;
                                    grid-template-columns: repeat(4, 1fr);
                                    gap: 1px;
                                    padding: 2px;
                                ">
                                    ${this._renderPreview()}
                                </div>
                            </div>
                            
                            <!-- Информация -->
                            <div style="
                                background: rgba(0,0,0,0.6);
                                backdrop-filter: blur(4px);
                                -webkit-backdrop-filter: blur(4px);
                                border-radius: 6px;
                                padding: 4px 8px;
                                border: 1px solid rgba(255,255,255,0.08);
                                display: flex;
                                flex-direction: column;
                                gap: 2px;
                            ">
                                <div style="display:flex; justify-content:space-between; gap:8px; font-size:9px; color:rgba(255,255,255,0.7);">
                                    <span>🏆</span>
                                    <span style="color:#fff; font-weight:700;" id="tetris-score">0</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; gap:8px; font-size:9px; color:rgba(255,255,255,0.7);">
                                    <span>📊</span>
                                    <span style="color:#fff; font-weight:700;" id="tetris-lines">0</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; gap:8px; font-size:9px; color:rgba(255,255,255,0.7);">
                                    <span>📈</span>
                                    <span style="color:#fff; font-weight:700;" id="tetris-level">1</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; gap:8px; font-size:9px; color:rgba(255,255,255,0.7); border-top:1px solid rgba(255,255,255,0.1); padding-top:2px;">
                                    <span>⭐</span>
                                    <span style="color:#ffd700; font-weight:700;" id="tetris-high">${this.highScore}</span>
                                </div>
                            </div>
                            
                            <!-- Кнопки (вертикально) -->
                            <div style="
                                display: flex;
                                flex-direction: column;
                                gap: 3px;
                                pointer-events: auto;
                            ">
                                <button class="tetris-btn" id="tetris-btn-pause" style="
                                    padding: 2px 6px;
                                    min-width: 32px;
                                    min-height: 24px;
                                    border-radius: 4px;
                                    border: 1px solid rgba(255,255,255,0.15);
                                    background: rgba(0,0,0,0.5);
                                    color: #fff;
                                    font-size: 12px;
                                    cursor: pointer;
                                    backdrop-filter: blur(4px);
                                    -webkit-backdrop-filter: blur(4px);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i data-lucide="pause" style="width:14px;height:14px;"></i>
                                </button>
                                <button class="tetris-btn danger" id="tetris-btn-reset" style="
                                    padding: 2px 6px;
                                    min-width: 32px;
                                    min-height: 24px;
                                    border-radius: 4px;
                                    border: 1px solid rgba(255,255,255,0.15);
                                    background: rgba(0,0,0,0.5);
                                    color: #ff6b6b;
                                    font-size: 12px;
                                    cursor: pointer;
                                    backdrop-filter: blur(4px);
                                    -webkit-backdrop-filter: blur(4px);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Оверлей -->
                        <div id="tetris-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;">
                            <div class="tetris-overlay" style="pointer-events:auto;">
                                <h3 id="tetris-overlay-title" style="font-size:18px;">⏸️ Пауза</h3>
                                <div class="score" id="tetris-overlay-score" style="font-size:16px;">0</div>
                                <div class="sub" id="tetris-overlay-sub" style="font-size:12px;"></div>
                                <div class="btn-group" id="tetris-overlay-buttons" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-top:8px;">
                                    <button class="tetris-btn primary" id="tetris-overlay-primary" style="padding:6px 14px; font-size:12px; border-radius:6px;">
                                        <i data-lucide="play" style="width:16px;height:16px;"></i> Продолжить
                                    </button>
                                    <button class="tetris-btn" id="tetris-overlay-secondary" style="padding:6px 14px; font-size:12px; border-radius:6px;">
                                        <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i> Новая игра
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ✅ 4 КНОПКИ УПРАВЛЕНИЯ (под полем) -->
                <div class="tetris-controls" style="display:flex; gap:8px; justify-content:center; margin-top:8px; width:100%; max-width:400px;">
                    <button class="tetris-btn" data-action="left" style="flex:1; min-width:48px; min-height:48px; border-radius:10px; border:1px solid var(--app-border-color-light); background:var(--app-bg-tertiary); color:var(--app-text-primary); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="chevron-left" style="width:26px;height:26px;"></i>
                    </button>
                    <button class="tetris-btn" data-action="rotate" style="flex:1; min-width:48px; min-height:48px; border-radius:10px; border:1px solid var(--app-border-color-light); background:var(--app-bg-tertiary); color:var(--app-text-primary); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="rotate-cw" style="width:26px;height:26px;"></i>
                    </button>
                    <button class="tetris-btn primary" data-action="drop" style="flex:1; min-width:48px; min-height:48px; border-radius:10px; border:none; background:var(--app-gradient-primary); color:var(--app-text-inverse); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="chevrons-down" style="width:26px;height:26px;"></i>
                    </button>
                    <button class="tetris-btn" data-action="right" style="flex:1; min-width:48px; min-height:48px; border-radius:10px; border:1px solid var(--app-border-color-light); background:var(--app-bg-tertiary); color:var(--app-text-primary); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i data-lucide="chevron-right" style="width:26px;height:26px;"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Сохраняем ссылки
        this.boardEl = document.getElementById('tetris-board');
        this.previewEl = document.getElementById('tetris-preview-grid');
        this.scoreEl = document.getElementById('tetris-score');
        this.linesEl = document.getElementById('tetris-lines');
        this.levelEl = document.getElementById('tetris-level');
        this.highEl = document.getElementById('tetris-high');
        this.overlayEl = document.getElementById('tetris-overlay');
        this.pauseBtn = document.getElementById('tetris-btn-pause');
        this.resetBtn = document.getElementById('tetris-btn-reset');
        
        // Создаем Lucide иконки
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
        
        // Привязываем кнопки
        this._bindButtons();
        
        // Обновляем UI
        this._updateUI();
    }

    // ==========================================
    // РЕНДЕР ДОСКИ С ФИГУРОЙ
    // ==========================================

    _renderBoardWithPiece() {
        const displayBoard = this.board.map(row => [...row]);
        
        // Гостинг (тень)
        if (this.currentPiece && this.ghostRow !== null) {
            const { shape, col, color } = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const boardRow = this.ghostRow + r;
                        const boardCol = col + c;
                        if (boardRow >= 0 && boardRow < this.rows && boardCol >= 0 && boardCol < this.cols) {
                            if (!displayBoard[boardRow][boardCol]) {
                                displayBoard[boardRow][boardCol] = color + ' ghost';
                            }
                        }
                    }
                }
            }
        }
        
        // Текущая фигура
        if (this.currentPiece) {
            const { shape, row, col, color } = this.currentPiece;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        const boardRow = row + r;
                        const boardCol = col + c;
                        if (boardRow >= 0 && boardRow < this.rows && boardCol >= 0 && boardCol < this.cols) {
                            displayBoard[boardRow][boardCol] = color;
                        }
                    }
                }
            }
        }
        
        let html = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const value = displayBoard[r][c] || '';
                const classes = value ? `tetris-cell ${value}` : 'tetris-cell';
                html += `<div class="${classes}"></div>`;
            }
        }
        return html;
    }

    // ==========================================
    // РЕНДЕР СЛЕДУЮЩЕЙ ФИГУРЫ
    // ==========================================

    _renderPreview() {
        if (!this.nextPiece || !this.nextPiece.shape || this.nextPiece.shape.length === 0) {
            return Array(16).fill('').map(() => 
                `<div style="width:10px;height:10px;background:rgba(255,255,255,0.04);border-radius:1px;"></div>`
            ).join('');
        }
        
        const shape = this.nextPiece.shape;
        const color = this.nextPiece.color;
        const flat = [];
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (r < shape.length && c < shape[0].length && shape[r] && shape[r][c]) {
                    flat.push(`<div style="width:10px;height:10px;background:${this._getColor(color)};border-radius:1px;"></div>`);
                } else {
                    flat.push(`<div style="width:10px;height:10px;background:rgba(255,255,255,0.04);border-radius:1px;"></div>`);
                }
            }
        }
        
        return flat.join('');
    }

    _getColor(color) {
        const colors = {
            'I': '#00f0f0',
            'O': '#f0f000',
            'T': '#a000f0',
            'S': '#00f000',
            'Z': '#f00000',
            'J': '#0000f0',
            'L': '#f0a000'
        };
        return colors[color] || '#ffffff';
    }

    // ==========================================
    // ОБНОВЛЕНИЕ UI
    // ==========================================

    _updateUI() {
        if (!this.boardEl) return;
        
        this.boardEl.innerHTML = this._renderBoardWithPiece();
        
        if (this.scoreEl) this.scoreEl.textContent = this.score;
        if (this.linesEl) this.linesEl.textContent = this.lines;
        if (this.levelEl) this.levelEl.textContent = this.level;
        if (this.highEl) this.highEl.textContent = this.highScore;
        
        if (this.previewEl) {
            this.previewEl.innerHTML = this._renderPreview();
        }
        
        if (this.pauseBtn) {
            this.pauseBtn.innerHTML = this.isPaused 
                ? '<i data-lucide="play" style="width:14px;height:14px;"></i>'
                : '<i data-lucide="pause" style="width:14px;height:14px;"></i>';
            setTimeout(() => {
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 50);
        }
        
        this._updateOverlay();
    }

    _updateOverlay() {
        if (!this.overlayEl) return;
        
        if (this.isPaused || this.gameOver) {
            this.overlayEl.style.display = 'block';
            const title = document.getElementById('tetris-overlay-title');
            const score = document.getElementById('tetris-overlay-score');
            const sub = document.getElementById('tetris-overlay-sub');
            const primary = document.getElementById('tetris-overlay-primary');
            const secondary = document.getElementById('tetris-overlay-secondary');
            
            if (this.gameOver) {
                if (title) title.textContent = '💀 Game Over';
                if (score) score.textContent = `${this.score} очков`;
                if (sub) {
                    const isNewRecord = this.score > this.highScore;
                    sub.textContent = isNewRecord ? '🏆 Новый рекорд!' : `Рекорд: ${this.highScore}`;
                }
                if (primary) {
                    primary.innerHTML = '<i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i> Играть снова';
                    primary.onclick = () => {
                        this._resetGame();
                        this.start();
                    };
                }
                if (secondary) {
                    secondary.innerHTML = '<i data-lucide="home" style="width:16px;height:16px;"></i> Выйти';
                    secondary.onclick = () => {
                        if (window.gamesModule) {
                            window.gamesModule.closeGame();
                        }
                    };
                }
            } else if (this.isPaused) {
                if (title) title.textContent = '⏸️ Пауза';
                if (score) score.textContent = `${this.score} очков`;
                if (sub) sub.textContent = '';
                if (primary) {
                    primary.innerHTML = '<i data-lucide="play" style="width:16px;height:16px;"></i> Продолжить';
                    primary.onclick = () => this.resume();
                }
                if (secondary) {
                    secondary.innerHTML = '<i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i> Новая игра';
                    secondary.onclick = () => {
                        this._resetGame();
                        this.start();
                    };
                }
            }
            
            setTimeout(() => {
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 50);
        } else {
            this.overlayEl.style.display = 'none';
        }
    }

    // ==========================================
    // ЛОГИКА ИГРЫ
    // ==========================================

    _initBoard() {
        this.board = [];
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = new Array(this.cols).fill('');
        }
    }

    _getRandomPiece() {
        const index = Math.floor(Math.random() * this.pieces.length);
        const piece = this.pieces[index];
        return {
            shape: piece.shape.map(row => [...row]),
            color: piece.color
        };
    }

    _spawnPiece() {
        if (this.nextPiece) {
            this.currentPiece = {
                shape: this.nextPiece.shape.map(row => [...row]),
                color: this.nextPiece.color,
                row: 0,
                col: Math.floor((this.cols - this.nextPiece.shape[0].length) / 2)
            };
        } else {
            const piece = this._getRandomPiece();
            this.currentPiece = {
                shape: piece.shape.map(row => [...row]),
                color: piece.color,
                row: 0,
                col: Math.floor((this.cols - piece.shape[0].length) / 2)
            };
        }
        
        this.nextPiece = this._getRandomPiece();
        this.ghostRow = this._getGhostRow();
        
        if (this._collision(this.currentPiece.shape, this.currentPiece.row, this.currentPiece.col)) {
            this.gameOver = true;
            this.isRunning = false;
            this._checkHighScore();
            this._updateUI();
        }
    }

    _spawnNextPiece() {
        this.nextPiece = this._getRandomPiece();
    }

    _collision(shape, row, col) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardRow = row + r;
                    const boardCol = col + c;
                    if (boardRow >= this.rows || boardCol < 0 || boardCol >= this.cols || boardRow < 0) {
                        return true;
                    }
                    if (boardRow >= 0 && this.board[boardRow][boardCol]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _lockPiece() {
        const { shape, row, col, color } = this.currentPiece;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardRow = row + r;
                    const boardCol = col + c;
                    if (boardRow >= 0 && boardRow < this.rows) {
                        this.board[boardRow][boardCol] = color;
                    }
                }
            }
        }
        
        this._clearLines();
        this._spawnPiece();
        this._updateUI();
    }

    _clearLines() {
        let cleared = 0;
        let clearedRows = [];
        
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== '')) {
                clearedRows.push(r);
                cleared++;
            }
        }
        
        if (cleared > 0) {
            if (cleared === 4) this._unlockAchievement('tetris');
            if (cleared === this.rows) this._unlockAchievement('perfectClear');
            
            const cells = this.boardEl.querySelectorAll('.tetris-cell');
            for (const row of clearedRows) {
                for (let c = 0; c < this.cols; c++) {
                    const idx = row * this.cols + c;
                    if (cells[idx]) {
                        cells[idx].classList.add('flash');
                    }
                }
            }
            
            setTimeout(() => {
                for (const row of clearedRows.sort((a, b) => b - a)) {
                    this.board.splice(row, 1);
                    this.board.unshift(new Array(this.cols).fill(''));
                }
                
                const points = [0, 100, 300, 500, 800];
                const earned = points[Math.min(cleared, 4)] * this.level;
                this.score += earned;
                this.lines += cleared;
                this.totalLines += cleared;
                this.level = Math.floor(this.lines / 10) + 1;
                
                if (this.lines >= 10) this._unlockAchievement('line10');
                if (this.lines >= 50) this._unlockAchievement('line50');
                if (this.lines >= 100) this._unlockAchievement('line100');
                if (this.score >= 1000) this._unlockAchievement('score1000');
                if (this.score >= 5000) this._unlockAchievement('score5000');
                if (this.level >= 5) this._unlockAchievement('level5');
                if (this.level >= 10) this._unlockAchievement('level10');
                
                this._checkHighScore();
                this._updateUI();
            }, 300);
        }
    }

    // ==========================================
    // ДВИЖЕНИЯ ФИГУР
    // ==========================================

    _movePieceDown() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row + 1, col)) {
            this.currentPiece.row++;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        } else {
            this._lockPiece();
            this._updateUI();
        }
    }

    _movePieceLeft() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col - 1)) {
            this.currentPiece.col--;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _movePieceRight() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col + 1)) {
            this.currentPiece.col++;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _rotatePiece() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        
        const shape = this.currentPiece.shape;
        const rotated = shape[0].map((val, index) => 
            shape.map(row => row[index]).reverse()
        );
        
        let offset = 0;
        const maxOffset = 2;
        let newCol = this.currentPiece.col;
        
        while (offset <= maxOffset) {
            if (!this._collision(rotated, this.currentPiece.row, newCol + offset)) {
                this.currentPiece.shape = rotated;
                this.currentPiece.col = newCol + offset;
                this.ghostRow = this._getGhostRow();
                this._updateUI();
                return;
            }
            if (!this._collision(rotated, this.currentPiece.row, newCol - offset)) {
                this.currentPiece.shape = rotated;
                this.currentPiece.col = newCol - offset;
                this.ghostRow = this._getGhostRow();
                this._updateUI();
                return;
            }
            offset++;
        }
    }

    _hardDrop() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        
        let dropDistance = 0;
        while (!this._collision(
            this.currentPiece.shape,
            this.currentPiece.row + dropDistance + 1,
            this.currentPiece.col
        )) {
            dropDistance++;
        }
        this.currentPiece.row += dropDistance;
        this._lockPiece();
        this._updateUI();
    }

    _getGhostRow() {
        if (!this.currentPiece) return 0;
        let row = this.currentPiece.row;
        while (!this._collision(
            this.currentPiece.shape,
            row + 1,
            this.currentPiece.col
        )) {
            row++;
        }
        return row;
    }

    // ==========================================
    // ДОСТИЖЕНИЯ
    // ==========================================

    _unlockAchievement(id) {
        if (this.achievements[id]) return;
        
        this.achievements[id] = true;
        this._saveStats();
        
        const rewards = {
            firstGame: 10,
            line10: 15,
            line50: 30,
            line100: 50,
            score1000: 20,
            score5000: 40,
            level5: 25,
            level10: 45,
            tetris: 35,
            perfectClear: 60
        };
        
        const reward = rewards[id] || 10;
        const names = {
            firstGame: '🏁 Первая игра',
            line10: '📊 10 линий',
            line50: '📊 50 линий',
            line100: '📊 100 линий',
            score1000: '🏆 1000 очков',
            score5000: '🏆 5000 очков',
            level5: '📈 Уровень 5',
            level10: '📈 Уровень 10',
            tetris: '🧩 TETRIS!',
            perfectClear: '✨ Perfect Clear!'
        };
        
        if (window.tasksStore) {
            window.tasksStore.addBalance(reward, `🏆 Достижение: ${names[id]}`);
        }
        
        if (window.uiRenderer) {
            window.uiRenderer.showToast(`🏆 ${names[id]}! +${reward} 🪙`, 'success', 2500);
        }
        
        console.log(`🏆 Достижение разблокировано: ${names[id]}`);
    }

    // ==========================================
    // РЕКОРДЫ
    // ==========================================

    _checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this._saveStats();
            
            if (window.tasksStore) {
                window.tasksStore.addBalance(30, '🏆 Новый рекорд в Тетрисе!');
            }
            
            if (window.uiRenderer) {
                window.uiRenderer.showToast('🏆 Новый рекорд! +30 🪙', 'success', 2000);
            }
        }
    }

    // ==========================================
    // СБРОС
    // ==========================================

    _resetGame() {
        if (this.lines > 0) this.totalLines += this.lines;
        if (this.score > this.bestScore) this.bestScore = this.score;
        if (this.gameOver && this.lines > 0) this.gamesWon++;
        this._saveStats();
        
        this._initBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.overlayEl) {
            this.overlayEl.style.display = 'none';
        }
        
        this._spawnPiece();
        this._spawnNextPiece();
        this._updateUI();
        
        console.log('🔄 Тетрис сброшен');
    }

    // ==========================================
    // ✅ ИСПРАВЛЕНЫ КНОПКИ УПРАВЛЕНИЯ (4 штуки)
    // ==========================================

    _bindButtons() {
        // ✅ 4 кнопки: влево, поворот, хард-дроп, вправо
        const actionMap = {
            'left': () => this._movePieceLeft(),
            'rotate': () => this._rotatePiece(),
            'drop': () => this._hardDrop(),
            'right': () => this._movePieceRight()
        };
        
        document.querySelectorAll('.tetris-btn[data-action]').forEach(btn => {
            const action = btn.dataset.action;
            const handler = actionMap[action];
            
            if (handler) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    handler();
                };
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                });
            }
        });
        
        // Пауза
        if (this.pauseBtn) {
            this.pauseBtn.onclick = () => {
                if (this.gameOver) return;
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
                this._updateUI();
            };
        }
        
        // Сброс
        if (this.resetBtn) {
            this.resetBtn.onclick = () => {
                if (window.tg?.showConfirm) {
                    window.tg.showConfirm('Начать новую игру?', (ok) => {
                        if (ok) {
                            this._resetGame();
                            this.start();
                        }
                    });
                } else if (confirm('Начать новую игру?')) {
                    this._resetGame();
                    this.start();
                }
            };
        }
    }

    // ==========================================
    // КЛАВИАТУРА
    // ==========================================

    _setupControls() {
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        
        // Жесты ТОЛЬКО на игровом поле
        const board = document.getElementById('tetris-board');
        if (board) {
            board.addEventListener('touchstart', this._handleTouchStart, { passive: true });
            board.addEventListener('touchmove', this._handleTouchMove, { passive: true });
            board.addEventListener('touchend', this._handleTouchEnd, { passive: true });
        }
        
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _removeControls() {
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        
        const board = document.getElementById('tetris-board');
        if (board) {
            board.removeEventListener('touchstart', this._handleTouchStart);
            board.removeEventListener('touchmove', this._handleTouchMove);
            board.removeEventListener('touchend', this._handleTouchEnd);
        }
        
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _handleKeyDown(e) {
        if (!this.isRunning || this.gameOver) return;
        
        const key = e.key;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(key)) {
            e.preventDefault();
        }
        
        switch(key) {
            case 'ArrowLeft': this._movePieceLeft(); break;
            case 'ArrowRight': this._movePieceRight(); break;
            case 'ArrowUp': this._rotatePiece(); break;
            case ' ':
            case 'Space': this._hardDrop(); break;
            case 'p':
            case 'P': 
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
                this._updateUI();
                break;
        }
    }

    _handleKeyUp(e) {}

    // ==========================================
    // ✅ ЖЕСТЫ НА ПОЛЕ (свайп вниз = хард-дроп!)
    // ==========================================

    _handleTouchStart(e) {
        if (!this.isRunning || this.gameOver || this.isPaused) return;
        if (!e.target.closest('.tetris-board')) return;
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.isTouching = true;
    }

    _handleTouchMove(e) {
        e.preventDefault();
        if (!this.isTouching || !this.isRunning || this.gameOver || this.isPaused) return;
        if (!e.target.closest('.tetris-board')) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        if (Math.abs(deltaX) > 20) {
            if (deltaX > 0) {
                this._movePieceRight();
            } else {
                this._movePieceLeft();
            }
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }
    }

    _handleTouchEnd(e) {
        if (!this.isTouching) return;
        this.isTouching = false;
        
        if (!this.isRunning || this.gameOver || this.isPaused) return;
        if (!e.target.closest('.tetris-board')) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const elapsed = Date.now() - this.touchStartTime;
        
        // ✅ Свайп вниз = хард-дроп!
        if (deltaY > 40 && Math.abs(deltaY) > Math.abs(deltaX)) {
            this._hardDrop();
            return;
        }
        
        // Свайп вверх = поворот
        if (deltaY < -40 && Math.abs(deltaY) > Math.abs(deltaX)) {
            this._rotatePiece();
            return;
        }
        
        // Тап = поворот (для удобства)
        if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && elapsed < 300) {
            this._rotatePiece();
        }
    }

    // ==========================================
    // ВИДИМОСТЬ ВКЛАДКИ
    // ==========================================

    _handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused && !this.gameOver) {
                this.pause();
                this._updateUI();
            }
        }
    }

    // ==========================================
    // ПОЛУЧЕНИЕ СОСТОЯНИЯ
    // ==========================================

    getScore() {
        return this.score;
    }

    getState() {
        return {
            score: this.score,
            lines: this.lines,
            level: this.level,
            highScore: this.highScore,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            gameOver: this.gameOver,
            totalGames: this.totalGames,
            totalLines: this.totalLines,
            bestScore: this.bestScore,
            gamesWon: this.gamesWon,
            achievements: this.achievements
        };
    }

    setSafeArea(top, bottom) {}
}

// Экспортируем в глобальный объект
window.TetrisGame = TetrisGame;

console.log('✅ TetrisGame v2.0.4 загружен (финальная версия)');
