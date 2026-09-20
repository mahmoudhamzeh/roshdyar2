import React, { useEffect, useState } from 'react';
import { formatToShamsi } from '../../utils/dateConverter';
import './TicketManagement.css';

const STATUS_LABELS = {
    open: 'باز',
    in_review: 'در حال بررسی',
    waiting_user: 'در انتظار پاسخ کاربر',
    answered: 'در انتظار پاسخ کاربر',
    closed: 'بسته'
};

const FILTERS = [
    { id: 'all', label: 'همه', countKey: 'total' },
    { id: 'open', label: 'باز', countKey: 'open' },
    { id: 'in_review', label: 'در حال بررسی', countKey: 'in_review' },
    { id: 'waiting_user', label: 'در انتظار پاسخ کاربر', countKey: 'waiting_user' },
    { id: 'closed', label: 'بسته', countKey: 'closed' }
];

const emptyCounts = { open: 0, in_review: 0, waiting_user: 0, closed: 0, total: 0 };

const ticketNumberOf = (ticket) => ticket.ticketNumber || (ticket.id != null ? `TK-${String(ticket.id).padStart(5, '0')}` : '');

const userLabel = (ticket) => (
    (ticket.user && ticket.user.displayName)
    || ticket.userName
    || (ticket.user && ticket.user.username)
    || (ticket.userId != null ? `کاربر #${ticket.userId}` : 'کاربر نامشخص')
);

const userContact = (ticket) => (
    [
        ticket.user && ticket.user.username,
        ticket.user && ticket.user.mobile,
        ticket.user && ticket.user.email
    ].filter(Boolean).join(' · ')
);

const formatWhen = (value) => {
    if (!value) return '';
    try {
        return formatToShamsi(value) || String(value).slice(0, 16).replace('T', ' ');
    } catch (_) {
        return String(value).slice(0, 16).replace('T', ' ');
    }
};

