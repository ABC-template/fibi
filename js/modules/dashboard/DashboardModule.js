// ============================================
// js/modules/dashboard/DashboardModule.js
// Описание: Главная страница (заглушка)
// Версия: 1.1.0 - РЕАКТИВНАЯ СТАТИСТИКА
// ============================================

class DashboardModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this._subscriptions = [];
        this.eventBus = window.eventBus;
    }

    async init() {
        if (this.isInitialized) return;

        this.container.innerHTML = `
            <div style="padding: 16px; flex:1; overflow-y:auto; padding-bottom: 80px;">
                <h2 style="font-size:20px; font-weight:700; margin:0 0 4px 0; color:var(--app-text-primary);">
                    🌤️ Добро пожаловать!
                </h2>
                <p style="font-size:14px; color:var(--app-text-tertiary); margin:0 0 20px 0;">
                    Выберите раздел в меню ниже
                </p>
                
                <!-- Быстрый доступ -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
                    <div onclick="window.navigation.switchTab('chat')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:32px; margin-bottom:8px;">💬</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Чат AI</div>
                        <div style="font-size:12px; color:var(--app-text-tertiary);">Общайся с ИИ</div>
                    </div>
                    <div onclick="window.navigation.switchTab('organizer')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:32px; margin-bottom:8px;">📊</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Органайзер</div>
                        <div style="font-size:12px; color:var(--app-text-tertiary);">To-Do, трекеры</div>
                    </div>
                    <div onclick="window.navigation.switchTab('chat')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:32px; margin-bottom:8px;">⭐</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Избранное</div>
                        <div style="font-size:12px; color:var(--app-text-tertiary);">Лучшие ответы</div>
                    </div>
                    <div onclick="window.navigation.switchTab('profile')" style="background:var(--app-bg-secondary); padding:20px; border-radius:16px; text-align:center; cursor:pointer; border:1px solid var(--app-border-color-light); transition:all 0.2s;">
                        <div style="font-size:32px; margin-bottom:8px;">👤</div>
                        <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">Профиль</div>
                        <div style="font-size:12px; color:var(--app-text-tertiary);">Настройки</div>
                    </div>
                </div>
                
                <!-- Статистика -->
                <div style="background:var(--app-bg-secondary); border-radius:16px; padding:16px; border:1px solid var(--app-border-color-light);">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary); margin-bottom:12px;">📊 Ваша статистика</div>
                    <div style="display:flex; justify-content:space-around;">
                        <div style="text-align:center;">
                            <div id="dash-chats" style="font-size:20px; font-weight:700; color:var(--app-accent-primary);">0</div>
                            <div style="font-size:11px; color:var(--app-text-tertiary);">Чатов</div>
                        </div>
                        <div style="text-align:center;">
                            <div id="dash-messages" style="font-size:20px; font-weight:700; color:var(--app-accent-primary);">0</div>
                            <div style="font-size:11px; color:var(--app-text-tertiary);">Сообщений</div>
                        </div>
                        <div style="text-align:center;">
                            <div id="dash-favorites" style="font-size:20px; font-weight:700; color:var(--app-accent-primary);">0</div>
                            <div style="font-size:11px; color:var(--app-text-tertiary);">Избранных</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Обновляем статистику
        this.updateStats();

        // Подписываемся на события
        this._subscribeToEvents();

        // Создаем иконки Lucide
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 200);

        this.isInitialized = true;
        console.log('✅ DashboardModule инициализирован');
    }

    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    _subscribeToEvents() {
        // Обновление при изменении чатов
        const unsubChats = this.eventBus.on('chat:all_updated', () => {
            this.updateStats();
        }, this);
        this._subscriptions.push(unsubChats);

        const unsubCreated = this.eventBus.on('chat:created', () => {
            this.updateStats();
        }, this);
        this._subscriptions.push(unsubCreated);

        const unsubDeleted = this.eventBus.on('chat:deleted', () => {
            this.updateStats();
        }, this);
        this._subscriptions.push(unsubDeleted);

        const unsubRestored = this.eventBus.on('chat:restored', () => {
            this.updateStats();
        }, this);
        this._subscriptions.push(unsubRestored);

        // Обновление при изменении избранных
        const unsubFav = this.eventBus.on('chat:favorite_toggled', () => {
            this.updateStats();
        }, this);
        this._subscriptions.push(unsubFav);

        console.log('📡 DashboardModule подписан на события');
    }

    // ==========================================
    // ОБНОВЛЕНИЕ СТАТИСТИКИ
    // ==========================================

    updateStats() {
        const allChats = [];
        for (const topic of Object.values(window.chatStore?.histories || {})) {
            if (topic) allChats.push(...topic);
        }
        
        let totalMessages = 0;
        let activeChats = 0;
        for (const chat of allChats) {
            if (chat.deleted_at) continue;
            const messages = chat.messages?.filter(m => !m.deleted_at) || [];
            if (messages.length > 0) activeChats++;
            totalMessages += messages.length;
        }
        
        const favorites = window.chatStore?.getFavorites() || [];
        
        const chatsEl = document.getElementById('dash-chats');
        const msgEl = document.getElementById('dash-messages');
        const favEl = document.getElementById('dash-favorites');
        
        if (chatsEl) chatsEl.textContent = activeChats || 0;
        if (msgEl) msgEl.textContent = totalMessages;
        if (favEl) favEl.textContent = favorites.length || 0;
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДУЛЕМ
    // ==========================================

    show() {
        this.container.classList.remove('hidden');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.width = '100%';
        
        this.updateStats();
        
        if (window.navigation) {
            window.navigation.show();
        }
    }

    hide() {
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
    }

    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки DashboardModule:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 DashboardModule отписан от событий');
    }
}

window.DashboardModule = DashboardModule;

console.log('✅ DashboardModule v1.1.0 загружен (реактивная статистика)');
