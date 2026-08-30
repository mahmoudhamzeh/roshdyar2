import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '../utils/cart';
import { ageBandLabel, formatRating, stars } from '../utils/shop';

const ShopProductCard = ({ product, index = 0 }) => (
    <Link
        to={`/shop/${product.id}`}
        className="shop-product animate-fade-up"
        style={{ animationDelay: `${0.04 * index}s` }}
    >
        <div className="shop-product-image">
            {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} />
            ) : (
                <div className="shop-product-placeholder">
                    <FontAwesomeIcon icon={faStore} />
                </div>
            )}
            {product.category && <span className="shop-product-cat">{product.category}</span>}
            {product.compareAtPrice > product.price && <span className="shop-sale-badge">فروش ویژه</span>}
        </div>
        <div className="shop-product-body">
            {product.ageBand && <span className="shop-age-badge">{ageBandLabel(product.ageBand)}</span>}
            <h2>{product.name}</h2>
            {product.ratingCount > 0 && (
                <div className="shop-rating" aria-label={`${formatRating(product.ratingAvg)} از ۵`}>
                    <strong className="shop-rating-num">{formatRating(product.ratingAvg)}</strong>
                    {stars(product.ratingAvg)}
                    <span> ({product.ratingCount})</span>
                </div>
            )}
            <p>{product.description}</p>
            <div className="shop-chip-row">
                {(product.skills || []).slice(0, 2).map((skill) => (
                    <span key={skill.slug || skill.id} className="shop-skill-tag">{skill.title}</span>
                ))}
            </div>
            <div className="shop-product-meta">
                <span>
                    <strong>{formatPrice(product.price)}</strong>
                    {product.compareAtPrice > product.price && (
                        <div className="shop-price-was">{formatPrice(product.compareAtPrice)}</div>
                    )}
                </span>
                <span className={product.stock > 0 ? 'in-stock' : 'out-stock'}>
                    {product.stock > 0 ? `${product.stock} عدد` : 'ناموجود'}
                </span>
            </div>
        </div>
    </Link>
);

export default ShopProductCard;
