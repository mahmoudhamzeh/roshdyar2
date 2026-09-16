import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './PageAdRail.css';

const hasImage = (banner) => banner && String(banner.imageUrl || '').trim();

export const WithLeftAds = ({ children }) => (
    <div className="page-with-left-ads">
        <div className="page-with-left-ads-main">{children}</div>
        <PageAdRail />
    </div>
);

const PageAdRail = () => {
    const [banners, setBanners] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const sidebarRes = await fetch('/api/banners?placement=sidebar');
                const sidebar = sidebarRes.ok ? await sidebarRes.json() : [];
                const usable = (Array.isArray(sidebar) ? sidebar : []).filter(hasImage);
                if (usable.length) {
                    if (!cancelled) setBanners(usable);
                    return;
                }
                const homeRes = await fetch('/api/banners?placement=home');
                const home = homeRes.ok ? await homeRes.json() : [];
                if (!cancelled) setBanners((Array.isArray(home) ? home : []).filter(hasImage));
            } catch (_) {
                if (!cancelled) setBanners([]);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    if (!banners.length) return null;

    return (
        <aside className="site-ad-rail" aria-label="بنرهای تبلیغاتی">
            {banners.map((banner) => {
                const href = banner.link || '#';
                const inner = (
                    <>
                        <img src={banner.imageUrl} alt={banner.title || 'بنر تبلیغاتی'} loading="lazy" />
                        {(banner.title || banner.subtitle) && (
                            <div>
                                {banner.title && <strong>{banner.title}</strong>}
                                {banner.subtitle && <span>{banner.subtitle}</span>}
                            </div>
                        )}
                    </>
                );
                if (href.startsWith('/')) {
                    return (
                        <Link key={banner.id} to={href} className="site-ad-rail-item">
                            {inner}
                        </Link>
                    );
                }
                return (
                    <a
                        key={banner.id}
                        className="site-ad-rail-item"
                        href={href}
                        target={href !== '#' ? '_blank' : undefined}
                        rel="noopener noreferrer sponsored"
                    >
                        {inner}
                    </a>
                );
            })}
        </aside>
    );
};

export default PageAdRail;
