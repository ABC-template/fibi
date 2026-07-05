// ============================================
// js/core/back-button-manager.js
// Описание: Управление BackButton через NavigationState
// Версия: 3.0.0
// ============================================

class BackButtonManager {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.eventBus = window.eventBus;
        this.navigationState = window.navigationState;
        this._isVisible = false;
        this._subscriptions = [];
        
        this._init();
    }

    _init() {
        if (!this.tg || !this.tg.BackButton) {
            console.warn('⚠️ BackButtonManager: Telegram BackButton не доступен');
            return;
        }

        this.tg.BackButton.hide();
        this._isVisible = false;

        // Подписываемся на изменения состояния
        if (this.navigationState) {
            const unsub = this.eventBus.on('navigation:state_changed', () => {
                this._update();
            }, this);
            this._subscriptions.push(unsub);
        }

        // Подписка на модули
        const unsubModule = this.eventBus.on('module:loaded', () => {
            this._update();
        }, this);
        this._subscriptions.push(unsubModule);

        // Подписка на сайдбар
        const unsubDrawer = this.eventBus.on('drawer:state_changed', () => {
            this._update();
        }, this);
        this._subscriptions.push(unsubDrawer);

        // Подписка на модалки
        const unsubModal = this.eventBus.on('modal:state_changed', () => {
            this._update();
        }, this);
        this._subscriptions.push(unsubModal);

        // Обработка нажатия
        this.tg.BackButton.offClick();
        this.tg.BackButton.onClick(() => {
            this._handleBackPress();
        });

        console.log('✅ BackButtonManager v3.0.0 инициализирован');
    }

    // ==========================================
    // ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ
    // ==========================================

    _update() {
        const shouldShow = this._shouldShow();
        
        if (shouldShow) {
            this._show();
        } else {
            this._hide();
        }
    }

    _shouldShow() {
        const state = this.navigationState?.current;
        if (!state) return false;

        // 1. Сайдбар открыт?
        if (state.isDrawerOpen) {
            return true;
        }

        // 2. Модалка открыта?
        if (state.isModalOpen) {
            return true;
        }

        // 3. Есть история?
        if (state.hasHistory) {
            return true;
        }

        // 4. Специальные модули
        if (state.module === 'chat' || state.module === 'profile') {
            return true;
        }

        // 5. Любой модуль, кроме dashboard, chat-list, games, tasks
        const noBackModules = ['dashboard', 'chat-list', 'games', 'tasks', 'organizer'];
        if (!noBackModules.includes(state.module)) {
            return true;
        }

        return false;
    }

    _show() {
        if (!this.tg || !this.tg.BackButton) return;
        if (this._isVisible) return;
        
        this.tg.BackButton.show();
        this._isVisible = true;
        console.log('🔙 BackButton показан');
    }

    _hide() {
        if (!this.tg || !this.tg.BackButton) return;
        if (!this._isVisible) return;
        
        this.tg.BackButton.hide();
        this._isVisible = false;
        console.log('🔙 BackButton скрыт');
    }

    // ==========================================
    // ОБРАБОТКА НАЖАТИЯ
    // ==========================================

    _handleBackPress() {
        console.log('🔙 BackButton нажат');

        if (this.navigationState) {
            this.navigationState.back();
        } else if (this.eventBus) {
            this.eventBus.emit('navigation:go_back');
        }
    }

    // ==========================================
    // РУЧНОЕ ОБНОВЛЕНИЕ
    // ==========================================

    refresh() {
        this._update();
    }

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки BackButtonManager:', e);
            }
        }
        this._subscriptions = [];
        this._hide();
        console.log('📡 BackButtonManager отписан от событий');
    }
}

window.BackButtonManager = BackButtonManager;
window.backButtonManager = new BackButtonManager();

window.refreshBackButton = function() {
    if (window.backButtonManager) {
        window.backButtonManager.refresh();
    }
};

console.log('✅ BackButtonManager v3.0.0 загружен');
