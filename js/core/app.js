// ============================================
// js/core/app.js
// Описание: Инициализация приложения (с JWT)
// Версия: 4.5.0 - ИСПОЛЬЗУЕТ HeaderManager
// ============================================

console.log('🚀 App v4.5.0 начал загрузку');

// ==========================================
// ✅ ПРОВЕРКА: ОТКРЫТО ЛИ В TELEGRAM?
// ==========================================

function isTelegramWebApp() {
    try {
        const tg = window.Telegram?.WebApp;
        const initData = tg?.initData || '';
        const initDataUnsafe = tg?.initDataUnsafe || {};
        return !!(initData && initData.length > 0 && initDataUnsafe?.user?.id);
    } catch (e) {
        return false;
    }
}

// ==========================================
// ✅ ПОКАЗАТЬ ЗАГЛУШКУ (ВНЕ TELEGRAM)
// ==========================================

function showTelegramRequiredScreen() {
    const appScreen = document.getElementById('app-screen');
    const header = document.getElementById('header');
    if (header) header.classList.add('hidden');
    if (appScreen) appScreen.style.display = 'none';
    let wrapper = document.getElementById('telegram-required-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'telegram-required-wrapper';
        wrapper.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: var(--app-bg-primary, #0A0A0A); padding: 32px; box-sizing: border-box;
            z-index: 10000; text-align: center; font-family: var(--app-font-family, -apple-system, sans-serif);
        `;
        wrapper.innerHTML = `
            <div style="max-width: 380px; width: 100%;">
                <div style="font-size: 64px; margin-bottom: 16px;">📱</div>
                <h1 style="font-size: 24px; font-weight: 700; color: var(--app-text-primary, #FFFFFF); margin: 0 0 8px 0;">
                    Вероятно, вы ищете наш бот
                </h1>
                <p style="font-size: 16px; color: var(--app-text-secondary, #E8E0D0); margin: 0 0 6px 0; line-height: 1.5;">
                    Это приложение работает <strong>только внутри Telegram</strong>.
                </p>
                <p style="font-size: 14px; color: var(--app-text-tertiary, #A89880); margin: 0 0 24px 0; line-height: 1.5;">
                    Пожалуйста, откройте его через Telegram Mini App.
                </p>
                <a href="https://t.me/versatile_ai_bot"
                   style="display: inline-block; padding: 14px 32px; border-radius: 12px;
                          background: var(--app-gradient-primary, linear-gradient(135deg, #D4AF37 0%, #C5A059 50%, #A88830 100%));
                          color: #1A1A0A; font-weight: 600; font-size: 16px; text-decoration: none;
                          box-shadow: 0 4px 20px rgba(212,175,55,0.3); transition: transform 0.15s ease;">
                    📲 Открыть в Telegram
                </a>
                <div style="margin-top: 24px; font-size: 12px; color: var(--app-text-tertiary, #A89880);">
                    Версия 4.5.0
                </div>
            </div>
        `;
        document.body.prepend(wrapper);
    } else {
        wrapper.style.display = 'flex';
    }
}

// ==========================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОФЛАЙН-РЕЖИМА
// ==========================================

let offlineBanner = null;
let offlineStartTime = null;

function showOfflineBanner(message = 'Нет интернета. Просмотр доступен, изменения невозможны.') {
    if (offlineBanner) return;
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: var(--app-accent-danger, #e74c3c); color: white;
        padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 500;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); animation: slideDown 0.3s ease;
        font-family: var(--app-font-family, -apple-system, sans-serif);
    `;
    offlineBanner.textContent = `⚠️ ${message}`;
    document.body.prepend(offlineBanner);
    if (!document.getElementById('offline-banner-styles')) {
        const style = document.createElement('style');
        style.id = 'offline-banner-styles';
        style.textContent = `
            @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
            @keyframes slideUp { from { transform: translateY(0); } to { transform: translateY(-100%); } }
        `;
        document.head.appendChild(style);
    }
}

function hideOfflineBanner() {
    if (!offlineBanner) return;
    offlineBanner.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => {
        if (offlineBanner) { offlineBanner.remove(); offlineBanner = null; }
    }, 300);
}

// ==========================================
// ОБРАБОТКА ОФЛАЙН/ОНЛАЙН
// ==========================================

window.addEventListener('offline', () => {
    console.log('📴 Интернет потерян');
    offlineStartTime = Date.now();
    showOfflineBanner();
});

window.addEventListener('online', () => {
    console.log('🌐 Интернет восстановлен');
    const duration = Date.now() - offlineStartTime;
    const OFFLINE_THRESHOLD = 30 * 1000;
    if (duration < OFFLINE_THRESHOLD) {
        console.log('🌐 Короткий обрыв (< 30 сек), возобновляем Realtime');
        if (window.syncService && window.syncService.isActive()) {
            if (window.chatUI) window.chatUI.refreshUI();
        } else {
            const userId = window.userStore?.userId;
            if (userId && window.syncService) window.syncService.subscribe(userId);
        }
    } else {
        console.log('🌐 Долгий обрыв (> 30 сек), проверяем токен');
        handleLongOffline();
    }
    hideOfflineBanner();
    offlineStartTime = null;
});

async function handleLongOffline() {
    try {
        const result = await window.authService.checkSubscription();
        const syncToken = result.syncToken;
        let localToken = localStorage.getItem('sync_token');
        if (syncToken !== localToken) {
            console.log('🔄 Токен изменился за время обрыва → полная перезапись');
            localStorage.setItem('sync_token', syncToken);
            await window.fullDataReload();
        } else {
            console.log('✅ Токен актуален, просто обновляем UI');
            if (window.chatUI) window.chatUI.refreshUI();
        }
        const isPro = result.role === 'pro' || result.role === 'premium' || result.role === 'admin' || result.role === 'creator';
        if (isPro && window.syncService) {
            const userId = window.userStore?.userId;
            if (userId) window.syncService.subscribe(userId);
        }
    } catch (err) {
        console.error('❌ Ошибка обработки восстановления интернета:', err);
    }
}

// ==========================================
// ✅ ПОЛНАЯ ПЕРЕЗАГРУЗКА ДАННЫХ
// ==========================================

window.fullDataReload = async function() {
    console.log('🔄 [fullDataReload] Полная перезагрузка данных...');
    try {
        if (window.chatService) {
            const result = await window.chatService.fullReload();
            if (result) {
                console.log('✅ [fullDataReload] Данные обновлены');
                if (window.chatUI) window.chatUI.refreshUI();
                if (window.profileUI) window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
                if (window.uiRenderer) window.uiRenderer.showToast('🔄 Данные синхронизированы', 'success', 1500);
                
                // Обновляем сайдбар
                renderChatsInDrawer();
                updateDrawerUserInfo();
                updateDrawerCoins();
                updateCoinsDisplay();
                
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error('❌ [fullDataReload] Ошибка:', err);
        return false;
    }
};

// ==========================================
// УПРАВЛЕНИЕ САЙДБАРОМ
// ==========================================

window.openDrawer = function() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    if (!overlay || !drawer) return;
    renderChatsInDrawer();
    updateDrawerCoins();
    overlay.classList.add('active');
    drawer.classList.add('active');
    drawer.classList.remove('drawer-anim-out');
    drawer.classList.add('drawer-anim-in');
    if (window.tg?.BackButton) {
        window.tg.BackButton.show();
        window.tg.BackButton.offClick();
        window.tg.BackButton.onClick(() => { window.closeDrawer(); });
    }
    document.body.style.overflow = 'hidden';
};

window.closeDrawer = function() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('drawer');
    if (!overlay || !drawer) return;
    drawer.classList.remove('drawer-anim-in');
    drawer.classList.add('drawer-anim-out');
    setTimeout(() => {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
    }, 300);
    if (window.tg?.BackButton) window.tg.BackButton.hide();
    document.body.style.overflow = '';
};

// Закрытие по клику на оверлей
document.addEventListener('click', function(e) {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('drawer-overlay');
    const headerGlass = document.querySelector('.header-glass');
    if (!drawer || !overlay) return;
    if (overlay.classList.contains('active')) {
        if (e.target === overlay || (!drawer.contains(e.target) && !headerGlass?.contains(e.target))) {
            window.closeDrawer();
        }
    }
});

// Свайп влево закрывает сайдбар
let touchStartX = 0;
document.addEventListener('touchstart', function(e) {
    const drawer = document.getElementById('drawer');
    if (!drawer || !drawer.classList.contains('active')) return;
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    const drawer = document.getElementById('drawer');
    if (!drawer || !drawer.classList.contains('active')) return;
    const touchX = e.changedTouches[0].screenX;
    const deltaX = touchX - touchStartX;
    if (deltaX < -50) window.closeDrawer();
}, { passive: true });

// ==========================================
// РЕНДЕРИНГ ЧАТОВ В САЙДБАРЕ
// ==========================================

function renderChatsInDrawer() {
    const container = document.getElementById('drawer-chats-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const allChats = [];
    const pinnedChats = [];
    const unpinnedChats = [];
    
    if (window.chatStore) {
        const histories = window.chatStore.histories || {};
        for (const [topic, chats] of Object.entries(histories)) {
            if (!chats) continue;
            for (const chat of chats) {
                if (chat.deleted_at) continue;
                if (!chat.messages || chat.messages.length === 0) continue;
                const chatData = {
                    id: chat.id,
                    title: chat.title || 'Без названия',
                    topic: topic,
                    updated_at: chat.updated_at || chat.created_at,
                    lastMessage: chat.messages[chat.messages.length - 1]?.text || '',
                    pinned: chat.pinned || false,
                    messages: chat.messages
                };
                if (chatData.pinned) {
                    pinnedChats.push(chatData);
                } else {
                    unpinnedChats.push(chatData);
                }
            }
        }
    }
    
    pinnedChats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    unpinnedChats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    const sortedChats = [...pinnedChats, ...unpinnedChats];
    
    if (sortedChats.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--app-text-tertiary); font-size: 13px;">
                Нет чатов
            </div>
        `;
        return;
    }
    
    const listEl = document.createElement('div');
    listEl.className = 'drawer-chats-section';
    
    const label = document.createElement('div');
    label.className = 'section-label';
    label.innerHTML = `<i data-lucide="message-square" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Диалоги`;
    listEl.appendChild(label);
    
    for (const chat of sortedChats) {
        const item = document.createElement('div');
        item.className = `drawer-chat-item ${chat.pinned ? 'pinned' : ''}`;
        item.dataset.chatId = chat.id;
        item.dataset.topic = chat.topic;
        
        const preview = chat.lastMessage ? chat.lastMessage.substring(0, 40) + (chat.lastMessage.length > 40 ? '...' : '') : 'Пустой чат';
        
        item.addEventListener('click', async function(e) {
            if (e.target.closest('.chat-menu-container')) return;
            window.closeDrawer();
            const found = window.chatStore?.findChatById(chat.id);
            if (found) {
                console.log(`🔄 [drawer] Клик по чату ${chat.id}, переключаем...`);
                if (window.navigation) window.navigation.switchTab('chat');
                if (window.chatModule && !window.chatModule.isReady) {
                    console.log('⏳ [drawer] Ждём инициализацию ChatModule...');
                    await new Promise(resolve => {
                        const check = () => {
                            if (window.chatModule && window.chatModule.isReady) resolve();
                            else setTimeout(check, 100);
                        };
                        check();
                    });
                    console.log('✅ [drawer] ChatModule готов');
                }
                setTimeout(() => {
                    window.chatUI?.switchToChat(chat.id, chat.topic);
                }, 100);
            }
        });
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'chat-info';
        infoDiv.innerHTML = `
            <div class="chat-title">${chat.pinned ? '📌 ' : ''}${chat.title}</div>
            <div class="chat-preview">${preview}</div>
        `;
        
        const menuContainer = document.createElement('div');
        menuContainer.className = 'chat-menu-container';
        
        const moreBtn = document.createElement('button');
        moreBtn.className = 'chat-more-btn';
        moreBtn.innerHTML = `<i data-lucide="more-vertical"></i>`;
        moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleChatMenu(chat.id, menuContainer);
        });
        
        menuContainer.appendChild(moreBtn);
        
        const menu = document.createElement('div');
        menu.className = 'chat-menu';
        menu.dataset.chatId = chat.id;
        menu.innerHTML = `
            <button class="chat-menu-item" data-action="pin">
                <i data-lucide="pin"></i> ${chat.pinned ? 'Открепить' : 'Закрепить'}
            </button>
            <button class="chat-menu-item" data-action="rename">
                <i data-lucide="edit-2"></i> Редактировать
            </button>
            <button class="chat-menu-item danger" data-action="delete">
                <i data-lucide="trash-2"></i> Удалить
            </button>
        `;
        
        menu.querySelectorAll('.chat-menu-item').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.dataset.action;
                handleChatAction(action, chat.id, chat.title, chat.pinned);
                closeAllChatMenus();
            });
        });
        
        menuContainer.appendChild(menu);
        
        item.appendChild(infoDiv);
        item.appendChild(menuContainer);
        listEl.appendChild(item);
    }
    
    container.appendChild(listEl);
    
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 50);
}

// ==========================================
// УПРАВЛЕНИЕ МЕНЮ ЧАТА
// ==========================================

let activeChatMenu = null;

function toggleChatMenu(chatId, container) {
    const menu = container.querySelector('.chat-menu');
    if (!menu) return;
    closeAllChatMenus();
    menu.classList.toggle('open');
    if (menu.classList.contains('open')) {
        activeChatMenu = menu;
    } else {
        activeChatMenu = null;
    }
}

function closeAllChatMenus() {
    document.querySelectorAll('.chat-menu').forEach(m => m.classList.remove('open'));
    activeChatMenu = null;
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.chat-menu-container')) {
        closeAllChatMenus();
    }
});

// ==========================================
// ДЕЙСТВИЯ С ЧАТАМИ
// ==========================================

function handleChatAction(action, chatId, chatTitle, isPinned) {
    switch (action) {
        case 'pin':
            togglePinChat(chatId, !isPinned);
            break;
        case 'rename':
            renameChatFromDrawer(chatId, chatTitle);
            break;
        case 'delete':
            deleteChatFromDrawer(chatId);
            break;
        default:
            break;
    }
}

function togglePinChat(chatId, pinned) {
    const found = window.chatStore?.findChatById(chatId);
    if (!found) return;
    found.chat.pinned = pinned;
    window.chatStore.save();
    renderChatsInDrawer();
    if (window.uiRenderer) {
        window.uiRenderer.showToast(pinned ? '📌 Чат закреплен' : '📌 Чат откреплен', 'success', 1500);
    }
}

// ==========================================
// В ФУНКЦИИ renameChatFromDrawer (app.js)
// ==========================================

function renameChatFromDrawer(chatId, currentTitle) {
    const newTitle = prompt('Введите новое название для чата:', currentTitle);
    
    // ✅ Если пользователь нажал "Отмена" — newTitle === null
    // ✅ Если пользователь удалил весь текст и нажал "ОК" — newTitle === ""
    // ✅ Если пользователь удалил один символ и нажал "ОК" — newTitle === "текст"
    
    // Проверяем: если newTitle === null — пользователь отменил, ничего не делаем
    if (newTitle === null) return;
    
    // Если newTitle === "" (пустая строка) — предлагаем ввести название или оставляем текущее
    if (newTitle.trim().length === 0) {
        if (window.tg?.showAlert) {
            window.tg.showAlert('Название чата не может быть пустым.');
        }
        return;
    }
    
    const trimmed = newTitle.trim();
    window.chatStore.renameChat(chatId, trimmed);
    renderChatsInDrawer();
    if (window.profileUI) {
        window.profileUI.updateChatTitle(chatId, trimmed);
    }
    if (window.uiRenderer) {
        window.uiRenderer.showToast('✏️ Чат переименован', 'success', 1500);
    }
}

function deleteChatFromDrawer(chatId) {
    const confirmMsg = window.getLangString ? window.getLangString('confirm_del_chat') : 'Удалить чат в корзину?';
    const action = () => {
        window.chatStore.deleteChat(chatId);
        if (window.userStore?.canSync() && window.chatService) {
            window.chatService.deleteChat(chatId).catch(err => {
                console.error('❌ Ошибка синхронизации удаления:', err);
            });
        }
        renderChatsInDrawer();
        if (window.profileUI) {
            window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
        }
        if (window.updateTrashCount) {
            setTimeout(window.updateTrashCount, 300);
        }
        if (window.uiRenderer) {
            window.uiRenderer.showToast('🗑️ Чат отправлен в корзину', 'info', 1500);
        }
    };
    if (window.tg?.showConfirm) {
        window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    } else if (confirm(confirmMsg)) {
        action();
    }
}

// ==========================================
// ОБНОВЛЕНИЕ МОНЕТ В САЙДБАРЕ
// ==========================================

function updateDrawerCoins() {
    const balance = window.tasksStore?.getBalance() || 0;
    const coinEl = document.getElementById('drawer-coins-amount');
    if (coinEl) coinEl.textContent = balance;
}

function updateCoinsDisplay() {
    const balance = window.tasksStore?.getBalance() || 0;
    const headerCoinEl = document.querySelector('.coin-amount');
    if (headerCoinEl) headerCoinEl.textContent = balance;
    updateDrawerCoins();
}

// ==========================================
// ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ В САЙДБАРЕ
// ==========================================

function updateDrawerUserInfo() {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const drawerAvatar = document.getElementById('drawer-avatar');
    const drawerName = document.getElementById('drawer-user-name');
    const drawerUsername = document.getElementById('drawer-user-username');
    
    if (user) {
        const avatarUrl = user.photo_url || 'https://gravatar.com/avatar/00000000000000000000000000000000?d=mp';
        if (drawerAvatar) drawerAvatar.src = avatarUrl;
        if (drawerName) drawerName.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        if (drawerUsername) drawerUsername.textContent = user.username ? '@' + user.username : '';
    }
}

function updateDrawerRole(role) {
    const roleEl = document.getElementById('drawer-user-role');
    if (!roleEl) return;
    const roleMap = {
        'trial': '🔓 Бесплатный',
        'premium': '⭐ PRO',
        'admin': 'Админ',
        'creator': 'Создатель'
    };
    roleEl.textContent = roleMap[role] || role;
}

function updateThemeLabel(theme) {
    const label = document.getElementById('drawer-theme-label');
    if (!label) return;
    const names = { 'light': 'Светлая', 'amoled': 'AMOLED' };
    label.textContent = names[theme] || 'Светлая';
}

// ==========================================
// ПЕРЕХОД В ЗАДАНИЯ ПО КЛИКУ НА МОНЕТЫ
// ==========================================

window.goToTasks = function() {
    window.closeDrawer();
    if (window.navigation) {
        window.navigation.switchTab('tasks');
    } else {
        window.moduleLoader?.load('tasks');
    }
};

// ==========================================
// ИНИЦИАЛИЗАЦИЯ САЙДБАРА
// ==========================================

function initDrawer() {
    if (!document.getElementById('drawer')) {
        const drawerHTML = `
            <div id="drawer-overlay"></div>
            <div id="drawer" style="border-radius: 0 var(--app-radius-xl) var(--app-radius-xl) 0;">
                <div class="drawer-header">
                    <div class="drawer-avatar-wrapper">
                        <img id="drawer-avatar" src="" alt="Аватар" class="drawer-avatar">
                    </div>
                    <div class="drawer-user-info">
                        <div class="drawer-user-name" id="drawer-user-name">Пользователь</div>
                        <div class="drawer-user-username" id="drawer-user-username">@username</div>
                        <div class="drawer-user-status">
                            <span class="drawer-user-role" id="drawer-user-role">🔓 Бесплатный</span>
                            <span class="drawer-coins-badge" id="drawer-coins-badge" onclick="window.goToTasks()">
                                <i data-lucide="coins"></i>
                                <span class="coin-amount" id="drawer-coins-amount">0</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div id="drawer-chats-list"></div>
                <div class="drawer-divider"></div>
                <nav class="drawer-nav">
                    <div class="drawer-nav-item" id="drawer-favorites">
                        <span class="nav-icon"><i data-lucide="star"></i></span> Избранное
                    </div>
                    <div class="drawer-nav-item" id="drawer-trash">
                        <span class="nav-icon"><i data-lucide="trash-2"></i></span> Корзина
                    </div>
                    <div class="drawer-divider"></div>
                    <div class="drawer-nav-item" id="drawer-theme-toggle">
                        <span class="nav-icon"><i data-lucide="moon"></i></span> Тема: <span id="drawer-theme-label">Светлая</span>
                    </div>
                    <div class="drawer-divider"></div>
                    <div class="drawer-nav-item" id="drawer-clear-cache">
                        <span class="nav-icon"><i data-lucide="trash-2"></i></span> Очистить кэш
                    </div>
                    <div class="drawer-version">Версия 4.5.0</div>
                </nav>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', drawerHTML);
        initDrawerHandlers();
        renderChatsInDrawer();
    }
}

function initDrawerHandlers() {
    const favoritesItem = document.getElementById('drawer-favorites');
    if (favoritesItem) {
        favoritesItem.addEventListener('click', function() {
            window.closeDrawer();
            if (window.profileUI) window.profileUI.openModalTab('favorites');
        });
    }
    
    const trashItem = document.getElementById('drawer-trash');
    if (trashItem) {
        trashItem.addEventListener('click', function() {
            window.closeDrawer();
            window.openTrashModal();
        });
    }
    
    const themeToggle = document.getElementById('drawer-theme-toggle');
    const themeLabel = document.getElementById('drawer-theme-label');
    if (themeToggle && themeLabel) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = window.themeManager?.getCurrentTheme() || 'light';
            const themes = ['light', 'amoled'];
            const currentIndex = themes.indexOf(currentTheme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            window.themeManager?.setTheme(nextTheme);
            updateThemeLabel(nextTheme);
        });
    }
    
    const clearCacheItem = document.getElementById('drawer-clear-cache');
    if (clearCacheItem) {
        clearCacheItem.addEventListener('click', function() {
            const confirmMsg = 'Очистить локальный кэш приложения?\n\n' +
                               '⚠️ Ваши НЕСИНХРОНИЗИРОВАННЫЕ данные (TRIAL) будут потеряны.\n' +
                               '☁️ Синхронизированные данные (PRO) восстановятся из облака.';
            
            const doClear = () => {
                if (window.tasksStore) {
                    window.tasksStore._data = {};
                    window.tasksStore.save();
                    window.tasksStore.clearJWT();
                }
                if (window.chatStore) {
                    window.chatStore._data = {};
                    window.chatStore.save();
                    window.chatStore.clearJWT();
                }
                if (window.userStore) {
                    window.userStore._data = {};
                    window.userStore.save();
                    window.userStore.clearJWT();
                }
                if (window.organizerStore) {
                    window.organizerStore._data = {};
                    window.organizerStore.save();
                    window.organizerStore.clearJWT();
                }
                
                localStorage.removeItem('sync_token');
                
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sync_token_') && key !== 'sync_token') {
                        localStorage.removeItem(key);
                    }
                }
                
                localStorage.removeItem('last_user_id');
                
                if (window.uiRenderer) {
                    window.uiRenderer.showToast('🧹 Кэш и токен очищены', 'success', 1500);
                }
                
                window.closeDrawer();
                setTimeout(() => location.reload(), 1000);
            };
            
            if (window.tg?.showConfirm) {
                window.tg.showConfirm(confirmMsg, (ok) => { if (ok) doClear(); });
            } else if (confirm(confirmMsg)) {
                doClear();
            }
        });
    }
}

