import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NewsHeader.css';

const NewsHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);
    const toggleMenu = () => setIsMenuOpen((open) => !open);

    useEffect(() => {
        document.body.classList.toggle('nav-drawer-open', isMenuOpen);
        return () => document.body.classList.remove('nav-drawer-open');
    }, [isMenuOpen]);

    const isLoggedIn = (() => {
        try {
            const raw = localStorage.getItem('loggedInUser');
            if (!raw) return false;
            const user = JSON.parse(raw);
            return !!(user && user.id);
        } catch {
            return false;
        }
    })();

    return (
        <>
            <nav className={`news-navbar ${isMenuOpen ? 'menu-open' : ''}`}>
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <Link to="/news" onClick={closeMenu}>مجله سلامت تات کیدز</Link>
                    </div>
                </div>

                <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
                    <div className="navbar-links">
                        <Link to={{ pathname: "/news", state: { category: 'همه' } }} onClick={closeMenu}>همه</Link>
                        <Link to={{ pathname: "/news", state: { category: 'بیماری' } }} onClick={closeMenu}>بیماری</Link>
                        <Link to={{ pathname: "/news", state: { category: 'آموزشی' } }} onClick={closeMenu}>آموزش</Link>
                        <Link to={{ pathname: "/news", state: { category: 'تغذیه' } }} onClick={closeMenu}>تغذیه</Link>
                        <Link to={{ pathname: "/news", state: { category: 'مادر و کودک' } }} onClick={closeMenu}>مادر و کودک</Link>
                        <Link to={{ pathname: "/news", state: { category: 'تربیتی' } }} onClick={closeMenu}>تربیتی</Link>
                        {isLoggedIn ? (
                            <Link to="/dashboard" className="news-login-cta" onClick={closeMenu}>
                                داشبورد
                            </Link>
                        ) : (
                            <Link to="/register" className="news-login-cta" onClick={closeMenu}>
                                ورود / ثبت‌نام
                            </Link>
                        )}
                    </div>
                </div>

                <div className="navbar-right">
                    {!isLoggedIn && (
                        <Link to="/register" className="news-login-cta news-login-cta--desktop">
                            ورود
                        </Link>
                    )}
                    {isLoggedIn && (
                        <Link to="/dashboard" className="news-login-cta news-login-cta--desktop">
                            داشبورد
                        </Link>
                    )}
                    <button
                        className="navbar-toggler"
                        type="button"
                        onClick={toggleMenu}
                        aria-label="منو"
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </nav>
            {isMenuOpen && <div className="menu-backdrop" onClick={closeMenu} aria-hidden="true" />}
        </>
    );
};

export default NewsHeader;
