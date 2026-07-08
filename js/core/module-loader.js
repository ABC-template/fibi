// ============================================
// js/core/module-loader.js
// Описание: Загрузчик модулей с полным управлением видимостью
// Версия: 4.2.0 - ВСЕГДА ВЫЗЫВАЕТ SHOW()
// ============================================

class ModuleLoader {
    constructor() {
        this.modules = {};
        this.container = document.getElementById('app-screen');
        this.eventBus = window.eventBus;
        this.navigationState = window.navigationState;
        this._currentModule = null;
        this._currentParams = {};
        this._loadingPromises = {};
        this._isLoading = false;
    }

    /**
     * Зарегистрировать модуль
     */
    register(moduleName, ModuleClass) {
        if (this.modules[moduleName]) {
            console.warn(`⚠️ Модуль ${moduleName} уже зарегистрирован`);
            return;
        }
        this.modules[moduleName] = ModuleClass;
        console.log(`📦 Модуль зарегистрирован: ${moduleName}`);
    }

    /**
     * Загрузить модуль (ЕДИНСТВЕННЫЙ МЕТОД УПРАВЛЕНИЯ ВИДИМОСТЬЮ)
     */
    async load(moduleName, params = {}, options = {}) {
        const { silent = false, replace = false } = options;

        // Защита от повторных вызовов
        if (this._isLoading) {
            console.log(`⏳ Уже выполняется загрузка, пропускаем`);
            return this._getModuleInstance(moduleName);
        }

        // Проверяем, есть ли модуль
        if (!this.modules[moduleName]) {
            console.error(`❌ Модуль не найден: ${moduleName}`);
            return null;
        }

        this._isLoading = true;

        try {
            // ==========================================
            // ✅ 1. СКРЫВАЕМ ВСЕ МОДУЛИ (ГЛАВНОЕ!)
            // ==========================================
            this._hideAllModules();

            // ==========================================
            // 2. ПОЛУЧАЕМ/СОЗДАЕМ КОНТЕЙНЕР
            // ==========================================
            let container = document.getElementById(`module-${moduleName}`);
            if (!container) {
                container = this._createContainer(moduleName);
            }

            // ==========================================
            // 3. ЗАГРУЖАЕМ/ИНИЦИАЛИЗИРУЕМ МОДУЛЬ
            // ==========================================
            const ModuleClass = this.modules[moduleName];
            let instance = ModuleClass._instance;

            if (!instance) {
                // Показываем прелоадер
                this._showLoader(container);
                
                try {
                    instance = new ModuleClass(container);
                    await instance.init();
                    ModuleClass._instance = instance;
                } catch (err) {
                    console.error(`❌ Ошибка инициализации ${moduleName}:`, err);
                    this._hideLoader(container);
                    throw err;
                }
                
                this._hideLoader(container);
            }

            // ==========================================
            // 4. ПОКАЗЫВАЕМ КОНТЕЙНЕР
            // ==========================================
            container.classList.remove('hidden');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';
            container.style.width = '100%';

            // ==========================================
            // 5. ✅ ВСЕГДА ВЫЗЫВАЕМ SHOW() У МОДУЛЯ
            // ==========================================
            if (typeof instance.show === 'function') {
                await instance.show(params);
                console.log(`✅ show() вызван у модуля ${moduleName}`);
            }

            // ==========================================
            // 6. СОХРАНЯЕМ СОСТОЯНИЕ
            // ==========================================
            this._currentModule = moduleName;
            this._currentParams = { ...params };

            // ==========================================
            // 7. ОТПРАВЛЯЕМ СОБЫТИЕ
            // ==========================================
            if (!silent && this.eventBus) {
                this.eventBus.emit('module:loaded', { 
                    moduleName, 
                    params,
                    instance 
                });
            }

            console.log(`✅ Модуль загружен и показан: ${moduleName}`, params);
            return instance;

        } catch (err) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, err);
            
