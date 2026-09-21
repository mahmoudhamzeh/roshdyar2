import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
    DOC_KINDS,
    DOC_LABELS,
    Field,
    VendorDocs,
    isRequestStatus,
    statusCaption,
    uploadedDocKinds
} from './vendorAdminShared';
import './VendorManagement.css';

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

const VendorInfo = ({ vendor }) => (
    <>
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
        {!!(vendor.requestedDocs || []).length && (
            <div className="vendor-review-requested">
                <strong>مدارک درخواستی از فروشنده</strong>
                <ul>
                    {vendor.requestedDocs.map((item) => {
                        const uploaded = uploadedDocKinds(vendor).has(item.kind);
                        return (
                            <li key={item.kind} className={uploaded ? 'is-done' : 'is-needed'}>
                                {DOC_LABELS[item.kind] || item.kind}
                                {item.note ? ` — ${item.note}` : ''}
                                <em>{uploaded ? 'بارگذاری شده' : 'در انتظار'}</em>
                            </li>
                        );
                    })}
                </ul>
            </div>
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
            <VendorDocs vendor={vendor} />
        </section>
    </>
);

const ActionModal = ({ action, vendor, busy, error, onClose, onSubmit }) => {
    const [note, setNote] = useState('');
    const [docKinds, setDocKinds] = useState(() => (vendor.requestedDocs || []).map((item) => item.kind));
    const [docNotes, setDocNotes] = useState(() => Object.fromEntries(
        (vendor.requestedDocs || []).map((item) => [item.kind, item.note || ''])
    ));

    if (!action) return null;

    const titles = {
        docs: 'درخواست مدارک',
        reject: 'رد درخواست فروشندگی',
        fix: 'نیاز به اصلاح پرونده',
        approve: 'تأیید فروشنده'
    };
    const submitLabels = {
        docs: 'ارسال درخواست مدارک',
        reject: 'رد پرونده',
        fix: 'ارسال برای اصلاح',
        approve: 'تأیید و فعال‌سازی'
    };

    const toggleKind = (id) => {
        setDocKinds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (action === 'docs') {
            const requestedDocs = docKinds.map((kind) => ({ kind, note: String(docNotes[kind] || '').trim() }));
            if (!requestedDocs.length) return;
            onSubmit({
                status: 'returned',
                requestedDocs,
                reviewNote: String(note || '').trim()
            });
            return;
        }
        if (action === 'reject') {
            if (!String(note || '').trim()) return;
            onSubmit({ status: 'rejected', reviewNote: String(note).trim(), requestedDocs: [] });
            return;
        }
        if (action === 'fix') {
            if (!String(note || '').trim()) return;
            onSubmit({ status: 'returned', reviewNote: String(note).trim(), requestedDocs: [] });
            return;
        }
        onSubmit({ status: 'active' });
    };

    return (
        <div className="vendor-modal-overlay vendor-action-overlay" role="presentation" onClick={onClose}>
            <form
                className="vendor-modal vendor-action-modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <header>
                    <h3>{titles[action]}</h3>
                    <button type="button" onClick={onClose} aria-label="بستن">×</button>
                </header>
                <p className="vendor-modal-sub">{vendor.displayName || 'فروشنده'}</p>
                {action === 'docs' && (
                    <fieldset className="vendor-doc-picker">
                        <legend>مدارک موردنیاز را مشخص کنید</legend>
                        {DOC_KINDS.map((item) => (
                            <label key={item.id} className={docKinds.includes(item.id) ? 'is-on' : ''}>
                                <input
                                    type="checkbox"
                                    checked={docKinds.includes(item.id)}
                                    onChange={() => toggleKind(item.id)}
                                />
                                <span>{item.label}</span>
                                {docKinds.includes(item.id) && (
                                    <input
                                        type="text"
                                        placeholder="توضیح اختیاری برای این مدرک"
                                        value={docNotes[item.id] || ''}
                                        onChange={(e) => setDocNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    />
                                )}
                            </label>
                        ))}
                    </fieldset>
                )}
                {action !== 'approve' && (
                    <label className="vendor-action-note">
                        {action === 'docs' ? 'توضیح برای فروشنده (اختیاری اگر مدرک انتخاب شده)' : action === 'reject' ? 'دلیل رد' : 'توضیحات اصلاح'}
                        <textarea
                            rows="4"
                            required={action !== 'docs'}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={action === 'reject' ? 'چرا این پرونده رد می‌شود؟' : action === 'fix' ? 'چه چیزی باید اصلاح شود؟' : 'توضیح کلی برای فروشنده'}
                        />
                    </label>
                )}
                {action === 'approve' && !vendor.profileComplete && (
                    <p className="vendor-review-gaps">پرونده هنوز ناقص است، اما می‌توانید آن را تأیید و فعال کنید.</p>
                )}
                {error && <p className="vendor-review-error">{error}</p>}
                <div className="vendor-modal-actions">
                    <button type="button" onClick={onClose}>انصراف</button>
                    <button
                        type="submit"
                        className={`is-${action === 'docs' ? 'docs' : action === 'fix' ? 'fix' : action === 'approve' ? 'approve' : 'reject'}`}
                        disabled={busy || (action === 'docs' && !docKinds.length)}
                    >
                        {submitLabels[action]}
                    </button>
                </div>
            </form>
        </div>
    );
};

const VendorManagement = () => {
    const history = useHistory();
    const [vendors, setVendors] = useState([]);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('review');
    const [busyId, setBusyId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [action, setAction] = useState(null);
    const [actionError, setActionError] = useState('');

    const load = async () => {
        const res = await fetch('/api/admin/vendors');
        if (!res.ok) {
            setError('بارگذاری فروشندگان ناموفق بود');
            return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVendors(list);
        setSelected((prev) => {
            if (!prev) return prev;
            return list.find((item) => Number(item.id) === Number(prev.id)) || prev;
        });
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!selected && !action) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event) => {
            if (event.key !== 'Escape') return;
            if (action) setAction(null);
            else setSelected(null);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [selected, action]);

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
            const message = gaps ? `${data.message || 'به‌روزرسانی ناموفق بود'} (${gaps})` : (data.message || 'به‌روزرسانی ناموفق بود');
            setError(message);
            setActionError(message);
            return false;
        }
        setError('');
        setActionError('');
        await load();
        return data;
    };

    const counts = useMemo(() => {
        const out = { all: vendors.length, review: 0, pending: 0, returned: 0, active: 0, rejected: 0, suspended: 0 };
        vendors.forEach((vendor) => {
            if (out[vendor.status] != null) out[vendor.status] += 1;
            if (isRequestStatus(vendor)) out.review += 1;
        });
        return out;
    }, [vendors]);

    const visible = useMemo(() => {
        const list = vendors.filter((vendor) => {
            if (filter === 'all') return true;
            if (filter === 'review') return isRequestStatus(vendor);
            return vendor.status === filter;
        });
        return list.slice().sort((a, b) => {
            const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
            if (rank !== 0) return rank;
            return Number(b.id) - Number(a.id);
        });
    }, [vendors, filter]);

    const openVendor = (vendor) => {
        if (isRequestStatus(vendor)) {
            setSelected(vendor);
            setAction(null);
            setActionError('');
            return;
        }
        history.push(`/admin/vendors/${vendor.id}`);
    };

    const submitAction = async (patch) => {
        if (!selected) return;
        const updated = await update(selected, patch);
        if (!updated) return;
        setAction(null);
        if (patch.status === 'active') {
            setSelected(null);
            history.push(`/admin/vendors/${selected.id}`);
            return;
        }
        setSelected(updated);
    };

    return (
        <div className="vendor-review">
            <header className="vendor-review-head">
                <div>
                    <h2>فروشندگان مارکت‌پلیس</h2>
                    <p>لیست درخواست‌ها را باز کنید، مدارک بخواهید، رد کنید یا تأیید کنید. پرونده فروشنده‌های فعال تب‌های سفارش، مالی و محصول دارد.</p>
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
                {visible.map((vendor) => (
                    <article key={vendor.id} className={`vendor-review-row is-${vendor.status}`}>
                        <button type="button" className="vendor-review-row-main" onClick={() => openVendor(vendor)}>
                            <div>
                                <h3>{vendor.displayName || 'بدون نام'}</h3>
                                <p>
                                    {vendor.ownerName || 'مالک ثبت نشده'}
                                    {vendor.phone ? ` · ${vendor.phone}` : ''}
                                    {vendor.nationalId ? ` · شناسه ${vendor.nationalId}` : ''}
                                </p>
                            </div>
                            <div className="vendor-review-row-meta">
                                <span className={`vendor-review-pill is-${vendor.status}`}>
                                    {statusCaption(vendor)}
                                </span>
                                <span className={`vendor-review-pill ${vendor.profileComplete ? 'is-complete' : 'is-incomplete'}`}>
                                    {vendor.profileComplete ? 'پرونده کامل' : 'پرونده ناقص'}
                                </span>
                                <span className="vendor-review-kind">
                                    {vendor.kind === 'internal' ? 'فروشنده داخلی' : (vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی')}
                                </span>
                                <strong>{isRequestStatus(vendor) ? 'مشاهده درخواست' : 'ورود به پرونده'}</strong>
                            </div>
                        </button>
                    </article>
                ))}
            </div>

            {selected && (
                <div className="vendor-modal-overlay" role="presentation" onClick={() => { setSelected(null); setAction(null); }}>
                    <div className="vendor-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <header className="vendor-modal-head">
                            <div>
                                <h3>{selected.displayName || 'درخواست فروشندگی'}</h3>
                                <p>
                                    <span className={`vendor-review-pill is-${selected.status}`}>{statusCaption(selected)}</span>
                                    <span className={`vendor-review-pill ${selected.profileComplete ? 'is-complete' : 'is-incomplete'}`}>
                                        {selected.profileComplete ? 'پرونده کامل' : 'پرونده ناقص'}
                                    </span>
                                </p>
                            </div>
                            <button type="button" onClick={() => { setSelected(null); setAction(null); }} aria-label="بستن">×</button>
                        </header>
                        <div className="vendor-modal-body">
                            <VendorInfo vendor={selected} />
                        </div>
                        {selected.kind !== 'internal' && (
                            <div className="vendor-review-actions vendor-modal-footer">
                                {!selected.profileComplete && selected.status !== 'active' && (
                                    <p className="vendor-review-muted">پرونده ناقص است؛ تأیید همچنان ممکن است.</p>
                                )}
                                <div className="vendor-review-buttons">
                                    {selected.status !== 'active' && (
                                        <button
                                            type="button"
                                            className="is-approve"
                                            disabled={busyId === selected.id}
                                            onClick={() => { setAction('approve'); setActionError(''); }}
                                        >
                                            تأیید
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="is-docs"
                                        disabled={busyId === selected.id}
                                        onClick={() => { setAction('docs'); setActionError(''); }}
                                    >
                                        درخواست مدارک
                                    </button>
                                    <button
                                        type="button"
                                        className="is-fix"
                                        disabled={busyId === selected.id}
                                        onClick={() => { setAction('fix'); setActionError(''); }}
                                    >
                                        نیاز به اصلاح
                                    </button>
                                    <button
                                        type="button"
                                        className="is-reject"
                                        disabled={busyId === selected.id || selected.status === 'rejected'}
                                        onClick={() => { setAction('reject'); setActionError(''); }}
                                    >
                                        رد
                                    </button>
                                    <button
                                        type="button"
                                        className="is-file"
                                        onClick={() => history.push(`/admin/vendors/${selected.id}`)}
                                    >
                                        ورود به پرونده
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selected && action && (
                <ActionModal
                    action={action}
                    vendor={selected}
                    busy={busyId === selected.id}
                    error={actionError}
                    onClose={() => { setAction(null); setActionError(''); }}
                    onSubmit={submitAction}
                />
            )}
        </div>
    );
};

export default VendorManagement;
