// ============================================
// js/core/back-button-manager.js
// Описание: Управление системной кнопкой «Назад» Telegram
// Версия: 5.0.0 - ПРИОРИТЕТ: модалка → сайдбар → навигация
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

        // ❌ НЕ ПОДПИСЫВАЕМСЯ НА МОДАЛКИ (они не влияют на показ/скрытие)
        // Но подписываемся на закрытие модалок через кнопку "Назад"
        const unsubModalBack = this.eventBus.on('modal:state_changed', (data) => {
            // Если модалка закрыта через кнопку "Назад" — обновляем состояние
            if (data && data.action === 'back') {
                this._update();
            }
        }, this);
        this._subscriptions.push(unsubModalBack);

        // Обработка нажатия
        this.tg.BackButton.offClick();
        this.tg.BackButton.onClick(() => {
            this._handleBackPress();
        });

        // Первоначальное обновление
        setTimeout(() => this._update(), 100);

        console.log('✅ BackButtonManager v5.0.0 инициализирован');
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

        // ✅ Модалки НЕ ВЛИЯЮТ на кнопку!
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

let _bbmCheckInterval = setInterval(() => {
    if (window.navigationState) {
        clearInterval(_bbmCheckInterval);
        if (!window.backButtonManager) {
            window.backButtonManager = new BackButtonManager();
            console.log('✅ BackButtonManager создан');
        }
    }
}, 50);

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

console.log('✅ BackButtonManager v5.0.0 загружен');
