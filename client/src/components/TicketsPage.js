import React, { useEffect, useState } from 'react';
import TicketThreadModal from './TicketThreadModal';
import './TicketsPage.css';

const API = '';
const FALLBACK_GROUPS = {
    'حساب کاربری': ['ورود و ثبت‌نام', 'پروفایل', 'رمز عبور'],
    'کودکان و پرونده': ['ثبت کودک', 'واکسیناسیون', 'نمودار رشد', 'پرونده سلامت'],
    'فروشگاه': ['سفارش', 'پرداخت', 'محصول'],
    'فنی': ['خطای سایت', 'پیشنهاد'],
    'سایر': ['عمومی']
};

const STATUS_LABELS = {
    open: 'باز',
    in_review: 'در حال بررسی',
    waiting_user: 'در انتظار پاسخ شما',
    answered: 'در انتظار پاسخ شما',
    closed: 'بسته'
};

const ticketNumberOf = (ticket) => ticket.ticketNumber || (ticket.id != null ? `TK-${String(ticket.id).padStart(5, '0')}` : '');

const TicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [groups, setGroups] = useState(FALLBACK_GROUPS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [groupName, setGroupName] = useState('');
    const [subgroup, setSubgroup] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [selected, setSelected] = useState(null);

    const loadTickets = async (keepSelectedId) => {
        setLoading(true);
        setError('');
        try {
            const [listRes, groupRes] = await Promise.all([
                fetch(`${API}/api/tickets`),
                fetch(`${API}/api/tickets/groups`)
            ]);
            if (!listRes.ok) throw new Error('بارگذاری تیکت‌ها ناموفق بود');
            const list = await listRes.json();
            const ticketsList = Array.isArray(list) ? list : (list.tickets || []);
            setTickets(ticketsList);
            if (keepSelectedId) {
                const next = ticketsList.find((item) => Number(item.id) === Number(keepSelectedId));
                if (next) setSelected(next);
            }
            if (groupRes.ok) {
                const data = await groupRes.json();
                if (data && typeof data === 'object' && !data.message) setGroups(data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName || !subgroup || !subject.trim() || !content.trim()) return;
        setSubmitting(true);
        setSuccess('');
        try {
            const body = new FormData();
            body.append('groupName', groupName);
            body.append('subgroup', subgroup);
            body.append('subject', subject.trim());
            body.append('content', content.trim());
            Array.from(files).forEach((file) => body.append('attachments', file));
            const res = await fetch(`${API}/api/tickets`, { method: 'POST', body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ارسال تیکت ناموفق بود');
            setSubject('');
            setContent('');
            setFiles([]);
            setSuccess(`تیکت ثبت شد. شماره پیگیری: ${data.ticketNumber || data.id}`);
            await loadTickets();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const subgroups = groups[groupName] || [];
    const answeredTickets = tickets.filter((ticket) => (
        ticket.status === 'waiting_user' || ticket.status === 'answered'
    ));

    return (
        <div className="tickets-page">
            <h2>پشتیبانی</h2>
            <p className="tickets-lead">گروه و زیرگروه را انتخاب کنید، متن را بنویسید و در صورت نیاز فایل پیوست کنید.</p>

            <form className="tickets-form ui-card" onSubmit={handleSubmit}>
                <label>
                    گروه
                    <select className="ui-input" value={groupName} onChange={(e) => { setGroupName(e.target.value); setSubgroup(''); }} required>
                        <option value="">انتخاب گروه</option>
                        {Object.keys(groups).map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </label>
                <label>
                    زیرگروه
                    <select className="ui-input" value={subgroup} onChange={(e) => setSubgroup(e.target.value)} required disabled={!groupName}>
                        <option value="">انتخاب زیرگروه</option>
                        {subgroups.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </label>
                <label>
                    موضوع
                    <input className="ui-input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </label>
                <label>
                    متن پیام
                    <textarea className="ui-textarea" rows="4" value={content} onChange={(e) => setContent(e.target.value)} required />
                </label>
                <label>
                    پیوست (اختیاری)
                    <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
                </label>
                <button type="submit" className="ui-btn" disabled={submitting}>
                    {submitting ? 'در حال ارسال...' : 'ارسال تیکت'}
                </button>
            </form>

            {success && <p className="tickets-success">{success}</p>}
            {answeredTickets.length > 0 && (
                <p className="tickets-alert" role="status">
                    تیکت شما پاسخ داده شده است. روی تیکت بزنید تا پاسخ پشتیبانی را ببینید و جواب بدهید.
                </p>
            )}
            {error && <p className="tickets-error">{error}</p>}
            {loading ? (
                <p>در حال بارگذاری...</p>
            ) : tickets.length === 0 ? (
                <p className="tickets-empty">هنوز تیکتی ثبت نکرده‌اید.</p>
            ) : (
                <ul className="tickets-list">
                    {tickets.map((ticket) => (
                        <li key={ticket.id} className={`ui-card tickets-item${ticket.status === 'waiting_user' || ticket.status === 'answered' ? ' is-answered' : ''}`}>
                            <button type="button" onClick={() => setSelected(ticket)}>
                                <span>
                                    <strong>{ticket.subject}</strong>
                                    <small className="ticket-number">{ticketNumberOf(ticket)}</small>
                                </span>
                                <span className={`ticket-pill status-${ticket.status}`}>
                                    {STATUS_LABELS[ticket.status] || ticket.status}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected && (
                <TicketThreadModal
                    ticket={selected}
                    onClose={() => setSelected(null)}
                    onUpdated={(data) => {
                        setSelected(data);
                        loadTickets(data.id);
                    }}
                />
            )}
        </div>
    );
};

export default TicketsPage;
