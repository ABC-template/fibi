// ============================================
// js/modules/trash.js
// Описание: Работа с корзиной (ТОЛЬКО ЧАТЫ)
// Версия: 1.4.0 - ПОЛНАЯ РЕАКТИВНОСТЬ
// ============================================

console.log('✅ Trash module v1.4.0 загружен');

// ==========================================
// ПОДПИСКА НА СОБЫТИЯ
// ==========================================

let _trashSubscriptions = [];

function _subscribeTrashEvents() {
    _unsubscribeTrashEvents();
    
    const eventBus = window.eventBus;
    if (!eventBus) return;
    
    // ✅ Обновление счетчика при любых изменениях чатов
    const unsubDeleted = eventBus.on('chat:deleted', () => {
        _updateTrashCountReactive();
    });
    _trashSubscriptions.push(unsubDeleted);
    
    const unsubRestored = eventBus.on('chat:restored', () => {
        _updateTrashCountReactive();
    });
    _trashSubscriptions.push(unsubRestored);
    
    const unsubPermanent = eventBus.on('chat:permanent_deleted', () => {
        _updateTrashCountReactive();
        _removeTrashItemReactive(eventBus._lastData?.chatId);
    });
    _trashSubscriptions.push(unsubPermanent);
    
    const unsubTrashClear = eventBus.on('chat:trash_cleared', () => {
        _updateTrashCountReactive();
        _clearTrashListReactive();
    });
    _trashSubscriptions.push(unsubTrashClear);
    
    // ✅ Обновление списка корзины при изменении
    const unsubAll = eventBus.on('chat:all_updated', () => {
        if (document.getElementById('trash-modal')?.style?.display !== 'none') {
            window.loadTrashContent();
        }
    });
    _trashSubscriptions.push(unsubAll);
    
    console.log('📡 Trash подписан на события');
}

function _unsubscribeTrashEvents() {
    for (const unsub of _trashSubscriptions) {
        try {
            unsub();
        } catch (e) {
            console.warn('Ошибка отписки Trash:', e);
        }
    }
    _trashSubscriptions = [];
}

// ==========================================
// РЕАКТИВНОЕ ОБНОВЛЕНИЕ СЧЕТЧИКА
// ==========================================

function _updateTrashCountReactive() {
    const badge = document.getElementById('trash-count');
    if (!badge) return;

    try {
        const trash = window.chatStore?.getTrash() || { chats: [], messages: [] };
        const total = trash.chats.length;

        if (total > 0) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.style.display = 'inline-block';
            badge.classList.add('visible');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('visible');
        }
    } catch (err) {
        console.error('Ошибка обновления счетчика:', err);
        badge.style.display = 'none';
    }
}

function _removeTrashItemReactive(chatId) {
    if (!chatId) return;
    const item = document.getElementById(`trash-item-${chatId}`);
    if (item) {
        item.style.transition = 'all 0.25s ease';
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        setTimeout(() => item.remove(), 250);
    }
    // Проверяем, не пуста ли корзина
    const list = document.getElementById('trash-list');
    const empty = document.getElementById('trash-empty');
    const actions = document.getElementById('trash-actions');
    if (list && list.children.length === 0) {
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Корзина пуста';
        }
        if (actions) actions.style.display = 'none';
    }
}

function _clearTrashListReactive() {
    const list = document.getElementById('trash-list');
    const empty = document.getElementById('trash-empty');
    const actions = document.getElementById('trash-actions');
    
    if (list) list.innerHTML = '';
    if (empty) {
        empty.style.display = 'block';
        empty.textContent = 'Корзина пуста';
    }
    if (actions) actions.style.display = 'none';
}

// Выполняем подписку
_subscribeTrashEvents();

// ==========================================
// ОТКРЫТИЕ / ЗАКРЫТИЕ КОРЗИНЫ
// ==========================================

window.openTrashModal = function() {
    console.log('🗑️ Открываем корзину...');

    const modal = document.getElementById('trash-modal');
    if (!modal) {
        console.error('❌ Элемент trash-modal не найден');
        return;
    }

    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('active');

    window.loadTrashContent();
};

window.closeTrashModal = function() {
    console.log('🗑️ Закрываем корзину...');
    const modal = document.getElementById('trash-modal');
    if (!modal) return;

    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.classList.remove('active');
};

// ==========================================
// ЗАГРУЗКА СОДЕРЖИМОГО КОРЗИНЫ
// ==========================================

