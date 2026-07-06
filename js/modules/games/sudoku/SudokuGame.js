// ============================================
// js/modules/games/sudoku/SudokuGame.js
// Описание: Классическое Судоку
// Версия: 1.0.0
// ============================================

class SudokuGame {
    constructor() {
        this.container = null;
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;
        this.difficulty = 'medium'; // 'easy' | 'medium' | 'hard'
        
        // Игровые данные
        this.board = [];           // 9x9 текущее состояние
        this.solution = [];        // 9x9 правильное решение
        this.given = [];           // 9x9 true/false (заданные клетки)
        this.errors = 0;
        this.maxErrors = 5;
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        
        // UI состояния
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.completedNumbers = new Set();
        
        // Рекорды
        this.highScore = 0;
        this.bestTime = null;
        
        // Бинды
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        this._timerTick = this._timerTick.bind(this);
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================

    init(container, difficulty = 'medium') {
        this.container = container;
        this.difficulty = difficulty;
        
        // Загружаем рекорды
        this._loadHighScores();
        
        // Генерируем новое поле
        this._generatePuzzle();
        
        // Сбрасываем состояние
        this.errors = 0;
        this.hintsUsed = 0;
        this.elapsedTime = 0;
        this.startTime = null;
        this.gameOver = false;
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.completedNumbers = new Set();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Рендерим
        this._render();
        
        // Настраиваем управление
        this._setupControls();
        
        console.log(`🧩 Судоку инициализирован (${this.difficulty})`);
    }

    // ==========================================
    // ГЕНЕРАЦИЯ ПОЛЯ
    // ==========================================

    _generatePuzzle() {
        // 1. Создаём решённое поле
        this.solution = this._generateSolvedBoard();
        
        // 2. Создаём копию для игрового поля
        this.board = this.solution.map(row => [...row]);
        this.given = Array(9).fill(null).map(() => Array(9).fill(false));
        
        // 3. Убираем клетки в зависимости от сложности
        const cellsToRemove = {
            'easy': 30,
            'medium': 40,
            'hard': 50
        };
        
        let toRemove = cellsToRemove[this.difficulty] || 40;
        let removed = 0;
        
        while (removed < toRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.given[row][col]) continue;
            
            this.board[row][col] = 0;
            this.given[row][col] = false;
            removed++;
        }
        
        // Отмечаем оставшиеся как заданные
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] !== 0) {
                    this.given[r][c] = true;
                }
            }
        }
    }

    _generateSolvedBoard() {
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        this._solveSudoku(board);
        return board;
    }

    _solveSudoku(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    const nums = this._shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of nums) {
                        if (this._isValid(board, r, c, num)) {
                            board[r][c] = num;
                            if (this._solveSudoku(board)) {
                                return true;
                            }
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    _isValid(board, row, col, num) {
        // Проверка строки
        for (let c = 0; c < 9; c++) {
            if (board[row][c] === num) return false;
        }
        
        // Проверка колонки
        for (let r = 0; r < 9; r++) {
            if (board[r][col] === num) return false;
        }
        
        // Проверка блока 3x3
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                if (board[r][c] === num) return false;
            }
        }
        
        return true;
    }

    _shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ==========================================
    // РЕКОРДЫ
    // ==========================================

    _loadHighScores() {
        const key = `sudoku_${this.difficulty}_high_score`;
        this.highScore = window.tasksStore?.get(key) || 0;
        this.bestTime = window.tasksStore?.get(`sudoku_${this.difficulty}_best_time`) || null;
    }

    _saveHighScore() {
        if (this.errors > this.maxErrors) return;
        
        const time = this.elapsedTime;
        const key = `sudoku_${this.difficulty}_high_score`;
        const timeKey = `sudoku_${this.difficulty}_best_time`;
        
        // Сохраняем лучший результат (по времени)
        if (!this.bestTime || time < this.bestTime) {
            this.bestTime = time;
            if (window.tasksStore) {
                window.tasksStore.set(timeKey, time);
                // ✅ НАГРАДА: 30 монет за рекорд
                const reward = 30;
                window.tasksStore.addBalance(reward, `🧩 Рекорд в Судоку (${this.difficulty})!`);
                
                if (window.eventBus) {
                    window.eventBus.emit('game:score_updated', {
                        gameId: 'sudoku',
                        score: time,
                        reward: reward,
                        difficulty: this.difficulty
                    });
                }
            }
            this._updateUI();
        }
        
        // Сохраняем очки (чем меньше времени, тем больше очков)
        const points = Math.max(100, Math.floor(1000 / (time / 60)));
        if (points > this.highScore) {
            this.highScore = points;
            if (window.tasksStore) {
                window.tasksStore.set(key, points);
            }
        }
    }

    // ==========================================
    // РЕНДЕРИНГ
    // ==========================================

    _render() {
        if (!this.container) return;
        
        const timeStr = this._formatTime(this.elapsedTime);
        const errorsStr = `${this.errors}/${this.maxErrors}`;
        
        this.container.innerHTML = `
            <div class="sudoku-container" id="sudoku-container">
                <!-- Информация -->
                <div class="sudoku-info-panel">
                    <div class="sudoku-info-item">
                        ⏱️ <span class="value" id="sudoku-timer">${timeStr}</span>
                    </div>
                    <div class="sudoku-info-item">
                        ❌ <span class="value ${this.errors >= this.maxErrors ? 'danger' : ''}" id="sudoku-errors">${errorsStr}</span>
                    </div>
                    <div class="sudoku-info-item">
                        💡 <span class="value" id="sudoku-hints">${this.hintsUsed}/${this.maxHints}</span>
                    </div>
                    <div class="sudoku-info-item">
                        🏆 <span class="value" id="sudoku-high">${this.highScore}</span>
                    </div>
                </div>
                
                <!-- Игровое поле -->
                <div class="sudoku-board-wrapper">
                    <div class="sudoku-board" id="sudoku-board">
                        ${this._renderBoard()}
                    </div>
                    
                    <!-- Оверлей Game Over / Победа -->
                    <div id="sudoku-overlay" style="display:none;">
                        <div class="sudoku-overlay">
                            <h3 id="sudoku-overlay-title">💀 Game Over</h3>
                            <div class="score" id="sudoku-overlay-score">0 очков</div>
                            <div class="sub" id="sudoku-overlay-sub">Рекорд: 0</div>
                            <button class="sudoku-btn primary" id="sudoku-btn-restart">🔄 Новая игра</button>
                        </div>
                    </div>
                </div>
                
                <!-- Цифры для ввода -->
                <div class="sudoku-numbers" id="sudoku-numbers">
                    ${[1,2,3,4,5,6,7,8,9].map(n => `
                        <button class="sudoku-num-btn" data-num="${n}" id="sudoku-num-${n}">
                            ${n}
                            <span class="count" id="sudoku-num-count-${n}">0</span>
                        </button>
                    `).join('')}
                </div>
                
                <!-- Управление -->
                <div class="sudoku-controls">
                    <button class="sudoku-btn" id="sudoku-btn-undo">↩️ Отмена</button>
                    <button class="sudoku-btn" id="sudoku-btn-erase">🧹 Стереть</button>
                    <button class="sudoku-btn" id="sudoku-btn-hint">💡 Подсказка</button>
                    <button class="sudoku-btn danger" id="sudoku-btn-reset">🔄 Сброс</button>
                </div>
            </div>
        `;
        
        // Сохраняем ссылки
        this.boardEl = document.getElementById('sudoku-board');
        this.timerEl = document.getElementById('sudoku-timer');
        this.errorsEl = document.getElementById('sudoku-errors');
        this.hintsEl = document.getElementById('sudoku-hints');
        this.highEl = document.getElementById('sudoku-high');
        this.overlayEl = document.getElementById('sudoku-overlay');
        
        // Привязываем кнопки
        this._bindButtons();
        
        // Обновляем UI
        this._updateUI();
        this._updateCounts();
    }

    _renderBoard() {
        let html = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const value = this.board[r][c] || '';
                const isGiven = this.given[r][c];
                const isSelected = this.selectedRow === r && this.selectedCol === c;
                const isError = this._isCellError(r, c);
                
                let classes = 'sudoku-cell';
                if (isGiven) classes += ' given';
                else if (value) classes += ' user';
                if (isSelected) classes += ' selected';
                if (isError) classes += ' error';
                
                // Highlighting
                if (this.selectedRow !== -1) {
                    if (r === this.selectedRow || c === this.selectedCol) {
                        classes += ' highlight';
                    }
                    const selectedValue = this.board[this.selectedRow][this.selectedCol];
                    if (selectedValue && value === selectedValue && !(r === this.selectedRow && c === this.selectedCol)) {
                        classes += ' same-number';
                    }
                }
                
                html += `<div class="${classes}" data-row="${r}" data-col="${c}">${value}</div>`;
            }
        }
        return html;
    }

    // ==========================================
    // ОБНОВЛЕНИЕ UI
    // ==========================================

    _updateUI() {
        if (!this.boardEl) return;
        
        // Обновляем поле
        const cells = this.boardEl.querySelectorAll('.sudoku-cell');
        let idx = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = cells[idx];
                if (!cell) continue;
                
                const value = this.board[r][c] || '';
                const isGiven = this.given[r][c];
                const isSelected = this.selectedRow === r && this.selectedCol === c;
                const isError = this._isCellError(r, c);
                
                cell.textContent = value;
                cell.className = 'sudoku-cell';
                if (isGiven) cell.classList.add('given');
                else if (value) cell.classList.add('user');
                if (isSelected) cell.classList.add('selected');
                if (isError) cell.classList.add('error');
                
                // Highlighting
                if (this.selectedRow !== -1) {
                    if (r === this.selectedRow || c === this.selectedCol) {
                        cell.classList.add('highlight');
                    }
                    const selectedValue = this.board[this.selectedRow][this.selectedCol];
                    if (selectedValue && value === selectedValue && !(r === this.selectedRow && c === this.selectedCol)) {
                        cell.classList.add('same-number');
                    }
                }
                
                idx++;
            }
        }
        
        // Обновляем информацию
        if (this.timerEl) {
            this.timerEl.textContent = this._formatTime(this.elapsedTime);
        }
        if (this.errorsEl) {
            const isMax = this.errors >= this.maxErrors;
            this.errorsEl.textContent = `${this.errors}/${this.maxErrors}`;
            this.errorsEl.className = `value${isMax ? ' danger' : ''}`;
        }
        if (this.hintsEl) {
            this.hintsEl.textContent = `${this.hintsUsed}/${this.maxHints}`;
        }
        if (this.highEl) {
            this.highEl.textContent = this.highScore;
        }
        
        // Обновляем счётчики цифр
        this._updateCounts();
    }

    _updateCounts() {
        const counts = {};
        for (let n = 1; n <= 9; n++) {
            counts[n] = 0;
        }
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = this.board[r][c];
                if (val > 0) counts[val]++;
            }
        }
        
        for (let n = 1; n <= 9; n++) {
            const el = document.getElementById(`sudoku-num-count-${n}`);
            if (el) {
                el.textContent = counts[n];
                const btn = document.getElementById(`sudoku-num-${n}`);
                if (btn) {
                    if (counts[n] >= 9) {
                        btn.classList.add('completed');
                    } else {
                        btn.classList.remove('completed');
                    }
                }
            }
        }
    }

    _isCellError(row, col) {
        const val = this.board[row][col];
        if (val === 0 || this.given[row][col]) return false;
        return val !== this.solution[row][col];
    }

    _isBoardComplete() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] === 0) return false;
                if (this.board[r][c] !== this.solution[r][c]) return false;
            }
        }
        return true;
    }

    _formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // ==========================================
    // ТАЙМЕР
    // ==========================================

    _startTimer() {
        if (this.startTime !== null) return;
        this.startTime = Date.now() - this.elapsedTime * 1000;
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(this._timerTick, 1000);
    }

    _timerTick() {
        if (this.isPaused || this.gameOver) return;
        this.elapsedTime = (Date.now() - this.startTime) / 1000;
        if (this.timerEl) {
            this.timerEl.textContent = this._formatTime(this.elapsedTime);
        }
    }

    // ==========================================
    // ЛОГИКА ИГРЫ
    // ==========================================

    _selectCell(row, col) {
        if (this.gameOver || this.isPaused) return;
        if (this.given[row][col]) {
            this.selectedRow = -1;
            this.selectedCol = -1;
            this._updateUI();
            return;
        }
        
        this.selectedRow = row;
        this.selectedCol = col;
        this._updateUI();
    }

    _placeNumber(num) {
        if (this.gameOver || this.isPaused) return;
        if (this.selectedRow === -1 || this.selectedCol === -1) return;
        
        const row = this.selectedRow;
        const col = this.selectedCol;
        
        if (this.given[row][col]) return;
        
        // Стираем если та же цифра
        if (this.board[row][col] === num) {
            this.board[row][col] = 0;
            this._updateUI();
            this._updateCounts();
            return;
        }
        
        // Проверяем правильность
        if (num === this.solution[row][col]) {
            // Правильно!
            this.board[row][col] = num;
            
            // Проверяем победу
            if (this._isBoardComplete()) {
                this._winGame();
            }
        } else {
            // Ошибка!
            this.errors++;
            this.board[row][col] = num;
            
            if (this.errors >= this.maxErrors) {
                this._loseGame();
            }
        }
        
        // Запускаем таймер при первом ходе
        if (this.startTime === null && !this.gameOver) {
            this._startTimer();
        }
        
        this._updateUI();
        this._updateCounts();
    }

    _eraseNumber() {
        if (this.gameOver || this.isPaused) return;
        if (this.selectedRow === -1 || this.selectedCol === -1) return;
        
        const row = this.selectedRow;
        const col = this.selectedCol;
        
        if (this.given[row][col]) return;
        
        this.board[row][col] = 0;
        this._updateUI();
        this._updateCounts();
    }

    _useHint() {
        if (this.gameOver || this.isPaused) return;
        if (this.hintsUsed >= this.maxHints) {
            if (window.tg?.showAlert) {
                window.tg.showAlert('💡 Подсказки закончились!');
            }
            return;
        }
        
        // Находим пустую или неправильную клетку
        let candidates = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!this.given[r][c] && this.board[r][c] !== this.solution[r][c]) {
                    candidates.push({ row: r, col: c });
                }
            }
        }
        
        if (candidates.length === 0) {
            if (window.tg?.showAlert) {
                window.tg.showAlert('Все клетки уже правильные!');
            }
            return;
        }
        
        // Выбираем случайную клетку для подсказки
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        this.board[pick.row][pick.col] = this.solution[pick.row][pick.col];
        this.hintsUsed++;
        
        // Запускаем таймер при первом ходе
        if (this.startTime === null) {
            this._startTimer();
        }
        
        // Анимация подсказки
        setTimeout(() => {
            const cells = this.boardEl.querySelectorAll('.sudoku-cell');
            const idx = pick.row * 9 + pick.col;
            if (cells[idx]) {
                cells[idx].classList.add('hint');
            }
        }, 50);
        
        // Проверяем победу
        if (this._isBoardComplete()) {
            this._winGame();
        }
        
        this._updateUI();
        this._updateCounts();
        
        if (window.tg?.showAlert) {
            window.tg.showAlert(`💡 Подсказка использована! Осталось: ${this.maxHints - this.hintsUsed}`);
        }
    }

    _resetGame() {
        // Сбрасываем поле к начальному состоянию
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!this.given[r][c]) {
                    this.board[r][c] = 0;
                }
            }
        }
        
        this.errors = 0;
        this.hintsUsed = 0;
        this.selectedRow = -1;
        this.selectedCol = -1;
        this.gameOver = false;
        this.elapsedTime = 0;
        this.startTime = null;
        this.completedNumbers = new Set();
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        if (this.overlayEl) {
            this.overlayEl.style.display = 'none';
        }
        
        this._updateUI();
        this._updateCounts();
        console.log('🔄 Судоку сброшено');
    }

    _winGame() {
        this.gameOver = true;
        this.isRunning = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Сохраняем рекорд
        this._saveHighScore();
        
        // Показываем оверлей победы
        if (this.overlayEl) {
            const title = this.overlayEl.querySelector('#sudoku-overlay-title');
            const score = this.overlayEl.querySelector('#sudoku-overlay-score');
            const sub = this.overlayEl.querySelector('#sudoku-overlay-sub');
            
            if (title) title.textContent = '🎉 Победа!';
            if (score) score.textContent = `${this.highScore} очков`;
            if (sub) {
                const timeStr = this._formatTime(this.elapsedTime);
                sub.textContent = `⏱️ ${timeStr} • Рекорд: ${this.highScore}`;
            }
            
            this.overlayEl.style.display = 'block';
        }
        
        console.log('🎉 Судоку решено!');
    }

    _loseGame() {
        this.gameOver = true;
        this.isRunning = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Показываем оверлей поражения
        if (this.overlayEl) {
            const title = this.overlayEl.querySelector('#sudoku-overlay-title');
            const score = this.overlayEl.querySelector('#sudoku-overlay-score');
            const sub = this.overlayEl.querySelector('#sudoku-overlay-sub');
            
            if (title) title.textContent = '💀 Game Over';
            if (score) score.textContent = `${this.highScore} очков`;
            if (sub) sub.textContent = `Слишком много ошибок (${this.errors}/${this.maxErrors})`;
            
            this.overlayEl.style.display = 'block';
        }
        
        console.log('💀 Судоку проиграно');
    }

    // ==========================================
    // УПРАВЛЕНИЕ
    // ==========================================

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isPaused = false;
        console.log('▶️ Судоку запущен');
    }

    pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        console.log('⏸️ Судоку на паузе');
    }

    resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        if (this.startTime !== null) {
            this.startTime = Date.now() - this.elapsedTime * 1000;
        }
        console.log('▶️ Судоку продолжен');
    }

    destroy() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this._removeControls();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('🧹 Судоку уничтожен');
    }

    // ==========================================
    // КНОПКИ
    // ==========================================

    _bindButtons() {
        // Цифры
        document.querySelectorAll('.sudoku-num-btn').forEach(btn => {
            btn.onclick = () => {
                const num = parseInt(btn.dataset.num);
                this._placeNumber(num);
            };
        });
        
        // Клетки
        if (this.boardEl) {
            this.boardEl.querySelectorAll('.sudoku-cell').forEach(cell => {
                cell.onclick = () => {
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    this._selectCell(row, col);
                };
            });
        }
        
        // Управление
        const undoBtn = document.getElementById('sudoku-btn-undo');
        const eraseBtn = document.getElementById('sudoku-btn-erase');
        const hintBtn = document.getElementById('sudoku-btn-hint');
        const resetBtn = document.getElementById('sudoku-btn-reset');
        const restartBtn = document.getElementById('sudoku-btn-restart');
        
        if (undoBtn) {
            undoBtn.onclick = () => {
                if (this.selectedRow !== -1 && this.selectedCol !== -1) {
                    this._eraseNumber();
                }
            };
        }
        
        if (eraseBtn) {
            eraseBtn.onclick = () => this._eraseNumber();
        }
        
        if (hintBtn) {
            hintBtn.onclick = () => this._useHint();
        }
        
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (window.tg?.showConfirm) {
                    window.tg.showConfirm('Сбросить прогресс в этой игре?', (ok) => {
                        if (ok) this._resetGame();
                    });
                } else if (confirm('Сбросить прогресс в этой игре?')) {
                    this._resetGame();
                }
            };
        }
        
        if (restartBtn) {
            restartBtn.onclick = () => {
                this._resetGame();
            };
        }
    }

    // ==========================================
    // КЛАВИАТУРА
    // ==========================================

    _setupControls() {
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _removeControls() {
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }

    _handleKeyDown(e) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;
        
        // Цифры 1-9
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            this._placeNumber(parseInt(e.key));
            return;
        }
        
        // Стрелки для навигации
        const key = e.key;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
            if (this.selectedRow === -1) {
                this.selectedRow = 0;
                this.selectedCol = 0;
            } else {
                switch(key) {
                    case 'ArrowUp': this.selectedRow = Math.max(0, this.selectedRow - 1); break;
                    case 'ArrowDown': this.selectedRow = Math.min(8, this.selectedRow + 1); break;
                    case 'ArrowLeft': this.selectedCol = Math.max(0, this.selectedCol - 1); break;
                    case 'ArrowRight': this.selectedCol = Math.min(8, this.selectedCol + 1); break;
                }
            }
            this._updateUI();
            return;
        }
        
        // Backspace / Delete - стереть
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            this._eraseNumber();
            return;
        }
        
        // Escape - снять выделение
        if (e.key === 'Escape') {
            this.selectedRow = -1;
            this.selectedCol = -1;
            this._updateUI();
            return;
        }
    }

    // ==========================================
    // ВИДИМОСТЬ ВКЛАДКИ
    // ==========================================

    _handleVisibilityChange() {
        if (document.hidden) {
            if (this.isRunning && !this.isPaused && !this.gameOver) {
                this.pause();
            }
        }
    }

    // ==========================================
    // ПОЛУЧЕНИЕ СОСТОЯНИЯ
    // ==========================================

    getScore() {
        return this.highScore;
    }

    getState() {
        return {
            difficulty: this.difficulty,
            errors: this.errors,
            hintsUsed: this.hintsUsed,
            elapsedTime: this.elapsedTime,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            gameOver: this.gameOver,
            highScore: this.highScore
        };
    }

    setSafeArea(top, bottom) {
        // Судоку хорошо адаптируется через CSS, ничего дополнительного не требуется
    }
}

// Экспортируем в глобальный объект
window.SudokuGame = SudokuGame;

console.log('✅ SudokuGame v1.0.0 загружен');
