import React, { useCallback, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice, getCart } from '../utils/cart';
import { formatToShamsi } from '../utils/dateConverter';
import { canonicalOrderStatus, orderStatusLabel } from '../utils/orderStatus';
import './OrdersPage.css';

const API = '';

const SLOT_LABELS = {
    '09-13': '۹ تا ۱۳',
    '13-17': '۱۳ تا ۱۷',
    '17-21': '۱۷ تا ۲۱'
};

const OrdersPage = () => {
    const history = useHistory();
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState(() => getCart());
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
            history.push('/register');
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
        const refreshCart = () => setCart(getCart());
        window.addEventListener('cart-updated', refreshCart);
        window.addEventListener('storage', refreshCart);
        return () => {
            window.removeEventListener('cart-updated', refreshCart);
            window.removeEventListener('storage', refreshCart);
        };
    }, [fetchOrders]);

    return (
        <div className="orders-page shop-world">
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

                {!loading && !error && orders.length === 0 && cart.length === 0 && (
                    <div className="orders-empty animate-fade-up">
                        <FontAwesomeIcon icon={faBoxOpen} />
                        <p>هنوز سفارشی ثبت نکرده‌اید</p>
                        <Link to="/shop" className="shop-btn shop-btn-primary">رفتن به فروشگاه</Link>
                    </div>
                )}

                {!loading && !error && (orders.length > 0 || cart.length > 0) && (
                    <div className="orders-list">
                        {cart.length > 0 && (
                            <article className="order-card animate-fade-up">
                                <header className="order-card-head">
                                    <div>
                                        <h2>سبد خرید</h2>
                                        <time>{cart.length} کالا</time>
                                    </div>
                                    <span className="order-status status-cart">
                                        {orderStatusLabel('cart')}
                                    </span>
                                </header>
                                <ul className="order-items">
                                    {cart.map((item) => (
                                        <li key={item.lineKey || item.productId || item.offerId}>
                                            <span>{item.name} × {item.quantity}</span>
                                            <strong>{formatPrice((item.price || 0) * (item.quantity || 0))}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <footer className="order-card-foot">
                                    <Link to="/cart" className="shop-btn shop-btn-primary">ادامه خرید</Link>
                                </footer>
                            </article>
                        )}
                        {orders.map((order, index) => {
                            const statusId = canonicalOrderStatus(order.status, order.paymentStatus);
                            return (
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
                                    <span className={`order-status status-${statusId}`}>
                                        {orderStatusLabel(order.status, order.paymentStatus)}
                                    </span>
                                </header>
                                <ul className="order-items">
                                    {(order.items || []).map((item) => (
                                        <li key={`${order.id}-${item.id || item.offerId || item.productId}`}>
                                            <span>
                                                {item.name} × {item.quantity}
                                                {item.vendorName ? ` · ${item.vendorName}` : ''}
                                            </span>
                                            <strong>{formatPrice(item.lineTotal)}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <footer className="order-card-foot">
                                    <span>آدرس: {order.shippingAddress}</span>
                                    {order.deliveryDate && (
                                        <span>
                                            تحویل: {formatToShamsi(order.deliveryDate)}
                                            {order.deliverySlot ? ` — ${SLOT_LABELS[order.deliverySlot] || order.deliverySlot}` : ''}
                                        </span>
                                    )}
                                    <strong>جمع: {formatPrice(order.total)}</strong>
                                </footer>
                            </article>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default OrdersPage;
