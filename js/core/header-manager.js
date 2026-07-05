// ============================================
// js/core/header-manager.js
// Описание: Управление динамическим хедером
// Версия: 4.0.0 - НОВАЯ ЛОГИКА (модули сами управляют)
// ============================================

console.log('✅ HeaderManager v4.0.0 загружен');

class HeaderManager {
    constructor() {
        this.eventBus = window.eventBus;
        this._subscriptions = [];
        this._currentTitle = null;
        this._currentActions = [];
    }

    // ==========================================
    // ОСНОВНЫЕ МЕТОДЫ
    // ==========================================

    /**
     * Установить заголовок
     * @param {string|null} title - Текст заголовка или null (тогда пусто)
     */
    setTitle(title) {
        const centerEl = document.getElementById('header-center');
        if (!centerEl) return;

        this._currentTitle = title;

        if (title && title.trim().length > 0) {
            centerEl.innerHTML = `
                <span id="header-title-text" style="
                    font-weight: 600;
                    font-size: 16px;
                    color: var(--app-text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: block;
                    max-width: 100%;
                    text-align: left;
                ">
                    ${title}
                </span>
            `;
            centerEl.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: flex-start;
                flex: 1;
                min-width: 0;
                overflow: hidden;
                padding: 0 8px;
            `;
        } else {
            centerEl.innerHTML = '';
            centerEl.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: flex-start;
                flex: 1;
                min-width: 0;
                overflow: hidden;
                padding: 0 8px;
            `;
        }
    }

    /**
     * Установить меню действий
     * @param {Array} actions - Массив объектов { id, icon, title, onClick }
     */
    setActions(actions = []) {
        const rightEl = document.getElementById('header-right');
        if (!rightEl) return;

        this._currentActions = actions;

        rightEl.innerHTML = '';
        rightEl.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

        if (!actions || actions.length === 0) {
            return;
        }

        for (const action of actions) {
            const btn = document.createElement('button');
            btn.className = 'header-action-btn';
            btn.dataset.action = action.id;
            btn.title = action.title || '';
            
            const icon = this._createIcon(action.icon);
            btn.appendChild(icon);
            
            if (action.onClick) {
                btn.addEventListener('click', action.onClick);
            }
            
            rightEl.appendChild(btn);
        }

        // Создаем иконки Lucide
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
    }

    /**
     * Очистить меню действий
     */
    clearActions() {
        this.setActions([]);
    }

    /**
     * Сбросить всё (пустой заголовок + пустые действия)
     */
    reset() {
        this.setTitle(null);
        this.setActions([]);
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ
    // ==========================================

    _createIcon(name) {
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', name);
        return icon;
    }

    // ==========================================
    // СОВМЕСТИМОСТЬ
    // ==========================================

    /**
     * Универсальное обновление (для обратной совместимости)
     */
    updateHeader(config) {
        if (config.center && config.center.html) {
            const centerEl = document.getElementById('header-center');
            if (centerEl) {
                centerEl.innerHTML = config.center.html;
                centerEl.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;flex:1;min-width:0;overflow:hidden;padding:0 8px;';
            }
        }
        if (config.right && config.right.html) {
            const rightEl = document.getElementById('header-right');
            if (rightEl) {
                rightEl.innerHTML = config.right.html;
                rightEl.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
            }
        }
        setTimeout(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 50);
    }

    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки HeaderManager:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 HeaderManager отписан от событий');
    }
}

// ✅ СОЗДАЕМ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР
window.HeaderManager = HeaderManager;
window.headerManager = new HeaderManager();

// ==========================================
// СОВМЕСТИМОСТЬ
// ==========================================

window.updateHeader = function(config) {
    if (window.headerManager) {
        window.headerManager.updateHeader(config);
    }
};

window.updateChatTitle = function(title) {
    if (window.headerManager) {
        window.headerManager.setTitle(title);
    }
};

window.updateRealtimeIndicator = function(status) {
    // Индикатор убран — ничего не делаем
};

window.getDefaultHeader = function(tabId) {
    return { center: '', right: '' };
};

console.log('✅ HeaderManager v4.0.0 загружен');
