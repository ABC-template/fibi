// ============================================
// js/services/auth.js
// Описание: Сервис авторизации (с JWT и авто-рефрешем)
// Версия: 4.0.0 - УБРАНА ВСЯ ЛИШНЯЯ ЛОГИКА
// ============================================

class AuthService {
    constructor() {
        this.apiClient = window.apiClient;
        this.userStore = window.userStore;
        this.SESSION_TIMEOUT = 25 * 60 * 1000;
        this.OFFLINE_THRESHOLD = 30 * 1000;
        this.jwtToken = null;
        this.authUserId = null;
        this.syncToken = null;
        this.refreshTimeout = null;
        this.REFRESH_INTERVAL = 55 * 60 * 1000;
        
        this.startRefreshTimer();
    }

    getUserId() {
        const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
        return user?.id || null;
    }

    startRefreshTimer() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        this.refreshTimeout = setTimeout(() => {
            this.refreshJWT();
        }, this.REFRESH_INTERVAL);
    }

    async refreshJWT() {
        try {
            console.log('🔄 Автоматический рефреш JWT...');
            const result = await this.checkSubscription();
            if (result.jwtToken) {
                this.jwtToken = result.jwtToken;
                this.authUserId = result.authUserId;
                if (window.BaseStore) {
                    const tempStore = new BaseStore('temp');
                    tempStore.saveJWT(result.jwtToken);
                }
                console.log('✅ JWT обновлен');
                if (window.syncService) {
                    window.syncService.reconnect();
                }
            }
            this.startRefreshTimer();
        } catch (err) {
            console.error('❌ Ошибка рефреша JWT:', err);
            this.startRefreshTimer();
        }
    }

    async checkSubscription() {
        try {
            const data = await this.apiClient.get('/auth/check');
            
            if (data.error) {
                console.error('Ошибка проверки подписки:', data.error);
                return this.fallbackToOffline();
            }

            const newSyncToken = data.syncToken;

            if (data.jwtToken) {
                this.jwtToken = data.jwtToken;
                if (window.BaseStore) {
                    const tempStore = new BaseStore('temp');
                    tempStore.saveJWT(data.jwtToken);
                }
                console.log('✅ JWT токен сохранен');
            }

            if (data.authUserId) {
                this.authUserId = data.authUserId;
                localStorage.setItem('auth_user_id', data.authUserId);
            }

            if (newSyncToken) {
                console.log(`🔑 sync_token получен с сервера: ${newSyncToken.substring(0, 8)}... (будет сохранен после проверки)`);
            }

            this.userStore.setRole(
                data.role || 'trial',
                data.dailyLimit || 5,
                data.syncEnabled === true
            );

            if (data.userId) {
                this.userStore.userId = data.userId;
            }

            if (data.dataDeadline) {
                localStorage.setItem('data_deadline', data.dataDeadline);
            } else {
                localStorage.removeItem('data_deadline');
            }

            localStorage.setItem('user_role', data.role || 'trial');
            localStorage.setItem('session_active', 'true');
            localStorage.setItem('session_start', String(Date.now()));

            this.userStore.save();

            return {
                isMember: data.isMember !== false,
                role: data.role || 'trial',
                dailyLimit: data.dailyLimit || 5,
                syncEnabled: data.syncEnabled === true,
                syncToken: newSyncToken || null,
                dataDeadline: data.dataDeadline || null,
                jwtToken: data.jwtToken || null,
                authUserId: data.authUserId || null,
                isNewUser: data.isNewUser || false,
                serverModels: data.serverModels || {}
            };

        } catch (err) {
            console.error('Auth check error:', err);
            return this.fallbackToOffline();
        }
    }

    getJWT() {
        if (window.BaseStore) {
            const tempStore = new BaseStore('temp');
            return tempStore.getJWT();
        }
        return localStorage.getItem('jwt_token');
    }

    getAuthUserId() {
        return this.authUserId || localStorage.getItem('auth_user_id') || null;
    }

    getSyncToken() {
        if (window.BaseStore) {
            const tempStore = new BaseStore('temp');
            return tempStore.getSyncToken();
        }
        return localStorage.getItem('sync_token');
    }

    needFullReload(serverToken) {
        let localToken = null;
        if (window.BaseStore) {
            const tempStore = new BaseStore('temp');
            localToken = tempStore.getSyncToken();
        } else {
            localToken = localStorage.getItem('sync_token');
        }
        
        console.log(`🔍 needFullReload: localToken=${localToken ? localToken.substring(0, 8) + '...' : 'null'}, serverToken=${serverToken ? serverToken.substring(0, 8) + '...' : 'null'}`);
        
        if (!localToken) {
            console.log('🔄 Нет локального sync_token → полная загрузка');
            return true;
        }
        
        if (!serverToken) {
            console.log('⚠️ Нет серверного sync_token → полная загрузка');
            return true;
        }
        
        if (serverToken !== localToken) {
            console.log(`🔄 sync_token не совпадает: ${localToken.substring(0, 8)} → ${serverToken.substring(0, 8)}`);
            return true;
        }
        
        console.log('✅ sync_token совпадает → используем кеш');
        return false;
    }

    checkSession() {
        const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
        const isActive = localStorage.getItem('session_active') === 'true';
        const isExpired = (Date.now() - sessionStart) > this.SESSION_TIMEOUT;

        if (!isActive || isExpired) {
            localStorage.setItem('session_active', 'true');
            localStorage.setItem('session_start', String(Date.now()));
            return 'new_session';
        }
        return 'current_session';
    }

    logout() {
        this.jwtToken = null;
        this.authUserId = null;
        this.syncToken = null;
        if (window.BaseStore) {
            const tempStore = new BaseStore('temp');
            tempStore.clearJWT();
            tempStore.clearSyncToken();
        }
        localStorage.removeItem('auth_user_id');
        localStorage.removeItem('session_active');
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        if (window.syncService) {
            window.syncService.unsubscribe();
        }
        console.log('👋 Выход выполнен');
    }

    fallbackToOffline() {
        if (this.userStore.isCreator) {
            this.userStore.setRole('creator', 9999, true);
            this.userStore.save();
            return {
                isMember: true,
                role: 'creator',
                dailyLimit: 9999,
                syncEnabled: true,
                syncToken: this.getSyncToken() || null,
                dataDeadline: localStorage.getItem('data_deadline') || null,
                jwtToken: this.getJWT() || null,
                authUserId: localStorage.getItem('auth_user_id') || null,
                isNewUser: false,
                serverModels: {}
            };
        }

        const savedRole = localStorage.getItem('user_role');
        if (savedRole === 'admin' || savedRole === 'creator') {
            this.userStore.setRole(savedRole, 9999, true);
            this.userStore.save();
            return {
                isMember: true,
                role: savedRole,
                dailyLimit: 9999,
                syncEnabled: true,
                syncToken: this.getSyncToken() || null,
                dataDeadline: localStorage.getItem('data_deadline') || null,
                jwtToken: this.getJWT() || null,
                authUserId: localStorage.getItem('auth_user_id') || null,
                isNewUser: false,
                serverModels: {}
            };
        }

        this.userStore.setRole('guest', 0, false);
        this.userStore.save();
        return {
            isMember: false,
            role: 'guest',
            dailyLimit: 0,
            syncEnabled: false,
            syncToken: null,
            dataDeadline: null,
            jwtToken: null,
            authUserId: null,
            isNewUser: false,
            serverModels: {}
        };
    }

    async getUserStats() {
        try {
            const data = await this.apiClient.get('/users/stats');
            if (data.success && data.stats) {
                return data.stats;
            }
            return null;
        } catch (err) {
            console.error('Get user stats error:', err);
            return null;
        }
    }
}

window.AuthService = AuthService;
window.authService = new AuthService();

console.log('✅ AuthService v4.0.0 загружен (убрана лишняя логика)');
