import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NewsHeader from './NewsHeader';
import Footer from './Footer';
import { postHref, typeLabel, sidebarAdsFromHome } from '../utils/magazine';
import { AdBanner } from './magazine/HeroSlider';
import './NewsPage.css';
import './magazine/Magazine.css';

const AuthorPage = () => {
    const { slug } = useParams();
    const [author, setAuthor] = useState(null);
    const [home, setHome] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/magazine/authors/${slug}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('نویسنده یافت نشد'))))
            .then(setAuthor)
            .catch((err) => setError(err.message));
        fetch('/api/magazine/home')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setHome(data || null))
            .catch(() => {});
    }, [slug]);

    return (
        <div>
            <NewsHeader />
            <main className="news-page-container">
                {error && <p className="error-message">{error}</p>}
                {author && (
                    <>
                        <header className="news-page-header">
                            {author.photoUrl && <img src={author.photoUrl} alt="" width="96" height="96" style={{ borderRadius: '50%' }} />}
                            <h1>{author.fullName}</h1>
                            <p>{author.specialty}</p>
                            {author.bio && <p>{author.bio}</p>}
                        </header>
                        <div className="magazine-layout">
                            <div className="articles-list">
                                {(author.posts || []).map((post) => (
                                    <Link key={post.id} to={postHref(post)} className="article-list-item">
                                        <img src={post.featuredImageUrl} alt="" loading="lazy" />
                                        <div className="article-list-item-content">
                                            <span className="article-type-badge">{typeLabel(post.type)}</span>
                                            <h3>{post.title}</h3>
                                            <p className="article-summary">{post.summary}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <aside className="sidebar-column magazine-desktop-ad">
                                {sidebarAdsFromHome(home, { allowHeroFallback: true }).map((banner) => (
                                    <AdBanner
                                        key={banner.id}
                                        banner={banner}
                                        className={banner.placement === 'sidebar-300x600' ? 'magazine-ad--300x600' : 'magazine-ad--300x250'}
                                    />
                                ))}
                            </aside>
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default AuthorPage;
