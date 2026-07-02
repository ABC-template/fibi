// ============================================
// js/modules/profile/ProfileModule.js
// Описание: Модуль профиля (с лимитами)
// Версия: 1.1.0 - добавлены лимиты
// ============================================

class ProfileModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        // Рендерим структуру профиля
        this.container.innerHTML = `
            <div style="padding: 16px; flex:1; overflow-y:auto; padding-bottom: 80px;">
                <h2 style="font-size:18px; font-weight:700; margin:0 0 16px 0; color:var(--app-text-primary); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="user" style="width:24px;height:24px;"></i>
                    Профиль
                </h2>
                
                <!-- Аватар и имя -->
                <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:20px; padding:20px; background:var(--app-bg-secondary); border-radius:16px; border:1px solid var(--app-border-color-light);">
                    <img id="profile-avatar" src="" alt="Аватар" style="width:72px; height:72px; border-radius:50%; margin-bottom:8px; border:3px solid var(--app-accent-primary); object-fit:cover;">
                    <div id="profile-name" style="font-weight:600; font-size:17px; color:var(--app-text-primary);">Загрузка...</div>
                    <div id="profile-role" style="font-size:13px; color:var(--app-text-tertiary);">Trial</div>
                </div>
                
                <!-- ✅ НОВОЕ: Лимиты -->
                <div style="background:var(--app-bg-secondary); border-radius:16px; padding:16px; border:1px solid var(--app-border-color-light); margin-bottom:16px;">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="gauge" style="width:18px;height:18px;"></i>
                        Лимиты
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                        <div style="text-align:center; padding:8px; background:var(--app-bg-tertiary); border-radius:10px;">
                            <div id="profile-limit-total" style="font-size:18px; font-weight:700; color:var(--app-accent-primary);">0</div>
                            <div style="font-size:10px; color:var(--app-text-tertiary);">Всего</div>
                        </div>
                        <div style="text-align:center; padding:8px; background:var(--app-bg-tertiary); border-radius:10px;">
                            <div id="profile-limit-used" style="font-size:18px; font-weight:700; color:var(--app-accent-warning);">0</div>
                            <div style="font-size:10px; color:var(--app-text-tertiary);">Использовано</div>
                        </div>
                        <div style="text-align:center; padding:8px; background:var(--app-bg-tertiary); border-radius:10px;">
                            <div id="profile-limit-remaining" style="font-size:18px; font-weight:700; color:var(--app-accent-success);">0</div>
                            <div style="font-size:10px; color:var(--app-text-tertiary);">Осталось</div>
                        </div>
                    </div>
                    <!-- Прогресс-бар -->
                    <div style="margin-top:10px; width:100%; height:6px; background:var(--app-bg-tertiary); border-radius:3px; overflow:hidden;">
                        <div id="profile-limit-bar" style="width:0%; height:100%; background:var(--app-gradient-primary); border-radius:3px; transition:width 0.3s ease;"></div>
                    </div>
                </div>
                
                <!-- Статистика -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div style="background:var(--app-bg-secondary); padding:12px; border-radius:12px; text-align:center; border:1px solid var(--app-border-color-light);">
                        <div id="stat-chats" style="font-size:20px; font-weight:700; color:var(--app-text-primary);">0</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Чатов</div>
                    </div>
                    <div style="background:var(--app-bg-secondary); padding:12px; border-radius:12px; text-align:center; border:1px solid var(--app-border-color-light);">
                        <div id="stat-messages" style="font-size:20px; font-weight:700; color:var(--app-text-primary);">0</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Сообщений</div>
                    </div>
                    <div style="background:var(--app-bg-secondary); padding:12px; border-radius:12px; text-align:center; border:1px solid var(--app-border-color-light);">
                        <div id="stat-favorites" style="font-size:20px; font-weight:700; color:var(--app-text-primary);">0</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">Избранных</div>
                    </div>
                </div>
                
                <!-- Настройки -->
                <div style="background:var(--app-bg-secondary); border-radius:16px; border:1px solid var(--app-border-color-light); overflow:hidden; margin-bottom:16px;">
                    <div style="padding:14px 16px; border-bottom:1px solid var(--app-border-color-light); display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:14px; font-weight:500; color:var(--app-text-primary);">🌓 Тема</span>
                        <div style="display:flex; gap:6px;">
                            <button class="theme-selector-btn" data-theme-btn="light" onclick="window.themeManager.setTheme('light')" style="padding:4px 12px; border-radius:8px; border:2px solid var(--app-border-color); background:transparent; cursor:pointer; font-size:12px;">
                                <i data-lucide="sun" style="width:14px;height:14px;"></i>
                            </button>
                            <button class="theme-selector-btn" data-theme-btn="amoled" onclick="window.themeManager.setTheme('amoled')" style="padding:4px 12px; border-radius:8px; border:2px solid var(--app-border-color); background:transparent; cursor:pointer; font-size:12px;">
                                <i data-lucide="moon" style="width:14px;height:14px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Кнопки действий -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="btn btn-secondary" onclick="window.exportLocalArchive()" style="width:100%; padding:12px; border-radius:12px; font-size:14px; background:var(--app-bg-tertiary); border:none; cursor:pointer; color:var(--app-text-primary); display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i data-lucide="download" style="width:18px;height:18px;"></i>
                        Экспорт данных
                    </button>
                    <button class="btn btn-secondary" onclick="if(confirm('Выйти из аккаунта?')){window.authService.logout(); location.reload();}" style="width:100%; padding:12px; border-radius:12px; font-size:14px; background:rgba(231,76,60,0.08); border:none; cursor:pointer; color:#e74c3c; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i data-lucide="log-out" style="width:18px;height:18px;"></i>
                        Выйти
                    </button>
                </div>
            </div>
        `;

        // Заполняем данными профиля
        this.updateProfileData();
        this.updateLimitDisplay();

        // Создаем иконки Lucide
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 200);

        this.isInitialized = true;
        console.log('✅ ProfileModule инициализирован');
    }

    updateProfileData() {
        // Заполняем аватар и имя
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        const avatarEl = document.getElementById('profile-avatar');
        const nameEl = document.getElementById('profile-name');
        const roleEl = document.getElementById('profile-role');

        if (user) {
            if (avatarEl) avatarEl.src = user.photo_url || 'https://gravatar.com/avatar/00000000000000000000000000000000?d=mp';
            if (nameEl) nameEl.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        }

        if (window.userStore) {
            if (roleEl) {
                const roleMap = {
                    'trial': '🔓 Бесплатный',
                    'premium': '⭐ PRO',
                    'admin': '👑 Админ',
                    'creator': '👑 Создатель'
                };
                roleEl.textContent = roleMap[window.userStore.role] || window.userStore.role;
            }
        }

        // Статистика
        const chats = window.chatStore ? window.chatStore.getFavorites() : [];
        const allChats = [];
        for (const topic of Object.values(window.chatStore?.histories || {})) {
            if (topic) allChats.push(...topic);
        }
        
        const statChats = document.getElementById('stat-chats');
        const statMessages = document.getElementById('stat-messages');
        const statFavorites = document.getElementById('stat-favorites');

        if (statChats) statChats.textContent = allChats.length || 0;
        if (statFavorites) statFavorites.textContent = chats.length || 0;
        
        let totalMessages = 0;
        for (const chat of allChats) {
            totalMessages += chat.messages?.length || 0;
        }
        if (statMessages) statMessages.textContent = totalMessages;
    }

    // ✅ НОВЫЙ МЕТОД: Обновление отображения лимитов
    updateLimitDisplay() {
        const userStore = window.userStore;
        if (!userStore) return;

        const total = userStore.dailyLimit || 0;
        const used = userStore.usedToday || 0;
        const remaining = Math.max(0, total - used);
        const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

        const totalEl = document.getElementById('profile-limit-total');
        const usedEl = document.getElementById('profile-limit-used');
        const remainingEl = document.getElementById('profile-limit-remaining');
        const barEl = document.getElementById('profile-limit-bar');

        if (totalEl) totalEl.textContent = total >= 9999 ? '∞' : total;
        if (usedEl) usedEl.textContent = used;
        if (remainingEl) remainingEl.textContent = remaining;
        if (barEl) barEl.style.width = total >= 9999 ? '100%' : `${percent}%`;
    }

    show() {
        this.container.classList.remove('hidden');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.width = '100%';
        
        // Обновляем данные при показе
        this.updateProfileData();
        this.updateLimitDisplay();
        
        if (window.navigation) {
            window.navigation.show();
        }
    }

    hide() {
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
    }
}

window.ProfileModule = ProfileModule;

console.log('✅ ProfileModule v1.1.0 загружен (с лимитами)');
