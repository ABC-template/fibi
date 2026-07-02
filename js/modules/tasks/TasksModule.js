// ============================================
// js/modules/tasks/TasksModule.js 
// Описание: Модуль заданий (геймификация)
// Версия: 1.2.0 - ДОБАВЛЕН BACKBUTTON
// ============================================

class TasksModule {
    constructor(container) {
        this.container = container;
        this.isInitialized = false;
        this._isInQuest = false;
    }

    async init() {
        if (this.isInitialized) return;

        window.tasksModule = this;

        this.container.innerHTML = `
            <div style="padding: 16px; flex:1; overflow-y:auto; padding-bottom: 80px;">
                <h2 style="font-size:18px; font-weight:700; margin:0 0 8px 0; color:var(--app-text-primary); display:flex; align-items:center; gap:8px;">
                    <i data-lucide="trophy" style="width:24px;height:24px;"></i>
                    Задания
                </h2>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                    <div style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; text-align:center; border:1px solid var(--app-border-color-light);">
                        <div style="font-size:24px; font-weight:700; color:#f1c40f;" id="tasks-balance">0</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">🪙 Fibi Coins</div>
                    </div>
                    <div style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; text-align:center; border:1px solid var(--app-border-color-light);">
                        <div style="font-size:24px; font-weight:700; color:var(--app-accent-primary);" id="tasks-tokens">0</div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">🔑 Токены (запросы)</div>
                    </div>
                </div>
                
                <div id="daily-bonus-container" style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; border:1px solid var(--app-border-color-light); margin-bottom:16px; text-align:center;">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary);">📆 Ежедневный бонус</div>
                    <div style="font-size:12px; color:var(--app-text-tertiary); margin:4px 0 8px 0;">Стрик: <span id="tasks-streak" style="font-weight:700; color:#e74c3c;">0</span> дней</div>
                    <button class="btn" id="claim-daily-btn" style="padding:8px 20px; font-size:13px; border-radius:10px;" onclick="window.tasksModule.claimDailyBonus()">🎁 Забрать бонус</button>
                </div>
                
                <div style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; border:1px solid var(--app-border-color-light); margin-bottom:16px;">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary); margin-bottom:10px;">📅 Ежедневные задания</div>
                    <div id="daily-quests-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>
                
                <div style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; border:1px solid var(--app-border-color-light); margin-bottom:16px;">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary); margin-bottom:10px;">🏆 Достижения</div>
                    <div id="achievements-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>
                
                <div style="background:var(--app-bg-secondary); padding:14px; border-radius:12px; border:1px solid var(--app-border-color-light);">
                    <div style="font-size:14px; font-weight:600; color:var(--app-text-primary); margin-bottom:10px;">🔄 Обменять валюту</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        <button class="btn" style="padding:8px 14px; font-size:12px; border-radius:8px; flex:1; min-width:80px;" onclick="window.tasksModule.exchange(10, 1)">10🪙 → 1🔑</button>
                        <button class="btn" style="padding:8px 14px; font-size:12px; border-radius:8px; flex:1; min-width:80px;" onclick="window.tasksModule.exchange(50, 5)">50🪙 → 5🔑</button>
                        <button class="btn" style="padding:8px 14px; font-size:12px; border-radius:8px; flex:1; min-width:80px;" onclick="window.tasksModule.exchange(100, 10)">100🪙 → 10🔑</button>
                    </div>
                </div>
            </div>
        `;

        this.render();

        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 200);

