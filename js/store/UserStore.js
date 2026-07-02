// ============================================
// js/store/UserStore.js
// Описание: Пользователь, настройки, лимиты, устройство
// Версия: 3.1.0 - ДОБАВЛЕНА ГЕНЕРАЦИЯ СОБЫТИЙ
// ============================================

class UserStore extends BaseStore {
    constructor() {
        super('user');
        
        this.load();
        
        if (Object.keys(this._data).length === 0) {
            this._data = {
                userId: null,
                role: 'trial',
                dailyLimit: 5,
                usedToday: 0,
                syncEnabled: false,
                deviceFingerprint: null,
                signedFingerprint: null,
                deviceType: 'web',
                devicePlatform: 'web'
            };
            this.save();
        }
        
        this.initFromTelegram();
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ ИЗ TELEGRAM
    // ==========================================

    initFromTelegram() {
        const tg = window.Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;
        
        if (user) {
            const currentUserId = user.id;
            const storedUserId = this._data.userId;
            
            if (storedUserId && storedUserId !== currentUserId) {
                console.log(`🔄 Пользователь сменился: ${storedUserId} → ${currentUserId}`);
                this._data.userId = currentUserId;
                this._data.username = user.username || null;
                this._data.firstName = user.first_name || '';
                this._data.lastName = user.last_name || '';
                this._data.languageCode = user.language_code || 'ru';
                this._data.photoUrl = user.photo_url || null;
                this._data.usedToday = 0;
                this.save();
                this._emitChange('user:changed', { 
                    userId: currentUserId, 
                    username: user.username 
                });
            } else if (!storedUserId) {
                this._data.userId = currentUserId;
                this._data.username = user.username || null;
                this._data.firstName = user.first_name || '';
                this._data.lastName = user.last_name || '';
                this._data.languageCode = user.language_code || 'ru';
                this._data.photoUrl = user.photo_url || null;
                this.save();
                this._emitChange('user:created', { 
                    userId: currentUserId, 
                    username: user.username 
                });
            }
        }
    }

    // ==========================================
    // ГЕТТЕРЫ
    // ==========================================

    get userId() {
        return this._data.userId;
    }

    set userId(value) {
        this._data.userId = value;
        this.save();
    }

    get username() {
        return this._data.username;
    }

    get firstName() {
        return this._data.firstName || '';
    }

    get lastName() {
        return this._data.lastName || '';
    }

    get languageCode() {
        return this._data.languageCode || 'ru';
    }

    get photoUrl() {
        return this._data.photoUrl || null;
    }

    get role() {
        return this._data.role || 'trial';
    }

    get dailyLimit() {
        return this._data.dailyLimit || 5;
    }

    get usedToday() {
        return this._data.usedToday || 0;
    }

    get syncEnabled() {
        return this._data.syncEnabled || false;
    }

    get deviceFingerprint() {
        return this._data.deviceFingerprint || null;
    }

    get signedFingerprint() {
        return this._data.signedFingerprint || null;
    }

    get deviceType() {
        return this._data.deviceType || 'web';
    }

    get devicePlatform() {
        return this._data.devicePlatform || 'web';
    }

    get isCreator() {
        return this.userId === 1541531808;
    }

    // ==========================================
    // СЕТТЕРЫ
    // ==========================================

    setRole(role, dailyLimit, syncEnabled) {
        const oldRole = this._data.role;
        this._data.role = role;
        this._data.dailyLimit = dailyLimit;
        this._data.syncEnabled = syncEnabled;
        this.save();
        
        this._emitChange('user:role_changed', { 
            oldRole, 
            newRole: role, 
            dailyLimit, 
            syncEnabled 
        });
    }

    incrementUsage() {
        this._data.usedToday = (this._data.usedToday || 0) + 1;
        this.save();
        
        this._emitChange('user:usage_incremented', { 
            used: this._data.usedToday, 
            limit: this.dailyLimit 
        });
        
        return this._data.usedToday;
    }

    resetDailyUsage() {
        this._data.usedToday = 0;
        this.save();
        this._emitChange('user:usage_reset', {});
    }

    setDeviceFingerprint(fingerprint, signed, deviceType = 'web', platform = 'web') {
        this._data.deviceFingerprint = fingerprint;
        this._data.signedFingerprint = signed || fingerprint;
        this._data.deviceType = deviceType;
        this._data.devicePlatform = platform;
        this.save();
        this._emitChange('user:device_registered', { deviceType, platform });
    }

    getDeviceFingerprint() {
        return this._data.signedFingerprint || this._data.deviceFingerprint || null;
    }

    // ==========================================
    // ПРОВЕРКИ
    // ==========================================

    isPro() {
        return ['premium', 'admin', 'creator'].includes(this.role);
    }

    isAdmin() {
        return ['admin', 'creator'].includes(this.role);
    }

    hasUnlimited() {
        return this.dailyLimit >= 9999;
    }

    canSync() {
        return this.syncEnabled === true && this.isPro();
    }

    hasRemainingQuota() {
        if (this.hasUnlimited()) return true;
        return this.usedToday < this.dailyLimit;
    }

    getRemainingQuota() {
        if (this.hasUnlimited()) return Infinity;
        return Math.max(0, this.dailyLimit - this.usedToday);
    }

    getAvatarUrl() {
        return this.photoUrl || 'https://gravatar.com/avatar/00000000000000000000000000000000?d=mp';
    }

    getDisplayName() {
        let name = this.firstName;
        if (this.lastName) {
            name += ' ' + this.lastName;
        }
        return name || 'Пользователь';
    }
}

window.UserStore = UserStore;
window.userStore = new UserStore();

console.log('✅ UserStore v3.1.0 загружен (с генерацией событий)');
