// ============================================
// js/core/navigation-state.js
// Описание: Единое состояние навигации
// Версия: 5.3.0 - ГАРАНТИРОВАННОЕ ЗАКРЫТИЕ САЙДБАРА
// ============================================

class NavigationState {
    constructor() {
        this.eventBus = window.eventBus;
        this._moduleLoader = null;
        
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
        
        console.log('✅ NavigationState v5.3.0 инициализирован');
    }

    get moduleLoader() {
        if (!this._moduleLoader) {
            this._moduleLoader = window.moduleLoader || null;
        }
        return this._moduleLoader;
    }

    shouldShowBackButton() {
        // Физическая проверка сайдбара
        const drawer = document.getElementById('drawer');
        const isDrawerPhysicallyOpen = drawer?.classList.contains('active') || false;
        
        if (isDrawerPhysicallyOpen || this._state.isDrawerOpen) {
            return true;
        }

        if (this._state.module === 'chat') {
            return true;
        }

        if (this._state.module === 'profile') {
            return true;
        }

        return false;
    }

    // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ
    back() {
        console.log('🔙 NavigationState.back()');
        
        // 1. Проверяем модалки
        if (this._state.modalStack.length > 0) {
            const lastModal = this._state.modalStack.pop();
            console.log(`📱 Закрываем модалку: ${lastModal}`);
            
            this._emit('modal:state_changed', { 
                isOpen: this._state.modalStack.length > 0,
                modalId: lastModal,
                action: 'back'
            });
            
            if (this._state.modalStack.length === 0) {
                this._state.isModalOpen = false;
                this._updateBackButton();
            }
            return;
        }

        // 2. ✅ ГАРАНТИРОВАННО закрываем сайдбар
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawer-overlay');
        const isDrawerPhysicallyOpen = drawer?.classList.contains('active') || false;
        
        if (isDrawerPhysicallyOpen || this._state.isDrawerOpen) {
            console.log('📂 Закрываем сайдбар (физически)');
            
            // Физическое закрытие
            if (drawer) {
                drawer.classList.remove('active');
                drawer.classList.remove('drawer-anim-in');
                drawer.classList.add('drawer-anim-out');
            }
            if (overlay) {
                overlay.classList.remove('active');
            }
            document.body.style.overflow = '';
            
            // Обновляем состояние
            this._state.isDrawerOpen = false;
            this._updateBackButton();
            this._emit('drawer:state_changed', { isOpen: false });
            
            // Убираем класс анимации после завершения
            setTimeout(() => {
                if (drawer) {
                    drawer.classList.remove('drawer-anim-out');
                }
            }, 300);
            
            return;
        }

        // 3. Проверяем модули
        if (this._state.module === 'chat') {
            this.goToChatList();
            return;
        }

        if (this._state.module === 'profile') {
            if (this._state.history.length > 0) {
                const prev = this._state.history.pop();
                this.navigate(prev.module, prev.params, { replace: true });
            } else {
                this.navigate('chat-list', {}, { replace: true });
            }
            return;
        }

        if (this._state.history.length > 0) {
            const prev = this._state.history.pop();
            this.navigate(prev.module, prev.params, { replace: true });
        } else {
            this.navigate('dashboard', {}, { replace: true });
        }
    }

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

            if (!silent) {
                this._emit();
            }
            
            this._updateBackButton();
            
            console.log(`🧭 Навигация завершена: ${module}`, params);
            
        } catch (err) {
            console.error(`❌ Ошибка навигации в ${module}:`, err);
        } finally {
            this._isLoading = false;
        }
    }

    openChat(chatId, topic) {
        console.log(`📂 NavigationState.openChat: ${chatId}, ${topic}`);
        
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
        }
        
        this.navigate('chat', { chatId, topic });
    }

    goToChatList() {
        this.navigate('chat-list', {}, { replace: true });
    }

    openProfile() {
        console.log('👤 NavigationState.openProfile');
        
        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
        }
        
        this.navigate('profile', {}, { addToHistory: true });
    }

    toggleDrawer(open) {
        const isOpen = open !== undefined ? open : !this._state.isDrawerOpen;
        this._state.isDrawerOpen = isOpen;
        
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if (isOpen) {
            if (drawer && overlay) {
                drawer.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        } else {
            if (drawer && overlay) {
                drawer.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
        
        this._updateBackButton();
        this._emit('drawer:state_changed', { isOpen });
        console.log(`📂 Сайдбар ${isOpen ? 'открыт' : 'закрыт'}`);
    }

    toggleModal(open, modalId = 'default') {
        if (open === false) {
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
            
            this._updateBackButton();
            
        } else {
            if (!this._state.modalStack.includes(modalId)) {
                this._state.modalStack.push(modalId);
            }
            this._state.isModalOpen = true;
            
            this._emit('modal:state_changed', { 
                isOpen: true, 
                modalId,
                action: 'open'
            });
            
            this._updateBackButton();
        }
    }

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

        this.eventBus.on('modal:back', (data) => {
            if (this._state.modalStack.length > 0) {
                this.back();
            }
        });

        this.eventBus.on('navigation:open_profile', () => {
            this.openProfile();
        });

        this.eventBus.on('drawer:state_changed', (data) => {
            this._state.isDrawerOpen = data.isOpen;
            this._updateBackButton();
        });

        console.log('📡 NavigationState подписан на события');
    }
}

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

console.log('✅ NavigationState v5.3.0 загружен');
