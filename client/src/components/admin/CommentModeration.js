import React, { useEffect, useState } from 'react';
import { formatRating, stars } from '../../utils/shop';
import './ProductManagement.css';

const FILTERS = [
    { id: 'pending', label: 'در انتظار تأیید' },
    { id: 'approved', label: 'تأیید شده' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'all', label: 'همه' }
];

const CommentModeration = () => {
    const [comments, setComments] = useState([]);
    const [status, setStatus] = useState('pending');
    const [error, setError] = useState('');

    const load = async (nextStatus = status) => {
        const query = nextStatus && nextStatus !== 'all' ? `?status=${nextStatus}` : '?status=all';
        const res = await fetch(`/api/admin/shop/comments${query}`);
        if (!res.ok) {
            setError('بارگذاری نظرات ناموفق بود');
            return;
        }
        setComments(await res.json());
        setError('');
    };

    useEffect(() => {
        load(status);
    }, [status]);

    const update = async (comment, nextStatus) => {
        const res = await fetch(`/api/admin/shop/comments/${comment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        if (!res.ok) {
            setError('به‌روزرسانی نظر ناموفق بود');
            return;
        }
        load(status);
    };

    return (
        <div className="product-management">
            <h2>بررسی نظرات فروشگاه</h2>
            <p>نظر کاربران فقط پس از تأیید کارشناس روی صفحه محصول دیده می‌شود.</p>
            {error && <p className="error-message">{error}</p>}
            <div className="product-skill-picks" style={{ marginBottom: '1rem' }}>
                {FILTERS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={status === item.id ? 'btn-edit' : 'btn-cancel'}
                        onClick={() => setStatus(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div className="products-admin-list">
                {comments.length === 0 && <p>موردی در این وضعیت نیست.</p>}
                {comments.map((comment) => (
                    <div key={comment.id} className="product-admin-item">
                        <div className="product-admin-info">
                            <h3>{comment.productName || `محصول #${comment.productId}`}</h3>
                            <p>
                                {comment.author}
                                {comment.rating ? ` · ${formatRating(comment.rating)} ${stars(comment.rating)}` : ''}
                                {` · ${comment.status}`}
                            </p>
                            <small>{comment.body}</small>
                        </div>
                        <div className="product-admin-actions">
                            {comment.status !== 'approved' && (
                                <button type="button" className="btn-edit" onClick={() => update(comment, 'approved')}>
                                    تأیید
                                </button>
                            )}
                            {comment.status !== 'rejected' && (
                                <button type="button" className="btn-delete" onClick={() => update(comment, 'rejected')}>
                                    رد
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommentModeration;
