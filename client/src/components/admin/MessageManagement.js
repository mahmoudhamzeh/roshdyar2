import React, { useEffect, useState } from 'react';
import './MessageManagement.css';

const API = 'http://localhost:5000';

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
        image: null,
        mobilesFile: null,
        mobilesText: ''
    });

    const getAdminHeaders = () => {
        const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
        return { 'x-user-id': adminUser.id };
    };

    const userLabel = (user) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        const base = name || user.username || user.email || `کاربر ${user.id}`;
        return user.mobile ? `${base} — ${user.mobile}` : `${base} (#${user.id})`;
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
            setForm(prev => {
                if (prev.userId) return prev;
                const preferred = usersData.find(u => !u.isAdmin) || usersData[0];
                return preferred ? { ...prev, userId: String(preferred.id) } : prev;
            });
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

    const handleImageChange = (e) => {
        setForm(prev => ({ ...prev, image: e.target.files[0] || null }));
    };

    const handleMobilesFileChange = (e) => {
        setForm(prev => ({ ...prev, mobilesFile: e.target.files[0] || null }));
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
            selectedUserIds: users.filter(u => !u.isAdmin).map(u => u.id)
        }));
    };

    const resetFormFiles = () => {
        const imageInput = document.getElementById('admin-message-image');
        const mobilesInput = document.getElementById('admin-mobiles-file');
        if (imageInput) imageInput.value = '';
        if (mobilesInput) mobilesInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.title.trim()) {
            setError('عنوان پیام الزامی است.');
            return;
        }

        if (form.mode === 'single' && !form.userId && !form.mobilesText.trim()) {
            setError('لطفاً کاربر گیرنده یا شماره موبایل را مشخص کنید.');
            return;
        }

        if (
            form.mode === 'bulk' &&
            form.selectedUserIds.length === 0 &&
            !form.mobilesFile &&
            !form.mobilesText.trim()
        ) {
            setError('برای ارسال بالک، کاربران را انتخاب کنید یا فایل/لیست موبایل بارگذاری کنید.');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title.trim());
        formData.append('body', form.body.trim());
        formData.append('link', form.link.trim());
        formData.append('mode', form.mode);

        if (form.mode === 'single') {
            if (form.userId) formData.append('userId', form.userId);
            if (form.mobilesText.trim()) formData.append('mobiles', form.mobilesText.trim());
        } else {
            if (form.selectedUserIds.length > 0) {
                formData.append('userIds', JSON.stringify(form.selectedUserIds));
            }
            if (form.mobilesText.trim()) {
                formData.append('mobiles', form.mobilesText.trim());
            }
            if (form.mobilesFile) {
                formData.append('mobilesFile', form.mobilesFile);
            }
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

            const recipientNames = (data.recipients || [])
                .map(r => r.mobile ? `${r.name} (${r.mobile})` : r.name)
                .join('، ');
            let successText = form.mode === 'bulk'
                ? `پیام بالک برای ${data.recipientIds?.length || 0} کاربر ارسال شد.`
                : 'پیام تکی با موفقیت ارسال شد.';
            if (recipientNames) successText += ` گیرندگان: ${recipientNames}`;
            if (data.unmatchedMobiles?.length) {
                successText += ` | موبایل‌های بدون کاربر: ${data.unmatchedMobiles.join(', ')}`;
            }

            setSuccess(successText);
            setForm(prev => ({
                ...prev,
                title: '',
                body: '',
                link: '',
                image: null,
                mobilesFile: null,
                mobilesText: '',
                selectedUserIds: []
            }));
            resetFormFiles();
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

    const regularUsers = users.filter(u => !u.isAdmin);
    const selectableUsers = regularUsers.length > 0 ? regularUsers : users;

    return (
        <div className="message-management">
            <h2>ارسال و مدیریت پیام‌ها</h2>
            <p className="section-hint">
                ارسال پیام تکی یا بالک به کاربران همراه با عکس و لینک. برای بالک می‌توانید فایل شماره موبایل بارگذاری کنید.
            </p>

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
                    <>
                        <div className="form-group">
                            <label htmlFor="message-user">گیرنده</label>
                            <select
                                id="message-user"
                                name="userId"
                                value={form.userId}
                                onChange={handleChange}
                            >
                                <option value="">انتخاب کاربر...</option>
                                {selectableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {userLabel(user)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="single-mobile">یا شماره موبایل گیرنده</label>
                            <input
                                id="single-mobile"
                                type="text"
                                name="mobilesText"
                                value={form.mobilesText}
                                onChange={handleChange}
                                placeholder="مثلاً 09121234567"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bulk-users">
                            <div className="bulk-users-header">
                                <span>انتخاب کاربران از لیست</span>
                                <button type="button" onClick={selectAllUsers}>انتخاب همه کاربران</button>
                            </div>
                            <div className="bulk-users-list">
                                {selectableUsers.map(user => (
                                    <label key={user.id} className="bulk-user-item">
                                        <input
                                            type="checkbox"
                                            checked={form.selectedUserIds.includes(user.id)}
                                            onChange={() => toggleBulkUser(user.id)}
                                        />
                                        {userLabel(user)}
                                    </label>
                                ))}
                                {selectableUsers.length === 0 && (
                                    <p className="hint-text">کاربری برای انتخاب وجود ندارد.</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="admin-mobiles-file">بارگذاری فایل شماره موبایل</label>
                            <input
                                id="admin-mobiles-file"
                                type="file"
                                accept=".txt,.csv,.text,text/plain,text/csv"
                                onChange={handleMobilesFileChange}
                            />
                            <p className="hint-text">
                                فرمت: فایل متنی یا CSV — هر خط یک شماره (یا با ویرگول جدا شده). مثال: 09121234567
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="bulk-mobiles-text">یا چسباندن لیست موبایل</label>
                            <textarea
                                id="bulk-mobiles-text"
                                name="mobilesText"
                                rows="3"
                                value={form.mobilesText}
                                onChange={handleChange}
                                placeholder={'09121234567\n09123334444'}
                            />
                        </div>
                    </>
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
                        onChange={handleImageChange}
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
                                {msg.recipients?.length > 0 && (
                                    <p className="meta recipients-line">
                                        {msg.recipients.map(r => r.mobile ? `${r.name} (${r.mobile})` : r.name).join('، ')}
                                    </p>
                                )}
                                {msg.unmatchedMobiles?.length > 0 && (
                                    <p className="meta unmatched">
                                        موبایل بدون کاربر: {msg.unmatchedMobiles.join(', ')}
                                    </p>
                                )}
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
