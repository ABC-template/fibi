// ============================================
// js/modules/ui/profile-ui.js
// Описание: Работа с модалками (Избранное, Корзина)
// Версия: 5.1.0 - ИСПРАВЛЕНА РАБОТА С МОДАЛКАМИ И САЙДБАРОМ
// ============================================

class ProfileUI {
    constructor() {
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.eventBus = window.eventBus;
        this.navigationState = window.navigationState;
        this._subscriptions = [];
        
        this._subscribeToEvents();
    }

    // ==========================================
    // ПОДПИСКИ
    // ==========================================

    _subscribeToEvents() {
        const unsubFav = this.eventBus.on('chat:favorite_toggled', () => {
            if (window.modalManager?.isOpen()) {
                this.renderFavoritesModal();
            }
        }, this);
        this._subscriptions.push(unsubFav);

        const unsubTrash = this.eventBus.on('chat:deleted', () => {
            if (window.modalManager?.isOpen()) {
                this.renderTrashModal();
            }
        }, this);
        this._subscriptions.push(unsubTrash);

        const unsubRestore = this.eventBus.on('chat:restored', () => {
            if (window.modalManager?.isOpen()) {
                this.renderTrashModal();
            }
        }, this);
        this._subscriptions.push(unsubRestore);

        console.log('📡 ProfileUI подписан на события');
    }

    // ==========================================
    // ИЗБРАННОЕ (через модалку)
    // ==========================================

    showFavoritesModal() {
        const content = this._renderFavoritesContent();
        
        // ✅ Регистрируем модалку в navigationState
        if (this.navigationState) {
            this.navigationState.toggleModal(true, 'favorites');
        }
        
        window.showModal({
            title: '⭐ Избранное',
            content: content,
            modalId: 'favorites',
            onClose: () => {
                // ✅ Закрываем модалку через navigationState
                if (this.navigationState) {
                    this.navigationState.toggleModal(false, 'favorites');
                }
            }
        });
    }

