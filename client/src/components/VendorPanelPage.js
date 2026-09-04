import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxOpen,
    faChartLine,
    faClipboardList,
    faStore,
    faWallet
} from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice } from '../utils/cart';
import { findCategoryPath } from '../utils/shop';
import CategoryCascade from './CategoryCascade';
import './ShopWorld.css';
import './VendorPanelPage.css';
import './admin/ProductManagement.css';

const DOC_KINDS = [
    { id: 'national_card', label: 'کارت ملی / شناسنامه' },
    { id: 'company_id', label: 'آگهی تأسیس / شناسه ملی' },
    { id: 'business_license', label: 'جواز کسب یا پروانه' },
    { id: 'bank_certificate', label: 'تأییدیه شبا / کارت بانکی' },
    { id: 'other', label: 'سایر مدارک' }
];

const LINE_STATUSES = [
    { id: 'pending', label: 'ثبت‌شده' },
    { id: 'preparing', label: 'در حال آماده‌سازی' },
    { id: 'shipped', label: 'ارسال‌شده' },
    { id: 'delivered', label: 'تحویل‌شده' },
    { id: 'cancelled', label: 'لغو' }
];

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

const VendorPanelPage = () => {
    const [me, setMe] = useState(null);
    const [form, setForm] = useState(emptyApply);
    const [step, setStep] = useState(1);
    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [finance, setFinance] = useState(null);
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState('');
    const [docKind, setDocKind] = useState('national_card');
    const [docFiles, setDocFiles] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '', description: '', category: '', price: '', stock: '', compareAtPrice: '', images: null
    });

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
        if (vendor && vendor.status === 'active') {
            const [offerRes, orderRes, financeRes] = await Promise.all([
                fetch('/api/vendor/offers'),
                fetch('/api/vendor/orders'),
                fetch('/api/vendor/finance')
            ]);
            setProducts(offerRes.ok ? await offerRes.json() : []);
            setOrders(orderRes.ok ? await orderRes.json() : []);
            setFinance(financeRes.ok ? await financeRes.json() : null);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const saveProfile = async (e) => {
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

    const createProduct = async (e) => {
        e.preventDefault();
        const path = findCategoryPath(categories, productForm.category);
        const leaf = path[path.length - 1];
        if (!productForm.category || (leaf && (leaf.children || []).length)) {
            setMessage('گروه و زیرگروه محصول را تا آخرین سطح انتخاب کنید.');
            return;
        }
        const body = new FormData();
        Object.entries(productForm).forEach(([key, value]) => {
            if (key !== 'images' && value != null) body.append(key, value);
        });
        if (productForm.images) {
            Array.from(productForm.images).forEach((file) => body.append('images', file));
        }
        const res = await fetch('/api/vendor/products', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت محصول ناموفق بود');
            return;
        }
        setProductForm({ name: '', description: '', category: '', price: '', stock: '', compareAtPrice: '', images: null });
        load();
        setMessage('محصول ثبت شد و پس از تأیید ادمین در فروشگاه دیده می‌شود.');
    };

    const updateLine = async (itemId, status) => {
        const res = await fetch(`/api/vendor/orders/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) return;
        load();
    };

    const onboarding = !me || me.status !== 'active';
    const reviewLabel = (status) => ({
        pending: 'در انتظار تأیید ادمین',
        approved: 'تأییدشده',
        rejected: 'رد شده'
    }[status] || status);

    const tabs = useMemo(() => ([
        { id: 'products', label: 'محصولات', icon: faBoxOpen },
        { id: 'orders', label: 'سفارش‌ها', icon: faClipboardList },
        { id: 'sales', label: 'گزارش فروش', icon: faChartLine },
        { id: 'finance', label: 'گزارش مالی', icon: faWallet }
    ]), []);

    return (
        <div className="shop-page shop-world vendor-panel-page">
            <MainNavbar />
            <main className="shop-main vendor-main">
                <header className="vendor-hero">
                    <FontAwesomeIcon icon={faStore} />
                    <div>
                        <h1>پنل فروشندگان تات کیدز</h1>
                        <p>ثبت‌نام حقیقی یا حقوقی، بارگذاری مدارک، مدیریت کالا و تسویه.</p>
                    </div>
                </header>
                {message && <p className="vendor-toast">{message}</p>}

                {onboarding && (
                    <section className="vendor-onboard">
                        <ol className="vendor-steps">
                            {['هویت', 'مالی', 'مدارک', 'بررسی'].map((label, index) => (
                                <li key={label} className={step === index + 1 ? 'is-on' : ''}>{index + 1}. {label}</li>
                            ))}
                        </ol>

                        {(step === 1 || step === 2) && (
                            <form className="product-form vendor-form" onSubmit={saveProfile}>
                                {step === 1 && (
                                    <>
                                        <h3>۱. اطلاعات حقیقی یا حقوقی</h3>
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
                                        <input value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} placeholder="نام فروشگاه روی ویترین" required />
                                        <input value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} placeholder="نام صاحب حساب / مدیرعامل" required />
                                        <input value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} placeholder={form.personKind === 'company' ? 'شناسه ملی شرکت' : 'کد ملی'} required />
                                        {form.personKind === 'company' && (
                                            <>
                                                <input value={form.legalName} onChange={(e) => setField('legalName', e.target.value)} placeholder="نام حقوقی شرکت" required />
                                                <input value={form.registrationNo} onChange={(e) => setField('registrationNo', e.target.value)} placeholder="شماره ثبت" required />
                                                <input value={form.economicCode} onChange={(e) => setField('economicCode', e.target.value)} placeholder="کد اقتصادی" />
                                            </>
                                        )}
                                        <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="شماره تماس" required />
                                        <div className="product-form-row">
                                            <input value={form.province} onChange={(e) => setField('province', e.target.value)} placeholder="استان" />
                                            <input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="شهر" />
                                        </div>
                                        <textarea value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="نشانی کامل" rows="3" required />
                                        <button type="button" onClick={() => setStep(2)}>ادامه اطلاعات مالی</button>
                                    </>
                                )}
                                {step === 2 && (
                                    <>
                                        <h3>۲. اطلاعات مالی و تسویه</h3>
                                        <input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} placeholder="نام بانک" required />
                                        <input value={form.bankSheba} onChange={(e) => setField('bankSheba', e.target.value)} placeholder="شماره شبا IR..." required />
                                        <input value={form.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)} placeholder="شماره حساب" />
                                        <textarea value={form.docsNote} onChange={(e) => setField('docsNote', e.target.value)} placeholder="توضیح مجوزها و نوع کالا" rows="3" />
                                        <div className="product-form-actions">
                                            <button type="button" className="btn-cancel" onClick={() => setStep(1)}>بازگشت</button>
                                            <button type="submit">ذخیره و رفتن به مدارک</button>
                                        </div>
                                    </>
                                )}
                            </form>
                        )}

                        {step === 3 && (
                            <form className="product-form vendor-form" onSubmit={uploadDocs}>
                                <h3>۳. مدارک احراز هویت</h3>
                                <p>دست‌کم دو مدرک لازم است: کارت شناسایی و تأییدیه شبا. برای حقوقی، آگهی تأسیس هم بارگذاری شود.</p>
                                <select value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                                    {DOC_KINDS.map((item) => (
                                        <option key={item.id} value={item.id}>{item.label}</option>
                                    ))}
                                </select>
                                <input type="file" accept="image/*,.pdf" multiple onChange={(e) => setDocFiles(e.target.files)} />
                                <button type="submit">بارگذاری مدرک</button>
                                <ul className="vendor-docs">
                                    {(me && me.docs ? me.docs : []).map((doc) => (
                                        <li key={doc.id}>
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">{doc.originalName || doc.kind}</a>
                                            <span>{DOC_KINDS.find((item) => item.id === doc.kind)?.label || doc.kind}</span>
                                        </li>
                                    ))}
                                </ul>
                            </form>
                        )}

                        {me && (
                            <aside className="vendor-status-card">
                                <h3>وضعیت درخواست</h3>
                                <p>{me.status === 'pending' ? 'در انتظار تأیید کارشناس' : me.status === 'suspended' ? 'تعلیق‌شده' : me.status}</p>
                                <p>{me.profileComplete ? 'پرونده کامل است.' : 'برای تکمیل، هویت، شبا و حداقل دو مدرک لازم است.'}</p>
                            </aside>
                        )}
                    </section>
                )}

                {me && me.status === 'active' && (
                    <section className="vendor-workspace">
                        <p className="vendor-active-line">فروشگاه فعال: {me.displayName} · کمیسیون {me.commissionPct}٪</p>
                        <div className="vendor-tabs">
                            {tabs.map((item) => (
                                <button key={item.id} type="button" className={tab === item.id ? 'is-on' : ''} onClick={() => setTab(item.id)}>
                                    <FontAwesomeIcon icon={item.icon} />
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {tab === 'products' && (
                            <>
                                <form className="product-form vendor-form" onSubmit={createProduct}>
                                    <h3>تعریف محصول جدید</h3>
                                    <input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} placeholder="نام محصول" required />
                                    <textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} placeholder="توضیح" />
                                    <CategoryCascade
                                        tree={categories}
                                        value={productForm.category}
                                        onChange={(name) => setProductForm((p) => ({ ...p, category: name }))}
                                        emptyLabel="انتخاب گروه"
                                        required
                                        forceLeaf
                                    />
                                    <div className="product-form-row">
                                        <input value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} placeholder="قیمت فروش" required />
                                        <input value={productForm.compareAtPrice} onChange={(e) => setProductForm((p) => ({ ...p, compareAtPrice: e.target.value }))} placeholder="قیمت قبل از تخفیف" />
                                        <input value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} placeholder="موجودی" />
                                    </div>
                                    <input type="file" accept="image/*" multiple onChange={(e) => setProductForm((p) => ({ ...p, images: e.target.files }))} />
                                    <button type="submit">ارسال برای تأیید ادمین</button>
                                </form>
                                <div className="products-admin-list">
                                    {products.map((product) => (
                                        <div key={product.id} className="product-admin-item">
                                            <div>
                                                <h3>{product.name}</h3>
                                                <p>{formatPrice(product.price)} · موجودی {product.stock} · {reviewLabel(product.reviewStatus)}</p>
                                            </div>
                                            {product.active && <Link to={`/shop/${product.id}`}>مشاهده</Link>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {tab === 'orders' && (
                            <div className="vendor-orders">
                                {orders.length === 0 && <p>سفارشی برای این فروشگاه ثبت نشده است.</p>}
                                {orders.map((order) => (
                                    <article key={order.id} className="vendor-order-card">
                                        <h3>سفارش #{order.id}</h3>
                                        <ul>
                                            {(order.items || []).map((item) => (
                                                <li key={item.id || item.productId}>
                                                    <span>{item.name} × {item.quantity} — {formatPrice(item.lineTotal)}</span>
                                                    <select
                                                        value={item.lineStatus || 'pending'}
                                                        onChange={(e) => updateLine(item.id, e.target.value)}
                                                    >
                                                        {LINE_STATUSES.map((opt) => (
                                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        )}

                        {tab === 'sales' && finance && (
                            <div className="vendor-report">
                                <p>جمع فروش: <strong>{formatPrice(finance.salesTotal)}</strong></p>
                                {finance.sales.length === 0 ? <p>هنوز فروشی ثبت نشده است.</p> : (
                                    <ul>
                                        {finance.sales.map((row) => (
                                            <li key={row.name}>{row.name} · {row.quantity} عدد · {formatPrice(row.total)}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {tab === 'finance' && finance && (
                            <div className="vendor-report">
                                <p>کمیسیون کسرشده: <strong>{formatPrice(finance.commissionTotal)}</strong></p>
                                <p>مانده امانی (قابل تسویه پس از تحویل و مهلت مرجوعی): <strong>{formatPrice(finance.holdTotal)}</strong></p>
                                <p>بازگشت/بدهی: <strong>{formatPrice(finance.refundTotal)}</strong></p>
                                <h3>اسناد مالی</h3>
                                <ul>
                                    {finance.recent.map((row) => (
                                        <li key={row.id}>{row.kind} · {formatPrice(row.amount)} · {row.note}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default VendorPanelPage;
