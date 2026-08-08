import React, { useEffect, useState } from 'react';
import './MessageManagement.css';

const API = '';

const MessageManagement = () => {
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        mode: 'single',
        userId: '',
        selectedUserIds: [],
        title: '',
        body: '',
        link: '',
        image: null
    });

    const getAdminHeaders = () => {
        const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
        return { 'x-user-id': adminUser.id };
    };

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const headers = getAdminHeaders();
            const [usersRes, messagesRes] = await Promise.all([
                fetch(`${API}/api/admin/users`, { headers }),
                fetch(`${API}/api/admin/messages`, { headers })
            ]);
            if (!usersRes.ok || !messagesRes.ok) throw new Error('خطا در دریافت اطلاعات');
            const usersData = await usersRes.json();
            const messagesData = await messagesRes.json();
            setUsers(usersData);
            setMessages(messagesData);
            if (!form.userId && usersData.length > 0) {
                setForm(prev => ({ ...prev, userId: String(usersData[0].id) }));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setForm(prev => ({ ...prev, image: e.target.files[0] || null }));
    };

    const toggleBulkUser = (userId) => {
        setForm(prev => {
            const exists = prev.selectedUserIds.includes(userId);
            return {
                ...prev,
                selectedUserIds: exists
                    ? prev.selectedUserIds.filter(id => id !== userId)
                    : [...prev.selectedUserIds, userId]
            };
        });
    };

    const selectAllUsers = () => {
        setForm(prev => ({
            ...prev,
            selectedUserIds: users.map(u => u.id)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.title.trim()) {
            setError('عنوان پیام الزامی است.');
            return;
        }

        if (form.mode === 'single' && !form.userId) {
            setError('لطفاً کاربر گیرنده را انتخاب کنید.');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title.trim());
        formData.append('body', form.body.trim());
        formData.append('link', form.link.trim());
        formData.append('mode', form.mode);

        if (form.mode === 'single') {
            formData.append('userId', form.userId);
        } else if (form.selectedUserIds.length > 0) {
            formData.append('userIds', JSON.stringify(form.selectedUserIds));
        }

        if (form.image) {
            formData.append('image', form.image);
        }

        try {
            const res = await fetch(`${API}/api/admin/messages`, {
                method: 'POST',
                headers: getAdminHeaders(),
                body: formData
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ارسال پیام ناموفق بود');

            setSuccess(
                form.mode === 'bulk'
                    ? `پیام به‌صورت بالک برای ${data.recipientIds?.length || 0} کاربر ارسال شد.`
                    : 'پیام تکی با موفقیت ارسال شد.'
            );
            setForm(prev => ({
                ...prev,
                title: '',
                body: '',
                link: '',
                image: null,
                selectedUserIds: []
            }));
            const fileInput = document.getElementById('admin-message-image');
            if (fileInput) fileInput.value = '';
            await fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('آیا از حذف این پیام مطمئن هستید؟')) return;
        try {
            const res = await fetch(`${API}/api/admin/messages/${id}`, {
                method: 'DELETE',
                headers: getAdminHeaders()
            });
            if (!res.ok) throw new Error('حذف پیام ناموفق بود');
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const userLabel = (user) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        return name || user.username || user.email || `کاربر ${user.id}`;
    };

    return (
        <div className="message-management">
            <h2>ارسال و مدیریت پیام‌ها</h2>
            <p className="section-hint">ارسال پیام تکی یا بالک به کاربران همراه با عکس و لینک</p>

            <form className="message-form" onSubmit={handleSubmit}>
                <div className="mode-switch">
                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="single"
                            checked={form.mode === 'single'}
                            onChange={handleChange}
                        />
                        ارسال تکی
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="bulk"
                            checked={form.mode === 'bulk'}
                            onChange={handleChange}
                        />
                        ارسال بالک
                    </label>
                </div>

                {form.mode === 'single' ? (
                    <div className="form-group">
                        <label htmlFor="message-user">گیرنده</label>
                        <select
                            id="message-user"
                            name="userId"
                            value={form.userId}
                            onChange={handleChange}
                        >
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {userLabel(user)} (#{user.id})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="bulk-users">
                        <div className="bulk-users-header">
                            <span>انتخاب کاربران (خالی = همه کاربران غیرمدیر)</span>
                            <button type="button" onClick={selectAllUsers}>انتخاب همه</button>
                        </div>
                        <div className="bulk-users-list">
                            {users.map(user => (
                                <label key={user.id} className="bulk-user-item">
                                    <input
                                        type="checkbox"
                                        checked={form.selectedUserIds.includes(user.id)}
                                        onChange={() => toggleBulkUser(user.id)}
                                    />
                                    {userLabel(user)}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="message-title">عنوان</label>
                    <input
                        id="message-title"
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="عنوان پیام"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="message-body">متن پیام</label>
                    <textarea
                        id="message-body"
                        name="body"
                        rows="4"
                        value={form.body}
                        onChange={handleChange}
                        placeholder="متن پیام را بنویسید..."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="message-link">لینک (اختیاری)</label>
                    <input
                        id="message-link"
                        type="text"
                        name="link"
                        value={form.link}
                        onChange={handleChange}
                        placeholder="مثلاً /vaccination-status/13 یا https://..."
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="admin-message-image">عکس (اختیاری)</label>
                    <input
                        id="admin-message-image"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}

                <button type="submit" className="btn-send">ارسال پیام</button>
            </form>

            <hr />

            <h3>پیام‌های ارسال‌شده</h3>
            {loading && <p>در حال بارگذاری...</p>}
            <div className="sent-messages-list">
                {messages.length === 0 && !loading ? (
                    <p>هنوز پیامی ارسال نشده است.</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="sent-message-card">
                            <div className="sent-message-info">
                                <h4>{msg.title}</h4>
                                <p>{msg.body}</p>
                                {msg.link && <p className="meta">لینک: {msg.link}</p>}
                                <p className="meta">
                                    {msg.isBulk ? 'بالک' : 'تکی'} — گیرندگان: {msg.recipientIds?.length || 0}
                                    {msg.readBy?.length ? ` — خوانده‌شده: ${msg.readBy.length}` : ''}
                                </p>
                                {msg.imageUrl && (
                                    <img src={`${API}${msg.imageUrl}`} alt={msg.title} />
                                )}
                            </div>
                            <button type="button" className="btn-delete" onClick={() => handleDelete(msg.id)}>
                                حذف
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MessageManagement;
