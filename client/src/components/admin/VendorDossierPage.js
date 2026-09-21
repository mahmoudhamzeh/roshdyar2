import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '../../utils/cart';
import { toShamsi } from '../../utils/dateConverter';
import {
    DOC_LABELS,
    Field,
    LEDGER_LABELS,
    LINE_STATUS_LABELS,
    statusCaption
} from './vendorAdminShared';
import { orderStatusLabel } from '../../utils/orderStatus';
import { VendorDocs } from './vendorAdminShared';
import './VendorManagement.css';

const TABS = [
    { id: 'info', label: 'اطلاعات' },
    { id: 'docs', label: 'مدارک' },
    { id: 'products', label: 'محصولات' },
    { id: 'orders', label: 'سفارش‌ها' },
    { id: 'finance', label: 'مالی' }
];

const emptyForm = (vendor) => ({
    displayName: vendor.displayName || '',
    personKind: vendor.personKind || 'individual',
    ownerName: vendor.ownerName || '',
    nationalId: vendor.nationalId || '',
    legalName: vendor.legalName || '',
    registrationNo: vendor.registrationNo || '',
    economicCode: vendor.economicCode || '',
    phone: vendor.phone || '',
    province: vendor.province || '',
    city: vendor.city || '',
    address: vendor.address || '',
    bankName: vendor.bankName || '',
    bankSheba: vendor.bankSheba || '',
    bankAccount: vendor.bankAccount || '',
    commissionPct: vendor.commissionPct ?? 0,
    settlementCycle: vendor.settlementCycle || 'weekly',
    docsNote: vendor.docsNote || ''
});

