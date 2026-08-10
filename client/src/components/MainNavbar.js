import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Reminders from './Reminders';
import BrandLogo from './BrandLogo';
import './MainNavbar.css';

const MainNavbar = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        try {
            const loggedInUser = localStorage.getItem('loggedInUser');
            if (loggedInUser) {
                const user = JSON.parse(loggedInUser);
                if (user && user.isAdmin) {
                    setIsAdmin(true);
                }
            }
        } catch (error) {
            console.error("Error parsing user data from localStorage", error);
        }
    }, []);

    useEffect(() => {
        document.body.classList.toggle('nav-drawer-open', isMenuOpen);
        return () => document.body.classList.remove('nav-drawer-open');
    }, [isMenuOpen]);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <>
            <nav className={`navbar ${isMenuOpen ? 'menu-open' : ''}`}>
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <Link to="/dashboard" onClick={closeMenu}>
                            <BrandLogo className="navbar-brand-icon" size={34} alt="" />
                            <span className="navbar-brand-text">
                                <span className="navbar-brand-fa">تات کیدز</span>
                                <span className="navbar-brand-en">TatKids</span>
                            </span>
                        </Link>
                    </div>
                </div>

                <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
                    <div className="navbar-links">
                        <Link to="/dashboard" onClick={closeMenu}>داشبورد</Link>
                        <Link to="/news" onClick={closeMenu}>مجله سلامت</Link>
                        <Link to="/shop" onClick={closeMenu}>فروشگاه</Link>
                        {isAdmin && (
                            <Link to="/admin" className="admin-link" onClick={closeMenu}>
                                پنل مدیریت
                            </Link>
                        )}
                        <Link
                            to="/profile"
                            className="btn btn-profile mobile-only-profile"
                            onClick={closeMenu}
                        >
                            پروفایل من
                        </Link>
                    </div>
                </div>

                <div className="navbar-right">
                    <div className="navbar-profile">
                        <Reminders />
                        <Link to="/profile" className="btn btn-profile desktop-only-profile">پروفایل من</Link>
                    </div>
                    <button
                        className="navbar-toggler"
                        type="button"
                        onClick={() => setIsMenuOpen((open) => !open)}
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

export default MainNavbar;
