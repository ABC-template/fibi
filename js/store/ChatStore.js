// ============================================
// js/store/ChatStore.js
// Описание: Управление чатами и сообщениями
// Версия: 4.1.0 - ДОБАВЛЕНА ГЕНЕРАЦИЯ СОБЫТИЙ
// ============================================

class ChatStore extends BaseStore {
    constructor() {
        super('chat');
        
        this.load();

        if (Object.keys(this._data).length === 0) {
            this._data = {
                histories: {},
                activeIds: {},
                currentTopic: 'code'
            };
            this.save();
        }

        if (!this._data.histories) this._data.histories = {};
        if (!this._data.activeIds) this._data.activeIds = {};
        if (!this._data.currentTopic) this._data.currentTopic = 'code';

        const topics = ['code', 'creative', 'fast', 'kitchen', 'analytics'];
        for (const topic of topics) {
            if (!this._data.activeIds[topic]) {
                this._data.activeIds[topic] = null;
            }
            if (!this._data.histories[topic]) {
                this._data.histories[topic] = [];
            }
        }
        this.save();
    }

    // ==========================================
    // ГЕТТЕРЫ
    // ==========================================

    get histories() {
        return this._data.histories;
    }

    get activeIds() {
        return this._data.activeIds;
    }

    get currentTopic() {
        return this._data.currentTopic;
    }

