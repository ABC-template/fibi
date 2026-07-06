// ============================================
// js/modules/games/GamesModule.js
// Описание: Модуль игр (контейнер) с полноэкранным режимом
// Версия: 3.1.0 - ПОЛНОЭКРАННЫЙ РЕЖИМ ДЛЯ ИГР
// ============================================

class GamesModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this._mode = 'list'; // 'list' | 'game'
        this._currentGameId = null;
        this._gameInstance = null;
        this.eventBus = window.eventBus;
        this.headerManager = window.headerManager;
        this.navigationState = window.navigationState;
        this.tasksStore = window.tasksStore;
        this._subscriptions = [];
        this._gameContainer = null;
        this._gameContent = null;
        this._gameTitle = null;
        this._isFullscreen = false;
    }

    async init() {
        if (this.isInitialized) return;

        window.gamesModule = this;

        // ✅ Пустой заголовок для списка игр
        if (this.headerManager) {
            this.headerManager.setTitle(null);
            this.headerManager.setActions([]);
        }

        this._render();

        // Подписываемся на события
        this._subscribeToEvents();

        // Создаем иконки Lucide
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 200);

        this.isInitialized = true;
        console.log('✅ GamesModule v3.1.0 инициализирован');
    }

    // ==========================================
    // РЕНДЕРИНГ
    // ==========================================

    _render() {
        this.container.innerHTML = `
            <div style="padding: 16px; flex:1; overflow-y:auto; padding-bottom: 80px;">
                <h2 style="font-size:18px; font-weight:700; margin:0 0 16px 0; color:var(--app-text-primary); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="gamepad-2" style="width:24px;height:24px;"></i>
                    Игры
                </h2>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <!-- Тетрис -->
                    <div onclick="window.gamesModule.openGame('tetris')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">🧩</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Тетрис</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Классика</div>
                        <div style="font-size:10px; color:var(--app-accent-primary); margin-top:4px;" id="tetris-high-score">🏆 0</div>
                    </div>
                    
                    <!-- Судоку -->
                    <div onclick="window.gamesModule.openGame('sudoku')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">🧩</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Судоку</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Скоро</div>
                        <div style="font-size:10px; color:var(--app-accent-primary); margin-top:4px;" id="sudoku-high-score">🏆 0</div>
                    </div>
                    
                    <!-- Змейка -->
                    <div onclick="window.gamesModule.openGame('snake')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">🐍</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Змейка</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Классика</div>
                        <div style="font-size:10px; color:var(--app-accent-primary); margin-top:4px;" id="snake-high-score">🏆 0</div>
                    </div>
                    
                    <!-- Виселица -->
                    <div onclick="window.gamesModule.openGame('hangman')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">💀</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Виселица</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Угадай слово</div>
                        <div style="font-size:10px; color:var(--app-accent-primary); margin-top:4px;" id="hangman-high-score">🏆 0</div>
                    </div>
                </div>
                
                <!-- Контейнер для игры -->
                <div id="game-container" style="display:none; margin-top:16px; background:var(--app-bg-secondary); border-radius:16px; border:1px solid var(--app-border-color-light); min-height:300px; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--app-border-color-light);">
                        <span id="game-title" style="font-weight:700; font-size:16px; color:var(--app-text-primary);">Игра</span>
                    </div>
                    <div id="game-content" style="display:flex; align-items:center; justify-content:center; min-height:250px; color:var(--app-text-tertiary); font-size:14px; padding:16px;">
                        Выберите игру
                    </div>
                </div>
            </div>
        `;

        // Сохраняем ссылки на элементы
        this._gameContainer = document.getElementById('game-container');
        this._gameContent = document.getElementById('game-content');
        this._gameTitle = document.getElementById('game-title');

        // Обновляем рекорды
        this._updateHighScores();
    }

    // ==========================================
    // ОБНОВЛЕНИЕ РЕКОРДОВ
    // ==========================================

    _updateHighScores() {
        const tetrisScore = this.tasksStore?.get('tetris_high_score') || 0;
        const sudokuScore = this.tasksStore?.get('sudoku_high_score') || 0;
        const snakeScore = this.tasksStore?.get('snake_high_score') || 0;
        const hangmanScore = this.tasksStore?.get('hangman_high_score') || 0;

        const tetrisEl = document.getElementById('tetris-high-score');
        const sudokuEl = document.getElementById('sudoku-high-score');
        const snakeEl = document.getElementById('snake-high-score');
        const hangmanEl = document.getElementById('hangman-high-score');

        if (tetrisEl) tetrisEl.textContent = `🏆 ${tetrisScore}`;
        if (sudokuEl) sudokuEl.textContent = `🏆 ${sudokuScore}`;
        if (snakeEl) snakeEl.textContent = `🏆 ${snakeScore}`;
        if (hangmanEl) hangmanEl.textContent = `🏆 ${hangmanScore}`;
    }

    // ==========================================
    // ПОЛНОЭКРАННЫЙ РЕЖИМ
    // ==========================================

    _enterFullscreen() {
        if (this._isFullscreen) return;
        this._isFullscreen = true;

        // Скрываем хедер
        const header = document.getElementById('header');
        if (header) {
            header.classList.add('hidden');
        }

        // Скрываем нижнюю навигацию
        if (window.navigation) {
            window.navigation.hide();
        }

        // Растягиваем контейнер игры на весь экран
        if (this._gameContainer) {
            this._gameContainer.style.position = 'fixed';
            this._gameContainer.style.top = '0';
            this._gameContainer.style.left = '0';
            this._gameContainer.style.width = '100vw';
            this._gameContainer.style.height = '100dvh';
            this._gameContainer.style.zIndex = '1000';
            this._gameContainer.style.margin = '0';
            this._gameContainer.style.borderRadius = '0';
            this._gameContainer.style.background = 'var(--app-bg-primary)';
            this._gameContainer.style.border = 'none';
            this._gameContainer.style.maxHeight = '100dvh';
            this._gameContainer.style.minHeight = '100dvh';
        }

        // Добавляем класс на body
        document.body.classList.add('game-fullscreen');

        console.log('🎮 Полноэкранный режим включён');
    }

    _exitFullscreen() {
        if (!this._isFullscreen) return;
        this._isFullscreen = false;

        // Показываем хедер
        const header = document.getElementById('header');
        if (header) {
            header.classList.remove('hidden');
        }

        // Показываем нижнюю навигацию
        if (window.navigation) {
            window.navigation.show();
        }

        // Возвращаем контейнер в обычное состояние
        if (this._gameContainer) {
            this._gameContainer.style.position = '';
            this._gameContainer.style.top = '';
            this._gameContainer.style.left = '';
            this._gameContainer.style.width = '';
            this._gameContainer.style.height = '';
            this._gameContainer.style.zIndex = '';
            this._gameContainer.style.margin = '';
            this._gameContainer.style.borderRadius = '';
            this._gameContainer.style.background = '';
            this._gameContainer.style.border = '';
            this._gameContainer.style.maxHeight = '';
            this._gameContainer.style.minHeight = '';
        }

        // Убираем класс с body
        document.body.classList.remove('game-fullscreen');

        console.log('🎮 Полноэкранный режим выключен');
    }

    // ==========================================
    // ОТКРЫТИЕ ИГРЫ
    // ==========================================

    openGame(gameId) {
        console.log(`🎮 [openGame] Открываем игру: ${gameId}`);

        // Проверяем, поддерживается ли игра
        const gameMap = {
            'tetris': { class: window.TetrisGame, name: '🧩 Тетрис' },
            'sudoku': { class: window.SudokuGame, name: '🧩 Судоку' },
            'snake': { class: window.SnakeGame, name: '🐍 Змейка' },
            'hangman': { class: window.HangmanGame, name: '💀 Виселица' }
        };

        const gameConfig = gameMap[gameId];
        if (!gameConfig || !gameConfig.class) {
            console.warn(`⚠️ Игра ${gameId} не найдена или не загружена`);
            if (window.tg?.showAlert) {
                window.tg.showAlert(`Игра "${gameId}" в разработке. Скоро появится!`);
            }
            return;
        }

        // Если уже открыта другая игра — закрываем её
        if (this._gameInstance && this._mode === 'game') {
            this._gameInstance.destroy();
            this._gameInstance = null;
        }

        // Показываем контейнер
        if (this._gameContainer) {
            this._gameContainer.style.display = 'block';
        }
        if (this._gameTitle) {
            this._gameTitle.textContent = gameConfig.name;
        }

        // Создаём экземпляр игры
        try {
            this._gameInstance = new gameConfig.class();
        } catch (err) {
            console.error(`❌ Ошибка создания игры ${gameId}:`, err);
            if (window.tg?.showAlert) {
                window.tg.showAlert(`Ошибка загрузки игры. Попробуйте позже.`);
            }
            return;
        }

        // Инициализируем игру в контейнере
        if (this._gameContent) {
            try {
                this._gameInstance.init(this._gameContent);
                this._gameInstance.start();
            } catch (err) {
                console.error(`❌ Ошибка инициализации игры ${gameId}:`, err);
                if (window.tg?.showAlert) {
                    window.tg.showAlert(`Ошибка запуска игры. Попробуйте позже.`);
                }
                return;
            }
        }

        // ✅ Обновляем состояние
        this._mode = 'game';
        this._currentGameId = gameId;

        // ✅ Устанавливаем заголовок
        if (this.headerManager) {
            this.headerManager.setTitle(gameConfig.name);
            this.headerManager.setActions([]);
        }

        // ✅ ВКЛЮЧАЕМ ПОЛНОЭКРАННЫЙ РЕЖИМ
        this._enterFullscreen();

        // ✅ Сообщаем NavigationState о переходе в игру
        if (this.navigationState) {
            this.navigationState._state.params = {
                ...this.navigationState._state.params,
                gameMode: 'game',
                gameId: gameId
            };
            this.navigationState._updateBackButton();
        }

        // Отправляем событие о смене режима
        if (this.eventBus) {
            this.eventBus.emit('games:mode_changed', { mode: 'game', gameId }, this);
        }

        console.log(`✅ Игра ${gameId} открыта в полноэкранном режиме`);
    }

    // ==========================================
    // ЗАКРЫТИЕ ИГРЫ (ВЫЗЫВАЕТСЯ ЧЕРЕЗ NAVIGATIONSTATE)
    // ==========================================

    closeGame() {
        console.log('🎮 [closeGame] Закрываем игру...');

        // Уничтожаем экземпляр игры
        if (this._gameInstance) {
            try {
                this._gameInstance.destroy();
            } catch (err) {
                console.warn('⚠️ Ошибка при уничтожении игры:', err);
            }
            this._gameInstance = null;
        }

        // ✅ ВЫКЛЮЧАЕМ ПОЛНОЭКРАННЫЙ РЕЖИМ
        this._exitFullscreen();

        // Скрываем контейнер
        if (this._gameContainer) {
            this._gameContainer.style.display = 'none';
        }
        if (this._gameContent) {
            this._gameContent.innerHTML = '';
        }

        // ✅ Возвращаем пустой заголовок
        if (this.headerManager) {
            this.headerManager.setTitle(null);
            this.headerManager.setActions([]);
        }

        // ✅ Обновляем состояние
        this._mode = 'list';
        this._currentGameId = null;

        // ✅ Сообщаем NavigationState о возврате на стартовую
        if (this.navigationState) {
            this.navigationState._state.params = {
                ...this.navigationState._state.params,
                gameMode: 'list',
                gameId: null
            };
            this.navigationState._updateBackButton();
        }

        // Отправляем событие о смене режима
        if (this.eventBus) {
            this.eventBus.emit('games:mode_changed', { mode: 'list' }, this);
        }

        // Обновляем рекорды
        this._updateHighScores();

        console.log('✅ Игра закрыта, возврат в список');
    }

    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    _subscribeToEvents() {
        // Подписка на обновление рекордов
        const unsubScore = this.eventBus.on('game:score_updated', (data) => {
            if (data && data.gameId) {
                this._updateHighScores();
            }
        }, this);
        this._subscriptions.push(unsubScore);

        // Подписка на закрытие через навигацию
        const unsubNav = this.eventBus.on('navigation:go_back', () => {
            if (this._mode === 'game' && this._gameInstance) {
                this.closeGame();
            }
        }, this);
        this._subscriptions.push(unsubNav);

        console.log('📡 GamesModule подписан на события');
    }

    // ==========================================
    // ПОЛУЧЕНИЕ СОСТОЯНИЯ
    // ==========================================

    getMode() {
        return this._mode;
    }

    getCurrentGameId() {
        return this._currentGameId;
    }

    isGameOpen() {
        return this._mode === 'game';
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДУЛЕМ
    // ==========================================

    show() {
        this.container.classList.remove('hidden');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.width = '100%';
        
        // Если игра открыта — показываем заголовок, иначе пусто
        if (this._mode === 'game' && this._currentGameId) {
            const gameNames = {
                tetris: '🧩 Тетрис',
                sudoku: '🧩 Судоку',
                snake: '🐍 Змейка',
                hangman: '💀 Виселица'
            };
            if (this.headerManager) {
                this.headerManager.setTitle(gameNames[this._currentGameId] || 'Игра');
                this.headerManager.setActions([]);
            }
            // Если игра открыта, но полноэкранный режим почему-то не активен
            if (!this._isFullscreen) {
                this._enterFullscreen();
            }
        } else {
            if (this.headerManager) {
                this.headerManager.setTitle(null);
                this.headerManager.setActions([]);
            }
            // Если мы не в игре, но полноэкранный режим активен — выключаем
            if (this._isFullscreen) {
                this._exitFullscreen();
            }
        }
        
        if (window.navigation) {
            window.navigation.show();
        }

        // Обновляем рекорды при показе
        this._updateHighScores();
    }

    hide() {
        // При скрытии модуля закрываем игру
        if (this._mode === 'game' && this._gameInstance) {
            try {
                this._gameInstance.destroy();
            } catch (err) {
                console.warn('⚠️ Ошибка при уничтожении игры:', err);
            }
            this._gameInstance = null;
            this._mode = 'list';
            this._currentGameId = null;
            
            // Выключаем полноэкранный режим
            this._exitFullscreen();
            
            if (this._gameContainer) {
                this._gameContainer.style.display = 'none';
            }
            if (this._gameContent) {
                this._gameContent.innerHTML = '';
            }
        }
        
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
    }

    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================

    destroy() {
        // Закрываем игру если открыта
        if (this._gameInstance) {
            try {
                this._gameInstance.destroy();
            } catch (err) {
                console.warn('⚠️ Ошибка при уничтожении игры:', err);
            }
            this._gameInstance = null;
        }

        // Выключаем полноэкранный режим
        this._exitFullscreen();

        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки GamesModule:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 GamesModule отписан от событий');
    }
}

window.GamesModule = GamesModule;

console.log('✅ GamesModule v3.1.0 загружен (полноэкранный режим)');