const TicketManagement = () => {
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState(emptyCounts);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [reply, setReply] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchTickets = async (nextFilter = filter, nextQuery = query) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (nextFilter && nextFilter !== 'all') params.set('status', nextFilter);
            if (nextQuery.trim()) params.set('q', nextQuery.trim());
            const qs = params.toString();
            const response = await fetch(`/api/admin/tickets${qs ? `?${qs}` : ''}`);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'بارگذاری تیکت‌ها ناموفق بود');
            }
            const data = await response.json();
            const list = Array.isArray(data) ? data : (data.tickets || []);
            setTickets(list);
            setCounts((data && data.counts) || emptyCounts);
            setSelected((current) => {
                if (!current) return current;
                return list.find((item) => Number(item.id) === Number(current.id)) || current;
            });
        } catch (err) {
            setError(err.message);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets('all', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const visibleTickets = tickets;

    const openTicket = async (ticket) => {
        setNotice('');
        setReply('');
        setSelected(ticket);
        try {
            const response = await fetch(`/api/admin/tickets/${ticket.id}`);
            if (!response.ok) return;
            const data = await response.json();
            setSelected(data);
        } catch (_) {
            /* list payload is enough to show the thread */
        }
    };

    const closeModal = () => {
        setSelected(null);
        setReply('');
    };

    const updateTicket = async ({ status, replyText } = {}) => {
        if (!selected) return;
        const payload = {};
        if (status) payload.status = status;
        if (replyText != null) payload.reply = replyText;
        setSaving(true);
        setNotice('');
        setError('');
        try {
            const response = await fetch(`/api/admin/tickets/${selected.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'ثبت تغییرات ناموفق بود');
            setSelected(data);
            setReply('');
            setNotice(replyText ? 'پاسخ ثبت شد و تیکت در انتظار پاسخ کاربر است.' : `وضعیت به «${STATUS_LABELS[data.status] || data.status}» تغییر کرد.`);
            await fetchTickets(filter, query);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!reply.trim()) return;
        await updateTicket({ replyText: reply.trim() });
    };

    return (
        <div className="ticket-management">
            <header className="ticket-mgmt-head">
                <h2>مدیریت تیکت‌ها</h2>
                <p>تیکت هر کاربر را با نام او ببینید، پاسخ بدهید، ببندید یا در انتظار پاسخ کاربر بگذارید.</p>
            </header>

            <div className="ticket-report-grid">
                {FILTERS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`ticket-report-card status-${item.id} ${filter === item.id ? 'is-on' : ''}`}
                        onClick={() => {
                            setFilter(item.id);
                            fetchTickets(item.id, query);
                        }}
                    >
                        <span>{item.label}</span>
                        <strong>{counts[item.countKey] || 0}</strong>
                    </button>
                ))}
            </div>

            <form
                className="ticket-mgmt-toolbar"
                onSubmit={(e) => {
                    e.preventDefault();
                    fetchTickets(filter, query);
                }}
            >
                <input
                    className="ui-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="جستجو با نام کاربر، موبایل، موضوع یا شماره تیکت"
                />
                <button type="submit" className="ui-btn">جستجو</button>
            </form>

            {loading && <p>در حال بارگذاری تیکت‌ها...</p>}
            {error && <p className="ticket-mgmt-error">{error}</p>}
            {notice && !selected && <p className="ticket-mgmt-notice">{notice}</p>}
            {!loading && !error && visibleTickets.length === 0 && (
                <p className="ticket-mgmt-empty">تیکتی در این وضعیت ثبت نشده است.</p>
            )}

            <div className="tickets-list">
                {visibleTickets.map((ticket) => (
                    <article key={ticket.id} className={`ticket-item status-${ticket.status}`}>
                        <div className="ticket-summary">
                            <span className="ticket-kicker">{ticketNumberOf(ticket)}</span>
                            <h4>{ticket.subject}</h4>
                            <p className="ticket-user">
                                <strong>{userLabel(ticket)}</strong>
                            </p>
                            {userContact(ticket) && (
                                <p className="ticket-user-meta" dir="ltr">{userContact(ticket)}</p>
                            )}
                            <p>{ticket.groupName} / {ticket.subgroup}</p>
                            <span className={`ticket-status status-${ticket.status}`}>
                                {STATUS_LABELS[ticket.status] || ticket.status}
                            </span>
                            {ticket.createdAt && <small>{formatWhen(ticket.createdAt)}</small>}
                        </div>
                        <button type="button" onClick={() => openTicket(ticket)} className="btn-view">مشاهده و پاسخ</button>
                    </article>
                ))}
            </div>

            {selected && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
                        <header className="ticket-modal-head">
                            <div>
                                <p className="ticket-kicker">{ticketNumberOf(selected)}</p>
                                <h2>{selected.subject}</h2>
                            </div>
                            <span className={`ticket-status status-${selected.status}`}>
                                {STATUS_LABELS[selected.status] || selected.status}
                            </span>
                        </header>
                        <div className="ticket-user-card">
                            <strong>{userLabel(selected)}</strong>
                            <span dir="ltr">
                                {userContact(selected) || `شناسه کاربر: ${selected.userId}`}
                            </span>
                        </div>
                        <p className="ticket-meta">{selected.groupName} / {selected.subgroup}</p>
                        {notice && <p className="ticket-mgmt-notice">{notice}</p>}
                        {error && <p className="ticket-mgmt-error">{error}</p>}
                        <div className="ticket-history">
                            <div className="ticket-bubble is-user">
                                <strong>{userLabel(selected)}</strong>
                                <p>{selected.content || selected.message}</p>
                                <small>{formatWhen(selected.createdAt)}</small>
                                {(selected.attachments || []).map((url) => (
                                    <p key={url}><a href={url} target="_blank" rel="noreferrer">پیوست</a></p>
                                ))}
                            </div>
                            {(selected.replies || []).map((item, index) => (
                                <div key={`${item.createdAt || index}-${index}`} className={`ticket-bubble ${item.authorRole === 'admin' ? 'is-admin' : 'is-user'}`}>
                                    <strong>{item.authorName || (item.authorRole === 'admin' ? 'پشتیبانی' : userLabel(selected))}</strong>
                                    <p>{item.content}</p>
                                    <small>{formatWhen(item.createdAt)}</small>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleReplySubmit} className="reply-form">
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder="پاسخ خود را برای کاربر بنویسید..."
                                rows="4"
                            />
                            <div className="modal-actions">
                                <button type="submit" disabled={saving || !reply.trim()}>ارسال پاسخ</button>
                                <button type="button" disabled={saving} onClick={() => updateTicket({ status: 'in_review' })}>در حال بررسی</button>
                                <button type="button" disabled={saving} onClick={() => updateTicket({ status: 'waiting_user' })}>در انتظار پاسخ کاربر</button>
                                <button type="button" className="is-danger" disabled={saving} onClick={() => updateTicket({ status: 'closed' })}>بستن تیکت</button>
                                <button type="button" className="is-ghost" onClick={closeModal}>انصراف</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketManagement;
