// ============================================
// js/core/navigation-state.js
// Описание: Единое состояние навигации
// Версия: 5.1.0 - ИСПРАВЛЕНА СИНХРОНИЗАЦИЯ САЙДБАРА И МОДАЛОК
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
        
        console.log('✅ NavigationState v5.1.0 инициализирован');
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
    // НУЖНО ЛИ ПОКАЗЫВАТЬ КНОПКУ НАЗАД?
    // ==========================================

    shouldShowBackButton() {
        // 1. Сайдбар открыт → ДА
        if (this._state.isDrawerOpen) {
            return true;
        }

        // 2. Чат открыт → ДА
        if (this._state.module === 'chat') {
            return true;
        }

        // 3. Профиль открыт → ДА
        if (this._state.module === 'profile') {
            return true;
        }

        // 4. Всё остальное → НЕТ (модалки НЕ ВЛИЯЮТ!)
        return false;
    }

    // ==========================================
    // ОБРАБОТКА НАЖАТИЯ КНОПКИ НАЗАД
    // ✅ ПРИОРИТЕТ: модалка → сайдбар → навигация
    // ==========================================

    back() {
        console.log('🔙 NavigationState.back()');
        console.log('📊 Текущее состояние:', {
            modalStack: this._state.modalStack,
            isDrawerOpen: this._state.isDrawerOpen,
            module: this._state.module
        });

        // ==========================================
        // 1. ПРОВЕРЯЕМ МОДАЛКИ (самая верхняя)
        // ==========================================
        if (this._state.modalStack.length > 0) {
            const lastModal = this._state.modalStack.pop();
            console.log(`📱 Закрываем модалку: ${lastModal}`);
            
            // Отправляем событие о закрытии модалки
            this._emit('modal:state_changed', { 
                isOpen: this._state.modalStack.length > 0,
                modalId: lastModal,
                action: 'back'
            });
            
            // Если модалок больше нет — обновляем кнопку
            if (this._state.modalStack.length === 0) {
                this._state.isModalOpen = false;
                this._updateBackButton();
            }
            return;
        }

        // ==========================================
        // 2. ПРОВЕРЯЕМ САЙДБАР
        // ==========================================
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
            return;
        }

        // ==========================================
        // 3. ПРОВЕРЯЕМ МОДУЛИ
        // ==========================================
        
        // Чат → список чатов
        if (this._state.module === 'chat') {
            this.goToChatList();
            return;
        }

        // Профиль → предыдущий модуль или список чатов
        if (this._state.module === 'profile') {
            if (this._state.history.length > 0) {
                const prev = this._state.history.pop();
                this.navigate(prev.module, prev.params, { replace: true });
            } else {
                this.navigate('chat-list', {}, { replace: true });
            }
            return;
        }

        // ==========================================
        // 4. ИСТОРИЯ ИЛИ ГЛАВНАЯ
        // ==========================================
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
            
            // Обновляем кнопку
            this._updateBackButton();
            
            console.log(`🧭 Навигация завершена: ${module}`, params);
            
        } catch (err) {
            console.error(`❌ Ошибка навигации в ${module}:`, err);
        } finally {
            this._isLoading = false;
        }
    }

    // ==========================================
    // ОТКРЫТИЕ ЧАТА (с закрытием сайдбара)
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
    // ОТКРЫТИЕ ПРОФИЛЯ (с закрытием сайдбара)
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
        
        // ✅ Если сайдбар открыт — обновляем физическое состояние
        if (isOpen) {
            // Убеждаемся, что сайдбар физически открыт
            const drawer = document.getElementById('drawer');
            const overlay = document.getElementById('drawer-overlay');
            if (drawer && overlay) {
                drawer.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        } else {
            // Убеждаемся, что сайдбар физически закрыт
            const drawer = document.getElementById('drawer');
            const overlay = document.getElementById('drawer-overlay');
            if (drawer && overlay) {
                drawer.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
        
        // Обновляем кнопку
        this._updateBackButton();
        
        this._emit('drawer:state_changed', { isOpen });
        console.log(`📂 Сайдбар ${isOpen ? 'открыт' : 'закрыт'}`);
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДАЛКАМИ
    // ==========================================

    toggleModal(open, modalId = 'default') {
        if (open === false) {
            // Закрываем
            if (this._state.modalStack.length > 0) {
                const lastModal = this._state.modalStack.pop();
                console.log(`📱 Закрыта модалка: ${lastModal}`);
            }
            
            const isOpen = this._state.modalStack.length > 0;
            this._state.isModalOpen = isOpen;
            
            this._emit('modal:state_changed', { 
                isOpen, 
                modalId: modalId || 'default',
                action: 'close'
            });
            
            // ✅ Модалки НЕ ВЛИЯЮТ на кнопку, но обновляем на всякий случай
            this._updateBackButton();
            
        } else {
            // Открываем — добавляем в стек, если ещё нет
            if (!this._state.modalStack.includes(modalId)) {
                this._state.modalStack.push(modalId);
            }
            this._state.isModalOpen = true;
            
            this._emit('modal:state_changed', { 
                isOpen: true, 
                modalId,
                action: 'open'
            });
            
            // ✅ Модалки НЕ ВЛИЯЮТ на кнопку, но обновляем на всякий случай
            this._updateBackButton();
        }
    }

    // ==========================================
    // ОБНОВЛЕНИЕ КНОПКИ НАЗАД
    // ==========================================

    _updateBackButton() {
        const shouldShow = this.shouldShowBackButton();
        
        if (window.backButtonManager) {
            if (shouldShow) {
                window.backButtonManager.show();
            } else {
                window.backButtonManager.hide();
            }
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
        return this.shouldShowBackButton() || this._state.modalStack.length > 0;
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

        // ✅ Модальные события
        this.eventBus.on('modal:open', (data) => {
            this.toggleModal(true, data.modalId || 'default');
        });

        this.eventBus.on('modal:close', (data) => {
            this.toggleModal(false, data.modalId || 'default');
        });

        // ✅ Событие для закрытия модалки через кнопку "Назад"
        this.eventBus.on('modal:back', (data) => {
            if (this._state.modalStack.length > 0) {
                this.back();
            }
        });

        this.eventBus.on('navigation:open_profile', () => {
            this.openProfile();
        });

        // ✅ Синхронизируем состояние сайдбара с DOM
        this.eventBus.on('drawer:state_changed', (data) => {
            this._state.isDrawerOpen = data.isOpen;
            this._updateBackButton();
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

console.log('✅ NavigationState v5.1.0 загружен');