window.loadTrashContent = function() {
    const list = document.getElementById('trash-list');
    const empty = document.getElementById('trash-empty');
    const actions = document.getElementById('trash-actions');

    if (!list) {
        console.error('❌ trash-list не найден');
        return;
    }

    const trash = window.chatStore?.getTrash() || { chats: [], messages: [] };
    const totalChats = trash.chats.length;

    console.log(`🗑️ В корзине: ${totalChats} чатов`);

    if (totalChats === 0) {
        list.innerHTML = '';
        if (empty) {
            empty.style.display = 'block';
            empty.textContent = 'Корзина пуста';
        }
        if (actions) actions.style.display = 'none';
        _updateTrashCountReactive();
        return;
    }

    if (empty) empty.style.display = 'none';
    if (actions) actions.style.display = 'block';

    list.innerHTML = '';

    if (trash.chats && trash.chats.length > 0) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:12px; font-weight:600; color:var(--hint-color); margin:8px 0 4px; padding:4px 0; border-bottom:1px solid var(--border-color);';
        header.textContent = `📁 Чаты в корзине (${trash.chats.length})`;
        list.appendChild(header);

        for (const chat of trash.chats) {
            const item = document.createElement('div');
            item.className = 'trash-item';
            item.id = `trash-item-${chat.id}`;
            item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--secondary-bg); border-radius:10px; margin-bottom:6px; border:1px solid var(--app-border-color-light);';

            const deletedDate = chat.deleted_at ? new Date(chat.deleted_at) : new Date();
            const dateStr = window.formatDate ? window.formatDate(deletedDate) : deletedDate.toLocaleString();

            const msgCount = chat.messages ? chat.messages.length : 0;

            item.innerHTML = `
                <div style="flex:1; overflow:hidden; min-width:0;">
                    <div style="font-weight:500; font-size:13px; color:var(--text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${chat.title || 'Без названия'}
                    </div>
                    <div style="font-size:11px; color:var(--hint-color);">
                        ${chat.topic || 'unknown'} • ${dateStr} • ${msgCount} сообщений
                    </div>
                </div>
                <div style="display:flex; gap:4px; flex-shrink:0; margin-left:8px;">
                    <button class="btn" style="padding:4px 10px; font-size:11px; border-radius:6px; background:#27ae60; color:white; border:none; cursor:pointer;"
                            onclick="window.restoreFromTrash('${chat.id}')">
                        ↩️
                    </button>
                    <button class="btn" style="padding:4px 10px; font-size:11px; border-radius:6px; background:#e74c3c; color:white; border:none; cursor:pointer;"
                            onclick="window.permanentDelete('${chat.id}')">
                        🗑️
                    </button>
                </div>
            `;
            list.appendChild(item);
        }
    }

    _updateTrashCountReactive();
};

// ==========================================
// ✅ ВОССТАНОВЛЕНИЕ ЧАТА (С СИНХРОНИЗАЦИЕЙ)
// ==========================================

window.restoreFromTrash = async function(chatId) {
    if (!navigator.onLine) {
        if (window.tg?.showAlert) {
            window.tg.showAlert('Нет интернета. Восстановление недоступно.');
        }
        return;
    }

    console.log(`♻️ Восстанавливаем чат: ${chatId}`);

    const confirmMsg = 'Восстановить этот чат и все его сообщения?';

    const action = async () => {
        try {
            const localSuccess = window.chatStore.restoreChat(chatId);
            
            if (!localSuccess) {
                console.error(`❌ Не удалось восстановить чат ${chatId} локально`);
                if (window.tg?.showAlert) {
                    window.tg.showAlert('Не удалось восстановить чат');
                }
                return;
            }

            let serverSuccess = true;
            if (window.userStore?.canSync() && window.chatService) {
                try {
                    serverSuccess = await window.chatService.restoreChat(chatId);
                    if (serverSuccess) {
                        console.log(`✅ Чат ${chatId} восстановлен на сервере`);
                    } else {
                        console.warn(`⚠️ Чат ${chatId} восстановлен локально, но не на сервере`);
                    }
                } catch (err) {
                    console.error(`❌ Ошибка синхронизации восстановления:`, err);
                    serverSuccess = false;
                }
            }

            window.loadTrashContent();
            _updateTrashCountReactive();

            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }

            if (window.chatUI) {
                window.chatUI.refreshUI();
            }

            if (window.uiRenderer) {
                if (serverSuccess) {
                    window.uiRenderer.showToast('♻️ Чат восстановлен и синхронизирован', 'success', 1500);
                } else {
                    window.uiRenderer.showToast('♻️ Чат восстановлен локально', 'info', 1500);
                }
            }

            console.log(`✅ Чат ${chatId} восстановлен`);
        } catch (err) {
            console.error(`❌ Ошибка восстановления чата ${chatId}:`, err);
            if (window.tg?.showAlert) {
                window.tg.showAlert('Ошибка восстановления чата');
            }
        }
    };

    if (window.tg?.showConfirm) {
        window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    } else if (confirm(confirmMsg)) {
        action();
    }
};

