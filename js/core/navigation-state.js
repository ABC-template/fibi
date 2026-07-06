// ============================================
// js/core/navigation-state.js
// Описание: Единое состояние навигации 
// Версия: 4.0.0 - ПОДДЕРЖКА РЕЖИМОВ (ИГРЫ)
// ============================================

class NavigationState {
    constructor() {
        this.eventBus = window.eventBus;
        this._moduleLoader = null;
        
        // Состояние
        this._state = {
            module: 'dashboard',
            params: {},
            history: [],
            isDrawerOpen: false,
            isModalOpen: false,
            modalStack: []
        };
        
        this._isNavigating = false;
        this._isLoading = false;
        
        // Список стартовых страниц
        this._startPages = ['dashboard', 'chat-list', 'organizer', 'tasks'];
        
        this._subscribe();
        
        console.log('✅ NavigationState v4.0.0 инициализирован');
    }

    // ==========================================
    // ЛЕНИВЫЙ ГЕТТЕР ДЛЯ ModuleLoader
    // ==========================================

    get moduleLoader() {
        if (!this._moduleLoader) {
            this._moduleLoader = window.moduleLoader || null;
            if (this._moduleLoader) {
                console.log('✅ ModuleLoader найден (ленивая загрузка)');
            } else {
                console.warn('⚠️ ModuleLoader пока не доступен');
            }
        }
        return this._moduleLoader;
    }

    // ==========================================
    // ПРОВЕРКА СТАРТОВОЙ СТРАНИЦЫ
    // ==========================================

    isStartPage(module, params = {}) {
        // Проверяем по списку стартовых страниц
        if (this._startPages.includes(module)) {
            return true;
        }
        
        // Для GamesModule проверяем режим
        if (module === 'games') {
            return params?.gameMode === 'list' || !params?.gameMode;
        }
        
        return false;
    }

    // ==========================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ==========================================

    async navigate(module, params = {}, options = {}) {
        const { replace = false, silent = false, addToHistory = true, force = false } = options;
        
        // Проверяем, нужно ли обновлять параметры
        if (!force && this._state.module === module && 
            JSON.stringify(this._state.params) === JSON.stringify(params)) {
            console.log(`⏭️ Уже в модуле ${module}, пропускаем`);
            return;
        }

        if (this._isLoading) {
            console.log(`⏳ Уже выполняется навигация, пропускаем`);
            return;
        }

        this._isLoading = true;

        try {
            // Сохраняем в историю, только если это НЕ стартовая страница
            const isStart = this.isStartPage(module, params);
            
            if (addToHistory && !replace && !silent && !isStart) {
                this._state.history.push({
                    module: this._state.module,
                    params: { ...this._state.params }
                });
                
                if (this._state.history.length > 20) {
                    this._state.history.shift();
                }
            }

            const oldModule = this._state.module;
            this._state.module = module;
            this._state.params = { ...params };

            if (replace && this._state.history.length > 0) {
                this._state.history.pop();
            }

            // ==========================================
            // ЗАГРУЖАЕМ МОДУЛЬ
            // ==========================================
            
            const loader = this.moduleLoader;
            
            if (loader) {
                console.log(`📦 Загружаем модуль: ${module}`, params);
                
                const instance = await loader.load(module, params, { 
                    silent: silent,
                    replace: replace,
                    force: force
                });
                
                if (!instance) {
                    console.error(`❌ Не удалось загрузить модуль ${module}`);
                    this._state.module = oldModule;
                    this._isLoading = false;
                    return;
                }
                
                console.log(`✅ Модуль ${module} загружен`);
            } else {
                console.warn(`⚠️ ModuleLoader не доступен, повторная попытка через 100мс...`);
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const retryLoader = this.moduleLoader;
                if (retryLoader) {
                    console.log(`📦 Повторная загрузка модуля: ${module}`, params);
                    const instance = await retryLoader.load(module, params, { 
                        silent: silent,
                        replace: replace,
                        force: force
                    });
                    
                    if (!instance) {
                        console.error(`❌ Не удалось загрузить модуль ${module} (повторная попытка)`);
                        this._state.module = oldModule;
                        this._isLoading = false;
                        return;
                    }
                    
                    console.log(`✅ Модуль ${module} загружен (повторная попытка)`);
                } else {
                    console.error(`❌ ModuleLoader так и не стал доступен!`);
                    this._state.module = oldModule;
                    this._isLoading = false;
                    return;
                }
            }

            // Отправляем событие
            if (!silent) {
                this._emit();
            }
            
            console.log(`🧭 Навигация завершена: ${module}`, params);
            
        } catch (err) {
            console.error(`❌ Ошибка навигации в ${module}:`, err);
        } finally {
            this._isLoading = false;
        }
    }

    // ==========================================
    // НАЗАД
    // ==========================================

