import React from 'react';
import ShopProductCard from './ShopProductCard';
import './ProductRail.css';

const ProductRail = ({ title, products = [] }) => {
    if (!products.length) return null;
    return (
        <section className="product-rail">
            <h2>{title}</h2>
            <div className="product-rail-scroller">
                {products.map((product, index) => (
                    <ShopProductCard key={product.id} product={product} index={index} />
                ))}
            </div>
        </section>
    );
};

export default ProductRail;
