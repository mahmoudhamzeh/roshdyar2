import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCartPlus, faThumbsDown, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { addToCart, formatPrice } from '../utils/cart';
import { isLoggedIn, loginUrl } from '../api';
import { ageBandLabel, displayCommentAuthor, formatRating, stars } from '../utils/shop';
import ProductImageGallery from './ProductImageGallery';
import './ProductDetailPage.css';
import './ShopWorld.css';

const API = '';
const TABS = [
    { id: 'intro', label: 'معرفی' },
    { id: 'specs', label: 'مشخصات' },
    { id: 'reviews', label: 'نظرات' }
];

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
    const [tab, setTab] = useState('intro');

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
                setTab('intro');
            } catch (err) {
                setError(err.message || 'خطا در دریافت محصول');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

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
        if (!isLoggedIn()) {
            history.push(loginUrl(`/shop/${id}`));
            return;
        }
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

    return (
        <div className="product-detail-page shop-world">
            <MainNavbar />
            <main className="product-detail-main">
                <Link to="/shop" className="product-back">
                    <FontAwesomeIcon icon={faArrowRight} />
                    بازگشت به فروشگاه
                </Link>

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
                                {product.ratingCount > 0 && (
                                    <p className="shop-rating">
                                        <strong className="shop-rating-num">{formatRating(product.ratingAvg)}</strong>
                                        {stars(product.ratingAvg)}
                                        <span> ({product.ratingCount})</span>
                                    </p>
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

                        <section className="product-tabs animate-fade-up">
                            <div className="product-tab-bar" role="tablist">
                                {TABS.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === item.id}
                                        className={tab === item.id ? 'is-active' : ''}
                                        onClick={() => setTab(item.id)}
                                    >
                                        {item.label}
                                        {item.id === 'reviews' && comments.length > 0 ? ` (${comments.length})` : ''}
                                    </button>
                                ))}
                            </div>

                            {tab === 'intro' && (
                                <div className="product-tab-panel">
                                    <h2>معرفی محصول</h2>
                                    <p className="product-detail-desc">
                                        {product.description || 'توضیحی برای این محصول ثبت نشده است.'}
                                    </p>
                                </div>
                            )}

                            {tab === 'specs' && (
                                <div className="product-tab-panel">
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
                                </div>
                            )}

                            {tab === 'reviews' && (
                                <div className="product-tab-panel product-comments">
                                    <h2>نظر کاربران</h2>
                                    {isLoggedIn() ? (
                                    <form
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
                                            setMessage(data.message || 'نظر شما پس از تأیید کارشناس نمایش داده می‌شود');
                                            loadComments();
                                        }}
                                    >
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
                                            rows="3"
                                            placeholder="نظر خود را بنویسید"
                                        />
                                        <button type="submit">ثبت نظر</button>
                                    </form>
                                    ) : (
                                        <p>
                                            <Link to={loginUrl(`/shop/${id}`)}>برای ثبت نظر وارد شوید</Link>
                                        </p>
                                    )}
                                    {comments.length === 0 ? (
                                        <p>هنوز نظر تأیید‌شده‌ای ثبت نشده است.</p>
                                    ) : (
                                        comments.map((item) => (
                                            <article key={item.id} className="product-comment">
                                                <strong>{displayCommentAuthor(item)}</strong>
                                                {item.rating ? (
                                                    <span className="shop-rating">
                                                        {' '}
                                                        <strong className="shop-rating-num">{formatRating(item.rating)}</strong>
                                                        {stars(item.rating)}
                                                    </span>
                                                ) : null}
                                                <p>{item.body}</p>
                                                <div className="product-comment-votes">
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
                                        ))
                                    )}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ProductDetailPage;
