import React, { useEffect, useState } from 'react';
import { formatPrice } from '../../utils/cart';
import { toShamsi } from '../../utils/dateConverter';
import './OrderManagement.css';

const API = '';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'در انتظار تایید' },
    { value: 'confirmed', label: 'تایید شده' },
    { value: 'shipped', label: 'ارسال شده' },
    { value: 'delivered', label: 'تحویل شده' },
    { value: 'cancelled', label: 'لغو شده' },
];

const getAdmin = () => {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch {
        return null;
    }
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const admin = getAdmin();
            const res = await fetch(`${API}/api/admin/orders`, {
                headers: { 'x-user-id': admin.id },
            });
            if (!res.ok) throw new Error('خطا در دریافت سفارش‌ها');
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId, status) => {
        try {
            const admin = getAdmin();
            const res = await fetch(`${API}/api/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': admin.id,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'خطا در به‌روزرسانی وضعیت');
            }
            fetchOrders();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="order-management">
            <h2>مدیریت سفارش‌های فروشگاه</h2>
            {loading && <p>در حال بارگذاری...</p>}
            {error && <p className="order-mgmt-error">{error}</p>}
            {!loading && !error && orders.length === 0 && (
                <p>هنوز سفارشی ثبت نشده است.</p>
            )}
            <div className="orders-admin-list">
                {orders.map((order) => (
                    <div key={order.id} className="order-admin-item">
                        <div className="order-admin-info">
                            <h3>سفارش #{order.id} · کاربر {order.userId}</h3>
                            <p>
                                {order.createdAt
                                    ? toShamsi(order.createdAt.split('T')[0])
                                    : '—'}
                                {' · '}
                                {formatPrice(order.total)}
                            </p>
                            <p>تماس: {order.phone}</p>
                            <p>آدرس: {order.shippingAddress}</p>
                            <ul>
                                {(order.items || []).map((item) => (
                                    <li key={`${order.id}-${item.productId}`}>
                                        {item.name} × {item.quantity} — {formatPrice(item.lineTotal)}
                                    </li>
                                ))}
                            </ul>
                            {order.notes && <small>یادداشت: {order.notes}</small>}
                        </div>
                        <div className="order-admin-status">
                            <label>
                                وضعیت
                                <select
                                    value={order.status}
                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderManagement;
