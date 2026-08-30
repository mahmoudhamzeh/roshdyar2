import React, { useEffect, useState } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCartPlus, faStore } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { addToCart, formatPrice } from '../utils/cart';
import { ageBandLabel, stars } from '../utils/shop';
import './ProductDetailPage.css';
import './ShopWorld.css';

const API = '';

const ProductDetailPage = () => {
    const { id } = useParams();
    const history = useHistory();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activeImage, setActiveImage] = useState(0);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);
    const [rating, setRating] = useState(5);
    const [offerId, setOfferId] = useState(null);

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
                setActiveImage(0);
                setComments(data.comments || []);
                setOfferId(data.offerId || (data.offers && data.offers[0] && data.offers[0].id) || null);
            } catch (err) {
                setError(err.message || 'خطا در دریافت محصول');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleAddToCart = () => {
        if (!product || product.stock < 1) return;
        const offer = (product.offers || []).find((item) => item.id === offerId);
        addToCart({
            ...product,
            ...(offer ? {
                offerId: offer.id,
                vendorId: offer.vendorId,
                vendorName: offer.vendorName,
                price: offer.price,
                stock: offer.stock,
                compareAtPrice: offer.compareAtPrice
            } : {})
        }, quantity);
        setMessage('محصول به سبد اضافه شد');
        window.setTimeout(() => setMessage(''), 2200);
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
                    <article className="product-detail animate-fade-up">
                        <div className="product-detail-media">
                            {(product.images && product.images[activeImage] && product.images[activeImage].imageUrl) || product.imageUrl ? (
                                <img
                                    src={`${API}${(product.images && product.images[activeImage] && product.images[activeImage].imageUrl) || product.imageUrl}`}
                                    alt={product.name}
                                />
                            ) : (
                                <div className="product-detail-placeholder">
                                    <FontAwesomeIcon icon={faStore} />
                                </div>
                            )}
                            {product.images && product.images.length > 1 && (
                                <div className="product-thumbs">
                                    {product.images.map((img, index) => (
                                        <button
                                            key={`${img.id}-${index}`}
                                            type="button"
                                            className={index === activeImage ? 'is-active' : ''}
                                            onClick={() => setActiveImage(index)}
                                        >
                                            <img src={`${API}${img.imageUrl}`} alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
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
                                                onChange={() => setOfferId(offer.id)}
                                            />
                                            {offer.vendorName} · {formatPrice(offer.price)}
                                            {offer.stock < 1 ? ' · ناموجود' : ''}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {product.ratingCount > 0 && (
                                <p className="shop-rating">{stars(product.ratingAvg)} ({product.ratingCount})</p>
                            )}
                            <p className="product-detail-price">
                                {formatPrice(product.price)}
                                {product.compareAtPrice > product.price && (
                                    <span className="shop-price-was"> {formatPrice(product.compareAtPrice)}</span>
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
                            <p className="product-detail-desc">{product.description}</p>
                            <p className={`product-detail-stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                                {product.stock > 0 ? `موجودی: ${product.stock} عدد` : 'این محصول فعلاً ناموجود است'}
                            </p>

                            {product.stock > 0 && (
                                <div className="product-detail-actions">
                                    <label>
                                        تعداد
                                        <input
                                            type="number"
                                            min="1"
                                            max={product.stock}
                                            value={quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10) || 1;
                                                setQuantity(Math.min(Math.max(val, 1), product.stock));
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
                )}

                {!loading && !error && product && (
                    <section className="product-comments">
                        <h2>نظر کاربران</h2>
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
                                setComments((prev) => [data, ...prev]);
                                setComment('');
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
                        {comments.length === 0 ? (
                            <p>هنوز نظری ثبت نشده است.</p>
                        ) : (
                            comments.map((item) => (
                                <article key={item.id} className="product-comment">
                                    <strong>{item.author || 'کاربر'}</strong>
                                    {item.rating ? <span className="shop-rating"> {stars(item.rating)}</span> : null}
                                    <p>{item.body}</p>
                                </article>
                            ))
                        )}
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default ProductDetailPage;
