// ============================================
// js/store/BaseStore.js
// Описание: Базовый класс для всех хранилищ с изоляцией данных
// Версия: 2.3.0 - ДОБАВЛЕНА ПОДДЕРЖКА СОБЫТИЙ
// ============================================

class BaseStore {
    constructor(storeName) {
        this.storeName = storeName || 'base';
        this._data = {};
        this._loaded = false;
        this._eventBus = window.eventBus;
    }

    // ==========================================
    // ✅ ПОЛУЧЕНИЕ ID
    // ==========================================

    getTelegramId() {
        try {
            const initData = window.Telegram?.WebApp?.initData;
            if (initData) {
                const params = new URLSearchParams(initData);
                const userStr = params.get('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(decodeURIComponent(userStr));
                        if (user?.id) return user.id;
                    } catch (e) {}
                }
            }
            
            const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
            return user?.id || null;
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // ✅ ФОРМИРОВАНИЕ КЛЮЧА (ДЛЯ ДАННЫХ С ID)
    // ==========================================

    getStorageKey(subKey = '') {
        const telegramId = this.getTelegramId();
        const id = telegramId || 'default';
        
        const prefixMap = {
            'chat': 'tg_chat_histories_',
            'user': 'user_store_data_',
            'organizer': 'organizer_',
            'tasks': 'tasks_',
            'jwt': 'jwt_token_',
            'temp': 'temp_'
        };
        const prefix = prefixMap[this.storeName] || `${this.storeName}_`;
        if (subKey) {
            return `${prefix}${id}_${subKey}`;
        }
        return `${prefix}${id}`;
    }

    // ==========================================
    // ✅ ЗАГРУЗКА/СОХРАНЕНИЕ ДАННЫХ
    // ==========================================

    load() {
        const storageKey = this.getStorageKey();
        try {
            const data = localStorage.getItem(storageKey);
            if (data) {
                try {
                    this._data = JSON.parse(data);
                } catch (parseError) {
                    console.warn(`⚠️ Ошибка парсинга ${this.storeName}:`, parseError);
                    this._data = {};
                }
            } else {
                this._data = {};
            }
            this._loaded = true;
        } catch (e) {
            console.warn(`⚠️ Ошибка загрузки ${this.storeName}:`, e);
            this._data = {};
            this._loaded = true;
        }
        return this._data;
    }

    save() {
        const storageKey = this.getStorageKey();
        try {
            localStorage.setItem(storageKey, JSON.stringify(this._data));
            // ✅ Генерируем событие об изменении данных
            this._emitChange('data:saved', { store: this.storeName });
        } catch (e) {
            console.error(`❌ Ошибка сохранения ${this.storeName}:`, e);
        }
    }

    // ==========================================
    // ✅ JWT (С ID)
    // ==========================================

    saveJWT(token) {
        const telegramId = this.getTelegramId();
        const id = telegramId || 'default';
        if (!token) {
            localStorage.removeItem(`jwt_token_${id}`);
            return;
        }
        localStorage.setItem(`jwt_token_${id}`, token);
        console.log(`🔑 JWT сохранен`);
        // ✅ Генерируем событие
        this._emitChange('auth:jwt_updated', { token: token ? 'present' : 'null' });
    }

    getJWT() {
        const telegramId = this.getTelegramId();
        const id = telegramId || 'default';
        return localStorage.getItem(`jwt_token_${id}`);
    }

    clearJWT() {
        const telegramId = this.getTelegramId();
        const id = telegramId || 'default';
        localStorage.removeItem(`jwt_token_${id}`);
        console.log(`🗑️ JWT удален`);
        this._emitChange('auth:jwt_cleared', {});
    }

    // ==========================================
    // ✅ SYNC TOKEN (ТОЛЬКО БЕЗ ID!)
    // ==========================================

    saveSyncToken(token) {
        if (!token) {
            localStorage.removeItem('sync_token');
            return;
        }
        localStorage.setItem('sync_token', token);
        console.log(`🔄 SyncToken сохранен: ${token.substring(0, 8)}...`);
        this._emitChange('sync:token_updated', { token: token.substring(0, 8) + '...' });
    }

    getSyncToken() {
        return localStorage.getItem('sync_token');
    }

    clearSyncToken() {
        localStorage.removeItem('sync_token');
        console.log(`🗑️ SyncToken удален`);
        this._emitChange('sync:token_cleared', {});
    }

    // ==========================================
    // ✅ ОЧИСТКА (ТОЛЬКО ТЕКУЩИЕ ДАННЫЕ + sync_token)
    // ==========================================

    clear() {
        const telegramId = this.getTelegramId();
        const id = telegramId || 'default';
        
        this._data = {};
        this.save();
        
        localStorage.removeItem(`jwt_token_${id}`);
        localStorage.removeItem('sync_token');
        
        console.log(`🧹 Данные ${this.storeName} и sync_token очищены для пользователя ${id}`);
        this._emitChange('store:cleared', { store: this.storeName });
    }
    
    // ==========================================
    // ✅ ОБЩИЕ МЕТОДЫ
    // ==========================================

    get(key, defaultValue = null) {
        if (!this._loaded) this.load();
        return this._data[key] !== undefined ? this._data[key] : defaultValue;
    }

    set(key, value) {
        if (!this._loaded) this.load();
        this._data[key] = value;
        this.save();
        return value;
    }

    remove(key) {
        if (!this._loaded) this.load();
        delete this._data[key];
        this.save();
    }

    has(key) {
        if (!this._loaded) this.load();
        return this._data[key] !== undefined;
    }

    getAll() {
        if (!this._loaded) this.load();
        return { ...this._data };
    }

    setAll(data) {
        this._data = { ...data };
        this.save();
    }

    reset() {
        this._data = {};
        this._loaded = false;
        console.log(`🔄 Кеш ${this.storeName} сброшен`);
        this._emitChange('store:reset', { store: this.storeName });
    }

    reload() {
        this._loaded = false;
        return this.load();
    }

    // ==========================================
    // ✅ НОВОЕ: ГЕНЕРАЦИЯ СОБЫТИЙ
    // ==========================================

    _emitChange(event, data = null) {
        if (this._eventBus) {
            this._eventBus.emit(event, data, this);
        }
    }

    // ==========================================
    // ✅ НОВОЕ: ПОДПИСКА НА СОБЫТИЯ
    // ==========================================

    on(event, callback, context = null) {
        if (this._eventBus) {
            return this._eventBus.on(event, callback, context);
        }
        return () => {};
    }

    once(event, callback, context = null) {
        if (this._eventBus) {
            return this._eventBus.once(event, callback, context);
        }
        return () => {};
    }

    off(event, listenerId) {
        if (this._eventBus) {
            return this._eventBus.off(event, listenerId);
        }
        return false;
    }

    offAll(context) {
        if (this._eventBus) {
            return this._eventBus.offAll(context);
        }
        return 0;
    }
}

window.BaseStore = BaseStore;

console.log('✅ BaseStore v2.3.0 загружен (с поддержкой событий)');
