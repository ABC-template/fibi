// ============================================
// js/modules/ui/profile-ui.js
// Описание: Профиль, настройки, история чатов
// Версия: 2.3.0 - ПОЛНАЯ РЕАКТИВНОСТЬ (точечное обновление)
// ============================================

class ProfileUI {
    constructor() {
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.uiRenderer = window.uiRenderer;
        this.chatUI = window.chatUI;
        this.eventBus = window.eventBus;
        this.currentFilter = 'all';
        this._subscriptions = [];
        
        // Подписываемся на события
        this._subscribeToEvents();
    }

    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    _subscribeToEvents() {
        // ✅ Обновление списка чатов (полное)
        const unsubChats = this.eventBus.on('chat:all_updated', () => {
            this.renderHistoryChatsList(this.currentFilter || 'all');
        }, this);
        this._subscriptions.push(unsubChats);

        // ✅ Создание чата — добавляем в список
        const unsubCreated = this.eventBus.on('chat:created', (data) => {
            this._addChatToList(data.chat, data.topic);
        }, this);
        this._subscriptions.push(unsubCreated);

        // ✅ Удаление чата — удаляем из списка
        const unsubDeleted = this.eventBus.on('chat:deleted', (data) => {
            this._removeChatFromList(data.chatId);
            // Если список пуст, показываем пустое состояние
            this._checkEmptyState();
        }, this);
        this._subscriptions.push(unsubDeleted);

        // ✅ Восстановление чата — добавляем обратно
        const unsubRestored = this.eventBus.on('chat:restored', (data) => {
            this.renderHistoryChatsList(this.currentFilter || 'all');
        }, this);
        this._subscriptions.push(unsubRestored);

        // ✅ Переименование чата — обновляем название
        const unsubRenamed = this.eventBus.on('chat:renamed', (data) => {
            this._updateChatTitleInList(data.chatId, data.newTitle);
        }, this);
        this._subscriptions.push(unsubRenamed);

        // ✅ Обновление избранных
        const unsubFav = this.eventBus.on('chat:favorite_toggled', () => {
            if (document.getElementById('tab-favorites')?.classList?.contains('hidden') === false) {
                this.renderGlobalFavorites();
            }
        }, this);
        this._subscriptions.push(unsubFav);

        // ✅ Обновление лимитов
        const unsubUsage = this.eventBus.on('user:usage_incremented', (data) => {
            this._updateProfileLimits(data);
        }, this);
        this._subscriptions.push(unsubUsage);

        const unsubRole = this.eventBus.on('user:role_changed', (data) => {
            this._updateProfileLimits({ used: this.userStore.usedToday, limit: data.dailyLimit });
            this._updateRole(data.newRole);
        }, this);
        this._subscriptions.push(unsubRole);

        console.log('📡 ProfileUI подписан на события');
    }

    // ==========================================
    // ТОЧЕЧНОЕ ОБНОВЛЕНИЕ СПИСКА
    // ==========================================

    _addChatToList(chat, topic) {
        const listContainer = document.getElementById('history-chats-list');
        if (!listContainer) return;

        // Проверяем, подходит ли чат под текущий фильтр
        const activeFilter = this.currentFilter || 'all';
        if (activeFilter !== 'all' && chat.topic !== activeFilter) return;

        // Проверяем, есть ли уже такой чат в списке
        const existing = listContainer.querySelector(`[data-chat-id="${chat.id}"]`);
        if (existing) return;

        // Создаем элемент
        const chatItem = this._createChatItem(chat, topic);
        
        // Добавляем в начало списка (сортировка по времени)
        listContainer.prepend(chatItem);
        this._sortChatList();
    }

