import React, { useEffect, useState } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCartPlus, faStore } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import { addToCart, formatPrice } from '../utils/cart';
import './ProductDetailPage.css';

const API = '';

const ProductDetailPage = () => {
    const { id } = useParams();
    const history = useHistory();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

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
        addToCart(product, quantity);
        setMessage('محصول به سبد اضافه شد');
        window.setTimeout(() => setMessage(''), 2200);
    };

    return (
        <div className="product-detail-page">
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
                            {product.imageUrl ? (
                                <img src={`${API}${product.imageUrl}`} alt={product.name} />
                            ) : (
                                <div className="product-detail-placeholder">
                                    <FontAwesomeIcon icon={faStore} />
                                </div>
                            )}
                        </div>
                        <div className="product-detail-info">
                            <span className="product-detail-cat">{product.category}</span>
                            <h1>{product.name}</h1>
                            <p className="product-detail-price">{formatPrice(product.price)}</p>
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
            </main>
            <Footer />
        </div>
    );
};

export default ProductDetailPage;
