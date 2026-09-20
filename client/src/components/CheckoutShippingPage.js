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
import { getAuthToken, getLoggedInUser, setAuthSession } from '../api';
import { isUserProfileComplete, profileCompletePath, userFullName } from '../utils/profile';
import './CheckoutPages.css';

const emptyForm = {
    title: 'خانه',
    phone: '',
    province: '',
    city: '',
    address: '',
    postalCode: ''
};

const splitName = (value) => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const CheckoutShippingPage = () => {
    const history = useHistory();
    const days = useMemo(() => deliveryDays(7), []);
    const [buyer, setBuyer] = useState(getLoggedInUser());
    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [lat, setLat] = useState(35.6892);
    const [lng, setLng] = useState(51.3890);
    const [deliveryDate, setDeliveryDate] = useState(days[0] ? days[0].iso : '');
    const [deliverySlot, setDeliverySlot] = useState(DELIVERY_SLOTS[0].id);
    const [notes, setNotes] = useState('');
    const [recipientType, setRecipientType] = useState('self');
    const [otherFirstName, setOtherFirstName] = useState('');
    const [otherLastName, setOtherLastName] = useState('');
    const [otherPhone, setOtherPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const loadAddresses = useCallback(async (user) => {
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
            const nextType = draft.recipientType === 'other' ? 'other' : 'self';
            setRecipientType(nextType);
            if (nextType === 'other') {
                const parts = splitName(draft.recipient);
                setOtherFirstName(draft.recipientFirstName || parts.firstName);
                setOtherLastName(draft.recipientLastName || parts.lastName);
                setOtherPhone(draft.recipientPhone || draft.phone || '');
            }
            setForm((prev) => ({
                ...prev,
                phone: draft.phone || (preferred && preferred.phone) || (user && user.mobile) || '',
                province: (user && user.province) || prev.province,
                city: (user && user.city) || prev.city
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
        const logged = getLoggedInUser();
        if (!logged || !logged.id) {
            history.replace('/login?next=/checkout/shipping');
            return;
        }
        let cancelled = false;
        (async () => {
            let current = logged;
            try {
                const res = await fetch(`/api/users/${logged.id}`);
                if (res.ok) current = await res.json();
            } catch {
                current = logged;
            }
            if (cancelled) return;
            setBuyer(current);
            if (current && current.id) setAuthSession(current, getAuthToken());
            if (!isUserProfileComplete(current)) {
                history.replace(profileCompletePath('/checkout/shipping'));
                return;
            }
            await loadAddresses(current);
        })();
        return () => { cancelled = true; };
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
                    recipient: userFullName(buyer),
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
        if (!isUserProfileComplete(buyer)) {
            history.replace(profileCompletePath('/checkout/shipping'));
            return;
        }
        const chosen = addresses.find((item) => Number(item.id) === Number(selectedId));
        if (!chosen) {
            setError('یک آدرس ارسال انتخاب کنید یا آدرس جدید ثبت کنید.');
            return;
        }
        if (!deliveryDate || !deliverySlot) {
            setError('روز و بازه زمانی ارسال را انتخاب کنید.');
            return;
        }
        let recipient = userFullName(buyer);
        let recipientPhone = (buyer && buyer.mobile) || chosen.phone || form.phone || '';
        let recipientFirstName = String(buyer && buyer.firstName || '').trim();
        let recipientLastName = String(buyer && buyer.lastName || '').trim();
        if (recipientType === 'other') {
            recipientFirstName = otherFirstName.trim();
            recipientLastName = otherLastName.trim();
            recipientPhone = otherPhone.trim();
            recipient = [recipientFirstName, recipientLastName].filter(Boolean).join(' ');
            if (!recipientFirstName || !recipientLastName || !recipientPhone) {
                setError('نام، نام خانوادگی و شماره تماس تحویل‌گیرنده را وارد کنید.');
                return;
            }
        } else if (!recipientPhone) {
            setError('شماره تماس را در پروفایل یا آدرس وارد کنید.');
            return;
        }
        saveCheckoutDraft({
            addressId: chosen.id,
            shippingAddress: formatAddressLine(chosen),
            phone: recipientPhone,
            recipient,
            recipientType,
            recipientFirstName,
            recipientLastName,
            recipientPhone,
            lat: lat != null ? lat : chosen.lat,
            lng: lng != null ? lng : chosen.lng,
            deliveryDate,
            deliverySlot,
            notes
        });
        history.push('/checkout/review');
    };

    const buyerName = userFullName(buyer);

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
                    <h2>تحویل گیرنده</h2>
                    <p className="checkout-muted">سفارش را خودتان تحویل می‌گیرید یا شخص دیگری؟</p>
                    <div className="checkout-chips" role="radiogroup" aria-label="تحویل گیرنده">
                        <button
                            type="button"
                            className={recipientType === 'self' ? 'is-on' : ''}
                            onClick={() => setRecipientType('self')}
                        >
                            خودم
                        </button>
                        <button
                            type="button"
                            className={recipientType === 'other' ? 'is-on' : ''}
                            onClick={() => setRecipientType('other')}
                        >
                            شخص دیگری
                        </button>
                    </div>
                    {recipientType === 'self' ? (
                        <p className="checkout-recipient-self">
                            سفارش به نام <strong>{buyerName}</strong>
                            {buyer && buyer.mobile ? ` — ${buyer.mobile}` : ''} تحویل می‌شود.
                        </p>
                    ) : (
                        <div className="checkout-form">
                            <label>
                                نام
                                <input
                                    value={otherFirstName}
                                    onChange={(e) => setOtherFirstName(e.target.value)}
                                    placeholder="نام تحویل‌گیرنده"
                                />
                            </label>
                            <label>
                                نام خانوادگی
                                <input
                                    value={otherLastName}
                                    onChange={(e) => setOtherLastName(e.target.value)}
                                    placeholder="نام خانوادگی تحویل‌گیرنده"
                                />
                            </label>
                            <label className="is-full">
                                شماره تماس
                                <input
                                    type="tel"
                                    value={otherPhone}
                                    onChange={(e) => setOtherPhone(e.target.value)}
                                    placeholder="۰۹۱۲..."
                                />
                            </label>
                        </div>
                    )}
                </section>

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
