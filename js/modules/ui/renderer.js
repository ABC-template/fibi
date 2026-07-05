// ============================================
// js/modules/ui/renderer.js
// Описание: Базовый рендеринг UI-элементов (С ЛЮСИД)
// Версия: 2.1.0 - ДОБАВЛЕНА ПОДПИСКА НА СОБЫТИЯ
// ============================================

class UIRenderer {
    constructor() {
        this.chatStore = window.chatStore;
        this.userStore = window.userStore;
        this.syncStore = window.syncStore;
        this.eventBus = window.eventBus;
        this._subscriptions = [];
        
        // Подписываемся на события
        this._subscribeToEvents();
    }
    
    // ==========================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ==========================================
    
    _subscribeToEvents() {
        // Обновление баланса
        const unsubBalance = this.eventBus.on('tasks:balance_changed', (data) => {
            this._updateCoinDisplay(data.newBalance);
        }, this);
        this._subscriptions.push(unsubBalance);
        
        // Обновление токенов
        const unsubTokens = this.eventBus.on('tasks:tokens_changed', (data) => {
            this._updateTokensDisplay(data.newTokens);
        }, this);
        this._subscriptions.push(unsubTokens);
        
        // Обновление лимитов
        const unsubUsage = this.eventBus.on('user:usage_incremented', (data) => {
            this._updateLimitDisplay(data);
        }, this);
        this._subscriptions.push(unsubUsage);
        
        const unsubRole = this.eventBus.on('user:role_changed', (data) => {
            this._updateLimitDisplay({ used: this.userStore.usedToday, limit: data.dailyLimit });
        }, this);
        this._subscriptions.push(unsubRole);
        
        // Обновление счетчика корзины
        const unsubTrash = this.eventBus.on('chat:deleted', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubTrash);
        
        const unsubRestore = this.eventBus.on('chat:restored', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubRestore);
        
        const unsubPermanent = this.eventBus.on('chat:permanent_deleted', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubPermanent);
        
        const unsubTrashClear = this.eventBus.on('chat:trash_cleared', () => {
            if (window.updateTrashCount) setTimeout(window.updateTrashCount, 300);
        }, this);
        this._subscriptions.push(unsubTrashClear);
        
        // Обновление статуса синхронизации
        const unsubSync = this.eventBus.on('sync:token_updated', () => {
            this.showSyncStatus('success');
        }, this);
        this._subscriptions.push(unsubSync);
        
        console.log('📡 UIRenderer подписан на события');
    }
    
    // ==========================================
    // ОБНОВЛЕНИЕ ОТОБРАЖЕНИЙ
    // ==========================================
    
    _updateCoinDisplay(balance) {
        // Обновляем все элементы с монетами
        document.querySelectorAll('.coin-amount').forEach(el => {
            el.textContent = balance || 0;
        });
        
        // Обновляем в Drawer
        const drawerCoins = document.getElementById('drawer-coins-amount');
        if (drawerCoins) drawerCoins.textContent = balance || 0;
        
        // Обновляем в Header
        const headerCoins = document.getElementById('header-coins-amount');
        if (headerCoins) headerCoins.textContent = balance || 0;
    }
    
    _updateTokensDisplay(tokens) {
        const tokensEl = document.getElementById('tasks-tokens');
        if (tokensEl) tokensEl.textContent = tokens || 0;
    }
    
    _updateLimitDisplay(data) {
        const total = data.limit || this.userStore.dailyLimit || 0;
        const used = data.used || this.userStore.usedToday || 0;
        const remaining = Math.max(0, total - used);
        const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
        
        // Обновляем в ProfileModule
        const totalEl = document.getElementById('profile-limit-total');
        const usedEl = document.getElementById('profile-limit-used');
        const remainingEl = document.getElementById('profile-limit-remaining');
        const barEl = document.getElementById('profile-limit-bar');
        
        if (totalEl) totalEl.textContent = total >= 9999 ? '∞' : total;
        if (usedEl) usedEl.textContent = used;
        if (remainingEl) remainingEl.textContent = remaining;
        if (barEl) barEl.style.width = total >= 9999 ? '100%' : `${percent}%`;
        
        // Обновляем в Header
        const limitInfo = document.getElementById('limit-info');
        if (limitInfo) {
            const limitLabel = window.getLangString ? window.getLangString('limit') : 'Лимит';
            if (total >= 9999) {
                limitInfo.innerText = `${limitLabel}: ∞`;
            } else {
                limitInfo.innerText = `${limitLabel}: ${used}/${total}`;
            }
        }
    }
    
    // ==========================================
    // РЕНДЕРИНГ СООБЩЕНИЙ
    // ==========================================
    
