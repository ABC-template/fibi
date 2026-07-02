// ============================================
// js/core/module-loader.js
// Описание: Загрузчик модулей
// Версия: 1.2.0 - ИСПРАВЛЕН ПРЕЛОАДЕР (только содержимое)
// ============================================

class ModuleLoader {
    constructor() {
        this.modules = {};
        this.currentModule = null;
        this.container = document.getElementById('app-screen');
        this._isInitialized = false;
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
     * Загрузить модуль
     */
    async load(moduleName) {
        if (!this.modules[moduleName]) {
            console.error(`❌ Модуль не найден: ${moduleName}`);
            return;
        }

        // Скрываем все модули
        this.hideAll();

        // Получаем или создаем контейнер модуля
        let container = document.getElementById(`module-${moduleName}`);
        if (!container) {
            container = document.createElement('div');
            container.id = `module-${moduleName}`;
            container.className = 'module-container';
            this.container.appendChild(container);
        }

        // ✅ ПОКАЗЫВАЕМ ПРЕЛОАДЕР ВНУТРИ КОНТЕЙНЕРА
        this._showLoader(container);

        // Инициализируем модуль (если еще не инициализирован)
        const ModuleClass = this.modules[moduleName];
        if (!ModuleClass._instance) {
            ModuleClass._instance = new ModuleClass(container);
            await ModuleClass._instance.init();
        }

        // ✅ СКРЫВАЕМ ПРЕЛОАДЕР
        this._hideLoader(container);

        // Показываем контейнер
        container.classList.remove('hidden');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';

        this.currentModule = moduleName;

        // Обновляем активную вкладку в навигации
        if (window.navigation) {
            window.navigation.setActive(moduleName);
        }

        // Обновляем Lucide иконки
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);

        console.log(`✅ Модуль загружен: ${moduleName}`);
    }

    // ==========================================
    // ПРЕЛОАДЕР (только внутри контейнера)
    // ==========================================

    _showLoader(container) {
        // Удаляем старый прелоадер, если есть
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
            opacity: 0;
            transition: opacity 0.25s ease;
            border-radius: 0;
            pointer-events: none;
        `;

        loader.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div class="module-spinner" style="
                    width: 36px;
                    height: 36px;
                    border: 3px solid rgba(212, 175, 55, 0.12);
                    border-top-color: var(--app-accent-primary, #D4AF37);
                    border-radius: 50%;
                    animation: moduleSpinnerSpin 0.7s linear infinite;
                "></div>
            </div>
        `;

        // Добавляем стили, если их еще нет
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

        // Показываем контейнер чтобы прелоадер был виден
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';

        container.appendChild(loader);

        // Плавное появление
        requestAnimationFrame(() => {
            loader.style.opacity = '1';
        });
    }

    _hideLoader(container) {
        const loader = container.querySelector('.module-loader-overlay');
        if (!loader) return;

        // Плавное исчезновение
        loader.style.opacity = '0';
        setTimeout(() => {
            if (loader.parentNode) {
                loader.remove();
            }
        }, 300);
    }

    /**
     * Скрыть все модули
     */
    hideAll() {
        document.querySelectorAll('.module-container').forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
            // Удаляем прелоадеры при скрытии
            const loader = el.querySelector('.module-loader-overlay');
            if (loader) loader.remove();
        });
    }

    /**
     * Получить текущий модуль
     */
    getCurrentModule() {
        return this.currentModule;
    }

    /**
     * Проверить, загружен ли модуль
     */
    isModuleLoaded(moduleName) {
        const container = document.getElementById(`module-${moduleName}`);
        return container && !container.classList.contains('hidden');
    }
}

// Создаем глобальный экземпляр
window.ModuleLoader = ModuleLoader;
window.moduleLoader = new ModuleLoader();

console.log('✅ ModuleLoader v1.2.0 загружен');
