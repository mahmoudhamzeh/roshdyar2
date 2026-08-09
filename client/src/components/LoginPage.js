import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './LoginPage.css';
import './RegisterPage.css';

const OTP_TTL_SEC = 5 * 60;
const OTP_RESEND_COOLDOWN_SEC = 60;
const API_BASE = '';

const toEnglishDigits = (value) =>
    String(value || '')
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

const normalizePhone = (phone) => {
    let p = toEnglishDigits(phone).replace(/[\s\-_().]/g, '');
    if (p.startsWith('+98')) p = `0${p.slice(3)}`;
    else if (p.startsWith('0098')) p = `0${p.slice(4)}`;
    else if (p.startsWith('98') && p.length === 12) p = `0${p.slice(2)}`;
    return p;
};

const isValidIranMobile = (phone) => /^09\d{9}$/.test(phone);

const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const LoginPage = () => {
    const history = useHistory();
    const [mode, setMode] = useState('login'); // login | forgot-phone | forgot-otp | forgot-password
    const [loginInput, setLoginInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loginMessage, setLoginMessage] = useState('');
    const [messageType, setMessageType] = useState('error');
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [devHint, setDevHint] = useState('');
    const expiresAtRef = useRef(null);
    const resendUntilRef = useRef(null);
    const sendingRef = useRef(false);

    useEffect(() => {
        if (mode !== 'forgot-otp' && mode !== 'forgot-password') return undefined;
        if (!expiresAtRef.current) return undefined;

        const tick = () => {
            const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
            setSecondsLeft(left);
            if (resendUntilRef.current) {
                setResendCooldown(Math.max(0, Math.ceil((resendUntilRef.current - Date.now()) / 1000)));
            }
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [mode]);

    const showError = (text) => {
        setMessageType('error');
        setLoginMessage(text);
    };

    const showSuccess = (text) => {
        setMessageType('success');
        setLoginMessage(text);
    };

    const handleLogin = async () => {
        if (!loginInput || !passwordInput) {
            showError('لطفاً فیلدها را پر کنید.');
            return;
        }
        setLoading(true);
        setLoginMessage('');
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
                showError(data.message || 'اطلاعات ورود نادرست است.');
            }
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    const enterForgotOtpStep = (phone, data, { alreadySent = false } = {}) => {
        setPhoneInput(phone);
        expiresAtRef.current = data.expiresAt
            ? new Date(data.expiresAt).getTime()
            : Date.now() + (data.expiresInSec || OTP_TTL_SEC) * 1000;
        setSecondsLeft(
            data.expiresInSec != null
                ? data.expiresInSec
                : Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000))
        );
        const cooldownSec = data.retryAfterSec != null ? data.retryAfterSec : OTP_RESEND_COOLDOWN_SEC;
        resendUntilRef.current = Date.now() + cooldownSec * 1000;
        setResendCooldown(cooldownSec);
        setOtpInput('');
        setMode('forgot-otp');
        if (alreadySent) {
            showError(data.message || 'کد قبلاً ارسال شده است. همان کد را وارد کنید.');
        } else {
            showSuccess('کد تأیید ارسال شد.');
        }
        if (data.devOtp) {
            setDevHint(`کد آزمایشی: ${data.devOtp}`);
        }
    };

    const handleSendForgotOtp = async () => {
        const phone = normalizePhone(phoneInput);
        if (!isValidIranMobile(phone)) {
            showError('شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx');
            return;
        }
        if (sendingRef.current) return;

        sendingRef.current = true;
        setLoading(true);
        setLoginMessage('');
        setDevHint('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();

            if (response.status === 429 && (data.codeAlreadySent || data.expiresAt || data.expiresInSec)) {
                enterForgotOtpStep(phone, data, { alreadySent: true });
                return;
            }

            if (!response.ok) {
                showError(data.message || 'ارسال کد ناموفق بود.');
                return;
            }

            enterForgotOtpStep(phone, data);
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            sendingRef.current = false;
            setLoading(false);
        }
    };

    const handleVerifyForgotOtp = async () => {
        const phone = normalizePhone(phoneInput);
        const code = toEnglishDigits(otpInput).replace(/\D/g, '');
        if (secondsLeft <= 0) {
            showError('کد تأیید منقضی شده است. دوباره درخواست کنید.');
            return;
        }
        if (!/^\d{5}$/.test(code)) {
            showError('کد تأیید باید ۵ رقم باشد.');
            return;
        }

        setLoading(true);
        setLoginMessage('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await response.json();
            if (!response.ok) {
                showError(data.message || 'اعتبارسنجی کد ناموفق بود.');
                return;
            }

            setOtpInput(code);
            if (data.expiresAt) {
                expiresAtRef.current = new Date(data.expiresAt).getTime();
                setSecondsLeft(
                    data.expiresInSec != null
                        ? data.expiresInSec
                        : Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000))
                );
            }
            setMode('forgot-password');
            showSuccess('کد پذیرفته شد. رمز عبور جدید را وارد کنید.');
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const phone = normalizePhone(phoneInput);
        const code = toEnglishDigits(otpInput).replace(/\D/g, '');

        if (secondsLeft <= 0) {
            showError('کد تأیید منقضی شده است. دوباره از ابتدا درخواست کنید.');
            setMode('forgot-phone');
            return;
        }
        if (!/^\d{5}$/.test(code)) {
            showError('کد تأیید باید ۵ رقم باشد.');
            setMode('forgot-otp');
            return;
        }
        if (!newPassword || newPassword.length < 4) {
            showError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showError('رمز عبور و تکرار آن یکسان نیستند.');
            return;
        }

        setLoading(true);
        setLoginMessage('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code, newPassword }),
            });
            const data = await response.json();
            if (!response.ok) {
                showError(data.message || 'ثبت رمز عبور ناموفق بود.');
                if (response.status === 401 || response.status === 410 || response.status === 400) {
                    setMode('forgot-otp');
                }
                return;
            }

            setLoginInput(phone);
            setPasswordInput('');
            setNewPassword('');
            setConfirmPassword('');
            setOtpInput('');
            setDevHint('');
            setMode('login');
            showSuccess(data.message || 'رمز عبور ثبت شد. اکنون وارد شوید.');
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    const resetForgotFlow = () => {
        setMode('login');
        setPhoneInput('');
        setOtpInput('');
        setNewPassword('');
        setConfirmPassword('');
        setDevHint('');
        setSecondsLeft(0);
        setResendCooldown(0);
        setLoginMessage('');
        expiresAtRef.current = null;
        resendUntilRef.current = null;
    };

    const handleKeyDown = (e, action) => {
        if (e.key === 'Enter') action();
    };

    const titleByMode = {
        login: 'ورود با رمز عبور',
        'forgot-phone': 'فراموشی / تنظیم رمز عبور',
        'forgot-otp': 'کد تأیید',
        'forgot-password': 'ثبت رمز عبور جدید',
    };

    const subtitleByMode = {
        login: 'اگر قبلاً رمز عبور ثبت کرده‌اید وارد شوید؛ در غیر این صورت از ورود پیامکی استفاده کنید.',
        'forgot-phone': 'شماره‌ای که با آن ثبت‌نام کرده‌اید را وارد کنید تا کد تأیید برایتان ارسال شود.',
        'forgot-otp': `کد ۵ رقمی ارسال‌شده به ${phoneInput} را وارد کنید.`,
        'forgot-password': 'رمز عبور جدید را برای حساب خود تعیین کنید.',
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
                        <h2>{titleByMode[mode]}</h2>
                        <p>{subtitleByMode[mode]}</p>
                    </div>

                    {mode === 'login' && (
                        <>
                            <div className="login-field">
                                <label htmlFor="login-input">نام کاربری یا موبایل</label>
                                <input
                                    id="login-input"
                                    type="text"
                                    value={loginInput}
                                    onChange={(e) => setLoginInput(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                                    placeholder="مثال: ۰۹۱۲xxxxxxx"
                                    autoComplete="username"
                                    disabled={loading}
                                />
                            </div>

                            <div className="login-field">
                                <label htmlFor="password-input">رمز عبور</label>
                                <input
                                    id="password-input"
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                                    placeholder="رمز عبور خود را وارد کنید"
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? 'در حال ورود...' : 'ورود'}
                                </button>
                                <button
                                    type="button"
                                    className="login-btn login-btn-secondary"
                                    onClick={() => history.push('/register')}
                                    disabled={loading}
                                >
                                    ورود / ثبت‌نام با پیامک
                                </button>
                                <button
                                    type="button"
                                    className="register-text-btn"
                                    onClick={() => {
                                        setMode('forgot-phone');
                                        setLoginMessage('');
                                        setDevHint('');
                                    }}
                                    disabled={loading}
                                >
                                    فراموشی رمز عبور / تنظیم رمز
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'forgot-phone' && (
                        <>
                            <div className="login-field">
                                <label htmlFor="forgot-phone">شماره موبایل</label>
                                <input
                                    id="forgot-phone"
                                    type="tel"
                                    inputMode="numeric"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleSendForgotOtp)}
                                    placeholder="۰۹۱۲xxxxxxx"
                                    autoComplete="tel"
                                    disabled={loading}
                                />
                            </div>

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleSendForgotOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
                                </button>
                                <button
                                    type="button"
                                    className="register-text-btn"
                                    onClick={resetForgotFlow}
                                    disabled={loading}
                                >
                                    بازگشت به ورود
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'forgot-otp' && (
                        <>
                            <div className="login-field">
                                <label htmlFor="forgot-otp">کد تأیید</label>
                                <input
                                    id="forgot-otp"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    value={otpInput}
                                    onChange={(e) =>
                                        setOtpInput(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 5))
                                    }
                                    onKeyDown={(e) => handleKeyDown(e, handleVerifyForgotOtp)}
                                    placeholder="•••••"
                                    autoComplete="one-time-code"
                                    className="otp-input"
                                    disabled={loading}
                                />
                            </div>

                            <div className={`otp-timer${secondsLeft <= 0 ? ' is-expired' : ''}`} aria-live="polite">
                                {secondsLeft > 0 ? (
                                    <>
                                        <span className="otp-timer-label">اعتبار کد</span>
                                        <span className="otp-timer-value">{formatTimer(secondsLeft)}</span>
                                    </>
                                ) : (
                                    <span className="otp-timer-label">کد منقضی شد</span>
                                )}
                            </div>

                            {resendCooldown > 0 && (
                                <p className="otp-resend-hint">ارسال مجدد تا {resendCooldown} ثانیه دیگر</p>
                            )}
                            {devHint && <p className="otp-dev-hint">{devHint}</p>}

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleVerifyForgotOtp}
                                    disabled={loading || secondsLeft <= 0}
                                >
                                    ادامه
                                </button>
                                <button
                                    type="button"
                                    className="login-btn login-btn-secondary"
                                    onClick={handleSendForgotOtp}
                                    disabled={loading || resendCooldown > 0}
                                >
                                    {resendCooldown > 0 ? `ارسال مجدد (${resendCooldown})` : 'ارسال مجدد کد'}
                                </button>
                                <button
                                    type="button"
                                    className="register-text-btn"
                                    onClick={() => {
                                        setMode('forgot-phone');
                                        setOtpInput('');
                                        setLoginMessage('');
                                        setDevHint('');
                                    }}
                                    disabled={loading}
                                >
                                    تغییر شماره موبایل
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'forgot-password' && (
                        <>
                            <div className="login-field">
                                <label htmlFor="new-password">رمز عبور جدید</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
                                    placeholder="حداقل ۴ کاراکتر"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>
                            <div className="login-field">
                                <label htmlFor="confirm-password">تکرار رمز عبور</label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
                                    placeholder="تکرار رمز عبور"
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                            </div>

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleResetPassword}
                                    disabled={loading || secondsLeft <= 0}
                                >
                                    {loading ? 'در حال ثبت...' : 'ثبت رمز عبور'}
                                </button>
                                <button
                                    type="button"
                                    className="register-text-btn"
                                    onClick={() => {
                                        setMode('forgot-otp');
                                        setLoginMessage('');
                                    }}
                                    disabled={loading}
                                >
                                    بازگشت به کد تأیید
                                </button>
                            </div>
                        </>
                    )}

                    {loginMessage && (
                        <p className={`login-message ${messageType}`}>{loginMessage}</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LoginPage;
