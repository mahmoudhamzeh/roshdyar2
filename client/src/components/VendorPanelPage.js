import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
    faBoxOpen,
    faChartLine,
    faChevronDown,
    faClipboardList,
    faEllipsis,
    faFileInvoice,
    faHeadset,
    faHome,
    faPaperPlane,
    faRightFromBracket,
    faSearch,
    faStore,
    faTimes,
    faUser,
    faWallet
} from '@fortawesome/free-solid-svg-icons';
import { clearAuthSession } from '../api';
import { formatPrice } from '../utils/cart';
import { findCategoryPath } from '../utils/shop';
import { MAX_PRODUCT_IMAGES } from '../utils/productAttrs';
import {
    canonicalOrderStatus,
    isVendorLineLocked,
    orderStatusLabel,
    vendorLineOptions
} from '../utils/orderStatus';
import CategoryCascade from './CategoryCascade';
import ProductAttrFields from './ProductAttrFields';
import './VendorPanelPage.css';

const DOC_KINDS = [
    { id: 'national_card', label: 'کارت ملی / شناسنامه' },
    { id: 'company_id', label: 'آگهی تأسیس / شناسه ملی' },
    { id: 'business_license', label: 'جواز کسب یا پروانه' },
    { id: 'bank_certificate', label: 'تأییدیه شبا / کارت بانکی' },
    { id: 'other', label: 'سایر مدارک' }
];

const TICKET_STATUS_LABELS = {
    open: 'باز',
    in_review: 'در حال بررسی',
    waiting_user: 'در انتظار پاسخ شما',
    answered: 'در انتظار پاسخ شما',
    closed: 'بسته'
};

const LEDGER_LABELS = {
    sale: 'فروش',
    commission: 'کمیسیون',
    vendor_hold: 'مانده امانی',
    refund: 'بازگشت',
    vendor_payout: 'تسویه'
};

const emptyApply = {
    displayName: '',
    personKind: 'individual',
    ownerName: '',
    nationalId: '',
    legalName: '',
    registrationNo: '',
    economicCode: '',
    phone: '',
    province: '',
    city: '',
    address: '',
    bankName: '',
    bankSheba: '',
    bankAccount: '',
    docsNote: ''
};

const emptyProduct = {
    name: '', description: '', category: '', price: '', stock: '', compareAtPrice: '', images: null, brand: '', attrs: {}
};

const Field = ({ label, children, as = 'label' }) => {
    const Tag = as;
    return (
        <Tag className="vendor-field">
            <span>{label}</span>
            {children}
        </Tag>
    );
};

const catalogImage = (item) =>
    (item && (item.imageUrl || (item.images && item.images[0] && item.images[0].imageUrl))) || '';

const formatOfferPrices = (item) => {
    if (!item) return '';
    const min = Number(item.minPrice != null ? item.minPrice : item.price);
    const max = Number(item.maxPrice != null ? item.maxPrice : min);
    if (!Number.isFinite(min)) return 'قیمت ثبت نشده';
    return `کمترین ${formatPrice(min)} · بیشترین ${formatPrice(max)}`;
};

const CatalogThumb = ({ item }) => {
    const src = catalogImage(item);
    const label = (item && (item.name || item.productName)) || '';
    if (src) return <img className="vendor-pick-thumb" src={src} alt={label} />;
    return (
        <span className="vendor-pick-thumb vendor-pick-placeholder" aria-hidden="true">
            <Icon icon={faStore} />
        </span>
    );
};

