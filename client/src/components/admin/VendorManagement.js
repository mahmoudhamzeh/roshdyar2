import React, { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '../../utils/cart';
import './VendorManagement.css';

const DOC_KINDS = [
    { id: 'national_card', label: 'کارت ملی' },
    { id: 'company_id', label: 'شناسه ملی / آگهی' },
    { id: 'business_license', label: 'جواز کسب' },
    { id: 'bank_certificate', label: 'تأییدیه شبا' },
    { id: 'other', label: 'سایر' }
];

const DOC_LABELS = Object.fromEntries(DOC_KINDS.map((item) => [item.id, item.label]));

const STATUS_LABELS = {
    pending: 'در انتظار بررسی',
    active: 'فعال',
    suspended: 'تعلیق',
    returned: 'اصلاح / مدارک',
    rejected: 'رد شده'
};

const FILTERS = [
    { id: 'review', label: 'درخواست‌ها' },
    { id: 'returned', label: 'اصلاح / مدارک' },
    { id: 'active', label: 'فروشگاه فعال' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'suspended', label: 'تعلیق' },
    { id: 'all', label: 'همه' }
];

const STATUS_RANK = { pending: 0, returned: 1, rejected: 2, suspended: 3, active: 4 };

const LEDGER_LABELS = {
    sale: 'فروش',
    commission: 'کمیسیون',
    vendor_hold: 'مانده امانی',
    refund: 'بازگشت',
    vendor_payout: 'تسویه'
};

const empty = (value) => !String(value || '').trim();

const Field = ({ label, value }) => (
    <div className={`vendor-review-field ${empty(value) ? 'is-empty' : ''}`}>
        <span>{label}</span>
        <strong>{empty(value) ? 'ثبت نشده' : value}</strong>
    </div>
);

const isImageDoc = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url || '');

const needsReview = (vendor) =>
    vendor.kind !== 'internal' && ['pending', 'returned', 'rejected'].includes(vendor.status);

const Modal = ({ title, children, onClose, footer }) => (
    <div className="vendor-review-overlay" onClick={onClose} role="presentation">
        <div className="vendor-review-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
                <h3>{title}</h3>
                <button type="button" className="vendor-review-icon-btn" onClick={onClose}>بستن</button>
            </header>
            <div className="vendor-review-modal-body">{children}</div>
            {footer && <footer>{footer}</footer>}
        </div>
    </div>
);