    renderMessage(text, type, msgId = null, isFavorite = false) {
        const container = document.getElementById('chat-container');
        if (!container) return null;
        
        const finalMsgId = msgId || this.chatStore.generateUUID();
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type} msg-animated`;
        msgDiv.id = `msg-block-${finalMsgId}`;
        
        if (type === 'ai-msg') {
            this.renderAIMessage(msgDiv, text, finalMsgId, isFavorite);
        } else {
            this.renderUserMessage(msgDiv, text, finalMsgId);
        }
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return msgDiv;
    }
    
    renderAIMessage(container, text, msgId, isFavorite) {
        const contentDiv = document.createElement('div');
        contentDiv.style.width = '100%';
        
        try {
            if (typeof marked !== 'undefined') {
                let html = marked.parse(text);
                html = html.replace(
                    /<table[^>]*>([\s\S]*?)<\/table>/gi,
                    '<div class="table-wrapper"><table>$1</table></div>'
                );
                contentDiv.innerHTML = this.sanitizeHTML(html);
                
                contentDiv.querySelectorAll('pre').forEach((pre) => {
                    const codeText = pre.querySelector('code')?.innerText || pre.innerText;
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'position:relative; width:100%;';
                    pre.parentNode.insertBefore(wrapper, pre);
                    wrapper.appendChild(pre);
                    
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'code-copy-btn';
                    copyBtn.innerText = '📋 Копировать';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(codeText).then(() => {
                            copyBtn.innerText = '✅ Готово!';
                            setTimeout(() => copyBtn.innerText = '📋 Копировать', 1500);
                        });
                    };
                    wrapper.appendChild(copyBtn);
                });
            } else {
                contentDiv.textContent = text;
            }
        } catch (e) {
            contentDiv.textContent = text;
        }
        
        container.appendChild(contentDiv);
        
        const isWelcome = text.includes('Привет') || text.includes('Welcome');
        if (!isWelcome) {
            const actions = this.createMessageActions(msgId, isFavorite);
            container.appendChild(actions);
        }
    }
    
    renderUserMessage(container, text, msgId) {
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        container.appendChild(textSpan);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.style.cssText = 'background:transparent; border:none; outline:none; cursor:pointer; margin-left:8px; opacity:0.4; padding:0; vertical-align:middle;';
        delBtn.innerHTML = '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>';
        delBtn.onclick = () => {
            if (window.messageService) {
                const container = document.getElementById('chat-container');
                const wasAtBottom = container && container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
                
                window.messageService.deleteMessage(
                    this.chatStore.getActiveChat()?.id,
                    msgId
                );
                
                if (wasAtBottom && container) {
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 50);
                }
            }
            const domBlock = document.getElementById(`msg-block-${msgId}`);
            if (domBlock) {
                domBlock.style.transition = 'all 0.25s ease';
                domBlock.style.opacity = '0';
                domBlock.style.transform = 'scale(0.95)';
                setTimeout(() => domBlock.remove(), 250);
            }
        };
        container.appendChild(delBtn);
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
    }
    
    createMessageActions(msgId, isFavorite) {
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        actions.innerHTML = `
            <button class="action-btn" data-tooltip="📋" onclick="window.chatSend.copyMsgText(this, '${msgId}')">
                <i data-lucide="copy"></i>
            </button>
            <button class="action-btn" data-tooltip="🔗" onclick="window.chatSend.shareMsgText(this, '${msgId}')">
                <i data-lucide="share-2"></i>
            </button>
            <button class="action-btn ${isFavorite ? 'is-favorite' : ''}" onclick="window.chatSend.toggleFavoriteMsg(this, '${msgId}')">
                <i data-lucide="${isFavorite ? 'heart' : 'heart'}"></i>
            </button>
            <button class="action-btn" style="margin-left:auto; background:rgba(231,76,60,0.05); color:#e74c3c;" onclick="window.chatSend.deleteMessage('${msgId}')">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 50);
        
        return actions;
    }
    
    sanitizeHTML(html) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
                    'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'ul', 'ol', 'li', 'blockquote',
                    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'span', 'div', 'img', 'hr', 'sub', 'sup'
                ],
                ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style', 'src', 'alt', 'title', 'rel'],
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']
            });
        }
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
    
    // ==========================================
    // ИНДИКАТОР "ПЕЧАТАЕТ"
    // ==========================================
    
    showSkeleton() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        
        const existing = document.getElementById('ai-typing-indicator');
        if (existing) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'ai-typing-indicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }
    
    hideSkeleton() {
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    renderWelcome(text) {
        const container = document.getElementById('chat-container');
        if (!container) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg ai-msg welcome-msg';
        msgDiv.id = 'welcome-message';
        const contentContainer = document.createElement('div');
        contentContainer.style.width = '100%';
        if (typeof marked !== 'undefined') {
            contentContainer.innerHTML = marked.parse(text);
        } else {
            contentContainer.textContent = text;
        }
        msgDiv.appendChild(contentContainer);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    showSyncStatus(status, isError = false) {
        const indicator = document.getElementById('chat-model-indicator');
        if (!indicator) return;
        const originalText = indicator.innerText;
        switch (status) {
            case 'syncing':
                indicator.innerHTML = '<span style="opacity:0.7;">🔄 синхр...</span>';
                setTimeout(() => {
                    if (indicator.innerHTML === '<span style="opacity:0.7;">🔄 синхр...</span>') {
                        indicator.innerText = originalText;
                    }
                }, 2000);
                break;
            case 'success':
                indicator.innerHTML = '<span style="color: #27ae60;">✓ синхр.</span>';
                setTimeout(() => {
                    if (indicator.innerHTML === '<span style="color: #27ae60;">✓ синхр.</span>') {
                        indicator.innerText = originalText;
                    }
                }, 1500);
                break;
            case 'error':
                indicator.innerHTML = '<span style="color: #e74c3c;">⚠️ офлайн</span>';
                break;
            default:
                indicator.innerText = originalText;
        }
    }
    
    showToast(message, type = 'info', duration = 2000) {
        let toast = document.getElementById('custom-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'custom-toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `show ${type}`;
        toast.style.display = 'block';
        
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.className = 'hide';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, duration);
    }
    
    // ==========================================
    // ОЧИСТКА ПОДПИСОК
    // ==========================================
    
    destroy() {
        for (const unsub of this._subscriptions) {
            try {
                unsub();
            } catch (e) {
                console.warn('Ошибка отписки:', e);
            }
        }
        this._subscriptions = [];
        console.log('📡 UIRenderer отписан от событий');
    }
}

window.UIRenderer = UIRenderer;
window.uiRenderer = new UIRenderer();

console.log('✅ UIRenderer v2.1.0 загружен (с подпиской на события)');
