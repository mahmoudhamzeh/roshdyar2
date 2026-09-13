import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus, faThumbsDown, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import ShopBreadcrumb from './ShopBreadcrumb';
import ShopRating from './ShopRating';
import { addToCart, formatPrice } from '../utils/cart';
import { ageBandLabel, displayCommentAuthor, genderLabel } from '../utils/shop';
import ProductImageGallery from './ProductImageGallery';
import './ProductDetailPage.css';
import './ShopWorld.css';

const API = '';
const SECTIONS = [
    { id: 'intro', label: 'معرفی' },
    { id: 'specs', label: 'مشخصات' },
    { id: 'reviews', label: 'نظرات' }
];
const RATING_WORDS = ['', 'خیلی بد', 'بد', 'معمولی', 'خوب', 'عالی'];

const commentDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fa-IR');
};

const authorInitial = (name) => String(name || 'ک').trim().charAt(0);

const ProductDetailPage = () => {
    const { id } = useParams();
    const history = useHistory();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);
    const [rating, setRating] = useState(5);
    const [offerId, setOfferId] = useState(null);
    const [activeSection, setActiveSection] = useState('intro');

    const loadComments = async () => {
        const res = await fetch(`${API}/api/shop/products/${id}/comments`);
        if (!res.ok) return;
        setComments(await res.json());
    };

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`${API}/api/shop/products/${id}`);
                if (!res.ok) throw new Error('محصول یافت نشد');
                const data = await res.json();
                setProduct(data);
                setQuantity(1);
                setComments(data.comments || []);
                setOfferId(data.offerId || (data.offers && data.offers[0] && data.offers[0].id) || null);
                setActiveSection('intro');
            } catch (err) {
                setError(err.message || 'خطا در دریافت محصول');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    useEffect(() => {
        if (!product) return undefined;
        const els = SECTIONS
            .map((item) => document.getElementById(`product-section-${item.id}`))
            .filter(Boolean);
        if (!els.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (!visible[0]) return;
                const next = visible[0].target.id.replace('product-section-', '');
                setActiveSection(next);
            },
            { rootMargin: '-28% 0px -58% 0px', threshold: [0.1, 0.35, 0.6] }
        );
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [product, comments.length]);

    const selectedOffer = useMemo(
        () => (product && product.offers ? product.offers.find((item) => item.id === offerId) : null),
        [product, offerId]
    );
    const salePrice = selectedOffer ? selectedOffer.price : (product && product.price);
    const saleStock = selectedOffer ? selectedOffer.stock : (product && product.stock);
    const compareAt = selectedOffer ? selectedOffer.compareAtPrice : (product && product.compareAtPrice);

    const handleAddToCart = () => {
        if (!product || saleStock < 1) return;
        addToCart({
            ...product,
            price: salePrice,
            stock: saleStock,
            compareAtPrice: compareAt,
            ...(selectedOffer ? {
                offerId: selectedOffer.id,
                vendorId: selectedOffer.vendorId,
                vendorName: selectedOffer.vendorName
            } : {})
        }, quantity);
        setMessage('محصول به سبد اضافه شد');
        window.setTimeout(() => setMessage(''), 2200);
    };

    const handleVote = async (commentId, vote) => {
        const current = comments.find((item) => item.id === commentId);
        const nextVote = current && current.myVote === vote ? 0 : vote;
        const res = await fetch(`${API}/api/shop/comments/${commentId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vote: nextVote })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMessage(data.message || 'برای رأی دادن وارد شوید');
            return;
        }
        setComments((prev) => prev.map((item) => (item.id === commentId ? data : item)));
    };

    const scrollToSection = (sectionId) => {
        setActiveSection(sectionId);
        const el = document.getElementById(`product-section-${sectionId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const crumbs = product ? [
        { label: 'فروشگاه', to: '/shop' },
        product.category ? {
            label: product.category,
            to: `/shop?category=${encodeURIComponent(product.category)}`
        } : null,
        { label: product.name }
    ].filter(Boolean) : [{ label: 'فروشگاه', to: '/shop' }];

    return (
        <div className="product-detail-page shop-world">
            <MainNavbar />
            <main className="product-detail-main">
                <ShopBreadcrumb items={crumbs} />

                {loading && <p className="shop-status">در حال بارگذاری...</p>}
                {error && <p className="shop-status shop-error">{error}</p>}

                {!loading && !error && product && (
                    <>
                        <article className="product-detail animate-fade-up">
                            <div className="product-detail-media">
                                <ProductImageGallery
                                    images={product.images}
                                    imageUrl={product.imageUrl}
                                    name={product.name}
                                    api={API}
                                />
                            </div>
                            <div className="product-detail-info">
                                <span className="product-detail-cat">{product.category}</span>
                                {product.ageBand && <span className="shop-age-badge">{ageBandLabel(product.ageBand)}</span>}
                                <h1>{product.name}</h1>
                                {(product.offers || []).length > 0 && (
                                    <div className="product-offers">
                                        <p>فروشندگان این کالا</p>
                                        {(product.offers || []).map((offer) => (
                                            <label key={offer.id} className={offerId === offer.id ? 'is-active' : ''}>
                                                <input
                                                    type="radio"
                                                    name="offer"
                                                    checked={offerId === offer.id}
                                                    onChange={() => {
                                                        setOfferId(offer.id);
                                                        setQuantity(1);
                                                    }}
                                                />
                                                {offer.vendorName} · {formatPrice(offer.price)}
                                                {offer.stock < 1 ? ' · ناموجود' : ''}
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {product.ratingCount > 0 ? (
                                    <ShopRating
                                        value={product.ratingAvg}
                                        count={product.ratingCount}
                                        size="lg"
                                    />
                                ) : (
                                    <p className="shop-rating-empty">هنوز امتیازی ثبت نشده</p>
                                )}
                                <p className="product-detail-price">
                                    {formatPrice(salePrice)}
                                    {compareAt > salePrice && (
                                        <span className="shop-price-was"> {formatPrice(compareAt)}</span>
                                    )}
                                </p>
                                <div className="shop-chip-row">
                                    {(product.skills || []).map((skill) => (
                                        <span key={skill.slug || skill.id} className="shop-skill-tag">{skill.title}</span>
                                    ))}
                                </div>
                                {product.safetyWarning && (
                                    <p className="product-safety">{product.safetyWarning}</p>
                                )}
                                <p className={`product-detail-stock ${saleStock > 0 ? 'in-stock' : 'out-stock'}`}>
                                    {saleStock > 0 ? `موجودی: ${saleStock} عدد` : 'این محصول فعلاً ناموجود است'}
                                </p>

                                {saleStock > 0 && (
                                    <div className="product-detail-actions">
                                        <label>
                                            تعداد
                                            <input
                                                type="number"
                                                min="1"
                                                max={saleStock}
                                                value={quantity}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value, 10) || 1;
                                                    setQuantity(Math.min(Math.max(val, 1), saleStock));
                                                }}
                                            />
                                        </label>
                                        <button type="button" className="product-add-btn" onClick={handleAddToCart}>
                                            <FontAwesomeIcon icon={faCartPlus} />
                                            افزودن به سبد
                                        </button>
                                        <button
                                            type="button"
                                            className="product-cart-link"
                                            onClick={() => history.push('/cart')}
                                        >
                                            مشاهده سبد
                                        </button>
                                    </div>
                                )}
                                {message && <p className="product-toast">{message}</p>}
                            </div>
                        </article>

                        <nav className="product-section-nav" aria-label="بخش‌های محصول">
                            {SECTIONS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={activeSection === item.id ? 'is-active' : ''}
                                    onClick={() => scrollToSection(item.id)}
                                >
                                    {item.label}
                                    {item.id === 'reviews' && comments.length > 0 ? ` (${comments.length})` : ''}
                                </button>
                            ))}
                        </nav>

                        <div className="product-sections">
                            <section id="product-section-intro" className="product-section">
                                <h2>معرفی محصول</h2>
                                <p className="product-detail-desc">
                                    {product.description || 'توضیحی برای این محصول ثبت نشده است.'}
                                </p>
                            </section>

                            <section id="product-section-specs" className="product-section">
                                <h2>مشخصات</h2>
                                <dl className="product-specs">
                                    <div>
                                        <dt>دسته‌بندی</dt>
                                        <dd>{product.category || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt>گروه سنی</dt>
                                        <dd>{product.ageBand ? ageBandLabel(product.ageBand) : '—'}</dd>
                                    </div>
                                    <div>
                                        <dt>جنسیت</dt>
                                        <dd>{product.gender ? genderLabel(product.gender) : 'دختر و پسر'}</dd>
                                    </div>
                                    <div>
                                        <dt>برند</dt>
                                        <dd>{product.brand || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt>مهارت‌ها</dt>
                                        <dd>
                                            {(product.skills || []).map((skill) => skill.title).join('، ') || '—'}
                                        </dd>
                                    </div>
                                    {product.safetyWarning && (
                                        <div>
                                            <dt>ایمنی</dt>
                                            <dd>{product.safetyWarning}</dd>
                                        </div>
                                    )}
                                    {(product.offers || []).length > 0 && (
                                        <div>
                                            <dt>فروشندگان</dt>
                                            <dd>{product.offers.map((offer) => offer.vendorName).join('، ')}</dd>
                                        </div>
                                    )}
                                </dl>
                            </section>

                            <section id="product-section-reviews" className="product-section product-reviews">
                                <h2>نظر کاربران</h2>
                                <div className="product-reviews-summary">
                                    <div className="product-reviews-score">
                                        <strong>{Number(product.ratingAvg || 0).toFixed(1)}</strong>
                                        <ShopRating
                                            value={product.ratingAvg}
                                            count={product.ratingCount || comments.length}
                                            size="lg"
                                            showEmpty
                                        />
                                        <span>
                                            {comments.length > 0
                                                ? `${comments.length} دیدگاه تأییدشده`
                                                : 'هنوز دیدگاهی ثبت نشده'}
                                        </span>
                                    </div>
                                    <ul className="product-reviews-bars">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = comments.filter((item) => Number(item.rating) === star).length;
                                            const pct = comments.length ? Math.round((count / comments.length) * 100) : 0;
                                            return (
                                                <li key={star}>
                                                    <span>{star} ستاره</span>
                                                    <div className="product-reviews-bar">
                                                        <em style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <b>{count}</b>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                <form
                                    className="product-review-form"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!comment.trim()) return;
                                        const res = await fetch(`${API}/api/shop/products/${id}/comments`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ body: comment.trim(), rating })
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            setMessage(data.message || 'ثبت نظر ناموفق بود');
                                            return;
                                        }
                                        setComment('');
                                        setRating(5);
                                        setMessage(data.message || 'نظر شما پس از تأیید کارشناس نمایش داده می‌شود');
                                        loadComments();
                                    }}
                                >
                                    <h3>دیدگاه خود را بنویسید</h3>
                                    <p className="product-review-form-label">
                                        امتیاز شما
                                        <em>{RATING_WORDS[rating]}</em>
                                    </p>
                                    <div className="shop-stars-input" role="radiogroup" aria-label="امتیاز">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={value <= rating ? 'is-on' : ''}
                                                onClick={() => setRating(value)}
                                                aria-label={`${value} ستاره`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows="4"
                                        placeholder="کیفیت، مناسب بودن برای سن کودک و تجربه خرید را بنویسید..."
                                    />
                                    <button type="submit">ثبت دیدگاه</button>
                                </form>

                                {comments.length === 0 ? (
                                    <div className="product-reviews-empty">
                                        <p>هنوز نظر تأیید‌شده‌ای ثبت نشده است.</p>
                                        <span>اولین نفری باشید که تجربه خرید این محصول را می‌نویسد.</span>
                                    </div>
                                ) : (
                                    <div className="product-reviews-list">
                                        {comments.map((item) => {
                                            const author = displayCommentAuthor(item);
                                            return (
                                                <article key={item.id} className="product-review-card">
                                                    <header className="product-review-card__head">
                                                        <span className="product-review-avatar" aria-hidden="true">
                                                            {authorInitial(author)}
                                                        </span>
                                                        <div>
                                                            <strong>{author}</strong>
                                                            <time>{commentDate(item.createdAt)}</time>
                                                        </div>
                                                        {item.rating ? (
                                                            <ShopRating value={item.rating} size="sm" />
                                                        ) : null}
                                                    </header>
                                                    <p>{item.body}</p>
                                                    <div className="product-review-votes">
                                                        <span>آیا این دیدگاه مفید بود؟</span>
                                                        <button
                                                            type="button"
                                                            className={item.myVote === 1 ? 'is-on' : ''}
                                                            onClick={() => handleVote(item.id, 1)}
                                                            aria-label="پسندیدن نظر"
                                                        >
                                                            <FontAwesomeIcon icon={faThumbsUp} />
                                                            {item.likeCount || 0}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={item.myVote === -1 ? 'is-on is-down' : ''}
                                                            onClick={() => handleVote(item.id, -1)}
                                                            aria-label="نپسندیدن نظر"
                                                        >
                                                            <FontAwesomeIcon icon={faThumbsDown} />
                                                            {item.dislikeCount || 0}
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ProductDetailPage;
