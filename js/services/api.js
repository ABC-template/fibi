// ============================================
// js/services/api.js
// Описание: Базовый API-клиент с JWT и sync_token
// Версия: 4.0.1 - НЕ ТРОГАЕМ СТАРЫЕ КЛЮЧИ
// ============================================

class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.initData = null;
        this.timeout = 30000;
        this.retries = 3;
        this.retryDelay = 1000;
        this.jwtToken = null;
        this.syncToken = null;
        
        this.initFromTelegram();
        this.loadTokens();
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================

    initFromTelegram() {
        const tg = window.Telegram?.WebApp;
        this.initData = tg?.initData || null;
        
        if (!this.initData) {
            console.warn('⚠️ Telegram initData не найден');
        }
    }

    // ==========================================
    // ✅ ЗАГРУЗКА ТОКЕНОВ (ТОЛЬКО БЕЗ ID)
    // ==========================================

    loadTokens() {
        // JWT ищем с ID (для изоляции)
        const telegramId = this.getTelegramId();
        if (telegramId) {
            this.jwtToken = localStorage.getItem(`jwt_token_${telegramId}`);
        } else {
            // Fallback: ищем любой JWT
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('jwt_token_')) {
                    this.jwtToken = localStorage.getItem(key);
                    break;
                }
            }
        }
        
        // ✅ sync_token — ТОЛЬКО ПО КЛЮЧУ БЕЗ ID!
        this.syncToken = localStorage.getItem('sync_token');
        
        if (this.syncToken) {
            console.log(`🔑 Найден sync_token: ${this.syncToken.substring(0, 8)}...`);
        } else {
            console.log('ℹ️ sync_token не найден');
        }
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
    // БАЗОВЫЙ ЗАПРОС
    // ==========================================

    async request(endpoint, options = {}) {
        // Загружаем свежие токены
        this.loadTokens();
        
        const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this.initData || ''
        };
        
        if (this.jwtToken) {
            headers['Authorization'] = `Bearer ${this.jwtToken}`;
        }
        
        // ✅ Отправляем sync_token если есть
        if (this.syncToken) {
            headers['x-sync-token'] = this.syncToken;
            console.log(`📤 Отправляем sync_token: ${this.syncToken.substring(0, 8)}...`);
        } else {
            console.log('📤 sync_token не отправлен (не найден)');
        }
        
        const defaultOptions = {
            method: 'GET',
            headers: headers,
            signal: AbortSignal.timeout(this.timeout)
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        };
        
        if (options.body && typeof options.body === 'object') {
            mergedOptions.body = JSON.stringify(options.body);
        }
        
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                const response = await fetch(url, mergedOptions);
                
                if (response.status === 304) {
                    return { success: true, cached: true, status: 304 };
                }
                
                if (response.status === 401 || response.status === 403) {
                    console.warn(`⚠️ Ошибка аутентификации ${response.status}, пробуем обновить JWT...`);
                    
                    const authService = window.authService;
                    if (authService) {
                        try {
                            const result = await authService.checkSubscription();
                            if (result.jwtToken) {
                                const telegramId = this.getTelegramId();
                                if (telegramId) {
                                    localStorage.setItem(`jwt_token_${telegramId}`, result.jwtToken);
                                }
                                this.jwtToken = result.jwtToken;
                                
                                if (result.syncToken) {
                                    localStorage.setItem('sync_token', result.syncToken);
                                    this.syncToken = result.syncToken;
                                }
                                
                                const newHeaders = { ...headers };
                                newHeaders['Authorization'] = `Bearer ${result.jwtToken}`;
                                if (this.syncToken) {
                                    newHeaders['x-sync-token'] = this.syncToken;
                                }
                                
                                const newOptions = { ...mergedOptions };
                                newOptions.headers = newHeaders;
                                
                                return this.request(endpoint, options);
                            }
                        } catch (refreshErr) {
                            console.error('❌ Не удалось обновить JWT:', refreshErr);
                        }
                    }
                    
                    throw new ApiError('Authentication failed', response.status);
                }
                
                const contentType = response.headers.get('content-type') || '';
                
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    let errorDetails = null;
                    
                    if (contentType.includes('application/json')) {
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorData.message || errorMessage;
                            errorDetails = errorData;
                        } catch (e) {}
                    } else {
                        try {
                            const text = await response.text();
                            if (text && text.length < 200) {
                                errorMessage = text;
                            }
                        } catch (e) {}
                    }
                    
                    console.error(`❌ API Error [${endpoint}]:`, {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorMessage,
                        details: errorDetails,
                        attempt: attempt
                    });
                    
                    throw new ApiError(errorMessage, response.status, errorDetails);
                }
                
                if (response.status === 204 || response.headers.get('content-length') === '0') {
                    return { success: true, status: 204 };
                }
                
                if (contentType.includes('application/json')) {
                    const data = await response.json();
                    return data;
                }
                
                return response;
                
            } catch (err) {
                lastError = err;
                
                if (err instanceof ApiError && err.status < 500) {
                    throw err;
                }
                
                if (attempt < this.retries && 
                    (err.name === 'AbortError' || err.name === 'TypeError' || err.message?.includes('network'))) {
                    
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`🔄 Повторная попытка ${attempt}/${this.retries} через ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                break;
            }
        }
        
        console.error(`❌ API Error [${endpoint}]: Все попытки неудачны`, lastError);
        throw lastError || new ApiError('Request failed', 500);
    }

    // ==========================================
    // ОБЕРТКИ
    // ==========================================

    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { 
            ...options, 
            method: 'POST',
            body: body
        });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { 
            ...options, 
            method: 'PUT',
            body: body
        });
    }

    async patch(endpoint, body, options = {}) {
        return this.request(endpoint, { 
            ...options, 
            method: 'PATCH',
            body: body
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // ==========================================
    // СТРИМИНГ
    // ==========================================

    async stream(endpoint, body, onChunk) {
        this.loadTokens();
        const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this.initData || ''
        };
        
        if (this.jwtToken) {
            headers['Authorization'] = `Bearer ${this.jwtToken}`;
        }
        
        if (this.syncToken) {
            headers['x-sync-token'] = this.syncToken;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Stream error ${response.status}: ${text.substring(0, 200)}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulatedText = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const jsonStr = trimmedLine.slice(6).trim();
                        if (jsonStr === '[DONE]') continue;
                        
                        try {
                            const data = JSON.parse(jsonStr);
                            const content = data.choices?.[0]?.delta?.content;
                            if (content) {
                                accumulatedText += content;
                                if (onChunk) {
                                    onChunk(content, accumulatedText);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (err) {
            console.error('Stream reading error:', err);
            throw err;
        }
        
        return accumulatedText;
    }
}

// ==========================================
// КАСТОМНАЯ ОШИБКА API
// ==========================================

class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

window.ApiClient = ApiClient;
window.ApiError = ApiError;
window.apiClient = new ApiClient();

console.log('✅ ApiClient v4.0.1 загружен (не трогаем старые ключи)');
