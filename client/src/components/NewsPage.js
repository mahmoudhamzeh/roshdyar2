import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import NewsHeader from './NewsHeader';
import Footer from './Footer';
import { HeroSlider, AdBanner } from './magazine/HeroSlider';
import { postHref, typeLabel, flattenCategories, sidebarAdsFromHome } from '../utils/magazine';
import './NewsPage.css';
import './magazine/Magazine.css';

const NewsPage = () => {
    const { slug } = useParams();
    const location = useLocation();
    const history = useHistory();
    const [home, setHome] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const typeFromUrl = new URLSearchParams(location.search).get('type') || 'all';
    const [type, setType] = useState(typeFromUrl);

    const mode = location.pathname.includes('/category/')
        ? 'category'
        : location.pathname.includes('/tag/')
            ? 'tag'
            : 'home';

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const homeRes = await fetch('/api/magazine/home');
                if (!homeRes.ok) throw new Error('بارگذاری مجله ناموفق بود');
                const homeData = await homeRes.json();
                setHome(homeData);
                if (mode === 'home' && !slug) {
                    const listRes = await fetch('/api/magazine/posts');
                    setPosts(listRes.ok ? await listRes.json() : (homeData.latestArticles || []));
                } else {
                    const query = mode === 'tag' ? `tag=${slug}` : `category=${slug}`;
                    const listRes = await fetch(`/api/magazine/posts?${query}`);
                    setPosts(listRes.ok ? await listRes.json() : []);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [mode, slug]);

    useEffect(() => {
        setType(typeFromUrl === 'news' || typeFromUrl === 'article' || typeFromUrl === 'video' || typeFromUrl === 'podcast'
            ? typeFromUrl
            : 'all');
    }, [typeFromUrl]);

    const categories = home ? flattenCategories(home.categories) : [];
    const visiblePosts = useMemo(() => {
        if (type === 'all') return posts;
        return posts.filter((item) => item.type === type);
    }, [posts, type]);

    const title = mode === 'tag'
        ? `برچسب: ${slug}`
        : mode === 'category'
            ? (categories.find((item) => item.slug === slug)?.name || 'دسته‌بندی')
            : 'مجله سلامت تات کیدز';

    return (
        <div>
            <NewsHeader categories={home ? home.categories : []} />
            <main className="news-page-container">
                <header className="news-page-header">
                    <h1>{title}</h1>
                    <p>مقاله‌ها، اخبار، ویدیوها و پادکست‌های تخصصی برای والدین</p>
                </header>
                {loading && <p>در حال بارگذاری...</p>}
                {error && <p className="error-message">{error}</p>}
                {!loading && home && (
                    <>
                        {mode === 'home' && <HeroSlider slides={(home.hero || []).map((item) => ({ ...item, track: true }))} />}
                        <div className="magazine-type-tabs magazine-filters">
                            {[
                                { id: 'all', label: 'همه' },
                                { id: 'article', label: 'مقاله‌ها' },
                                { id: 'news', label: 'اخبار' },
                                { id: 'video', label: 'ویدیوها' },
                                { id: 'podcast', label: 'پادکست‌ها' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={type === item.id ? 'is-active' : ''}
                                    onClick={() => {
                                        setType(item.id);
                                        if (mode === 'home') {
                                            history.replace(item.id === 'all' ? '/news' : `/news?type=${item.id}`);
                                        }
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="magazine-layout">
                            <div>
                                <section className="news-section">
                                    <h2>{mode === 'home' ? 'تازه‌ترین محتوا' : title}</h2>
                                    <div className="articles-list">
                                        {visiblePosts.map((post) => (
                                            <Link to={postHref(post)} key={post.id} className="article-list-item">
                                                <img
                                                    src={post.featuredImageUrl || 'https://placehold.co/300x200/0f766e/FFFFFF?text=مجله'}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                                <div className="article-list-item-content">
                                                    <span className="article-type-badge">{typeLabel(post.type)}</span>
                                                    <h3>{post.title}</h3>
                                                    <p className="article-summary">{post.summary}</p>
                                                    <span className="read-more">
                                                        {post.type === 'podcast'
                                                            ? `${post.listeningTimeMinutes || 1} دقیقه شنیدن`
                                                            : `${post.readingTimeMinutes || 1} دقیقه مطالعه`}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                                {mode === 'home' && type === 'all' && (home.videos || []).length > 0 && (
                                    <section id="educational-videos" className="news-section">
                                        <h2>ویدیوهای آموزشی</h2>
                                        <div className="articles-grid">
                                            {home.videos.map((video) => (
                                                <Link to={postHref(video)} key={video.id} className="article-card">
                                                    <img src={video.featuredImageUrl} alt="" loading="lazy" decoding="async" />
                                                    <div className="article-card-content">
                                                        <span className="article-type-badge">ویدیو</span>
                                                        <h3>{video.title}</h3>
                                                        <p className="article-summary">{video.summary}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {mode === 'home' && type === 'all' && (home.latestNews || []).length > 0 && (
                                    <section id="news-section" className="news-section">
                                        <h2>اخبار</h2>
                                        <div className="articles-list">
                                            {home.latestNews.map((post) => (
                                                <Link to={postHref(post)} key={post.id} className="article-list-item">
                                                    <img
                                                        src={post.featuredImageUrl || 'https://placehold.co/300x200/0f766e/FFFFFF?text=اخبار'}
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    <div className="article-list-item-content">
                                                        <span className="article-type-badge">{typeLabel(post.type)}</span>
                                                        <h3>{post.title}</h3>
                                                        <p className="article-summary">{post.summary}</p>
                                                        <span className="read-more">{post.readingTimeMinutes || 1} دقیقه مطالعه</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {mode === 'home' && (home.podcasts || []).length > 0 && (
                                    <section className="podcast-section">
                                        <h2>پادکست‌های تات کیدز</h2>
                                        <div className="podcasts-grid">
                                            {home.podcasts.map((podcast) => (
                                                <Link to={postHref(podcast)} key={podcast.id} className="podcast-card">
                                                    <img src={podcast.featuredImageUrl} alt="" loading="lazy" decoding="async" />
                                                    <div className="podcast-card-content">
                                                        <h3>{podcast.title}</h3>
                                                        <p>{podcast.summary}</p>
                                                        <span className="podcast-duration">{podcast.duration || `${podcast.listeningTimeMinutes} دقیقه`}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                            <aside className="sidebar-column magazine-desktop-ad">
                                {sidebarAdsFromHome(home, { allowHeroFallback: mode !== 'home' }).map((banner) => (
                                    <AdBanner
                                        key={banner.id}
                                        banner={banner}
                                        className={banner.placement === 'sidebar-300x600' ? 'magazine-ad--300x600' : 'magazine-ad--300x250'}
                                    />
                                ))}
                                <section className="sidebar-section">
                                    <h2>برچسب‌ها</h2>
                                    <div className="magazine-tags">
                                        {(home.tags || []).map((tag) => (
                                            <Link key={tag.id} to={`/news/tag/${tag.slug}`}>#{tag.name}</Link>
                                        ))}
                                    </div>
                                </section>
                            </aside>
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default NewsPage;
