// ============================================
// api/chats/get.js
// Описание: Получение чата с сообщениями (с user_uuid)
// Версия: 2.0.0
// ============================================

import { authenticate } from '../_lib/auth.js';
import { corsHeaders, handleCORS, jsonResponse, errorResponse } from '../_lib/cors.js';
import { getSupabaseConfig, supabaseFetch, getUserUuid } from '../_lib/supabase-client.js';
import { isValidUUID, validateUUID } from '../_lib/validators.js';

export const config = { runtime: 'edge' };

async function getMessages(chatId, config) {
    const allMessages = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    
    while (hasMore) {
        const batch = await supabaseFetch(
            `messages?chat_id=eq.${chatId}&deleted_at=is.null&order=created_at.asc&limit=${limit}&offset=${offset}`,
            { method: 'GET' },
            config,
            'service'
        );
        
        if (batch && Array.isArray(batch) && batch.length > 0) {
            allMessages.push(...batch);
            offset += limit;
        } else {
            hasMore = false;
        }
    }
    
    return allMessages;
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
        const config = getSupabaseConfig('service');
        
        // ✅ ПОЛУЧАЕМ UUID ПОЛЬЗОВАТЕЛЯ
        const userUuid = await getUserUuid(userId, config);
        if (!userUuid) {
            console.error(`❌ Не найден UUID для пользователя ${userId}`);
            return errorResponse('User not found', 404);
        }
        
        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get('id');
        
        if (!chatId) {
            return errorResponse('Missing chat id', 400);
        }
        
        if (!isValidUUID(chatId)) {
            return errorResponse('Invalid chat ID format', 400);
        }
        
        // ✅ ИЩЕМ ЧАТ ПО user_uuid (не по user_id)
        const chat = await supabaseFetch(
            `chats?id=eq.${chatId}&user_uuid=eq.${userUuid}&deleted_at=is.null&select=*`,
            { method: 'GET' },
            config,
            'service'
        );
        
        if (!chat || !Array.isArray(chat) || chat.length === 0) {
            console.log(`❌ Чат ${chatId} не найден для пользователя ${userId} (user_uuid: ${userUuid})`);
            return errorResponse('Chat not found or access denied', 404);
        }
        
        const chatData = chat[0];
        
        const ifNoneMatch = request.headers.get('if-none-match');
        const etag = `"${chatData.updated_at || chatData.created_at}"`;
        
        if (ifNoneMatch === etag) {
            return new Response(null, {
                status: 304,
                headers: {
                    ...corsHeaders,
                    'ETag': etag
                }
            });
        }
        
        const messages = await getMessages(chatId, config);
        
        return jsonResponse({
            success: true,
            chat: chatData,
            messages: messages || []
        }, 200, {
            'ETag': etag
        });
        
    } catch (err) {
        console.error('Get chat error:', err.message);
        return errorResponse(err.message, 500);
    }
}