    back() {
        console.log('🔙 NavigationState.back()');
        
        // 1. Если есть модалки — закрываем последнюю
        if (this._state.modalStack.length > 0) {
            const lastModal = this._state.modalStack.pop();
            this._emit('modal:state_changed', { 
                isOpen: this._state.modalStack.length > 0,
                modalId: lastModal
            });
            return;
        }

        // 2. Если открыт сайдбар — закрываем его
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
            return;
        }

        // 3. Если мы в игре — закрываем игру
        if (this._state.module === 'games' && this._state.params?.gameMode === 'game') {
            const gamesModule = window.gamesModule;
            if (gamesModule && typeof gamesModule.closeGame === 'function') {
                gamesModule.closeGame();
                // Обновляем состояние
                this._state.params.gameMode = 'list';
                this._state.params.gameId = null;
                this._emit();
                return;
            }
        }

        // 4. Если есть история — возвращаемся
        if (this._state.history.length > 0) {
            const prev = this._state.history.pop();
            this.navigate(prev.module, prev.params, { replace: true });
            return;
        }

        // 5. Если мы на внутренней странице — возвращаемся на стартовую
        if (!this.isStartPage(this._state.module, this._state.params)) {
            if (this._state.module === 'chat') {
                this.navigate('chat-list', {}, { replace: true });
                return;
            }
            if (this._state.module === 'profile') {
                this.navigate('dashboard', {}, { replace: true });
                return;
            }
            if (this._state.module === 'games') {
                this.navigate('games', { gameMode: 'list' }, { replace: true });
                return;
            }
            // Fallback
            this.navigate('dashboard', {}, { replace: true });
            return;
        }

        // 6. Если мы на стартовой — ничего не делаем
        console.log('⏭️ Уже на стартовой странице');
    }

    // ==========================================
    // ОТКРЫТИЕ ЧАТА
    // ==========================================

    openChat(chatId, topic) {
        console.log(`📂 NavigationState.openChat: ${chatId}, ${topic}`);
        this.navigate('chat', { chatId, topic });
    }

    goToChatList() {
        this.navigate('chat-list', {}, { replace: true });
    }

    // ==========================================
    // САЙДБАР И МОДАЛКИ
    // ==========================================

    toggleDrawer(open) {
        const isOpen = open !== undefined ? open : !this._state.isDrawerOpen;
        this._state.isDrawerOpen = isOpen;
        this._emit('drawer:state_changed', { isOpen });
    }

    toggleModal(open, modalId = 'default') {
        if (open === false) {
            if (this._state.modalStack.length > 0) {
                this._state.modalStack.pop();
            }
            const isOpen = this._state.modalStack.length > 0;
            this._state.isModalOpen = isOpen;
            this._emit('modal:state_changed', { isOpen, modalId });
        } else {
            this._state.modalStack.push(modalId);
            this._state.isModalOpen = true;
            this._emit('modal:state_changed', { isOpen: true, modalId });
        }
    }

    // ==========================================
    // ГЕТТЕРЫ
    // ==========================================

    get current() {
        return {
            module: this._state.module,
            params: { ...this._state.params },
            hasHistory: this._state.history.length > 0,
            isDrawerOpen: this._state.isDrawerOpen,
            isModalOpen: this._state.isModalOpen,
            modalStack: [...this._state.modalStack],
            isStartPage: this.isStartPage(this._state.module, this._state.params)
        };
    }

    get canGoBack() {
        return this._state.history.length > 0 || 
               this._state.isDrawerOpen ||
               this._state.modalStack.length > 0 ||
               !this.isStartPage(this._state.module, this._state.params);
    }

    get currentModule() {
        return this._state.module;
    }

    get currentParams() {
        return { ...this._state.params };
    }

    // ==========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ==========================================

    _emit(event = 'navigation:state_changed', data = null) {
        if (this.eventBus) {
            this.eventBus.emit(event, data || { ...this._state });
        }
    }

    _subscribe() {
        if (!this.eventBus) return;

        this.eventBus.on('navigation:open_chat', (data) => {
            console.log('📡 Событие navigation:open_chat', data);
            this.openChat(data.chatId, data.topic);
        });

        this.eventBus.on('navigation:go_back', () => {
            console.log('📡 Событие navigation:go_back');
            this.back();
        });

        this.eventBus.on('drawer:toggle', (data) => {
            this.toggleDrawer(data.open);
        });

        this.eventBus.on('modal:open', (data) => {
            this.toggleModal(true, data.modalId || 'default');
        });

        this.eventBus.on('modal:close', (data) => {
            this.toggleModal(false, data.modalId || 'default');
        });

        console.log('📡 NavigationState подписан на события');
    }
}

// ==========================================
// ✅ СОЗДАЕМ ЭКЗЕМПЛЯР
// ==========================================

window.NavigationState = NavigationState;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.navigationState) {
            window.navigationState = new NavigationState();
            console.log('✅ NavigationState создан после загрузки DOM');
        }
    });
} else {
    if (!window.navigationState) {
        window.navigationState = new NavigationState();
        console.log('✅ NavigationState создан (DOM уже загружен)');
    }
}

console.log('✅ NavigationState v4.0.0 загружен');
