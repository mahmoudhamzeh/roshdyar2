import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { getLoggedInUser, setAuthSession, getAuthToken } from '../api';
import { provinces } from './CitySelector';
import { toShamsi } from '../utils/dateConverter';
import { formatLocalDate } from '../utils/growth-dates';
import { isUserProfileComplete, safeNextPath } from '../utils/profile';
import './DatePickerOverride.css';

const FIELDS = [
    { name: 'username', label: 'نام کاربری', type: 'text', readOnly: true },
    { name: 'firstName', label: 'نام', type: 'text' },
    { name: 'lastName', label: 'نام خانوادگی', type: 'text' },
    { name: 'email', label: 'ایمیل', type: 'email' },
    { name: 'mobile', label: 'شماره موبایل', type: 'tel' }
];

const parseBirthDate = (value) => {
    if (!value) return null;
    try {
        const normalized = String(value).replace(/\//g, '-');
        return new DateObject({ date: normalized, calendar: gregorian }).convert(persian);
    } catch {
        return null;
    }
};

const toGregorianBirthDate = (value) => {
    if (!value) return '';
    try {
        const selected = Array.isArray(value) ? value[0] : value;
        if (!selected) return '';
        if (selected instanceof Date) return formatLocalDate(selected);
        if (typeof selected.toDate === 'function') {
            return formatLocalDate(selected.toDate());
        }
        const asObject = selected instanceof DateObject ? selected : new DateObject(selected);
        return formatLocalDate(asObject.convert(gregorian).toDate());
    } catch {
        return '';
    }
};

const displayValue = (value) => {
    const text = value == null ? '' : String(value).trim();
    return text || '—';
};

const UserInfo = () => {
    const history = useHistory();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const wantsComplete = search.get('complete') === '1';
    const nextPath = safeNextPath(search.get('next'), '');
    const [user, setUser] = useState(null);
    const [birthDate, setBirthDate] = useState(null);
    const [isEditing, setIsEditing] = useState(wantsComplete);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUser = async () => {
        try {
            const loggedInUser = getLoggedInUser();
            if (!loggedInUser || !loggedInUser.id) {
                setError('اطلاعات کاربری نامعتبر است.');
                return;
            }
            const response = await fetch(`/api/users/${loggedInUser.id}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to fetch user data');
            }
            const userData = await response.json();
            setUser(userData);
            setBirthDate(parseBirthDate(userData.birthDate));
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleUserChange = (e) => {
        const { name, value } = e.target;
        setUser((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'province') next.city = '';
            return next;
        });
    };

    const handleUserSubmit = async () => {
        setError('');
        setSuccess('');
        if (!String(user.firstName || '').trim() || !String(user.lastName || '').trim()) {
            setError('نام و نام خانوادگی را وارد کنید.');
            return;
        }
        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...user,
                    birthDate: toGregorianBirthDate(birthDate)
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'خطا در ذخیره اطلاعات');
            }
            setSuccess('اطلاعات با موفقیت ذخیره شد.');
            setUser(result.user);
            setBirthDate(parseBirthDate(result.user.birthDate));
            setAuthSession(result.user, getAuthToken());
            setIsEditing(false);
            if (wantsComplete && nextPath && isUserProfileComplete(result.user)) {
                history.push(nextPath);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    if (error && !user) {
        return <div className="profile-alert profile-alert-error">{`خطا: ${error}`}</div>;
    }
    if (!user) return <div className="profile-loading">در حال بارگذاری...</div>;

    const cityOptions = user.province && provinces[user.province] ? provinces[user.province] : [];
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'کاربر';
    const initial = displayName.trim().charAt(0) || 'ک';

    const renderField = (field) => {
        const value = user[field.name];
        const empty = !value;
        const readOnly = field.readOnly;
        return (
            <div
                key={field.name}
                className={`user-info-field${empty && !isEditing ? ' is-empty' : ''}`}
            >
                <label className="user-info-label" htmlFor={`user-${field.name}`}>
                    {field.label}
                </label>
                {isEditing && !readOnly ? (
                    <input
                        id={`user-${field.name}`}
                        type={field.type}
                        name={field.name}
                        value={value || ''}
                        onChange={handleUserChange}
                        className="user-info-input"
                    />
                ) : (
                    <span className="user-info-value">{displayValue(value)}</span>
                )}
            </div>
        );
    };

    return (
        <section className="user-info-card">
            <div className="user-info-identity">
                <div className="user-info-avatar" aria-hidden="true">{initial}</div>
                <div className="user-info-identity-text">
                    <h2>{wantsComplete ? 'تکمیل پروفایل کاربری' : 'اطلاعات کاربر'}</h2>
                    <p>{displayName}{user.email ? ` · ${user.email}` : ''}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setIsEditing(!isEditing);
                        setError('');
                        setSuccess('');
                    }}
                    className="user-info-edit-btn"
                >
                    {isEditing ? 'لغو' : 'ویرایش'}
                </button>
            </div>

            {success && <p className="profile-alert profile-alert-success">{success}</p>}
            {error && <p className="profile-alert profile-alert-error">{error}</p>}

            <div className="user-info-grid">
                {FIELDS.map(renderField)}

                <div className={`user-info-field${!user.birthDate && !isEditing ? ' is-empty' : ''}`}>
                    <label className="user-info-label" htmlFor="user-birthDate">تاریخ تولد</label>
                    {isEditing ? (
                        <DatePicker
                            id="user-birthDate"
                            value={birthDate}
                            onChange={setBirthDate}
                            calendar={persian}
                            locale={persian_fa}
                            format="YYYY/MM/DD"
                            maxDate={new Date()}
                            placeholder="انتخاب تاریخ شمسی"
                            inputClass="user-info-input"
                            containerClassName="user-info-datepicker"
                            calendarPosition="bottom-center"
                            style={{ width: '100%', textAlign: 'center' }}
                        />
                    ) : (
                        <span className="user-info-value">{toShamsi(user.birthDate) || '—'}</span>
                    )}
                </div>

                <div className={`user-info-field${!user.province && !isEditing ? ' is-empty' : ''}`}>
                    <label className="user-info-label" htmlFor="user-province">استان</label>
                    {isEditing ? (
                        <select
                            id="user-province"
                            name="province"
                            value={user.province || ''}
                            onChange={handleUserChange}
                            className="user-info-input"
                        >
                            <option value="">انتخاب استان</option>
                            {Object.keys(provinces).map((province) => (
                                <option key={province} value={province}>{province}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="user-info-value">{displayValue(user.province)}</span>
                    )}
                </div>

                <div className={`user-info-field${!user.city && !isEditing ? ' is-empty' : ''}`}>
                    <label className="user-info-label" htmlFor="user-city">شهر</label>
                    {isEditing ? (
                        <select
                            id="user-city"
                            name="city"
                            value={user.city || ''}
                            onChange={handleUserChange}
                            className="user-info-input"
                            disabled={!user.province}
                        >
                            <option value="">انتخاب شهر</option>
                            {cityOptions.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="user-info-value">{displayValue(user.city)}</span>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="user-info-actions">
                    <button type="button" onClick={handleUserSubmit} className="user-info-save-btn">
                        ذخیره اطلاعات
                    </button>
                </div>
            )}
        </section>
    );
};

export default UserInfo;
