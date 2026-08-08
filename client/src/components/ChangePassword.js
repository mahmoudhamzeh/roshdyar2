import React, { useState } from 'react';

const ChangePassword = () => {
    const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPassword(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser || !loggedInUser.id) {
            setError("ابتدا باید وارد شوید.");
            return;
        }
        if (password.new !== password.confirm) {
            setError('رمز عبور جدید و تکرار آن یکسان نیستند.');
            return;
        }
        try {
            const response = await fetch(`/api/users/${loggedInUser.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: password.current, newPassword: password.new }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'خطا در تغییر رمز عبور');
            }
            setSuccess('رمز عبور با موفقیت تغییر کرد.');
            setPassword({ current: '', new: '', confirm: '' });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h2>تغییر رمز عبور</h2>
            </div>
            {success && <p className="success-message">{success}</p>}
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                    <label>رمز عبور فعلی</label>
                    <input type="password" name="current" value={password.current} onChange={handlePasswordChange} required />
                </div>
                <div className="form-group">
                    <label>رمز عبور جدید</label>
                    <input type="password" name="new" value={password.new} onChange={handlePasswordChange} required />
                </div>
                <div className="form-group">
                    <label>تکرار رمز عبور جدید</label>
                    <input type="password" name="confirm" value={password.confirm} onChange={handlePasswordChange} required />
                </div>
                <button type="submit" className="btn-save">تغییر رمز</button>
            </form>
        </div>
    );
};

export default ChangePassword;
