// ============================================
// js/core/navigation-state.js
// Описание: Единое состояние навигации 
// Версия: 3.1.0 - ЛЕНИВАЯ ЗАГРУЗКА ЗАВИСИМОСТЕЙ
// ============================================

class NavigationState {
    constructor() {
        this.eventBus = window.eventBus;
        
        // ✅ НЕ сохраняем moduleLoader в конструкторе
        // Будем получать его лениво через геттер
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
        
        console.log('✅ NavigationState v3.1.0 инициализирован');
    }

    // ==========================================
    // ✅ ЛЕНИВЫЙ ГЕТТЕР ДЛЯ ModuleLoader
    // ==========================================

    get moduleLoader() {
        if (!this._moduleLoader) {
            // Пробуем получить из window
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
    // ПУБЛИЧНЫЕ МЕТОДЫ
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

            // ==========================================
            // ✅ ЗАГРУЖАЕМ МОДУЛЬ (используем ленивый геттер)
            // ==========================================
            
            // Проверяем, доступен ли moduleLoader
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
                // ❌ Если moduleLoader НЕ ДОСТУПЕН — пробуем еще раз через 100мс
                console.warn(`⚠️ ModuleLoader не доступен, повторная попытка через 100мс...`);
                
                // Ждем 100мс и пробуем снова
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
    // ОСТАЛЬНЫЕ МЕТОДЫ (без изменений)
    // ==========================================

    back() {
        console.log('🔙 NavigationState.back()');
        
        if (this._state.modalStack.length > 0) {
            const lastModal = this._state.modalStack.pop();
            this._emit('modal:state_changed', { 
                isOpen: this._state.modalStack.length > 0,
                modalId: lastModal
            });
            return;
        }

        if (this._state.isDrawerOpen) {
            this.toggleDrawer(false);
            return;
        }

        if (this._state.history.length === 0) {
            if (this._state.module === 'chat' || this._state.module === 'profile') {
                this.navigate('chat-list', {}, { replace: true });
            } else {
                this.navigate('dashboard', {}, { replace: true });
            }
            return;
        }

        const prev = this._state.history.pop();
        this.navigate(prev.module, prev.params, { replace: true });
    }

    openChat(chatId, topic) {
        console.log(`📂 NavigationState.openChat: ${chatId}, ${topic}`);
        this.navigate('chat', { chatId, topic });
    }

    goToChatList() {
        this.navigate('chat-list', {}, { replace: true });
    }

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
            modalStack: [...this._state.modalStack]
        };
    }

    get canGoBack() {
        return this._state.history.length > 0 || 
               this._state.module === 'chat' ||
               this._state.module === 'profile' ||
               this._state.isDrawerOpen ||
               this._state.modalStack.length > 0;
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
// ✅ СОЗДАЕМ ЭКЗЕМПЛЯР ТОЛЬКО ПОСЛЕ ЗАГРУЗКИ DOM
// ==========================================

window.NavigationState = NavigationState;

// Ждем загрузки DOM перед созданием экземпляра
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.navigationState) {
            window.navigationState = new NavigationState();
            console.log('✅ NavigationState создан после загрузки DOM');
        }
    });
} else {
    // DOM уже загружен
    if (!window.navigationState) {
        window.navigationState = new NavigationState();
        console.log('✅ NavigationState создан (DOM уже загружен)');
    }
}

console.log('✅ NavigationState v3.1.0 загружен');
