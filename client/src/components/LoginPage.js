import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';

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
            const response = await fetch('/api/login', {
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

    const handleSignup = () => {
        history.push('/register');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="login-page">
            <section className="login-hero" aria-label="معرفی تات کیدز">
                <div className="login-hero-content">
                    <div className="login-brand-mark animate-fade-up">
                        <BrandLogo className="login-brand-logo" size={64} alt="" />
                        <div className="brand-name-wrap">
                            <p className="brand-name">تات کیدز</p>
                            <p className="brand-name-en">TatKids</p>
                        </div>
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
                        <h2>ورود با رمز عبور</h2>
                        <p>برای ورود والدین، از ورود پیامکی استفاده کنید. این صفحه برای مدیران است.</p>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-input">نام کاربری</label>
                        <input
                            id="login-input"
                            type="text"
                            value={loginInput}
                            onChange={(e) => setLoginInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="مثال: Amin"
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
                            ورود / ثبت‌نام با پیامک
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
