// ============================================
// js/core/header-manager.js
// Описание: Управление динамическим хедером
// Версия: 3.0.0 - НОВАЯ ЛОГИКА (текст слева, меню действий всегда)
// ============================================

console.log('✅ HeaderManager v3.0.0 загружен');

class HeaderManager {
    constructor() {
        this.eventBus = window.eventBus;
        this._subscriptions = [];
        this._currentSection = null;
        this._currentTitle = null;
        
        // Подписываемся на события
        this._subscribeToEvents();
    }

    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    _subscribeToEvents() {
        // ✅ При смене активного чата — обновляем заголовок
        const unsubActive = this.eventBus.on('chat:active_changed', (data) => {
            if (this._currentSection === 'versatile') {
                const chat = this._findChatById(data.chatId);
                if (chat) {
                    this.setTitle(chat.title || 'Versatile AI');
                }
            }
        }, this);
        this._subscriptions.push(unsubActive);

        // ✅ При переименовании чата — обновляем заголовок
        const unsubRename = this.eventBus.on('chat:renamed', (data) => {
            if (this._currentSection === 'versatile') {
                const activeChat = window.chatStore?.getActiveChat();
                if (activeChat && activeChat.id === data.chatId) {
                    this.setTitle(data.newTitle);
                }
            }
        }, this);
        this._subscriptions.push(unsubRename);

        console.log('📡 HeaderManager подписан на события');
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ
    // ==========================================

    _findChatById(chatId) {
        const found = window.chatStore?.findChatById(chatId);
        return found?.chat || null;
    }

    _createIcon(name, className = '') {
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', name);
        if (className) icon.className = className;
        return icon;
    }

    // ==========================================
    // ОСНОВНЫЕ МЕТОДЫ
    // ==========================================

    /**
     * Установить заголовок в центре хедера (слева)
     */
    setTitle(text) {
        const centerEl = document.getElementById('header-center');
        if (!centerEl) return;

        this._currentTitle = text || '';

        if (this._currentTitle) {
            centerEl.innerHTML = `
                <span id="header-title-text" style="font-weight:500;font-size:16px;color:var(--app-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%;text-align:left;">
                    ${this._currentTitle}
                </span>
            `;
            centerEl.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;flex:1;min-width:0;overflow:hidden;padding:0 8px;';
        } else {
            centerEl.innerHTML = '';
            centerEl.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;flex:1;min-width:0;overflow:hidden;padding:0 8px;';
        }
    }

    /**
     * Очистить заголовок
     */
    clearTitle() {
        this.setTitle('');
    }

    /**
     * Установить меню действий для раздела
     */
    setActions(actions) {
        const rightEl = document.getElementById('header-right');
        if (!rightEl) return;

        rightEl.innerHTML = '';
        rightEl.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';

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
        const rightEl = document.getElementById('header-right');
        if (!rightEl) return;
        rightEl.innerHTML = '';
        rightEl.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
    }

    /**
     * Установить раздел (стартовая страница)
     */
    setSection(sectionId) {
        this._currentSection = sectionId;
        this.clearTitle();
        this._setupActionsForSection(sectionId);
    }

    /**
     * Настроить меню действий для раздела
     */
    _setupActionsForSection(sectionId) {
        const actionsMap = {
            'versatile': [
                {
                    id: 'profile',
                    icon: 'menu',
                    title: 'Профиль',
                    onClick: () => {
                        if (window.profileUI) {
                            window.profileUI.openModalTab('profile');
                        }
                    }
                },
                {
                    id: 'new-chat',
                    icon: 'message-square-plus',
                    title: 'Новый чат',
                    onClick: () => {
                        if (window.createNewChatFromHeader) {
                            window.createNewChatFromHeader();
                        }
                    }
                }
            ],
            'organizer': [
                {
                    id: 'create',
                    icon: 'plus',
                    title: 'Создать',
                    onClick: () => {
                        // TODO: открыть форму создания
                        if (window.organizerUI) {
                            window.organizerUI.showCreateTrackerForm();
                        }
                    }
                }
            ],
            'games': [],
            'tasks': [],
            'dashboard': [],
            'profile': []
        };

        const actions = actionsMap[sectionId] || [];
        this.setActions(actions);
    }

    /**
     * Полный сброс (очистить всё)
     */
    reset() {
        this.clearTitle();
        this.clearActions();
        this._currentSection = null;
        this._currentTitle = null;
    }

    /**
     * Вход в функцию (чат/игру/инструмент) — показываем название
     */
    enterFeature(title) {
        this.setTitle(title || '');
        // Меню действий остается (мы их не трогаем)
    }

    /**
     * Выход из функции — возврат к стартовой
     */
    exitFeature() {
        if (this._currentSection) {
            this.clearTitle();
            this._setupActionsForSection(this._currentSection);
        } else {
            this.reset();
        }
    }

    // ==========================================
    // СОВМЕСТИМОСТЬ
    // ==========================================

    /**
     * Обновить заголовок чата (для совместимости)
     */
    updateChatTitle(title) {
        if (this._currentSection === 'versatile') {
            this.setTitle(title);
        }
    }

    /**
     * Универсальное обновление (для совместимости)
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
// СОВМЕСТИМОСТЬ СО СТАРЫМИ ФУНКЦИЯМИ
// ==========================================

window.updateHeader = function(config) {
    if (window.headerManager) {
        window.headerManager.updateHeader(config);
    }
};

window.updateChatTitle = function(title) {
    if (window.headerManager) {
        window.headerManager.updateChatTitle(title);
    }
};

window.updateRealtimeIndicator = function(status) {
    // Индикатор убран — ничего не делаем
};

window.getDefaultHeader = function(tabId) {
    return { center: '', right: '' };
};

// ✅ ГЛОБАЛЬНАЯ ФУНКЦИЯ СОЗДАНИЯ ЧАТА ИЗ ХЕДЕРА
window.createNewChatFromHeader = function() {
    console.log('➕ Создаём новый чат из хедера');
    if (window.chatUI) {
        window.chatUI.createNewChat();
        const activeChat = window.chatStore?.getActiveChat();
        if (activeChat && window.headerManager) {
            window.headerManager.setTitle(activeChat.title || 'Versatile AI');
        }
    }
};

console.log('✅ HeaderManager v3.0.0 загружен');
