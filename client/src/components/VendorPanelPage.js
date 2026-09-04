import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice } from '../utils/cart';
import { findCategoryPath } from '../utils/shop';
import CategoryCascade from './CategoryCascade';
import './ShopWorld.css';
import './admin/ProductManagement.css';

const VendorPanelPage = () => {
    const [me, setMe] = useState(null);
    const [form, setForm] = useState({ displayName: '', phone: '', docsNote: '' });
    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState('');
    const [categories, setCategories] = useState([]);
    const [productForm, setProductForm] = useState({
        name: '', description: '', category: '', price: '', stock: '', compareAtPrice: ''
    });

    const load = async () => {
        const vendor = await fetch('/api/shop/vendors/me').then((r) => (r.ok ? r.json() : null));
        setMe(vendor);
        const cats = await fetch('/api/shop/categories').then((r) => (r.ok ? r.json() : []));
        setCategories(Array.isArray(cats) ? cats : (cats.tree || []));
        if (vendor && vendor.status === 'active') {
            const offers = await fetch('/api/vendor/offers').then((r) => (r.ok ? r.json() : []));
            setProducts(offers);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const apply = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/shop/vendors/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت‌نام فروشنده ناموفق بود');
            return;
        }
        setMe(data);
        setMessage('درخواست ارسال شد و منتظر تأیید اپراتور است.');
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
        Object.entries(productForm).forEach(([key, value]) => body.append(key, value));
        const res = await fetch('/api/vendor/products', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'ثبت محصول ناموفق بود');
            return;
        }
        setProductForm({ name: '', description: '', category: '', price: '', stock: '', compareAtPrice: '' });
        load();
        setMessage('محصول ثبت شد');
    };

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <h1>پنل فروشنده</h1>
                {message && <p>{message}</p>}
                {!me && (
                    <form className="product-form" onSubmit={apply}>
                        <p>برای فروش در مارکت‌پلیس تات کیدز مدارک و نام فروشگاه را بفرستید.</p>
                        <input
                            value={form.displayName}
                            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                            placeholder="نام فروشگاه"
                            required
                        />
                        <input
                            value={form.phone}
                            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="شماره تماس"
                        />
                        <textarea
                            value={form.docsNote}
                            onChange={(e) => setForm((p) => ({ ...p, docsNote: e.target.value }))}
                            placeholder="توضیح مجوزها و مدارک اسباب‌بازی / محصولات کودک"
                            rows="4"
                        />
                        <button type="submit">ارسال درخواست</button>
                    </form>
                )}
                {me && me.status !== 'active' && (
                    <p>وضعیت درخواست: {me.status === 'pending' ? 'در انتظار تأیید' : me.status}</p>
                )}
                {me && me.status === 'active' && (
                    <>
                        <p>فروشگاه فعال: {me.displayName} · کمیسیون {me.commissionPct}٪</p>
                        <form className="product-form" onSubmit={createProduct}>
                            <h3>افزودن محصول</h3>
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
                            <input value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} placeholder="قیمت فروش" required />
                            <input value={productForm.compareAtPrice} onChange={(e) => setProductForm((p) => ({ ...p, compareAtPrice: e.target.value }))} placeholder="قیمت قبل از تخفیف" />
                            <input value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} placeholder="موجودی" />
                            <button type="submit">ثبت محصول</button>
                        </form>
                        <div className="products-admin-list">
                            {products.map((product) => (
                                <div key={product.id} className="product-admin-item">
                                    <div>
                                        <h3>{product.name}</h3>
                                        <p>{formatPrice(product.price)} · موجودی {product.stock}</p>
                                    </div>
                                    <Link to={`/shop/${product.id}`}>مشاهده</Link>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default VendorPanelPage;
