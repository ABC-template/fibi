// ============================================
// js/store/OrganizerStore.js
// Описание: To-Do, напоминания, трекеры
// Версия: 3.1.0 - ДОБАВЛЕНА ГЕНЕРАЦИЯ СОБЫТИЙ
// ============================================

class OrganizerStore extends BaseStore {
    constructor() {
        super('organizer');
        
        this.load();

        if (Object.keys(this._data).length === 0) {
            this._data = {
                todoItems: [],
                reminders: [],
                trackers: [],
                trackerLogs: []
            };
            this.save();
        }

        if (!this._data.todoItems) this._data.todoItems = [];
        if (!this._data.reminders) this._data.reminders = [];
        if (!this._data.trackers) this._data.trackers = [];
        if (!this._data.trackerLogs) this._data.trackerLogs = [];
    }

    generateId() {
        return 'org_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    }

    // ==========================================
    // TO-DO
    // ==========================================

    addTodo(text, topic) {
        const item = {
            id: this.generateId(),
            text: text,
            topic: topic || window.currentTopic || 'code',
            isCompleted: false,
            createdAt: new Date().toISOString()
        };
        this._data.todoItems.unshift(item);
        this.save();
        
        this._emitChange('organizer:todo_added', { 
            todo: item,
            topic: item.topic
        });
        return item;
    }

    toggleTodo(id) {
        const item = this._data.todoItems.find(t => t.id === id);
        if (item) {
            item.isCompleted = !item.isCompleted;
            this.save();
            this._emitChange('organizer:todo_toggled', { 
                id, 
                isCompleted: item.isCompleted,
                todo: item
            });
        }
        return item;
    }

    deleteTodo(id) {
        const deleted = this._data.todoItems.find(t => t.id === id);
        this._data.todoItems = this._data.todoItems.filter(t => t.id !== id);
        this.save();
        
        this._emitChange('organizer:todo_deleted', { 
            id,
            todo: deleted
        });
    }

    getTodoByTopic(topic) {
        if (!topic) return this._data.todoItems;
        return this._data.todoItems.filter(t => t.topic === topic);
    }

    getTodoStats(topic) {
        const items = topic ? this.getTodoByTopic(topic) : this._data.todoItems;
        const total = items.length;
        const completed = items.filter(t => t.isCompleted).length;
        return { total, completed, pending: total - completed };
    }

    // ==========================================
    // НАПОМИНАНИЯ
    // ==========================================

    setReminders(reminders) {
        this._data.reminders = reminders;
        this.save();
        this._emitChange('organizer:reminders_updated', { count: reminders.length });
    }

    addReminder(reminder) {
        this._data.reminders.push(reminder);
        this.save();
        this._emitChange('organizer:reminder_added', { reminder });
        return reminder;
    }

    deleteReminder(id) {
        const deleted = this._data.reminders.find(r => r.id === id);
        this._data.reminders = this._data.reminders.filter(r => r.id !== id);
        this.save();
        this._emitChange('organizer:reminder_deleted', { id, reminder: deleted });
    }

    getRemindersByTopic(topic) {
        return this._data.reminders.filter(r => r.topic_id === topic && r.status === 'pending');
    }

    // ==========================================
    // ТРЕКЕРЫ
    // ==========================================

    setTrackers(trackers, logs) {
        this._data.trackers = trackers || [];
        this._data.trackerLogs = logs || [];
        this.save();
        this._emitChange('organizer:trackers_updated', { 
            trackers: trackers.length, 
            logs: logs.length 
        });
    }

    addTracker(tracker) {
        this._data.trackers.push(tracker);
        this.save();
        this._emitChange('organizer:tracker_added', { tracker });
        return tracker;
    }

    deleteTracker(id) {
        const deleted = this._data.trackers.find(t => t.id === id);
        this._data.trackers = this._data.trackers.filter(t => t.id !== id);
        this._data.trackerLogs = this._data.trackerLogs.filter(l => l.tracker_id !== id);
        this.save();
        this._emitChange('organizer:tracker_deleted', { id, tracker: deleted });
    }

    addTrackerLog(log) {
        this._data.trackerLogs.push(log);
        this.save();
        this._emitChange('organizer:tracker_log_added', { log });
        return log;
    }

    deleteTrackerLog(id) {
        const deleted = this._data.trackerLogs.find(l => l.id === id);
        this._data.trackerLogs = this._data.trackerLogs.filter(l => l.id !== id);
        this.save();
        this._emitChange('organizer:tracker_log_deleted', { id, log: deleted });
    }

    getTrackersByTopic(topic) {
        return this._data.trackers.filter(t => t.topic_id === topic && t.status === 'active');
    }

    getLogsForTracker(trackerId) {
        return this._data.trackerLogs
            .filter(l => l.tracker_id === trackerId)
            .sort((a, b) => new Date(b.logged_date) - new Date(a.logged_date));
    }
}

window.OrganizerStore = OrganizerStore;
window.organizerStore = new OrganizerStore();

console.log('✅ OrganizerStore v3.1.0 загружен (с генерацией событий)');