const VendorDossierPage = () => {
    const { vendorId } = useParams();
    const [tab, setTab] = useState('info');
    const [payload, setPayload] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);

    const load = async () => {
        const res = await fetch(`/api/admin/vendors/${vendorId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(data.message || 'بارگذاری پرونده فروشنده ناموفق بود');
            setPayload(null);
            return;
        }
        setError('');
        setPayload(data);
        setForm(emptyForm(data.vendor || {}));
    };

    useEffect(() => {
        load();
        // Reload whenever the route vendor changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendorId]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const saveInfo = async (e) => {
        e.preventDefault();
        if (!form) return;
        setBusy(true);
        const res = await fetch(`/api/admin/vendors/${vendorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setError(data.message || 'ذخیره اطلاعات ناموفق بود');
            return;
        }
        setMessage('اطلاعات پرونده ذخیره شد.');
        setEditing(false);
        await load();
    };

    const setStatus = async (status) => {
        setBusy(true);
        const res = await fetch(`/api/admin/vendors/${vendorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setError(data.message || 'تغییر وضعیت ناموفق بود');
            return;
        }
        setMessage(status === 'active' ? 'فروشنده فعال شد.' : 'فروشنده تعلیق شد.');
        await load();
    };

    if (!payload && error) {
        return (
            <div className="vendor-dossier">
                <p className="vendor-review-error">{error}</p>
                <Link to="/admin/vendors">بازگشت به فهرست فروشندگان</Link>
            </div>
        );
    }
    if (!payload || !form) return <p>در حال بارگذاری پرونده فروشنده...</p>;

    const vendor = payload.vendor;
    const orders = payload.orders || [];
    const offers = payload.offers || [];
    const invoices = payload.invoices || [];
    const finance = payload.finance || {};

    return (
        <div className="vendor-dossier">
            <header className="vendor-dossier-head">
                <div>
                    <Link to="/admin/vendors" className="vendor-dossier-back">بازگشت به فهرست</Link>
                    <h2>{vendor.displayName || 'پرونده فروشنده'}</h2>
                    <p>
                        <span className={`vendor-review-pill is-${vendor.status}`}>{statusCaption(vendor)}</span>
                        <span className={`vendor-review-pill ${vendor.profileComplete ? 'is-complete' : 'is-incomplete'}`}>
                            {vendor.profileComplete ? 'پرونده کامل' : 'پرونده ناقص'}
                        </span>
                        <span className="vendor-review-kind">
                            {vendor.kind === 'internal' ? 'فروشنده داخلی' : (vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی')}
                        </span>
                    </p>
                </div>
                {vendor.kind !== 'internal' && (
                    <div className="vendor-review-buttons">
                        {vendor.status !== 'active' && (
                            <button type="button" className="is-approve" disabled={busy} onClick={() => setStatus('active')}>
                                تأیید / فعال
                            </button>
                        )}
                        {vendor.status === 'active' && (
                            <button type="button" className="is-suspend" disabled={busy} onClick={() => setStatus('suspended')}>
                                تعلیق
                            </button>
                        )}
                    </div>
                )}
            </header>
            {error && <p className="vendor-review-error">{error}</p>}
            {message && <p className="vendor-dossier-ok">{message}</p>}

            <nav className="vendor-dossier-tabs" role="tablist">
                {TABS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={tab === item.id ? 'is-on' : ''}
                        onClick={() => setTab(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            {tab === 'info' && (
                <section className="vendor-card">
                    <header className="vendor-card-head">
                        <h3>اطلاعات هویتی و مالی</h3>
                        <button type="button" className="vendor-edit-toggle" onClick={() => setEditing((prev) => !prev)}>
                            {editing ? 'انصراف از ویرایش' : 'اصلاح اطلاعات'}
                        </button>
                    </header>
                    {!editing ? (
                        <>
                            <div className="vendor-review-grid">
                                <Field label="نام فروشگاه" value={vendor.displayName} />
                                <Field label="نام صاحب حساب / مدیرعامل" value={vendor.ownerName} />
                                <Field label={vendor.personKind === 'company' ? 'شناسه ملی' : 'کد ملی'} value={vendor.nationalId} />
                                <Field label="نوع شخصیت" value={vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی'} />
                                <Field label="تلفن" value={vendor.phone} />
                                <Field label="استان" value={vendor.province} />
                                <Field label="شهر" value={vendor.city} />
                                <Field label="بانک" value={vendor.bankName} />
                                <Field label="شبا" value={vendor.bankSheba} />
                                <Field label="شماره حساب" value={vendor.bankAccount} />
                                <Field label="کمیسیون" value={`${vendor.commissionPct ?? 0}٪`} />
                                <Field label="دوره تسویه" value={vendor.settlementCycle === 'weekly' ? 'هفتگی' : vendor.settlementCycle} />
                            </div>
                            <Field label="نشانی کامل" value={vendor.address} />
                            {vendor.personKind === 'company' && (
                                <div className="vendor-review-grid">
                                    <Field label="نام حقوقی" value={vendor.legalName} />
                                    <Field label="شماره ثبت" value={vendor.registrationNo} />
                                    <Field label="کد اقتصادی" value={vendor.economicCode} />
                                </div>
                            )}
                        </>
                    ) : (
                        <form className="vendor-edit-form" onSubmit={saveInfo}>
                            <div className="vendor-kind">
                                <label className={form.personKind === 'individual' ? 'is-on' : ''}>
                                    <input type="radio" checked={form.personKind === 'individual'} onChange={() => setField('personKind', 'individual')} />
                                    حقیقی
                                </label>
                                <label className={form.personKind === 'company' ? 'is-on' : ''}>
                                    <input type="radio" checked={form.personKind === 'company'} onChange={() => setField('personKind', 'company')} />
                                    حقوقی
                                </label>
                            </div>
                            <div className="vendor-review-grid">
                                <label>نام فروشگاه<input value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} /></label>
                                <label>نام صاحب حساب<input value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} /></label>
                                <label>{form.personKind === 'company' ? 'شناسه ملی' : 'کد ملی'}<input value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} /></label>
                                <label>تلفن<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label>
                                <label>استان<input value={form.province} onChange={(e) => setField('province', e.target.value)} /></label>
                                <label>شهر<input value={form.city} onChange={(e) => setField('city', e.target.value)} /></label>
                                <label>بانک<input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} /></label>
                                <label>شبا<input value={form.bankSheba} onChange={(e) => setField('bankSheba', e.target.value)} /></label>
                                <label>شماره حساب<input value={form.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)} /></label>
                                <label>کمیسیون ٪<input type="number" min="0" value={form.commissionPct} onChange={(e) => setField('commissionPct', e.target.value)} /></label>
                                <label>
                                    دوره تسویه
                                    <select value={form.settlementCycle} onChange={(e) => setField('settlementCycle', e.target.value)}>
                                        <option value="weekly">هفتگی</option>
                                        <option value="biweekly">هر دو هفته</option>
                                        <option value="monthly">ماهانه</option>
                                    </select>
                                </label>
                            </div>
                            <label className="vendor-edit-wide">نشانی<textarea rows="2" value={form.address} onChange={(e) => setField('address', e.target.value)} /></label>
                            {form.personKind === 'company' && (
                                <div className="vendor-review-grid">
                                    <label>نام حقوقی<input value={form.legalName} onChange={(e) => setField('legalName', e.target.value)} /></label>
                                    <label>شماره ثبت<input value={form.registrationNo} onChange={(e) => setField('registrationNo', e.target.value)} /></label>
                                    <label>کد اقتصادی<input value={form.economicCode} onChange={(e) => setField('economicCode', e.target.value)} /></label>
                                </div>
                            )}
                            <button type="submit" className="is-approve" disabled={busy}>ذخیره اصلاحات</button>
                        </form>
                    )}
                </section>
            )}

            {tab === 'docs' && (
                <section className="vendor-card">
                    <h3>مدارک بارگذاری‌شده</h3>
                    {!!(vendor.requestedDocs || []).length && (
                        <div className="vendor-review-requested">
                            <strong>مدارک درخواستی کارشناس</strong>
                            <ul>
                                {vendor.requestedDocs.map((item) => (
                                    <li key={item.kind}>
                                        {DOC_LABELS[item.kind] || item.kind}
                                        {item.note ? ` — ${item.note}` : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {vendor.docsNote && <p className="vendor-review-docs-note">توضیح فروشنده: {vendor.docsNote}</p>}
                    <VendorDocs vendor={vendor} />
                </section>
            )}

            {tab === 'products' && (
                <section className="vendor-card">
                    <h3>محصولات و آگهی‌ها</h3>
                    {offers.length === 0 ? (
                        <p className="vendor-review-muted">این فروشنده هنوز محصولی ثبت نکرده است.</p>
                    ) : (
                        <ul className="vendor-dossier-table">
                            {offers.map((offer) => (
                                <li key={offer.id}>
                                    <strong>{offer.productName || `کالا ${offer.productId}`}</strong>
                                    <span>{formatPrice(offer.price)}</span>
                                    <span>موجودی {offer.stock}</span>
                                    <em>{offer.reviewStatus === 'pending' ? 'در انتظار تأیید محصول' : (offer.status === 'active' ? 'فعال' : offer.status)}</em>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {tab === 'orders' && (
                <section className="vendor-card">
                    <h3>سفارش‌های این فروشگاه</h3>
                    {orders.length === 0 ? (
                        <p className="vendor-review-muted">سفارشی برای این فروشنده ثبت نشده است.</p>
                    ) : (
                        <div className="vendor-dossier-orders">
                            {orders.map((order) => (
                                <article key={order.id}>
                                    <header>
                                        <strong>سفارش #{order.id}</strong>
                                        <span>{order.createdAt ? toShamsi(order.createdAt) : ''}</span>
                                        <em>{orderStatusLabel(order.status, order.paymentStatus)}</em>
                                    </header>
                                    <ul>
                                        {(order.items || []).map((item) => (
                                            <li key={item.id}>
                                                {item.name} × {item.quantity} — {formatPrice(item.lineTotal)}
                                                <small>{LINE_STATUS_LABELS[item.lineStatus] || orderStatusLabel(item.lineStatus, order.paymentStatus)}</small>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {tab === 'finance' && (
                <section className="vendor-card">
                    <h3>موضوعات مالی</h3>
                    <div className="vendor-review-grid">
                        <Field label="جمع فروش" value={formatPrice(finance.salesTotal || 0)} />
                        <Field label="کمیسیون" value={formatPrice(finance.commissionTotal || 0)} />
                        <Field label="مانده امانی" value={formatPrice(finance.holdTotal || 0)} />
                        <Field label="قابل برداشت" value={formatPrice(finance.walletAvailable || 0)} />
                        <Field label="تسویه‌شده" value={formatPrice(finance.payoutTotal || 0)} />
                    </div>
                    <h4>فاکتورها</h4>
                    {invoices.length === 0 ? (
                        <p className="vendor-review-muted">فاکتوری ثبت نشده است.</p>
                    ) : (
                        <ul className="vendor-dossier-table">
                            {invoices.map((invoice) => (
                                <li key={invoice.id}>
                                    <strong>{invoice.id}</strong>
                                    <span>{invoice.createdAt ? toShamsi(invoice.createdAt) : ''}</span>
                                    <span>{formatPrice(invoice.total)}</span>
                                    <em>{invoice.status}</em>
                                </li>
                            ))}
                        </ul>
                    )}
                    <h4>گردش حساب</h4>
                    {!(finance.recent || []).length ? (
                        <p className="vendor-review-muted">گردش مالی ثبت نشده است.</p>
                    ) : (
                        <ul className="vendor-dossier-table">
                            {(finance.recent || []).map((row) => (
                                <li key={row.id}>
                                    <strong>{LEDGER_LABELS[row.kind] || row.kind}</strong>
                                    <span>{formatPrice(row.amount)}</span>
                                    <span>{row.createdAt ? toShamsi(row.createdAt) : ''}</span>
                                    <em>{row.note || '—'}</em>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
};

export default VendorDossierPage;
