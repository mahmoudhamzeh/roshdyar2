import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEnvelopeOpenText,
    faLink,
    faTrash,
    faBell,
    faPlus,
    faExclamationTriangle,
    faClock
} from '@fortawesome/free-solid-svg-icons';
import { formatToShamsi } from '../utils/dateConverter';
import './MessagesPage.css';

const API = 'http://localhost:5000';

const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch {
        return null;
    }
};

const MessagesPage = () => {
    const history = useHistory();
    const [messages, setMessages] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('inbox');
    const [showReminderForm, setShowReminderForm] = useState(false);
    const [reminderForm, setReminderForm] = useState({
        title: '',
        description: '',
        alarmDate: '',
        alarmTime: '09:00'
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const fetchMessages = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;
        const res = await fetch(`${API}/api/messages`, {
            headers: { 'x-user-id': String(user.id) }
        });
        if (!res.ok) throw new Error('خطا در دریافت پیام‌ها');
        const data = await res.json();
        setMessages(data);
    }, []);

    const fetchReminders = useCallback(async () => {
        const user = getUser();
        if (!user?.id) return;
        const res = await fetch(`${API}/api/user-reminders`, {
            headers: { 'x-user-id': String(user.id) }
        });
        if (!res.ok) throw new Error('خطا در دریافت یادآوری‌ها');
        const data = await res.json();
        setReminders(data);
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                await Promise.all([fetchMessages(), fetchReminders()]);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [fetchMessages, fetchReminders]);

    const handleOpenMessage = async (message) => {
        const user = getUser();
        if (!user) return;

        if (message.source === 'admin' && !message.isRead) {
            try {
                await fetch(`${API}/api/messages/${message.id}/read`, {
                    method: 'PUT',
                    headers: { 'x-user-id': user.id }
                });
                setMessages(prev =>
                    prev.map(m => (m.id === message.id ? { ...m, isRead: true } : m))
                );
            } catch (err) {
                console.error(err);
            }
        }

        if (message.link) {
            if (message.link.startsWith('http://') || message.link.startsWith('https://')) {
                window.open(message.link, '_blank', 'noopener,noreferrer');
            } else {
                history.push(message.link);
            }
        }
    };

    const handleDeleteMessage = async (e, message) => {
        e.stopPropagation();
        if (message.source === 'auto') return;
        const user = getUser();
        if (!user) return;
        if (!window.confirm('آیا از حذف این پیام مطمئن هستید؟')) return;

        try {
            const res = await fetch(`${API}/api/messages/${message.id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (!res.ok) throw new Error('حذف پیام ناموفق بود');
            setMessages(prev => prev.filter(m => m.id !== message.id));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreateReminder = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        const user = getUser();
        if (!user) return;

        if (!reminderForm.title.trim() || !reminderForm.alarmDate || !reminderForm.alarmTime) {
            setFormError('عنوان، تاریخ و ساعت آلارم الزامی است.');
            return;
        }

        const alarmAt = new Date(`${reminderForm.alarmDate}T${reminderForm.alarmTime}:00`);
        if (Number.isNaN(alarmAt.getTime())) {
            setFormError('زمان آلارم نامعتبر است.');
            return;
        }

        try {
            const res = await fetch(`${API}/api/user-reminders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    title: reminderForm.title.trim(),
                    description: reminderForm.description.trim(),
                    alarmAt: alarmAt.toISOString()
                })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'ثبت یادآوری ناموفق بود');
            }
            setReminderForm({ title: '', description: '', alarmDate: '', alarmTime: '09:00' });
            setShowReminderForm(false);
            setFormSuccess('یادآوری با موفقیت ثبت شد.');
            await fetchReminders();
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleDeleteReminder = async (id) => {
        const user = getUser();
        if (!user) return;
        if (!window.confirm('آیا از حذف این یادآوری مطمئن هستید؟')) return;
        try {
            const res = await fetch(`${API}/api/user-reminders/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user.id }
            });
            if (!res.ok) throw new Error('حذف یادآوری ناموفق بود');
            setReminders(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const formatAlarm = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        return `${formatToShamsi(iso)} — ${time}`;
    };

    const isDue = (iso) => {
        if (!iso) return false;
        return new Date(iso).getTime() <= Date.now();
    };

    if (loading) {
        return <div className="messages-page card"><p>در حال بارگذاری پیام‌ها...</p></div>;
    }

    return (
        <div className="messages-page">
            <div className="card">
                <div className="card-header messages-header">
                    <h2>
                        <FontAwesomeIcon icon={faEnvelopeOpenText} />
                        پیام‌ها و یادآوری‌ها
                    </h2>
                    <div className="messages-tabs">
                        <button
                            type="button"
                            className={activeSection === 'inbox' ? 'active' : ''}
                            onClick={() => setActiveSection('inbox')}
                        >
                            صندوق پیام‌ها
                            {messages.filter(m => !m.isRead).length > 0 && (
                                <span className="badge">{messages.filter(m => !m.isRead).length}</span>
                            )}
                        </button>
                        <button
                            type="button"
                            className={activeSection === 'reminders' ? 'active' : ''}
                            onClick={() => setActiveSection('reminders')}
                        >
                            یادآوری‌های من
                        </button>
                    </div>
                </div>

                {error && <p className="error-message">{error}</p>}
                {formSuccess && <p className="success-message">{formSuccess}</p>}

                {activeSection === 'inbox' && (
                    <div className="messages-list">
                        {messages.length === 0 ? (
                            <p className="empty-state">پیامی برای نمایش وجود ندارد.</p>
                        ) : (
                            messages.map(message => (
                                <article
                                    key={message.id}
                                    className={`message-item ${message.isRead ? 'read' : 'unread'} type-${message.type}`}
                                    onClick={() => handleOpenMessage(message)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') handleOpenMessage(message);
                                    }}
                                >
                                    <div className="message-main">
                                        <div className="message-title-row">
                                            {message.type === 'vaccine_delay' && (
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="vaccine-icon" />
                                            )}
                                            <h3>{message.title}</h3>
                                            {!message.isRead && <span className="new-dot" />}
                                        </div>
                                        <p className="message-body">{message.body}</p>
                                        {message.childName && (
                                            <p className="message-meta">کودک: {message.childName}</p>
                                        )}
                                        {message.imageUrl && (
                                            <img
                                                src={`${API}${message.imageUrl}`}
                                                alt={message.title}
                                                className="message-image"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                        {message.link && (
                                            <p className="message-link">
                                                <FontAwesomeIcon icon={faLink} />
                                                {message.link}
                                            </p>
                                        )}
                                        <p className="message-date">{formatToShamsi(message.createdAt)}</p>
                                    </div>
                                    {message.source !== 'auto' && (
                                        <button
                                            type="button"
                                            className="btn-delete-msg"
                                            title="حذف پیام"
                                            onClick={(e) => handleDeleteMessage(e, message)}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    )}
                                </article>
                            ))
                        )}
                    </div>
                )}

                {activeSection === 'reminders' && (
                    <div className="reminders-section">
                        <div className="reminders-toolbar">
                            <p>یادآوری شخصی با توضیحات و زمان آلارم ثبت کنید.</p>
                            <button
                                type="button"
                                className="btn-add-reminder"
                                onClick={() => setShowReminderForm(v => !v)}
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                ثبت یادآوری
                            </button>
                        </div>

                        {showReminderForm && (
                            <form className="reminder-form" onSubmit={handleCreateReminder}>
                                <div className="form-group">
                                    <label htmlFor="user-reminder-title">عنوان</label>
                                    <input
                                        id="user-reminder-title"
                                        type="text"
                                        value={reminderForm.title}
                                        onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="مثلاً: مراجعه به پزشک"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="user-reminder-desc">توضیحات</label>
                                    <textarea
                                        id="user-reminder-desc"
                                        rows="3"
                                        value={reminderForm.description}
                                        onChange={(e) => setReminderForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="جزئیات یادآوری را بنویسید..."
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="user-reminder-date">تاریخ آلارم</label>
                                        <input
                                            id="user-reminder-date"
                                            type="date"
                                            value={reminderForm.alarmDate}
                                            onChange={(e) => setReminderForm(prev => ({ ...prev, alarmDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="user-reminder-time">ساعت آلارم</label>
                                        <input
                                            id="user-reminder-time"
                                            type="time"
                                            value={reminderForm.alarmTime}
                                            onChange={(e) => setReminderForm(prev => ({ ...prev, alarmTime: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                {formError && <p className="error-message">{formError}</p>}
                                <div className="form-actions">
                                    <button type="submit" className="btn-submit">ذخیره یادآوری</button>
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => setShowReminderForm(false)}
                                    >
                                        انصراف
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="user-reminders-list">
                            {reminders.length === 0 ? (
                                <p className="empty-state">یادآوری ثبت‌شده‌ای ندارید.</p>
                            ) : (
                                reminders
                                    .slice()
                                    .sort((a, b) => new Date(a.alarmAt) - new Date(b.alarmAt))
                                    .map(reminder => (
                                        <article
                                            key={reminder.id}
                                            className={`user-reminder-item ${isDue(reminder.alarmAt) ? 'due' : ''}`}
                                        >
                                            <div>
                                                <h3>
                                                    <FontAwesomeIcon icon={faBell} />
                                                    {reminder.title}
                                                </h3>
                                                {reminder.description && (
                                                    <p className="reminder-desc">{reminder.description}</p>
                                                )}
                                                <p className="reminder-alarm">
                                                    <FontAwesomeIcon icon={faClock} />
                                                    زمان آلارم: {formatAlarm(reminder.alarmAt)}
                                                    {isDue(reminder.alarmAt) && (
                                                        <span className="due-badge">زمان ارسال رسیده</span>
                                                    )}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-delete-msg"
                                                onClick={() => handleDeleteReminder(reminder.id)}
                                                title="حذف یادآوری"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </article>
                                    ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
