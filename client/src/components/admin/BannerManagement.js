import React, { useState, useEffect } from 'react';
import './BannerManagement.css';

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '',
        subtitle: '',
        link: '',
        placement: 'shop',
        productId: '',
        image: null
    });

    const load = async () => {
        setLoading(true);
        try {
            const [bannerRes, productRes] = await Promise.all([
                fetch('/api/banners?placement=all'),
                fetch('/api/shop/products')
            ]);
            if (!bannerRes.ok) throw new Error('بارگذاری بنرها ناموفق بود');
            setBanners(await bannerRes.json());
            if (productRes.ok) setProducts(await productRes.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.image) {
            alert('تصویر بنر لازم است');
            return;
        }
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('subtitle', form.subtitle);
        formData.append('link', form.link);
        formData.append('placement', form.placement);
        formData.append('productId', form.productId);
        formData.append('image', form.image);
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/banners', {
                method: 'POST',
                headers: { 'x-user-id': adminUser.id },
                body: formData
            });
            if (!response.ok) throw new Error('آپلود بنر ناموفق بود');
            setForm({ title: '', subtitle: '', link: '', placement: 'shop', productId: '', image: null });
            load();
        } catch (err) {
            setError(err.message);
            alert(err.message);
        }
    };

    const handleDelete = async (bannerId) => {
        if (!window.confirm('این بنر حذف شود؟')) return;
        const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
        await fetch(`/api/admin/banners/${bannerId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': adminUser.id }
        });
        load();
    };

    return (
        <div className="banner-management">
            <h2>بنرهای فروشگاه و صفحه اصلی</h2>
            <form onSubmit={handleSubmit} className="upload-form">
                <h3>بنر جدید</h3>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="عنوان"
                />
                <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="توضیح کوتاه"
                />
                <label>محل نمایش</label>
                <select
                    value={form.placement}
                    onChange={(e) => setForm((p) => ({ ...p, placement: e.target.value }))}
                >
                    <option value="shop">اسلایدر فروشگاه</option>
                    <option value="home">صفحه اصلی</option>
                </select>
                <label>لینک به محصول</label>
                <select
                    value={form.productId}
                    onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}
                >
                    <option value="">بدون محصول</option>
                    {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={form.link}
                    onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                    placeholder="لینک دستی (اگر محصول انتخاب نشود)"
                />
                <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, image: e.target.files[0] }))} />
                <button type="submit">آپلود بنر</button>
            </form>
            {loading && <p>در حال بارگذاری...</p>}
            {error && <p className="error-message">{error}</p>}
            <div className="banners-list">
                {banners.map((banner) => (
                    <div key={banner.id} className="banner-card">
                        <img src={banner.imageUrl} alt={banner.title} />
                        <div className="banner-info">
                            <h4>{banner.title || 'بدون عنوان'}</h4>
                            <p>{banner.placement === 'shop' ? 'فروشگاه' : 'صفحه اصلی'}</p>
                            <small>{banner.link}</small>
                        </div>
                        <button type="button" onClick={() => handleDelete(banner.id)} className="btn-delete">حذف</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BannerManagement;
