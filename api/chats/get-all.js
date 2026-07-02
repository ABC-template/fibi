// ============================================
// api/chats/get-all.js
// Описание: Получение ВСЕХ чатов с сообщениями для пользователя
// Версия: 2.0.0 - ДОБАВЛЕН ПАРАМЕТР sync ДЛЯ ОБНОВЛЕНИЯ ТОКЕНА
// ============================================

import { authenticate } from '../_lib/auth.js';
import { corsHeaders, handleCORS, jsonResponse, errorResponse } from '../_lib/cors.js';
import { getSupabaseConfig, supabaseFetch, getUserUuid, updateSyncToken, getSyncToken } from '../_lib/supabase-client.js';

export const config = { 
    runtime: 'edge',
    maxDuration: 30
};

/**
 * Получить все чаты пользователя с сообщениями
 * ✅ ВОЗВРАЩАЕТ ВСЕ ЧАТЫ, ВКЛЮЧАЯ УДАЛЕННЫЕ (deleted_at)
 */
async function getAllChatsWithMessages(userUuid, config) {
    // 1. ✅ Получаем ВСЕ чаты пользователя (без фильтра deleted_at!)
    const chats = await supabaseFetch(
        `chats?user_uuid=eq.${userUuid}&order=updated_at.desc`,
        { method: 'GET' },
        config,
        'service'
    );
    
    if (!chats || !Array.isArray(chats) || chats.length === 0) {
        return [];
    }
    
    // 2. Получаем ID всех чатов
    const chatIds = chats.map(c => c.id);
    const chatIdsStr = chatIds.join(',');
    
    // 3. ✅ Получаем ВСЕ сообщения для этих чатов (включая удаленные сообщения)
    let allMessages = [];
    if (chatIds.length > 0) {
        allMessages = await supabaseFetch(
            `messages?chat_id=in.(${chatIdsStr})&order=created_at.asc`,
            { method: 'GET' },
            config,
            'service'
        );
    }
    
    // 4. Группируем сообщения по чатам
    const messagesByChat = {};
    if (allMessages && Array.isArray(allMessages)) {
        for (const msg of allMessages) {
            if (!messagesByChat[msg.chat_id]) {
                messagesByChat[msg.chat_id] = [];
            }
            messagesByChat[msg.chat_id].push({
                id: msg.id,
                text: msg.text,
                msg_type: msg.msg_type,
                is_favorite: msg.is_favorite || false,
                created_at: msg.created_at,
                deleted_at: msg.deleted_at
            });
        }
    }
    
    // 5. Собираем полные данные
    return chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        topic_id: chat.topic_id,
        max_context: chat.max_context || 15,
        user_renamed: chat.user_renamed || false,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        deleted_at: chat.deleted_at || null,
        messages: messagesByChat[chat.id] || []
    }));
}

export default async function handler(request) {
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;
    
    if (request.method !== 'GET') {
        return errorResponse('Method Not Allowed', 405);
    }
    
    try {
        const auth = await authenticate(request);
        if (auth.error) {
            return errorResponse(auth.error, auth.status || 401);
        }
        
        const userId = auth.userId;
        const telegramId = auth.userId;
        const config = getSupabaseConfig('service');
        
        // Получаем UUID пользователя
        const userUuid = await getUserUuid(userId, config);
        if (!userUuid) {
            console.error(`❌ Не найден UUID для пользователя ${userId}`);
            return errorResponse('User not found', 404);
        }
        
        // ✅ Проверяем параметр sync
        const { searchParams } = new URL(request.url);
        const sync = searchParams.get('sync') === 'true';
        
        console.log(`📋 [get-all] Загружаем ВСЕ чаты для пользователя ${userId} (sync=${sync})`);
        
        const startTime = Date.now();
        const chats = await getAllChatsWithMessages(userUuid, config);
        const elapsed = Date.now() - startTime;
        
        // Подсчитываем статистику
        let totalMessages = 0;
        let totalDeletedChats = 0;
        for (const chat of chats) {
            totalMessages += chat.messages.length;
            if (chat.deleted_at) {
                totalDeletedChats++;
            }
        }
        
        console.log(`✅ [get-all] Загружено ${chats.length} чатов (${totalDeletedChats} в корзине), ${totalMessages} сообщений за ${elapsed}ms`);
        
        // ✅ ЕСЛИ sync=true → ПРОВЕРЯЕМ, НУЖНО ЛИ ОБНОВЛЯТЬ ТОКЕН
        let syncToken = null;
        if (sync) {
            // Получаем токен клиента из заголовка
            const clientSyncToken = request.headers.get('x-sync-token') || null;
            const dbSyncToken = await getSyncToken(telegramId, config);
            
            if (clientSyncToken !== dbSyncToken) {
                // ❌ НЕ СОВПАДАЮТ → ОБНОВЛЯЕМ!
                syncToken = await updateSyncToken(telegramId, config);
                console.log(`🔄 [get-all] sync_token обновлен (не совпадал): ${syncToken?.substring(0, 8)}...`);
            } else {
                // ✅ СОВПАДАЮТ → ОСТАВЛЯЕМ
                syncToken = dbSyncToken;
                console.log(`✅ [get-all] sync_token совпадает, обновление не требуется`);
            }
        }
        
        const responseData = {
            success: true,
            chats: chats,
            total_chats: chats.length,
            total_messages: totalMessages,
            total_deleted_chats: totalDeletedChats,
            loaded_at: new Date().toISOString(),
            syncToken: syncToken || null
        };
        
        return jsonResponse(responseData, 200, {
            'Content-Encoding': 'gzip',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        
    } catch (err) {
        console.error('Get all chats error:', err.message);
        return errorResponse(err.message, 500);
    }
}
