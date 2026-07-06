// ============================================
// js/modules/games/tetris/TetrisGame.js
// Описание: Классический Тетрис
// Версия: 1.0.0
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
        this.interval = null;
        this.dropInterval = 1000;
        this.lastDropTime = 0;
        this.animationId = null;
        
        // Игровое поле
        this.cols = 10;
        this.rows = 20;
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.ghostRow = 0;
        
        // Фигуры
        this.pieces = [
            { // I
                shape: [[1, 1, 1, 1]],
                color: 'I'
            },
            { // O
                shape: [[1, 1], [1, 1]],
                color: 'O'
            },
            { // T
                shape: [[0, 1, 0], [1, 1, 1]],
                color: 'T'
            },
            { // S
                shape: [[0, 1, 1], [1, 1, 0]],
                color: 'S'
            },
            { // Z
                shape: [[1, 1, 0], [0, 1, 1]],
                color: 'Z'
            },
            { // J
                shape: [[1, 0, 0], [1, 1, 1]],
                color: 'J'
            },
            { // L
                shape: [[0, 0, 1], [1, 1, 1]],
                color: 'L'
            }
        ];
        
        // Управление
        this.keys = {};
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        
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
        
        // Загружаем рекорд
        this.highScore = window.tasksStore?.get('tetris_high_score') || 0;
        
        // Инициализируем поле
        this._initBoard();
        
        // Создаём первую фигуру
        this._spawnPiece();
        this._spawnNextPiece();
        
        // Рендерим
        this._render();
        
        // Настраиваем управление
        this._setupControls();
        
        console.log('🧩 Тетрис инициализирован');
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
        
        // Запускаем игровой цикл
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
        console.log('⏸️ Тетрис на паузе');
    }

    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        this.lastDropTime = performance.now();
        this._gameLoop();
        console.log('▶️ Тетрис продолжен');
    }

    destroy() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
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
        
        // Падение фигуры
        const delta = timestamp - this.lastDropTime;
        const interval = Math.max(100, this.dropInterval - (this.level - 1) * 80);
        
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
            <div class="tetris-container" id="tetris-container">
                <div class="tetris-game-wrapper">
                    <!-- Игровое поле -->
                    <div class="tetris-board" id="tetris-board" style="grid-template-columns: repeat(${this.cols}, 1fr);">
                        ${this._renderBoard()}
                    </div>
                    
                    <!-- Правая панель -->
                    <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                        <!-- Следующая фигура -->
                        <div class="tetris-preview">
                            <span class="tetris-preview-label">Следующая</span>
                            <div class="tetris-preview-grid" id="tetris-preview-grid" style="grid-template-columns: repeat(4, 1fr);">
                                ${this._renderPreview()}
                            </div>
                        </div>
                        
                        <!-- Информация -->
                        <div class="tetris-info">
                            <div class="tetris-info-item">
                                <span>Счёт</span>
                                <span class="value" id="tetris-score">${this.score}</span>
                            </div>
                            <div class="tetris-info-item">
                                <span>Линии</span>
                                <span class="value" id="tetris-lines">${this.lines}</span>
                            </div>
                            <div class="tetris-info-item">
                                <span>Уровень</span>
                                <span class="value" id="tetris-level">${this.level}</span>
                            </div>
                            <div class="tetris-info-item" style="border-top:1px solid var(--app-border-color-light); padding-top:4px;">
                                <span>🏆 Рекорд</span>
                                <span class="value" id="tetris-high">${this.highScore}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Тач-управление (только мобильные) -->
                <div class="tetris-touch-controls" id="tetris-touch-controls">
                    <div></div>
                    <button class="tetris-touch-btn" data-action="rotate">🔄</button>
                    <div></div>
                    <button class="tetris-touch-btn" data-action="left">◀</button>
                    <button class="tetris-touch-btn" data-action="drop">⬇</button>
                    <button class="tetris-touch-btn" data-action="right">▶</button>
                </div>
                
                <!-- Кнопки -->
                <div class="tetris-controls">
                    <button class="tetris-btn danger" id="tetris-btn-reset">🔄</button>
                    <button class="tetris-btn primary" id="tetris-btn-pause">⏸️ Пауза</button>
                </div>
                
                <!-- Оверлей Game Over -->
                <div id="tetris-overlay" style="display:none; position:relative; width:100%;">
                    <div class="tetris-overlay">
                        <h3>💀 Game Over</h3>
                        <div class="score">${this.score} очков</div>
                        <div class="sub">${this.score >= this.highScore ? '🏆 Новый рекорд!' : `Рекорд: ${this.highScore}`}</div>
                        <button class="tetris-btn primary" id="tetris-btn-restart">🔄 Играть снова</button>
                    </div>
                </div>
            </div>
        `;
        
        // Обновляем ссылки на элементы
        this.boardEl = document.getElementById('tetris-board');
        this.previewEl = document.getElementById('tetris-preview-grid');
        this.scoreEl = document.getElementById('tetris-score');
        this.linesEl = document.getElementById('tetris-lines');
        this.levelEl = document.getElementById('tetris-level');
        this.highEl = document.getElementById('tetris-high');
        this.overlayEl = document.getElementById('tetris-overlay');
        
        // Привязываем кнопки
        this._bindButtons();
        
        // Обновляем оверлей Game Over
        if (this.gameOver) {
            this._showGameOver();
        }
    }

    _renderBoard() {
        let html = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const value = this.board[r][c];
                const color = value || '';
                html += `<div class="tetris-cell ${color}"></div>`;
            }
        }
        return html;
    }

    _renderPreview() {
        const shape = this.nextPiece ? this.nextPiece.shape : [[0, 0, 0, 0], [0, 0, 0, 0]];
        const rows = shape.length;
        const cols = shape[0].length;
        const cells = 4 * 4;
        const flat = [];
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (r < rows && c < cols && shape[r] && shape[r][c]) {
                    flat.push(this.nextPiece ? this.nextPiece.color : '');
                } else {
                    flat.push('');
                }
            }
        }
        
        return flat.map(color => 
            `<div class="tetris-preview-cell ${color}"></div>`
        ).join('');
    }

    // ==========================================
    // ОБНОВЛЕНИЕ UI
    // ==========================================

    _updateUI() {
        if (!this.boardEl) return;
        
        // Обновляем поле
        let html = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const value = this.board[r][c];
                const color = value || '';
                html += `<div class="tetris-cell ${color}"></div>`;
            }
        }
        this.boardEl.innerHTML = html;
        
        // Обновляем счёт
        if (this.scoreEl) this.scoreEl.textContent = this.score;
        if (this.linesEl) this.linesEl.textContent = this.lines;
        if (this.levelEl) this.levelEl.textContent = this.level;
        if (this.highEl) this.highEl.textContent = this.highScore;
        
        // Обновляем предпросмотр
        if (this.previewEl) {
            this.previewEl.innerHTML = this._renderPreview();
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
        
        // Проверка на Game Over
        if (this._collision(this.currentPiece.shape, this.currentPiece.row, this.currentPiece.col)) {
            this.gameOver = true;
            this.isRunning = false;
            this._showGameOver();
            this._checkHighScore();
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
        
        // Проверяем линии
        this._clearLines();
        
        // Спавним следующую фигуру
        this._spawnPiece();
        this._updateUI();
    }

    _clearLines() {
        let cleared = 0;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== '')) {
                this.board.splice(r, 1);
                this.board.unshift(new Array(this.cols).fill(''));
                cleared++;
                r++; // Проверяем ту же строку снова
            }
        }
        
        if (cleared > 0) {
            this.lines += cleared;
            // Очки: 100 * очищенных_линий^2 * уровень
            const points = 100 * cleared * cleared * this.level;
            this.score += points;
            
            // Повышение уровня каждые 10 линий
            this.level = Math.floor(this.lines / 10) + 1;
            
            this._updateUI();
            
            // Проверка рекорда
            this._checkHighScore();
        }
    }

    _movePieceDown() {
        if (!this.currentPiece || this.gameOver) return;
        
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
        if (!this.currentPiece || this.gameOver) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col - 1)) {
            this.currentPiece.col--;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _movePieceRight() {
        if (!this.currentPiece || this.gameOver) return;
        
        const { shape, row, col } = this.currentPiece;
        if (!this._collision(shape, row, col + 1)) {
            this.currentPiece.col++;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _rotatePiece() {
        if (!this.currentPiece || this.gameOver) return;
        
        const shape = this.currentPiece.shape;
        const rotated = shape[0].map((val, index) => 
            shape.map(row => row[index]).reverse()
        );
        
        if (!this._collision(rotated, this.currentPiece.row, this.currentPiece.col)) {
            this.currentPiece.shape = rotated;
            this.ghostRow = this._getGhostRow();
            this._updateUI();
        }
    }

    _hardDrop() {
        if (!this.currentPiece || this.gameOver) return;
        
        while (!this._collision(
            this.currentPiece.shape,
            this.currentPiece.row + 1,
            this.currentPiece.col
        )) {
            this.currentPiece.row++;
        }
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

    _checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            if (window.tasksStore) {
                window.tasksStore.set('tetris_high_score', this.highScore);
                // ✅ НАГРАДА: 50 монет за рекорд
                const reward = 50;
                window.tasksStore.addBalance(reward, '🏆 Рекорд в Тетрисе!');
                
                if (window.eventBus) {
                    window.eventBus.emit('game:score_updated', { 
                        gameId: 'tetris', 
                        score: this.highScore,
                        reward: reward
                    });
                }
            }
            if (this.highEl) this.highEl.textContent = this.highScore;
        }
    }

    _resetGame() {
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

    _showGameOver() {
        if (!this.overlayEl) return;
        const overlay = this.overlayEl;
        overlay.style.display = 'block';
        
        const scoreEl = overlay.querySelector('.score');
        const subEl = overlay.querySelector('.sub');
        if (scoreEl) scoreEl.textContent = `${this.score} очков`;
        if (subEl) {
            subEl.textContent = this.score >= this.highScore ? 
                '🏆 Новый рекорд!' : 
                `Рекорд: ${this.highScore}`;
        }
        
        overlay.querySelector('.tetris-overlay').style.position = 'relative';
    }

    // ==========================================
    // КНОПКИ
    // ==========================================

    _bindButtons() {
        const resetBtn = document.getElementById('tetris-btn-reset');
        const pauseBtn = document.getElementById('tetris-btn-pause');
        const restartBtn = document.getElementById('tetris-btn-restart');
        
        if (resetBtn) {
            resetBtn.onclick = () => {
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
        
        if (pauseBtn) {
            pauseBtn.onclick = () => {
                if (this.gameOver) return;
                if (this.isPaused) {
                    this.resume();
                    pauseBtn.textContent = '⏸️ Пауза';
                } else {
                    this.pause();
                    pauseBtn.textContent = '▶️ Продолжить';
                }
            };
        }
        
        if (restartBtn) {
            restartBtn.onclick = () => {
                this._resetGame();
                this.start();
            };
        }
        
        // Тач-кнопки
        document.querySelectorAll('.tetris-touch-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                switch(action) {
                    case 'left': this._movePieceLeft(); break;
                    case 'right': this._movePieceRight(); break;
                    case 'rotate': this._rotatePiece(); break;
                    case 'drop': this._hardDrop(); break;
                }
            };
            // Предотвращаем скролл при нажатии
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
            });
        });
    }

    // ==========================================
    // КЛАВИАТУРА
    // ==========================================

    _setupControls() {
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        
        // Тач-управление (свайпы)
        document.addEventListener('touchstart', this._handleTouchStart, { passive: true });
        document.addEventListener('touchmove', this._handleTouchMove, { passive: true });
        document.addEventListener('touchend', this._handleTouchEnd, { passive: true });
        
        // Скрытие вкладки → пауза
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _removeControls() {
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        document.removeEventListener('touchstart', this._handleTouchStart);
        document.removeEventListener('touchmove', this._handleTouchMove);
        document.removeEventListener('touchend', this._handleTouchEnd);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _handleKeyDown(e) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;
        
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
        }
    }

    _handleKeyUp(e) {
        // Ничего не делаем
    }

    // ==========================================
    // ТАЧ-УПРАВЛЕНИЕ (СВАЙПЫ)
    // ==========================================

    _handleTouchStart(e) {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
    }

    _handleTouchMove(e) {
        e.preventDefault();
    }

    _handleTouchEnd(e) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const elapsed = Date.now() - this.touchStartTime;
        
        // Определяем свайп
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const minSwipe = 30;
        
        if (absX < minSwipe && absY < minSwipe) {
            // Тап → поворот
            if (elapsed < 300) {
                this._rotatePiece();
            }
            return;
        }
        
        if (absX > absY) {
            // Горизонтальный свайп
            if (deltaX > 0) {
                this._movePieceRight();
            } else {
                this._movePieceLeft();
            }
        } else {
            // Вертикальный свайп
            if (deltaY > 0) {
                this._hardDrop();
            } else {
                this._rotatePiece();
            }
        }
    }

    // ==========================================
    // ВИДИМОСТЬ ВКЛАДКИ
    // ==========================================

    _handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused && !this.gameOver) {
                this.pause();
                const pauseBtn = document.getElementById('tetris-btn-pause');
                if (pauseBtn) pauseBtn.textContent = '▶️ Продолжить';
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
            gameOver: this.gameOver
        };
    }
}

// Экспортируем в глобальный объект
window.TetrisGame = TetrisGame;

console.log('✅ TetrisGame v1.0.0 загружен');
