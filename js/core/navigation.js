// ============================================
// js/core/navigation.js
// Описание: Нижняя навигация с иконками Lucide
// Версия: 1.9.0 - chat → chat-list
// ============================================

class Navigation {
    constructor() {
        this.tabs = [
            { id: 'dashboard', icon: 'home', label: 'Главная' },
            { id: 'organizer', icon: 'layout-dashboard', label: 'Органайзер' },
            { id: 'chat-list', icon: 'message-square', label: 'Versatile AI' },
            { id: 'games', icon: 'gamepad-2', label: 'Игры' },
            { id: 'tasks', icon: 'trophy', label: 'Задания' },
        ];
        this.activeTab = 'dashboard';
        this.navElement = null;
        this._isSwitching = false;
    }

    render() {
        if (document.getElementById('bottom-nav')) return;

        this.navElement = document.createElement('div');
        this.navElement.id = 'bottom-nav';
        this.navElement.className = 'bottom-nav';

        this.tabs.forEach((tab, index) => {
            const btn = document.createElement('button');
            const isCenter = index === Math.floor(this.tabs.length / 2);
            btn.className = `nav-tab ${tab.id === this.activeTab ? 'active' : ''} ${isCenter ? 'center-tab' : ''}`;
            btn.dataset.tab = tab.id;
            btn.innerHTML = `
                <span class="nav-icon" data-lucide="${tab.icon}"></span>
                <span class="nav-label">${tab.label}</span>
            `;
            btn.addEventListener('click', () => this.switchTab(tab.id));
            this.navElement.appendChild(btn);
        });

        document.body.appendChild(this.navElement);

        setTimeout(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 50);

        console.log('📱 Навигация инициализирована');
    }

    switchTab(tabId) {
        if (this.activeTab === tabId) {
            console.log(`📱 Уже в разделе ${tabId}, переключение не требуется`);
            return;
        }

        if (this._isSwitching) return;
        this._isSwitching = true;

        if (!this.tabs.find(t => t.id === tabId)) {
            console.warn(`⚠️ Вкладка ${tabId} не найдена`);
            this._isSwitching = false;
            return;
        }

        this.setActive(tabId);

        // Закрываем сайдбар если открыт
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawer-overlay');
        if (drawer?.classList.contains('active')) {
            window.closeDrawer();
        }

        // Загружаем модуль
        if (window.moduleLoader) {
            window.moduleLoader.load(tabId).finally(() => {
                this._isSwitching = false;
            });
        } else {
            this._isSwitching = false;
        }

        // Заголовком управляет модуль — ничего не делаем здесь

        if (window.closeDrawer) window.closeDrawer();
        console.log(`📱 Переключение на: ${tabId}`);
    }

    setActive(tabId) {
        this.activeTab = tabId;
        document.querySelectorAll('.nav-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tabId;
            btn.classList.toggle('active', isActive);
            if (isActive) {
                setTimeout(() => {
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }, 50);
            }
        });
    }

    hide() { if (this.navElement) this.navElement.classList.add('hidden'); }
    show() { if (this.navElement) this.navElement.classList.remove('hidden'); }
    getActive() { return this.activeTab; }
}

window.Navigation = Navigation;
window.navigation = new Navigation();
console.log('✅ Navigation v1.9.0 загружен (chat → chat-list)');
