import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faStore } from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '../utils/cart';
import { discountPercent } from '../utils/shop';
import './AmazingOffersRail.css';

const pad = (n) => String(n).padStart(2, '0');

const AmazingOffersRail = ({ products = [], campaign, viewAll = '/shop?sort=price-asc' }) => {
    const endsAt = campaign && campaign.ends_at;
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!endsAt) return undefined;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [endsAt]);

    const remain = useMemo(() => {
        if (!endsAt) return null;
        const diff = Math.max(0, new Date(endsAt).getTime() - now);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }, [endsAt, now]);

    if (!products.length) return null;

    return (
        <section className="amazing-rail" aria-label="فروش ویژه">
            <div className="amazing-rail__intro">
                <FontAwesomeIcon icon={faPercent} />
                <strong>فروش ویژه</strong>
                {remain && <span className="amazing-rail__timer">{remain}</span>}
                <Link to={viewAll}>مشاهده همه</Link>
            </div>
            <div className="amazing-rail__scroller">
                {products.map((product) => {
                    const off = discountPercent(product.price, product.compareAtPrice);
                    return (
                        <Link key={product.id} to={`/shop/${product.id}`} className="amazing-rail__card">
                            <div className="amazing-rail__media">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} />
                                ) : (
                                    <FontAwesomeIcon icon={faStore} />
                                )}
                            </div>
                            <h3>{product.name}</h3>
                            <div className="amazing-rail__price">
                                {off > 0 && <span className="amazing-rail__off">{off}٪</span>}
                                <div>
                                    <strong>{formatPrice(product.price)}</strong>
                                    {product.compareAtPrice > product.price && (
                                        <small>{formatPrice(product.compareAtPrice)}</small>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default AmazingOffersRail;
