// ============================================
// api/_lib/auth.js
// Описание: Единая аутентификация для всех Edge-функций
// Версия: 3.0.0 - поддержка JWT + Telegram
// ============================================

import { getSupabaseConfig } from './supabase-client.js';

/**
 * Валидация Telegram Init Data
 */
async function validateTelegramInitData(initData, botToken) {
    if (!initData || !botToken) return null;
    
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash) return null;
        urlParams.delete('hash');
        
        const sortedKeys = [...urlParams.keys()].sort();
        const dataCheckString = sortedKeys
            .map(key => `${key}=${urlParams.get(key)}`)
            .join('\n');
        
        const encoder = new TextEncoder();
        
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode("WebAppData"),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        
        const secretKeyBuffer = await crypto.subtle.sign(
            "HMAC",
            baseKey,
            encoder.encode(botToken)
        );
        
        const secretKey = await crypto.subtle.importKey(
            "raw",
            secretKeyBuffer,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        
        const calculatedHashBuffer = await crypto.subtle.sign(
            "HMAC",
            secretKey,
            encoder.encode(dataCheckString)
        );
        
        const calculatedHash = Array.from(new Uint8Array(calculatedHashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        if (calculatedHash !== hash) return null;
        
        const user = JSON.parse(urlParams.get('user') || '{}');
        return user.id ? user : null;
    } catch (e) {
        console.error('Telegram auth error:', e.message);
        return null;
    }
}

/**
 * ✅ ВАЛИДАЦИЯ JWT ТОКЕНА (с проверкой через Supabase)
 */
async function validateJWT(token) {
    if (!token) return null;
    
    try {
        const config = getSupabaseConfig('anon');
        const response = await fetch(`${config.url}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': config.key
            }
        });
        
        if (!response.ok) {
            console.warn('JWT validation failed:', response.status);
            return null;
        }
        
        const user = await response.json();
        return user;
    } catch (err) {
        console.error('JWT validation error:', err.message);
        return null;
    }
}

/**
 * ✅ АУТЕНТИФИКАЦИЯ С ПРИОРИТЕТОМ JWT
 */
export async function authenticate(request, requireUser = true) {
    try {
        // 1. Пытаемся получить JWT из заголовка Authorization
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const user = await validateJWT(token);
            
            if (user) {
                const telegramId = user.user_metadata?.telegram_id || 
                                   parseInt(user.email?.split('@')[0], 10);
                
                return {
                    user: user,
                    userId: telegramId,
                    authUserId: user.id,  // UUID из auth.users
                    jwtToken: token,
                    error: null
                };
            }
        }
        
        // 2. Fallback: Telegram initData
        const initData = request.headers.get('x-telegram-init-data');
        if (initData) {
            const botToken = process.env.BOT_TOKEN?.trim();
            if (botToken) {
                const tgUser = await validateTelegramInitData(initData, botToken);
                if (tgUser && tgUser.id) {
                    // Ищем пользователя в public.users по telegram_id
                    const config = getSupabaseConfig('service');
                    const userRes = await fetch(`${config.url}/rest/v1/users?telegram_id=eq.${tgUser.id}&select=id`, {
                        headers: {
                            'apikey': config.key,
                            'Authorization': `Bearer ${config.key}`
                        }
                    });
                    
                    let authUserId = null;
                    if (userRes.ok) {
                        const data = await userRes.json();
                        if (data && data.length > 0 && data[0].id) {
                            authUserId = data[0].id;
                        }
                    }
                    
                    return {
                        user: tgUser,
                        userId: parseInt(tgUser.id, 10),
                        authUserId: authUserId,
                        error: null
                    };
                }
            }
        }
        
        if (requireUser) {
            return {
                user: null,
                userId: null,
                authUserId: null,
                error: 'Unauthorized',
                status: 401
            };
        }
        
        return { user: null, userId: null, authUserId: null, error: null };
    } catch (err) {
        console.error('Authentication error:', err.message);
        return {
            user: null,
            userId: null,
            authUserId: null,
            error: err.message,
            status: 500
        };
    }
}

/**
 * Проверить, является ли пользователь администратором
 */
export async function isAdmin(userId, config = null) {
    try {
        const cfg = config || getSupabaseConfig('service');
        const result = await supabaseFetch(
            `users?telegram_id=eq.${userId}&select=role`,
            { method: 'GET' },
            cfg,
            'service'
        );
        
        if (!result || !Array.isArray(result) || result.length === 0) {
            return false;
        }
        
        const user = result[0];
        return ['admin', 'creator'].includes(user.role);
    } catch (err) {
        console.error('Failed to check admin status:', err.message);
        return false;
    }
}

/**
 * Проверить, является ли пользователь создателем (владельцем)
 */
export function isCreator(userId, creatorId = 1541531808) {
    return userId === creatorId;
}
