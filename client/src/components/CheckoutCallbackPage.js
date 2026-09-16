import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice } from '../utils/cart';
import './CheckoutPages.css';

const CheckoutCallbackPage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const authority = params.get('Authority') || params.get('authority') || '';
    const status = params.get('Status') || params.get('status') || '';
    const [state, setState] = useState({ loading: true, ok: false, message: '', order: null });

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!authority || String(status).toUpperCase() !== 'OK') {
                if (!cancelled) {
                    setState({
                        loading: false,
                        ok: false,
                        message: 'پرداخت انجام نشد یا توسط شما لغو شد.',
                        order: null
                    });
                }
                return;
            }
            try {
                const res = await fetch('/api/shop/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authority, status })
                });
                const data = await res.json().catch(() => ({}));
                if (!cancelled) {
                    setState({
                        loading: false,
                        ok: res.ok && data.ok !== false,
                        message: data.message || (res.ok ? 'پرداخت با موفقیت انجام شد.' : 'اعتبارسنجی پرداخت ناموفق بود.'),
                        order: data.order || null,
                        refId: data.refId
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setState({
                        loading: false,
                        ok: false,
                        message: err.message || 'خطا در بررسی پرداخت',
                        order: null
                    });
                }
            }
        };
        run();
        return () => { cancelled = true; };
    }, [authority, status]);

    return (
        <div className="checkout-page shop-world">
            <MainNavbar />
            <main className="checkout-main">
                <h1>نتیجه پرداخت</h1>
                <section className={`checkout-card ${state.ok ? 'is-ok' : ''}`}>
                    {state.loading && <p>در حال بررسی پرداخت...</p>}
                    {!state.loading && (
                        <>
                            <h2>{state.ok ? 'پرداخت موفق' : 'پرداخت ناموفق'}</h2>
                            <p>{state.message}</p>
                            {state.refId && <p>شماره پیگیری: <strong>{state.refId}</strong></p>}
                            {state.order && (
                                <p>مبلغ سفارش: {formatPrice(state.order.total)} — سفارش #{state.order.id}</p>
                            )}
                            <div className="checkout-callback-actions">
                                <Link to="/orders" className="checkout-submit">سفارش‌های من</Link>
                                <Link to="/shop" className="checkout-ghost">ادامه خرید</Link>
                            </div>
                        </>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutCallbackPage;
