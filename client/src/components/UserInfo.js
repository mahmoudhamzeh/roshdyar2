import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CitySelector from './CitySelector';

const UserInfo = () => {
    const location = useLocation();
    const wantsComplete = new URLSearchParams(location.search).get('complete') === '1';
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(wantsComplete);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUser = async () => {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if (!loggedInUser || !loggedInUser.id) {
                setError("اطلاعات کاربری نامعتبر است.");
                return;
            }
            const response = await fetch(`http://localhost:5000/api/users/${loggedInUser.id}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to fetch user data');
            }
            const userData = await response.json();
            setUser(userData);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleUserChange = (e) => {
        const { name, value } = e.target;
        setUser(prev => ({ ...prev, [name]: value }));
    };

    const handleUserSubmit = async () => {
        setError('');
        setSuccess('');
        console.log('[User Submit] Sending user data:', user);
        try {
            const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });
            const result = await response.json();
            console.log('[User Submit] Received response:', result);
            if (!response.ok) {
                throw new Error(result.message || 'خطا در ذخیره اطلاعات');
            }
            setSuccess('اطلاعات با موفقیت ذخیره شد.');
            setUser(result.user);
            localStorage.setItem('loggedInUser', JSON.stringify(result.user));
            setIsEditing(false);
        } catch (err) {
            console.error('[User Submit] Error:', err);
            setError(err.message);
        }
    };

    if (error) return <div className="error-message">{`خطا: ${error}`}</div>;
    if (!user) return <div>در حال بارگذاری...</div>;

    const renderInfoRow = (label, value, name, type = 'text', icon) => (
        <div className="info-row">
            <span className="info-label">
                {icon && <i className={`fas ${icon}`}></i>} {label}
            </span>
            {isEditing ? (
                <input type={type} name={name} value={value || ''} onChange={handleUserChange} className="info-input" />
            ) : (
                <span className="info-value">{value}</span>
            )}
        </div>
    );

    return (
        <div className="card">
            <div className="card-header">
                <h2>{wantsComplete ? 'تکمیل پروفایل کاربری' : 'اطلاعات کاربر'}</h2>
                <button onClick={() => setIsEditing(!isEditing)} className="edit-btn">{isEditing ? 'لغو' : 'ویرایش'}</button>
            </div>
            {success && <p className="success-message">{success}</p>}
            <div className="info-grid">
                {renderInfoRow('نام کاربری', user.username, 'username', 'text', 'fa-user')}
                {renderInfoRow('نام', user.firstName, 'firstName', 'text', 'fa-user-circle')}
                {renderInfoRow('نام خانوادگی', user.lastName, 'lastName', 'text', 'fa-user-circle')}
                {renderInfoRow('ایمیل', user.email, 'email', 'email', 'fa-envelope')}
                {renderInfoRow('شماره موبایل', user.mobile, 'mobile', 'tel', 'fa-mobile-alt')}
                {renderInfoRow('تاریخ تولد', user.birthDate, 'birthDate', 'date', 'fa-calendar-alt')}
            </div>
            {isEditing ? (
                <CitySelector
                    selectedProvince={user.province}
                    selectedCity={user.city}
                    onProvinceChange={handleUserChange}
                    onCityChange={handleUserChange}
                />
            ) : (
                <>
                    {renderInfoRow('استان', user.province, 'province')}
                    {renderInfoRow('شهر', user.city, 'city')}
                </>
            )}
            {isEditing && <button onClick={handleUserSubmit} className="btn-save">ذخیره اطلاعات</button>}
        </div>
    );
};

export default UserInfo;
