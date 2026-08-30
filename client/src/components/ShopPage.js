import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSliders } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import ShopProductCard from './ShopProductCard';
import ShopHeroSlider from './ShopHeroSlider';
import AmazingOffersRail from './AmazingOffersRail';
import ShopCategoryTiles from './ShopCategoryTiles';
import { AGE_BANDS, SORT_OPTIONS, ageBandFromBirthDate } from '../utils/shop';
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
    const [filtersOpen, setFiltersOpen] = useState(false);

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
            .then((data) => setHome(data))
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

    const forYourChild = useMemo(() => {
        if (!childBands.length) return [];
        return (home?.newest || home?.bestsellers || []).filter((p) => childBands.includes(p.ageBand));
    }, [childBands, home]);

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <ShopHeroSlider
                    banners={
                        (home?.banners || []).length
                            ? home.banners
                            : (home?.onSale || []).slice(0, 4).map((product) => ({
                                id: `sale-${product.id}`,
                                title: product.name,
                                subtitle: 'فروش ویژه — خرید مستقیم محصول',
                                imageUrl: product.imageUrl,
                                productId: product.id,
                                link: `/shop/${product.id}`
                            }))
                    }
                />

                <ShopCategoryTiles
                    tree={home?.categories || []}
                    selected={category}
                    onSelect={(name) => setParam('category', name)}
                />

                {!hasFilters && home?.onSale?.length > 0 && (
                    <AmazingOffersRail products={home.onSale} campaign={home.campaign} />
                )}

                <section className="shop-toolbar animate-fade-up">
                    <form
                        className="shop-search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setParam('q', search.trim());
                        }}
                    >
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
                        <button
                            type="button"
                            className="shop-filter-toggle"
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            <FontAwesomeIcon icon={faSliders} />
                            فیلتر سن و مهارت
                        </button>
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
                    {filtersOpen && (
                        <div className="shop-filter-panel">
                            <p>رده سنی</p>
                            <div className="shop-chip-row">
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
                            <p>مهارت رشدی</p>
                            <div className="shop-chip-row">
                                {(home?.skills || []).map((item) => (
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
                        </div>
                    )}
                </section>

                {loading && <p className="shop-status">در حال بارگذاری محصولات...</p>}
                {error && <p className="shop-status shop-error">{error}</p>}

                {!hasFilters && !loading && !error && home && forYourChild.length > 0 && (
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
