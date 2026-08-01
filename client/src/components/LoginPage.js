import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import './LoginPage.css';

const BrandMark = () => (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        <path
            d="M14 30c2.5-7 6-12 10-15 4 3 7.5 8 10 15"
            stroke="#FDE68A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="48"
            style={{ animation: 'mark-draw 1.2s ease forwards' }}
        />
        <circle cx="24" cy="14" r="3" fill="#FDE68A" style={{ animation: 'soft-pulse 2.8s ease-in-out infinite' }} />
    </svg>
);

const LoginPage = () => {
    const history = useHistory();
    const [loginInput, setLoginInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginMessage, setLoginMessage] = useState('');
    const [messageType, setMessageType] = useState('error');

    const handleLogin = async () => {
        if (!loginInput || !passwordInput) {
            setMessageType('error');
            setLoginMessage('لطفاً فیلدها را پر کنید.');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginInput, password: passwordInput }),
            });

            const data = await response.json();

            if (response.status === 200) {
                localStorage.setItem('loggedInUser', JSON.stringify(data.user));
                history.push('/dashboard');
            } else {
                setMessageType('error');
                setLoginMessage(data.message || 'اطلاعات ورود نادرست است.');
            }
        } catch (error) {
            setMessageType('error');
            setLoginMessage('خطا در ارتباط با سرور.');
        }
    };

    const handleSignup = async () => {
        if (!loginInput || !passwordInput) {
            setMessageType('error');
            setLoginMessage('لطفاً فیلدها را پر کنید.');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginInput, password: passwordInput }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessageType('success');
                setLoginMessage(data.message);
            } else {
                setMessageType('error');
                setLoginMessage(data.message || 'خطا در ثبت‌نام');
            }
        } catch (error) {
            setMessageType('error');
            setLoginMessage('خطا در ارتباط با سرور.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="login-page">
            <section className="login-hero" aria-label="معرفی رشدیار">
                <div className="login-hero-content">
                    <div className="login-brand-mark animate-fade-up">
                        <BrandMark />
                        <p className="brand-name">رشدیار</p>
                    </div>
                    <h1 className="animate-fade-up-delay">همراه هوشمند رشد و سلامت کودک</h1>
                    <p className="animate-fade-up-delay-2">
                        پیگیری رشد، واکسیناسیون و مراقبت روزانه — یکجا و ساده.
                    </p>
                </div>
            </section>

            <section className="login-panel">
                <div className="login-card animate-fade-up">
                    <div className="login-card-header">
                        <h2>ورود به حساب</h2>
                        <p>برای ادامه، وارد شوید یا حساب جدید بسازید.</p>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-input">ایمیل یا شماره موبایل</label>
                        <input
                            id="login-input"
                            type="text"
                            value={loginInput}
                            onChange={(e) => setLoginInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="مثال: ۰۹۱۲xxxxxxx"
                            autoComplete="username"
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password-input">رمز عبور</label>
                        <input
                            id="password-input"
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="رمز عبور خود را وارد کنید"
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="login-actions">
                        <button type="button" className="login-btn login-btn-primary" onClick={handleLogin}>
                            ورود
                        </button>
                        <button type="button" className="login-btn login-btn-secondary" onClick={handleSignup}>
                            ثبت‌نام
                        </button>
                    </div>

                    {loginMessage && (
                        <p className={`login-message ${messageType}`}>{loginMessage}</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