        this.isInitialized = true;
        console.log('✅ TasksModule инициализирован');
    }

    render() {
        this.renderBalance();
        this.renderDailyQuests();
        this.renderAchievements();
        this.renderDailyBonus();
    }

    renderBalance() {
        const balanceEl = document.getElementById('tasks-balance');
        const tokensEl = document.getElementById('tasks-tokens');
        const streakEl = document.getElementById('tasks-streak');

        if (balanceEl) balanceEl.textContent = window.tasksStore.getBalance();
        if (tokensEl) tokensEl.textContent = window.tasksStore.getTokens();
        if (streakEl) streakEl.textContent = window.tasksStore.streakDays || 0;
    }

    renderDailyBonus() {
        const btn = document.getElementById('claim-daily-btn');
        if (!btn) return;
        
        if (window.tasksStore.canClaimDailyBonus()) {
            btn.textContent = '🎁 Забрать бонус';
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.textContent = '✅ Бонус получен';
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }

    renderDailyQuests() {
        const list = document.getElementById('daily-quests-list');
        if (!list) return;

        const quests = window.tasksStore.dailyQuests || [];

        if (quests.length === 0) {
            list.innerHTML = `<p style="font-size:12px; color:var(--app-text-tertiary); text-align:center; margin:10px 0;">Нет заданий</p>`;
            return;
        }

        list.innerHTML = '';
        for (const quest of quests) {
            const item = document.createElement('div');
            const progress = Math.min(quest.progress / quest.target * 100, 100);
            const isCompleted = quest.completed && quest.claimed;
            
            item.style.cssText = `
                background: var(--app-bg-tertiary);
                padding: 10px 12px;
                border-radius: 10px;
                opacity: ${isCompleted ? '0.6' : '1'};
            `;
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:500; color:var(--app-text-primary);">
                            ${quest.title}
                            ${isCompleted ? ' ✅' : ''}
                            ${quest.completed && !quest.claimed ? ' ⬜ Забрать!' : ''}
                        </div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">${quest.description}</div>
                        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                            <div style="flex:1; height:4px; background:var(--app-bg-secondary); border-radius:2px; overflow:hidden;">
                                <div style="width:${progress}%; height:100%; background:var(--app-gradient-primary); border-radius:2px;"></div>
                            </div>
                            <span style="font-size:10px; color:var(--app-text-tertiary);">${quest.progress}/${quest.target}</span>
                        </div>
                    </div>
                    <div style="font-size:12px; font-weight:600; color:#f1c40f; margin-left:10px;">
                        +${quest.reward} 🪙
                    </div>
                </div>
                ${quest.completed && !quest.claimed ? `
                    <button class="btn" style="padding:4px 12px; font-size:11px; border-radius:6px; margin-top:6px; width:100%;" onclick="window.tasksModule.claimQuest('${quest.id}')">
                        Забрать награду
                    </button>
                ` : ''}
            `;
            
            list.appendChild(item);
        }
    }

    renderAchievements() {
        const list = document.getElementById('achievements-list');
        if (!list) return;

        const achievements = window.tasksStore.achievements || [];

        if (achievements.length === 0) {
            list.innerHTML = `<p style="font-size:12px; color:var(--app-text-tertiary); text-align:center; margin:10px 0;">Нет достижений</p>`;
            return;
        }

        list.innerHTML = '';
        for (const ach of achievements) {
            const item = document.createElement('div');
            const isUnlocked = ach.unlocked && ach.claimed;
            const progress = Math.min(ach.progress / ach.target * 100, 100);
            
            item.style.cssText = `
                background: var(--app-bg-tertiary);
                padding: 10px 12px;
                border-radius: 10px;
                opacity: ${isUnlocked ? '0.6' : '1'};
                ${ach.unlocked && !ach.claimed ? 'border: 2px solid #f1c40f;' : ''}
            `;
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:500; color:var(--app-text-primary);">
                            ${ach.unlocked ? '🏆' : '⬜'} ${ach.title}
                            ${isUnlocked ? ' ✅' : ''}
                            ${ach.unlocked && !ach.claimed ? ' ⬜ Забрать!' : ''}
                        </div>
                        <div style="font-size:11px; color:var(--app-text-tertiary);">${ach.description}</div>
                        ${!ach.unlocked ? `
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                                <div style="flex:1; height:4px; background:var(--app-bg-secondary); border-radius:2px; overflow:hidden;">
                                    <div style="width:${progress}%; height:100%; background:var(--app-accent-primary); border-radius:2px;"></div>
                                </div>
                                <span style="font-size:10px; color:var(--app-text-tertiary);">${ach.progress}/${ach.target}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div style="font-size:12px; font-weight:600; color:#f1c40f; margin-left:10px;">
                        +${ach.reward} 🪙
                    </div>
                </div>
                ${ach.unlocked && !ach.claimed ? `
                    <button class="btn" style="padding:4px 12px; font-size:11px; border-radius:6px; margin-top:6px; width:100%;" onclick="window.tasksModule.claimAchievement('${ach.id}')">
                        Забрать награду
                    </button>
                ` : ''}
            `;
            
            list.appendChild(item);
        }
    }

    claimQuest(questId) {
        const quest = window.tasksStore.dailyQuests.find(q => q.id === questId);
        if (!quest || !quest.completed || quest.claimed) return;

        // ✅ При открытии задания — показываем BackButton
        this._showBackButton(questId);
        this._isInQuest = true;

        window.tasksStore.addBalance(quest.reward, `Задание: ${quest.title}`);
        quest.claimed = true;
        window.tasksStore.save();
        
        this.render();
        
        if (window.uiRenderer) {
            window.uiRenderer.showToast(`🎉 +${quest.reward} монет!`, 'success', 1500);
        }

        // ✅ Скрываем BackButton после завершения
        this._hideBackButton();
        this._isInQuest = false;
    }

    claimAchievement(achievementId) {
        const ach = window.tasksStore.achievements.find(a => a.id === achievementId);
        if (!ach || !ach.unlocked || ach.claimed) return;

        // ✅ При открытии достижения — показываем BackButton
        this._showBackButton(achievementId);
        this._isInQuest = true;

        ach.claimed = true;
        window.tasksStore.save();
        
        this.render();
        
        if (window.uiRenderer) {
            window.uiRenderer.showToast(`🏆 Достижение получено!`, 'success', 1500);
        }

        // ✅ Скрываем BackButton после завершения
        this._hideBackButton();
        this._isInQuest = false;
    }

    claimDailyBonus() {
        const bonus = window.tasksStore.claimDailyBonus();
        if (bonus) {
            this.render();
            if (window.uiRenderer) {
                window.uiRenderer.showToast(`🎁 Ежедневный бонус: +${bonus} монет!`, 'success', 1500);
            }
        } else {
            if (window.uiRenderer) {
                window.uiRenderer.showToast('⏳ Бонус уже получен сегодня', 'info', 1500);
            }
        }
    }

    exchange(coins, tokens) {
        const result = window.tasksStore.exchangeCoinsForTokens(coins);
        if (result.success) {
            this.render();
            if (window.uiRenderer) {
                window.uiRenderer.showToast(`🔄 Обмен: +${result.tokens} токенов`, 'success', 1500);
            }
        } else {
            if (window.uiRenderer) {
                window.uiRenderer.showToast(`❌ ${result.message}`, 'error', 1500);
            }
        }
    }

    // ==========================================
    // ✅ BACKBUTTON
    // ==========================================

    _showBackButton(questId) {
        const tg = window.Telegram?.WebApp;
        if (!tg?.BackButton) return;
        
        tg.BackButton.show();
        tg.BackButton.offClick();
        tg.BackButton.onClick(() => {
            this._hideBackButton();
            this._isInQuest = false;
            // Возврат на стартовую страницу заданий
            this.render();
        });
        console.log(`🔙 BackButton показан (задание: ${questId})`);
    }

    _hideBackButton() {
        const tg = window.Telegram?.WebApp;
        if (!tg?.BackButton) return;
        
        tg.BackButton.hide();
        tg.BackButton.offClick();
        console.log('🔙 BackButton скрыт (задания)');
    }

    // ==========================================
    // УПРАВЛЕНИЕ МОДУЛЕМ
    // ==========================================

    show() {
        this.container.classList.remove('hidden');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.width = '100%';
        
        // Если задание открыто — показываем BackButton
        if (this._isInQuest) {
            this._showBackButton('active');
        } else {
            this._hideBackButton();
        }
        
        this.render();
        
        if (window.navigation) {
            window.navigation.show();
        }
    }

    hide() {
        // ✅ Скрываем BackButton при скрытии модуля
        this._hideBackButton();
        this._isInQuest = false;
        
        this.container.classList.add('hidden');
        this.container.style.display = 'none';
    }
}

window.TasksModule = TasksModule;

console.log('✅ TasksModule v1.2.0 загружен');