// ==========================================
// ✅ ГЛОБАЛЬНЫЕ ПОДПИСКИ НА СОБЫТИЯ
// ==========================================

function setupGlobalEventSubscriptions() {
    const eventBus = window.eventBus;
    if (!eventBus) {
        console.warn('⚠️ EventBus не найден, глобальные подписки не настроены');
        return;
    }

    // Обновление счетчика монет в хедере и сайдбаре
    eventBus.on('tasks:balance_changed', (data) => {
        document.querySelectorAll('.coin-amount, #drawer-coins-amount, #header-coins-amount').forEach(el => {
            if (el) el.textContent = data.newBalance || 0;
        });
    });

    // Обновление роли пользователя в сайдбаре
    eventBus.on('user:role_changed', (data) => {
        const roleMap = {
            'trial': '🔓 Бесплатный',
            'premium': '⭐ PRO',
            'admin': '👑 Админ',
            'creator': '👑 Создатель'
        };
        const roleEl = document.getElementById('drawer-user-role');
        if (roleEl) {
            roleEl.textContent = roleMap[data.newRole] || data.newRole;
        }
    });

    // Обновление статуса синхронизации
    eventBus.on('sync:token_updated', () => {
        window.updateRealtimeIndicator('connected');
    });

    eventBus.on('sync:token_cleared', () => {
        window.updateRealtimeIndicator('offline');
    });

    // Обновление списка чатов в сайдбаре
    eventBus.on('chat:all_updated', () => {
        renderChatsInDrawer();
    });

    eventBus.on('chat:created', () => {
        renderChatsInDrawer();
    });

    eventBus.on('chat:deleted', () => {
        renderChatsInDrawer();
    });

    eventBus.on('chat:restored', () => {
        renderChatsInDrawer();
    });

    eventBus.on('chat:renamed', () => {
        renderChatsInDrawer();
    });

    console.log('📡 Глобальные подписки настроены');
}