    _removeChatFromList(chatId) {
        const listContainer = document.getElementById('history-chats-list');
        if (!listContainer) return;

        const item = listContainer.querySelector(`[data-chat-id="${chatId}"]`);
        if (item) {
            item.style.transition = 'all 0.25s ease';
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => item.remove(), 250);
        }
    }

    _updateChatTitleInList(chatId, newTitle) {
        const titleElements = document.querySelectorAll(`.chat-title-text[data-chat-id="${chatId}"]`);
        titleElements.forEach(el => {
            el.textContent = newTitle;
        });
    }

    _checkEmptyState() {
        const listContainer = document.getElementById('history-chats-list');
        if (!listContainer) return;

        if (listContainer.children.length === 0) {
            listContainer.innerHTML = `<p style="color:var(--hint-color); text-align:center; padding:20px; font-size:13px;">Нет чатов в этом разделе</p>`;
        }
    }

    _sortChatList() {
        const listContainer = document.getElementById('history-chats-list');
        if (!listContainer) return;

        const items = Array.from(listContainer.children);
        items.sort((a, b) => {
            const aTime = a.dataset.updatedAt || a.dataset.createdAt || '';
            const bTime = b.dataset.updatedAt || b.dataset.createdAt || '';
            return new Date(bTime) - new Date(aTime);
        });

        items.forEach(item => listContainer.appendChild(item));
    }

    _createChatItem(chat, topic) {
        const activeMessages = (chat.messages || []).filter(m => !m.deleted_at);
        const count = activeMessages.length;
        const lastMsg = chat.messages && chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1]
            : null;
        const lastTime = lastMsg?.created_at || chat.created_at;
        const timeStr = this.formatDate(lastTime);

        const chatItem = document.createElement('div');
        chatItem.className = `chat-history-item ${chat.id === this.chatStore.activeIds[chat.topic] ? 'active' : ''}`;
        chatItem.setAttribute('onclick', `window.profileUI.switchToChat('${chat.id}', '${chat.topic}')`);
        chatItem.dataset.chatId = chat.id;
        chatItem.dataset.topic = chat.topic;
        chatItem.dataset.updatedAt = chat.updated_at || chat.created_at || '';

        const topicDisplay = window.topicShortNames?.[topic] || topic;

        chatItem.innerHTML = `
            <div style="flex:1; overflow:hidden; min-width:0;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:10px; font-weight:600; color:var(--button-color); flex-shrink:0; background:rgba(var(--tg-theme-button-color,0,136,204),0.08); padding:2px 8px; border-radius:4px;">${topicDisplay}</span>
                    <span class="chat-title-text" data-chat-id="${chat.id}" style="font-weight:500; font-size:13px;">${chat.title || 'Без названия'}</span>
                </div>
                <div style="font-size:11px; color:var(--hint-color); margin-top:2px;">${count} ${this.pluralize(count, 'сообщение', 'сообщения', 'сообщений')} • ${timeStr}</div>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0; margin-left:8px;">
                <button class="delete-chat-btn" style="opacity:0.6; font-size:13px;" onclick="event.stopPropagation(); window.renameChat(event, '${chat.id}')">✏️</button>
                <button class="delete-chat-btn" style="font-size:13px;" onclick="event.stopPropagation(); window.deleteChat(event, '${chat.id}')">🗑️</button>
            </div>
        `;

        return chatItem;
    }

    // ==========================================
    // ОБНОВЛЕНИЕ ОТОБРАЖЕНИЙ
    // ==========================================

    _updateProfileLimits(data) {
        const total = data.limit || this.userStore.dailyLimit || 0;
        const used = data.used || this.userStore.usedToday || 0;
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

    _updateRole(role) {
        const roleEl = document.getElementById('profile-role');
        if (roleEl) {
            const roleMap = {
                'trial': '🔓 Бесплатный',
                'premium': '⭐ PRO',
                'admin': '👑 Админ',
                'creator': '👑 Создатель'
            };
            roleEl.textContent = roleMap[role] || role;
        }
    }

    // ==========================================
    // ОТКРЫТИЕ ВКЛАДОК
    // ==========================================

    openModalTab(tabName) {
        const card = document.getElementById('profile-card');
        const keyArea = document.getElementById('dynamic-key-area');

        const subKey = document.getElementById('sub-footer-key');
        const subContext = document.getElementById('sub-footer-context');

        if (!card) return;
        card.classList.remove('hidden');

        document.querySelectorAll('.modal-tab').forEach(t => t.classList.add('hidden'));
        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) activeTab.classList.remove('hidden');

        if (keyArea) {
            if (tabName === 'profile') {
                keyArea.style.display = 'block';
                if (subKey) subKey.classList.remove('hidden');
                if (subContext) subContext.classList.add('hidden');
            } else if (tabName === 'chats') {
                keyArea.style.display = 'block';
                if (subKey) subKey.classList.add('hidden');
                if (subContext) subContext.classList.remove('hidden');
                if (window.syncContextSliderWithActiveChat) {
                    window.syncContextSliderWithActiveChat();
                }
            } else {
                keyArea.style.display = 'none';
            }
        }

        if (tabName === 'favorites') this.renderGlobalFavorites();
        if (tabName === 'chats') this.renderHistoryChatsList();

        if (window.tg?.BackButton) {
            window.tg.BackButton.show();
            window.tg.BackButton.offClick();
            window.tg.BackButton.onClick(() => {
                card.classList.add('hidden');
                window.tg.BackButton.hide();
            });
        }
    }

    // ==========================================
    // ИСТОРИЯ ЧАТОВ (ПОЛНЫЙ РЕНДЕР)
    // ==========================================

    renderHistoryChatsList(filterTopic) {
        const listContainer = document.getElementById('history-chats-list');
        if (!listContainer) return;

        const activeFilter = filterTopic || this.currentFilter || 'all';
        listContainer.innerHTML = '';

        let allChats = [];

        for (const [topic, chats] of Object.entries(this.chatStore.histories || {})) {
            if (!chats) continue;
            for (const chat of chats) {
                if (chat.deleted_at) continue;
                if (!chat.synced && !this.chatStore.hasRealMessages(chat)) continue;
                allChats.push({
                    ...chat,
                    topic: topic,
                    topicDisplay: window.topicShortNames?.[topic] || topic
                });
            }
        }

        if (activeFilter !== 'all') {
            allChats = allChats.filter(chat => chat.topic === activeFilter);
        }

        allChats.sort((a, b) => {
            const aTime = a.messages && a.messages.length > 0
                ? a.messages[a.messages.length - 1]?.created_at || a.created_at
                : a.created_at;
            const bTime = b.messages && b.messages.length > 0
                ? b.messages[b.messages.length - 1]?.created_at || b.created_at
                : b.created_at;
            return new Date(bTime) - new Date(aTime);
        });

        if (allChats.length === 0) {
            listContainer.innerHTML = `<p style="color:var(--hint-color); text-align:center; padding:20px; font-size:13px;">Нет чатов в этом разделе</p>`;
            return;
        }

        for (const chat of allChats) {
            const item = this._createChatItem(chat, chat.topic);
            listContainer.appendChild(item);
        }
    }

    updateChatTitle(chatId, newTitle) {
        this._updateChatTitleInList(chatId, newTitle);
    }

    applyChatFilter(topic) {
        this.currentFilter = topic;
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.topic === topic);
        });
        this.renderHistoryChatsList(topic === 'all' ? null : topic);
    }

