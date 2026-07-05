// ============================================
// js/modules/games/GamesModule.js
// Описание: Модуль игр
// Версия: 1.3.0 - УПРАВЛЕНИЕ ЗАГОЛОВКОМ ЧЕРЕЗ HEADERMANAGER
// ============================================

class GamesModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this._isInGame = false;
        this._mode = 'list'; // 'list' | 'game'
        this.eventBus = window.eventBus;
        this.headerManager = window.headerManager;
    }

    async init() {
        if (this.isInitialized) return;

        window.gamesModule = this;

        // ✅ Пустой заголовок для списка игр
        if (this.headerManager) {
            this.headerManager.setTitle(null);
            this.headerManager.setActions([]);
        }

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
                    </div>
                    
                    <!-- Змейка -->
                    <div onclick="window.gamesModule.openGame('snake')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">🐍</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Змейка</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Классика</div>
                    </div>
                    
                    <!-- Виселица -->
                    <div onclick="window.gamesModule.openGame('hangman')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">💀</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Виселица</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Угадай слово</div>
                    </div>
                    
                    <!-- Шахматы -->
                    <div onclick="window.gamesModule.openGame('chess')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:40px; margin-bottom:8px;">♟️</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Шахматы</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Скоро</div>
                    </div>
                </div>
                
                <!-- Контейнер для игры -->
                <div id="game-container" style="display:none; margin-top:16px; background:var(--app-bg-secondary); border-radius:16px; padding:16px; border:1px solid var(--app-border-color-light); min-height:300px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span id="game-title" style="font-weight:700; font-size:16px; color:var(--app-text-primary);">Игра</span>
                        <button class="btn" style="padding:4px 12px; font-size:11px; border-radius:8px;" onclick="window.gamesModule.closeGame()">✕ Закрыть</button>
                    </div>
                    <div id="game-content" style="display:flex; align-items:center; justify-content:center; min-height:200px; color:var(--app-text-tertiary); font-size:14px;">
                        Выберите игру
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 200);

        this.isInitialized = true;
        console.log('✅ GamesModule v1.3.0 инициализирован');
    }

    openGame(gameId) {
        const container = document.getElementById('game-container');
        const title = document.getElementById('game-title');
        const content = document.getElementById('game-content');

        if (!container || !content) return;

        container.style.display = 'block';

        const games = {
            tetris: { name: '🧩 Тетрис', desc: 'Тетрис скоро появится!' },
            snake: { name: '🐍 Змейка', desc: 'Змейка скоро появится!' },
            hangman: { name: '💀 Виселица', desc: 'Виселица скоро появится!' },
            chess: { name: '♟️ Шахматы', desc: 'Шахматы скоро появятся!' }
        };

        const game = games[gameId];
        const gameName = game?.name || 'Игра';
        
        if (title) title.textContent = gameName;
        
        content.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:48px; margin-bottom:16px;">🚧</div>
                <div style="font-size:16px; color:var(--app-text-primary); font-weight:500;">${game?.desc || 'В разработке'}</div>
                <div style="font-size:13px; color:var(--app-text-tertiary); margin-top:8px;">Разработка ведется...</div>
            </div>
        `;

        // ✅ Устанавливаем заголовок и скрываем действия
        if (this.headerManager) {
            this.headerManager.setTitle(gameName);
            this.headerManager.setActions([]);
        }

        // Обновляем состояние
        this._isInGame = true;
        this._mode = 'game';
        
        // Отправляем событие о смене режима
        if (this.eventBus) {
            this.eventBus.emit('games:mode_changed', { mode: 'game' }, this);
        }
        
        // Обновляем BackButton
        if (window.refreshBackButton) {
            window.refreshBackButton();
        }

        console.log('🎮 Игра открыта:', gameId);
    }

    closeGame() {
        const container = document.getElementById('game-container');
        if (container) {
            container.style.display = 'none';
        }

        // ✅ Возвращаем пустой заголовок и скрываем действия
        if (this.headerManager) {
            this.headerManager.setTitle(null);
            this.headerManager.setActions([]);
        }

        // Обновляем состояние
        this._isInGame = false;
        this._mode = 'list';
        
        // Отправляем событие о смене режима
        if (this.eventBus) {
            this.eventBus.emit('games:mode_changed', { mode: 'list' }, this);
        }
        
        // Обновляем BackButton
        if (window.refreshBackButton) {
            window.refreshBackButton();
        }

        console.log('🎮 Игра закрыта, возврат в список');
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
        if (this._isInGame) {
            if (this.headerManager) {
                const titleEl = document.getElementById('game-title');
                this.headerManager.setTitle(titleEl?.textContent || 'Игра');
                this.headerManager.setActions([]);
            }
        } else {
            if (this.headerManager) {
                this.headerManager.setTitle(null);
                this.headerManager.setActions([]);
            }
        }
        
        if (window.navigation) {
            window.navigation.show();
        }
        
        // Обновляем BackButton
        if (window.refreshBackButton) {
            window.refreshBackButton();
        }
    }

    hide() {
        // При скрытии модуля сбрасываем состояние
        this._isInGame = false;
        this._mode = 'list';
        
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
        
        // Обновляем BackButton
        if (window.refreshBackButton) {
            window.refreshBackButton();
        }
    }
}

window.GamesModule = GamesModule;

console.log('✅ GamesModule v1.3.0 загружен (управление заголовком через HeaderManager)');