    _renderFavoritesContent() {
        const favorites = this.chatStore.getFavorites();
        
        if (favorites.length === 0) {
            return `
                <div style="padding: 40px 20px; text-align: center; color: var(--app-text-tertiary);">
                    <i data-lucide="heart" style="width:48px;height:48px;display:block;margin:0 auto 12px;opacity:0.3;"></i>
                    <p style="font-size:14px;">У вас пока нет избранных ответов</p>
                    <p style="font-size:12px;margin-top:4px;">Нажмите ❤️ на любом сообщении ИИ, чтобы добавить его в избранное</p>
                </div>
            `;
        }

        let html = `<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">`;
        
        for (const msg of favorites) {
            const cleanText = msg.text.replace(/[#*`]/g, '');
            const shortText = cleanText.length > 80 ? cleanText.substring(0, 80) + '...' : cleanText;
            
            html += `
                <div class="fav-item" style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:12px 14px;
                    background:var(--app-bg-tertiary);
                    border-radius:12px;
                    cursor:pointer;
                    transition:all 0.2s;
                    gap:12px;
                " onclick="window.profileUI._openChatFromFavorite('${msg.chat_id}', '${msg.topic}', '${msg.id}')">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--app-text-tertiary);margin-bottom:4px;font-weight:600;">
                            <span>🤖 ${window.topicNames?.[msg.topic] || msg.topic}</span>
                            <span>📂 ${msg.chat_title}</span>
                        </div>
                        <div style="color:var(--app-text-primary);line-height:1.3;font-size:13px;word-break:break-word;">${shortText}</div>
                    </div>
                    <button class="fav-unfav-btn" style="
                        background:transparent;
                        border:none;
                        font-size:18px;
                        cursor:pointer;
                        padding:4px;
                        opacity:0.5;
                        transition:all 0.2s;
                        flex-shrink:0;
                    " onclick="event.stopPropagation(); window.profileUI._unfavorite('${msg.chat_id}', '${msg.id}')">
                        ❤️
                    </button>
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }

    // ==========================================
    // ОТКРЫТИЕ ЧАТА ИЗ ИЗБРАННОГО
    // ✅ Закрываем модалку → закрываем сайдбар → открываем чат
    // ==========================================

    _openChatFromFavorite(chatId, topic, msgId) {
        console.log(`⭐ [favorite] Открываем чат из избранного: ${chatId}, сообщение: ${msgId}`);
        
        // ✅ 1. Закрываем модалку (через navigationState)
        if (this.navigationState) {
            this.navigationState.toggleModal(false, 'favorites');
        } else if (window.modalManager) {
            window.modalManager.close();
        }
        
        // ✅ 2. Закрываем сайдбар (если открыт)
        if (this.navigationState && this.navigationState._state.isDrawerOpen) {
            this.navigationState.toggleDrawer(false);
        } else {
            // Fallback: физически закрываем
            const drawer = document.getElementById('drawer');
            const overlay = document.getElementById('drawer-overlay');
            if (drawer?.classList.contains('active')) {
                window.closeDrawer();
            }
        }
        
        // ✅ 3. Открываем чат через навигацию
        if (this.navigationState) {
            this.navigationState.openChat(chatId, topic);
        } else if (this.eventBus) {
            this.eventBus.emit('navigation:open_chat', { chatId, topic });
        } else {
            window.openChat(chatId, topic);
        }
        
        // ✅ 4. Скроллим к сообщению
        setTimeout(() => {
            const target = document.getElementById(`msg-block-${msgId}`);
            const container = document.getElementById('chat-container');
            if (container && target) {
                container.scrollTo({ top: Math.max(0, target.offsetTop - 80), behavior: 'smooth' });
                target.style.transition = 'background 0.5s';
                target.style.background = 'rgba(212,175,55,0.15)';
                setTimeout(() => target.style.background = '', 1500);
            }
        }, 500);
    }

    async _unfavorite(chatId, msgId) {
        if (window.messageService) {
            await window.messageService.toggleFavorite(chatId, msgId);
        }
        this.renderFavoritesModal();
    }

    renderFavoritesModal() {
        if (window.modalManager?.isOpen()) {
            const content = this._renderFavoritesContent();
            window.modalManager.updateContent(content);
        }
    }

    // ==========================================
    // КОРЗИНА (через модалку)
    // ==========================================

    showTrashModal() {
        const content = this._renderTrashContent();
        
        // ✅ Регистрируем модалку в navigationState
        if (this.navigationState) {
            this.navigationState.toggleModal(true, 'trash');
        }
        
        window.showModal({
            title: '🗑️ Корзина',
            content: content,
            modalId: 'trash',
            footer: `
                <button id="modal-save-btn" class="btn btn-danger" style="width:100%;">
                    🗑️ Очистить корзину полностью
                </button>
            `,
            showFooter: true,
            onSave: () => {
                this._clearAllTrash();
            },
            onClose: () => {
                // ✅ Закрываем модалку через navigationState
                if (this.navigationState) {
                    this.navigationState.toggleModal(false, 'trash');
                }
            }
        });
    }

    _renderTrashContent() {
        const trash = this.chatStore.getTrash();
        const chats = trash.chats || [];
        
        if (chats.length === 0) {
            return `
                <div style="padding: 40px 20px; text-align: center; color: var(--app-text-tertiary);">
                    <i data-lucide="trash-2" style="width:48px;height:48px;display:block;margin:0 auto 12px;opacity:0.3;"></i>
                    <p style="font-size:14px;">Корзина пуста</p>
                    <p style="font-size:12px;margin-top:4px;">Удалённые чаты будут появляться здесь</p>
                </div>
            `;
        }

        let html = `<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">`;
        
        for (const chat of chats) {
            const deletedDate = chat.deleted_at ? new Date(chat.deleted_at) : new Date();
            const dateStr = window.formatDate ? window.formatDate(deletedDate) : deletedDate.toLocaleString();
            const msgCount = chat.messages ? chat.messages.length : 0;
            
            html += `
                <div class="trash-item" style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:12px 14px;
                    background:var(--app-bg-tertiary);
                    border-radius:12px;
                    gap:10px;
                    border:1px solid var(--app-border-color-light);
                ">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:500;font-size:13px;color:var(--app-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${chat.title || 'Без названия'}
                        </div>
                        <div style="font-size:11px;color:var(--app-text-tertiary);">
                            ${chat.topic || 'unknown'} • ${dateStr} • ${msgCount} сообщений
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-shrink:0;">
                        <button class="btn" style="padding:4px 10px;font-size:11px;border-radius:6px;background:#27ae60;color:white;border:none;cursor:pointer;"
                                onclick="window.profileUI._restoreFromTrash('${chat.id}')">
                            ↩️
                        </button>
                        <button class="btn" style="padding:4px 10px;font-size:11px;border-radius:6px;background:#e74c3c;color:white;border:none;cursor:pointer;"
                                onclick="window.profileUI._permanentDelete('${chat.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }

    async _restoreFromTrash(chatId) {
        const confirmMsg = 'Восстановить этот чат и все его сообщения?';
        
        const action = async () => {
            this.chatStore.restoreChat(chatId);
            
            if (this.userStore?.canSync() && window.chatService) {
                await window.chatService.restoreChat(chatId);
            }
            
            this.renderTrashModal();
            
            if (window.uiRenderer) {
                window.uiRenderer.showToast('♻️ Чат восстановлен', 'success', 1500);
            }
        };
        
        if (window.tg?.showConfirm) {
            window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
        } else if (confirm(confirmMsg)) {
            action();
        }
    }

    async _permanentDelete(chatId) {
        const confirmMsg = 'Удалить чат навсегда? Это действие нельзя отменить!';
        
        const action = async () => {
            this.chatStore.permanentDeleteChat(chatId);
            
            if (this.userStore?.canSync() && window.chatService) {
                await window.chatService.permanentDeleteChat(chatId);
            }
            
            this.renderTrashModal();
            
            if (window.uiRenderer) {
                window.uiRenderer.showToast('🗑️ Чат удалён навсегда', 'info', 1500);
            }
        };
        
        if (window.tg?.showConfirm) {
            window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
        } else if (confirm(confirmMsg)) {
            action();
        }
    }

    async _clearAllTrash() {
        const confirmMsg = 'Очистить корзину полностью? Все чаты будут удалены навсегда!';
        
        const action = async () => {
            const trash = this.chatStore.getTrash();
            const chatIds = trash.chats.map(c => c.id);
            
            for (const chatId of chatIds) {
                this.chatStore.permanentDeleteChat(chatId);
                if (this.userStore?.canSync() && window.chatService) {
                    await window.chatService.permanentDeleteChat(chatId);
                }
            }
            
            this.renderTrashModal();
            
            if (window.uiRenderer) {
                window.uiRenderer.showToast(`🗑️ Очищено ${chatIds.length} чатов`, 'info', 1500);
            }
        };
        
        if (window.tg?.showConfirm) {
            window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
        } else if (confirm(confirmMsg)) {
            action();
        }
    }

    renderTrashModal() {
        if (window.modalManager?.isOpen()) {
            const content = this._renderTrashContent();
            window.modalManager.updateContent(content);
            
            const footer = `
                <button id="modal-save-btn" class="btn btn-danger" style="width:100%;">
                    🗑️ Очистить корзину полностью
                </button>
            `;
            window.modalManager.updateFooter(footer);
        }
    }

    // ==========================================
    // ПАМЯТЬ ЧАТА (контекст)
    // ==========================================

    showContextModal(chatId) {
        const found = this.chatStore.findChatById(chatId);
        if (!found) {
            if (window.tg?.showAlert) window.tg.showAlert('Чат не найден');
            return;
        }
        
        const chat = found.chat;
        const currentValue = chat.maxContext || 15;
        
        // ✅ Регистрируем модалку в navigationState
        if (this.navigationState) {
            this.navigationState.toggleModal(true, 'context');
        }
        
        const content = `
            <div style="padding:4px 0;">
                <p style="font-size:13px;color:var(--app-text-secondary);margin:0 0 12px 0;line-height:1.5;">
                    🧠 <strong>Память чата</strong> определяет, сколько последних сообщений ИИ учитывает при ответе.
                </p>
                <div style="background:var(--app-bg-tertiary);padding:12px;border-radius:10px;margin-bottom:16px;">
                    <div style="font-size:12px;color:var(--app-text-tertiary);line-height:1.6;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-size:16px;">⚡</span>
                            <span><strong>Меньше</strong> — быстрей ответ и экономия токенов</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">🧠</span>
                            <span><strong>Больше</strong> — ИИ идеально помнит нить беседы</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:13px;font-weight:600;color:var(--app-text-primary);">Текущее значение: <span id="context-display-value">${currentValue}</span></span>
                    <span style="font-size:11px;color:var(--app-text-tertiary);">1-40</span>
                </div>
                <input type="range" id="context-slider-modal" min="1" max="40" value="${currentValue}" 
                       style="width:100%;cursor:pointer;display:block;height:4px;border-radius:2px;background:var(--app-bg-tertiary);outline:none;"
                       oninput="document.getElementById('context-display-value').textContent = this.value">
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--app-text-tertiary);margin-top:2px;">
                    <span>1 (Выкл)</span>
                    <span>40 сообщений</span>
                </div>
            </div>
        `;
        
        const footer = `
            <button id="modal-save-btn" class="btn" style="width:100%;">💾 Сохранить</button>
        `;
        
        window.showModal({
            title: '🧠 Память чата',
            content: content,
            modalId: 'context',
            footer: footer,
            showFooter: true,
            onSave: () => {
                const slider = document.getElementById('context-slider-modal');
                if (slider) {
                    const newValue = parseInt(slider.value, 10);
                    this._saveChatContext(chatId, newValue);
                }
            },
            onClose: () => {
                // ✅ Закрываем модалку через navigationState
                if (this.navigationState) {
                    this.navigationState.toggleModal(false, 'context');
                }
            }
        });
    }

    async _saveChatContext(chatId, value) {
        const found = this.chatStore.findChatById(chatId);
        if (!found) return;
        
        found.chat.maxContext = value;
        this.chatStore.save();
        
        if (this.userStore?.canSync() && window.chatService) {
            await window.chatService.updateContext(chatId, value);
        }
        
        window.closeModal();
        
        if (window.uiRenderer) {
            window.uiRenderer.showToast(`🧠 Память обновлена: ${value} сообщений`, 'success', 1500);
        }
    }

    // ==========================================
    // ОЧИСТКА
    // ==========================================

    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки ProfileUI:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 ProfileUI отписан от событий');
    }
}

// ==========================================
// СОЗДАЁМ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР
// ==========================================

window.ProfileUI = ProfileUI;

let _puiCheckInterval = setInterval(() => {
    if (window.navigationState) {
        clearInterval(_puiCheckInterval);
        if (!window.profileUI) {
            window.profileUI = new ProfileUI();
            console.log('✅ ProfileUI создан');
        }
    }
}, 50);

setTimeout(() => {
    if (!window.profileUI) {
        window.profileUI = new ProfileUI();
        console.log('✅ ProfileUI создан (таймаут)');
    }
}, 3000);

// ==========================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ МОДАЛОК
// ==========================================

window.showFavoritesModal = function() {
    if (window.profileUI && typeof window.profileUI.showFavoritesModal === 'function') {
        window.profileUI.showFavoritesModal();
    }
};

window.showTrashModal = function() {
    if (window.profileUI && typeof window.profileUI.showTrashModal === 'function') {
        window.profileUI.showTrashModal();
    }
};

window.showContextModal = function(chatId) {
    if (window.profileUI && typeof window.profileUI.showContextModal === 'function') {
        window.profileUI.showContextModal(chatId);
    }
};

console.log('✅ ProfileUI v5.1.0 загружен');
