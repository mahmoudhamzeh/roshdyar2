import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import {
    clearCart,
    formatPrice,
    getCart,
    getCartDiscount,
    getCartItemCount,
    getCartOriginalTotal,
    getCartTotal
} from '../utils/cart';
import { clearCheckoutDraft, formatAddressLine, getCheckoutDraft, slotLabel } from '../utils/checkout';
import { formatToShamsi } from '../utils/dateConverter';
import './CheckoutPages.css';

const CheckoutReviewPage = () => {
    const history = useHistory();
    const cart = useMemo(() => getCart(), []);
    const draft = useMemo(() => getCheckoutDraft(), []);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const ready = Boolean(draft && draft.shippingAddress && cart.length > 0);

    useEffect(() => {
        if (!ready) history.replace(cart.length === 0 ? '/cart' : '/checkout/shipping');
    }, [ready, cart.length, history]);

    const itemCount = getCartItemCount(cart);
    const originalTotal = getCartOriginalTotal(cart);
    const discount = getCartDiscount(cart);
    const total = getCartTotal(cart);

    if (!ready) return null;

    const handlePay = async () => {
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch('/api/shop/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        productId: item.productId,
                        offerId: item.offerId || undefined,
                        quantity: item.quantity
                    })),
                    shippingAddress: draft.shippingAddress,
                    phone: draft.phone,
                    notes: draft.notes || '',
                    deliveryDate: draft.deliveryDate,
                    deliverySlot: draft.deliverySlot,
                    lat: draft.lat,
                    lng: draft.lng,
                    addressId: draft.addressId,
                    startPayment: true
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ثبت سفارش ناموفق بود');
            if (!data.paymentUrl) throw new Error('آدرس درگاه پرداخت دریافت نشد');
            clearCart();
            clearCheckoutDraft();
            window.location.assign(data.paymentUrl);
        } catch (err) {
            setError(err.message || 'ثبت سفارش ناموفق بود');
            setSubmitting(false);
        }
    };

    return (
        <div className="checkout-page shop-world">
            <MainNavbar />
            <main className="checkout-main">
                <Link to="/checkout/shipping" className="product-back">
                    <FontAwesomeIcon icon={faArrowRight} />
                    بازگشت به آدرس و زمان
                </Link>
                <h1>بازبینی و پرداخت</h1>

                <section className="checkout-card">
                    <h2>سفارش</h2>
                    <ul className="checkout-items">
                        {cart.map((item) => (
                            <li key={item.lineKey || item.productId}>
                                <span>{item.name} × {item.quantity}</span>
                                <strong>{formatPrice(item.price * item.quantity)}</strong>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="checkout-card">
                    <h2>آدرس ارسال</h2>
                    <p>{draft.recipient ? `${draft.recipient} — ` : ''}{formatAddressLine(draft.shippingAddress)}</p>
                    {draft.phone && <p className="checkout-muted">{draft.phone}</p>}
                </section>

                <section className="checkout-card">
                    <h2>زمان تحویل</h2>
                    <p>{formatToShamsi(draft.deliveryDate)} — بازه {slotLabel(draft.deliverySlot)}</p>
                </section>

                <aside className="checkout-card checkout-summary">
                    <div className="cart-invoice-row">
                        <span>مجموع قیمت کالاها ({itemCount.toLocaleString('fa-IR')} کالا)</span>
                        <strong>{formatPrice(originalTotal)}</strong>
                    </div>
                    <div className={`cart-invoice-row${discount > 0 ? ' is-profit' : ''}`}>
                        <span>سود شما از خرید</span>
                        <strong>{formatPrice(discount)}</strong>
                    </div>
                    <div className="cart-invoice-row is-total">
                        <span>مبلغ قابل پرداخت</span>
                        <strong>{formatPrice(total)}</strong>
                    </div>
                    {error && <p className="checkout-error">{error}</p>}
                    <button type="button" className="checkout-submit" onClick={handlePay} disabled={submitting}>
                        {submitting ? 'در حال اتصال به درگاه...' : 'تایید و پرداخت'}
                    </button>
                </aside>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutReviewPage;
