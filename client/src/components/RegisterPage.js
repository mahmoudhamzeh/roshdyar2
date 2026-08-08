import React, { useEffect, useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import Modal from 'react-modal';
import BrandLogo from './BrandLogo';
import './LoginPage.css';
import './RegisterPage.css';

const OTP_TTL_SEC = 5 * 60;
const API_BASE = 'http://localhost:5000';

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

if (typeof document !== 'undefined') {
    Modal.setAppElement('#root');
}

const RegisterPage = () => {
    const history = useHistory();
    const [step, setStep] = useState('phone'); // phone | otp
    const [phoneInput, setPhoneInput] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('error');
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [showWelcome, setShowWelcome] = useState(false);
    const [devHint, setDevHint] = useState('');
    const expiresAtRef = useRef(null);

    useEffect(() => {
        if (step !== 'otp' || !expiresAtRef.current) return undefined;

        const tick = () => {
            const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
            setSecondsLeft(left);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [step]);

    const showError = (text) => {
        setMessageType('error');
        setMessage(text);
    };

    const showSuccess = (text) => {
        setMessageType('success');
        setMessage(text);
    };

    const handleSendOtp = async () => {
        const phone = normalizePhone(phoneInput);
        if (!isValidIranMobile(phone)) {
            showError('شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx');
            return;
        }

        setLoading(true);
        setMessage('');
        setDevHint('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();
            if (!response.ok) {
                showError(data.message || 'ارسال کد ناموفق بود.');
                return;
            }

            setPhoneInput(phone);
            expiresAtRef.current = data.expiresAt
                ? new Date(data.expiresAt).getTime()
                : Date.now() + (data.expiresInSec || OTP_TTL_SEC) * 1000;
            setSecondsLeft(data.expiresInSec || OTP_TTL_SEC);
            setOtpInput('');
            setStep('otp');
            showSuccess('کد تأیید ارسال شد.');
            if (data.devOtp) {
                setDevHint(`کد آزمایشی: ${data.devOtp}`);
            }
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
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
        setMessage('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await response.json();
            if (!response.ok) {
                showError(data.message || 'اعتبارسنجی کد ناموفق بود.');
                return;
            }

            localStorage.setItem('loggedInUser', JSON.stringify(data.user));
            setShowWelcome(true);
        } catch (error) {
            showError('خطا در ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    const goToCompleteProfile = () => {
        setShowWelcome(false);
        history.push('/profile?complete=1');
    };

    const handleKeyDown = (e, action) => {
        if (e.key === 'Enter') action();
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
                    <h1 className="animate-fade-up-delay">ثبت‌نام سریع با موبایل</h1>
                    <p className="animate-fade-up-delay-2">
                        شماره را وارد کنید، کد تأیید بگیرید و پروفایل کودک‌تان را بسازید.
                    </p>
                </div>
            </section>

            <section className="login-panel">
                <div className="login-card animate-fade-up">
                    <div className="login-card-header">
                        <h2>{step === 'phone' ? 'ثبت‌نام' : 'کد تأیید'}</h2>
                        <p>
                            {step === 'phone'
                                ? 'شماره موبایل خود را وارد کنید تا کد تأیید برایتان ارسال شود.'
                                : `کد ۵ رقمی ارسال‌شده به ${phoneInput} را وارد کنید.`}
                        </p>
                    </div>

                    {step === 'phone' ? (
                        <>
                            <div className="login-field">
                                <label htmlFor="register-phone">شماره موبایل</label>
                                <input
                                    id="register-phone"
                                    type="tel"
                                    inputMode="numeric"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, handleSendOtp)}
                                    placeholder="۰۹۱۲xxxxxxx"
                                    autoComplete="tel"
                                    disabled={loading}
                                />
                            </div>

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                >
                                    {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
                                </button>
                                <Link to="/login" className="login-btn login-btn-secondary register-link-btn">
                                    بازگشت به ورود
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="login-field">
                                <label htmlFor="register-otp">کد تأیید</label>
                                <input
                                    id="register-otp"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
                                    onKeyDown={(e) => handleKeyDown(e, handleVerifyOtp)}
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

                            {devHint && <p className="otp-dev-hint">{devHint}</p>}

                            <div className="login-actions">
                                <button
                                    type="button"
                                    className="login-btn login-btn-primary"
                                    onClick={handleVerifyOtp}
                                    disabled={loading || secondsLeft <= 0}
                                >
                                    {loading ? 'در حال بررسی...' : 'تأیید و ثبت‌نام'}
                                </button>
                                <button
                                    type="button"
                                    className="login-btn login-btn-secondary"
                                    onClick={handleSendOtp}
                                    disabled={loading || (secondsLeft > OTP_TTL_SEC - 60 && secondsLeft > 0)}
                                >
                                    ارسال مجدد کد
                                </button>
                                <button
                                    type="button"
                                    className="register-text-btn"
                                    onClick={() => {
                                        setStep('phone');
                                        setOtpInput('');
                                        setMessage('');
                                        setDevHint('');
                                        expiresAtRef.current = null;
                                    }}
                                    disabled={loading}
                                >
                                    تغییر شماره موبایل
                                </button>
                            </div>
                        </>
                    )}

                    {message && <p className={`login-message ${messageType}`}>{message}</p>}
                </div>
            </section>

            <Modal
                isOpen={showWelcome}
                onRequestClose={goToCompleteProfile}
                className="welcome-modal"
                overlayClassName="welcome-modal-overlay"
                contentLabel="خوش‌آمدگویی"
            >
                <div className="welcome-modal-body">
                    <BrandLogo className="welcome-modal-logo" size={56} alt="" />
                    <h2>به تات کیدز خوش آمدید</h2>
                    <p>حساب شما ساخته شد. برای شروع بهتر، پروفایل کاربری‌تان را تکمیل کنید.</p>
                    <button type="button" className="login-btn login-btn-primary" onClick={goToCompleteProfile}>
                        تکمیل پروفایل کاربری
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default RegisterPage;