            // Показываем ошибку
            const container = document.getElementById(`module-${moduleName}`);
            if (container) {
                this._hideLoader(container);
                container.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;">
                        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                        <div style="font-size:16px;color:var(--app-text-primary);margin-bottom:8px;">Ошибка загрузки</div>
                        <div style="font-size:13px;color:var(--app-text-tertiary);">${err.message || 'Неизвестная ошибка'}</div>
                        <button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;border-radius:12px;background:var(--app-accent-primary);color:var(--app-text-inverse);border:none;font-weight:600;cursor:pointer;">
                            🔄 Перезагрузить
                        </button>
                    </div>
                `;
                container.classList.remove('hidden');
                container.style.display = 'flex';
            }
            return null;
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * Показать модуль (без перезагрузки)
     */
    show(moduleName, params = {}) {
        // Скрываем все модули
        this._hideAllModules();
        
        // Показываем нужный
        const container = document.getElementById(`module-${moduleName}`);
        if (!container) {
            console.warn(`⚠️ Контейнер модуля ${moduleName} не найден`);
            return;
        }

        container.classList.remove('hidden');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.style.width = '100%';

        const instance = this._getModuleInstance(moduleName);
        if (instance && typeof instance.show === 'function') {
            instance.show(params);
        }

        this._currentModule = moduleName;
        this._currentParams = { ...params };
    }

    /**
     * Вернуться назад (использует NavigationState)
     */
    back() {
        if (this.navigationState) {
            this.navigationState.back();
        } else {
            // Fallback
            if (this._currentModule === 'chat') {
                this.load('chat-list');
            } else {
                this.load('dashboard');
            }
        }
    }

    /**
     * Получить текущий модуль
     */
    get currentModule() {
        return this._currentModule;
    }

    get currentParams() {
        return { ...this._currentParams };
    }

    /**
     * Проверить, загружен ли модуль
     */
    isLoaded(moduleName) {
        const container = document.getElementById(`module-${moduleName}`);
        return container && !container.classList.contains('hidden');
    }

    /**
     * Получить экземпляр модуля
     */
    getModule(moduleName) {
        return this._getModuleInstance(moduleName);
    }

    // ==========================================
    // ПРИВАТНЫЕ МЕТОДЫ
    // ==========================================

    _getModuleInstance(moduleName) {
        const ModuleClass = this.modules[moduleName];
        return ModuleClass ? ModuleClass._instance : null;
    }

    _createContainer(moduleName) {
        const container = document.createElement('div');
        container.id = `module-${moduleName}`;
        container.className = 'module-container hidden';
        container.style.display = 'none';
        this.container.appendChild(container);
        return container;
    }

    /**
     * ✅ СКРЫВАЕТ ВСЕ МОДУЛИ (ГЛАВНЫЙ МЕТОД)
     */
    _hideAllModules() {
        document.querySelectorAll('.module-container').forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
            
            // Удаляем прелоадеры
            const loader = el.querySelector('.module-loader-overlay');
            if (loader) loader.remove();
        });
        console.log('📦 Все модули скрыты');
    }

    _showLoader(container) {
        const oldLoader = container.querySelector('.module-loader-overlay');
        if (oldLoader) oldLoader.remove();

        const loader = document.createElement('div');
        loader.className = 'module-loader-overlay';
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--app-bg-primary, #0A0A0A);
            z-index: 10;
            opacity: 1;
            transition: opacity 0.25s ease;
            border-radius: 0;
            pointer-events: none;
        `;

        loader.innerHTML = `
            <div class="module-spinner" style="
                width: 36px;
                height: 36px;
                border: 3px solid rgba(212, 175, 55, 0.12);
                border-top-color: var(--app-accent-primary, #D4AF37);
                border-radius: 50%;
                animation: moduleSpinnerSpin 0.7s linear infinite;
            "></div>
        `;

        if (!document.getElementById('module-loader-styles')) {
            const style = document.createElement('style');
            style.id = 'module-loader-styles';
            style.textContent = `
                @keyframes moduleSpinnerSpin {
                    to { transform: rotate(360deg); }
                }
                .module-loader-overlay {
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(loader);
    }

    _hideLoader(container) {
        const loader = container.querySelector('.module-loader-overlay');
        if (!loader) return;

        loader.style.opacity = '0';
        setTimeout(() => {
            if (loader.parentNode) {
                loader.remove();
            }
        }, 300);
    }
}

window.ModuleLoader = ModuleLoader;
window.moduleLoader = new ModuleLoader();

console.log('✅ ModuleLoader v4.2.0 загружен (всегда вызывает show())');