// ==========================================
// ✅ БЕЗВОЗВРАТНОЕ УДАЛЕНИЕ (С СИНХРОНИЗАЦИЕЙ)
// ==========================================

window.permanentDelete = async function(chatId) {
    if (!navigator.onLine) {
        if (window.tg?.showAlert) {
            window.tg.showAlert('Нет интернета. Удаление недоступно.');
        }
        return;
    }

    console.log(`🗑️ Безвозвратно удаляем чат: ${chatId}`);

    const confirmMsg = 'Удалить чат навсегда? Это действие нельзя отменить!';

    const action = async () => {
        try {
            const localSuccess = window.chatStore.permanentDeleteChat(chatId);
            
            if (!localSuccess) {
                console.error(`❌ Не удалось удалить чат ${chatId} локально`);
                if (window.tg?.showAlert) {
                    window.tg.showAlert('Не удалось удалить чат');
                }
                return;
            }

            let serverSuccess = true;
            if (window.userStore?.canSync() && window.chatService) {
                try {
                    serverSuccess = await window.chatService.permanentDeleteChat(chatId);
                    if (serverSuccess) {
                        console.log(`✅ Чат ${chatId} удален навсегда на сервере`);
                    } else {
                        console.warn(`⚠️ Чат ${chatId} удален локально, но не на сервере`);
                    }
                } catch (err) {
                    console.error(`❌ Ошибка синхронизации HARD DELETE:`, err);
                    serverSuccess = false;
                }
            }

            window.loadTrashContent();
            _updateTrashCountReactive();

            if (window.profileUI) {
                window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
            }

            if (window.chatUI) {
                window.chatUI.refreshUI();
            }

            if (window.uiRenderer) {
                if (serverSuccess) {
                    window.uiRenderer.showToast('🗑️ Чат удален навсегда и синхронизирован', 'info', 1500);
                } else {
                    window.uiRenderer.showToast('🗑️ Чат удален локально', 'info', 1500);
                }
            }

            console.log(`✅ Чат ${chatId} удален навсегда`);
        } catch (err) {
            console.error(`❌ Ошибка HARD DELETE чата ${chatId}:`, err);
            if (window.tg?.showAlert) {
                window.tg.showAlert('Ошибка удаления чата');
            }
        }
    };

    if (window.tg?.showConfirm) {
        window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    } else if (confirm(confirmMsg)) {
        action();
    }
};

// ==========================================
// ОЧИСТКА ВСЕЙ КОРЗИНЫ
// ==========================================

window.clearAllTrash = function() {
    if (!navigator.onLine) {
        if (window.tg?.showAlert) {
            window.tg.showAlert('Нет интернета. Очистка недоступна.');
        }
        return;
    }

    const confirmMsg = 'Очистить корзину полностью? Все чаты будут удалены навсегда!';

    const action = async () => {
        console.log('🗑️ Очищаем всю корзину...');
        
        const trash = window.chatStore?.getTrash() || { chats: [] };
        const chatIds = trash.chats.map(c => c.id);
        
        for (const chatId of chatIds) {
            try {
                window.chatStore.permanentDeleteChat(chatId);
                
                if (window.userStore?.canSync() && window.chatService) {
                    await window.chatService.permanentDeleteChat(chatId);
                }
            } catch (err) {
                console.error(`❌ Ошибка удаления чата ${chatId}:`, err);
            }
        }

        window.loadTrashContent();
        _updateTrashCountReactive();

        if (window.profileUI) {
            window.profileUI.renderHistoryChatsList(window.profileUI.currentFilter || 'all');
        }

        if (window.chatUI) {
            window.chatUI.refreshUI();
        }

        console.log(`✅ Очищено ${chatIds.length} чатов`);

        if (window.uiRenderer) {
            window.uiRenderer.showToast('🗑️ Корзина очищена', 'info', 1500);
        }
    };

    if (window.tg?.showConfirm) {
        window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
    } else if (confirm(confirmMsg)) {
        action();
    }
};

// ==========================================
// ОБНОВЛЕНИЕ СЧЕТЧИКА (совместимость)
// ==========================================

window.updateTrashCount = _updateTrashCountReactive;

// Первоначальное обновление счетчика
setTimeout(_updateTrashCountReactive, 1000);

console.log('✅ Trash module v1.4.0 загружен (полная реактивность)');