// ==========================================
// В МЕТОДЕ switchToChat (profile-ui.js)
// ==========================================

async switchToChat(chatId, topic) {
    const card = document.getElementById('profile-card');
    if (card) card.classList.add('hidden');
    if (window.tg?.BackButton) window.tg.BackButton.hide();

    if (this.chatStore.currentTopic !== topic) {
        this.chatStore.currentTopic = topic;
        document.querySelectorAll('.tag-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.topic === topic);
        });
    }

    this.chatStore.setActiveChat(topic, chatId);

    if (this.userStore.canSync() && window.chatService && navigator.onLine) {
        await window.chatService.openChat(chatId);
    }

    this.chatUI.refreshUI();
    this.chatUI.showChatInterface();
    
    // ✅ Активируем чат в HeaderManager
    const activeChat = this.chatStore.getActiveChat();
    if (activeChat && window.headerManager) {
        window.headerManager.activateChat(activeChat.title || 'Versatile AI');
    }
}

    renderGlobalFavorites() {
        const container = document.getElementById('global-favorites-list');
        if (!container) return;

        container.innerHTML = '';
        const favorites = this.chatStore.getFavorites();

        if (favorites.length === 0) {
            container.innerHTML = `<p style="font-size:12px; color:var(--hint-color); text-align:center; margin-top:20px;">${window.getLangString ? window.getLangString('no_fav') : 'У вас пока нет избранных ответов.'}</p>`;
            return;
        }

        for (const msg of favorites) {
            const favItem = document.createElement('div');
            favItem.className = 'chat-history-item';
            favItem.style.cssText = 'background:var(--secondary-bg); padding:12px; border-radius:12px; cursor:pointer; font-size:13px; text-align:left; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between; gap:10px;';

            const cleanText = msg.text.replace(/[#*`]/g, '');
            const shortText = cleanText.length > 70 ? cleanText.substring(0, 70) + '...' : cleanText;

            const contentDiv = document.createElement('div');
            contentDiv.style.flex = '1';
            contentDiv.style.overflow = 'hidden';
            contentDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--hint-color); margin-bottom:4px; font-weight:600;">
                    <span>🤖 ${window.topicNames?.[msg.topic] || msg.topic}</span>
                    <span>📂 ${msg.chat_title}</span>
                </div>
                <div style="color:var(--text-color); line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${shortText}</div>
            `;

            contentDiv.onclick = () => {
                this.chatStore.currentTopic = msg.topic;
                this.chatStore.setActiveChat(msg.topic, msg.chat_id);
                document.getElementById('profile-card').classList.add('hidden');
                if (window.tg?.BackButton) window.tg.BackButton.hide();

                setTimeout(() => {
                    this.chatUI.refreshUI();
                    this.chatUI.showChatInterface();
                    const target = document.getElementById(`msg-block-${msg.id}`);
                    const chatCont = document.getElementById('chat-container');
                    if (chatCont && target) {
                        chatCont.scrollTo({ top: Math.max(0, target.offsetTop - 8), behavior: 'smooth' });
                        target.style.transition = 'background 0.5s';
                        target.style.background = 'rgba(var(--tg-theme-button-color,0,136,204),0.15)';
                        setTimeout(() => target.style.background = '', 1500);
                    }
                }, 300);
            };

            const unfavBtn = document.createElement('button');
            unfavBtn.className = 'delete-chat-btn';
            unfavBtn.style.fontSize = '14px';
            unfavBtn.style.padding = '4px 6px';
            unfavBtn.textContent = '❤️';
            unfavBtn.title = window.getLangString ? window.getLangString('confirm_unfav') : 'Убрать из избранного';
            unfavBtn.onclick = (e) => {
                e.stopPropagation();
                const actionUnfav = () => {
                    if (window.messageService) {
                        window.messageService.toggleFavorite(msg.chat_id, msg.id);
                    }
                    favItem.style.transition = 'all 0.25s ease';
                    favItem.style.opacity = '0';
                    favItem.style.transform = 'scale(0.95)';
                    setTimeout(() => this.renderGlobalFavorites(), 250);
                };

                const confirmMsg = window.getLangString ? window.getLangString('confirm_unfav') : 'Убрать из избранного?';
                if (window.tg?.showConfirm) {
                    window.tg.showConfirm(confirmMsg, (ok) => { if (ok) actionUnfav(); });
                } else if (confirm(confirmMsg)) {
                    actionUnfav();
                }
            };

            favItem.appendChild(contentDiv);
            favItem.appendChild(unfavBtn);
            container.appendChild(favItem);
        }
    }

    syncContextSliderWithActiveChat() {
        const slider = document.getElementById('context-slider');
        const valueLabel = document.getElementById('context-range-value');
        const helpBlock = document.getElementById('context-help-text');

        if (!slider || !valueLabel) return;
        if (helpBlock) helpBlock.classList.add('hidden');

        const activeChat = this.chatStore.getActiveChat();
        const currentContextSize = activeChat ? (activeChat.maxContext || 15) : 15;

        slider.value = currentContextSize;
        valueLabel.textContent = currentContextSize;

        const userRole = this.userStore.role || 'trial';
        const hasAccess = ['premium', 'admin', 'standard', 'creator'].includes(userRole);

        if (!hasAccess) {
            slider.disabled = true;
            slider.style.opacity = '0.5';
            slider.style.pointerEvents = 'auto';
            slider.onclick = (e) => {
                e.preventDefault();
                if (window.showBetaAlert) window.showBetaAlert();
            };
        } else {
            slider.disabled = false;
            slider.style.opacity = '1';
            slider.onclick = null;
        }
    }

    toggleContextHelp(event) {
        if (event) event.stopPropagation();
        const helpBlock = document.getElementById('context-help-text');
        if (helpBlock) helpBlock.classList.toggle('hidden');
    }

    onContextSliderChange(val) {
        const valueLabel = document.getElementById('context-range-value');
        if (valueLabel) valueLabel.textContent = val;
    }

    async saveContextSettings() {
        const slider = document.getElementById('context-slider');
        if (!slider) return;

        const userRole = this.userStore.role || 'trial';
        const hasAccess = ['premium', 'admin', 'standard', 'creator'].includes(userRole);

        if (!hasAccess) {
            if (window.showBetaAlert) window.showBetaAlert();
            this.syncContextSliderWithActiveChat();
            return;
        }

        const activeChat = this.chatStore.getActiveChat();
        if (activeChat) {
            const newContext = parseInt(slider.value, 10);
            activeChat.maxContext = newContext;
            this.chatStore.save();

            if (this.userStore.canSync() && activeChat.id && navigator.onLine) {
                if (window.chatService) {
                    await window.chatService.updateContext(activeChat.id, newContext);
                }
            }
        }
    }

    formatDate(dateStr) {
        if (!dateStr) return 'неизвестно';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diff === 0) {
            return 'сегодня ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff === 1) {
            return 'вчера ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7) {
            return diff + ' дня назад';
        } else {
            return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
        }
    }

    pluralize(count, one, two, five) {
        const n = Math.abs(count) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    }

    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки ProfileUI:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 ProfileUI отписан от событий');
    }
}

window.ProfileUI = ProfileUI;
window.profileUI = new ProfileUI();

console.log('✅ ProfileUI v2.3.0 загружен (полная реактивность)');
