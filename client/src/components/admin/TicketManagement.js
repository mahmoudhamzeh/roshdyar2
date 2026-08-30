import React, { useState, useEffect } from 'react';
import './TicketManagement.css';

const TicketManagement = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [reply, setReply] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/tickets', {
                headers: { 'x-user-id': adminUser.id }
            });
            if (!response.ok) throw new Error('Failed to fetch tickets');
            const data = await response.json();
            setTickets(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleViewTicket = (ticket) => {
        setSelectedTicket(ticket);
    };

    const handleCloseModal = () => {
        setSelectedTicket(null);
        setReply('');
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!reply.trim()) return;

        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': adminUser.id
                },
                body: JSON.stringify({ reply: reply })
            });

            if (!response.ok) throw new Error('Failed to submit reply');

            fetchTickets(); // Refresh the list
            handleCloseModal();
            alert('پاسخ با موفقیت ثبت شد');
        } catch (err) {
            alert(`خطا: ${err.message}`);
        }
    };

    return (
        <div className="ticket-management">
            <h2>مدیریت تیکت‌ها</h2>
            {loading && <p>در حال بارگذاری تیکت‌ها...</p>}
            {error && <p className="error-message">{error}</p>}
            <div className="tickets-list">
                {tickets.map(ticket => (
                    <div key={ticket.id} className={`ticket-item status-${ticket.status}`}>
                        <div className="ticket-summary">
                            <span>شماره: {ticket.ticketNumber || `TK-${String(ticket.id).padStart(5, '0')}`}</span>
                            <span>کاربر: {ticket.userId}</span>
                            <h4>{ticket.subject}</h4>
                            <p>{ticket.groupName} / {ticket.subgroup}</p>
                            <span className="ticket-status">{ticket.status}</span>
                        </div>
                        <button onClick={() => handleViewTicket(ticket)} className="btn-view">مشاهده</button>
                    </div>
                ))}
            </div>

            {selectedTicket && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>تیکت {selectedTicket.ticketNumber || selectedTicket.id}</h2>
                        <p><strong>موضوع:</strong> {selectedTicket.subject}</p>
                        <p><strong>کاربر:</strong> {selectedTicket.userId}</p>
                        <p><strong>گروه:</strong> {selectedTicket.groupName} / {selectedTicket.subgroup}</p>
                        <p><strong>وضعیت:</strong> {selectedTicket.status}</p>
                        <div className="ticket-history">
                            <p>{selectedTicket.content || selectedTicket.message}</p>
                            {(selectedTicket.attachments || []).map((url) => (
                                <p key={url}><a href={url} target="_blank" rel="noreferrer">پیوست</a></p>
                            ))}
                            {selectedTicket.replies && selectedTicket.replies.map((r, index) => (
                                <p key={index} className="reply"><strong>پاسخ ادمین:</strong> {r.content}</p>
                            ))}
                        </div>
                        <form onSubmit={handleReplySubmit} className="reply-form">
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder="پاسخ خود را اینجا بنویسید..."
                                rows="4"
                            ></textarea>
                            <div className="modal-actions">
                                <button type="submit">ارسال پاسخ</button>
                                <button type="button" onClick={handleCloseModal}>بستن</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketManagement;
