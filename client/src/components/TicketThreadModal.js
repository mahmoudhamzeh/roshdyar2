import React, { useEffect, useState } from 'react';
import './TicketsPage.css';

const STATUS_LABELS = {
    open: 'باز',
    in_review: 'در حال بررسی',
    waiting_user: 'در انتظار پاسخ شما',
    answered: 'در انتظار پاسخ شما',
    closed: 'بسته'
};

const ticketNumberOf = (ticket) => ticket.ticketNumber || (ticket.id != null ? `TK-${String(ticket.id).padStart(5, '0')}` : '');

const AttachmentLinks = ({ urls }) => {
    if (!urls || !urls.length) return null;
    return (
        <div className="ticket-attachments">
            {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">مشاهده پیوست</a>
            ))}
        </div>
    );
};

const TicketThreadModal = ({ ticket, onClose, onUpdated }) => {
    const [detail, setDetail] = useState(ticket);
    const [reply, setReply] = useState('');
    const [files, setFiles] = useState([]);
    const [replying, setReplying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        setDetail(ticket);
        setReply('');
        setFiles([]);
        setError('');
        setSuccess('');
    }, [ticket]);

    useEffect(() => {
        if (!ticket || ticket.id == null) return undefined;
        let cancelled = false;
        fetch(`/api/tickets/${ticket.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data) setDetail(data);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [ticket]);

    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    if (!detail) return null;

    const canReply = detail.status !== 'closed';

    const handleReply = async (event) => {
        event.preventDefault();
        if (!reply.trim() && (!files || files.length === 0)) return;
        setReplying(true);
        setError('');
        setSuccess('');
        try {
            const body = new FormData();
            if (reply.trim()) body.append('content', reply.trim());
            Array.from(files || []).forEach((file) => body.append('attachments', file));
            const res = await fetch(`/api/tickets/${detail.id}/replies`, { method: 'POST', body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ارسال پاسخ ناموفق بود');
            setReply('');
            setFiles([]);
            setDetail(data);
            setSuccess('پاسخ شما ثبت شد.');
            if (onUpdated) onUpdated(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setReplying(false);
        }
    };

    return (
        <div className="tickets-modal-overlay" role="presentation" onClick={onClose}>
            <div
                className="tickets-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ticket-thread-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="tickets-modal-head">
                    <div>
                        <p className="ticket-number">شماره تیکت: {ticketNumberOf(detail)}</p>
                        <h3 id="ticket-thread-title">{detail.subject}</h3>
                    </div>
                    <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>بستن</button>
                </header>
                <p className="tickets-modal-meta">{detail.groupName} / {detail.subgroup}</p>
                <span className={`ticket-pill status-${detail.status}`}>
                    {STATUS_LABELS[detail.status] || detail.status}
                </span>
                {success && <p className="tickets-success">{success}</p>}
                {error && <p className="tickets-error">{error}</p>}
                <div className="tickets-thread">
                    <div className="tickets-reply is-user">
                        <strong>پیام شما</strong>
                        <p>{detail.content || detail.message}</p>
                        <AttachmentLinks urls={detail.attachments} />
                    </div>
                    {(detail.replies || []).map((item, index) => (
                        <div key={`${item.createdAt || index}-${index}`} className={`tickets-reply ${item.authorRole === 'admin' ? 'is-admin' : 'is-user'}`}>
                            <strong>{item.authorRole === 'admin' ? (item.authorName || 'پشتیبانی') : 'پیام شما'}</strong>
                            {item.content ? <p>{item.content}</p> : null}
                            <AttachmentLinks urls={item.attachments} />
                        </div>
                    ))}
                </div>
                {canReply ? (
                    <form className="tickets-reply-form" onSubmit={handleReply}>
                        <label>
                            پاسخ شما
                            <textarea
                                className="ui-textarea"
                                rows="3"
                                value={reply}
                                onChange={(event) => setReply(event.target.value)}
                                placeholder="اگر پشتیبانی سؤال کرده، اینجا جواب بدهید."
                            />
                        </label>
                        <label>
                            پیوست (اختیاری)
                            <input
                                type="file"
                                multiple
                                onChange={(event) => setFiles(event.target.files)}
                            />
                        </label>
                        <button
                            type="submit"
                            className="ui-btn"
                            disabled={replying || (!reply.trim() && (!files || files.length === 0))}
                        >
                            {replying ? 'در حال ارسال...' : 'ارسال پاسخ'}
                        </button>
                    </form>
                ) : (
                    <p className="tickets-closed">این تیکت بسته شده است.</p>
                )}
            </div>
        </div>
    );
};

export default TicketThreadModal;
