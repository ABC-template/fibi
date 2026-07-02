// ============================================
// js/modules/ui/chat-ui.js
// Описание: Интерфейс чата (офлайн-блокировка)
// Версия: 2.4.0 - ДОБАВЛЕНА ПОДПИСКА НА СОБЫТИЯ
// ============================================

class ChatUI {
    constructor() {
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.uiRenderer = window.uiRenderer;
        this.chatService = window.chatService;
        this.eventBus = window.eventBus;
        this._isRestoring = false;
        this.isOffline = !navigator.onLine;
        this._subscriptions = [];
        
        // Подписываемся на события
        this._subscribeToEvents();
    }

    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    _subscribeToEvents() {
        // ✅ Новое сообщение — добавляем в DOM без полного refreshUI()
        const unsubMsg = this.eventBus.on('chat:message_added', (data) => {
            const activeChat = this.chatStore.getActiveChat();
            if (activeChat && data.chatId === activeChat.id) {
                // Проверяем, не отображается ли уже это сообщение
                const existing = document.getElementById(`msg-block-${data.message.id}`);
                if (!existing) {
                    this.uiRenderer.renderMessage(
                        data.message.text,
                        data.message.type,
                        data.message.id,
                        data.message.isFavorite
                    );
                }
            }
            // Обновляем заголовок чата в истории
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
        }, this);
        this._subscriptions.push(unsubMsg);

        // ✅ Удаление сообщения
        const unsubDelMsg = this.eventBus.on('chat:message_deleted', (data) => {
            const domBlock = document.getElementById(`msg-block-${data.messageId}`);
            if (domBlock) {
                domBlock.style.transition = 'all 0.25s ease';
                domBlock.style.opacity = '0';
                domBlock.style.transform = 'scale(0.95)';
                setTimeout(() => domBlock.remove(), 250);
            }
        }, this);
        this._subscriptions.push(unsubDelMsg);

        // ✅ Переключение избранного
        const unsubFav = this.eventBus.on('chat:favorite_toggled', (data) => {
            const msgBlock = document.getElementById(`msg-block-${data.messageId}`);
            if (msgBlock) {
                const heartBtn = msgBlock.querySelector('.action-btn .lucide-heart, .action-btn .icon-heart');
                if (heartBtn) {
                    const parent = heartBtn.closest('.action-btn');
                    if (data.isFavorite) {
                        parent?.classList.add('is-favorite');
                    } else {
                        parent?.classList.remove('is-favorite');
                    }
                }
            }
            // Обновляем список избранных
            if (window.profileUI) {
                window.profileUI.renderGlobalFavorites();
            }
        }, this);
        this._subscriptions.push(unsubFav);

        // ✅ Чат создан — обновляем историю
        const unsubCreate = this.eventBus.on('chat:created', (data) => {
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
            if (this.chatStore.getActiveChat()?.id === data.chat.id) {
                this.loadActiveChatMessages();
                this.updateChatTitle(data.chat.title);
            }
        }, this);
        this._subscriptions.push(unsubCreate);

        // ✅ Чат удален/восстановлен
        const unsubDelete = this.eventBus.on('chat:deleted', (data) => {
            // Если удален активный чат, переключаемся на другой
            const activeChat = this.chatStore.getActiveChat();
            if (activeChat && activeChat.id === data.chatId) {
                const chats = this.chatStore.getChats(data.topic);
                const otherChat = chats.find(c => c.id !== data.chatId && !c.deleted_at && this.chatStore.hasRealMessages(c));
                if (otherChat) {
                    this.switchToChat(otherChat.id, data.topic);
                } else {
                    this.createNewChat();
                }
            }
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubDelete);

        const unsubRestore = this.eventBus.on('chat:restored', (data) => {
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubRestore);

        // ✅ Чат переименован
        const unsubRename = this.eventBus.on('chat:renamed', (data) => {
            const activeChat = this.chatStore.getActiveChat();
            if (activeChat && activeChat.id === data.chatId) {
                this.updateChatTitle(data.newTitle);
            }
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
        }, this);
        this._subscriptions.push(unsubRename);

        // ✅ Обновление всех чатов
        const unsubAll = this.eventBus.on('chat:all_updated', () => {
            this.refreshUI();
            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }
        }, this);
        this._subscriptions.push(unsubAll);

        console.log('📡 ChatUI подписан на события');
    }

    // ==========================================
    // УПРАВЛЕНИЕ ЗАГОЛОВКОМ
    // ==========================================

    updateChatTitle(title) {
        if (window.navigation?.getActive() === 'chat') {
            window.updateChatTitle(title);
        }
    }

    // ==========================================
    // ОСНОВНЫЕ МЕТОДЫ
    // ==========================================

    async waitForChatModule(maxWaitMs = 3000) {
        if (window.chatModule && window.chatModule.isReady) return true;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            if (window.chatModule && window.chatModule.isReady) return true;
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    }

    loadActiveChatMessages() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        container.innerHTML = '';
        const activeChat = this.chatStore.getActiveChat();
        if (!activeChat) { this.showWelcomeMessage(); return; }
        const messages = this.chatStore.getMessages(activeChat.id);
        if (messages.length === 0) { this.showWelcomeMessage(); return; }
        for (const msg of messages) {
            this.uiRenderer.renderMessage(msg.text, msg.type, msg.id, msg.isFavorite);
        }
        container.scrollTop = container.scrollHeight;
    }

