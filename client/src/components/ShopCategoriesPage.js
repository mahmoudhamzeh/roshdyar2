import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import './ShopPage.css';
import './ShopWorld.css';

const ShopCategoriesPage = () => {
    const [tree, setTree] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/shop/categories')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setTree(Array.isArray(data) ? data : []))
            .catch(() => setError('بارگذاری دسته‌ها ناموفق بود'));
    }, []);

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <header className="shop-hero animate-fade-up">
                    <div className="shop-hero-copy">
                        <p className="shop-brand">دسته‌بندی فروشگاه</p>
                        <h1>گروه و زیرگروه کالاها</h1>
                        <p className="shop-hero-text">از دسته اصلی تا زیرگروه‌ها، مسیر خرید را کوتاه کنید.</p>
                    </div>
                    <div className="shop-hero-visual" aria-hidden="true">
                        <FontAwesomeIcon icon={faLayerGroup} />
                    </div>
                </header>
                {error && <p className="shop-status shop-error">{error}</p>}
                <div className="shop-world-grid">
                    {tree.map((group) => (
                        <article key={group.id || group.name} className="shop-cat-card">
                            <Link to={`/shop?category=${encodeURIComponent(group.name)}`}>
                                <h2>{group.name}</h2>
                            </Link>
                            {(group.children || []).length > 0 && (
                                <div className="shop-subcats">
                                    {group.children.map((child) => (
                                        <Link
                                            key={child.id || child.name}
                                            to={`/shop?category=${encodeURIComponent(child.name)}`}
                                            className="shop-chip"
                                        >
                                            {child.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ShopCategoriesPage;
