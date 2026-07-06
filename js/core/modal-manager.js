// ============================================
// js/core/modal-manager.js
// Описание: Универсальный менеджер модалок
// Версия: 2.0.0 - ИНТЕГРАЦИЯ С navigationState
// ============================================

class ModalManager {
    constructor() {
        this.modal = document.getElementById('universal-modal');
        this.overlay = document.getElementById('modal-overlay');
        this.content = document.getElementById('modal-content');
        this.title = document.getElementById('modal-title');
        this.body = document.getElementById('modal-body');
        this.footer = document.getElementById('modal-footer');
        this.closeBtn = document.getElementById('modal-close');
        this.eventBus = window.eventBus;
        this.navigationState = window.navigationState;
        
        this._isOpen = false;
        this._callbacks = {};
        this._modalId = null;
        this._wasDrawerOpen = false;
        this._isClosing = false;
        
        this._initEvents();
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ
    // ==========================================

    _initEvents() {
        // Закрытие по крестику
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Закрытие по клику на оверлей
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                e.stopPropagation();
                this.close();
            }
        });

        // Подписка на событие закрытия через кнопку "Назад"
        if (this.eventBus) {
            this.eventBus.on('modal:state_changed', (data) => {
                if (data && data.action === 'back' && data.isOpen === false) {
                    // Модалка закрыта через кнопку "Назад"
                    this._handleBackClose();
                }
            }, this);
        }

        console.log('✅ ModalManager v2.0.0 инициализирован');
    }

    // ==========================================
    // ОБРАБОТКА ЗАКРЫТИЯ ЧЕРЕЗ КНОПКУ "НАЗАД"
    // ==========================================

    _handleBackClose() {
        if (this._isOpen && !this._isClosing) {
            console.log('📱 Модалка закрыта через кнопку "Назад"');
            this.close();
        }
    }

    // ==========================================
    // ОТКРЫТИЕ МОДАЛКИ
    // ==========================================

    open(options = {}) {
        const {
            title = 'Заголовок',
            content = '',
            footer = '',
            onOpen = null,
            onClose = null,
            onSave = null,
            onCancel = null,
            showFooter = false,
            modalId = 'default'
        } = options;

        this._isClosing = false;

        // Сохраняем колбэки
        this._callbacks = { onOpen, onClose, onSave, onCancel };
        this._modalId = modalId;

        // Запоминаем состояние сайдбара
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        this._wasDrawerOpen = drawer?.classList.contains('active') || false;

        // Если сайдбар открыт — блокируем его
        if (this._wasDrawerOpen && drawer) {
            drawer.style.pointerEvents = 'none';
            drawer.style.opacity = '0.5';
            document.body.style.overflow = '';
        }

        // Устанавливаем контент
        this.title.textContent = title;
        this.body.innerHTML = content;

        // Футер
        if (showFooter && footer) {
            this.footer.innerHTML = footer;
            this.footer.classList.remove('hidden');
            
            const saveBtn = this.footer.querySelector('#modal-save-btn');
            const cancelBtn = this.footer.querySelector('#modal-cancel-btn');
            
            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._callbacks.onSave) {
                        this._callbacks.onSave();
                    }
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._callbacks.onCancel) {
                        this._callbacks.onCancel();
                    }
                    this.close();
                });
            }
        } else {
            this.footer.innerHTML = '';
            this.footer.classList.add('hidden');
        }

        // Показываем модалку
        this.modal.style.display = 'flex';
        this.modal.style.visibility = 'visible';
        this.modal.style.opacity = '1';
        this.modal.classList.remove('hidden');
        
        // Анимация появления
        this.content.style.transition = 'none';
        this.content.style.transform = 'scale(0.95) translateY(20px)';
        this.content.style.opacity = '0';
        
        requestAnimationFrame(() => {
            this.content.style.transition = 'all 0.3s cubic-bezier(0.1, 0.8, 0.25, 1)';
            this.content.style.transform = 'scale(1) translateY(0)';
            this.content.style.opacity = '1';
        });

        this._isOpen = true;

        // ✅ Отправляем событие об открытии модалки
        if (this.eventBus) {
            this.eventBus.emit('modal:open', { modalId: this._modalId });
        }

        // Создаём иконки Lucide внутри модалки
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);

        // Вызываем onOpen
        if (this._callbacks.onOpen) {
            this._callbacks.onOpen();
        }

        console.log(`📱 Модалка открыта: ${title} (id: ${this._modalId})`);
    }

    // ==========================================
    // ЗАКРЫТИЕ МОДАЛКИ
    // ==========================================

    close() {
        if (this._isClosing || !this._isOpen) return;
        this._isClosing = true;

        // Анимация закрытия
        this.content.style.transition = 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)';
        this.content.style.transform = 'scale(0.95) translateY(20px)';
        this.content.style.opacity = '0';

        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.style.visibility = 'hidden';
            this.modal.style.opacity = '0';
            this.modal.classList.add('hidden');
            
            // Восстанавливаем сайдбар
            const drawer = document.getElementById('drawer');
            if (drawer) {
                drawer.style.pointerEvents = 'auto';
                drawer.style.opacity = '1';
            }

            document.body.style.overflow = '';

            this._isOpen = false;
            this._isClosing = false;

            // ✅ Отправляем событие о закрытии модалки
            if (this.eventBus) {
                this.eventBus.emit('modal:close', { 
                    modalId: this._modalId,
                    action: 'close'
                });
            }

            // Очищаем тело модалки
            this.body.innerHTML = '';
            this.footer.innerHTML = '';
            this.footer.classList.add('hidden');

            // Вызываем onClose
            if (this._callbacks.onClose) {
                this._callbacks.onClose();
            }

            // Очищаем колбэки
            this._callbacks = {};
            this._modalId = null;

            console.log('📱 Модалка закрыта');
        }, 300);
    }

    // ==========================================
    // ПРОВЕРКА СОСТОЯНИЯ
    // ==========================================

    isOpen() {
        return this._isOpen;
    }

    getModalId() {
        return this._modalId;
    }

    // ==========================================
    // ОБНОВЛЕНИЕ КОНТЕНТА
    // ==========================================

    updateContent(content) {
        if (this._isOpen) {
            this.body.innerHTML = content;
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        }
    }

    updateTitle(title) {
        if (this._isOpen) {
            this.title.textContent = title;
        }
    }

    updateFooter(footer) {
        if (this._isOpen) {
            if (footer) {
                this.footer.innerHTML = footer;
                this.footer.classList.remove('hidden');
                
                const saveBtn = this.footer.querySelector('#modal-save-btn');
                const cancelBtn = this.footer.querySelector('#modal-cancel-btn');
                
                if (saveBtn) {
                    saveBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this._callbacks.onSave) {
                            this._callbacks.onSave();
                        }
                    });
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this._callbacks.onCancel) {
                            this._callbacks.onCancel();
                        }
                        this.close();
                    });
                }
            } else {
                this.footer.innerHTML = '';
                this.footer.classList.add('hidden');
            }
        }
    }

    // ==========================================
    // ПРИНУДИТЕЛЬНОЕ ЗАКРЫТИЕ
    // ==========================================

    forceClose() {
        if (this._isOpen) {
            this.modal.style.display = 'none';
            this.modal.style.visibility = 'hidden';
            this.modal.style.opacity = '0';
            this.modal.classList.add('hidden');
            
            const drawer = document.getElementById('drawer');
            if (drawer) {
                drawer.style.pointerEvents = 'auto';
                drawer.style.opacity = '1';
            }
            
            document.body.style.overflow = '';
            this._isOpen = false;
            this._isClosing = false;
            this.body.innerHTML = '';
            this.footer.innerHTML = '';
            this.footer.classList.add('hidden');
            this._callbacks = {};
            this._modalId = null;
            
            if (this.eventBus) {
                this.eventBus.emit('modal:close', { 
                    modalId: this._modalId,
                    action: 'force'
                });
            }
            
            console.log('📱 Модалка принудительно закрыта');
        }
    }
}

// ==========================================
// СОЗДАЕМ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР
// ==========================================

window.ModalManager = ModalManager;
window.modalManager = new ModalManager();

// Глобальные функции для удобства
window.showModal = function(options) {
    window.modalManager.open(options);
};

window.closeModal = function() {
    window.modalManager.close();
};

console.log('✅ ModalManager v2.0.0 загружен');