    showWelcomeMessage() {
        const activeChat = this.chatStore.getActiveChat();
        if (!activeChat) return;
        const container = document.getElementById('chat-container');
        if (container) {
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
        }
        const welcomeTexts = window.welcomeTexts || {};
        const text = welcomeTexts[activeChat.topic] || 'Привет! Чем могу помочь?';
        this.uiRenderer.renderWelcome(text);
    }

async switchToChat(chatId, topic) {
    console.log(`🔄 [switchToChat] Начинаем переключение на чат ${chatId} (${topic})`);
    await this.waitForChatModule();
    
    this.deleteEmptyCurrentChat();
    const card = document.getElementById('profile-card');
    if (card) card.classList.add('hidden');
    if (window.tg?.BackButton) window.tg.BackButton.hide();
    if (this.chatStore.currentTopic !== topic) this.chatStore.currentTopic = topic;
    this.chatStore.setActiveChat(topic, chatId);
    this.refreshUI();
    this.showChatInterface();
    
    // ✅ Показываем чат (переключаем на ChatModule)
    if (window.chatModule) {
        window.chatModule.showChatView();
    }
    
    if (this.userStore.canSync() && this.chatService && navigator.onLine) {
        try {
            await this.chatService.openChat(chatId);
            this.refreshUI();
        } catch (err) {
            console.warn(`⚠️ Не удалось обновить чат ${chatId}:`, err);
        }
    }
    
    // ✅ Активируем чат в HeaderManager
    const activeChat = this.chatStore.getActiveChat();
    if (activeChat && window.headerManager) {
        window.headerManager.setTitle(activeChat.title || 'Versatile AI');
    }
}

    async switchTopic(topic) {
        this.deleteEmptyCurrentChat();
        this.chatStore.currentTopic = topic;
        const newChat = this.chatStore.createTempChat(topic);
        newChat.synced = false;
        this.chatStore.save();
        this.refreshUI();
        this.showChatInterface();
    }

    deleteEmptyCurrentChat() {
        const activeChat = this.chatStore.getActiveChat();
        if (!activeChat) return false;
        if (this.chatStore.hasRealMessages(activeChat)) return false;
        const topic = activeChat.topic || this.chatStore.currentTopic;
        this.chatStore.deleteChat(activeChat.id);
        const newChat = this.chatStore.createTempChat(topic);
        newChat.synced = false;
        this.chatStore.save();
        return true;
    }

