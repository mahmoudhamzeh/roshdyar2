import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faChild,
    faStore,
    faUser,
    faShoppingCart
} from '@fortawesome/free-solid-svg-icons';
import { getCartCount } from '../utils/cart';
import './MobileBottomNav.css';

const MobileBottomNav = () => {
    const location = useLocation();
    const [cartCount, setCartCount] = useState(getCartCount());

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
        if (hide) {
            document.body.classList.remove('has-mobile-bottom-nav');
            return undefined;
        }
        document.body.classList.add('has-mobile-bottom-nav');
        return () => document.body.classList.remove('has-mobile-bottom-nav');
    }, [location.pathname]);

    if (
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/news')
    ) {
        return null;
    }

    const items = [
        { to: '/dashboard', icon: faHome, label: 'خانه', exact: true },
        { to: '/my-children', icon: faChild, label: 'فرزندان' },
        { to: '/shop', icon: faStore, label: 'فروشگاه' },
        { to: '/cart', icon: faShoppingCart, label: 'سبد', badge: cartCount },
        { to: '/profile', icon: faUser, label: 'پروفایل' }
    ];

    return (
        <nav className="mobile-bottom-nav" aria-label="ناوبری اصلی موبایل">
            {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    exact={item.exact}
                    className="mobile-bottom-nav__item"
                    activeClassName="is-active"
                >
                    <span className="mobile-bottom-nav__icon-wrap">
                        <FontAwesomeIcon icon={item.icon} />
                        {item.badge > 0 && (
                            <span className="mobile-bottom-nav__badge">{item.badge}</span>
                        )}
                    </span>
                    <span className="mobile-bottom-nav__label">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileBottomNav;
