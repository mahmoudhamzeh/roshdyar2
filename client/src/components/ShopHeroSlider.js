import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './ShopHeroSlider.css';

const DEFAULT_SLIDES = [
    {
        id: 'default-1',
        title: 'دنیای فروشگاه تات کیدز',
        subtitle: 'خرید بر اساس سن و مهارت رشدی کودک',
        link: '/shop/categories'
    },
    {
        id: 'default-2',
        title: 'فروش ویژه مادر و کودک',
        subtitle: 'تخفیف‌های محدود روی اسباب‌بازی و کتاب',
        link: '/shop?sort=popular'
    }
];

const ShopHeroSlider = ({ banners = [] }) => {
    const history = useHistory();
    const slides = banners.length ? banners : DEFAULT_SLIDES;
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (slides.length < 2) return undefined;
        const id = window.setInterval(() => {
            setIndex((current) => (current + 1) % slides.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [slides.length]);

    const current = slides[index] || slides[0];
    const go = () => {
        const url = current.link || (current.productId ? `/shop/${current.productId}` : '');
        if (!url) return;
        if (url.startsWith('/')) history.push(url);
        else window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <section className="shop-hero-slider" aria-label="بنرهای فروشگاه">
            <button type="button" className="shop-hero-slider__slide" onClick={go}>
                {current.imageUrl ? (
                    <img src={current.imageUrl} alt={current.title || 'بنر فروشگاه'} />
                ) : (
                    <div className="shop-hero-slider__fallback" />
                )}
                <div className="shop-hero-slider__copy">
                    {current.title && <h2>{current.title}</h2>}
                    {current.subtitle && <p>{current.subtitle}</p>}
                    <span>مشاهده و خرید</span>
                </div>
            </button>
            {slides.length > 1 && (
                <div className="shop-hero-slider__dots">
                    {slides.map((slide, i) => (
                        <button
                            key={slide.id}
                            type="button"
                            className={i === index ? 'is-active' : ''}
                            aria-label={`اسلاید ${i + 1}`}
                            onClick={() => setIndex(i)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default ShopHeroSlider;
