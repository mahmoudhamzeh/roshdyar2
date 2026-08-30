import React from 'react';
import { useHistory } from 'react-router-dom';
import { Carousel as ResponsiveCarousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './ShopHeroSlider.css';

const ShopHeroSlider = ({ banners = [] }) => {
    const history = useHistory();
    if (!banners.length) return null;

    const go = (banner) => {
        const url = banner.link || (banner.productId ? `/shop/${banner.productId}` : '');
        if (!url) return;
        if (url.startsWith('/')) history.push(url);
        else window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <section className="shop-hero-slider animate-fade-up" aria-label="بنرهای فروشگاه">
            <ResponsiveCarousel
                showThumbs={false}
                showStatus={false}
                infiniteLoop
                autoPlay
                interval={5000}
                emulateTouch
                className="shop-hero-slider__carousel"
            >
                {banners.map((banner) => (
                    <button
                        key={banner.id}
                        type="button"
                        className="shop-hero-slider__slide"
                        onClick={() => go(banner)}
                    >
                        {banner.imageUrl ? (
                            <img src={banner.imageUrl} alt={banner.title || 'بنر فروشگاه'} />
                        ) : (
                            <div className="shop-hero-slider__fallback" aria-hidden="true" />
                        )}
                        {(banner.title || banner.subtitle) && (
                            <div className="shop-hero-slider__copy">
                                {banner.title && <h2>{banner.title}</h2>}
                                {banner.subtitle && <p>{banner.subtitle}</p>}
                                <span>مشاهده محصول</span>
                            </div>
                        )}
                    </button>
                ))}
            </ResponsiveCarousel>
        </section>
    );
};

export default ShopHeroSlider;
