import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatToShamsi } from '../utils/dateConverter';
import { injectHeadingIds, typeLabel } from '../utils/magazine';
import NewsHeader from './NewsHeader';
import Footer from './Footer';
import SeoHead from './magazine/SeoHead';
import VideoPlayer from './magazine/VideoPlayer';
import AudioPlayer from './magazine/AudioPlayer';
import ShareButtons from './magazine/ShareButtons';
import TableOfContents from './magazine/TableOfContents';
import AuthorBox, { RelatedArticles } from './magazine/AuthorBox';
import CommentThread from './magazine/CommentThread';
import { AdBanner } from './magazine/HeroSlider';
import './ArticleDetailPage.css';
import './magazine/Magazine.css';

const ArticleDetailPage = () => {
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [postRes, bannerRes] = await Promise.all([
                fetch(`/api/magazine/posts/${encodeURIComponent(id)}`),
                fetch('/api/magazine/banners?placement=all')
            ]);
            if (!postRes.ok) throw new Error('محتوا یافت نشد');
            setPost(await postRes.json());
            if (bannerRes.ok) {
                const all = await bannerRes.json();
                const sidebar = all.filter((item) => String(item.placement).startsWith('sidebar'));
                setBanners(sidebar.length ? sidebar : all.filter((item) => item.placement === 'hero'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    if (loading) return <p>در حال بارگذاری...</p>;
    if (error) return <p className="error-message">{error}</p>;
    if (!post) return <p>محتوا یافت نشد.</p>;

    const html = injectHeadingIds(post.content);
    const timeLabel = post.type === 'podcast'
        ? `${post.listeningTimeMinutes || 1} دقیقه شنیدن`
        : `${post.readingTimeMinutes || 1} دقیقه مطالعه`;

    return (
        <div>
            <SeoHead post={post} />
            <NewsHeader />
            <main className="article-detail-container magazine-detail">
                <div className="magazine-detail-main">
                    <nav className="magazine-crumbs" aria-label="مسیر صفحه">
                        {(post.breadcrumbs || []).map((crumb, index) => (
                            <span key={`${crumb.href}-${index}`}>
                                {index > 0 && ' / '}
                                {crumb.href ? <Link to={crumb.href}>{crumb.name}</Link> : crumb.name}
                            </span>
                        ))}
                        <span> / {post.title}</span>
                    </nav>
                    <header className="article-detail-header">
                        <span className="article-type-badge">{typeLabel(post.type)}</span>
                        <h1>{post.title}</h1>
                        <p className="article-meta magazine-meta-row">
                            <span>انتشار: {formatToShamsi(post.publishedAt || post.createdAt)}</span>
                            <span>{timeLabel}</span>
                            {post.category && (
                                <Link to={`/news/category/${post.category.slug}`}>{post.category.name}</Link>
                            )}
                        </p>
                    </header>
                    {post.type === 'video' && <VideoPlayer post={post} />}
                    {post.type === 'podcast' && <AudioPlayer post={post} />}
                    {post.type === 'article' && post.featuredImageUrl && (
                        <img
                            src={post.featuredImageUrl}
                            alt={post.title}
                            className="article-detail-image"
                            loading="eager"
                            decoding="async"
                        />
                    )}
                    <ShareButtons title={post.title} />
                    <TableOfContents html={html} />
                    <div className="article-detail-content" dangerouslySetInnerHTML={{ __html: html }} />
                    {post.type === 'podcast' && post.transcript && (
                        <section className="magazine-transcript">
                            <h2>رونوشت متنی</h2>
                            <p>{post.transcript}</p>
                        </section>
                    )}
                    <div className="magazine-tags">
                        {(post.tags || []).map((tag) => (
                            <Link key={tag.id} to={`/news/tag/${tag.slug}`}>#{tag.name}</Link>
                        ))}
                    </div>
                    <AuthorBox authors={post.authors} />
                    <div className="magazine-mobile-ad">
                        {banners[0] && <AdBanner banner={banners[0]} className="magazine-ad--300x250" />}
                    </div>
                    <RelatedArticles items={post.related} />
                    <CommentThread postId={post.id} comments={post.comments || []} onSubmitted={load} />
                </div>
                <aside className="sidebar-column magazine-desktop-ad">
                    {banners.map((banner) => (
                        <AdBanner
                            key={banner.id}
                            banner={banner}
                            className={banner.placement === 'sidebar-300x600' ? 'magazine-ad--300x600' : 'magazine-ad--300x250'}
                        />
                    ))}
                </aside>
            </main>
            <Footer />
        </div>
    );
};

export default ArticleDetailPage;
