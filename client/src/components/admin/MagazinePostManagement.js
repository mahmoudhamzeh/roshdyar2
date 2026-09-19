import React, { useEffect, useMemo, useState } from 'react';
import RichTextEditor from '../magazine/RichTextEditor';
import { typeLabel } from '../../utils/magazine';
import './ArticleManagement.css';
import '../magazine/Magazine.css';

const TYPE_FILTERS = [
    { id: 'all', label: 'همه' },
    { id: 'article', label: 'مقاله' },
    { id: 'news', label: 'خبر' },
    { id: 'video', label: 'ویدیو' },
    { id: 'podcast', label: 'پادکست' }
];

const emptyForm = {
    type: 'article',
    title: '',
    summary: '',
    content: '',
    categoryId: '',
    videoUrl: '',
    audioUrl: '',
    transcript: '',
    duration: '',
    featured: false,
    featuredOrder: 0,
    seoTitle: '',
    seoDescription: '',
    tagIds: [],
    authorIds: [],
    relatedIds: []
};

const MagazinePostManagement = ({ defaultType }) => {
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [form, setForm] = useState({ ...emptyForm, type: defaultType || 'article' });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [files, setFiles] = useState({});
    const [typeFilter, setTypeFilter] = useState(defaultType || 'all');

    const flatten = (nodes, acc = []) => {
        nodes.forEach((node) => {
            acc.push(node);
            if (node.children) flatten(node.children, acc);
        });
        return acc;
    };

    const load = async () => {
        const [postRes, catRes, tagRes, authorRes] = await Promise.all([
            fetch('/api/magazine/posts?all=1'),
            fetch('/api/magazine/categories'),
            fetch('/api/magazine/tags'),
            fetch('/api/magazine/authors')
        ]);
        if (postRes.ok) setPosts(await postRes.json());
        if (catRes.ok) setCategories(flatten(await catRes.json()));
        if (tagRes.ok) setTags(await tagRes.json());
        if (authorRes.ok) setAuthors(await authorRes.json());
    };

    useEffect(() => { load(); }, []);

    const visible = useMemo(
        () => (typeFilter === 'all' ? posts : posts.filter((item) => item.type === typeFilter)),
        [posts, typeFilter]
    );

    const uploadInline = async (file) => {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/admin/magazine/upload', { method: 'POST', body });
        if (!res.ok) return '';
        const data = await res.json();
        return data.url;
    };

    const submit = async (e) => {
        e.preventDefault();
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (Array.isArray(value)) body.append(key, JSON.stringify(value));
            else if (typeof value === 'boolean') body.append(key, value ? '1' : '0');
            else if (value != null) body.append(key, value);
        });
        if (files.image) body.append('image', files.image);
        if (files.videoFile) body.append('videoFile', files.videoFile);
        if (files.audioFile) body.append('audioFile', files.audioFile);
        if (files.captions) body.append('captions', files.captions);
        const url = editingId ? `/api/admin/magazine/posts/${editingId}` : '/api/admin/magazine/posts';
        const res = await fetch(url, { method: editingId ? 'PUT' : 'POST', body });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'ذخیره ناموفق بود');
            return;
        }
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm, type: defaultType || 'article' });
        setFiles({});
        load();
    };

    const edit = (post) => {
        setEditingId(post.id);
        setForm({
            type: post.type,
            title: post.title,
            summary: post.summary,
            content: post.content,
            categoryId: post.categoryId || '',
            videoUrl: post.videoUrl || '',
            audioUrl: post.audioUrl || '',
            transcript: post.transcript || '',
            duration: post.duration || '',
            featured: !!post.featured,
            featuredOrder: post.featuredOrder || 0,
            seoTitle: post.seoTitle || '',
            seoDescription: post.seoDescription || '',
            tagIds: (post.tags || []).map((item) => item.id),
            authorIds: (post.authors || []).map((item) => item.id),
            relatedIds: post.relatedIds || []
        });
        setShowForm(true);
    };

    const remove = async (id) => {
        if (!window.confirm('این محتوا حذف شود؟')) return;
        await fetch(`/api/admin/magazine/posts/${id}`, { method: 'DELETE' });
        load();
    };

    const toggleId = (key, id) => {
        setForm((prev) => {
            const current = prev[key] || [];
            return {
                ...prev,
                [key]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
            };
        });
    };

    return (
        <div className="article-management">
            <h2>مدیریت محتوای مجله سلامت</h2>
            <div className="magazine-filters">
                {TYPE_FILTERS.map((item) => (
                    <button key={item.id} type="button" className={typeFilter === item.id ? 'is-active' : ''} onClick={() => setTypeFilter(item.id)}>
                        {item.label}
                    </button>
                ))}
            </div>
            <button type="button" className="btn-add-article" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'پنهان کردن فرم' : 'افزودن محتوا'}
            </button>
            {showForm && (
                <form className="article-form" onSubmit={submit}>
                    <label>نوع محتوا</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="article">مقاله متنی</option>
                        <option value="news">خبر</option>
                        <option value="video">مقاله ویدیویی</option>
                        <option value="podcast">پادکست / صوتی</option>
                    </select>
                    <input required placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <textarea placeholder="خلاصه" rows="3" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
                    <label>متن کامل (ویرایشگر غنی)</label>
                    <RichTextEditor
                        value={form.content}
                        onChange={(content) => setForm((prev) => ({ ...prev, content }))}
                        onUpload={uploadInline}
                    />
                    <label>دسته‌بندی</label>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                        <option value="">بدون دسته</option>
                        {categories.map((item) => (
                            <option key={item.id} value={item.id}>{item.parentId ? `— ${item.name}` : item.name}</option>
                        ))}
                    </select>
                    <label>نویسندگان</label>
                    <div className="magazine-filters">
                        {authors.map((author) => (
                            <button key={author.id} type="button" className={form.authorIds.includes(author.id) ? 'is-active' : ''} onClick={() => toggleId('authorIds', author.id)}>
                                {author.fullName}
                            </button>
                        ))}
                    </div>
                    <label>برچسب‌ها</label>
                    <div className="magazine-filters">
                        {tags.map((tag) => (
                            <button key={tag.id} type="button" className={form.tagIds.includes(tag.id) ? 'is-active' : ''} onClick={() => toggleId('tagIds', tag.id)}>
                                {tag.name}
                            </button>
                        ))}
                    </div>
                    <label>مقالات مرتبط (انتخاب دستی)</label>
                    <select
                        multiple
                        value={form.relatedIds.map(String)}
                        onChange={(e) => setForm({ ...form, relatedIds: Array.from(e.target.selectedOptions).map((opt) => Number(opt.value)) })}
                    >
                        {posts.filter((item) => item.id !== editingId).map((item) => (
                            <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                    </select>
                    <label>تصویر شاخص / کاور</label>
                    <input type="file" accept="image/*,.webp,.avif" onChange={(e) => setFiles({ ...files, image: e.target.files[0] })} />
                    {form.type === 'video' && (
                        <>
                            <input placeholder="لینک ویدیو (یوتیوب، آپارات، ابر آروان)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                            <label>آپلود فایل ویدیو</label>
                            <input type="file" accept="video/*" onChange={(e) => setFiles({ ...files, videoFile: e.target.files[0] })} />
                            <label>فایل زیرنویس (VTT)</label>
                            <input type="file" accept=".vtt,text/vtt" onChange={(e) => setFiles({ ...files, captions: e.target.files[0] })} />
                        </>
                    )}
                    {form.type === 'podcast' && (
                        <>
                            <input placeholder="لینک فایل صوتی" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
                            <label>آپلود فایل صوتی</label>
                            <input type="file" accept="audio/*" onChange={(e) => setFiles({ ...files, audioFile: e.target.files[0] })} />
                            <input placeholder="مدت (مثلاً ۲۵:۴۰)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                            <textarea placeholder="رونوشت متنی" rows="5" value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} />
                        </>
                    )}
                    <label>
                        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                        {' '}نمایش در اسلایدر ویژه
                    </label>
                    <input type="number" placeholder="ترتیب اسلایدر" value={form.featuredOrder} onChange={(e) => setForm({ ...form, featuredOrder: e.target.value })} />
                    <input placeholder="عنوان سئو" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
                    <textarea placeholder="توضیح سئو" rows="2" value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
                    <button type="submit">{editingId ? 'به‌روزرسانی' : 'ذخیره'}</button>
                </form>
            )}
            <div className="articles-list">
                {visible.map((post) => (
                    <div key={post.id} className="article-item">
                        <div className="article-item-info">
                            <h3>{post.title}</h3>
                            <p>{typeLabel(post.type)} · {post.categoryName} · {post.readingTimeMinutes} دقیقه</p>
                        </div>
                        <div className="article-item-actions">
                            <button type="button" className="btn-edit" onClick={() => edit(post)}>ویرایش</button>
                            <button type="button" className="btn-delete" onClick={() => remove(post.id)}>حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MagazinePostManagement;
