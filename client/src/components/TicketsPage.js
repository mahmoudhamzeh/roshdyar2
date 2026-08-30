import React, { useEffect, useState } from 'react';
import './TicketsPage.css';

const API = '';
const FALLBACK_GROUPS = {
    'حساب کاربری': ['ورود و ثبت‌نام', 'پروفایل', 'رمز عبور'],
    'کودکان و پرونده': ['ثبت کودک', 'واکسیناسیون', 'نمودار رشد', 'پرونده سلامت'],
    'فروشگاه': ['سفارش', 'پرداخت', 'محصول'],
    'فنی': ['خطای سایت', 'پیشنهاد'],
    'سایر': ['عمومی']
};

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

    const loadTickets = async () => {
        setLoading(true);
        setError('');
        try {
            const [listRes, groupRes] = await Promise.all([
                fetch(`${API}/api/tickets`),
                fetch(`${API}/api/tickets/groups`)
            ]);
            if (!listRes.ok) throw new Error('بارگذاری تیکت‌ها ناموفق بود');
            setTickets(await listRes.json());
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

    const statusLabel = {
        open: 'باز',
        answered: 'پاسخ داده‌شده',
        closed: 'بسته‌شده'
    };
    const subgroups = groups[groupName] || [];

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
            {error && <p className="tickets-error">{error}</p>}
            {loading ? (
                <p>در حال بارگذاری...</p>
            ) : tickets.length === 0 ? (
                <p className="tickets-empty">هنوز تیکتی ثبت نکرده‌اید.</p>
            ) : (
                <ul className="tickets-list">
                    {tickets.map((ticket) => (
                        <li key={ticket.id} className="ui-card tickets-item">
                            <button type="button" onClick={() => setSelected(ticket)}>
                                <span>
                                    <strong>{ticket.subject}</strong>
                                    <small className="ticket-number">{ticket.ticketNumber || `TK-${String(ticket.id).padStart(5, '0')}`}</small>
                                </span>
                                <span className={`ticket-pill status-${ticket.status}`}>
                                    {statusLabel[ticket.status] || ticket.status}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected && (
                <div className="tickets-detail ui-card">
                    <div className="tickets-detail-head">
                        <h3>{selected.subject}</h3>
                        <button type="button" className="ui-btn-secondary ui-btn" onClick={() => setSelected(null)}>بستن</button>
                    </div>
                    <p className="ticket-number">شماره تیکت: {selected.ticketNumber || `TK-${String(selected.id).padStart(5, '0')}`}</p>
                    <p>{selected.groupName} / {selected.subgroup}</p>
                    <p>{selected.content || selected.message}</p>
                    {(selected.attachments || []).map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">مشاهده پیوست</a>
                    ))}
                    {(selected.replies || []).map((reply, index) => (
                        <div key={index} className="tickets-reply">
                            <strong>پاسخ پشتیبانی</strong>
                            <p>{reply.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TicketsPage;
