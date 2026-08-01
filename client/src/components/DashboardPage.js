import React, { useState, useEffect } from 'react';
import MainNavbar from './MainNavbar';
import Footer from './Footer';
import AppCarousel from './Carousel';
import ServiceTiles from './ServiceTiles';
import ContentRow from './ContentRow';
import './DashboardPage.css';

const mockVideos = Array.from({ length: 8 }, (_, i) => ({
    id: i, title: `ویدیو آموزشی ${i + 1}`,
    image: `https://placehold.co/220x140/0F766E/FFFFFF?text=Video+${i+1}`
}));

const DashboardPage = () => {
    const [banners, setBanners] = useState([]);
    const [articles, setArticles] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const bannersResponse = await fetch('http://localhost:5000/api/banners');
                if (bannersResponse.ok) {
                    const data = await bannersResponse.json();
                    const formattedBanners = data
                        .filter(banner => banner.imageUrl && banner.imageUrl.trim() !== '')
                        .map(banner => ({
                            id: banner.id,
                            image: `http://localhost:5000${banner.imageUrl}`,
                            title: banner.title,
                            link: banner.link,
                        }));
                    setBanners(formattedBanners);
                }
            } catch (error) {
                console.error("Failed to fetch banners:", error);
            }

            try {
                const articlesResponse = await fetch('http://localhost:5000/api/news');
                if (articlesResponse.ok) {
                    const data = await articlesResponse.json();
                    const formattedArticles = data.slice(0, 5).map(article => ({
                        id: article.id,
                        title: article.title,
                        summary: article.summary,
                        image: article.imageUrl ? `http://localhost:5000${article.imageUrl}` : `https://placehold.co/220x140/0F766E/FFFFFF?text=مقاله`,
                        link: `/news/${article.id}`
                    }));
                    setArticles(formattedArticles);
                }
            } catch (error) {
                console.error("Failed to fetch articles:", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="dashboard-page">
            <MainNavbar />
            <main className="dashboard-main">
                <AppCarousel slides={banners} />
                <ServiceTiles />
                <ContentRow title="ویدیوهای آموزشی و تربیتی" items={mockVideos} scrollable={true} />
                <ContentRow title="جدیدترین مقالات" items={articles} viewAllLink="/news" />
            </main>
            <Footer />
        </div>
    );
};

export default DashboardPage;
