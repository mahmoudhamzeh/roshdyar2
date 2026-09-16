import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './NewsHeader.css';

const NewsHeader = ({ categories }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [tree, setTree] = useState(categories || []);

    const closeMenu = () => setIsMenuOpen(false);
    const toggleMenu = () => setIsMenuOpen((open) => !open);

    useEffect(() => {
        if (categories && categories.length) {
            setTree(categories);
            return undefined;
        }
        let cancelled = false;
        fetch('/api/magazine/categories')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                if (!cancelled) setTree(Array.isArray(data) ? data : []);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [categories]);

    useEffect(() => {
        document.body.classList.toggle('nav-drawer-open', isMenuOpen);
        return () => document.body.classList.remove('nav-drawer-open');
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
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

    const categoryLinks = [
        <Link key="all" to="/news" onClick={closeMenu}>همه</Link>,
        <Link key="news" to="/news?type=news" onClick={closeMenu}>اخبار</Link>,
        ...tree.map((category) => (
            <Link
                key={category.id}
                to={`/news/category/${category.slug}`}
                onClick={closeMenu}
            >
                {category.name}
            </Link>
        )),
    ];

    return (
        <>
            <nav className="news-navbar">
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <Link to="/news" onClick={closeMenu}>مجله سلامت تات کیدز</Link>
                    </div>
                </div>
                <div className="navbar-center">
                    <div className="navbar-links">
                        {categoryLinks}
                    </div>
                </div>
                <div className="navbar-right">
                    {!isLoggedIn && (
                        <Link to="/register" className="news-login-cta news-login-cta--desktop">ورود</Link>
                    )}
                    {isLoggedIn && (
                        <Link to="/dashboard" className="news-login-cta news-login-cta--desktop">داشبورد</Link>
                    )}
                    <button
                        className="navbar-toggler"
                        type="button"
                        onClick={toggleMenu}
                        aria-label={isMenuOpen ? 'بستن منو' : 'باز کردن منو'}
                        aria-expanded={isMenuOpen}
                        aria-controls="news-mobile-drawer"
                    >
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </nav>
            <aside
                id="news-mobile-drawer"
                className={`news-drawer ${isMenuOpen ? 'is-open' : ''}`}
                aria-hidden={!isMenuOpen}
                aria-label="دسته‌های مجله"
            >
                <div className="news-drawer-head">
                    <strong>مجله سلامت</strong>
                    <button
                        type="button"
                        className="news-drawer-close"
                        onClick={closeMenu}
                        aria-label="بستن منو"
                    >
                        ✕
                    </button>
                </div>
                <nav className="news-drawer-nav">
                    <p className="news-drawer-label">دسته‌ها</p>
                    {categoryLinks}
                    <p className="news-drawer-label">حساب</p>
                    {isLoggedIn ? (
                        <Link to="/dashboard" onClick={closeMenu}>داشبورد</Link>
                    ) : (
                        <Link to="/register" onClick={closeMenu}>ورود / ثبت‌نام</Link>
                    )}
                </nav>
            </aside>
            {isMenuOpen && <div className="menu-backdrop" onClick={closeMenu} />}
        </>
    );
};

export default NewsHeader;
