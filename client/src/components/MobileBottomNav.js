import React, { useEffect, useState } from 'react';
import { NavLink, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faChild,
    faStore,
    faUser,
    faShoppingCart,
    faThLarge
} from '@fortawesome/free-solid-svg-icons';
import { getCartCount } from '../utils/cart';
import ShopCategorySheet from './ShopCategorySheet';
import './MobileBottomNav.css';

const isShopWorldPath = (pathname) =>
    pathname.startsWith('/shop') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/orders');

const MobileBottomNav = () => {
    const history = useHistory();
    const location = useLocation();
    const [cartCount, setCartCount] = useState(getCartCount());
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const shopWorld = isShopWorldPath(location.pathname);
    const selectedCategory = new URLSearchParams(location.search).get('category') || 'همه';

    useEffect(() => {
        const sync = () => setCartCount(getCartCount());
        window.addEventListener('cart-updated', sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('cart-updated', sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    useEffect(() => {
        const hide =
            location.pathname.startsWith('/login') ||
            location.pathname.startsWith('/register') ||
            location.pathname.startsWith('/admin') ||
            location.pathname.startsWith('/news');
        document.body.classList.toggle('has-mobile-bottom-nav', !hide);
        document.body.classList.toggle('shop-world-nav', !hide && shopWorld);
        return () => {
            document.body.classList.remove('has-mobile-bottom-nav');
            document.body.classList.remove('shop-world-nav');
        };
    }, [location.pathname, shopWorld]);

    useEffect(() => {
        const openCategories = () => setCategoriesOpen(true);
        window.addEventListener('tatkids-open-shop-categories', openCategories);
        return () => window.removeEventListener('tatkids-open-shop-categories', openCategories);
    }, []);

    if (
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/news')
    ) {
        return null;
    }

    const portalItems = [
        { to: '/dashboard', icon: faHome, label: 'خانه', exact: true },
        { to: '/my-children', icon: faChild, label: 'فرزندان' },
        { to: '/shop', icon: faStore, label: 'فروشگاه' },
        { to: '/profile', icon: faUser, label: 'پروفایل' }
    ];

    const shopItems = [
        {
            key: 'tatkids-home',
            to: '/dashboard',
            icon: faHome,
            label: 'خانه تات کیدز',
            isActive: (_match, loc) => loc.pathname === '/dashboard'
        },
        {
            key: 'shop-home',
            to: '/shop',
            icon: faStore,
            label: 'خانه فروشگاه',
            isActive: (_match, loc) => loc.pathname === '/shop' && !categoriesOpen
        },
        {
            key: 'categories',
            icon: faThLarge,
            label: 'دسته‌بندی',
            onClick: () => setCategoriesOpen(true),
            isOpen: categoriesOpen
        },
        {
            key: 'cart',
            to: '/cart',
            icon: faShoppingCart,
            label: 'سبد خرید',
            badge: cartCount
        }
    ];

    const items = shopWorld ? shopItems : portalItems;

    return (
        <>
            <nav
                className={`mobile-bottom-nav ${shopWorld ? 'mobile-bottom-nav--shop' : ''}`}
                aria-label={shopWorld ? 'ناوبری فروشگاه' : 'ناوبری اصلی موبایل'}
            >
                {items.map((item) => (
                    item.onClick ? (
                        <button
                            key={item.key}
                            type="button"
                            className={`mobile-bottom-nav__item ${item.isOpen ? 'is-active' : ''}`}
                            onClick={item.onClick}
                        >
                            <span className="mobile-bottom-nav__icon-wrap">
                                <FontAwesomeIcon icon={item.icon} />
                            </span>
                            <span className="mobile-bottom-nav__label">{item.label}</span>
                        </button>
                    ) : (
                        <NavLink
                            key={item.key || item.to}
                            to={item.to}
                            exact={item.exact}
                            className="mobile-bottom-nav__item"
                            activeClassName="is-active"
                            isActive={item.isActive}
                        >
                            <span className="mobile-bottom-nav__icon-wrap">
                                <FontAwesomeIcon icon={item.icon} />
                                {item.badge > 0 && (
                                    <span className="mobile-bottom-nav__badge">{item.badge}</span>
                                )}
                            </span>
                            <span className="mobile-bottom-nav__label">{item.label}</span>
                        </NavLink>
                    )
                ))}
            </nav>
            <ShopCategorySheet
                open={categoriesOpen}
                onClose={() => setCategoriesOpen(false)}
                selected={selectedCategory}
                onSelect={(name) => {
                    const next = new URLSearchParams();
                    if (name && name !== 'همه') next.set('category', name);
                    history.push(`/shop${next.toString() ? `?${next.toString()}` : ''}`);
                }}
            />
        </>
    );
};

export default MobileBottomNav;