// ==========================================
// ✅ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==========================================

async function initApp() {
    console.log('🔧 Начало инициализации приложения...');

    if (!isTelegramWebApp()) {
        console.log('🚫 Приложение открыто вне Telegram → показываем заглушку');
        showTelegramRequiredScreen();
        return;
    }

    // ✅ Настраиваем глобальные подписки
    setupGlobalEventSubscriptions();

    const tg = window.Telegram?.WebApp;
    if (tg) {
        try {
            tg.ready();
            tg.expand();
            if (tg.themeParams && tg.themeParams.bg_color) {
                tg.setHeaderColor(tg.themeParams.bg_color);
            }
        } catch (e) {
            console.error('Ошибка активации Telegram SDK:', e);
        }
    }

    function setTelegramInsets() {
        const root = document.documentElement;
        try {
            if (!tg) {
                root.style.setProperty('--tg-content-safe-area-top', '0px');
                root.style.setProperty('--tg-safe-bottom', '0px');
                return;
            }
            const initDataStr = tg?.initData || '';
            const isMiniApp = !!(initDataStr && initDataStr.length > 0);
            const isMobilePlatform = tg?.platform === 'ios' || tg?.platform === 'android';
            let topInset = 0;
            if (isMiniApp && isMobilePlatform) {
                topInset = tg?.contentSafeAreaInset?.top || tg?.safeAreaInset?.top || 0;
                if (topInset < 50) topInset = 75;
            } else {
                topInset = 0;
            }
            const bottomInset = isMiniApp ? (tg?.safeAreaInset?.bottom || 0) : 0;
            root.style.setProperty('--tg-content-safe-area-top', `${topInset}px`);
            root.style.setProperty('--tg-safe-bottom', `${bottomInset}px`);
        } catch (err) {
            console.error('Сбой расчета безопасных зон:', err);
            root.style.setProperty('--tg-content-safe-area-top', '0px');
            root.style.setProperty('--tg-safe-bottom', '0px');
        }
    }

    setTelegramInsets();
    setTimeout(setTelegramInsets, 150);
    setTimeout(setTelegramInsets, 450);

    initDrawer();
    updateDrawerUserInfo();

    const user = tg?.initDataUnsafe?.user;
    const userStore = window.userStore;
    const chatStore = window.chatStore;

    if (user) {
        const avatarUrl = user.photo_url || 'https://gravatar.com/avatar/00000000000000000000000000000000?d=mp';
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) avatarEl.src = avatarUrl;
    }

    chatStore.load();
    userStore.load();
    if (window.organizerStore) window.organizerStore.load();
    if (window.tasksStore) window.tasksStore.load();

    if (window.chatUI) {
        const cleaned = window.chatUI.cleanupAllEmptyChats();
        if (cleaned > 0) console.log(`🧹 При загрузке очищено ${cleaned} пустых чатов`);
    }

    const uid = user?.id;
    if (!uid) {
        const appScreen = document.getElementById('app-screen');
        if (appScreen) {
            appScreen.classList.remove('hidden');
            if (appScreen.style.display === 'none') appScreen.style.display = 'flex';
        }
        return;
    }

    updateCoinsDisplay();

    if (window.authService) {
        try {
            const result = await window.authService.checkSubscription();
            const isPro = result.role === 'pro' || result.role === 'premium' || result.role === 'admin' || result.role === 'creator';
            
            const needFullReload = window.authService.needFullReload(result.syncToken);

            updateDrawerRole(result.role);

            if (needFullReload) {
                console.log('🔄 [initApp] sync_token не совпадает → полная перезапись');
                
                if (result.syncToken) {
                    localStorage.setItem('sync_token', result.syncToken);
                    console.log(`✅ sync_token сохранен после сверки: ${result.syncToken.substring(0, 8)}...`);
                }
                
                await window.fullDataReload();
            } else {
                console.log('✅ [initApp] sync_token совпадает → используем кеш');
            }

            renderChatsInDrawer();
            updateDrawerUserInfo();
            updateDrawerCoins();
            updateCoinsDisplay();

            const previousRole = localStorage.getItem('user_role');
            const isFirstTimePro = isPro && result.syncToken === null;

            if (isFirstTimePro && previousRole === 'trial') {
                console.log('🔄 TRIAL → PRO: загружаем локальные данные в облако');
                const hasLocalData = chatStore.histories && Object.keys(chatStore.histories).length > 0;
                if (hasLocalData) {
                    if (window.chatService && window.chatService.uploadLocalDataToCloud) {
                        await window.chatService.uploadLocalDataToCloud();
                    }
                }
                const newToken = await window.refreshSyncToken?.() || result.syncToken;
                localStorage.setItem('sync_token', newToken);
                if (window.uiRenderer) {
                    window.uiRenderer.showToast('🎉 Добро пожаловать в PRO! Ваши чаты синхронизированы.', 'success', 3000);
                }
            }

            const isTrial = result.role === 'trial';
            if (isTrial && previousRole !== 'trial' && (previousRole === 'pro' || previousRole === 'premium')) {
                console.log('⚠️ PRO → TRIAL: подписка истекла');
                if (window.syncService) window.syncService.unsubscribe();
                if (result.dataDeadline) {
                    const daysLeft = Math.ceil((new Date(result.dataDeadline) - new Date()) / (1000 * 60 * 60 * 24));
                    if (window.uiRenderer) {
                        window.uiRenderer.showToast(`⚠️ Подписка истекла. Данные будут удалены через ${daysLeft} дней. Скачайте архив.`, 'warning', 5000);
                    }
                }
            }

            localStorage.setItem('user_role', result.role || 'trial');

            if (result.isMember || result.role === 'admin' || result.role === 'creator') {
                console.log(`👤 Пользователь авторизован: ${result.role}`);
                if (window.chatUI) window.chatUI.showChatInterface();
                if (isPro) {
                    console.log('🔄 Синхронизация включена (PRO)');
                    if (window.syncService) {
                        const userId = userStore.userId;
                        console.log('📡 Подписываемся на Realtime для userId:', userId);
                        window.syncService.subscribe(userId);
                    }
                    if (window.initExportButtons) window.initExportButtons();
                }
                if (window.chatUI) {
                    setTimeout(() => window.chatUI.cleanupTempChats(), 5000);
                }
            } else {
                if (window.showGuest) {
                    window.showGuest({
                        msg: '403',
                        joke: 'Для доступа к ИИ необходимо подписаться на канал!'
                    });
                }
            }

        } catch (err) {
            console.error('Ошибка проверки подписки:', err);
            if (window.chatUI) window.chatUI.showChatInterface();
        }
    } else {
        console.warn('AuthService не найден, работа в офлайн-режиме');
        if (window.chatUI) window.chatUI.showChatInterface();
    }

    if (tg) {
        tg.onEvent('message', async (message) => {
            console.log('📨 ВХОДЯЩЕЕ СООБЩЕНИЕ ОТ БОТА:', message);
            if (message.text === '🔄' && window.userStore?.canSync()) {
                console.log('✅ СИГНАЛ ОБНОВЛЕНИЯ РАСПОЗНАН!');
                if (window.uiRenderer) window.uiRenderer.showSyncStatus('syncing');
                const activeChat = chatStore.getActiveChat();
                if (activeChat && window.chatUI) window.chatUI.refreshUI();
                if (window.uiRenderer) window.uiRenderer.showSyncStatus('success');
            }
        });
        console.log('📨 Push-подписка активирована');
    }

    if (window.chatUI) {
        const hasRestored = window.chatUI.restoreLastChat();
        if (hasRestored) {
            window.chatUI.showChatInterface();
            window.chatUI.refreshUI();
        } else {
            window.chatUI.cleanupTempChats();
            window.chatUI.showChatInterface();
        }
    }

    setInterval(() => {
        if (window.chatUI) window.chatUI.cleanupTempChats();
        if (window.updateTrashCount) window.updateTrashCount();
        updateCoinsDisplay();
    }, 5 * 60 * 1000);

    window.handleNewChatClick = function() {
        const activeFilter = window.profileUI?.currentFilter || 'all';
        if (activeFilter === 'all') {
            const card = document.getElementById('profile-card');
            if (card) card.classList.add('hidden');
            if (window.tg?.BackButton) window.tg.BackButton.hide();
            if (window.chatUI) window.chatUI.createNewChat();
            return;
        }
        const topicMap = {
            'code': 'code', 'creative': 'creative', 'fast': 'fast',
            'kitchen': 'kitchen', 'analytics': 'analytics'
        };
        const topic = topicMap[activeFilter] || 'code';
        const card = document.getElementById('profile-card');
        if (card) card.classList.add('hidden');
        if (window.tg?.BackButton) window.tg.BackButton.hide();
        if (chatStore) {
            chatStore.currentTopic = topic;
            chatStore.createTempChat(topic);
        }
        if (window.chatUI) {
            window.chatUI.showChatInterface();
            window.chatUI.refreshUI();
        }
    };

    const appScreen = document.getElementById('app-screen');
    if (appScreen) {
        appScreen.classList.remove('hidden');
        if (appScreen.style.display === 'none') appScreen.style.display = 'flex';
    }

    if (window.updateTrashCount) setTimeout(window.updateTrashCount, 1000);
    if (!navigator.onLine) showOfflineBanner();

    const currentTheme = window.themeManager?.getCurrentTheme() || 'light';
    updateThemeLabel(currentTheme);

    console.log('✅ Приложение v4.5.0 успешно загружено');
}

