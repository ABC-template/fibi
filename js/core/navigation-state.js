// ============================================
// js/core/navigation-state.js
// Описание: Единое состояние навигации 
// Версия: 4.0.0 - НОВАЯ ЛОГИКА КНОПКИ НАЗАД
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
    // ✅ НОВАЯ ЛОГИКА: НУЖНО ЛИ ПОКАЗЫВАТЬ КНОПКУ НАЗАД?
    // ==========================================

    shouldShowBackButton() {
        // 1. Сайдбар открыт → ДА
        if (this._state.isDrawerOpen) {
            console.log('🔙 shouldShowBackButton: ДА (сайдбар открыт)');
            return true;
        }

        // 2. Чат открыт → ДА
        if (this._state.module === 'chat') {
            console.log('🔙 shouldShowBackButton: ДА (чат открыт)');
            return true;
        }

        // 3. Профиль открыт → ДА
        if (this._state.module === 'profile') {
            console.log('🔙 shouldShowBackButton: ДА (профиль открыт)');
            return true;
        }

        // 4. Всё остальное → НЕТ
        console.log('🔙 shouldShowBackButton: НЕТ (корневой модуль)');
        return false;
    }

    // ==========================================
    // ОБРАБОТКА НАЖАТИЯ КНОПКИ НАЗАД
    // ==========================================

    back() {
        console.log('🔙 NavigationState.back()');

        // 1. Если сайдбар открыт → закрываем его
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
            return;
        }

        // 2. Если чат открыт → возвращаемся в список чатов
        if (this._state.module === 'chat') {
            this.goToChatList();
            return;
        }

        // 3. Если профиль открыт → возвращаемся в предыдущий модуль
        if (this._state.module === 'profile') {
            if (this._state.history.length > 0) {
                const prev = this._state.history.pop();
                this.navigate(prev.module, prev.params, { replace: true });
            } else {
                this.navigate('chat-list', {}, { replace: true });
            }
            return;
        }

        // 4. Иначе → используем историю или возвращаемся на главную
        if (this._state.history.length > 0) {
            const prev = this._state.history.pop();
            this.navigate(prev.module, prev.params, { replace: true });
        } else {
            this.navigate('dashboard', {}, { replace: true });
        }
    }

    // ==========================================
    // НАВИГАЦИЯ
    // ==========================================

    async navigate(module, params = {}, options = {}) {
        const { replace = false, silent = false, addToHistory = true, force = false } = options;
        
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
            // Сохраняем в историю
            if (addToHistory && !replace && !silent) {
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

            // Загружаем модуль
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
                console.error(`❌ ModuleLoader не доступен!`);
                this._state.module = oldModule;
                this._isLoading = false;
                return;
            }

            // Отправляем событие
            if (!silent) {
                this._emit();
            }
            
            // ✅ ОБНОВЛЯЕМ КНОПКУ НАЗАД ПОСЛЕ НАВИГАЦИИ
            this._updateBackButton();
            
            console.log(`🧭 Навигация завершена: ${module}`, params);
            
        } catch (err) {
            console.error(`❌ Ошибка навигации в ${module}:`, err);
        } finally {
            this._isLoading = false;
        }
    }

    // ==========================================
    // ОТКРЫТИЕ ЧАТА (С АВТОЗАКРЫТИЕМ САЙДБАРА)
    // ==========================================

    openChat(chatId, topic) {
        console.log(`📂 NavigationState.openChat: ${chatId}, ${topic}`);
        
        // ✅ ЗАКРЫВАЕМ САЙДБАР, ЕСЛИ ОТКРЫТ
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
        }
        
        // Переходим в чат
        this.navigate('chat', { chatId, topic });
    }

    // ==========================================
    // ПЕРЕХОД В СПИСОК ЧАТОВ
    // ==========================================

    goToChatList() {
        this.navigate('chat-list', {}, { replace: true });
    }

    // ==========================================
    // ОТКРЫТИЕ ПРОФИЛЯ (С АВТОЗАКРЫТИЕМ САЙДБАРА)
    // ==========================================

    openProfile() {
        console.log('👤 NavigationState.openProfile');
        
        // ✅ ЗАКРЫВАЕМ САЙДБАР, ЕСЛИ ОТКРЫТ
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
        }
        
        // Переходим в профиль
        this.navigate('profile', {}, { addToHistory: true });
    }

    // ==========================================
    // УПРАВЛЕНИЕ САЙДБАРОМ
    // ==========================================

    toggleDrawer(open) {
        const isOpen = open !== undefined ? open : !this._state.isDrawerOpen;
        this._state.isDrawerOpen = isOpen;
        
        // ✅ ОБНОВЛЯЕМ КНОПКУ НАЗАД
        this._updateBackButton();
        
        this._emit('drawer:state_changed', { isOpen });
        console.log(`📂 Сайдбар ${isOpen ? 'открыт' : 'закрыт'}`);
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДАЛКАМИ (НЕ ВЛИЯЮТ НА КНОПКУ)
    // ==========================================

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
    // ✅ ОБНОВЛЕНИЕ КНОПКИ НАЗАД
    // ==========================================

    _updateBackButton() {
        const shouldShow = this.shouldShowBackButton();
        
        if (window.backButtonManager) {
            if (shouldShow) {
                window.backButtonManager.show();
            } else {
                window.backButtonManager.hide();
            }
        } else {
            console.warn('⚠️ backButtonManager не найден');
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
            modalStack: [...this._state.modalStack]
        };
    }

    get canGoBack() {
        return this.shouldShowBackButton();
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

        // ✅ Подписка на открытие профиля
        this.eventBus.on('navigation:open_profile', () => {
            this.openProfile();
        });

        console.log('📡 NavigationState подписан на события');
    }
}

// ==========================================
// СОЗДАЕМ ЭКЗЕМПЛЯР
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
