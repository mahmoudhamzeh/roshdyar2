import React, { useState, useEffect } from 'react';
import './ArticleManagement.css';

const ArticleManagement = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newArticle, setNewArticle] = useState({ title: '', summary: '', content: '', category: 'عمومی', image: null });

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error('Failed to fetch articles');
            const data = await response.json();
            setArticles(data);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewArticle(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setNewArticle(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', newArticle.title);
        formData.append('summary', newArticle.summary);
        formData.append('content', newArticle.content);
        formData.append('category', newArticle.category);
        if (newArticle.image) {
            formData.append('image', newArticle.image);
        }

        try {
            const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch('/api/admin/news', {
                method: 'POST',
                headers: { 'x-user-id': adminUser.id },
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to create article');

            fetchArticles(); // Re-fetch to get the new list
            setShowForm(false);
            setNewArticle({ title: '', summary: '', content: '', category: 'عمومی', image: null });
            alert('مقاله با موفقیت ایجاد شد');
        } catch (err) {
            console.error(err.message);
            alert(`خطا در ایجاد مقاله: ${err.message}`);
        }
    };

    const handleDelete = async (articleId) => {
        if (window.confirm('آیا از حذف این مقاله اطمینان دارید؟')) {
            try {
                const adminUser = JSON.parse(localStorage.getItem('loggedInUser'));
                await fetch(`/api/admin/news/${articleId}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': adminUser.id }
                });
                fetchArticles(); // Re-fetch
                alert('مقاله حذف شد');
            } catch (err) {
                alert(`خطا در حذف: ${err.message}`);
            }
        }
    };

    return (
        <div className="article-management">
            <h2>مدیریت مقالات</h2>
            <button onClick={() => setShowForm(!showForm)} className="btn-add-article">
                {showForm ? 'پنهان کردن فرم' : 'افزودن مقاله جدید'}
            </button>

            {showForm && (
                <form onSubmit={handleSubmit} className="article-form">
                    <input type="text" name="title" value={newArticle.title} onChange={handleInputChange} placeholder="عنوان" required />
                    <textarea name="summary" value={newArticle.summary} onChange={handleInputChange} placeholder="خلاصه مقاله" rows="3"></textarea>
                    <textarea name="content" value={newArticle.content} onChange={handleInputChange} placeholder="محتوای کامل" rows="10" required></textarea>
                    <label>دسته بندی</label>
                    <select name="category" value={newArticle.category} onChange={handleInputChange}>
                        <option value="عمومی">عمومی</option>
                        <option value="بیماری">بیماری</option>
                        <option value="آموزشی">آموزشی</option>
                        <option value="تغذیه">تغذیه</option>
                        <option value="مادر و کودک">مادر و کودک</option>
                        <option value="تربیتی">تربیتی</option>
                    </select>
                    <label>تصویر مقاله (اختیاری)</label>
                    <input type="file" name="image" onChange={handleFileChange} />
                    <button type="submit">ذخیره مقاله</button>
                </form>
            )}

            <div className="articles-list">
                {loading ? <p>در حال بارگذاری...</p> : articles.map(article => (
                    <div key={article.id} className="article-item">
                        <div className="article-item-info">
                            <h3>{article.title}</h3>
                            <p>{article.summary}</p>
                            <small>ایجاد شده در: {new Date(article.createdAt).toLocaleDateString('fa-IR')}</small>
                        </div>
                        <div className="article-item-actions">
                            <button className="btn-edit">ویرایش</button>
                            <button onClick={() => handleDelete(article.id)} className="btn-delete">حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArticleManagement;
