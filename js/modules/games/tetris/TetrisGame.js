// ============================================
// js/modules/games/tetris/TetrisGame.js
// Описание: Классический Тетрис (финальная версия)
// Версия: 2.0.9 - КНОПКИ ВНУТРИ ИГРОВОГО ПОЛЯ
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
        
        // Флаг для анимации удаления
        this._isClearingLines = false;
        
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
        this._isPausedByVisibility = false;
        
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
        this._isClearingLines = false;
        
        console.log('🧩 Тетрис v2.0.9 инициализирован');
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
        if (this._isClearingLines) return;
        
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
    // РЕНДЕРИНГ
    // ==========================================

    _render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="tetris-container" id="tetris-container" style="
                display:flex; 
                flex-direction:column; 
                align-items:center; 
                gap:8px; 
                width:100%; 
                height:100%; 
                padding:8px; 
                box-sizing:border-box; 
                justify-content:center;
                padding-top: calc(var(--tg-content-safe-area-top, 0px) + 8px);
                padding-bottom: calc(var(--tg-safe-bottom, 0px) + 8px);
            ">
                <div class="tetris-game-wrapper" style="
                    display:flex; 
                    flex-direction:row; 
                    align-items:flex-start; 
                    justify-content:center; 
                    gap:12px; 
                    width:100%; 
                    max-width:500px; 
                    position:relative;
                ">
                    <!-- ✅ Игровое поле (теперь с кнопками ВНУТРИ) -->
                    <div class="tetris-board" id="tetris-board" style="
                        display:grid; 
                        grid-template-columns:repeat(10, 1fr); 
                        gap:1px; 
                        padding:3px; 
                        background:rgba(0,0,0,0.4); 
                        border:2px solid var(--app-border-color); 
                        border-radius:8px;
                        position:relative;
                    ">
                        ${this._renderBoardWithPiece()}
                        
                        <!-- ✅ КНОПКИ УПРАВЛЕНИЯ ВНУТРИ ПОЛЯ -->
                        <div class="tetris-controls" style="
                            position:absolute;
                            bottom:4px;
                            left:4px;
                            right:4px;
                            display:flex;
                            gap:4px;
                            justify-content:center;
                            background:rgba(0,0,0,0.5);
                            backdrop-filter:blur(6px);
                            -webkit-backdrop-filter:blur(6px);
                            border-radius:6px;
                            padding:4px 6px;
                            z-index:3;
                            pointer-events:auto;
                            border:1px solid rgba(255,255,255,0.06);
                        ">
                            <button class="tetris-btn" data-action="left" style="
                                flex:1;
                                max-width:44px;
                                min-width:36px;
                                min-height:36px;
                                border-radius:6px;
                                border:none;
                                background:rgba(255,255,255,0.06);
                                color:rgba(255,255,255,0.8);
                                font-size:16px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                touch-action:manipulation;
                                -webkit-tap-highlight-color:transparent;
                                padding:4px;
                            ">
                                <i data-lucide="chevron-left" style="width:20px;height:20px;"></i>
                            </button>
                            <button class="tetris-btn" data-action="rotate" style="
                                flex:1;
                                max-width:44px;
                                min-width:36px;
                                min-height:36px;
                                border-radius:6px;
                                border:none;
                                background:rgba(255,255,255,0.06);
                                color:rgba(255,255,255,0.8);
                                font-size:16px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                touch-action:manipulation;
                                -webkit-tap-highlight-color:transparent;
                                padding:4px;
                            ">
                                <i data-lucide="rotate-cw" style="width:20px;height:20px;"></i>
                            </button>
                            <button class="tetris-btn" data-action="down" style="
                                flex:1;
                                max-width:44px;
                                min-width:36px;
                                min-height:36px;
                                border-radius:6px;
                                border:none;
                                background:rgba(255,255,255,0.06);
                                color:rgba(255,255,255,0.8);
                                font-size:16px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                touch-action:manipulation;
                                -webkit-tap-highlight-color:transparent;
                                padding:4px;
                            ">
                                <i data-lucide="chevron-down" style="width:20px;height:20px;"></i>
                            </button>
                            <button class="tetris-btn primary" data-action="drop" style="
                                flex:1;
                                max-width:44px;
                                min-width:36px;
                                min-height:36px;
                                border-radius:6px;
                                border:none;
                                background:var(--app-gradient-primary);
                                color:#fff;
                                font-size:16px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                touch-action:manipulation;
                                -webkit-tap-highlight-color:transparent;
                                padding:4px;
                            ">
                                <i data-lucide="chevrons-down" style="width:20px;height:20px;"></i>
                            </button>
                            <button class="tetris-btn" data-action="right" style="
                                flex:1;
                                max-width:44px;
                                min-width:36px;
                                min-height:36px;
                                border-radius:6px;
                                border:none;
                                background:rgba(255,255,255,0.06);
                                color:rgba(255,255,255,0.8);
                                font-size:16px;
                                cursor:pointer;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                touch-action:manipulation;
                                -webkit-tap-highlight-color:transparent;
                                padding:4px;
                            ">
                                <i data-lucide="chevron-right" style="width:20px;height:20px;"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Правая панель (НЕ ТРОГАЕМ) -->
                    <div class="tetris-side-panel" style="
                        display:flex; 
                        flex-direction:column; 
                        gap:8px; 
                        flex-shrink:0; 
                        min-width:80px; 
                        max-width:110px; 
                        padding-top:2px;
                    ">
                        <!-- Следующая фигура -->
                        <div style="
                            background:rgba(0,0,0,0.3); 
                            border:1px solid var(--app-border-color-light); 
                            border-radius:8px; 
                            padding:6px; 
                            display:flex; 
                            flex-direction:column; 
                            align-items:center; 
                            gap:2px;
                        ">
                            <span style="font-size:9px; color:var(--app-text-tertiary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">След.</span>
                            <div id="tetris-preview-grid" style="
                                display:grid; 
                                grid-template-columns:repeat(4, 1fr); 
                                gap:1px; 
                                padding:2px; 
                                place-items:center;
                            ">
                                ${this._renderPreview()}
                            </div>
                        </div>
                        
                        <!-- Информация -->
                        <div style="
                            display:flex; 
                            flex-direction:column; 
                            gap:3px; 
                            background:rgba(0,0,0,0.2); 
                            border-radius:8px; 
                            padding:6px 8px; 
                            border:1px solid var(--app-border-color-light);
                        ">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                                <i data-lucide="trophy" style="width:12px;height:12px;color:#ffd700;"></i>
                                <span style="color:#fff; font-weight:700; font-size:12px;" id="tetris-score">0</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                                <i data-lucide="align-justify" style="width:12px;height:12px;color:#4fc3f7;"></i>
                                <span style="color:#fff; font-weight:700; font-size:12px;" id="tetris-lines">0</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                                <i data-lucide="trending-up" style="width:12px;height:12px;color:#81c784;"></i>
                                <span style="color:#fff; font-weight:700; font-size:12px;" id="tetris-level">1</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; border-top:1px solid var(--app-border-color-light); padding-top:3px;">
                                <i data-lucide="star" style="width:12px;height:12px;color:#ffd700;"></i>
                                <span style="color:#ffd700; font-weight:700; font-size:12px;" id="tetris-high">${this.highScore}</span>
                            </div>
                        </div>
                        
                        <!-- Кнопки пауза/сброс -->
                        <div style="display:flex; flex-direction:column; gap:3px;">
                            <button class="tetris-btn" id="tetris-btn-pause" style="
                                padding:4px 8px;
                                min-width:32px;
                                min-height:28px;
                                border-radius:6px;
                                border:1px solid var(--app-border-color-light);
                                background:rgba(0,0,0,0.3);
                                color:#fff;
                                font-size:12px;
                                cursor:pointer;
                                backdrop-filter:blur(4px);
                                -webkit-backdrop-filter:blur(4px);
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            ">
                                <i data-lucide="pause" style="width:16px;height:16px;"></i>
                            </button>
                            <button class="tetris-btn" id="tetris-btn-reset" style="
                                padding:4px 8px;
                                min-width:32px;
                                min-height:28px;
                                border-radius:6px;
                                border:1px solid var(--app-border-color-light);
                                background:rgba(0,0,0,0.3);
                                color:#ff6b6b;
                                font-size:12px;
                                cursor:pointer;
                                backdrop-filter:blur(4px);
                                -webkit-backdrop-filter:blur(4px);
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            ">
                                <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Оверлей -->
                    <div id="tetris-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;">
                        <div class="tetris-overlay" style="
                            pointer-events:auto; 
                            display:flex; 
                            flex-direction:column; 
                            align-items:center; 
                            justify-content:center; 
                            width:100%; 
                            height:100%; 
                            background:rgba(0,0,0,0.75); 
                            backdrop-filter:blur(6px); 
                            -webkit-backdrop-filter:blur(6px); 
                            border-radius:8px; 
                            padding:20px; 
                            text-align:center;
                        ">
                            <h3 id="tetris-overlay-title" style="color:var(--app-text-primary); font-size:20px; margin:0 0 4px 0;">⏸️ Пауза</h3>
                            <div class="score" id="tetris-overlay-score" style="color:var(--app-accent-primary); font-size:18px; font-weight:700; margin:4px 0;">0</div>
                            <div class="sub" id="tetris-overlay-sub" style="color:var(--app-text-tertiary); font-size:13px; margin:4px 0 12px 0;"></div>
                            <div class="btn-group" id="tetris-overlay-buttons" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
                                <button class="tetris-btn primary" id="tetris-overlay-primary" style="
                                    padding:8px 16px; 
                                    border-radius:8px; 
                                    border:none; 
                                    background:var(--app-gradient-primary); 
                                    color:var(--app-text-inverse); 
                                    font-weight:600; 
                                    font-size:13px; 
                                    cursor:pointer; 
                                    display:flex; 
                                    align-items:center; 
                                    gap:6px;
                                ">
                                    <i data-lucide="play" style="width:18px;height:18px;"></i> Продолжить
                                </button>
                                <button class="tetris-btn" id="tetris-overlay-secondary" style="
                                    padding:8px 16px; 
                                    border-radius:8px; 
                                    border:1px solid var(--app-border-color-light); 
                                    background:var(--app-bg-tertiary); 
                                    color:var(--app-text-primary); 
                                    font-size:13px; 
                                    cursor:pointer; 
                                    display:flex; 
                                    align-items:center; 
                                    gap:6px;
                                ">
                                    <i data-lucide="rotate-ccw" style="width:18px;height:18px;"></i> Новая игра
                                </button>
                            </div>
                        </div>
                    </div>
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
        if (this.currentPiece && this.ghostRow !== null && !this._isClearingLines) {
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
        if (this.currentPiece && !this._isClearingLines) {
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
                `<div style="width:12px;height:12px;background:rgba(255,255,255,0.04);border-radius:1px;"></div>`
            ).join('');
        }
        
        const shape = this.nextPiece.shape;
        const color = this.nextPiece.color;
        
        const rows = shape.length;
        const cols = shape[0].length;
        const offsetY = Math.floor((4 - rows) / 2);
        const offsetX = Math.floor((4 - cols) / 2);
        
        const flat = [];
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const shapeR = r - offsetY;
                const shapeC = c - offsetX;
                
                if (shapeR >= 0 && shapeR < rows && shapeC >= 0 && shapeC < cols && shape[shapeR] && shape[shapeR][shapeC]) {
                    flat.push(`<div style="width:12px;height:12px;background:${this._getColor(color)};border-radius:1px;"></div>`);
                } else {
                    flat.push(`<div style="width:12px;height:12px;background:rgba(255,255,255,0.04);border-radius:1px;"></div>`);
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
        
        if (this._isClearingLines) return;
        
        // Обновляем только поле (кнопки внутри не пересоздаются)
        this.boardEl.innerHTML = this._renderBoardWithPiece() + this._renderControls();
        
        if (this.scoreEl) this.scoreEl.textContent = this.score;
        if (this.linesEl) this.linesEl.textContent = this.lines;
        if (this.levelEl) this.levelEl.textContent = this.level;
        if (this.highEl) this.highEl.textContent = this.highScore;
        
        if (this.previewEl) {
            this.previewEl.innerHTML = this._renderPreview();
        }
        
        // Обновляем иконку паузы (без пересоздания)
        if (this.pauseBtn) {
            const icon = this.pauseBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', this.isPaused ? 'play' : 'pause');
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
        
        this._updateOverlay();
        
        // Перепривязываем кнопки (после обновления DOM)
        this._bindButtons();
    }

    // ==========================================
    // ✅ РЕНДЕР КНОПОК УПРАВЛЕНИЯ (внутри поля)
    // ==========================================

    _renderControls() {
        return `
            <div class="tetris-controls" style="
                position:absolute;
                bottom:4px;
                left:4px;
                right:4px;
                display:flex;
                gap:4px;
                justify-content:center;
                background:rgba(0,0,0,0.5);
                backdrop-filter:blur(6px);
                -webkit-backdrop-filter:blur(6px);
                border-radius:6px;
                padding:4px 6px;
                z-index:3;
                pointer-events:auto;
                border:1px solid rgba(255,255,255,0.06);
            ">
                <button class="tetris-btn" data-action="left" style="
                    flex:1;
                    max-width:44px;
                    min-width:36px;
                    min-height:36px;
                    border-radius:6px;
                    border:none;
                    background:rgba(255,255,255,0.06);
                    color:rgba(255,255,255,0.8);
                    font-size:16px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    padding:4px;
                ">
                    <i data-lucide="chevron-left" style="width:20px;height:20px;"></i>
                </button>
                <button class="tetris-btn" data-action="rotate" style="
                    flex:1;
                    max-width:44px;
                    min-width:36px;
                    min-height:36px;
                    border-radius:6px;
                    border:none;
                    background:rgba(255,255,255,0.06);
                    color:rgba(255,255,255,0.8);
                    font-size:16px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    padding:4px;
                ">
                    <i data-lucide="rotate-cw" style="width:20px;height:20px;"></i>
                </button>
                <button class="tetris-btn" data-action="down" style="
                    flex:1;
                    max-width:44px;
                    min-width:36px;
                    min-height:36px;
                    border-radius:6px;
                    border:none;
                    background:rgba(255,255,255,0.06);
                    color:rgba(255,255,255,0.8);
                    font-size:16px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    padding:4px;
                ">
                    <i data-lucide="chevron-down" style="width:20px;height:20px;"></i>
                </button>
                <button class="tetris-btn primary" data-action="drop" style="
                    flex:1;
                    max-width:44px;
                    min-width:36px;
                    min-height:36px;
                    border-radius:6px;
                    border:none;
                    background:var(--app-gradient-primary);
                    color:#fff;
                    font-size:16px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    padding:4px;
                ">
                    <i data-lucide="chevrons-down" style="width:20px;height:20px;"></i>
                </button>
                <button class="tetris-btn" data-action="right" style="
                    flex:1;
                    max-width:44px;
                    min-width:36px;
                    min-height:36px;
                    border-radius:6px;
                    border:none;
                    background:rgba(255,255,255,0.06);
                    color:rgba(255,255,255,0.8);
                    font-size:16px;
                    cursor:pointer;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    padding:4px;
                ">
                    <i data-lucide="chevron-right" style="width:20px;height:20px;"></i>
                </button>
            </div>
        `;
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
                    primary.innerHTML = '<i data-lucide="rotate-ccw" style="width:18px;height:18px;"></i> Играть снова';
                    primary.onclick = () => {
                        this._resetGame();
                        this.start();
                    };
                }
                if (secondary) {
                    secondary.innerHTML = '<i data-lucide="home" style="width:18px;height:18px;"></i> Выйти';
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
                    primary.innerHTML = '<i data-lucide="play" style="width:18px;height:18px;"></i> Продолжить';
                    primary.onclick = () => this.resume();
                }
                if (secondary) {
                    secondary.innerHTML = '<i data-lucide="rotate-ccw" style="width:18px;height:18px;"></i> Новая игра';
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
        
        if (!this._isClearingLines) {
            this._spawnPiece();
            this._updateUI();
        }
    }

    // ==========================================
    // УДАЛЕНИЕ ВСЕХ СТРОК
    // ==========================================

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
            this._isClearingLines = true;
            
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
                clearedRows.sort((a, b) => b - a);
                
                for (const row of clearedRows) {
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
                
                this._isClearingLines = false;
                this._spawnPiece();
                this._updateUI();
            }, 250);
        }
    }

    // ==========================================
    // ДВИЖЕНИЯ ФИГУР
    // ==========================================

    _movePieceDown() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        if (this._isClearingLines) return;
        
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
        if (this._isClearingLines) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col - 1)) {
            this.currentPiece.col--;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _movePieceRight() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        if (this._isClearingLines) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col + 1)) {
            this.currentPiece.col++;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _rotatePiece() {
        if (!this.currentPiece || this.gameOver || this.isPaused) return;
        if (this._isClearingLines) return;
        
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
        if (this._isClearingLines) return;
        
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
        this._isClearingLines = false;
        
        if (this.overlayEl) {
            this.overlayEl.style.display = 'none';
        }
        
        this._spawnPiece();
        this._spawnNextPiece();
        this._updateUI();
        
        console.log('🔄 Тетрис сброшен');
    }

    // ==========================================
    // КНОПКИ УПРАВЛЕНИЯ
    // ==========================================

    _bindButtons() {
        const actionMap = {
            'left': () => this._movePieceLeft(),
            'right': () => this._movePieceRight(),
            'rotate': () => this._rotatePiece(),
            'down': () => this._movePieceDown(),
            'drop': () => this._hardDrop()
        };
        
        const buttons = document.querySelectorAll('.tetris-btn[data-action]');
        
        buttons.forEach(btn => {
            const action = btn.dataset.action;
            const handler = actionMap[action];
            
            if (handler) {
                btn.onclick = null;
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handler();
                });
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handler();
                }, { passive: false });
            }
        });
        
        // Пауза
        if (this.pauseBtn) {
            this.pauseBtn.onclick = (e) => {
                e.preventDefault();
                if (this.gameOver) return;
                if (this._isClearingLines) return;
                
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
            this.resetBtn.onclick = (e) => {
                e.preventDefault();
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
        if (this._isClearingLines) return;
        
        const key = e.key;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(key)) {
            e.preventDefault();
        }
        
        switch(key) {
            case 'ArrowLeft': this._movePieceLeft(); break;
            case 'ArrowRight': this._movePieceRight(); break;
            case 'ArrowDown': this._movePieceDown(); break;
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
    // ЖЕСТЫ НА ПОЛЕ
    // ==========================================

    _handleTouchStart(e) {
        if (!this.isRunning || this.gameOver || this.isPaused) return;
        if (this._isClearingLines) return;
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
        if (this._isClearingLines) return;
        if (!e.target.closest('.tetris-board')) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
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
        if (this._isClearingLines) return;
        if (!e.target.closest('.tetris-board')) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const elapsed = Date.now() - this.touchStartTime;
        
        // Свайп вниз = хард-дроп
        if (deltaY > 40 && Math.abs(deltaY) > Math.abs(deltaX)) {
            this._hardDrop();
            return;
        }
        
        // Тап = поворот
        if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15 && elapsed < 300) {
            this._rotatePiece();
        }
    }

    // ==========================================
    // ВИДИМОСТЬ ВКЛАДКИ
    // ==========================================

    _handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused && !this.gameOver && !this._isClearingLines) {
                this._isPausedByVisibility = true;
                this.pause();
                this._updateUI();
            }
        } else {
            if (this._isPausedByVisibility && this.isPaused) {
                this._isPausedByVisibility = false;
                this.resume();
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

console.log('✅ TetrisGame v2.0.9 загружен (кнопки внутри поля)');