// ==========================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!isTelegramWebApp()) {
        showTelegramRequiredScreen();
    }
    initApp().catch(err => {
        console.error('❌ Критический сбой инициализации:', err);
        const appScreen = document.getElementById('app-screen');
        if (appScreen) {
            appScreen.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;">
                    <h2 style="color:var(--app-accent-danger);font-size:24px;margin-bottom:16px;">⚠️ Ошибка загрузки</h2>
                    <p style="color:var(--app-text-secondary);font-size:16px;margin-bottom:24px;">${err.message || 'Неизвестная ошибка'}</p>
                    <button onclick="location.reload()" class="btn" style="padding:12px 32px;border-radius:12px;font-size:16px;">🔄 Перезагрузить</button>
                </div>
            `;
            appScreen.style.display = 'flex';
        }
    });
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (document.getElementById('app-screen')) {
            initApp().catch(err => console.error('❌ Критический сбой инициализации:', err));
        }
    }, 100);
}

if (window.Telegram?.WebApp?.requestFullscreen) {
    try {
        window.Telegram.WebApp.requestFullscreen();
    } catch (e) {
        console.log('ℹ️ requestFullscreen не поддерживается в этой версии Telegram WebApp');
    }
}

// ==========================================
// LUCIDE ИКОНКИ
// ==========================================

function initLucideIcons() {
    if (typeof lucide !== 'undefined') {
        try {
            lucide.createIcons();
            console.log('✅ Lucide иконки созданы');
            return true;
        } catch (e) {
            console.warn('⚠️ Ошибка создания иконок:', e);
            return false;
        }
    }
    console.warn('⚠️ Lucide не найден');
    return false;
}

setTimeout(initLucideIcons, 300);
window.addEventListener('load', initLucideIcons);
setTimeout(initLucideIcons, 1000);

console.log('✅ app.js v4.5.0 полностью загружен');
