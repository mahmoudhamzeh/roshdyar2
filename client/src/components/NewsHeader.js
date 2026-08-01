import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './NewsHeader.css';

const NewsHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <nav className="news-navbar">
                <div className="navbar-left">
                    <div className="navbar-brand">
                        <Link to="/news">مجله سلامت رشدیار</Link>
                    </div>
                </div>

                <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
                    <div className="navbar-links">
                        <Link to={{ pathname: "/news", state: { category: 'همه' } }} onClick={() => setIsMenuOpen(false)}>همه</Link>
                        <Link to={{ pathname: "/news", state: { category: 'بیماری' } }} onClick={() => setIsMenuOpen(false)}>بیماری</Link>
                        <Link to={{ pathname: "/news", state: { category: 'آموزشی' } }} onClick={() => setIsMenuOpen(false)}>آموزش</Link>
                        <Link to={{ pathname: "/news", state: { category: 'تغذیه' } }} onClick={() => setIsMenuOpen(false)}>تغذیه</Link>
                        <Link to={{ pathname: "/news", state: { category: 'مادر و کودک' } }} onClick={() => setIsMenuOpen(false)}>مادر و کودک</Link>
                        <Link to={{ pathname: "/news", state: { category: 'تربیتی' } }} onClick={() => setIsMenuOpen(false)}>تربیتی</Link>
                    </div>
                </div>

                <div className="navbar-right">
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

export default NewsHeader;
