import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Reminders from './Reminders';
import './MainNavbar.css';

const BrandIcon = () => (
    <svg className="navbar-brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="16" cy="16" r="15" stroke="rgba(255,255,255,0.55)" strokeWidth="1.25" fill="rgba(255,255,255,0.1)" />
        <path d="M9 21c1.8-5 4.4-8.5 7-10.5 2.6 2 5.2 5.5 7 10.5" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="9.5" r="2" fill="#FDE68A" />
    </svg>
);

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

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <Link to="/dashboard">
                            <BrandIcon />
                            <span>رشدیار</span>
                        </Link>
                    </div>
                </div>

                <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
                    <div className="navbar-links">
                        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>داشبورد</Link>
                        <Link to="/news" onClick={() => setIsMenuOpen(false)}>مجله سلامت</Link>
                        <Link to="/shop" onClick={() => setIsMenuOpen(false)}>فروشگاه</Link>
                        <Link to="/my-children" onClick={() => setIsMenuOpen(false)}>فرزندان من</Link>
                        {isAdmin && (
                            <Link to="/admin" className="admin-link" onClick={() => setIsMenuOpen(false)}>
                                پنل مدیریت
                            </Link>
                        )}
                        <Link
                            to="/profile"
                            className="btn btn-profile mobile-only-profile"
                            onClick={() => setIsMenuOpen(false)}
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
                        onClick={toggleMenu}
                        aria-label="منو"
                        aria-expanded={isMenuOpen}
                    >
                        &#9776;
                    </button>
                </div>
            </nav>
            {isMenuOpen && <div className="menu-backdrop" onClick={toggleMenu} />}
        </>
    );
};

export default MainNavbar;