    cleanupAllEmptyChats() {
        let cleaned = 0;
        const allChats = [];
        for (const [topic, chats] of Object.entries(this.chatStore.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;
            for (const chat of chats) allChats.push({ chat, topic });
        }
        for (const { chat, topic } of allChats) {
            if (!this.chatStore.hasRealMessages(chat)) {
                const topicChats = this.chatStore.getChats(topic);
                if (topicChats.length <= 1) continue;
                this.chatStore.deleteChat(chat.id);
                cleaned++;
            }
        }
        if (cleaned > 0) this.chatStore.save();
        return cleaned;
    }

    showChatInterface() {
        const chatContainer = document.getElementById('chat-container');
        const inputArea = document.getElementById('input-area');
        const fabBtn = document.getElementById('fab-open-input');
        const header = document.getElementById('header');
        if (chatContainer) {
            chatContainer.style.display = 'flex';
            chatContainer.style.flexDirection = 'column';
            chatContainer.style.justifyContent = 'flex-start';
            chatContainer.style.alignItems = 'flex-start';
            chatContainer.classList.add('visible');
        }
        if (inputArea) inputArea.style.display = 'flex';
        if (fabBtn) fabBtn.style.display = 'flex';
        if (header) header.classList.remove('hidden');
        this.updateOfflineState();
    }

    refreshUI() {
        if (window.applyUiLocalization) window.applyUiLocalization();
        this.loadActiveChatMessages();
        if (window.profileUI) window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
        if (window.profileUI) window.profileUI.syncContextSliderWithActiveChat();
        this.updateOfflineState();
        
        const activeChat = this.chatStore.getActiveChat();
        if (activeChat && window.navigation?.getActive() === 'chat') {
            window.updateChatTitle(activeChat.title);
        }
    }

    updateOfflineState() {
        const isOffline = !navigator.onLine;
        const sendBtn = document.querySelector('.send-btn');
        const voiceBtn = document.querySelector('.voice-btn');
        const mediaBtn = document.querySelector('.media-btn');
        const input = document.getElementById('user-input');
        if (isOffline) {
            if (sendBtn) { sendBtn.style.opacity = '0.5'; sendBtn.style.pointerEvents = 'none'; }
            if (voiceBtn) { voiceBtn.style.opacity = '0.5'; voiceBtn.style.pointerEvents = 'none'; }
            if (mediaBtn) { mediaBtn.style.opacity = '0.5'; mediaBtn.style.pointerEvents = 'none'; }
            if (input) { input.placeholder = '📴 Нет интернета...'; input.disabled = true; }
        } else {
            if (sendBtn) { sendBtn.style.opacity = '1'; sendBtn.style.pointerEvents = 'auto'; }
            if (voiceBtn) { voiceBtn.style.opacity = '1'; voiceBtn.style.pointerEvents = 'auto'; }
            if (mediaBtn) { mediaBtn.style.opacity = '1'; mediaBtn.style.pointerEvents = 'auto'; }
            if (input) {
                input.placeholder = window.getLangString ? window.getLangString('placeholder') : 'Ваш вопрос...';
                input.disabled = false;
            }
        }
        this.isOffline = isOffline;
    }

    createNewChat() {
        this.deleteEmptyCurrentChat();
        const card = document.getElementById('profile-card');
        if (card) card.classList.add('hidden');
        if (window.tg?.BackButton) window.tg.BackButton.hide();
        const newChat = this.chatStore.createTempChat();
        newChat.synced = false;
        this.chatStore.save();
        this.showChatInterface();
        this.refreshUI();
        return newChat;
    }

    saveLastChat() {
        const activeChat = this.chatStore.getActiveChat();
        if (activeChat && activeChat.synced && this.chatStore.hasRealMessages(activeChat)) {
            localStorage.setItem('last_topic', this.chatStore.currentTopic);
            localStorage.setItem(`last_chat_${this.chatStore.currentTopic}`, activeChat.id);
        } else {
            localStorage.removeItem('last_topic');
            const topic = this.chatStore.currentTopic;
            localStorage.removeItem(`last_chat_${topic}`);
        }
    }

    restoreLastChat() {
        if (this._isRestoring) return false;
        this._isRestoring = true;
        try {
            const lastTopic = localStorage.getItem('last_topic');
            if (!lastTopic) return false;
            const lastChatId = localStorage.getItem(`last_chat_${lastTopic}`);
            if (!lastChatId) return false;
            const found = this.chatStore.findChatById(lastChatId);
            if (!found) return false;
            const chat = found.chat;
            if (chat && !chat.deleted_at && this.chatStore.hasRealMessages(chat)) {
                this.chatStore.currentTopic = lastTopic;
                this.chatStore.setActiveChat(lastTopic, lastChatId);
                return true;
            }
            if (chat && !this.chatStore.hasRealMessages(chat)) {
                this.chatStore.deleteChat(lastChatId);
                localStorage.removeItem(`last_chat_${lastTopic}`);
            }
            return false;
        } finally { this._isRestoring = false; }
    }

    cleanupTempChats() { return this.cleanupAllEmptyChats(); }

    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки ChatUI:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 ChatUI отписан от событий');
    }
}

