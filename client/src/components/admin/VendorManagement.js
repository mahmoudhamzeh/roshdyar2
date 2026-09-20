import React, { useEffect, useMemo, useState } from 'react';
import './VendorManagement.css';

const DOC_LABELS = {
    national_card: 'کارت ملی',
    company_id: 'شناسه ملی / آگهی',
    business_license: 'جواز کسب',
    bank_certificate: 'تأییدیه شبا',
    other: 'سایر'
};

const STATUS_LABELS = {
    pending: 'در انتظار بررسی',
    active: 'تأیید شده',
    suspended: 'تعلیق',
    returned: 'نیاز به اصلاح',
    rejected: 'رد شده'
};

const FILTERS = [
    { id: 'review', label: 'در صف بررسی' },
    { id: 'all', label: 'همه' },
    { id: 'pending', label: 'در انتظار' },
    { id: 'returned', label: 'اصلاح / مدارک' },
    { id: 'active', label: 'فعال' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'suspended', label: 'تعلیق' }
];

const STATUS_RANK = {
    pending: 0,
    returned: 1,
    rejected: 2,
    suspended: 3,
    active: 4
};

const empty = (value) => !String(value || '').trim();

const Field = ({ label, value }) => (
    <div className={`vendor-review-field ${empty(value) ? 'is-empty' : ''}`}>
        <span>{label}</span>
        <strong>{empty(value) ? 'ثبت نشده' : value}</strong>
    </div>
);

const isImageDoc = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url || '');

const defaultNote = (vendor, kind) => {
    const gaps = (vendor.profileGaps || []).filter(Boolean);
    if (kind === 'docs') {
        return gaps.find((item) => item.includes('مدارک'))
            ? `لطفاً مدارک ناقص را کامل کنید: ${gaps.join('، ')}`
            : 'لطفاً مدارک هویتی و تأییدیه شبا را با کیفیت خوانا بارگذاری کنید.';
    }
    if (kind === 'fix') {
        return gaps.length
            ? `لطفاً این موارد را تکمیل یا اصلاح کنید: ${gaps.join('، ')}`
            : 'لطفاً اطلاعات پرونده را اصلاح و دوباره ارسال کنید.';
    }
    return 'پرونده فروشندگی رد شد.';
};

const needsReview = (vendor) =>
    vendor.kind !== 'internal' && ['pending', 'returned', 'rejected'].includes(vendor.status);

