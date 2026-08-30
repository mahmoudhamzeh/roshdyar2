import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ShopCategoryTiles from './ShopCategoryTiles';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import './ShopPage.css';
import './ShopWorld.css';

const ShopCategoriesPage = () => {
    const history = useHistory();
    const [tree, setTree] = useState([]);

    useEffect(() => {
        fetch('/api/shop/categories')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setTree(Array.isArray(data) ? data : []))
            .catch(() => setTree([]));
    }, []);

    return (
        <div className="shop-page shop-world">
            <MainNavbar />
            <main className="shop-main">
                <h1>دسته‌بندی درختی فروشگاه</h1>
                <p>گروه اصلی را بزنید تا زیرگروه باز شود.</p>
                <ShopCategoryTiles
                    tree={tree}
                    selected=""
                    onSelect={(name) => history.push(`/shop?category=${encodeURIComponent(name)}`)}
                />
            </main>
            <Footer />
        </div>
    );
};

export default ShopCategoriesPage;