const VendorManagement = () => {
    const [vendors, setVendors] = useState([]);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('review');
    const [selectedId, setSelectedId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [workTab, setWorkTab] = useState('products');
    const [workLoading, setWorkLoading] = useState(false);
    const [docKinds, setDocKinds] = useState(['national_card']);
    const [actionNote, setActionNote] = useState('');

    const load = async () => {
        const res = await fetch('/api/admin/vendors');
        if (!res.ok) {
            setError('بارگذاری فروشندگان ناموفق بود');
            return [];
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVendors(list);
        return list;
    };

    useEffect(() => {
        load();
    }, []);

    const selected = vendors.find((item) => Number(item.id) === Number(selectedId)) || null;

    const loadWorkspace = async (vendorId) => {
        setWorkLoading(true);
        const res = await fetch(`/api/admin/vendors/${vendorId}/workspace`);
        const data = await res.json().catch(() => ({}));
        setWorkLoading(false);
        if (!res.ok) {
            setWorkspace(null);
            return;
        }
        setWorkspace(data);
    };

    const openVendor = (vendor) => {
        setSelectedId(vendor.id);
        setWorkTab('products');
        setWorkspace(null);
        if (vendor.status === 'active' || vendor.status === 'suspended') {
            loadWorkspace(vendor.id);
        }
    };

    const update = async (vendor, patch) => {
        setBusy(true);
        const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            const gaps = (data.profileGaps || vendor.profileGaps || []).join('، ');
            setError(gaps ? `${data.message || 'به‌روزرسانی ناموفق بود'} (${gaps})` : (data.message || 'به‌روزرسانی ناموفق بود'));
            return null;
        }
        setError('');
        const list = await load();
        return list.find((item) => Number(item.id) === Number(vendor.id)) || data;
    };

    const showToast = (title, message, nextFilter) => {
        setToast({ title, message, nextFilter });
    };

    const closeToast = () => {
        const nextFilter = toast && toast.nextFilter;
        setToast(null);
        setSelectedId(null);
        setWorkspace(null);
        if (nextFilter) setFilter(nextFilter);
    };

    const submitDocs = async (vendor) => {
        if (!docKinds.length) {
            setError('دست‌کم یک مدرک را انتخاب کنید');
            return;
        }
        const updated = await update(vendor, {
            status: 'returned',
            requestedDocs: docKinds,
            reviewNote: actionNote.trim() || undefined
        });
        if (!updated) return;
        setModal(null);
        const labels = docKinds.map((kind) => DOC_LABELS[kind]).join('، ');
        showToast('درخواست مدارک ثبت شد', `فروشنده به بخش «اصلاح / مدارک» منتقل شد. مدارک درخواستی: ${labels}`, 'returned');
    };

    const submitFix = async (vendor) => {
        const note = actionNote.trim();
        if (!note) {
            setError('توضیح اصلاح را بنویسید');
            return;
        }
        const updated = await update(vendor, { status: 'returned', reviewNote: note });
        if (!updated) return;
        setModal(null);
        showToast('درخواست اصلاح ثبت شد', 'فروشنده به بخش «اصلاح / مدارک» منتقل شد و پیام شما را می‌بیند.', 'returned');
    };

    const submitReject = async (vendor) => {
        const note = actionNote.trim() || 'پرونده فروشندگی رد شد.';
        const updated = await update(vendor, { status: 'rejected', reviewNote: note, requestedDocs: [] });
        if (!updated) return;
        setModal(null);
        showToast('پرونده رد شد', 'فروشنده به بخش رد شده منتقل شد.', 'rejected');
    };

    const approve = async (vendor) => {
        const updated = await update(vendor, { status: 'active' });
        if (!updated) return;
        showToast('فروشگاه تأیید شد', 'فروشنده به بخش فروشگاه فعال منتقل شد. از آنجا محصولات، سفارش‌ها و گزارش‌ها را ببینید.', 'active');
    };

    const suspend = async (vendor) => {
        const updated = await update(vendor, { status: 'suspended' });
        if (!updated) return;
        showToast('فروشگاه تعلیق شد', 'دسترسی فروشنده تا رفع تعلیق بسته شد.', 'suspended');
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

    const openDocsModal = (vendor) => {
        setError('');
        setDocKinds((vendor.requestedDocs && vendor.requestedDocs.length) ? vendor.requestedDocs : ['national_card']);
        setActionNote('');
        setModal({ type: 'docs', vendor });
    };

    const openFixModal = (vendor) => {
        setError('');
        setActionNote((vendor.profileGaps || []).length
            ? `لطفاً این موارد را اصلاح کنید: ${(vendor.profileGaps || []).join('، ')}`
            : '');
        setModal({ type: 'fix', vendor });
    };

    const openRejectModal = (vendor) => {
        setError('');
        setActionNote('');
        setModal({ type: 'reject', vendor });
    };

    const toggleDocKind = (id) => {
        setDocKinds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    return (
        <div className="vendor-review">
            <header className="vendor-review-head">
                <div>
                    <h2>فروشندگان مارکت‌پلیس</h2>
                    <p>ابتدا درخواست را از فهرست انتخاب کنید؛ پرونده بعد از کلیک باز می‌شود.</p>
                </div>
            </header>
            {error && <p className="vendor-review-error">{error}</p>}

            {!selected && (
                <>
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
                    {visible.length === 0 && <p className="vendor-review-empty">درخواستی در این بخش نیست.</p>}
                    <div className="vendor-review-table">
                        {visible.map((vendor) => (
                            <button
                                key={vendor.id}
                                type="button"
                                className={`vendor-review-row is-${vendor.status}`}
                                onClick={() => openVendor(vendor)}
                            >
                                <div>
                                    <strong>{vendor.displayName || 'بدون نام'}</strong>
                                    <small>
                                        {vendor.kind === 'internal' ? 'فروشنده داخلی' : (vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی')}
                                        {vendor.ownerName ? ` · ${vendor.ownerName}` : ''}
                                        {vendor.phone ? ` · ${vendor.phone}` : ''}
                                    </small>
                                </div>
                                <span className={`vendor-review-pill is-${vendor.status}`}>
                                    {STATUS_LABELS[vendor.status] || vendor.status}
                                </span>
                                <span className={`vendor-review-pill ${vendor.profileComplete ? 'is-complete' : 'is-incomplete'}`}>
                                    {vendor.profileComplete ? 'کامل' : 'ناقص'}
                                </span>
                                <em>مشاهده پرونده</em>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {selected && (
                <div className="vendor-review-dossier">
                    <div className="vendor-review-dossier-bar">
                        <button type="button" className="vendor-review-back" onClick={() => { setSelectedId(null); setWorkspace(null); }}>
                            بازگشت به فهرست
                        </button>
                        <h3>{selected.displayName}</h3>
                        <span className={`vendor-review-pill is-${selected.status}`}>
                            {STATUS_LABELS[selected.status] || selected.status}
                        </span>
                    </div>

                    <div className="vendor-review-card is-open">
                        {!!(selected.profileGaps || []).length && (
                            <div className="vendor-review-gaps">
                                <strong>موارد ناقص</strong>
                                <ul>
                                    {selected.profileGaps.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {selected.reviewNote && (
                            <p className="vendor-review-note-current">آخرین پیام کارشناس: {selected.reviewNote}</p>
                        )}
                        {!!(selected.requestedDocs || []).length && (
                            <p className="vendor-review-docs-note">
                                مدارک درخواستی: {(selected.requestedDocs || []).map((kind) => DOC_LABELS[kind] || kind).join('، ')}
                            </p>
                        )}

                        <section>
                            <h4>هویت</h4>
                            <div className="vendor-review-grid">
                                <Field label="نام فروشگاه" value={selected.displayName} />
                                <Field label="نام صاحب حساب / مدیرعامل" value={selected.ownerName} />
                                <Field label={selected.personKind === 'company' ? 'شناسه ملی' : 'کد ملی'} value={selected.nationalId} />
                                <Field label="نوع شخصیت" value={selected.personKind === 'company' ? 'حقوقی' : 'حقیقی'} />
                            </div>
                        </section>

                        {selected.personKind === 'company' && (
                            <section>
                                <h4>اطلاعات حقوقی</h4>
                                <div className="vendor-review-grid">
                                    <Field label="نام حقوقی" value={selected.legalName} />
                                    <Field label="شماره ثبت" value={selected.registrationNo} />
                                    <Field label="کد اقتصادی" value={selected.economicCode} />
                                </div>
                            </section>
                        )}

                        <section>
                            <h4>تماس و نشانی</h4>
                            <div className="vendor-review-grid">
                                <Field label="تلفن" value={selected.phone} />
                                <Field label="استان" value={selected.province} />
                                <Field label="شهر" value={selected.city} />
                            </div>
                            <Field label="نشانی کامل" value={selected.address} />
                        </section>

                        <section>
                            <h4>اطلاعات مالی</h4>
                            <div className="vendor-review-grid">
                                <Field label="بانک" value={selected.bankName} />
                                <Field label="شبا" value={selected.bankSheba} />
                                <Field label="شماره حساب" value={selected.bankAccount} />
                                <Field label="دوره تسویه" value={selected.settlementCycle === 'weekly' ? 'هفتگی' : selected.settlementCycle} />
                                <Field label="کمیسیون" value={`${selected.commissionPct ?? 0}٪`} />
                            </div>
                        </section>

                        <section>
                            <h4>مدارک ({(selected.docs || []).length})</h4>
                            {selected.docsNote && <p className="vendor-review-docs-note">توضیح فروشنده: {selected.docsNote}</p>}
                            {(selected.docs || []).length === 0 ? (
                                <p className="vendor-review-muted">هنوز مدرکی بارگذاری نشده است. کارت ملی برای تأیید کافی است.</p>
                            ) : (
                                <ul className="vendor-review-docs">
                                    {(selected.docs || []).map((doc) => (
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

                        {selected.kind !== 'internal' && (
                            <div className="vendor-review-actions">
                                <div className="vendor-review-buttons">
                                    {selected.status !== 'active' && (
                                        <button
                                            type="button"
                                            className="is-approve"
                                            disabled={busy || !selected.profileComplete}
                                            title={selected.profileComplete ? '' : 'تا تکمیل پرونده و کارت ملی نمی‌توان تأیید کرد'}
                                            onClick={() => approve(selected)}
                                        >
                                            تأیید
                                        </button>
                                    )}
                                    {selected.status === 'active' && (
                                        <button type="button" className="is-suspend" disabled={busy} onClick={() => suspend(selected)}>
                                            تعلیق
                                        </button>
                                    )}
                                    <button type="button" className="is-fix" disabled={busy} onClick={() => openFixModal(selected)}>
                                        درخواست اصلاح
                                    </button>
                                    <button type="button" className="is-docs" disabled={busy} onClick={() => openDocsModal(selected)}>
                                        درخواست مدارک
                                    </button>
                                    <button
                                        type="button"
                                        className="is-reject"
                                        disabled={busy || selected.status === 'rejected'}
                                        onClick={() => openRejectModal(selected)}
                                    >
                                        رد
                                    </button>
                                    <label className="vendor-review-commission">
                                        کمیسیون ٪
                                        <input
                                            type="number"
                                            min="0"
                                            defaultValue={selected.commissionPct}
                                            onBlur={(e) => update(selected, { commissionPct: e.target.value })}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {selected.status === 'active' && (
                        <div className="vendor-review-workspace">
                            <div className="vendor-review-work-tabs">
                                {[
                                    { id: 'products', label: 'محصولات' },
                                    { id: 'sales', label: 'گزارش فروش' },
                                    { id: 'finance', label: 'گزارش مالی' },
                                    { id: 'orders', label: 'سفارش‌ها' },
                                    { id: 'tickets', label: 'تیکت‌ها' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={workTab === item.id ? 'is-on' : ''}
                                        onClick={() => setWorkTab(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            {workLoading && <p className="vendor-review-muted">در حال بارگذاری گزارش فروشگاه...</p>}
                            {!workLoading && workspace && workTab === 'products' && (
                                <div>
                                    <h4>کالاهای تعریف‌شده ({(workspace.products || []).length})</h4>
                                    {(workspace.products || []).length === 0 ? (
                                        <p className="vendor-review-muted">هنوز کالایی تعریف نکرده است.</p>
                                    ) : (
                                        <ul className="vendor-review-plain">
                                            {(workspace.products || []).map((product) => (
                                                <li key={product.id}>
                                                    <strong>{product.name}</strong>
                                                    <span>{product.category} · {formatPrice(product.price)} · موجودی {product.stock}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <h4>آگهی روی کالای دیگران ({(workspace.listings || []).length})</h4>
                                    {(workspace.listings || []).length === 0 ? (
                                        <p className="vendor-review-muted">آگهی روی کالای دیگران ندارد.</p>
                                    ) : (
                                        <ul className="vendor-review-plain">
                                            {(workspace.listings || []).map((offer) => (
                                                <li key={offer.id}>
                                                    <strong>{offer.productName || `کالا ${offer.productId}`}</strong>
                                                    <span>{formatPrice(offer.price)} · موجودی {offer.stock}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                            {!workLoading && workspace && workTab === 'sales' && (
                                <div>
                                    <div className="vendor-review-grid">
                                        <Field label="جمع فروش" value={formatPrice((workspace.finance || {}).salesTotal)} />
                                        <Field label="تعداد سفارش" value={String((workspace.orders || []).length)} />
                                    </div>
                                    <ul className="vendor-review-plain">
                                        {((workspace.finance || {}).sales || []).map((row) => (
                                            <li key={row.name}>
                                                <strong>{row.name}</strong>
                                                <span>{row.quantity} عدد · {formatPrice(row.total)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {!(workspace.finance && workspace.finance.sales && workspace.finance.sales.length) && (
                                        <p className="vendor-review-muted">گزارش فروشی ثبت نشده است.</p>
                                    )}
                                </div>
                            )}
                            {!workLoading && workspace && workTab === 'finance' && (
                                <div>
                                    <div className="vendor-review-grid">
                                        <Field label="فروش" value={formatPrice((workspace.finance || {}).salesTotal)} />
                                        <Field label="کمیسیون" value={formatPrice((workspace.finance || {}).commissionTotal)} />
                                        <Field label="مانده امانی" value={formatPrice((workspace.finance || {}).holdTotal)} />
                                        <Field label="قابل برداشت" value={formatPrice((workspace.finance || {}).walletAvailable)} />
                                    </div>
                                    <ul className="vendor-review-plain">
                                        {((workspace.finance || {}).recent || []).map((row) => (
                                            <li key={row.id}>
                                                <strong>{LEDGER_LABELS[row.kind] || row.kind}</strong>
                                                <span>{formatPrice(row.amount)} · {row.note || '—'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {!(workspace.finance && workspace.finance.recent && workspace.finance.recent.length) && (
                                        <p className="vendor-review-muted">تراکنش مالی ثبت نشده است.</p>
                                    )}
                                </div>
                            )}
                            {!workLoading && workspace && workTab === 'orders' && (
                                <div>
                                    {(workspace.orders || []).length === 0 ? (
                                        <p className="vendor-review-muted">سفارشی برای این فروشگاه نیست.</p>
                                    ) : (
                                        <ul className="vendor-review-plain">
                                            {(workspace.orders || []).map((order) => (
                                                <li key={order.id}>
                                                    <strong>سفارش {order.id}</strong>
                                                    <span>
                                                        {order.status} · {(order.items || []).length} قلم ·
                                                        {' '}
                                                        {formatPrice((order.items || []).reduce((sum, item) => sum + Number(item.lineTotal || 0), 0))}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                            {!workLoading && workspace && workTab === 'tickets' && (
                                <div>
                                    {(workspace.tickets || []).length === 0 ? (
                                        <p className="vendor-review-muted">تیکتی از این فروشنده ثبت نشده است.</p>
                                    ) : (
                                        <ul className="vendor-review-plain">
                                            {(workspace.tickets || []).map((ticket) => (
                                                <li key={ticket.id}>
                                                    <strong>{ticket.subject}</strong>
                                                    <span>{ticket.groupName} / {ticket.subgroup} · {ticket.status}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {modal && modal.type === 'docs' && (
                <Modal
                    title="درخواست مدارک"
                    onClose={() => setModal(null)}
                    footer={(
                        <>
                            <button type="button" className="is-docs" disabled={busy} onClick={() => submitDocs(modal.vendor)}>ثبت درخواست</button>
                            <button type="button" className="is-ghost" onClick={() => setModal(null)}>انصراف</button>
                        </>
                    )}
                >
                    <p>مدارکی که فروشنده باید بارگذاری کند را انتخاب کنید.</p>
                    <div className="vendor-review-checkboxes">
                        {DOC_KINDS.map((item) => (
                            <label key={item.id}>
                                <input
                                    type="checkbox"
                                    checked={docKinds.includes(item.id)}
                                    onChange={() => toggleDocKind(item.id)}
                                />
                                {item.label}
                            </label>
                        ))}
                    </div>
                    <label className="vendor-review-note-field">
                        توضیح اضافه (اختیاری)
                        <textarea rows="3" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
                    </label>
                </Modal>
            )}

            {modal && modal.type === 'fix' && (
                <Modal
                    title="درخواست اصلاح"
                    onClose={() => setModal(null)}
                    footer={(
                        <>
                            <button type="button" className="is-fix" disabled={busy} onClick={() => submitFix(modal.vendor)}>ثبت درخواست</button>
                            <button type="button" className="is-ghost" onClick={() => setModal(null)}>انصراف</button>
                        </>
                    )}
                >
                    <label className="vendor-review-note-field">
                        مواردی که باید اصلاح شود
                        <textarea rows="4" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
                    </label>
                </Modal>
            )}

            {modal && modal.type === 'reject' && (
                <Modal
                    title="رد پرونده"
                    onClose={() => setModal(null)}
                    footer={(
                        <>
                            <button type="button" className="is-reject" disabled={busy} onClick={() => submitReject(modal.vendor)}>رد پرونده</button>
                            <button type="button" className="is-ghost" onClick={() => setModal(null)}>انصراف</button>
                        </>
                    )}
                >
                    <label className="vendor-review-note-field">
                        دلیل رد
                        <textarea rows="4" value={actionNote} onChange={(e) => setActionNote(e.target.value)} />
                    </label>
                </Modal>
            )}

            {toast && (
                <Modal
                    title={toast.title}
                    onClose={closeToast}
                    footer={<button type="button" className="is-approve" onClick={closeToast}>باشه</button>}
                >
                    <p>{toast.message}</p>
                </Modal>
            )}
        </div>
    );
};

export default VendorManagement;
