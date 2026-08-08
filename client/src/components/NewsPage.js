import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NewsHeader from './NewsHeader';
import Footer from './Footer';
import './NewsPage.css';

const NewsPage = () => {
    const [articles, setArticles] = useState([]);
    const [videos, setVideos] = useState([]);
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('همه');
    const location = useLocation();

    useEffect(() => {
        if (location.state && location.state.category) {
            setSelectedCategory(location.state.category);
        } else {
            setSelectedCategory('همه');
        }
    }, [location]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [articlesRes, videosRes, podcastsRes] = await Promise.all([
                    fetch('/api/news'),
                    fetch('/api/videos'),
                    fetch('/api/podcasts')
                ]);
                if (!articlesRes.ok || !videosRes.ok || !podcastsRes.ok) throw new Error('Failed to fetch data');
                const articlesData = await articlesRes.json();
                const videosData = await videosRes.json();
                const podcastsData = await podcastsRes.json();
                setArticles(articlesData);
                setVideos(videosData);
                setPodcasts(podcastsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (loading || location.hash !== '#educational-videos') return undefined;

        const timer = window.setTimeout(() => {
            const section = document.getElementById('educational-videos');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 120);

        return () => window.clearTimeout(timer);
    }, [loading, location.hash, videos]);

    const filteredArticles = articles.filter(article =>
        selectedCategory === 'همه' || article.category === selectedCategory
    );

    const puzzleCategories = ['بیماری', 'آموزشی', 'تغذیه', 'مادر و کودک', 'تربیتی'];
    const puzzleArticles = puzzleCategories.map(category => {
        return articles.find(article => article.category === category);
    }).filter(Boolean);

    return (
        <div>
            <NewsHeader />
            <main className="news-page-container">
                <header className="news-page-header">
                    <h1>مجله سلامت رشد‌یار</h1>
                    <p>جدیدترین مقالات، ویدیوها و توصیه‌های تخصصی برای والدین</p>
                </header>

                {loading && <p>در حال بارگذاری...</p>}
                {error && <p className="error-message">{error}</p>}

                {!loading && !error && (
                    <>
                        {selectedCategory === 'همه' && puzzleArticles.length > 0 && (
                            <section className="puzzle-section">
                                <h2>مقالات منتخب</h2>
                                <div className="puzzle-grid">
                                    {puzzleArticles.map(article => (
                                        <Link to={`/news/${article.id}`} key={article.id} className="puzzle-item">
                                            <img src={article.imageUrl ? `${article.imageUrl}` : 'https://placehold.co/300x200/2c3e50/FFFFFF?text=مقاله'} alt={article.title} />
                                            <div className="puzzle-item-content">
                                                <span className="puzzle-category-badge">{article.category}</span>
                                                <h3>{article.title}</h3>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {selectedCategory === 'همه' && (
                            <div className="ad-banner-container">
                                <div className="ad-banner">بنر تبلیغاتی 1</div>
                            </div>
                        )}

                        <div className="main-content-grid">
                            <div className="main-column">
                                <section className="news-section">
                                    <h2>{selectedCategory === 'همه' ? 'جدیدترین مقالات' : `مقالات دسته ${selectedCategory}`}</h2>
                                    <div className={selectedCategory === 'همه' ? 'articles-list' : 'articles-grid'}>
                                        {filteredArticles.map(article => (
                                            <Link to={`/news/${article.id}`} key={article.id} className={selectedCategory === 'همه' ? 'article-list-item' : 'article-card'}>
                                                <img src={article.imageUrl ? `${article.imageUrl}` : 'https://placehold.co/150x100/2c3e50/FFFFFF?text=مقاله'} alt={article.title} />
                                                <div className={selectedCategory === 'همه' ? 'article-list-item-content' : 'article-card-content'}>
                                                    <h3>{article.title}</h3>
                                                    {selectedCategory !== 'همه' && <p className="article-category-badge">{article.category}</p>}
                                                    <p className="article-summary">{article.summary}</p>
                                                    <span className="read-more">ادامه مطلب...</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <aside className="sidebar-column">
                                {videos.length > 0 && (
                                    <section id="educational-videos" className="sidebar-section educational-videos-section">
                                        <h2>ویدیوهای آموزشی</h2>
                                        <div className="videos-list">
                                            {videos.map(video => (
                                                <a href={video.url} key={video.id} target="_blank" rel="noopener noreferrer" className="video-card">
                                                    <img src={video.thumbnailUrl ? `${video.thumbnailUrl}` : 'https://placehold.co/300x200/3498db/FFFFFF?text=ویدیو'} alt={video.title} />
                                                    <div className="video-play-icon">▶</div>
                                                    <div className="video-card-content">
                                                        <h3>{video.title}</h3>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </aside>
                        </div>

                        {selectedCategory === 'همه' && (
                            <div className="ad-banner-container">
                                <div className="ad-banner">بنر تبلیغاتی 2</div>
                            </div>
                        )}

                        {selectedCategory === 'همه' && podcasts.length > 0 && (
                            <section className="podcast-section">
                                <h2>پادکست‌های تات کیدز</h2>
                                <div className="podcasts-grid">
                                    {podcasts.map(podcast => (
                                        <a href={podcast.url} key={podcast.id} target="_blank" rel="noopener noreferrer" className="podcast-card">
                                            <img src={podcast.thumbnailUrl ? `${podcast.thumbnailUrl}` : 'https://placehold.co/300x300/1abc9c/FFFFFF?text=پادکست'} alt={podcast.title} />
                                            <div className="podcast-card-content">
                                                <h3>{podcast.title}</h3>
                                                <p>{podcast.summary}</p>
                                                <span className="podcast-duration">{podcast.duration}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default NewsPage;
