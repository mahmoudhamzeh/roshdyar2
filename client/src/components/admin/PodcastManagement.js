import React, { useEffect, useState } from 'react';
import './VideoManagement.css';

const PodcastManagement = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', url: '', summary: '', duration: '', thumbnail: null });

    const adminHeaders = () => {
        const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
        return { 'x-user-id': adminUser.id };
    };

    const fetchPodcasts = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/podcasts');
            if (!response.ok) throw new Error('Failed to fetch podcasts');
            setPodcasts(await response.json());
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPodcasts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const body = new FormData();
        body.append('title', form.title);
        body.append('url', form.url);
        body.append('summary', form.summary);
        body.append('duration', form.duration);
        if (form.thumbnail) body.append('thumbnail', form.thumbnail);

        const res = await fetch('/api/admin/podcasts', {
            method: 'POST',
            headers: adminHeaders(),
            body
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'خطا در ذخیره پادکست');
            return;
        }
        setShowForm(false);
        setForm({ title: '', url: '', summary: '', duration: '', thumbnail: null });
        fetchPodcasts();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('آیا از حذف این پادکست اطمینان دارید؟')) return;
        await fetch(`/api/admin/podcasts/${id}`, {
            method: 'DELETE',
            headers: adminHeaders()
        });
        fetchPodcasts();
    };

    return (
        <div className="video-management">
            <h2>مدیریت پادکست‌ها</h2>
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn-add-video">
                {showForm ? 'پنهان کردن فرم' : 'افزودن پادکست جدید'}
            </button>
            {showForm && (
                <form onSubmit={handleSubmit} className="video-form">
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="عنوان"
                        required
                    />
                    <input
                        type="url"
                        value={form.url}
                        onChange={(e) => setForm({ ...form, url: e.target.value })}
                        placeholder="لینک پادکست"
                        required
                    />
                    <input
                        type="text"
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        placeholder="مدت زمان (مثلاً ۲۵:۴۰)"
                    />
                    <textarea
                        value={form.summary}
                        onChange={(e) => setForm({ ...form, summary: e.target.value })}
                        placeholder="توضیحات"
                        rows="3"
                    />
                    <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, thumbnail: e.target.files[0] })} />
                    <button type="submit">ذخیره پادکست</button>
                </form>
            )}
            <div className="videos-list">
                {loading ? <p>در حال بارگذاری...</p> : podcasts.map((podcast) => (
                    <div key={podcast.id} className="video-item">
                        <div className="video-item-info">
                            <h3>{podcast.title}</h3>
                            <p>{podcast.summary}</p>
                            {podcast.duration && <p>مدت: {podcast.duration}</p>}
                        </div>
                        <div className="video-item-actions">
                            <button type="button" onClick={() => handleDelete(podcast.id)} className="btn-delete">حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastManagement;
