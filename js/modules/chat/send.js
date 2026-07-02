// ============================================
// js/modules/chat/send.js
// Описание: Отправка сообщений (HARD DELETE)
// Версия: 2.2.0 - УБРАН ПРЯМОЙ РЕНДЕРИНГ (исправление дублирования)
// ============================================

class ChatSend {
    constructor() {
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.uiRenderer = window.uiRenderer;
        this.chatUI = window.chatUI;
        this.messageService = window.messageService;
        this.isSending = false;
    }

    // ==========================================
    // ОТПРАВКА СООБЩЕНИЯ (С ПРОВЕРКОЙ ОФЛАЙН)
    // ==========================================

    async sendMessage() {
        if (!navigator.onLine) {
            if (window.showOfflineBanner) {
                window.showOfflineBanner();
            }
            if (window.tg?.showAlert) {
                window.tg.showAlert('Нет интернета. Отправка сообщений недоступна.');
            }
            return;
        }

        if (this.isSending) return;

        if (window.isVoiceRecording) {
            window.isExpressVoiceTarget = true;
            const voiceBtn = document.querySelector('.voice-btn');
            if (window.toggleVoiceRecording && voiceBtn) {
                await window.toggleVoiceRecording(voiceBtn);
            }
            return;
        }

        const input = document.getElementById('user-input');
        if (!input) return;

        let text = input.value.trim();
        if (!text) return;

        if (!this.userStore.hasUnlimited() && !this.userStore.hasRemainingQuota()) {
            if (window.tg?.showAlert) window.tg.showAlert('Ежедневный лимит запросов исчерпан!');
            return;
        }

        this.isSending = true;
        input.disabled = true;

        const voiceBtn = document.querySelector('.voice-btn');
        if (voiceBtn) voiceBtn.disabled = true;

        const mediaToAttach = window.currentAttachedImageBase64 || null;
        if (mediaToAttach) {
            text = `📸 [Прикреплено изображение]\n${text}`;
        }

        const activeChat = this.chatStore.getActiveChat();
        if (!activeChat) {
            this.isSending = false;
            return;
        }

        const chatId = activeChat.id;
        const chatTopic = this.chatStore.currentTopic;
        const userLang = activeChat.language || window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || 'ru';

        const messageId = this.chatStore.generateUUID();

        // ✅ Сохраняем сообщение в Store — событие chat:message_added само отрендерит его
        const savedMsg = this.chatStore.addMessage(chatId, text, 'user-msg', {
            id: messageId,
            isFavorite: false
        });

        if (!savedMsg) {
            this.isSending = false;
            input.disabled = false;
            if (voiceBtn) voiceBtn.disabled = false;
            return;
        }

        // ❌ УБРАНО: this.uiRenderer.renderMessage(text, 'user-msg', messageId);
        // ✅ Сообщение отрендерится через событие chat:message_added

        input.value = '';
        input.style.height = 'auto';
        const clearBtn = document.getElementById('clear-input-btn');
        if (clearBtn) clearBtn.classList.add('hidden');

        if (window.collapseInputArea) window.collapseInputArea();
        if (document.activeElement === input) input.blur();

        this.uiRenderer.showSkeleton();

        const maxContextLimit = activeChat ? (activeChat.maxContext || 15) : 15;
        const contextMessages = this.chatStore.getContextMessages(chatId, maxContextLimit);
        const cleanHistoryMessages = contextMessages.map(msg => ({
            type: String(msg.type),
            text: String(msg.text)
        }));

        try {
            if (this.userStore.canSync()) {
                await this.messageService.sendMessage(chatId, text, 'user-msg', {
                    id: messageId,
                    isFavorite: false
                });
            }

            if (typeof window.streamAiResponse === 'function') {
                await window.streamAiResponse(
                    cleanHistoryMessages,
                    chatTopic,
                    userLang,
                    mediaToAttach,
                    chatId
                );
            } else {
                throw new Error('streamAiResponse not defined');
            }
        } catch (error) {
            this.uiRenderer.hideSkeleton();
            console.error('Send error:', error);
            if (this.uiRenderer.renderMessage) {
                this.uiRenderer.renderMessage(
                    `⚠️ Сбой связи: ${error.message}`,
                    'ai-msg'
                );
            }
        } finally {
            if (window.clearImageAttachment) {
                window.clearImageAttachment();
            }
            this.isSending = false;
            input.disabled = false;
            if (voiceBtn) voiceBtn.disabled = false;
        }
    }

    // ==========================================
    // КОПИРОВАТЬ СООБЩЕНИЕ
    // ==========================================

