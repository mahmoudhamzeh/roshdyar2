import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faStore, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import {
    getCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    formatPrice,
} from '../utils/cart';
import './CartPage.css';

const API = '';

const CartPage = () => {
    const history = useHistory();
    const [cart, setCart] = useState(getCart());
    const [shippingAddress, setShippingAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('loggedInUser'));
            if (user) {
                if (user.mobile) setPhone(user.mobile);
                const parts = [user.province, user.city].filter(Boolean).join('، ');
                if (parts) setShippingAddress(parts);
            }
        } catch {
            // ignore
        }
    }, []);

    const refresh = (next) => setCart(next || getCart());

    const handleCheckout = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const user = (() => {
            try {
                return JSON.parse(localStorage.getItem('loggedInUser'));
            } catch {
                return null;
            }
        })();

        if (!user || !user.id) {
            alert('برای ثبت سفارش ابتدا وارد شوید.');
            history.push('/register');
            return;
        }

        if (cart.length === 0) {
            setError('سبد خرید خالی است');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/shop/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                    shippingAddress,
                    phone,
                    notes,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'خطا در ثبت سفارش');

            clearCart();
            refresh([]);
            setSuccess(`سفارش شماره ${data.id} با موفقیت ثبت شد`);
            window.setTimeout(() => history.push('/orders'), 1200);
        } catch (err) {
            setError(err.message || 'خطا در ثبت سفارش');
        } finally {
            setSubmitting(false);
        }
    };

    const total = getCartTotal(cart);

    return (
        <div className="cart-page">
            <MainNavbar />
            <main className="cart-main">
                <div className="cart-header animate-fade-up">
                    <Link to="/shop" className="product-back">
                        <FontAwesomeIcon icon={faArrowRight} />
                        ادامه خرید
                    </Link>
                    <h1>سبد خرید</h1>
                </div>

                {cart.length === 0 ? (
                    <div className="cart-empty animate-fade-up">
                        <FontAwesomeIcon icon={faStore} />
                        <p>سبد خرید شما خالی است</p>
                        <Link to="/shop" className="shop-btn shop-btn-primary">مشاهده فروشگاه</Link>
                        {success && <p className="cart-success">{success}</p>}
                    </div>
                ) : (
                    <div className="cart-layout">
                        <section className="cart-items animate-fade-up">
                            {cart.map((item) => (
                                <div key={item.productId} className="cart-item">
                                    <div className="cart-item-image">
                                        {item.imageUrl ? (
                                            <img src={`${API}${item.imageUrl}`} alt={item.name} />
                                        ) : (
                                            <FontAwesomeIcon icon={faStore} />
                                        )}
                                    </div>
                                    <div className="cart-item-info">
                                        <Link to={`/shop/${item.productId}`}>{item.name}</Link>
                                        <strong>{formatPrice(item.price)}</strong>
                                    </div>
                                    <div className="cart-item-qty">
                                        <label>
                                            تعداد
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.stock || 99}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const qty = parseInt(e.target.value, 10) || 1;
                                                    refresh(updateCartQuantity(item.productId, qty));
                                                }}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className="cart-remove"
                                            onClick={() => refresh(removeFromCart(item.productId))}
                                            aria-label="حذف از سبد"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                    <div className="cart-item-line">
                                        {formatPrice(item.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <aside className="cart-checkout animate-fade-up">
                            <h2>ثبت سفارش</h2>
                            <p className="cart-total">جمع کل: <strong>{formatPrice(total)}</strong></p>
                            <form onSubmit={handleCheckout}>
                                <label>
                                    شماره تماس
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        placeholder="۰۹۱۲..."
                                    />
                                </label>
                                <label>
                                    آدرس ارسال
                                    <textarea
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        required
                                        rows="3"
                                        placeholder="استان، شهر، خیابان، پلاک..."
                                    />
                                </label>
                                <label>
                                    توضیحات (اختیاری)
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows="2"
                                    />
                                </label>
                                {error && <p className="cart-error">{error}</p>}
                                {success && <p className="cart-success">{success}</p>}
                                <button type="submit" disabled={submitting}>
                                    {submitting ? 'در حال ثبت...' : 'ثبت سفارش'}
                                </button>
                            </form>
                        </aside>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default CartPage;
