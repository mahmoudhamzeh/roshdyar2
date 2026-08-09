import React, { useState, useEffect } from 'react';
import './VideoManagement.css';

const VideoManagement = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newVideo, setNewVideo] = useState({ title: '', url: '', summary: '', thumbnail: null });
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('Failed to fetch videos');
            const data = await response.json();
            setVideos(data);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    useEffect(() => () => {
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    }, [thumbnailPreview]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewVideo((prev) => ({ ...prev, [name]: value }));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files?.[0] || null;
        setNewVideo((prev) => ({ ...prev, thumbnail: file }));
        setThumbnailPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : null;
        });
    };

    const resetForm = () => {
        setNewVideo({ title: '', url: '', summary: '', thumbnail: null });
        setThumbnailPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newVideo.thumbnail) {
            alert('لطفاً یک تصویر کاور برای ویدیو آپلود کنید تا روی داشبورد نمایش داده شود.');
            return;
        }

        const formData = new FormData();
        formData.append('title', newVideo.title);
        formData.append('url', newVideo.url);
        formData.append('summary', newVideo.summary);
        formData.append('thumbnail', newVideo.thumbnail);

        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/videos', {
                method: 'POST',
                headers: {
                    'x-user-id': adminUser.id,
                },
                body: formData,
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to create video');
            }

            fetchVideos();
            setShowForm(false);
            resetForm();
            alert('ویدیو با موفقیت ایجاد شد');
        } catch (err) {
            console.error(err.message);
            alert(`خطا در ایجاد ویدیو: ${err.message}`);
        }
    };

    const handleDelete = async (videoId) => {
        if (window.confirm('آیا از حذف این ویدیو اطمینان دارید؟')) {
            try {
                const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
                await fetch(`/api/admin/videos/${videoId}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': adminUser.id },
                });
                fetchVideos();
                alert('ویدیو حذف شد');
            } catch (err) {
                alert(`خطا در حذف: ${err.message}`);
            }
        }
    };

    return (
        <div className="video-management">
            <h2>مدیریت ویدیوها</h2>
            <p className="video-management-hint">
                لینک پخش (آپارات/یوتیوب) را وارد کنید و حتماً یک تصویر کاور آپلود کنید تا روی کارت ویدیو در داشبورد نمایش داده شود.
            </p>
            <button onClick={() => setShowForm(!showForm)} className="btn-add-video">
                {showForm ? 'پنهان کردن فرم' : 'افزودن ویدیوی جدید'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="video-form">
                    <input
                        type="text"
                        name="title"
                        value={newVideo.title}
                        onChange={handleInputChange}
                        placeholder="عنوان"
                        required
                    />
                    <input
                        type="url"
                        name="url"
                        value={newVideo.url}
                        onChange={handleInputChange}
                        placeholder="لینک پخش ویدیو (مثلاً آپارات)"
                        required
                    />
                    <textarea
                        name="summary"
                        value={newVideo.summary}
                        onChange={handleInputChange}
                        placeholder="توضیحات (اختیاری)"
                        rows="3"
                    />
                    <label className="video-thumbnail-label">
                        تصویر کاور ویدیو
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            required
                        />
                    </label>
                    {thumbnailPreview && (
                        <div className="video-thumbnail-preview">
                            <img src={thumbnailPreview} alt="پیش‌نمایش کاور" />
                        </div>
                    )}
                    <button type="submit">ذخیره ویدیو</button>
                </form>
            )}

            <div className="videos-list">
                {loading ? (
                    <p>در حال بارگذاری...</p>
                ) : (
                    videos.map((video) => (
                        <div key={video.id} className="video-item">
                            <div className="video-item-media">
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} />
                                ) : (
                                    <div className="video-item-fallback" aria-hidden="true">
                                        ▶
                                    </div>
                                )}
                            </div>
                            <div className="video-item-info">
                                <h3>{video.title}</h3>
                                <a href={video.url} target="_blank" rel="noopener noreferrer">
                                    {video.url}
                                </a>
                                <p>{video.summary}</p>
                            </div>
                            <div className="video-item-actions">
                                <button onClick={() => handleDelete(video.id)} className="btn-delete">
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default VideoManagement;
