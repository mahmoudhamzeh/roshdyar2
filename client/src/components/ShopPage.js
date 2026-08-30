import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag, faSearch, faStore } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { formatPrice, getCartCount } from '../utils/cart';
import './ShopPage.css';

const API = '';

const ShopPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('همه');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [cartCount, setCartCount] = useState(getCartCount());
    const [categories, setCategories] = useState(['همه']);

    useEffect(() => {
        const onCartUpdate = () => setCartCount(getCartCount());
        window.addEventListener('cart-updated', onCartUpdate);
        window.addEventListener('storage', onCartUpdate);
        return () => {
            window.removeEventListener('cart-updated', onCartUpdate);
            window.removeEventListener('storage', onCartUpdate);
        };
    }, []);

    useEffect(() => {
        fetch('/api/shop/categories')
            .then((res) => (res.ok ? res.json() : []))
            .then((tree) => {
                const names = ['همه'];
                (Array.isArray(tree) ? tree : []).forEach((group) => {
                    if (group.name) names.push(group.name);
                    (group.children || []).forEach((child) => names.push(child.name));
                });
                setCategories(names);
            })
            .catch(() => setCategories(['همه']));
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams();
                if (category && category !== 'همه') params.set('category', category);
                if (query) params.set('q', query);
                const res = await fetch(`${API}/api/shop/products?${params.toString()}`);
                if (!res.ok) throw new Error('خطا در دریافت محصولات');
                const data = await res.json();
                setProducts(data);
            } catch (err) {
                setError(err.message || 'خطا در دریافت محصولات');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [category, query]);

    const handleSearch = (e) => {
        e.preventDefault();
        setQuery(search.trim());
    };

    return (
        <div className="shop-page">
            <MainNavbar />
            <main className="shop-main">
                <header className="shop-hero animate-fade-up">
                    <div className="shop-hero-copy">
                        <p className="shop-brand">فروشگاه تات کیدز</p>
                        <h1>فروشگاه مادر و کودک</h1>
                        <p className="shop-hero-text">
                            محصولات منتخب تغذیه، بازی، بهداشت و آموزش برای رشد سالم کودک شما
                        </p>
                        <div className="shop-hero-actions">
                            <Link to="/cart" className="shop-btn shop-btn-primary">
                                <FontAwesomeIcon icon={faShoppingBag} />
                                سبد خرید
                                {cartCount > 0 && <span className="shop-cart-badge">{cartCount}</span>}
                            </Link>
                            <Link to="/orders" className="shop-btn shop-btn-ghost">سفارش‌های من</Link>
                        </div>
                    </div>
                    <div className="shop-hero-visual" aria-hidden="true">
                        <FontAwesomeIcon icon={faStore} />
                    </div>
                </header>

                <section className="shop-toolbar animate-fade-up">
                    <form className="shop-search" onSubmit={handleSearch}>
                        <FontAwesomeIcon icon={faSearch} />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="جستجوی محصول..."
                            aria-label="جستجوی محصول"
                        />
                        <button type="submit">جستجو</button>
                    </form>
                    <div className="shop-categories" role="tablist" aria-label="دسته‌بندی‌ها">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                role="tab"
                                aria-selected={category === cat}
                                className={`shop-cat-btn ${category === cat ? 'active' : ''}`}
                                onClick={() => setCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </section>

                {loading && <p className="shop-status">در حال بارگذاری محصولات...</p>}
                {error && <p className="shop-status shop-error">{error}</p>}

                {!loading && !error && products.length === 0 && (
                    <p className="shop-status">محصولی در این دسته یافت نشد.</p>
                )}

                {!loading && !error && products.length > 0 && (
                    <section className="shop-grid">
                        {products.map((product, index) => (
                            <Link
                                key={product.id}
                                to={`/shop/${product.id}`}
                                className="shop-product animate-fade-up"
                                style={{ animationDelay: `${0.04 * index}s` }}
                            >
                                <div className="shop-product-image">
                                    {product.imageUrl ? (
                                        <img src={`${API}${product.imageUrl}`} alt={product.name} />
                                    ) : (
                                        <div className="shop-product-placeholder">
                                            <FontAwesomeIcon icon={faStore} />
                                        </div>
                                    )}
                                    <span className="shop-product-cat">{product.category}</span>
                                </div>
                                <div className="shop-product-body">
                                    <h2>{product.name}</h2>
                                    <p>{product.description}</p>
                                    <div className="shop-product-meta">
                                        <strong>{formatPrice(product.price)}</strong>
                                        <span className={product.stock > 0 ? 'in-stock' : 'out-stock'}>
                                            {product.stock > 0 ? `${product.stock} عدد` : 'ناموجود'}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ShopPage;
