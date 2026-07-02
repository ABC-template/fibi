// ============================================
// js/services/messages.js
// Описание: Работа с сообщениями (HARD DELETE)
// Версия: 3.2.0 - СОХРАНЕНИЕ ТОКЕНА ПОСЛЕ ДЕЙСТВИЙ
// ============================================

class MessageService {
    constructor() {
        this.apiClient = window.apiClient;
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.chatService = window.chatService;
    }

    // ==========================================
    // ✅ СОХРАНЕНИЕ ТОКЕНА ПОСЛЕ ДЕЙСТВИЯ
    // ==========================================

    _saveSyncToken(syncToken) {
        if (syncToken) {
            localStorage.setItem('sync_token', syncToken);
            console.log(`✅ sync_token обновлен после действия: ${syncToken.substring(0, 8)}...`);
        }
    }

    // ==========================================
    // ОТПРАВКА СООБЩЕНИЯ
    // ==========================================

    async sendMessage(chatId, text, type, options = {}) {
        if (!navigator.onLine) {
            console.warn('⚠️ Нет интернета, сообщение сохраняется локально');
        }

        const found = this.chatStore.findChatById(chatId);
        if (!found) {
            console.error(`❌ Чат ${chatId} не найден`);
            return null;
        }

        const chat = found.chat;

        if (options.id) {
            console.log(`📤 [sendMessage] Сообщение уже существует (ID: ${options.id})`);

            const existingMsg = chat.messages.find(m => m.id === options.id);
            if (!existingMsg) {
                console.error(`❌ [sendMessage] Сообщение с ID ${options.id} не найдено в чате`);
                return null;
            }

            if (this.userStore.canSync()) {
                if (!chat.synced) {
                    console.log(`📤 [sendMessage] Создаем чат на сервере...`);
                    const created = await this.chatService.createChat(
                        chat.topic,
                        chat.title,
                        {
                            maxContext: chat.maxContext,
                            userRenamed: chat.userRenamed,
                            firstMessage: existingMsg,
                            existingChatId: chat.id
                        }
                    );
                    if (created) {
                        chat.synced = true;
                    }
                }

                try {
                    const result = await this.apiClient.post('/chats/actions/message', {
                        action: 'new_message',
                        chatId: chatId,
                        message: {
                            id: existingMsg.id,
                            text: existingMsg.text,
                            type: existingMsg.type,
                            isFavorite: existingMsg.isFavorite || false
                        }
                    });

                    this._saveSyncToken(result.syncToken);

                    if (result.synced || result.success) {
                        console.log(`✅ [sendMessage] Сообщение ${existingMsg.id} синхронизировано`);
                    }
                } catch (err) {
                    console.error(`❌ [sendMessage] Ошибка синхронизации:`, err);
                }
            }

            return existingMsg;
        }

        console.log(`📤 [sendMessage] Новое сообщение, создаем локально`);

        const messageId = this.chatStore.generateUUID();
        const isFirstMessage = !this.chatStore.hasRealMessages(chat);

        const message = this.chatStore.addMessage(chatId, text, type, {
            id: messageId,
            isFavorite: options.isFavorite || false,
            created_at: options.created_at || new Date().toISOString()
        });

        if (!message) return null;

        if (this.userStore.canSync()) {
            if (!chat.synced || isFirstMessage) {
                console.log(`📤 [sendMessage] Создаем чат ${chat.id} на сервере...`);

                const created = await this.chatService.createChat(
                    chat.topic,
                    chat.title,
                    {
                        maxContext: chat.maxContext,
                        userRenamed: chat.userRenamed,
                        firstMessage: message,
                        existingChatId: chat.id
                    }
                );

                if (created) {
                    chat.synced = true;
                }
            }

            try {
                const result = await this.apiClient.post('/chats/actions/message', {
                    action: 'new_message',
                    chatId: chatId,
                    message: {
                        id: message.id,
                        text: message.text,
                        type: message.type,
                        isFavorite: message.isFavorite || false
                    }
                });

                this._saveSyncToken(result.syncToken);

                if (result.synced || result.success) {
                    console.log(`✅ [sendMessage] Сообщение ${message.id} синхронизировано`);
                }
            } catch (err) {
                console.error(`❌ [sendMessage] Ошибка синхронизации:`, err);
            }
        }

        return message;
    }

    // ==========================================
    // УДАЛЕНИЕ СООБЩЕНИЯ
    // ==========================================

    async deleteMessage(chatId, messageId) {
        const deleted = this.chatStore.deleteMessage(chatId, messageId);
        if (!deleted) return false;

        if (this.userStore.canSync()) {
            try {
                const result = await this.apiClient.post('/chats/mutations/delete-with-confirm', {
                    action: 'delete_message_with_confirm',
                    messageId: messageId
                });

                this._saveSyncToken(result.syncToken);

                if (result.success) {
                    console.log(`✅ [deleteMessage] Сообщение ${messageId} удалено на сервере (HARD DELETE)`);
                } else {
                    console.warn(`⚠️ [deleteMessage] Сообщение ${messageId} удалено локально, но не на сервере`);
                }
            } catch (err) {
                console.error(`❌ [deleteMessage] Ошибка синхронизации:`, err);
            }
        }

        return true;
    }

    // ==========================================
    // ИЗБРАННОЕ
    // ==========================================

    async toggleFavorite(chatId, messageId) {
        const msg = this.chatStore.toggleFavorite(chatId, messageId);
        if (!msg) return null;

        if (this.userStore.canSync()) {
            try {
                const result = await this.apiClient.post('/chats/actions/favorite', {
                    action: 'favorite_message',
                    chatId: chatId,
                    messageId: messageId,
                    isFavorite: msg.isFavorite
                });

                this._saveSyncToken(result.syncToken);

                if (result.success) {
                    console.log(`✅ [toggleFavorite] Избранное ${messageId} синхронизировано`);
                }
            } catch (err) {
                console.error(`❌ [toggleFavorite] Ошибка синхронизации:`, err);
            }
        }

        return msg;
    }
}

window.MessageService = MessageService;
window.messageService = new MessageService();

console.log('✅ MessageService v3.2.0 загружен (сохранение токена после действий)');
