import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import './ShopPage.css';
import './ShopWorld.css';

const ShopSkillsPage = () => {
    const [skills, setSkills] = useState([]);

    useEffect(() => {
        fetch('/api/shop/skills')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setSkills(Array.isArray(data) ? data : []))
            .catch(() => setSkills([]));
    }, []);

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <header className="shop-hero animate-fade-up">
                    <div className="shop-hero-copy">
                        <p className="shop-brand">خرید بر اساس مهارت</p>
                        <h1>هدف رشدی کودک را انتخاب کنید</h1>
                        <p className="shop-hero-text">
                            هر محصول به مهارت‌های حرکتی، گفتاری، شناختی، خلاقیت یا هیجانی-اجتماعی وصل است.
                        </p>
                    </div>
                    <div className="shop-hero-visual" aria-hidden="true">
                        <FontAwesomeIcon icon={faBrain} />
                    </div>
                </header>
                <div className="shop-world-grid">
                    {skills.map((skill) => (
                        <Link key={skill.slug} to={`/shop?skill=${encodeURIComponent(skill.slug)}`} className="shop-skill-card">
                            <h2>{skill.title}</h2>
                            <p>{skill.description}</p>
                        </Link>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ShopSkillsPage;
