import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faMapMarkerAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import AddressMap from './AddressMap';
import { getCart } from '../utils/cart';
import {
    DELIVERY_SLOTS,
    deliveryDays,
    formatAddressLine,
    getCheckoutDraft,
    saveCheckoutDraft
} from '../utils/checkout';
import { getLoggedInUser } from '../api';
import './CheckoutPages.css';

const emptyForm = {
    title: 'خانه',
    recipient: '',
    phone: '',
    province: '',
    city: '',
    address: '',
    postalCode: ''
};

const CheckoutShippingPage = () => {
    const history = useHistory();
    const days = useMemo(() => deliveryDays(7), []);
    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [lat, setLat] = useState(35.6892);
    const [lng, setLng] = useState(51.3890);
    const [deliveryDate, setDeliveryDate] = useState(days[0] ? days[0].iso : '');
    const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0].id);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const loadAddresses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/shop/addresses');
            const data = await res.json().catch(() => []);
            if (!res.ok) throw new Error(data.message || 'خطا در دریافت آدرس‌ها');
            const list = Array.isArray(data) ? data : [];
            setAddresses(list);
            const draft = getCheckoutDraft() || {};
            const preferred = list.find((item) => String(item.id) === String(draft.addressId))
                || list.find((item) => item.isDefault)
                || list[0];
            if (preferred) {
                setSelectedId(preferred.id);
                if (preferred.lat != null && preferred.lng != null) {
                    setLat(preferred.lat);
                    setLng(preferred.lng);
                }
                setAdding(false);
            } else {
                setAdding(true);
            }
            if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
            if (draft.deliverySlot) setDeliverySlot(draft.deliverySlot);
            if (draft.notes) setNotes(draft.notes);
            const user = getLoggedInUser() || {};
            setForm((prev) => ({
                ...prev,
                recipient: draft.recipient || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '',
                phone: draft.phone || user.mobile || '',
                province: user.province || prev.province,
                city: user.city || prev.city
            }));
        } catch (err) {
            setError(err.message || 'خطا در دریافت آدرس‌ها');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (getCart().length === 0) {
            history.replace('/cart');
            return;
        }
        loadAddresses();
    }, [history, loadAddresses]);

    const selectAddress = (item) => {
        setSelectedId(item.id);
        setAdding(false);
        if (item.lat != null && item.lng != null) {
            setLat(item.lat);
            setLng(item.lng);
        }
        setError('');
    };

    const handleSaveAddress = async (event) => {
        event.preventDefault();
        setError('');
        if (!form.address.trim()) {
            setError('نشانی را وارد کنید.');
            return;
        }
        if (lat == null || lng == null) {
            setError('محل ارسال را روی نقشه پین کنید.');
            return;
        }
        try {
            const res = await fetch('/api/shop/addresses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    lat,
                    lng,
                    isDefault: addresses.length === 0
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ثبت آدرس ناموفق بود');
            setAddresses((prev) => [data, ...prev]);
            setSelectedId(data.id);
            setAdding(false);
            setForm(emptyForm);
        } catch (err) {
            setError(err.message || 'ثبت آدرس ناموفق بود');
        }
    };

    const handleContinue = () => {
        setError('');
        const chosen = addresses.find((item) => Number(item.id) === Number(selectedId));
        if (!chosen) {
            setError('یک آدرس ارسال انتخاب کنید یا آدرس جدید ثبت کنید.');
            return;
        }
        if (!deliveryDate || !deliverySlot) {
            setError('روز و بازه زمانی ارسال را انتخاب کنید.');
            return;
        }
        saveCheckoutDraft({
            addressId: chosen.id,
            shippingAddress: formatAddressLine(chosen),
            phone: chosen.phone,
            recipient: chosen.recipient,
            lat: lat != null ? lat : chosen.lat,
            lng: lng != null ? lng : chosen.lng,
            deliveryDate,
            deliverySlot,
            notes
        });
        history.push('/checkout/review');
    };

    return (
        <div className="checkout-page shop-world">
            <MainNavbar />
            <main className="checkout-main">
                <Link to="/cart" className="product-back">
                    <FontAwesomeIcon icon={faArrowRight} />
                    بازگشت به سبد
                </Link>
                <h1>آدرس و زمان ارسال</h1>
                {loading && <p className="shop-status">در حال بارگذاری...</p>}
                {error && <p className="checkout-error">{error}</p>}

                <section className="checkout-card">
                    <header>
                        <h2>آدرس ارسال</h2>
                        <button type="button" className="checkout-ghost" onClick={() => { setAdding(true); setSelectedId(null); }}>
                            <FontAwesomeIcon icon={faPlus} />
                            آدرس جدید
                        </button>
                    </header>
                    {addresses.length === 0 && !adding && (
                        <p className="checkout-muted">هنوز آدرسی ذخیره نشده است.</p>
                    )}
                    <div className="checkout-address-list">
                        {addresses.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                className={`checkout-address${Number(item.id) === Number(selectedId) ? ' is-on' : ''}`}
                                onClick={() => selectAddress(item)}
                            >
                                <strong>{item.title || 'آدرس'}</strong>
                                <span>{formatAddressLine(item)}</span>
                                {item.phone && <em>{item.phone}</em>}
                            </button>
                        ))}
                    </div>
                    {adding && (
                        <form className="checkout-form" onSubmit={handleSaveAddress}>
                            <label>
                                عنوان
                                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="خانه، محل کار" />
                            </label>
                            <label>
                                گیرنده
                                <input value={form.recipient} onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))} />
                            </label>
                            <label>
                                شماره تماس
                                <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required placeholder="۰۹۱۲..." />
                            </label>
                            <label>
                                استان
                                <input value={form.province} onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} />
                            </label>
                            <label>
                                شهر
                                <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
                            </label>
                            <label className="is-full">
                                نشانی
                                <textarea rows="2" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required placeholder="خیابان، پلاک، واحد" />
                            </label>
                            <label>
                                کد پستی (اختیاری)
                                <input value={form.postalCode} onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))} />
                            </label>
                            <div className="checkout-form-actions">
                                <button type="submit">ذخیره آدرس</button>
                            </div>
                        </form>
                    )}
                    <div className="checkout-map-wrap">
                        <p>
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                            محل دقیق ارسال را روی نقشه پین کنید
                        </p>
                        <AddressMap lat={lat} lng={lng} onChange={({ lat: nextLat, lng: nextLng }) => { setLat(nextLat); setLng(nextLng); }} />
                    </div>
                </section>

                <section className="checkout-card">
                    <h2>زمان ارسال</h2>
                    <p className="checkout-muted">ارسال از روز بعد ممکن است. یک روز و یک بازه زمانی انتخاب کنید.</p>
                    <div className="checkout-chips">
                        {days.map((day) => (
                            <button
                                type="button"
                                key={day.iso}
                                className={day.iso === deliveryDate ? 'is-on' : ''}
                                onClick={() => setDeliveryDate(day.iso)}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                    <div className="checkout-chips">
                        {DELIVERY_SLOTS.map((slot) => (
                            <button
                                type="button"
                                key={slot.id}
                                className={slot.id === deliverySlot ? 'is-on' : ''}
                                onClick={() => setDeliverySlot(slot.id)}
                            >
                                {slot.label}
                            </button>
                        ))}
                    </div>
                    <label className="checkout-notes">
                        توضیحات سفارش (اختیاری)
                        <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                </section>

                <button type="button" className="checkout-submit" onClick={handleContinue}>
                    ادامه به بازبینی و پرداخت
                </button>
            </main>
            <Footer />
        </div>
    );
};

export default CheckoutShippingPage;
