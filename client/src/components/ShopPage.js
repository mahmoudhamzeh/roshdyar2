import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faStore } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import ShopProductCard from './ShopProductCard';
import { AGE_BANDS, SORT_OPTIONS, ageBandFromBirthDate, flattenCategories } from '../utils/shop';
import './ShopPage.css';
import './ShopWorld.css';

const API = '';

const ShopPage = () => {
    const history = useHistory();
    const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const category = params.get('category') || 'همه';
    const skill = params.get('skill') || '';
    const age = params.get('age') || '';
    const sort = params.get('sort') || 'newest';
    const query = params.get('q') || '';

    const [products, setProducts] = useState([]);
    const [home, setHome] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(query);
    const [childBands, setChildBands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [skills, setSkills] = useState([]);

    const hasFilters = category !== 'همه' || Boolean(skill || age || query);

    const setParam = (key, value) => {
        const next = new URLSearchParams(location.search);
        if (!value || value === 'همه') next.delete(key);
        else next.set(key, value);
        history.replace(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
    };

    useEffect(() => {
        setSearch(query);
    }, [query]);

    useEffect(() => {
        fetch(`${API}/api/shop/home`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!data) return;
                setHome(data);
                setCategories(data.categories || []);
                setSkills(data.skills || []);
            })
            .catch(() => {});
        fetch('/api/children')
            .then((res) => (res.ok ? res.json() : []))
            .then((kids) => {
                const bands = new Set();
                (Array.isArray(kids) ? kids : []).forEach((child) => {
                    const band = ageBandFromBirthDate(child.birthDate);
                    if (band) bands.add(band.id);
                });
                setChildBands([...bands]);
            })
            .catch(() => setChildBands([]));
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError('');
            try {
                const qs = new URLSearchParams();
                if (category && category !== 'همه') qs.set('category', category);
                if (query) qs.set('q', query);
                if (skill) qs.set('skill', skill);
                if (age) qs.set('age', age);
                if (sort) qs.set('sort', sort);
                const res = await fetch(`${API}/api/shop/products?${qs.toString()}`);
                if (!res.ok) throw new Error('خطا در دریافت محصولات');
                setProducts(await res.json());
            } catch (err) {
                setError(err.message || 'خطا در دریافت محصولات');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [category, query, skill, age, sort]);

    const categoryNames = useMemo(() => {
        const names = ['همه'];
        flattenCategories(categories).forEach((node) => {
            if (node.name && !names.includes(node.name)) names.push(node.name);
        });
        return names;
    }, [categories]);

    const forYourChild = useMemo(() => {
        if (!childBands.length) return [];
        return (home?.newest || home?.bestsellers || []).filter((p) => childBands.includes(p.ageBand));
    }, [childBands, home]);

    const handleSearch = (e) => {
        e.preventDefault();
        setParam('q', search.trim());
    };

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <header className="shop-hero animate-fade-up">
                    <div className="shop-hero-copy">
                        <p className="shop-brand">دنیای فروشگاه تات کیدز</p>
                        <h1>خرید هوشمند برای رشد کودک</h1>
                        <p className="shop-hero-text">
                            انتخاب بر اساس رده سنی و مهارت‌های رشدی — از اسباب‌بازی تا کتاب و تغذیه
                        </p>
                        <div className="shop-hero-actions">
                            <Link to="/shop/categories" className="shop-btn shop-btn-primary">دسته‌بندی‌ها</Link>
                            <Link to="/shop/skills" className="shop-btn shop-btn-ghost">خرید بر اساس مهارت</Link>
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
                    <div className="shop-toolbar-row">
                        <div className="shop-categories" role="tablist" aria-label="دسته‌بندی‌ها">
                            {categoryNames.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    role="tab"
                                    aria-selected={category === cat}
                                    className={`shop-cat-btn ${category === cat ? 'active' : ''}`}
                                    onClick={() => setParam('category', cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <select
                            className="shop-sort"
                            value={sort}
                            onChange={(e) => setParam('sort', e.target.value)}
                            aria-label="مرتب‌سازی"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="shop-chip-row" aria-label="رده سنی">
                        {AGE_BANDS.map((band) => (
                            <button
                                key={band.id}
                                type="button"
                                className={`shop-chip ${age === band.id ? 'is-active' : ''}`}
                                onClick={() => setParam('age', age === band.id ? '' : band.id)}
                            >
                                {band.label}
                            </button>
                        ))}
                    </div>
                    <div className="shop-chip-row" aria-label="مهارت">
                        {skills.map((item) => (
                            <button
                                key={item.slug}
                                type="button"
                                className={`shop-chip ${skill === item.slug ? 'is-active' : ''}`}
                                onClick={() => setParam('skill', skill === item.slug ? '' : item.slug)}
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>
                </section>

                {loading && <p className="shop-status">در حال بارگذاری محصولات...</p>}
                {error && <p className="shop-status shop-error">{error}</p>}

                {!hasFilters && !loading && !error && home && (
                    <>
                        {forYourChild.length > 0 && (
                            <section>
                                <div className="shop-section-title">
                                    <h2>مناسب برای کودک شما</h2>
                                </div>
                                <div className="shop-grid">
                                    {forYourChild.slice(0, 4).map((product, index) => (
                                        <ShopProductCard key={`kid-${product.id}`} product={product} index={index} />
                                    ))}
                                </div>
                            </section>
                        )}
                        {home.onSale?.length > 0 && (
                            <section>
                                <div className="shop-section-title">
                                    <h2>تخفیف‌های ویژه</h2>
                                </div>
                                <div className="shop-grid">
                                    {home.onSale.map((product, index) => (
                                        <ShopProductCard key={`sale-${product.id}`} product={product} index={index} />
                                    ))}
                                </div>
                            </section>
                        )}
                        {home.bestsellers?.length > 0 && (
                            <section>
                                <div className="shop-section-title">
                                    <h2>پرفروش‌ها</h2>
                                    <button type="button" className="shop-chip" onClick={() => setParam('sort', 'popular')}>
                                        مشاهده همه
                                    </button>
                                </div>
                                <div className="shop-grid">
                                    {home.bestsellers.slice(0, 4).map((product, index) => (
                                        <ShopProductCard key={`best-${product.id}`} product={product} index={index} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {!loading && !error && products.length === 0 && (
                    <p className="shop-status">محصولی در این فیلتر یافت نشد.</p>
                )}

                {!loading && !error && products.length > 0 && (
                    <section>
                        <div className="shop-section-title">
                            <h2>{hasFilters ? 'نتایج' : 'جدیدترین‌ها'}</h2>
                        </div>
                        <div className="shop-grid">
                            {products.map((product, index) => (
                                <ShopProductCard key={product.id} product={product} index={index} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ShopPage;
