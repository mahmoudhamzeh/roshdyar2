import React, { useState, useEffect } from 'react';
import './BannerManagement.css';

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newBanner, setNewBanner] = useState({ title: '', link: '', image: null });

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/banners');
            if (!response.ok) throw new Error('Failed to fetch banners');
            const data = await response.json();
            setBanners(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewBanner(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setNewBanner(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newBanner.image) {
            alert('لطفا یک تصویر برای بنر انتخاب کنید.');
            return;
        }

        const formData = new FormData();
        formData.append('title', newBanner.title);
        formData.append('link', newBanner.link);
        formData.append('image', newBanner.image);

        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/banners', {
                method: 'POST',
                headers: { 'x-user-id': adminUser.id },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to upload banner');
            }

            const createdBanner = await response.json();
            setBanners([...banners, createdBanner]);
            setNewBanner({ title: '', link: '', image: null }); // Reset form
            alert('بنر با موفقیت آپلود شد');
        } catch (err) {
            setError(err.message);
            alert(`خطا در آپلود بنر: ${err.message}`);
        }
    };

    const handleDelete = async (bannerId) => {
        if (window.confirm('آیا از حذف این بنر اطمینان دارید؟')) {
            try {
                const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
                const response = await fetch(`/api/admin/banners/${bannerId}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': adminUser.id }
                });
                if (!response.ok) throw new Error('Failed to delete banner');
                setBanners(banners.filter(b => b.id !== bannerId));
                alert('بنر با موفقیت حذف شد');
            } catch (err) {
                setError(err.message);
                alert(`خطا در حذف بنر: ${err.message}`);
            }
        }
    };

    return (
        <div className="banner-management">
            <h2>مدیریت بنرها</h2>

            <form onSubmit={handleSubmit} className="upload-form">
                <h3>آپلود بنر جدید</h3>
                <input type="text" name="title" value={newBanner.title} onChange={handleInputChange} placeholder="عنوان بنر" />
                <input type="text" name="link" value={newBanner.link} onChange={handleInputChange} placeholder="لینک (اختیاری)" />
                <input type="file" name="image" onChange={handleFileChange} />
                <button type="submit">آپلود</button>
            </form>

            <hr />

            <h3>بنرهای موجود</h3>
            {loading && <p>در حال بارگذاری بنرها...</p>}
            {error && <p className="error-message">{error}</p>}
            <div className="banners-list">
                {banners.map(banner => (
                    <div key={banner.id} className="banner-card">
                        <img src={`${banner.imageUrl}`} alt={banner.title} />
                        <div className="banner-info">
                            <h4>{banner.title}</h4>
                            <a href={banner.link} target="_blank" rel="noopener noreferrer">{banner.link}</a>
                        </div>
                        <button onClick={() => handleDelete(banner.id)} className="btn-delete">حذف</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BannerManagement;
