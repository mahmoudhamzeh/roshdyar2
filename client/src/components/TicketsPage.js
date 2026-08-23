import React, { useEffect, useState } from 'react';
import './TicketsPage.css';

const API = '';

const TicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selected, setSelected] = useState(null);

    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem('loggedInUser'));
        } catch (_) {
            return null;
        }
    })();

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': user ? String(user.id) : ''
    };

    const loadTickets = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/api/tickets`, { headers });
            if (!res.ok) throw new Error('بارگذاری تیکت‌ها ناموفق بود');
            setTickets(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !content.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/tickets`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ subject: subject.trim(), content: content.trim() })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'ارسال تیکت ناموفق بود');
            }
            setSubject('');
            setContent('');
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

    return (
        <div className="tickets-page">
            <h2>پشتیبانی</h2>
            <p className="tickets-lead">سؤال یا مشکلی دارید؟ تیکت بفرستید تا تیم تات کیدز پاسخ دهد.</p>

            <form className="tickets-form ui-card" onSubmit={handleSubmit}>
                <label>
                    موضوع
                    <input
                        className="ui-input"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="مثلاً مشکل در ثبت واکسن"
                        required
                    />
                </label>
                <label>
                    متن پیام
                    <textarea
                        className="ui-textarea"
                        rows="4"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="توضیح کوتاه بنویسید"
                        required
                    />
                </label>
                <button type="submit" className="ui-btn" disabled={submitting}>
                    {submitting ? 'در حال ارسال...' : 'ارسال تیکت'}
                </button>
            </form>

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
                                <strong>{ticket.subject}</strong>
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
                        <button type="button" className="ui-btn-secondary ui-btn" onClick={() => setSelected(null)}>
                            بستن
                        </button>
                    </div>
                    <p>{selected.content || selected.message}</p>
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
