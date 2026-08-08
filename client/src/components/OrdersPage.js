import React, { useCallback, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice } from '../utils/cart';
import { formatToShamsi } from '../utils/dateConverter';
import './OrdersPage.css';

const API = '';

const STATUS_LABELS = {
    pending: 'در انتظار تایید',
    confirmed: 'تایید شده',
    shipped: 'ارسال شده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
};

const OrdersPage = () => {
    const history = useHistory();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrders = useCallback(async () => {
        const user = (() => {
            try {
                return JSON.parse(localStorage.getItem('loggedInUser'));
            } catch {
                return null;
            }
        })();

        if (!user || !user.id) {
            history.push('/login');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API}/api/shop/orders`, {
                headers: { 'x-user-id': user.id },
            });
            if (!res.ok) throw new Error('خطا در دریافت سفارش‌ها');
            const data = await res.json();
            setOrders(data);
        } catch (err) {
            setError(err.message || 'خطا در دریافت سفارش‌ها');
        } finally {
            setLoading(false);
        }
    }, [history]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="orders-page">
            <MainNavbar />
            <main className="orders-main">
                <div className="orders-header animate-fade-up">
                    <Link to="/shop" className="product-back">
                        <FontAwesomeIcon icon={faArrowRight} />
                        بازگشت به فروشگاه
                    </Link>
                    <h1>سفارش‌های من</h1>
                </div>

                {loading && <p className="shop-status">در حال بارگذاری...</p>}
                {error && <p className="shop-status shop-error">{error}</p>}

                {!loading && !error && orders.length === 0 && (
                    <div className="orders-empty animate-fade-up">
                        <FontAwesomeIcon icon={faBoxOpen} />
                        <p>هنوز سفارشی ثبت نکرده‌اید</p>
                        <Link to="/shop" className="shop-btn shop-btn-primary">رفتن به فروشگاه</Link>
                    </div>
                )}

                {!loading && !error && orders.length > 0 && (
                    <div className="orders-list">
                        {orders.map((order, index) => (
                            <article
                                key={order.id}
                                className="order-card animate-fade-up"
                                style={{ animationDelay: `${0.04 * index}s` }}
                            >
                                <header className="order-card-head">
                                    <div>
                                        <h2>سفارش #{order.id}</h2>
                                        <time>
                                            {order.createdAt
                                                ? formatToShamsi(order.createdAt.split('T')[0])
                                                : '—'}
                                        </time>
                                    </div>
                                    <span className={`order-status status-${order.status}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                </header>
                                <ul className="order-items">
                                    {(order.items || []).map((item) => (
                                        <li key={`${order.id}-${item.productId}`}>
                                            <span>{item.name} × {item.quantity}</span>
                                            <strong>{formatPrice(item.lineTotal)}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <footer className="order-card-foot">
                                    <span>آدرس: {order.shippingAddress}</span>
                                    <strong>جمع: {formatPrice(order.total)}</strong>
                                </footer>
                            </article>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default OrdersPage;
