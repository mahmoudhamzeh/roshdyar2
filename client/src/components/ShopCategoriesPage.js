import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import ShopCategorySheet from './ShopCategorySheet';
import './ShopPage.css';
import './ShopWorld.css';

const isMobileView = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

const ShopCategoriesPage = () => {
    const history = useHistory();
    const [open, setOpen] = useState(() => !isMobileView());

    useEffect(() => {
        if (!isMobileView()) return undefined;
        history.replace('/shop');
        const timer = window.setTimeout(() => {
            window.dispatchEvent(new Event('tatkids-open-shop-categories'));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [history]);

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <h1>دسته‌بندی فروشگاه</h1>
                <p>گروه مورد نظر را انتخاب کنید تا محصولات همان دسته نمایش داده شود.</p>
            </main>
            <ShopCategorySheet
                open={open}
                onClose={() => {
                    setOpen(false);
                    history.push('/shop');
                }}
                onSelect={(name) => {
                    history.push(name && name !== 'همه'
                        ? `/shop?category=${encodeURIComponent(name)}`
                        : '/shop');
                }}
            />
            <Footer />
        </div>
    );
};

export default ShopCategoriesPage;
