import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatToShamsi } from '../utils/dateConverter';
import NewsHeader from './NewsHeader';
import Footer from './Footer';
import './ArticleDetailPage.css';

const ArticleDetailPage = () => {
    const { id } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const response = await fetch(`/api/news/${id}`);
                if (!response.ok) throw new Error('Failed to fetch article');
                const data = await response.json();
                setArticle(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [id]);

    if (loading) return <p>در حال بارگذاری مقاله...</p>;
    if (error) return <p>خطا: {error}</p>;
    if (!article) return <p>مقاله یافت نشد.</p>;

    return (
        <div>
            <NewsHeader />
            <main className="article-detail-container">
                <header className="article-detail-header">
                    <h1>{article.title}</h1>
                    <p className="article-meta">
                        منتشر شده در: {formatToShamsi(article.createdAt)}
                    </p>
                </header>
                {article.imageUrl && (
                    <img
                        src={`${article.imageUrl}`}
                        alt={article.title}
                        className="article-detail-image"
                    />
                )}
                <div
                    className="article-detail-content"
                    dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}
                />
            </main>
            <Footer />
        </div>
    );
};

export default ArticleDetailPage;