window.ChatUI = ChatUI;
window.chatUI = new ChatUI();

window.getCurrentActiveChat = function() {
    return window.chatStore?.getActiveChat() || null;
};

window.renameChat = function(event, chatId) {
    if (event) event.stopPropagation();
    if (!navigator.onLine) {
        if (window.tg?.showAlert) window.tg.showAlert('Нет интернета. Переименование недоступно.');
        return;
    }
    const found = window.chatStore.findChatById(chatId);
    if (!found) {
        console.error(`❌ Чат ${chatId} не найден`);
        if (window.tg?.showAlert) window.tg.showAlert('Чат не найден');
        return;
    }
    const currentTitle = found.chat.title || 'Без названия';
    const newTitle = prompt('Введите новое название для этого диалога:', currentTitle);
    if (newTitle && newTitle.trim().length > 0) {
        const trimmedTitle = newTitle.trim();
        const success = window.chatStore.renameChat(chatId, trimmedTitle);
        if (success) {
            if (window.profileUI) window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            if (window.userStore?.canSync() && window.chatService) {
                window.chatService.renameChat(chatId, trimmedTitle).catch(err => console.error('❌ Ошибка синхронизации:', err));
            }
            const activeChat = window.chatStore?.getActiveChat();
            if (activeChat && activeChat.id === chatId && window.navigation?.getActive() === 'chat') {
                window.updateChatTitle(trimmedTitle);
            }
            if (window.uiRenderer) window.uiRenderer.showToast('✏️ Чат переименован', 'success', 1500);
        }
    }
};

window.deleteChat = async function(event, chatId) {
    if (event) event.stopPropagation();
    if (!navigator.onLine) {
        if (window.tg?.showAlert) window.tg.showAlert('Нет интернета. Удаление недоступно.');
        return;
    }
    const found = window.chatStore.findChatById(chatId);
    if (!found) { console.error(`❌ Чат ${chatId} не найден`); return; }
    if (found.chat.deleted_at) { console.warn(`⚠️ Чат ${chatId} уже в корзине`); return; }
    const confirmMsg = window.getLangString ? window.getLangString('confirm_del_chat') : 'Удалить чат в корзину?';
    const action = async () => {
        try {
            const localSuccess = window.chatStore.deleteChat(chatId);
            if (!localSuccess) {
                console.error(`❌ Не удалось удалить чат ${chatId} локально`);
                if (window.tg?.showAlert) window.tg.showAlert('Не удалось удалить чат');
                return;
            }
            let serverSuccess = true;
            if (window.userStore?.canSync() && window.chatService) {
                try {
                    serverSuccess = await window.chatService.deleteChat(chatId);
                    if (serverSuccess) console.log(`✅ Чат ${chatId} отправлен в корзину на сервере`);
                    else console.warn(`⚠️ Чат ${chatId} удален локально, но не на сервере`);
                } catch (err) {
                    console.error(`❌ Ошибка синхронизации удаления:`, err);
                    serverSuccess = false;
                }
            }
            if (window.chatUI) window.chatUI.refreshUI();
            setTimeout(() => { if (window.updateTrashCount) window.updateTrashCount(); }, 300);
            if (window.uiRenderer) {
                window.uiRenderer.showToast(serverSuccess ? '🗑️ Чат отправлен в корзину и синхронизирован' : '🗑️ Чат отправлен в корзину', 'info', 1500);
            }
        } catch (err) {
            console.error(`❌ Ошибка удаления чата ${chatId}:`, err);
            if (window.tg?.showAlert) window.tg.showAlert('Ошибка удаления чата');
        }
    };
    if (window.tg?.showConfirm) window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    else if (confirm(confirmMsg)) action();
};

console.log('✅ ChatUI v2.4.0 загружен (с подпиской на события)');