    copyMsgText(btn, msgId) {
        const found = this.chatStore.findChatByMessageId(msgId);
        if (!found) {
            console.warn(`⚠️ Сообщение ${msgId} не найдено`);
            return;
        }

        const msg = found.chat.messages.find(m => m.id === msgId);
        if (!msg) return;

        navigator.clipboard.writeText(msg.text).then(() => {
            this.triggerTooltip(btn);
        }).catch(() => {
            if (window.tg?.showAlert) window.tg.showAlert('Ошибка копирования');
        });
    }

    // ==========================================
    // ПОДЕЛИТЬСЯ СООБЩЕНИЕМ
    // ==========================================

    shareMsgText(btn, msgId) {
        const found = this.chatStore.findChatByMessageId(msgId);
        if (!found) {
            console.warn(`⚠️ Сообщение ${msgId} не найдено`);
            return;
        }

        const msg = found.chat.messages.find(m => m.id === msgId);
        if (!msg) return;

        const shareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(msg.text)}`;
        this.triggerTooltip(btn);
        setTimeout(() => {
            if (window.tg?.openTelegramLink) {
                window.tg.openTelegramLink(shareUrl);
            } else {
                window.open(shareUrl, '_blank');
            }
        }, 300);
    }

    // ==========================================
    // ИЗБРАННОЕ
    // ==========================================

    async toggleFavoriteMsg(btn, msgId) {
        if (!navigator.onLine) {
            if (window.tg?.showAlert) {
                window.tg.showAlert('Нет интернета. Изменения недоступны.');
            }
            return;
        }

        const activeChat = this.chatStore.getActiveChat();
        if (!activeChat) {
            console.warn('⚠️ Нет активного чата');
            return;
        }

        const result = await this.messageService.toggleFavorite(activeChat.id, msgId);

        if (result) {
            const heartIcon = btn.querySelector('.lucide-heart');
            if (result.isFavorite) {
                btn.classList.add('is-favorite');
                if (heartIcon) {
                    heartIcon.setAttribute('data-lucide', 'heart');
                    lucide.createIcons();
                }
            } else {
                btn.classList.remove('is-favorite');
                if (heartIcon) {
                    heartIcon.setAttribute('data-lucide', 'heart');
                    lucide.createIcons();
                }
            }
            this.triggerTooltip(btn);
        }
    }

    // ==========================================
    // ✅ УДАЛЕНИЕ СООБЩЕНИЯ (HARD DELETE + ПОПАП)
    // ==========================================

    deleteMessage(msgId) {
        if (!navigator.onLine) {
            if (window.tg?.showAlert) {
                window.tg.showAlert('Нет интернета. Удаление недоступно.');
            }
            return;
        }

        const found = this.chatStore.findChatByMessageId(msgId);
        if (!found) {
            console.warn(`⚠️ Сообщение ${msgId} не найдено`);
            return;
        }

        const { chat } = found;
        const activeChat = this.chatStore.getActiveChat();

        if (!activeChat) {
            console.warn('⚠️ Нет активного чата');
            return;
        }

        const confirmMsg = 'Удалить это сообщение без возможности восстановления?';

        const action = () => {
            if (window.messageService) {
                window.messageService.deleteMessage(activeChat.id, msgId);
            }

            const domBlock = document.getElementById(`msg-block-${msgId}`);
            if (domBlock) {
                domBlock.style.transition = 'all 0.25s ease';
                domBlock.style.opacity = '0';
                domBlock.style.transform = 'scale(0.95)';
                setTimeout(() => domBlock.remove(), 250);
            }

            if (window.uiRenderer) {
                window.uiRenderer.showToast('🗑️ Сообщение удалено навсегда', 'info', 1500);
            }
        };

        if (window.tg?.showConfirm) {
            window.tg.showConfirm(confirmMsg, (ok) => { if (ok) action(); });
        } else if (confirm(confirmMsg)) {
            action();
        }
    }

    // ==========================================
    // ОЧИСТКА ПОЛЯ ВВОДА
    // ==========================================

    clearUserText(e) {
        if (e) e.stopPropagation();
        const input = document.getElementById('user-input');
        const clearBtn = document.getElementById('clear-input-btn');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
        if (clearBtn) clearBtn.classList.add('hidden');
        if (input) input.focus();
    }

    triggerTooltip(btn) {
        btn.classList.add('show-tip');
        setTimeout(() => {
            btn.classList.remove('show-tip');
        }, 1200);
    }
}

window.ChatSend = ChatSend;
window.chatSend = new ChatSend();

console.log('✅ ChatSend v2.2.0 загружен (убран прямой рендеринг)');
