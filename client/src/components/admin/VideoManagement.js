import React, { useState, useEffect } from 'react';
import './VideoManagement.css';

const VideoManagement = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newVideo, setNewVideo] = useState({ title: '', url: '', summary: '' });

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewVideo(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': adminUser.id
                },
                body: JSON.stringify(newVideo),
            });
            if (!response.ok) throw new Error('Failed to create video');

            fetchVideos(); // Re-fetch to get the new list
            setShowForm(false);
            setNewVideo({ title: '', url: '', summary: '' });
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
                    headers: { 'x-user-id': adminUser.id }
                });
                fetchVideos(); // Re-fetch
                alert('ویدیو حذف شد');
            } catch (err) {
                alert(`خطا در حذف: ${err.message}`);
            }
        }
    };

    return (
        <div className="video-management">
            <h2>مدیریت ویدیوها</h2>
            <button onClick={() => setShowForm(!showForm)} className="btn-add-video">
                {showForm ? 'پنهان کردن فرم' : 'افزودن ویدیوی جدید'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="video-form">
                    <input type="text" name="title" value={newVideo.title} onChange={handleInputChange} placeholder="عنوان" required />
                    <input type="url" name="url" value={newVideo.url} onChange={handleInputChange} placeholder="URL ویدیو (مثلا لینک آپارات)" required />
                    <textarea name="summary" value={newVideo.summary} onChange={handleInputChange} placeholder="توضیحات (اختیاری)" rows="3"></textarea>
                    <button type="submit">ذخیره ویدیو</button>
                </form>
            )}

            <div className="videos-list">
                {loading ? <p>در حال بارگذاری...</p> : videos.map(video => (
                    <div key={video.id} className="video-item">
                        <div className="video-item-info">
                            <h3>{video.title}</h3>
                            <a href={video.url} target="_blank" rel="noopener noreferrer">{video.url}</a>
                            <p>{video.summary}</p>
                        </div>
                        <div className="video-item-actions">
                            <button onClick={() => handleDelete(video.id)} className="btn-delete">حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VideoManagement;
