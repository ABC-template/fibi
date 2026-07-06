// ============================================
// js/core/back-button-manager.js
// Описание: Управление системной кнопкой «Назад» Telegram
// Версия: 4.0.1 - ИСПРАВЛЕНА ОШИБКА this._hide
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

        // По умолчанию скрыта
        this.tg.BackButton.hide();
        this._isVisible = false;

        // Подписываемся на изменения состояния навигации
        if (this.navigationState) {
            const unsub = this.eventBus.on('navigation:state_changed', () => {
                this._update();
            }, this);
            this._subscriptions.push(unsub);
        }

        // Подписка на загрузку модулей
        const unsubModule = this.eventBus.on('module:loaded', () => {
            this._update();
        }, this);
        this._subscriptions.push(unsubModule);

        // Подписка на состояние сайдбара
        const unsubDrawer = this.eventBus.on('drawer:state_changed', () => {
            this._update();
        }, this);
        this._subscriptions.push(unsubDrawer);

        // ❌ НЕ ПОДПИСЫВАЕМСЯ НА МОДАЛКИ (они не влияют)

        // Обработка нажатия
        this.tg.BackButton.offClick();
        this.tg.BackButton.onClick(() => {
            this._handleBackPress();
        });

        // Первоначальное обновление
        setTimeout(() => this._update(), 100);

        console.log('✅ BackButtonManager v4.0.1 инициализирован (чат, профиль, сайдбар)');
    }

    // ==========================================
    // ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПКИ
    // ==========================================

    _update() {
        const shouldShow = this._shouldShow();
        
        if (shouldShow) {
            this.show();
        } else {
            this.hide();
        }
    }

    _shouldShow() {
        if (!this.navigationState) {
            return false;
        }

        // ✅ Используем единый метод для проверки
        return this.navigationState.shouldShowBackButton();
    }

    // ==========================================
    // УПРАВЛЕНИЕ КНОПКОЙ
    // ==========================================

    show() {
        if (!this.tg || !this.tg.BackButton) return;
        if (this._isVisible) return;
        
        try {
            this.tg.BackButton.show();
            this._isVisible = true;
            console.log('🔙 BackButton показан');
        } catch (e) {
            console.warn('⚠️ Ошибка показа BackButton:', e);
        }
    }

    hide() {
        if (!this.tg || !this.tg.BackButton) return;
        if (!this._isVisible) return;
        
        try {
            this.tg.BackButton.hide();
            this._isVisible = false;
            console.log('🔙 BackButton скрыт');
        } catch (e) {
            console.warn('⚠️ Ошибка скрытия BackButton:', e);
        }
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
    // ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ
    // ==========================================

    refresh() {
        this._update();
    }

    // ==========================================
    // ОЧИСТКА
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки BackButtonManager:', e);
            }
        }
        this._subscriptions = [];
        this.hide();
        console.log('📡 BackButtonManager отписан от событий');
    }
}

// ==========================================
// СОЗДАЕМ ЭКЗЕМПЛЯР
// ==========================================

window.BackButtonManager = BackButtonManager;

// Ждём navigationState
const checkInterval = setInterval(() => {
    if (window.navigationState) {
        clearInterval(checkInterval);
        if (!window.backButtonManager) {
            window.backButtonManager = new BackButtonManager();
            console.log('✅ BackButtonManager создан');
        }
    }
}, 50);

// Если через 3 секунды всё ещё нет — создаём вручную
setTimeout(() => {
    if (!window.backButtonManager) {
        window.backButtonManager = new BackButtonManager();
        console.log('✅ BackButtonManager создан (таймаут)');
    }
}, 3000);

window.refreshBackButton = function() {
    if (window.backButtonManager) {
        window.backButtonManager.refresh();
    }
};

console.log('✅ BackButtonManager v4.0.1 загружен');
