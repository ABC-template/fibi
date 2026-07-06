// ============================================
// js/core/modal-manager.js
// Описание: Универсальный менеджер модалок
// Версия: 3.1.0 - ЗАЩИТА ОТ ВСПЛЫТИЯ + СИНХРОНИЗАЦИЯ
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

    _initEvents() {
        // ✅ Закрытие по крестику
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // ✅ Закрытие ТОЛЬКО по клику на оверлей
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                e.stopPropagation();
                this.close();
            }
        });

        // ✅ ЗАЩИТА ОТ ВСПЛЫТИЯ: клик по содержимому НЕ закрывает модалку
        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        this.title.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        this.body.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        this.footer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Подписка на закрытие через кнопку "Назад"
        if (this.eventBus) {
            this.eventBus.on('modal:state_changed', (data) => {
                if (data && data.action === 'back' && data.isOpen === false) {
                    this._handleBackClose();
                }
            }, this);
        }

        console.log('✅ ModalManager v3.1.0 инициализирован');
    }

    _handleBackClose() {
        if (this._isOpen && !this._isClosing) {
            console.log('📱 Модалка закрыта через кнопку "Назад"');
            this.close();
        }
    }

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
        this._callbacks = { onOpen, onClose, onSave, onCancel };
        this._modalId = modalId;

        const drawer = document.getElementById('drawer');
        this._wasDrawerOpen = drawer?.classList.contains('active') || false;

        if (this._wasDrawerOpen && drawer) {
            drawer.style.pointerEvents = 'none';
            drawer.style.opacity = '0.5';
            document.body.style.overflow = '';
        }

        this.title.textContent = title;
        this.body.innerHTML = content;

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

        this.modal.style.display = 'flex';
        this.modal.style.visibility = 'visible';
        this.modal.style.opacity = '1';
        this.modal.classList.remove('hidden');
        
        this.content.style.transition = 'none';
        this.content.style.transform = 'scale(0.95) translateY(20px)';
        this.content.style.opacity = '0';
        
        requestAnimationFrame(() => {
            this.content.style.transition = 'all 0.3s cubic-bezier(0.1, 0.8, 0.25, 1)';
            this.content.style.transform = 'scale(1) translateY(0)';
            this.content.style.opacity = '1';
        });

        this._isOpen = true;

        // ✅ Отправляем событие об открытии
        if (this.eventBus) {
            this.eventBus.emit('modal:open', { modalId: this._modalId });
        }

        // ✅ Синхронизируем с navigationState
        if (this.navigationState) {
            this.navigationState.toggleModal(true, this._modalId);
        }

        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);

        if (this._callbacks.onOpen) {
            this._callbacks.onOpen();
        }

        console.log(`📱 Модалка открыта: ${title} (id: ${this._modalId})`);
    }

    close() {
        if (this._isClosing || !this._isOpen) return;
        this._isClosing = true;

        this.content.style.transition = 'all 0.25s cubic-bezier(0.1, 0.8, 0.25, 1)';
        this.content.style.transform = 'scale(0.95) translateY(20px)';
        this.content.style.opacity = '0';

        setTimeout(() => {
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

            // ✅ Отправляем событие о закрытии
            if (this.eventBus) {
                this.eventBus.emit('modal:close', { 
                    modalId: this._modalId,
                    action: 'close'
                });
            }

            // ✅ Синхронизируем с navigationState
            if (this.navigationState) {
                this.navigationState.toggleModal(false, this._modalId);
            }

            this.body.innerHTML = '';
            this.footer.innerHTML = '';
            this.footer.classList.add('hidden');

            if (this._callbacks.onClose) {
                this._callbacks.onClose();
            }

            this._callbacks = {};
            this._modalId = null;

            console.log('📱 Модалка закрыта');
        }, 300);
    }

    isOpen() {
        return this._isOpen;
    }

    getModalId() {
        return this._modalId;
    }

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
            
            if (this.eventBus) {
                this.eventBus.emit('modal:close', { 
                    modalId: this._modalId,
                    action: 'force'
                });
            }
            
            if (this.navigationState) {
                this.navigationState.toggleModal(false, this._modalId);
            }
            
            this._modalId = null;
            
            console.log('📱 Модалка принудительно закрыта');
        }
    }
}

window.ModalManager = ModalManager;

if (!window.modalManager) {
    window.modalManager = new ModalManager();
}

window.showModal = function(options) {
    window.modalManager.open(options);
};

window.closeModal = function() {
    window.modalManager.close();
};

console.log('✅ ModalManager v3.1.0 загружен');
