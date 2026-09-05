import React, { useState, useEffect } from 'react';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import AppCarousel from './Carousel';
import HomeAbout from './HomeAbout';
import ServiceTiles from './ServiceTiles';
import ContentRow from './ContentRow';
import AmazingOffersRail from './AmazingOffersRail';
import './DashboardPage.css';

const fallbackVideos = Array.from({ length: 4 }, (_, i) => ({
    id: `fallback-${i}`,
    title: `ویدیو آموزشی ${i + 1}`,
    summary: 'ویدیوهای آموزشی و تربیتی برای والدین',
    image: null,
    link: '/news#educational-videos',
    isVideo: true,
}));

const youtubeThumb = (url) => {
    if (!url) return null;
    const match = String(url).match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

const DashboardPage = () => {
    const [banners, setBanners] = useState([]);
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState(fallbackVideos);
    const [sale, setSale] = useState({ products: [], campaign: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const bannersResponse = await fetch('/api/banners?placement=home');
                if (bannersResponse.ok) {
                    const data = await bannersResponse.json();
                    const formattedBanners = data
                        .filter(banner => banner.imageUrl && banner.imageUrl.trim() !== '')
                        .map(banner => ({
                            id: banner.id,
                            image: `${banner.imageUrl}`,
                            title: banner.title,
                            link: banner.link,
                        }));
                    setBanners(formattedBanners);
                }
            } catch (error) {
                console.error("Failed to fetch banners:", error);
            }

            try {
                const articlesResponse = await fetch('/api/news');
                if (articlesResponse.ok) {
                    const data = await articlesResponse.json();
                    const formattedArticles = data.slice(0, 8).map(article => ({
                        id: article.id,
                        title: article.title,
                        summary: article.summary,
                        image: article.imageUrl ? `${article.imageUrl}` : null,
                        link: `/news/${article.id}`
                    }));
                    setArticles(formattedArticles);
                }
            } catch (error) {
                console.error("Failed to fetch articles:", error);
            }

            try {
                const videosResponse = await fetch('/api/videos');
                if (videosResponse.ok) {
                    const data = await videosResponse.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const formattedVideos = data.map((video) => ({
                            id: video.id,
                            title: video.title,
                            summary: video.summary,
                            image: video.thumbnailUrl
                                ? `${video.thumbnailUrl}`
                                : youtubeThumb(video.url),
                            externalUrl: video.url,
                            isVideo: true,
                        }));
                        setVideos(formattedVideos);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch videos:", error);
            }
        };
        fetch('/api/shop/sale')
            .then((res) => (res.ok ? res.json() : { products: [] }))
            .then((data) => setSale(data || { products: [] }))
            .catch(() => {});
        fetchData();
    }, []);

    return (
        <div className="dashboard-page">
            <MainNavbar />
            <main className="dashboard-main">
                <AppCarousel slides={banners} />
                <HomeAbout />
                <ServiceTiles />
                <div className="dashboard-sale-wrap">
                    <AmazingOffersRail products={sale.products} campaign={sale.campaign} />
                </div>
                <ContentRow
                    title="ویدیوهای آموزشی و تربیتی"
                    items={videos}
                    scrollable={true}
                    visibleCount={4}
                    mobileVisibleCount={2}
                    viewAllLink="/news#educational-videos"
                />
                <ContentRow
                    title="جدیدترین مقالات"
                    items={articles}
                    scrollable={true}
                    visibleCount={4}
                    mobileVisibleCount={2}
                    viewAllLink="/news"
                />
            </main>
            <Footer />
        </div>
    );
};

export default DashboardPage;
