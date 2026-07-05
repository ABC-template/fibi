// ============================================
// js/core/event-bus.js
// Описание: Центральная шина событий для реактивности
// Версия: 1.0.0
// ============================================

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this._isDebug = false;
    }

    /**
     * Подписаться на событие
     * @param {string} event - Название события
     * @param {Function} callback - Функция-обработчик
     * @param {*} context - Контекст (this) для обработчика
     * @returns {Function} - Функция для отписки
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = {
            callback: callback,
            context: context || null,
            id: Date.now() + '_' + Math.random().toString(36).substring(2, 6)
        };

        this.listeners.get(event).push(listener);

        if (this._isDebug) {
            console.log(`📡 [EventBus] Подписка на "${event}" (id: ${listener.id})`);
        }

        // Возвращаем функцию для отписки
        return () => this.off(event, listener.id);
    }

    /**
     * Подписаться на событие один раз
     */
    once(event, callback, context = null) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }

        const listener = {
            callback: callback,
            context: context || null,
            id: Date.now() + '_' + Math.random().toString(36).substring(2, 6)
        };

        this.onceListeners.get(event).push(listener);

        if (this._isDebug) {
            console.log(`📡 [EventBus] Подписка "один раз" на "${event}" (id: ${listener.id})`);
        }

        return () => this.off(event, listener.id);
    }

    /**
     * Отписаться от события
     */
    off(event, listenerId) {
        let removed = false;

        // Проверяем обычные подписки
        if (this.listeners.has(event)) {
            const initialLength = this.listeners.get(event).length;
            this.listeners.set(
                event,
                this.listeners.get(event).filter(l => l.id !== listenerId)
            );
            if (this.listeners.get(event).length < initialLength) {
                removed = true;
            }
        }

        // Проверяем "один раз" подписки
        if (this.onceListeners.has(event)) {
            const initialLength = this.onceListeners.get(event).length;
            this.onceListeners.set(
                event,
                this.onceListeners.get(event).filter(l => l.id !== listenerId)
            );
            if (this.onceListeners.get(event).length < initialLength) {
                removed = true;
            }
        }

        if (this._isDebug && removed) {
            console.log(`📡 [EventBus] Отписка от "${event}" (id: ${listenerId})`);
        }

        return removed;
    }

    /**
     * Отписаться от всех событий (для конкретного контекста)
     */
    offAll(context) {
        let count = 0;

        for (const [event, listeners] of this.listeners) {
            const filtered = listeners.filter(l => l.context !== context);
            if (filtered.length < listeners.length) {
                count += listeners.length - filtered.length;
                this.listeners.set(event, filtered);
            }
        }

        for (const [event, listeners] of this.onceListeners) {
            const filtered = listeners.filter(l => l.context !== context);
            if (filtered.length < listeners.length) {
                count += listeners.length - filtered.length;
                this.onceListeners.set(event, filtered);
            }
        }

        if (this._isDebug && count > 0) {
            console.log(`📡 [EventBus] Отписка от всех событий для контекста (${count} подписок)`);
        }

        return count;
    }

    /**
     * Отписаться от всех событий (полная очистка)
     */
    clear() {
        const total = this.listeners.size + this.onceListeners.size;
        this.listeners.clear();
        this.onceListeners.clear();

        if (this._isDebug) {
            console.log(`📡 [EventBus] Полная очистка (${total} событий)`);
        }
    }

    /**
     * Вызвать событие
     * @param {string} event - Название события
     * @param {*} data - Данные события
     * @param {*} sender - Отправитель (обычно this)
     */
    emit(event, data = null, sender = null) {
        if (this._isDebug) {
            console.log(`📡 [EventBus] Событие "${event}"`, data);
        }

        // Вызываем обычные подписки
        if (this.listeners.has(event)) {
            const listeners = [...this.listeners.get(event)];
            for (const listener of listeners) {
                try {
                    listener.callback.call(listener.context, data, sender, event);
                } catch (err) {
                    console.error(`❌ [EventBus] Ошибка в обработчике "${event}":`, err);
                }
            }
        }

        // Вызываем подписки "один раз"
        if (this.onceListeners.has(event)) {
            const listeners = [...this.onceListeners.get(event)];
            // Удаляем их сразу после вызова
            this.onceListeners.delete(event);

            for (const listener of listeners) {
                try {
                    listener.callback.call(listener.context, data, sender, event);
                } catch (err) {
                    console.error(`❌ [EventBus] Ошибка в once-обработчике "${event}":`, err);
                }
            }
        }
    }

    /**
     * Включить/выключить отладку
     */
    setDebug(enabled) {
        this._isDebug = enabled;
        console.log(`📡 [EventBus] Отладка ${enabled ? 'включена' : 'выключена'}`);
    }

    /**
     * Получить количество подписок на событие
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).length;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).length;
        }
        return count;
    }

    /**
     * Получить все события
     */
    getEvents() {
        const events = new Set();
        for (const key of this.listeners.keys()) {
            events.add(key);
        }
        for (const key of this.onceListeners.keys()) {
            events.add(key);
        }
        return Array.from(events);
    }
}

// Создаем глобальный экземпляр
window.EventBus = EventBus;
window.eventBus = new EventBus();

// Включаем отладку в development (можно закомментировать)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.eventBus.setDebug(true);
}

console.log('✅ EventBus v1.0.0 загружен');