    set currentTopic(value) {
        this._data.currentTopic = value;
        this.save();
        this._emitChange('chat:topic_changed', { topic: value });
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ
    // ==========================================

    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ==========================================
    // ПОЛНАЯ ЗАМЕНА ДАННЫХ
    // ==========================================

    updateAllChats(cloudChats) {
        console.log(`📋 [updateAllChats] Полная замена данных: ${cloudChats?.length || 0} чатов...`);
        
        if (!cloudChats || !Array.isArray(cloudChats)) {
            console.warn('⚠️ [updateAllChats] Нет данных для обновления');
            return;
        }

        const grouped = {};
        let totalMessages = 0;
        
        for (const chat of cloudChats) {
            const chatTopic = chat.topic_id || 'fast';
            if (!grouped[chatTopic]) {
                grouped[chatTopic] = [];
            }
            
            const localChat = {
                id: chat.id,
                title: chat.title || 'Без названия',
                maxContext: chat.max_context || 15,
                language: chat.language || 'ru',
                topic: chatTopic,
                userRenamed: chat.user_renamed || false,
                synced: true,
                deleted_at: chat.deleted_at || null,
                created_at: chat.created_at || new Date().toISOString(),
                updated_at: chat.updated_at || new Date().toISOString(),
                messages: (chat.messages || []).map(m => ({
                    id: m.id,
                    text: m.text,
                    type: m.msg_type || m.type,
                    isFavorite: m.is_favorite || false,
                    deleted_at: m.deleted_at || null,
                    created_at: m.created_at || new Date().toISOString()
                }))
            };
            
            localChat.messages.sort((a, b) => {
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            });
            
            totalMessages += localChat.messages.length;
            grouped[chatTopic].push(localChat);
        }

        for (const [topicId, chats] of Object.entries(grouped)) {
            this._data.histories[topicId] = chats;
        }

        for (const [topicId] of Object.entries(this._data.histories)) {
            if (!grouped[topicId]) {
                this._data.histories[topicId] = [];
            }
        }

        for (const topicId of Object.keys(this._data.histories)) {
            const chats = this._data.histories[topicId] || [];
            const activeChat = chats.find(c => !c.deleted_at && c.messages && c.messages.length > 0);
            if (activeChat) {
                this._data.activeIds[topicId] = activeChat.id;
            } else {
                this._data.activeIds[topicId] = null;
            }
        }

        this.save();
        
        console.log(`✅ [updateAllChats] Заменено ${cloudChats.length} чатов, ${totalMessages} сообщений`);
        
        // ✅ Генерируем событие
        this._emitChange('chat:all_updated', {
            totalChats: cloudChats.length,
            totalMessages: totalMessages
        });
    }

    // ==========================================
    // ОБНОВЛЕНИЕ МЕТАДАННЫХ
    // ==========================================

    updateMetadata(cloudChats, topic = null) {
        console.log(`📋 [updateMetadata] Обновляем ${cloudChats?.length || 0} чатов из облака...`);
        
        if (!cloudChats || !Array.isArray(cloudChats)) {
            console.warn('⚠️ [updateMetadata] Нет данных для обновления');
            return;
        }

        if (topic && this._data.histories[topic]) {
            const topicChats = cloudChats.filter(c => c.topic_id === topic);
            this._data.histories[topic] = topicChats.map(chat => this._convertCloudChat(chat));
            this.save();
            console.log(`✅ [updateMetadata] Обновлена тема ${topic}: ${topicChats.length} чатов`);
            this._emitChange('chat:metadata_updated', { topic, count: topicChats.length });
            return;
        }

        const grouped = {};
        
        for (const chat of cloudChats) {
            const chatTopic = chat.topic_id || 'fast';
            if (!grouped[chatTopic]) {
                grouped[chatTopic] = [];
            }
            grouped[chatTopic].push(this._convertCloudChat(chat));
        }

        for (const [topicId, chats] of Object.entries(grouped)) {
            if (this._data.histories[topicId]) {
                this._data.histories[topicId] = chats;
            } else {
                this._data.histories[topicId] = chats;
            }
        }

        for (const [topicId] of Object.entries(this._data.histories)) {
            if (!grouped[topicId]) {
                this._data.histories[topicId] = [];
            }
        }

        this.save();
        console.log(`✅ [updateMetadata] Обновлены все темы: ${cloudChats.length} чатов`);
        this._emitChange('chat:metadata_updated', { count: cloudChats.length });
    }

    _convertCloudChat(cloudChat) {
        return {
            id: cloudChat.id,
            title: cloudChat.title || 'Без названия',
            maxContext: cloudChat.max_context || 15,
            language: cloudChat.language || 'ru',
            topic: cloudChat.topic_id || 'fast',
            userRenamed: cloudChat.user_renamed || false,
            synced: true,
            deleted_at: cloudChat.deleted_at || null,
            created_at: cloudChat.created_at || new Date().toISOString(),
            updated_at: cloudChat.updated_at || new Date().toISOString(),
            messages: []
        };
    }

    // ==========================================
    // ПОИСК
    // ==========================================

    findChatById(chatId) {
        if (!chatId) return null;
        
        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;
            
            for (const chat of chats) {
                if (chat.id === chatId) {
                    return { chat, topic };
                }
            }
        }
        return null;
    }

