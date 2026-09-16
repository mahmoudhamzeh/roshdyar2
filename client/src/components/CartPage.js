import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faStore, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import QuantityStepper from './QuantityStepper';
import {
    getCart,
    updateCartQuantity,
    removeFromCart,
    getCartTotal,
    getCartItemCount,
    getCartOriginalTotal,
    getCartDiscount,
    groupCartByVendor,
    cartLineKey,
    formatPrice,
} from '../utils/cart';
import { getLoggedInUser } from '../api';
import './CartPage.css';

const API = '';

const CartPage = () => {
    const history = useHistory();
    const [cart, setCart] = useState(getCart());

    const refresh = (next) => setCart(next || getCart());

    const handleCheckout = () => {
        if (cart.length === 0) return;
        const user = getLoggedInUser();
        if (!user || !user.id) {
            history.push('/login?next=/checkout/shipping');
            return;
        }
        history.push('/checkout/shipping');
    };

    const itemCount = getCartItemCount(cart);
    const originalTotal = getCartOriginalTotal(cart);
    const discount = getCartDiscount(cart);
    const total = getCartTotal(cart);
    const vendorGroups = groupCartByVendor(cart);

    return (
        <div className="cart-page shop-world">
            <MainNavbar />
            <main className="cart-main">
                <div className="cart-header animate-fade-up">
                    <Link to="/shop" className="product-back">
                        <FontAwesomeIcon icon={faArrowRight} />
                        ادامه خرید
                    </Link>
                    <h1>سبد خرید</h1>
                </div>

                {cart.length === 0 ? (
                    <div className="cart-empty animate-fade-up">
                        <FontAwesomeIcon icon={faStore} />
                        <p>سبد خرید شما خالی است</p>
                        <Link to="/shop" className="shop-btn shop-btn-primary">مشاهده فروشگاه</Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <section className="cart-items animate-fade-up">
                            {vendorGroups.map((group) => (
                                <div key={group.vendorId || group.vendorName} className="cart-vendor-group">
                                    <h3 className="cart-vendor-title">
                                        <FontAwesomeIcon icon={faStore} />
                                        {group.vendorName}
                                    </h3>
                                    {group.items.map((item) => (
                                        <div key={cartLineKey(item)} className="cart-item">
                                            <div className="cart-item-image">
                                                {item.imageUrl ? (
                                                    <img src={`${API}${item.imageUrl}`} alt={item.name} loading="lazy" decoding="async" />
                                                ) : (
                                                    <FontAwesomeIcon icon={faStore} />
                                                )}
                                            </div>
                                            <div className="cart-item-info">
                                                <Link to={`/shop/${item.productId}`}>{item.name}</Link>
                                                <strong>{formatPrice(item.price)}</strong>
                                            </div>
                                            <div className="cart-item-qty">
                                                <QuantityStepper
                                                    value={item.quantity}
                                                    min={1}
                                                    max={item.stock || 99}
                                                    onChange={(qty) => refresh(updateCartQuantity(cartLineKey(item), qty))}
                                                />
                                                <button
                                                    type="button"
                                                    className="cart-remove"
                                                    onClick={() => refresh(removeFromCart(cartLineKey(item)))}
                                                    aria-label="حذف از سبد"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </div>
                                            <div className="cart-item-line">
                                                {formatPrice(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </section>

                        <aside className="cart-checkout animate-fade-up" aria-label="صورتحساب">
                            <h2>صورتحساب</h2>
                            <div className="cart-invoice">
                                <div className="cart-invoice-row">
                                    <span>مجموع قیمت کالاها ({itemCount.toLocaleString('fa-IR')} کالا)</span>
                                    <strong>{formatPrice(originalTotal)}</strong>
                                </div>
                                <div className={`cart-invoice-row${discount > 0 ? ' is-profit' : ''}`}>
                                    <span>سود شما از خرید</span>
                                    <strong>{formatPrice(discount)}</strong>
                                </div>
                                <div className="cart-invoice-row is-total">
                                    <span>مجموع سبد خرید</span>
                                    <strong>{formatPrice(total)}</strong>
                                </div>
                            </div>
                            <p className="cart-shipping-note">هزینه ارسال این مرحله ۰ تومان است و هر فروشنده جداگانه آماده‌سازی می‌کند.</p>
                            <button type="button" className="cart-submit" onClick={handleCheckout}>
                                ثبت سفارش
                            </button>
                        </aside>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default CartPage;