const VendorPanelPage = () => {
    const [me, setMe] = useState(null);
    const [form, setForm] = useState(emptyApply);
    const [step, setStep] = useState(1);
    const [tab, setTab] = useState('home');
    const [products, setProducts] = useState([]);
    const [listings, setListings] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [orders, setOrders] = useState([]);
    const [finance, setFinance] = useState(null);
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState('');
    const [docKind, setDocKind] = useState('national_card');
    const [docFiles, setDocFiles] = useState(null);
    const [productForm, setProductForm] = useState(emptyProduct);
    const [productMode, setProductMode] = useState('existing');
    const [existingOffer, setExistingOffer] = useState({ productId: '', price: '', stock: '' });
    const [catalogQuery, setCatalogQuery] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickedProduct, setPickedProduct] = useState(null);
    const [ticketForm, setTicketForm] = useState({ subject: '', content: '', subgroup: 'محصول' });
    const [payoutAmount, setPayoutAmount] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingOffer, setEditingOffer] = useState(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const history = useHistory();

    const load = async () => {
        const vendor = await fetch('/api/shop/vendors/me').then((r) => (r.ok ? r.json() : null));
        setMe(vendor);
        if (vendor) {
            setForm((prev) => ({
                ...prev,
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
                docsNote: vendor.docsNote || ''
            }));
        }
        const cats = await fetch('/api/shop/categories').then((r) => (r.ok ? r.json() : []));
        setCategories(Array.isArray(cats) ? cats : (cats.tree || []));
        if (vendor) {
            const ticketRes = await fetch('/api/tickets');
            setTickets(ticketRes.ok ? await ticketRes.json() : []);
        if (vendor.docs && vendor.docs.length) setStep(3);
        else if (vendor.bankSheba) setStep(3);
        const pendingKind = (vendor.requestedDocs || []).find((item) =>
            !(vendor.docs || []).some((doc) => doc.kind === item.kind)
        );
        if (pendingKind) setDocKind(pendingKind.kind);
        }
        if (vendor && vendor.status === 'active') {
            const [offerRes, orderRes, financeRes, catalogRes, invoiceRes] = await Promise.all([
                fetch('/api/vendor/offers'),
                fetch('/api/vendor/orders'),
                fetch('/api/vendor/finance'),
                fetch('/api/vendor/catalog'),
                fetch('/api/vendor/invoices')
            ]);
            const offerData = offerRes.ok ? await offerRes.json() : { created: [], listings: [] };
            setProducts(Array.isArray(offerData) ? offerData : (offerData.created || []));
            setListings(Array.isArray(offerData) ? [] : (offerData.listings || []));
            setOrders(orderRes.ok ? await orderRes.json() : []);
            setFinance(financeRes.ok ? await financeRes.json() : null);
            setCatalog(catalogRes.ok ? await catalogRes.json() : []);
            setInvoices(invoiceRes.ok ? await invoiceRes.json() : []);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!pickerOpen) return undefined;
        const handle = window.setTimeout(async () => {
            const res = await fetch(`/api/vendor/catalog?q=${encodeURIComponent(catalogQuery.trim())}`);
            if (res.ok) setCatalog(await res.json());
        }, 200);
        return () => window.clearTimeout(handle);
    }, [pickerOpen, catalogQuery]);

    useEffect(() => {
        if (!pickerOpen && !editingOffer) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event) => {
            if (event.key !== 'Escape') return;
            setPickerOpen(false);
            setEditingOffer(null);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [pickerOpen, editingOffer]);

    useEffect(() => {
        document.body.classList.add('vendor-world');
        document.documentElement.classList.add('vendor-world');
        return () => {
            document.body.classList.remove('vendor-world');
            document.documentElement.classList.remove('vendor-world');
        };
    }, []);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const saveProfile = async (e, notifySupport = false) => {
        e.preventDefault();
        const res = await fetch('/api/shop/vendors/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت اطلاعات ناموفق بود');
            return;
        }
        setMe(data);
        if (notifySupport) {
            await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupName: 'فروشنده',
                    subgroup: 'مدارک',
                    subject: 'ویرایش اطلاعات فروشگاه',
                    content: `درخواست بررسی اطلاعات به‌روزشده فروشگاه «${form.displayName}».\nتلفن: ${form.phone || '—'}\nشبا: ${form.bankSheba || '—'}\nنشانی: ${form.address || '—'}`
                })
            });
            setMessage('اطلاعات ویرایش شد و برای پشتیبانی ارسال شد.');
            load();
            return;
        }
        setMessage('اطلاعات ذخیره شد.');
        setStep(3);
    };

    const uploadDocs = async (e) => {
        e.preventDefault();
        if (!docFiles || !docFiles.length) {
            setMessage('دست‌کم یک فایل انتخاب کنید');
            return;
        }
        const body = new FormData();
        Array.from(docFiles).forEach((file) => body.append('docs', file));
        body.append('kind', docKind);
        const res = await fetch('/api/shop/vendors/me/docs', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'بارگذاری مدرک ناموفق بود');
            return;
        }
        setMe(data);
        setDocFiles(null);
        setMessage('مدرک ثبت شد. پس از تکمیل، اپراتور درخواست را بررسی می‌کند.');
    };

    const submitProductForm = async (url, method) => {
        const path = findCategoryPath(categories, productForm.category);
        const leaf = path[path.length - 1];
        if (!productForm.category || (leaf && (leaf.children || []).length)) {
            setMessage('گروه و زیرگروه محصول را تا آخرین سطح انتخاب کنید.');
            return false;
        }
        const body = new FormData();
        Object.entries(productForm).forEach(([key, value]) => {
            if (key === 'images' || value == null) return;
            if (key === 'attrs') {
                body.append('attrs', JSON.stringify(value || {}));
                return;
            }
            body.append(key, value);
        });
        if (productForm.images) {
            Array.from(productForm.images).slice(0, MAX_PRODUCT_IMAGES).forEach((file) => body.append('images', file));
        }
        const res = await fetch(url, { method, body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت محصول ناموفق بود');
            return false;
        }
        return true;
    };

    const createProduct = async (e) => {
        e.preventDefault();
        const ok = await submitProductForm('/api/vendor/products', 'POST');
        if (!ok) return;
        setProductForm(emptyProduct);
        load();
        setMessage('محصول ثبت شد و برای تأیید پشتیبانی ارسال شد.');
    };

    const createExistingOffer = async (e) => {
        e.preventDefault();
        if (!existingOffer.productId) {
            setMessage('ابتدا کالا را از فهرست انتخاب کنید');
            setPickerOpen(true);
            return;
        }
        const res = await fetch('/api/vendor/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(existingOffer)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت قیمت روی کالای موجود ناموفق بود');
            return;
        }
        setExistingOffer({ productId: '', price: '', stock: '' });
        setPickedProduct(null);
        load();
        setMessage('آگهی فروش روی کالای موجود ثبت شد.');
    };

    const resubmitProduct = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;
        const ok = await submitProductForm(`/api/vendor/products/${editingProduct.id}`, 'PUT');
        if (!ok) return;
        setEditingProduct(null);
        setProductForm(emptyProduct);
        load();
        setMessage('ویرایش برای بررسی پشتیبانی ارسال شد.');
    };

    const saveListing = async (e) => {
        e.preventDefault();
        if (!editingOffer) return;
        const res = await fetch(`/api/vendor/offers/${editingOffer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: editingOffer.price, stock: editingOffer.stock })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'به‌روزرسانی آگهی ناموفق بود');
            return;
        }
        setEditingOffer(null);
        load();
        setMessage('قیمت و موجودی به‌روز شد.');
    };

    const sendTicket = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...ticketForm,
                groupName: 'فروشنده'
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ارسال تیکت ناموفق بود');
            return;
        }
        setTicketForm({ subject: '', content: '', subgroup: 'محصول' });
        load();
        setMessage('تیکت برای پشتیبانی ثبت شد.');
    };

    const requestPayout = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/vendor/wallet/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: payoutAmount })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'درخواست تسویه ناموفق بود');
            return;
        }
        setPayoutAmount('');
        load();
        setMessage('درخواست تسویه ثبت شد.');
    };

    const updateLine = async (itemId, status) => {
        const res = await fetch(`/api/vendor/orders/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'به‌روزرسانی وضعیت سفارش ممکن نیست');
            load();
            return;
        }
        setMessage('');
        load();
    };

    const startEditProduct = (product) => {
        setProductMode('new');
        setEditingProduct(product);
        setProductForm({
            name: product.name || '',
            description: product.description || '',
            category: product.category || '',
            price: product.price || '',
            stock: product.stock || '',
            compareAtPrice: product.compareAtPrice || '',
            images: null,
            brand: product.brand || '',
            attrs: product.attrs && typeof product.attrs === 'object' ? product.attrs : {}
        });
    };

    const logout = () => {
        clearAuthSession();
        window.dispatchEvent(new Event('auth-changed'));
        history.push('/login');
    };

    const openTab = (id) => {
        if (id === 'more') {
            setMoreOpen((open) => !open);
            return;
        }
        setMoreOpen(false);
        setTab(id);
    };

    const onboarding = !me || me.status !== 'active';
    const isActive = me && me.status === 'active';
    const reviewLabel = (status) => ({
        pending: 'در انتظار تأیید',
        approved: 'تأییدشده',
        rejected: 'رد شده'
    }[status] || status);

    const tabs = useMemo(() => {
        const all = [
            { id: 'home', label: 'خانه', icon: faHome },
            { id: 'profile', label: 'پروفایل', icon: faUser },
            { id: 'tickets', label: 'پشتیبانی', icon: faHeadset },
            { id: 'products', label: 'محصولات', icon: faBoxOpen, needsActive: true },
            { id: 'orders', label: 'سفارش‌ها', icon: faClipboardList, needsActive: true },
            { id: 'sales', label: 'گزارش فروش', icon: faChartLine, needsActive: true },
            { id: 'finance', label: 'گزارش مالی', icon: faWallet, needsActive: true },
            { id: 'invoices', label: 'فاکتورها', icon: faFileInvoice, needsActive: true },
            { id: 'wallet', label: 'کیف پول', icon: faWallet, needsActive: true }
        ];
        return all.filter((item) => isActive || !item.needsActive);
    }, [isActive]);

    const mobileNav = isActive
        ? [
            { id: 'home', label: 'خانه', icon: faHome },
            { id: 'products', label: 'کالا', icon: faBoxOpen },
            { id: 'orders', label: 'سفارش', icon: faClipboardList },
            { id: 'finance', label: 'مالی', icon: faWallet },
            { id: 'more', label: 'بیشتر', icon: faEllipsis }
        ]
        : [
            { id: 'home', label: 'خانه', icon: faHome },
            { id: 'profile', label: 'پروفایل', icon: faUser },
            { id: 'tickets', label: 'پشتیبانی', icon: faHeadset }
        ];

    const statusText = !me
        ? 'ثبت‌نام نشده'
        : me.status === 'active'
            ? 'فعال'
            : me.status === 'pending'
                ? 'در انتظار تأیید'
                : me.status === 'returned'
                    ? ((me.requestedDocs || []).length ? 'ارسال مدارک درخواستی' : 'نیاز به اصلاح')
                    : me.status === 'rejected'
                        ? 'رد شده'
                        : me.status === 'suspended'
                            ? 'تعلیق‌شده'
                            : me.status;

    const requestedDocsList = me && (me.requestedDocs || []).length ? (
        <div className="vendor-requested-docs">
            <strong>مدارک درخواستی کارشناس</strong>
            <ul>
                {(me.requestedDocs || []).map((item) => {
                    const uploaded = (me.docs || []).some((doc) => doc.kind === item.kind);
                    return (
                        <li key={item.kind} className={uploaded ? 'is-done' : 'is-needed'}>
                            <span>{DOC_KINDS.find((kind) => kind.id === item.kind)?.label || item.kind}</span>
                            {item.note ? <em>{item.note}</em> : null}
                            <small>{uploaded ? 'بارگذاری شده' : 'لازم است'}</small>
                        </li>
                    );
                })}
            </ul>
        </div>
    ) : null;

    const profileForm = (
        <form className="vendor-form" onSubmit={(e) => saveProfile(e, !!me)}>
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
            <div className="vendor-form-grid">
                <Field label="نام فروشگاه روی ویترین">
                    <input value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} required />
                </Field>
                <Field label="نام صاحب حساب / مدیرعامل">
                    <input value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} required />
                </Field>
                <Field label={form.personKind === 'company' ? 'شناسه ملی شرکت' : 'کد ملی'}>
                    <input value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} required />
                </Field>
                <Field label="شماره تماس">
                    <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} required />
                </Field>
                {form.personKind === 'company' && (
                    <>
                        <Field label="نام حقوقی شرکت">
                            <input value={form.legalName} onChange={(e) => setField('legalName', e.target.value)} required />
                        </Field>
                        <Field label="شماره ثبت">
                            <input value={form.registrationNo} onChange={(e) => setField('registrationNo', e.target.value)} required />
                        </Field>
                    </>
                )}
                <Field label="استان">
                    <input value={form.province} onChange={(e) => setField('province', e.target.value)} />
                </Field>
                <Field label="شهر">
                    <input value={form.city} onChange={(e) => setField('city', e.target.value)} />
                </Field>
                <Field label="نام بانک">
                    <input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} required />
                </Field>
                <Field label="شماره شبا">
                    <input value={form.bankSheba} onChange={(e) => setField('bankSheba', e.target.value)} required />
                </Field>
            </div>
            <Field label="نشانی کامل">
                <textarea value={form.address} onChange={(e) => setField('address', e.target.value)} rows="3" required />
            </Field>
            <Field label="توضیح مجوزها و نوع کالا">
                <textarea value={form.docsNote} onChange={(e) => setField('docsNote', e.target.value)} rows="2" />
            </Field>
            <button type="submit" className="vendor-btn vendor-btn-primary">
                <Icon icon={faPaperPlane} />
                {me ? 'ویرایش و ارسال برای پشتیبانی' : 'ذخیره اطلاعات'}
            </button>
        </form>
    );

    const chooseCatalogProduct = (item) => {
        setPickedProduct(item);
        setExistingOffer((prev) => ({
            productId: String(item.id),
            price: String(item.minPrice != null ? item.minPrice : item.price || ''),
            stock: prev.stock
        }));
        setPickerOpen(false);
    };

    return (
        <div className="vendor-app">
            <header className="vendor-topbar">
                <div className="vendor-topbar-brand">
                    <span className="vendor-topbar-mark"><Icon icon={faStore} /></span>
                    <div>
                        <strong>پنل فروشندگان</strong>
                        <em>TatKids Seller</em>
                    </div>
                </div>
                <div className="vendor-topbar-actions">
                    {me && <span className="vendor-topbar-shop">{me.displayName}</span>}
                    <Link to="/dashboard" className="vendor-topbar-parent">اپ والدین</Link>
                    <button type="button" className="vendor-topbar-logout" onClick={logout}>
                        <Icon icon={faRightFromBracket} />
                        خروج
                    </button>
                </div>
            </header>
            <main className="vendor-main">
                {message && <p className="vendor-toast">{message}</p>}

                {onboarding && !me && (
                    <section className="vendor-onboard vendor-card">
                        <h2>شروع فروشندگی</h2>
                        <p>اطلاعات فروشگاه را وارد کنید تا پرونده برای بررسی پشتیبانی ساخته شود.</p>
                        {profileForm}
                    </section>
                )}

                {onboarding && me && me.status !== 'active' && (
                    <section className="vendor-onboard vendor-card">
                        <div className="vendor-onboard-head">
                            <h2>تکمیل پرونده فروشندگی</h2>
                            <span className={`vendor-pill vendor-pill-${me.status}`}>{statusText}</span>
                        </div>
                        <ol className="vendor-steps">
                            {['هویت و مالی', 'مدارک', 'بررسی'].map((label, index) => (
                                <li key={label} className={step === index + 1 || (index === 2 && me.profileComplete) ? 'is-on' : ''}>
                                    {index + 1}. {label}
                                </li>
                            ))}
                        </ol>
                        <p className="vendor-muted">
                            {me.profileComplete
                                ? 'پرونده کامل است و منتظر تأیید کارشناس می‌ماند. پروفایل و تیکت پشتیبانی همین حالا در دسترس است.'
                                : 'برای تکمیل، هویت، شبا و حداقل دو مدرک لازم است.'}
                        </p>
                        {me.reviewNote && (
                            <p className="vendor-warn">پیام کارشناس: {me.reviewNote}</p>
                        )}
                        {requestedDocsList}
                        <form className="vendor-form" onSubmit={uploadDocs}>
                            <Field label="نوع مدرک">
                                <select value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                                    {DOC_KINDS.map((item) => (
                                        <option key={item.id} value={item.id}>{item.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="فایل مدرک">
                                <input type="file" accept="image/*,.pdf" multiple onChange={(e) => setDocFiles(e.target.files)} />
                            </Field>
                            <button type="submit" className="vendor-btn vendor-btn-primary">بارگذاری مدرک</button>
                            <ul className="vendor-docs">
                                {(me.docs || []).map((doc) => (
                                    <li key={doc.id}>
                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">{doc.originalName || doc.kind}</a>
                                        <span>{DOC_KINDS.find((item) => item.id === doc.kind)?.label || doc.kind}</span>
                                    </li>
                                ))}
                            </ul>
                        </form>
                    </section>
                )}

                {me && (
                    <div className="vendor-shell">
                        <aside className="vendor-side">
                            <div className="vendor-side-shop">
                                <span className="vendor-side-icon"><Icon icon={faStore} /></span>
                                <h1>{me.displayName || 'فروشگاه شما'}</h1>
                                <span className={`vendor-pill vendor-pill-${me.status}`}>{statusText}</span>
                                {isActive && <p>کمیسیون {me.commissionPct}٪</p>}
                            </div>
                            <nav className="vendor-side-nav">
                                {tabs.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={tab === item.id ? 'is-on' : ''}
                                        onClick={() => openTab(item.id)}
                                    >
                                        <Icon icon={item.icon} />
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </aside>

                        <div className="vendor-content">
                            {tab === 'home' && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>خانه فروشنده</h2>
                                        <p>{isActive ? 'گزارش سریع فروشگاه شما' : 'وضعیت پرونده فروشندگی'}</p>
                                    </header>
                                    <div className="vendor-home-status">
                                        <strong>{me.displayName}</strong>
                                        <span className={`vendor-pill vendor-pill-${me.status}`}>{statusText}</span>
                                    </div>
                                    {isActive && finance && (
                                        <div className="vendor-stats">
                                            <div className="vendor-stat">
                                                <span>جمع فروش</span>
                                                <strong>{formatPrice(finance.salesTotal)}</strong>
                                            </div>
                                            <div className="vendor-stat">
                                                <span>قابل برداشت</span>
                                                <strong>{formatPrice(finance.walletAvailable || 0)}</strong>
                                            </div>
                                            <div className="vendor-stat">
                                                <span>سفارش‌ها</span>
                                                <strong>{orders.length}</strong>
                                            </div>
                                        </div>
                                    )}
                                    {!isActive && (
                                        <p className="vendor-muted">تا تأیید کارشناس، از پروفایل و پشتیبانی استفاده کنید. محصولات و تسویه بعد از فعال شدن باز می‌شود.</p>
                                    )}
                                    {!isActive && me.reviewNote && (
                                        <p className="vendor-warn">پیام کارشناس: {me.reviewNote}</p>
                                    )}
                                    {!isActive && requestedDocsList}
                                    <div className="vendor-home-actions">
                                        <button type="button" className="vendor-btn vendor-btn-primary" onClick={() => openTab('profile')}>پروفایل فروشگاه</button>
                                        {isActive && (
                                            <>
                                                <button type="button" className="vendor-btn" onClick={() => openTab('products')}>مدیریت کالا</button>
                                                <button type="button" className="vendor-btn" onClick={() => openTab('orders')}>سفارش‌ها</button>
                                            </>
                                        )}
                                        {!isActive && (
                                            <button type="button" className="vendor-btn" onClick={() => openTab('tickets')}>تیکت پشتیبانی</button>
                                        )}
                                    </div>
                                </section>
                            )}

                            {tab === 'profile' && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>اطلاعات پروفایل</h2>
                                        <p>در صورت تغییر مشخصات، درخواست برای پشتیبانی ارسال می‌شود.</p>
                                    </header>
                                    {requestedDocsList}
                                    {profileForm}
                                </section>
                            )}

                            {isActive && tab === 'products' && (
                                <>
                                    <section className="vendor-card">
                                        <header className="vendor-card-head">
                                            <h2>تعریف یا فروش کالا</h2>
                                            <p>از کالای موجود فقط قیمت و موجودی می‌گذارید؛ محصول جدید برای تأیید پشتیبانی می‌رود.</p>
                                        </header>
                                        <div className="vendor-kind">
                                            <label className={productMode === 'existing' ? 'is-on' : ''}>
                                                <input type="radio" checked={productMode === 'existing'} onChange={() => { setProductMode('existing'); setEditingProduct(null); }} />
                                                انتخاب از کالای موجود
                                            </label>
                                            <label className={productMode === 'new' ? 'is-on' : ''}>
                                                <input type="radio" checked={productMode === 'new'} onChange={() => setProductMode('new')} />
                                                تعریف محصول جدید
                                            </label>
                                        </div>
                                        {productMode === 'existing' && (
                                            <form className="vendor-form" onSubmit={createExistingOffer}>
                                                <Field as="div" label="کالا">
                                                    <button
                                                        type="button"
                                                        id="vendor-pick-open"
                                                        className={`vendor-pick-trigger${pickedProduct ? ' has-item' : ''}`}
                                                        onClick={() => { setCatalogQuery(''); setPickerOpen(true); }}
                                                    >
                                                        {pickedProduct ? (
                                                            <span className="vendor-pick-card">
                                                                <CatalogThumb item={pickedProduct} />
                                                                <span>
                                                                    <strong>{pickedProduct.name}</strong>
                                                                    {pickedProduct.category && <em>{pickedProduct.category}</em>}
                                                                    <b>{formatOfferPrices(pickedProduct)}</b>
                                                                </span>
                                                                <Icon icon={faChevronDown} />
                                                            </span>
                                                        ) : (
                                                            <span className="vendor-pick-empty">
                                                                انتخاب کالا با عکس و قیمت
                                                                <Icon icon={faChevronDown} />
                                                            </span>
                                                        )}
                                                    </button>
                                                </Field>
                                                {pickedProduct && (
                                                    <p className="vendor-price-hint">{formatOfferPrices(pickedProduct)}</p>
                                                )}
                                                <div className="vendor-form-grid">
                                                    <Field label="قیمت فروش شما">
                                                        <input value={existingOffer.price} onChange={(e) => setExistingOffer((p) => ({ ...p, price: e.target.value }))} required inputMode="numeric" />
                                                    </Field>
                                                    <Field label="موجودی شما">
                                                        <input value={existingOffer.stock} onChange={(e) => setExistingOffer((p) => ({ ...p, stock: e.target.value }))} required inputMode="numeric" />
                                                    </Field>
                                                </div>
                                                <button type="submit" className="vendor-btn vendor-btn-primary">ثبت آگهی فروش</button>
                                            </form>
                                        )}
                                        {productMode === 'new' && (
                                            <form className="vendor-form" onSubmit={editingProduct ? resubmitProduct : createProduct}>
                                                <p className="vendor-muted">
                                                    {editingProduct
                                                        ? 'پس از ویرایش، محصول دوباره برای پشتیبانی ارسال می‌شود.'
                                                        : 'عکس و مشخصات کامل را بفرستید تا پس از تأیید روی سایت دیده شود.'}
                                                </p>
                                                <Field label="نام محصول">
                                                    <input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
                                                </Field>
                                                <Field label="توضیح">
                                                    <textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} rows="3" />
                                                </Field>
                                                <Field as="div" label="گروه و زیرگروه">
                                                    <CategoryCascade
                                                        tree={categories}
                                                        value={productForm.category}
                                                        onChange={(name) => setProductForm((p) => ({ ...p, category: name, attrs: {} }))}
                                                        emptyLabel="انتخاب گروه اصلی"
                                                        required
                                                        forceLeaf
                                                        stacked
                                                    />
                                                </Field>
                                                <Field label="برند">
                                                    <input
                                                        value={productForm.brand || ''}
                                                        onChange={(e) => setProductForm((p) => ({ ...p, brand: e.target.value }))}
                                                    />
                                                </Field>
                                                <ProductAttrFields
                                                    tree={categories}
                                                    category={productForm.category}
                                                    productName={productForm.name}
                                                    resetKey={(editingProduct && editingProduct.id) || 'new'}
                                                    attrs={productForm.attrs || {}}
                                                    onChange={(attrs) => setProductForm((p) => ({ ...p, attrs }))}
                                                />
                                                <div className="vendor-form-grid">
                                                    <Field label="قیمت فروش">
                                                        <input value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required />
                                                    </Field>
                                                    <Field label="قیمت قبل از تخفیف">
                                                        <input value={productForm.compareAtPrice} onChange={(e) => setProductForm((p) => ({ ...p, compareAtPrice: e.target.value }))} />
                                                    </Field>
                                                    <Field label="موجودی">
                                                        <input value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} />
                                                    </Field>
                                                </div>
                                                <Field label={`عکس محصول (حداکثر ${MAX_PRODUCT_IMAGES} فایل)`}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (files.length > MAX_PRODUCT_IMAGES) {
                                                                setMessage(`حداکثر ۲۰ تصویر می‌توانید انتخاب کنید.`);
                                                            }
                                                            setProductForm((p) => ({ ...p, images: files.slice(0, MAX_PRODUCT_IMAGES) }));
                                                        }}
                                                    />
                                                </Field>
                                                <div className="vendor-form-actions">
                                                    {editingProduct && (
                                                        <button
                                                            type="button"
                                                            className="vendor-btn"
                                                            onClick={() => { setEditingProduct(null); setProductForm(emptyProduct); }}
                                                        >
                                                            انصراف
                                                        </button>
                                                    )}
                                                    <button type="submit" className="vendor-btn vendor-btn-primary">
                                                        <Icon icon={faPaperPlane} />
                                                        {editingProduct ? 'ویرایش و ارسال برای پشتیبانی' : 'ارسال برای تأیید پشتیبانی'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </section>

                                    <section className="vendor-card">
                                        <header className="vendor-card-head">
                                            <h2>کالاهای تعریف‌شده شما</h2>
                                        </header>
                                        {products.length === 0 && <p className="vendor-empty">هنوز محصول جدیدی تعریف نکرده‌اید.</p>}
                                        <ul className="vendor-list">
                                            {products.map((product) => (
                                                <li key={`p-${product.id}`}>
                                                    <div className="vendor-list-main">
                                                        <CatalogThumb item={product} />
                                                        <div>
                                                            <strong>{product.name}</strong>
                                                            <p>{formatPrice(product.price)} · موجودی {product.stock}</p>
                                                            {product.reviewStatus === 'rejected' && product.reviewNote && (
                                                                <p className="vendor-warn">دلیل رد: {product.reviewNote}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="vendor-list-actions">
                                                        <span className={`vendor-pill vendor-pill-${product.reviewStatus}`}>{reviewLabel(product.reviewStatus)}</span>
                                                        <button type="button" className="vendor-btn" onClick={() => startEditProduct(product)}>
                                                            ویرایش و ارسال برای پشتیبانی
                                                        </button>
                                                        {product.active && <Link to={`/shop/${product.id}`}>مشاهده</Link>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section className="vendor-card">
                                        <header className="vendor-card-head">
                                            <h2>آگهی روی کالای موجود</h2>
                                        </header>
                                        {listings.length === 0 && <p className="vendor-empty">آگهی‌ای روی کالای موجود ندارید.</p>}
                                        <ul className="vendor-list">
                                            {listings.map((offer) => (
                                                <li key={`o-${offer.id}`}>
                                                    <div className="vendor-list-main">
                                                        <CatalogThumb item={offer} />
                                                        <div>
                                                            <strong>{offer.productName || `کالا #${offer.productId}`}</strong>
                                                            <p>{formatPrice(offer.price)} · موجودی {offer.stock}</p>
                                                        </div>
                                                    </div>
                                                    <div className="vendor-list-actions">
                                                        <button
                                                            type="button"
                                                            className="vendor-btn"
                                                            onClick={() => setEditingOffer({
                                                                id: offer.id,
                                                                price: String(offer.price ?? ''),
                                                                stock: String(offer.stock ?? ''),
                                                                productName: offer.productName || `کالا #${offer.productId}`,
                                                                imageUrl: offer.imageUrl || '',
                                                                productId: offer.productId
                                                            })}
                                                        >
                                                            ویرایش قیمت و موجودی
                                                        </button>
                                                        <Link to={`/shop/${offer.productId}`}>مشاهده</Link>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                </>
                            )}

                            {tab === 'tickets' && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>تیکت پشتیبانی</h2>
                                        <p>سؤال یا مشکل فروشندگی را برای واحد پشتیبانی بفرستید.</p>
                                    </header>
                                    <form className="vendor-form" onSubmit={sendTicket}>
                                        <Field label="موضوع واحد">
                                            <select value={ticketForm.subgroup} onChange={(e) => setTicketForm((p) => ({ ...p, subgroup: e.target.value }))}>
                                                {['محصول', 'سفارش', 'مالی و تسویه', 'مدارک'].map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="عنوان">
                                            <input value={ticketForm.subject} onChange={(e) => setTicketForm((p) => ({ ...p, subject: e.target.value }))} required />
                                        </Field>
                                        <Field label="متن پیام">
                                            <textarea value={ticketForm.content} onChange={(e) => setTicketForm((p) => ({ ...p, content: e.target.value }))} rows="4" required />
                                        </Field>
                                        <button type="submit" className="vendor-btn vendor-btn-primary">
                                            <Icon icon={faPaperPlane} />
                                            ارسال تیکت
                                        </button>
                                    </form>
                                    <ul className="vendor-list">
                                        {tickets.length === 0 && <li className="vendor-empty">تیکتی ثبت نشده است.</li>}
                                        {tickets.map((ticket) => (
                                            <li key={ticket.id}>
                                                <div>
                                                    <strong>#{ticket.id} · {ticket.subject}</strong>
                                                    <p>{ticket.groupName} / {ticket.subgroup}</p>
                                                </div>
                                                <span className="vendor-pill">{TICKET_STATUS_LABELS[ticket.status] || ticket.status || 'باز'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {isActive && tab === 'orders' && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>سفارش‌ها</h2>
                                    </header>
                                    {orders.length === 0 && <p className="vendor-empty">سفارشی برای این فروشگاه ثبت نشده است.</p>}
                                    {orders.map((order) => (
                                        <article key={order.id} className="vendor-order">
                                            <h3>
                                                سفارش #{order.id}
                                                <span className="vendor-order-status">
                                                    {orderStatusLabel(order.status, order.paymentStatus)}
                                                </span>
                                            </h3>
                                            {order.paymentStatus === 'paid' && (
                                                <p className="vendor-order-lock">سفارش پرداخت‌شده را نمی‌توان لغو کرد</p>
                                            )}
                                            <ul>
                                                {(order.items || []).map((item) => {
                                                    const lineStatus = canonicalOrderStatus(
                                                        item.lineStatus,
                                                        order.paymentStatus
                                                    );
                                                    const locked = isVendorLineLocked(
                                                        item.lineStatus,
                                                        order.paymentStatus
                                                    );
                                                    const options = vendorLineOptions(
                                                        item.lineStatus,
                                                        order.paymentStatus
                                                    );
                                                    return (
                                                    <li key={item.id || item.productId}>
                                                        <span>{item.name} × {item.quantity} — {formatPrice(item.lineTotal)}</span>
                                                        <select
                                                            value={lineStatus}
                                                            disabled={locked}
                                                            onChange={(e) => updateLine(item.id, e.target.value)}
                                                        >
                                                            {options.map((opt) => (
                                                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {locked && (
                                                            <small className="vendor-order-lock">سفارش لغو شده را نمی‌توان تغییر داد</small>
                                                        )}
                                                    </li>
                                                    );
                                                })}
                                            </ul>
                                        </article>
                                    ))}
                                </section>
                            )}

                            {isActive && tab === 'sales' && finance && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>گزارش فروش</h2>
                                    </header>
                                    <div className="vendor-stats">
                                        <div className="vendor-stat">
                                            <span>جمع فروش</span>
                                            <strong>{formatPrice(finance.salesTotal)}</strong>
                                        </div>
                                    </div>
                                    {finance.sales.length === 0 ? <p className="vendor-empty">هنوز فروشی ثبت نشده است.</p> : (
                                        <ul className="vendor-list">
                                            {finance.sales.map((row) => (
                                                <li key={row.name}>
                                                    <strong>{row.name}</strong>
                                                    <span>{row.quantity} عدد · {formatPrice(row.total)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            )}

                            {isActive && tab === 'finance' && finance && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>گزارش مالی</h2>
                                    </header>
                                    <div className="vendor-stats">
                                        <div className="vendor-stat">
                                            <span>کمیسیون</span>
                                            <strong>{formatPrice(finance.commissionTotal)}</strong>
                                        </div>
                                        <div className="vendor-stat">
                                            <span>مانده امانی</span>
                                            <strong>{formatPrice(finance.holdTotal)}</strong>
                                        </div>
                                        <div className="vendor-stat">
                                            <span>بازگشت</span>
                                            <strong>{formatPrice(finance.refundTotal)}</strong>
                                        </div>
                                        <div className="vendor-stat">
                                            <span>تسویه‌شده</span>
                                            <strong>{formatPrice(finance.payoutTotal || 0)}</strong>
                                        </div>
                                    </div>
                                    <ul className="vendor-list">
                                        {finance.recent.map((row) => (
                                            <li key={row.id}>
                                                <strong>{LEDGER_LABELS[row.kind] || row.kind}</strong>
                                                <span>{formatPrice(row.amount)} · {row.note}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {isActive && tab === 'invoices' && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>فاکتورها</h2>
                                    </header>
                                    {invoices.length === 0 && <p className="vendor-empty">فاکتوری ثبت نشده است.</p>}
                                    <ul className="vendor-list">
                                        {invoices.map((invoice) => (
                                            <li key={invoice.id}>
                                                <div>
                                                    <strong>{invoice.id}</strong>
                                                    <p>سفارش #{invoice.orderId}</p>
                                                </div>
                                                <span>{formatPrice(invoice.total)} · {invoice.status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {isActive && tab === 'wallet' && finance && (
                                <section className="vendor-card">
                                    <header className="vendor-card-head">
                                        <h2>کیف پول تسویه</h2>
                                    </header>
                                    <div className="vendor-stats">
                                        <div className="vendor-stat">
                                            <span>قابل برداشت</span>
                                            <strong>{formatPrice(finance.walletAvailable || 0)}</strong>
                                        </div>
                                        <div className="vendor-stat">
                                            <span>در حال نگهداری</span>
                                            <strong>{formatPrice(finance.holdTotal)}</strong>
                                        </div>
                                    </div>
                                    <form className="vendor-form" onSubmit={requestPayout}>
                                        <Field label="مبلغ تسویه (تومان)">
                                            <input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} required />
                                        </Field>
                                        <button type="submit" className="vendor-btn vendor-btn-primary">درخواست تسویه</button>
                                    </form>
                                </section>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {moreOpen && (
                <div className="vendor-more" role="dialog" aria-label="بخش‌های بیشتر">
                    <button type="button" className="vendor-more-backdrop" aria-label="بستن" onClick={() => setMoreOpen(false)} />
                    <div className="vendor-more-sheet">
                        <h3>بخش‌های پنل</h3>
                        {[
                            { id: 'profile', label: 'پروفایل' },
                            { id: 'tickets', label: 'پشتیبانی' },
                            { id: 'sales', label: 'گزارش فروش', needsActive: true },
                            { id: 'invoices', label: 'فاکتورها', needsActive: true },
                            { id: 'wallet', label: 'کیف پول', needsActive: true }
                        ].filter((item) => isActive || !item.needsActive).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openTab(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                        <Link to="/dashboard" onClick={() => setMoreOpen(false)}>ورود به اپ والدین</Link>
                    </div>
                </div>
            )}

            {me && (
            <nav className="vendor-bottom-nav" aria-label="منوی فروشنده">
                {mobileNav.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={item.id === 'more' ? (moreOpen ? 'is-on' : '') : (tab === item.id && !moreOpen ? 'is-on' : '')}
                        onClick={() => openTab(item.id)}
                    >
                        <Icon icon={item.icon} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
            )}
            {pickerOpen && (
                <div className="vendor-pick-sheet" role="dialog" aria-modal="true" aria-labelledby="vendor-pick-title">
                    <button type="button" className="vendor-pick-backdrop" aria-label="بستن" onClick={() => setPickerOpen(false)} />
                    <div className="vendor-pick-panel">
                        <header className="vendor-pick-head">
                            <div>
                                <p>ویترین فروشگاه</p>
                                <h2 id="vendor-pick-title">انتخاب کالا</h2>
                            </div>
                            <button type="button" aria-label="بستن" onClick={() => setPickerOpen(false)}>
                                <Icon icon={faTimes} />
                            </button>
                        </header>
                        <label className="vendor-pick-search">
                            <Icon icon={faSearch} />
                            <input
                                value={catalogQuery}
                                onChange={(e) => setCatalogQuery(e.target.value)}
                                placeholder="جستجوی نام کالا"
                                autoFocus
                            />
                        </label>
                        <ul className="vendor-pick-list">
                            {catalog.length === 0 && (
                                <li className="vendor-pick-empty-row">کالایی پیدا نشد.</li>
                            )}
                            {catalog.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={String(item.id) === String(existingOffer.productId) ? 'is-on' : ''}
                                        onClick={() => chooseCatalogProduct(item)}
                                    >
                                        <CatalogThumb item={item} />
                                        <span>
                                            <strong>{item.name}</strong>
                                            {item.category && <em>{item.category}</em>}
                                            <b>{formatOfferPrices(item)}</b>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {editingOffer && (
                <div className="vendor-pick-sheet" role="dialog" aria-modal="true" aria-labelledby="vendor-edit-title">
                    <button type="button" className="vendor-pick-backdrop" aria-label="بستن" onClick={() => setEditingOffer(null)} />
                    <div className="vendor-pick-panel">
                        <header className="vendor-pick-head">
                            <div>
                                <p>آگهی فروش</p>
                                <h2 id="vendor-edit-title">ویرایش قیمت و موجودی</h2>
                            </div>
                            <button type="button" aria-label="بستن" onClick={() => setEditingOffer(null)}>
                                <Icon icon={faTimes} />
                            </button>
                        </header>
                        <div className="vendor-pick-edit-card">
                            <CatalogThumb item={editingOffer} />
                            <span>
                                <strong>{editingOffer.productName}</strong>
                                {editingOffer.productId ? <em>کد {editingOffer.productId}</em> : null}
                            </span>
                        </div>
                        <form className="vendor-form vendor-pick-edit-form" onSubmit={saveListing}>
                            <div className="vendor-form-grid">
                                <Field label="قیمت فروش شما">
                                    <input
                                        value={editingOffer.price}
                                        onChange={(e) => setEditingOffer((p) => ({ ...p, price: e.target.value }))}
                                        required
                                        inputMode="numeric"
                                    />
                                </Field>
                                <Field label="موجودی شما">
                                    <input
                                        value={editingOffer.stock}
                                        onChange={(e) => setEditingOffer((p) => ({ ...p, stock: e.target.value }))}
                                        required
                                        inputMode="numeric"
                                    />
                                </Field>
                            </div>
                            <div className="vendor-form-actions">
                                <button type="button" className="vendor-btn" onClick={() => setEditingOffer(null)}>انصراف</button>
                                <button type="submit" className="vendor-btn vendor-btn-primary">ذخیره آگهی</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorPanelPage;