const VendorManagement = () => {
    const [vendors, setVendors] = useState([]);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [openIds, setOpenIds] = useState({});
    const [notes, setNotes] = useState({});
    const [busyId, setBusyId] = useState(null);

    const load = async () => {
        const res = await fetch('/api/admin/vendors');
        if (!res.ok) {
            setError('بارگذاری فروشندگان ناموفق بود');
            return;
        }
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : []);
        setOpenIds((prev) => {
            const next = { ...prev };
            (data || []).forEach((vendor) => {
                if (next[vendor.id] === undefined) next[vendor.id] = vendor.kind !== 'internal';
            });
            return next;
        });
    };

    useEffect(() => {
        load();
    }, []);

    const update = async (vendor, patch) => {
        setBusyId(vendor.id);
        const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) {
            const gaps = (data.profileGaps || vendor.profileGaps || []).join('، ');
            setError(gaps ? `${data.message || 'به‌روزرسانی ناموفق بود'} (${gaps})` : (data.message || 'به‌روزرسانی ناموفق بود'));
            return false;
        }
        setError('');
        await load();
        return true;
    };

    const noteFor = (vendor) => notes[vendor.id] ?? vendor.reviewNote ?? '';

    const act = (vendor, kind) => {
        const typed = String(noteFor(vendor) || '').trim();
        if (kind === 'approve') return update(vendor, { status: 'active' });
        if (kind === 'suspend') return update(vendor, { status: 'suspended' });
        if (kind === 'docs') {
            return update(vendor, { status: 'returned', reviewNote: typed || defaultNote(vendor, 'docs') });
        }
        if (kind === 'fix') {
            return update(vendor, { status: 'returned', reviewNote: typed || defaultNote(vendor, 'fix') });
        }
        return update(vendor, { status: 'rejected', reviewNote: typed || defaultNote(vendor, 'reject') });
    };

    const counts = useMemo(() => {
        const out = { all: vendors.length, review: 0, pending: 0, returned: 0, active: 0, rejected: 0, suspended: 0 };
        vendors.forEach((vendor) => {
            if (out[vendor.status] != null) out[vendor.status] += 1;
            if (needsReview(vendor)) out.review += 1;
        });
        return out;
    }, [vendors]);

    const visible = useMemo(() => {
        const list = vendors.filter((vendor) => {
            if (filter === 'all') return true;
            if (filter === 'review') return needsReview(vendor);
            return vendor.status === filter;
        });
        return list.slice().sort((a, b) => {
            const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
            if (rank !== 0) return rank;
            return Number(b.id) - Number(a.id);
        });
    }, [vendors, filter]);

    return (
        <div className="vendor-review">
            <header className="vendor-review-head">
                <div>
                    <h2>فروشندگان مارکت‌پلیس</h2>
                    <p>پرونده کامل حقیقی/حقوقی و مالی را ببینید، بعد تأیید کنید، رد کنید، یا اصلاح و مدارک بخواهید.</p>
                </div>
            </header>
            {error && <p className="vendor-review-error">{error}</p>}
            <div className="vendor-review-filters" role="tablist">
                {FILTERS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={filter === item.id ? 'is-on' : ''}
                        onClick={() => setFilter(item.id)}
                    >
                        {item.label}
                        <em>{counts[item.id] || 0}</em>
                    </button>
                ))}
            </div>
            {visible.length === 0 && <p className="vendor-review-empty">فروشنده‌ای در این فهرست نیست.</p>}
            <div className="vendor-review-list">
                {visible.map((vendor) => {
                    const open = openIds[vendor.id] !== false && (openIds[vendor.id] || needsReview(vendor));
                    const marketplace = vendor.kind !== 'internal';
                    return (
                        <article key={vendor.id} className={`vendor-review-card is-${vendor.status}`}>
                            <header className="vendor-review-card-head">
                                <button
                                    type="button"
                                    className="vendor-review-toggle"
                                    onClick={() => setOpenIds((prev) => ({ ...prev, [vendor.id]: !open }))}
                                >
                                    <h3>{vendor.displayName || 'بدون نام'}</h3>
                                    <span className={`vendor-review-pill is-${vendor.status}`}>
                                        {STATUS_LABELS[vendor.status] || vendor.status}
                                    </span>
                                    <span className={`vendor-review-pill ${vendor.profileComplete ? 'is-complete' : 'is-incomplete'}`}>
                                        {vendor.profileComplete ? 'پرونده کامل' : 'پرونده ناقص'}
                                    </span>
                                    <span className="vendor-review-kind">
                                        {vendor.kind === 'internal' ? 'فروشنده داخلی' : (vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی')}
                                    </span>
                                </button>
                                <p>
                                    {vendor.ownerName || 'مالک ثبت نشده'}
                                    {vendor.phone ? ` · ${vendor.phone}` : ''}
                                    {vendor.nationalId ? ` · شناسه ${vendor.nationalId}` : ''}
                                </p>
                            </header>

                            {open && (
                                <div className="vendor-review-body">
                                    {!!(vendor.profileGaps || []).length && (
                                        <div className="vendor-review-gaps">
                                            <strong>موارد ناقص</strong>
                                            <ul>
                                                {vendor.profileGaps.map((item) => <li key={item}>{item}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {vendor.reviewNote && (
                                        <p className="vendor-review-note-current">آخرین پیام کارشناس: {vendor.reviewNote}</p>
                                    )}

                                    <section>
                                        <h4>هویت</h4>
                                        <div className="vendor-review-grid">
                                            <Field label="نام فروشگاه" value={vendor.displayName} />
                                            <Field label="نام صاحب حساب / مدیرعامل" value={vendor.ownerName} />
                                            <Field label={vendor.personKind === 'company' ? 'شناسه ملی' : 'کد ملی'} value={vendor.nationalId} />
                                            <Field label="نوع شخصیت" value={vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی'} />
                                        </div>
                                    </section>

                                    {vendor.personKind === 'company' && (
                                        <section>
                                            <h4>اطلاعات حقوقی</h4>
                                            <div className="vendor-review-grid">
                                                <Field label="نام حقوقی" value={vendor.legalName} />
                                                <Field label="شماره ثبت" value={vendor.registrationNo} />
                                                <Field label="کد اقتصادی" value={vendor.economicCode} />
                                            </div>
                                        </section>
                                    )}

                                    <section>
                                        <h4>تماس و نشانی</h4>
                                        <div className="vendor-review-grid">
                                            <Field label="تلفن" value={vendor.phone} />
                                            <Field label="استان" value={vendor.province} />
                                            <Field label="شهر" value={vendor.city} />
                                        </div>
                                        <Field label="نشانی کامل" value={vendor.address} />
                                    </section>

                                    <section>
                                        <h4>اطلاعات مالی</h4>
                                        <div className="vendor-review-grid">
                                            <Field label="بانک" value={vendor.bankName} />
                                            <Field label="شبا" value={vendor.bankSheba} />
                                            <Field label="شماره حساب" value={vendor.bankAccount} />
                                            <Field label="دوره تسویه" value={vendor.settlementCycle === 'weekly' ? 'هفتگی' : vendor.settlementCycle} />
                                            <Field label="کمیسیون" value={`${vendor.commissionPct ?? 0}٪`} />
                                        </div>
                                    </section>

                                    <section>
                                        <h4>مدارک ({(vendor.docs || []).length})</h4>
                                        {vendor.docsNote && <p className="vendor-review-docs-note">توضیح فروشنده: {vendor.docsNote}</p>}
                                        {(vendor.docs || []).length === 0 ? (
                                            <p className="vendor-review-muted">هنوز مدرکی بارگذاری نشده است.</p>
                                        ) : (
                                            <ul className="vendor-review-docs">
                                                {(vendor.docs || []).map((doc) => (
                                                    <li key={doc.id}>
                                                        {isImageDoc(doc.fileUrl) && (
                                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                                                <img src={doc.fileUrl} alt={doc.originalName || doc.kind} />
                                                            </a>
                                                        )}
                                                        <div>
                                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                                                {DOC_LABELS[doc.kind] || doc.kind}
                                                            </a>
                                                            <small>{doc.originalName || doc.fileUrl}</small>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>

                                    {marketplace && (
                                        <div className="vendor-review-actions">
                                            <label>
                                                پیام به فروشنده
                                                <textarea
                                                    rows="3"
                                                    value={noteFor(vendor)}
                                                    placeholder="دلیل رد، اصلاح یا درخواست مدرک را بنویسید"
                                                    onChange={(e) => setNotes((prev) => ({ ...prev, [vendor.id]: e.target.value }))}
                                                />
                                            </label>
                                            <div className="vendor-review-buttons">
                                                {vendor.status !== 'active' && (
                                                    <button
                                                        type="button"
                                                        className="is-approve"
                                                        disabled={busyId === vendor.id || !vendor.profileComplete}
                                                        title={vendor.profileComplete ? '' : 'تا تکمیل پرونده نمی‌توان تأیید کرد'}
                                                        onClick={() => act(vendor, 'approve')}
                                                    >
                                                        تأیید
                                                    </button>
                                                )}
                                                {vendor.status === 'active' && (
                                                    <button
                                                        type="button"
                                                        className="is-suspend"
                                                        disabled={busyId === vendor.id}
                                                        onClick={() => act(vendor, 'suspend')}
                                                    >
                                                        تعلیق
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="is-fix"
                                                    disabled={busyId === vendor.id}
                                                    onClick={() => act(vendor, 'fix')}
                                                >
                                                    درخواست اصلاح
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-docs"
                                                    disabled={busyId === vendor.id}
                                                    onClick={() => act(vendor, 'docs')}
                                                >
                                                    درخواست مدارک
                                                </button>
                                                <button
                                                    type="button"
                                                    className="is-reject"
                                                    disabled={busyId === vendor.id || vendor.status === 'rejected'}
                                                    onClick={() => act(vendor, 'reject')}
                                                >
                                                    رد
                                                </button>
                                                <label className="vendor-review-commission">
                                                    کمیسیون ٪
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        defaultValue={vendor.commissionPct}
                                                        onBlur={(e) => update(vendor, { commissionPct: e.target.value })}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default VendorManagement;
