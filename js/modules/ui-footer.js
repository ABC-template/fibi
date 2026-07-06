document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const inputArea = document.getElementById('input-area');
    const chatContainer = document.getElementById('chat-container');
    const fabBtn = document.getElementById('fab-open-input');
    const overlay = document.getElementById('input-overlay');
    const clearBtn = document.getElementById('clear-input-btn');
    const tg = window.Telegram?.WebApp;
    
    if (userInput && inputArea && chatContainer && fabBtn && overlay && clearBtn) {
        
        if (navigator.virtualKeyboard) {
            navigator.virtualKeyboard.overlaysContent = false;
        }

        const resizeTextArea = () => {
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            
            if (userInput.value.trim().length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        };

        userInput.addEventListener('input', resizeTextArea);

        inputArea.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        window.clearUserText = function(e) {
            if (e) e.stopPropagation();
            userInput.value = '';
            userInput.style.height = 'auto';
            clearBtn.classList.add('hidden');
            userInput.focus();
        };

        window.expandInputArea = function() {
            fabBtn.style.opacity = '0';
            fabBtn.style.pointerEvents = 'none';
            
            overlay.classList.remove('hidden'); 
            inputArea.classList.add('active');
            
            if (userInput.value.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
            
            resizeTextArea();
            userInput.focus();

            // Скрываем нижнюю навигацию при открытии капсулы
            const nav = document.getElementById('bottom-nav');
            if (nav) {
                nav.style.display = 'none';
            }

            // ❌ УДАЛЯЕМ ВСЮ ЛОГИКУ С BACKBUTTON
            // Капсула НЕ влияет на системную кнопку
        };

        window.collapseInputArea = function() {
            if (window.isVoiceRecording) return;

            userInput.blur();
            inputArea.classList.remove('active');
            inputArea.classList.remove('keyboard-up');
            overlay.classList.add('hidden');

            fabBtn.style.opacity = '1';
            fabBtn.style.pointerEvents = 'auto';

            // Возвращаем нижнюю навигацию
            const nav = document.getElementById('bottom-nav');
            if (nav) {
                nav.style.display = 'flex';
            }
            
            // ❌ УДАЛЯЕМ ВСЮ ЛОГИКУ С BACKBUTTON
            // Капсула НЕ влияет на системную кнопку
        };

        overlay.addEventListener('click', () => {
            window.collapseInputArea();
        });
        
        if (tg) {
            try {
                tg.onEvent('viewportChanged', () => {
                    if (!inputArea.classList.contains('active')) return;
                    const isKeyboardOpen = window.innerHeight < tg.viewportStableHeight;
                    if (isKeyboardOpen) {
                        inputArea.classList.add('keyboard-up');
                    } else {
                        inputArea.classList.remove('keyboard-up');
                    }
                });
            } catch (err) {
                console.error("Ошибка контроля вьюпорта в капсуле:", err);
            }
        }
    }
});
