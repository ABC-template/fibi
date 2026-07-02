// ============================================
// js/modules/chat/ChatModule.js
// Описание: Модуль чата (обертка для существующей логики)
// Версия: 1.2.1 - ДОБАВЛЕН BACKBUTTON
// ============================================

class ChatModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this.isReady = false;
        this._isInChat = false;
    }

    async init() {
        if (this.isInitialized) return;

        this.container.innerHTML = `
            <!-- Стартовая страница Versatile -->
            <div id="versatile-start" style="display:none;flex:1;overflow-y:auto;padding:16px;padding-bottom:100px;">
                <h2 style="font-size:20px;font-weight:700;color:var(--app-text-primary);margin:0 0 4px 0;">Versatile AI</h2>
                <p style="font-size:14px;color:var(--app-text-tertiary);margin:0 0 20px 0;">Выберите тему для нового чата или продолжите диалог</p>
                
                <!-- Темы (чипы) -->
                <div style="margin-bottom:20px;">
                    <div style="font-size:13px;font-weight:600;color:var(--app-text-secondary);margin-bottom:10px;">📌 Темы</div>
                    <div id="versatile-topics" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
                </div>
                
                <!-- Последние чаты -->
                <div>
                    <div style="font-size:13px;font-weight:600;color:var(--app-text-secondary);margin-bottom:10px;">🕐 Последние чаты</div>
                    <div id="versatile-recent-chats" style="display:flex;flex-direction:column;gap:8px;"></div>
                </div>
            </div>
            
            <!-- Контейнер чата -->
            <div id="chat-container" style="display:none;flex:1;overflow-y:auto;padding:8px 8px 120px;flex-direction:column;"></div>
            
            <button id="fab-open-input" onclick="window.expandInputArea()" style="position:fixed;bottom:calc(var(--tg-safe-bottom,0px)+80px);right:16px;width:54px;height:54px;border-radius:50%;background:var(--app-gradient-primary);color:#fff;border:none;box-shadow:0 4px 20px rgba(108,99,255,0.3);cursor:pointer;z-index:97;align-items:center;justify-content:center;display:none;"><i data-lucide="chevron-up" style="width:26px;height:26px;"></i></button>
            
            <div id="input-overlay" class="hidden" style="position:fixed;top:0;left:0;width:100vw;height:100dvh;background:rgba(0,0,0,0.25);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:98;transition:opacity 0.3s;opacity:0;pointer-events:none;"></div>
            
            <div id="input-area" style="display:none;position:fixed;bottom:calc(var(--tg-safe-bottom,0px)+16px);left:16px;right:16px;background:var(--app-bg-secondary);border-radius:16px;padding:12px 16px;box-shadow:0 -2px 20px rgba(0,0,0,0.06);border:1px solid var(--app-border-color-light);z-index:99;flex-direction:column;gap:8px;opacity:0;visibility:hidden;pointer-events:none;transform:translateY(150dvh);transition:all 0.3s cubic-bezier(0.1,0.8,0.25,1);">
                <div style="position:relative;width:100%;display:flex;align-items:flex-start;">
                    <textarea id="user-input" placeholder="Ваш вопрос..." rows="1" style="width:100%;border:none;outline:none;background:transparent;color:var(--app-text-primary);font-size:16px;font-family:var(--app-font-family);max-height:140px;overflow-y:auto;display:block;padding:0 28px 0 0;margin:0;border-radius:0;line-height:1.5;resize:none;"></textarea>
                    <button id="clear-input-btn" class="hidden" style="position:absolute;right:0;top:0;background:transparent;border:none;outline:none;color:var(--app-text-tertiary);cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;padding:0;opacity:0.7;"><i data-lucide="x" style="width:18px;height:18px;"></i></button>
                </div>
                <div class="input-footer-bar" style="display:flex;justify-content:space-between;align-items:center;width:100%;height:38px;margin-top:4px;">
                    <div class="footer-btn-group left-group" style="display:flex;align-items:center;height:38px;gap:4px;">
                        <button class="footer-action-btn media-btn" style="display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;padding:0;border:none;background:var(--app-bg-tertiary);color:var(--app-text-secondary);cursor:pointer;"><i data-lucide="paperclip" style="width:20px;height:20px;"></i></button>
                    </div>
                    <div class="footer-btn-group right-group" style="display:flex;align-items:center;height:38px;gap:4px;">
                        <span id="voice-timer" class="hidden" style="font-size:13px;font-weight:600;color:var(--app-text-tertiary);margin-right:2px;">15s</span>
                        <button class="footer-action-btn voice-btn" style="display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;padding:0;border:none;background:var(--app-bg-tertiary);color:var(--app-text-secondary);cursor:pointer;"><i data-lucide="mic" style="width:20px;height:20px;"></i></button>
                        <button class="footer-action-btn send-btn" style="display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;padding:0;border:none;background:var(--app-gradient-primary);color:#fff;cursor:pointer;"><i data-lucide="send" style="width:20px;height:20px;"></i></button>
                    </div>
                </div>
            </div>
        `;

        // Рендерим стартовую страницу
        this.renderStartPage();

        // Инициализируем футер
        this.initFooter();

        if (window.chatUI) {
            const hasRestored = window.chatUI.restoreLastChat();
            if (hasRestored) {
                window.chatUI.refreshUI();
                this.showChatView();
            } else {
                window.chatUI.cleanupTempChats();
                this.showStartView();
            }
        }

        setTimeout(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 200);

        this.isInitialized = true;
        this.isReady = true;
        console.log('✅ ChatModule инициализирован и готов');
    }

    // ==========================================
    // СТАРТОВАЯ СТРАНИЦА
    // ==========================================

    renderStartPage() {
        // Темы
        const topicsContainer = document.getElementById('versatile-topics');
        if (topicsContainer) {
            const topics = ['code', 'creative', 'fast', 'kitchen', 'analytics'];
            const topicNames = window.topicShortNames || {
                code: '#кодинг',
                creative: '#креатив',
                fast: '#флуд',
                kitchen: '#кухня',
                analytics: '#аналитика'
            };
            
            topicsContainer.innerHTML = '';
            for (const topic of topics) {
                const chip = document.createElement('button');
                chip.className = 'filter-chip';
                chip.textContent = topicNames[topic] || topic;
                chip.dataset.topic = topic;
                chip.addEventListener('click', () => {
                    this.createChatWithTopic(topic);
                });
                topicsContainer.appendChild(chip);
            }
        }

        // Последние чаты
        this.renderRecentChats();
    }

    renderRecentChats() {
        const container = document.getElementById('versatile-recent-chats');
        if (!container) return;

        const chatStore = window.chatStore;
        if (!chatStore) return;

        // Собираем все чаты
        const allChats = [];
        for (const [topic, chats] of Object.entries(chatStore.histories || {})) {
            if (!chats) continue;
            for (const chat of chats) {
                if (chat.deleted_at) continue;
                if (!chatStore.hasRealMessages(chat)) continue;
                allChats.push({
                    ...chat,
                    topic: topic
                });
            }
        }

        // Сортируем по更新时间
        allChats.sort((a, b) => {
            const aTime = a.updated_at || a.created_at || '';
            const bTime = b.updated_at || b.created_at || '';
            return new Date(bTime) - new Date(aTime);
        });

        // Берем последние 5
        const recent = allChats.slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `<p style="font-size:13px;color:var(--app-text-tertiary);text-align:center;padding:20px 0;">Нет чатов. Начните новый диалог!</p>`;
            return;
        }

        container.innerHTML = '';
        for (const chat of recent) {
            const item = document.createElement('div');
            item.className = 'chat-history-item';
            item.style.cssText = 'padding:12px 16px;background:var(--app-bg-secondary);border-radius:12px;cursor:pointer;border:1px solid var(--app-border-color-light);transition:all 0.2s ease;';
            
            const lastMsg = chat.messages && chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1] 
                : null;
            const preview = lastMsg ? lastMsg.text.substring(0, 60) + (lastMsg.text.length > 60 ? '...' : '') : 'Пустой чат';
            const timeStr = window.formatDate ? window.formatDate(chat.updated_at || chat.created_at) : '';
            
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;overflow:hidden;">
                        <div style="font-weight:500;font-size:14px;color:var(--app-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${chat.title || 'Без названия'}</div>
                        <div style="font-size:12px;color:var(--app-text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</div>
                    </div>
                    <div style="font-size:11px;color:var(--app-text-tertiary);flex-shrink:0;margin-left:12px;">${timeStr}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.openChat(chat.id, chat.topic);
            });
            
            container.appendChild(item);
        }
    }

    // ==========================================
    // НАВИГАЦИЯ
    // ==========================================

    showStartView() {
        const startEl = document.getElementById('versatile-start');
        const chatContainer = document.getElementById('chat-container');
        const fabBtn = document.getElementById('fab-open-input');
        const inputArea = document.getElementById('input-area');
        
        if (startEl) {
            startEl.style.display = 'flex';
            startEl.style.flexDirection = 'column';
            startEl.style.height = '100%';
        }
        if (chatContainer) {
            chatContainer.style.display = 'none';
            chatContainer.classList.remove('visible');
        }
        if (fabBtn) fabBtn.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';
        
        // ✅ Скрываем BackButton
        this._hideBackButton();
        
        // Обновляем хедер для стартовой
        if (window.headerManager) {
            window.headerManager.setSection('versatile');
        }
        
        // Обновляем список чатов
        this.renderRecentChats();
        
        this._isInChat = false;
    }

    showChatView() {
        const startEl = document.getElementById('versatile-start');
        const chatContainer = document.getElementById('chat-container');
        const fabBtn = document.getElementById('fab-open-input');
        const inputArea = document.getElementById('input-area');
        
        if (startEl) startEl.style.display = 'none';
        if (chatContainer) {
            chatContainer.style.display = 'flex';
            chatContainer.style.flexDirection = 'column';
            chatContainer.classList.add('visible');
        }
        if (fabBtn) {
            fabBtn.style.display = 'flex';
            fabBtn.style.visibility = 'visible';
            fabBtn.style.opacity = '1';
        }
        if (inputArea) inputArea.style.display = 'flex';
        
        // ✅ Показываем BackButton
        this._showBackButton();
        
        // Обновляем хедер для чата
        const activeChat = window.chatStore?.getActiveChat();
        if (window.headerManager) {
            window.headerManager.setSection('versatile');
            if (activeChat) {
                window.headerManager.setTitle(activeChat.title || 'Versatile AI');
            }
        }
        
        this._isInChat = true;
    }

    // ==========================================
    // ✅ BACKBUTTON
    // ==========================================

    _showBackButton() {
        const tg = window.Telegram?.WebApp;
        if (!tg?.BackButton) return;
        
        tg.BackButton.show();
        tg.BackButton.offClick();
        tg.BackButton.onClick(() => {
            this.showStartView();
        });
        console.log('🔙 BackButton показан');
    }

    _hideBackButton() {
        const tg = window.Telegram?.WebApp;
        if (!tg?.BackButton) return;
        
        tg.BackButton.hide();
        tg.BackButton.offClick();
        console.log('🔙 BackButton скрыт');
    }

    // ==========================================
    // ДЕЙСТВИЯ
    // ==========================================

    createChatWithTopic(topic) {
        console.log(`➕ Создаём чат с темой: ${topic}`);
        if (window.chatUI) {
            window.chatUI.currentTopic = topic;
            window.chatUI.createNewChat();
            const activeChat = window.chatStore?.getActiveChat();
            if (activeChat) {
                activeChat.topic = topic;
                window.chatStore.save();
            }
            this.showChatView();
            if (window.chatUI) {
                window.chatUI.refreshUI();
                window.chatUI.showChatInterface();
            }
        }
    }

    openChat(chatId, topic) {
        console.log(`📂 Открываем чат: ${chatId} (${topic})`);
        if (window.chatUI) {
            window.chatUI.switchToChat(chatId, topic);
            this.showChatView();
        }
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ ФУТЕРА
    // ==========================================

    initFooter() {
        const userInput = document.getElementById('user-input');
        const inputArea = document.getElementById('input-area');
        const fabBtn = document.getElementById('fab-open-input');
        const overlay = document.getElementById('input-overlay');
        const clearBtn = document.getElementById('clear-input-btn');
        const tg = window.Telegram?.WebApp;

        if (!userInput || !inputArea || !fabBtn || !overlay || !clearBtn) {
            console.warn('⚠️ Footer элементы не найдены');
            return;
        }

        const resizeTextArea = () => {
            userInput.style.height = 'auto';
            userInput.style.height = userInput.scrollHeight + 'px';
            userInput.value.trim().length > 0 ? clearBtn.classList.remove('hidden') : clearBtn.classList.add('hidden');
        };

        userInput.addEventListener('input', resizeTextArea);
        inputArea.addEventListener('click', e => e.stopPropagation());

        window.clearUserText = function(e) {
            if (e) e.stopPropagation();
            userInput.value = '';
            userInput.style.height = 'auto';
            clearBtn.classList.add('hidden');
            userInput.focus();
        };

        clearBtn.onclick = e => {
            e.stopPropagation();
            userInput.value = '';
            userInput.style.height = 'auto';
            clearBtn.classList.add('hidden');
            userInput.focus();
        };

        const toggleNav = (show) => {
            const nav = document.getElementById('bottom-nav');
            if (nav) nav.style.display = show ? 'flex' : 'none';
        };

        window.expandInputArea = function() {
            fabBtn.style.opacity = '0';
            fabBtn.style.pointerEvents = 'none';
            overlay.classList.remove('hidden');
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            inputArea.classList.add('active');
            inputArea.style.display = 'flex';
            inputArea.style.opacity = '1';
            inputArea.style.visibility = 'visible';
            inputArea.style.pointerEvents = 'auto';
            inputArea.style.transform = 'translateY(0)';
            userInput.value.length > 0 ? clearBtn.classList.remove('hidden') : clearBtn.classList.add('hidden');
            resizeTextArea();
            setTimeout(() => { userInput.focus(); }, 300);
            toggleNav(false);
            if (tg?.BackButton) {
                tg.BackButton.show();
                tg.BackButton.offClick();
                tg.BackButton.onClick(() => window.collapseInputArea());
            }
        };

        window.collapseInputArea = function() {
            if (window.isVoiceRecording) return;
            userInput.blur();
            inputArea.classList.remove('active');
            inputArea.classList.remove('keyboard-up');
            inputArea.style.display = 'none';
            inputArea.style.opacity = '0';
            inputArea.style.visibility = 'hidden';
            inputArea.style.pointerEvents = 'none';
            inputArea.style.transform = 'translateY(150dvh)';
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            fabBtn.style.display = 'flex';
            fabBtn.style.visibility = 'visible';
            fabBtn.style.opacity = '1';
            fabBtn.style.pointerEvents = 'auto';
            toggleNav(true);
            if (tg?.BackButton) tg.BackButton.hide();
        };

        overlay.addEventListener('click', () => window.collapseInputArea());

        const mediaBtn = document.querySelector('.media-btn');
        if (mediaBtn) mediaBtn.onclick = () => { if (window.triggerMediaSelector) window.triggerMediaSelector(); };

        const voiceBtn = document.querySelector('.voice-btn');
        if (voiceBtn) voiceBtn.onclick = () => { if (window.toggleVoiceRecording) window.toggleVoiceRecording(voiceBtn); };

        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) sendBtn.onclick = () => { if (window.chatSend) window.chatSend.sendMessage(); };

        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (window.chatSend) window.chatSend.sendMessage();
            }
        });

        console.log('✅ Footer инициализирован в ChatModule');
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДУЛЕМ
    // ==========================================

    show() {
        console.log('📱 ChatModule.show() — показываем Versatile');
        
        this.container.classList.remove('hidden');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.width = '100%';
        
        // Проверяем, есть ли активный чат
        const activeChat = window.chatStore?.getActiveChat();
        const hasRealMessages = activeChat && window.chatStore?.hasRealMessages(activeChat);
        
        if (activeChat && hasRealMessages) {
            this.showChatView();
            if (window.chatUI) {
                window.chatUI.refreshUI();
                window.chatUI.showChatInterface();
            }
        } else {
            this.showStartView();
        }
        
        if (window.navigation) window.navigation.show();
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 50);
    }

    hide() {
        console.log('📱 ChatModule.hide() — скрываем Versatile');
        
        // ✅ Скрываем BackButton при скрытии модуля
        this._hideBackButton();
        
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
        
        const chatContainer = document.getElementById('chat-container');
        const inputArea = document.getElementById('input-area');
        const fabBtn = document.getElementById('fab-open-input');
        const startEl = document.getElementById('versatile-start');
        
        if (chatContainer) {
            chatContainer.style.display = 'none';
            chatContainer.classList.remove('visible');
        }
        if (inputArea) inputArea.style.display = 'none';
        if (fabBtn) {
            fabBtn.style.display = 'none';
            fabBtn.style.visibility = 'hidden';
            fabBtn.style.opacity = '0';
        }
        if (startEl) startEl.style.display = 'none';
        
        if (window.syncService && window.syncService.isActive()) {
            console.log('📡 Отключаем Realtime при скрытии чата');
            window.syncService.unsubscribe();
        }
    }
}

window.ChatModule = ChatModule;

// ✅ Глобальная функция создания чата из хедера
window.createNewChatFromHeader = function() {
    console.log('➕ Создаём новый чат из хедера');
    if (window.chatUI) {
        window.chatUI.createNewChat();
        if (window.chatModule) {
            window.chatModule.showChatView();
        }
        const activeChat = window.chatStore?.getActiveChat();
        if (activeChat && window.headerManager) {
            window.headerManager.setTitle(activeChat.title || 'Versatile AI');
        }
    }
};

console.log('✅ ChatModule v1.2.1 загружен');