    findChatByMessageId(messageId) {
        if (!messageId) return null;
        
        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;
            
            for (const chat of chats) {
                if (!chat.messages || !Array.isArray(chat.messages)) continue;
                
                const found = chat.messages.find(m => m.id === messageId);
                if (found) {
                    return { chat, topic };
                }
            }
        }
        return null;
    }

    // ==========================================
    // РАБОТА С ЧАТАМИ
    // ==========================================

    getChats(topicId) {
        if (!topicId) topicId = this._data.currentTopic;
        return this._data.histories[topicId] || [];
    }

    getActiveChat(topicId) {
        if (!topicId) topicId = this._data.currentTopic;
        const chats = this.getChats(topicId);
        const activeId = this._data.activeIds[topicId];
        return chats.find(c => c.id === activeId) || null;
    }

    setActiveChat(topicId, chatId) {
        if (!topicId) topicId = this._data.currentTopic;
        this._data.activeIds[topicId] = chatId;
        this.save();
        this._emitChange('chat:active_changed', { topic: topicId, chatId: chatId });
    }

    createChat(topicId, title, options = {}) {
        if (!topicId) topicId = this._data.currentTopic;

        const sectionName = window.topicNames?.[topicId] || topicId;
        const chatTitle = title || `Новый чат в ${sectionName}`;

        const newChat = {
            id: options.id || this.generateUUID(),
            title: chatTitle,
            maxContext: options.maxContext || 15,
            language: options.language || window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || 'ru',
            topic: topicId,
            userRenamed: options.userRenamed || false,
            synced: options.synced || false,
            deleted_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: options.messages || []
        };

        if (!this._data.histories[topicId]) {
            this._data.histories[topicId] = [];
        }

        this._data.histories[topicId].unshift(newChat);
        this._data.activeIds[topicId] = newChat.id;
        this.save();

        console.log(`📝 Создан чат ${newChat.id} в теме ${topicId}`);
        this._emitChange('chat:created', { chat: newChat, topic: topicId });
        return newChat;
    }

    createTempChat(topicId) {
        if (!topicId) topicId = this._data.currentTopic;

        const existing = this._data.histories[topicId]?.find(c =>
            !c.deleted_at && (!c.messages || c.messages.length === 0)
        );

        if (existing) {
            this._data.activeIds[topicId] = existing.id;
            this.save();
            return existing;
        }

        const newChat = this.createChat(topicId, null, {
            messages: []
        });
        this.save();
        return newChat;
    }

    renameChat(chatId, newTitle) {
        const found = this.findChatById(chatId);
        if (!found) {
            console.error(`❌ Чат ${chatId} не найден для переименования`);
            return false;
        }

        const { chat, topic } = found;
        const oldTitle = chat.title;
        chat.title = newTitle.trim();
        chat.userRenamed = true;
        chat.updated_at = new Date().toISOString();
        this.save();

        console.log(`✅ Чат ${chatId} переименован в "${newTitle}"`);
        this._emitChange('chat:renamed', { 
            chatId, 
            oldTitle, 
            newTitle: chat.title,
            topic 
        });
        return true;
    }

    deleteChat(chatId) {
        const found = this.findChatById(chatId);
        if (!found) {
            console.error(`❌ Чат ${chatId} не найден для удаления`);
            return false;
        }

        const { chat, topic } = found;

        if (chat.deleted_at) {
            console.warn(`⚠️ Чат ${chatId} уже в корзине`);
            return false;
        }

        chat.deleted_at = new Date().toISOString();
        chat.updated_at = new Date().toISOString();

        if (chat.messages && Array.isArray(chat.messages)) {
            chat.messages = chat.messages.map(m => ({
                ...m,
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
        }

        if (this._data.activeIds[topic] === chatId) {
            const remaining = this._data.histories[topic].filter(c => c.id !== chatId && !c.deleted_at);
            this._data.activeIds[topic] = remaining[0]?.id || null;
        }

        this.save();
        console.log(`🗑️ Чат ${chatId} отправлен в корзину (${chat.messages?.length || 0} сообщений)`);
        this._emitChange('chat:deleted', { chatId, topic, chatTitle: chat.title });
        return true;
    }

    restoreChat(chatId) {
        const found = this.findChatById(chatId);
        if (!found) {
            console.error(`❌ Чат ${chatId} не найден для восстановления`);
            return false;
        }

        const { chat, topic } = found;

        if (!chat.deleted_at) {
            console.warn(`⚠️ Чат ${chatId} не в корзине`);
            return false;
        }

        chat.deleted_at = null;
        chat.updated_at = new Date().toISOString();

        if (chat.messages && Array.isArray(chat.messages)) {
            chat.messages = chat.messages.map(m => ({
                ...m,
                deleted_at: null,
                updated_at: new Date().toISOString()
            }));
        }

        this._data.activeIds[topic] = chatId;
        this.save();
        console.log(`♻️ Чат ${chatId} восстановлен из корзины (${chat.messages?.length || 0} сообщений)`);
        this._emitChange('chat:restored', { chatId, topic });
        return true;
    }

    permanentDeleteChat(chatId) {
        const found = this.findChatById(chatId);
        if (!found) {
            console.warn(`⚠️ Чат ${chatId} не найден для безвозвратного удаления`);
            return false;
        }

        const { chat, topic } = found;

        if (!chat.deleted_at) {
            console.warn(`⚠️ Чат ${chatId} не в корзине, удаление невозможно`);
            return false;
        }

        const chatTitle = chat.title;
        this._data.histories[topic] = this._data.histories[topic].filter(c => c.id !== chatId);

        if (this._data.activeIds[topic] === chatId) {
            const remaining = this._data.histories[topic] || [];
            this._data.activeIds[topic] = remaining[0]?.id || null;
        }

        this.save();
        console.log(`🗑️ Чат ${chatId} удален навсегда (HARD DELETE)`);
        this._emitChange('chat:permanent_deleted', { chatId, topic, chatTitle });
        return true;
    }

    deleteMessage(chatId, messageId) {
        const found = this.findChatById(chatId);
        if (!found) {
            console.error(`❌ Чат ${chatId} не найден`);
            return false;
        }

        const { chat } = found;
        const msgIndex = chat.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) {
            console.error(`❌ Сообщение ${messageId} не найдено`);
            return false;
        }

        const deletedMsg = chat.messages[msgIndex];
        chat.messages.splice(msgIndex, 1);
        chat.updated_at = new Date().toISOString();

        this.save();
        console.log(`🗑️ Сообщение ${messageId} удалено навсегда (HARD DELETE)`);
        this._emitChange('chat:message_deleted', { 
            chatId, 
            messageId,
            messageText: deletedMsg?.text?.substring(0, 50) || ''
        });
        return true;
    }

    toggleFavorite(chatId, messageId) {
        const found = this.findChatById(chatId);
        if (!found) return null;

        const { chat } = found;
        const msg = chat.messages.find(m => m.id === messageId);
        if (!msg) return null;

        msg.isFavorite = !msg.isFavorite;
        chat.updated_at = new Date().toISOString();

        this.save();
        this._emitChange('chat:favorite_toggled', { 
            chatId, 
            messageId, 
            isFavorite: msg.isFavorite,
            messageText: msg.text?.substring(0, 50) || ''
        });
        return msg;
    }

    getFavorites() {
        const favorites = [];

        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats) continue;

            for (const chat of chats) {
                if (!chat.messages) continue;
                if (chat.deleted_at) continue;

                for (const msg of chat.messages) {
                    if (msg.isFavorite && !msg.deleted_at) {
                        favorites.push({
                            ...msg,
                            chat_id: chat.id,
                            chat_title: chat.title,
                            topic: topic
                        });
                    }
                }
            }
        }

        return favorites;
    }

    getMessages(chatId) {
        const found = this.findChatById(chatId);
        if (!found) return [];

        const { chat } = found;
        return (chat.messages || []).filter(m => !m.deleted_at);
    }

    getContextMessages(chatId, maxContext = 15) {
        const messages = this.getMessages(chatId);
        return messages.slice(-maxContext);
    }

    addMessage(chatId, text, type, options = {}) {
        const found = this.findChatById(chatId);
        if (!found) return null;

        const { chat } = found;

        const newMsg = {
            id: options.id || this.generateUUID(),
            text: text,
            type: type,
            isFavorite: options.isFavorite || false,
            deleted_at: null,
            created_at: options.created_at || new Date().toISOString()
        };

        chat.messages.push(newMsg);
        chat.updated_at = new Date().toISOString();

        if (type === 'user-msg' && !chat.userRenamed) {
            const sectionName = window.topicNames?.[chat.topic] || chat.topic;
            const startTitle = `Новый чат в ${sectionName}`;
            if (chat.title === startTitle || chat.title.includes('Новый чат')) {
                const newTitle = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                chat.title = newTitle;
                chat.userRenamed = true;
            }
        }

        this.save();
        this._emitChange('chat:message_added', { 
            chatId, 
            message: newMsg,
            chatTitle: chat.title,
            topic: chat.topic
        });
        return newMsg;
    }

    hasRealMessages(chat) {
        if (!chat || !chat.messages) return false;
        return chat.messages.some(m =>
            (m.type === 'user-msg' || m.type === 'ai-msg') &&
            !m.deleted_at &&
            m.text && m.text.trim().length > 0
        );
    }

    getTrash() {
        const trash = { chats: [], messages: [] };

        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;

            for (const chat of chats) {
                if (chat.deleted_at) {
                    trash.chats.push({
                        ...chat,
                        topic: topic
                    });
                }
            }
        }

        return trash;
    }

    clearTrash() {
        let cleared = 0;

        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;

            const filtered = chats.filter(chat => {
                if (chat.deleted_at) {
                    cleared++;
                    return false;
                }
                return true;
            });

            this._data.histories[topic] = filtered;
        }

        this.save();
        console.log(`🗑️ Корзина очищена (${cleared} чатов)`);
        this._emitChange('chat:trash_cleared', { count: cleared });
        return cleared;
    }

    updateChat(chatId, data) {
        const found = this.findChatById(chatId);
        if (!found) return null;

        const { chat } = found;

        if (data.title !== undefined) chat.title = data.title;
        if (data.maxContext !== undefined) chat.maxContext = data.maxContext;
        if (data.userRenamed !== undefined) chat.userRenamed = data.userRenamed;
        if (data.messages !== undefined) chat.messages = data.messages;
        if (data.synced !== undefined) chat.synced = data.synced;

        chat.updated_at = new Date().toISOString();
        this.save();
        this._emitChange('chat:updated', { chatId, data });
        return chat;
    }

    cleanupTempChats() {
        let cleaned = 0;
        const now = new Date();
        const maxAgeMs = 5 * 60 * 1000;

        for (const [topic, chats] of Object.entries(this._data.histories || {})) {
            if (!chats || !Array.isArray(chats)) continue;

            const filtered = chats.filter(chat => {
                if (chat.deleted_at) return true;
                if (this.hasRealMessages(chat)) return true;

                const createdAt = new Date(chat.created_at);
                const age = now - createdAt;
                if (age > maxAgeMs) {
                    cleaned++;
                    return false;
                }
                return true;
            });

            if (filtered.length !== chats.length) {
                this._data.histories[topic] = filtered;
            }
        }

        if (cleaned > 0) {
            this.save();
            this._emitChange('chat:temp_cleaned', { count: cleaned });
        }
        return cleaned;
    }

    isUploadInProgress() {
        return localStorage.getItem('upload_in_progress') === 'true';
    }

    getUploadProgress() {
        return {
            total: parseInt(localStorage.getItem('upload_chats_count') || '0'),
            current: parseInt(localStorage.getItem('upload_current_index') || '0'),
            startedAt: parseInt(localStorage.getItem('upload_started_at') || '0')
        };
    }

    setUploadProgress(current, total) {
        localStorage.setItem('upload_in_progress', 'true');
        localStorage.setItem('upload_chats_count', String(total));
        localStorage.setItem('upload_current_index', String(current));
        localStorage.setItem('upload_started_at', String(Date.now()));
    }

    clearUploadFlags() {
        localStorage.removeItem('upload_in_progress');
        localStorage.removeItem('upload_started_at');
        localStorage.removeItem('upload_chats_count');
        localStorage.removeItem('upload_current_index');
    }
}

window.ChatStore = ChatStore;
window.chatStore = new ChatStore();

console.log('✅ ChatStore v4.1.0 загружен (с генерацией событий)');
