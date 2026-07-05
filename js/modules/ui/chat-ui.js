// ============================================
// js/modules/ui/chat-ui.js
// Описание: Управление чатами (компактная версия)
// Версия: 3.5.0 - адаптация под ChatListModule и ChatModule
// ============================================

class ChatUI {
    constructor() {
        this.chatStore = window.chatStore;
        this.eventBus = window.eventBus;
        this.currentTopic = 'code';
        this._subscriptions = [];
        this._subscribeToEvents();
    }

    _subscribeToEvents() {
        const update = () => this._updateLists();
        this.eventBus.on('chat:message_added', update, this);
        this.eventBus.on('chat:all_updated', update, this);
        this.eventBus.on('chat:renamed', update, this);
        this.eventBus.on('chat:deleted', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
            this._updateLists();
        }, this);
        this.eventBus.on('chat:restored', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
            this._updateLists();
        }, this);
    }

    _updateLists() {
        if (window.renderChatsInDrawer) window.renderChatsInDrawer();
        if (window.chatListModule) {
            window.chatListModule._renderRecentChats();
        }
        if (window.profileUI?.renderHistoryChatsList) {
            window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
        }
    }

    createNewChat() {
        this._deleteEmptyCurrentChat();
        const chat = this.chatStore.createTempChat();
        chat.synced = false;
        this.chatStore.save();
        this._updateLists();
        return chat;
    }

    _deleteEmptyCurrentChat() {
        const active = this.chatStore.getActiveChat();
        if (!active || this.chatStore.hasRealMessages(active)) return false;
        const topic = active.topic || this.currentTopic;
        this.chatStore.deleteChat(active.id);
        this.chatStore.save();
        return true;
    }

    cleanupAllEmptyChats() {
        let cleaned = 0;
        for (const [topic, chats] of Object.entries(this.chatStore.histories || {})) {
            if (!chats) continue;
            for (const chat of chats) {
                if (!this.chatStore.hasRealMessages(chat)) {
                    const topicChats = this.chatStore.getChats(topic);
                    if (topicChats.length > 1) {
                        this.chatStore.deleteChat(chat.id);
                        cleaned++;
                    }
                }
            }
        }
        if (cleaned > 0) this.chatStore.save();
        return cleaned;
    }

    showChatInterface() {}
    refreshUI() { this._updateLists(); }
    loadActiveChatMessages() {}

    destroy() {
        for (const unsub of this._subscriptions) unsub();
        this._subscriptions = [];
    }
}

window.ChatUI = ChatUI;
window.chatUI = new ChatUI();

window.getCurrentActiveChat = () => window.chatStore?.getActiveChat() || null;

window.renameChat = function(event, chatId) {
    if (event) event.stopPropagation();
    if (!navigator.onLine) {
        if (window.tg?.showAlert) window.tg.showAlert('Нет интернета. Переименование недоступно.');
        return;
    }
    const found = window.chatStore.findChatById(chatId);
    if (!found) {
        if (window.tg?.showAlert) window.tg.showAlert('Чат не найден');
        return;
    }
    const newTitle = prompt('Введите новое название:', found.chat.title || 'Без названия');
    if (newTitle?.trim()) {
        const trimmed = newTitle.trim();
        if (window.chatStore.renameChat(chatId, trimmed)) {
            window.chatUI._updateLists();
            if (window.userStore?.canSync() && window.chatService) {
                window.chatService.renameChat(chatId, trimmed);
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
    if (!found || found.chat.deleted_at) return;
    const confirmMsg = window.getLangString ? window.getLangString('confirm_del_chat') : 'Удалить чат в корзину?';
    const action = async () => {
        if (!window.chatStore.deleteChat(chatId)) {
            if (window.tg?.showAlert) window.tg.showAlert('Не удалось удалить чат');
            return;
        }
        if (window.userStore?.canSync() && window.chatService) {
            await window.chatService.deleteChat(chatId);
        }
        window.chatUI._updateLists();
        if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        if (window.uiRenderer) window.uiRenderer.showToast('🗑️ Чат отправлен в корзину', 'info', 1500);
        const active = window.chatStore.getActiveChat();
        if (!active || !window.chatStore.hasRealMessages(active)) {
            // Возврат в ChatListModule
            if (window.moduleLoader) {
                window.moduleLoader.load('chat-list');
            }
        }
    };
    if (window.tg?.showConfirm) {
        window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    } else if (confirm(confirmMsg)) {
        action();
    }
};

console.log('✅ ChatUI v3.5.0 загружен (адаптация под ChatListModule и ChatModule)');
