import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faSearchPlus, faStore, faTimes } from '@fortawesome/free-solid-svg-icons';

const ProductImageGallery = ({ images = [], imageUrl, name, api = '' }) => {
    const urls = useMemo(() => {
        const fromList = (images || []).map((img) => img && img.imageUrl).filter(Boolean);
        const merged = imageUrl && !fromList.includes(imageUrl) ? [imageUrl, ...fromList] : fromList;
        return merged.map((url) => `${api}${url}`);
    }, [images, imageUrl, api]);

    const [index, setIndex] = useState(0);
    const [lightbox, setLightbox] = useState(false);
    const [zoomed, setZoomed] = useState(false);
    const [origin, setOrigin] = useState('50% 50%');

    useEffect(() => {
        setIndex(0);
        setLightbox(false);
        setZoomed(false);
    }, [name]);

    useEffect(() => {
        if (index >= urls.length) setIndex(0);
    }, [index, urls.length]);

    const go = (delta) => {
        if (!urls.length) return;
        setIndex((prev) => (prev + delta + urls.length) % urls.length);
        setZoomed(false);
    };

    const openZoom = () => {
        if (!urls.length) return;
        setLightbox(true);
        setZoomed(false);
    };

    if (!urls.length) {
        return (
            <div className="product-detail-placeholder">
                <FontAwesomeIcon icon={faStore} />
            </div>
        );
    }

    const current = urls[index] || urls[0];

    return (
        <div className="product-gallery">
            <div className="product-gallery-stage">
                <button
                    type="button"
                    className="product-gallery-main"
                    onClick={openZoom}
                    aria-label="بزرگ‌نمایی تصویر محصول"
                >
                    <img src={current} alt={name} />
                </button>
                {urls.length > 1 && (
                    <>
                        <button type="button" className="product-gallery-nav is-prev" onClick={() => go(-1)} aria-label="تصویر قبلی">
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                        <button type="button" className="product-gallery-nav is-next" onClick={() => go(1)} aria-label="تصویر بعدی">
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                    </>
                )}
                <button type="button" className="product-gallery-zoom" onClick={openZoom}>
                    <FontAwesomeIcon icon={faSearchPlus} />
                    بزرگ‌نمایی
                </button>
            </div>
            {urls.length > 1 && (
                <div className="product-thumbs">
                    {urls.map((src, i) => (
                        <button
                            key={`thumb-${src}-${i}`}
                            type="button"
                            className={i === index ? 'is-active' : ''}
                            onClick={() => setIndex(i)}
                            aria-label={`نمایش تصویر ${i + 1}`}
                        >
                            <img src={src} alt="" />
                        </button>
                    ))}
                </div>
            )}

            {lightbox && (
                <div className="product-zoom" role="dialog" aria-modal="true" aria-label="بزرگ‌نمایی تصویر محصول">
                    <button type="button" className="product-zoom-close" onClick={() => setLightbox(false)} aria-label="بستن">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                    {urls.length > 1 && (
                        <>
                            <button type="button" className="product-zoom-nav is-prev" onClick={() => go(-1)} aria-label="تصویر قبلی">
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                            <button type="button" className="product-zoom-nav is-next" onClick={() => go(1)} aria-label="تصویر بعدی">
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                        </>
                    )}
                    <div
                        className={`product-zoom-frame ${zoomed ? 'is-zoomed' : ''}`}
                        onClick={() => setZoomed((on) => !on)}
                        onMouseMove={(e) => {
                            if (!zoomed) return;
                            const box = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - box.left) / box.width) * 100;
                            const y = ((e.clientY - box.top) / box.height) * 100;
                            setOrigin(`${x}% ${y}%`);
                        }}
                    >
                        <img
                            src={current}
                            alt={name}
                            style={{ transformOrigin: origin }}
                        />
                    </div>
                    <p className="product-zoom-hint">{zoomed ? 'برای کوچک‌نمایی دوباره لمس کنید' : 'برای بزرگ‌نمایی تصویر را لمس کنید'}</p>
                </div>
            )}
        </div>
    );
};

export default ProductImageGallery;
