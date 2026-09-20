import React, { useEffect, useMemo, useState } from 'react';
import RichTextEditor from '../magazine/RichTextEditor';
import MagazineCategoryPicker from './MagazineCategoryPicker';
import { categoryPathLabel, typeLabel } from '../../utils/magazine';
import './ArticleManagement.css';
import './MagazineAdmin.css';
import '../magazine/Magazine.css';

const TYPE_FILTERS = [
    { id: 'all', label: 'همه' },
    { id: 'article', label: 'مقاله' },
    { id: 'news', label: 'خبر' },
    { id: 'video', label: 'ویدیو' },
    { id: 'podcast', label: 'پادکست' }
];

const TYPE_OPTIONS = [
    { id: 'article', label: 'مقاله متنی' },
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
    const [categoryTree, setCategoryTree] = useState([]);
    const [tags, setTags] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [form, setForm] = useState({ ...emptyForm, type: defaultType || 'article' });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [files, setFiles] = useState({});
    const [typeFilter, setTypeFilter] = useState(defaultType || 'all');
    const [saving, setSaving] = useState(false);
    const [relatedQuery, setRelatedQuery] = useState('');

    const load = async () => {
        const [postRes, catRes, tagRes, authorRes] = await Promise.all([
            fetch('/api/magazine/posts?all=1'),
            fetch('/api/magazine/categories'),
            fetch('/api/magazine/tags'),
            fetch('/api/magazine/authors')
        ]);
        if (postRes.ok) setPosts(await postRes.json());
        if (catRes.ok) setCategoryTree(await catRes.json());
        if (tagRes.ok) setTags(await tagRes.json());
        if (authorRes.ok) setAuthors(await authorRes.json());
    };

    useEffect(() => { load(); }, []);

    const visible = useMemo(
        () => (typeFilter === 'all' ? posts : posts.filter((item) => item.type === typeFilter)),
        [posts, typeFilter]
    );

    const relatedChoices = useMemo(() => {
        const needle = relatedQuery.trim();
        return posts
            .filter((item) => item.id !== editingId)
            .filter((item) => !needle || String(item.title || '').includes(needle))
            .slice(0, 12);
    }, [posts, editingId, relatedQuery]);

    const uploadInline = async (file) => {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/admin/magazine/upload', { method: 'POST', body });
        if (!res.ok) return '';
        const data = await res.json();
        return data.url;
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm, type: defaultType || 'article' });
        setFiles({});
        setRelatedQuery('');
    };

    const submit = async (e) => {
        if (e) e.preventDefault();
        if (!String(form.title || '').trim()) {
            alert('عنوان را بنویسید.');
            return;
        }
        setSaving(true);
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
        setSaving(false);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'ذخیره ناموفق بود');
            return;
        }
        closeForm();
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
        setFiles({});
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const coverPreview = useMemo(() => {
        if (files.image) return URL.createObjectURL(files.image);
        const current = posts.find((item) => item.id === editingId);
        return (current && current.featuredImageUrl) || '';
    }, [files.image, posts, editingId]);

    return (
        <div className="article-management">
            <h2>مدیریت محتوای مجله سلامت</h2>
            <p className="magazine-muted">عنوان و متن را بزرگ بنویسید. دسته، نویسنده و برچسب را از ستون کناری انتخاب کنید.</p>
            {!showForm && (
                <>
                    <div className="magazine-filters">
                        {TYPE_FILTERS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={typeFilter === item.id ? 'is-active' : ''}
                                onClick={() => setTypeFilter(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="btn-add-article"
                        onClick={() => {
                            setEditingId(null);
                            setForm({ ...emptyForm, type: defaultType || 'article' });
                            setShowForm(true);
                        }}
                    >
                        نوشتن مطلب جدید
                    </button>
                </>
            )}

            {showForm && (
                <form className="magazine-composer" onSubmit={submit}>
                    <div className="magazine-composer-bar">
                        <h3>{editingId ? 'ویرایش مطلب' : 'نوشتن مطلب جدید'}</h3>
                        <div className="magazine-composer-actions">
                            <button type="button" className="is-cancel" onClick={closeForm}>انصراف</button>
                            <button type="submit" className="is-save" disabled={saving}>
                                {saving ? 'در حال ذخیره…' : (editingId ? 'ذخیره تغییرات' : 'انتشار / ذخیره')}
                            </button>
                        </div>
                    </div>
                    <div className="magazine-composer-grid">
                        <div className="magazine-composer-main">
                            <input
                                className="magazine-composer-title"
                                required
                                placeholder="عنوان مطلب را اینجا بنویسید"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                            <textarea
                                className="magazine-composer-summary"
                                placeholder="یک خلاصه کوتاه برای کارت مقاله و نتایج جستجو"
                                rows="3"
                                value={form.summary}
                                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                            />
                            <label>متن کامل</label>
                            <RichTextEditor
                                value={form.content}
                                onChange={(content) => setForm((prev) => ({ ...prev, content }))}
                                onUpload={uploadInline}
                            />
                        </div>
                        <aside className="magazine-composer-side">
                            <label>
                                نوع محتوا
                                <div className="magazine-type-picks">
                                    {TYPE_OPTIONS.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={form.type === item.id ? 'is-on' : ''}
                                            onClick={() => setForm({ ...form, type: item.id })}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </label>
                            <label>
                                دسته‌بندی
                                <MagazineCategoryPicker
                                    tree={categoryTree}
                                    value={form.categoryId}
                                    onChange={(categoryId) => setForm({ ...form, categoryId })}
                                />
                            </label>
                            <label>
                                نویسندگان
                                <div className="magazine-chip-wrap">
                                    {authors.map((author) => (
                                        <button
                                            key={author.id}
                                            type="button"
                                            className={form.authorIds.includes(author.id) ? 'is-on' : ''}
                                            onClick={() => toggleId('authorIds', author.id)}
                                        >
                                            {author.fullName}
                                        </button>
                                    ))}
                                </div>
                            </label>
                            <label>
                                برچسب‌ها
                                <div className="magazine-chip-wrap">
                                    {tags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={form.tagIds.includes(tag.id) ? 'is-on' : ''}
                                            onClick={() => toggleId('tagIds', tag.id)}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            </label>
                            <label>
                                تصویر شاخص
                                {coverPreview && <img className="magazine-cover-preview" src={coverPreview} alt="" />}
                                <input
                                    type="file"
                                    accept="image/*,.webp,.avif"
                                    onChange={(e) => setFiles({ ...files, image: e.target.files[0] })}
                                />
                            </label>
                            {form.type === 'video' && (
                                <>
                                    <label>
                                        لینک ویدیو
                                        <input
                                            placeholder="یوتیوب، آپارات یا ابر آروان"
                                            value={form.videoUrl}
                                            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                                        />
                                    </label>
                                    <label>
                                        فایل ویدیو
                                        <input type="file" accept="video/*" onChange={(e) => setFiles({ ...files, videoFile: e.target.files[0] })} />
                                    </label>
                                    <label>
                                        زیرنویس VTT
                                        <input type="file" accept=".vtt,text/vtt" onChange={(e) => setFiles({ ...files, captions: e.target.files[0] })} />
                                    </label>
                                </>
                            )}
                            {form.type === 'podcast' && (
                                <>
                                    <label>
                                        لینک فایل صوتی
                                        <input
                                            value={form.audioUrl}
                                            onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
                                        />
                                    </label>
                                    <label>
                                        آپلود صوت
                                        <input type="file" accept="audio/*" onChange={(e) => setFiles({ ...files, audioFile: e.target.files[0] })} />
                                    </label>
                                    <label>
                                        مدت
                                        <input
                                            placeholder="مثلاً ۲۵:۴۰"
                                            value={form.duration}
                                            onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                        />
                                    </label>
                                    <label>
                                        رونوشت
                                        <textarea
                                            rows="4"
                                            value={form.transcript}
                                            onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                                        />
                                    </label>
                                </>
                            )}
                            <details className="magazine-more-block">
                                <summary>سئو، اسلایدر و مطالب مرتبط</summary>
                                <label>
                                    <span>
                                        <input
                                            type="checkbox"
                                            checked={form.featured}
                                            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                        />
                                        {' '}نمایش در اسلایدر ویژه
                                    </span>
                                </label>
                                <label>
                                    ترتیب اسلایدر
                                    <input
                                        type="number"
                                        value={form.featuredOrder}
                                        onChange={(e) => setForm({ ...form, featuredOrder: e.target.value })}
                                    />
                                </label>
                                <label>
                                    عنوان سئو
                                    <input
                                        value={form.seoTitle}
                                        onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                                    />
                                </label>
                                <label>
                                    توضیح سئو
                                    <textarea
                                        rows="2"
                                        value={form.seoDescription}
                                        onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                                    />
                                </label>
                                <label>
                                    مطالب مرتبط
                                    <input
                                        placeholder="جستجوی عنوان…"
                                        value={relatedQuery}
                                        onChange={(e) => setRelatedQuery(e.target.value)}
                                    />
                                    <div className="magazine-chip-wrap">
                                        {relatedChoices.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={form.relatedIds.includes(item.id) ? 'is-on' : ''}
                                                onClick={() => toggleId('relatedIds', item.id)}
                                            >
                                                {item.title}
                                            </button>
                                        ))}
                                    </div>
                                </label>
                            </details>
                        </aside>
                    </div>
                </form>
            )}

            {!showForm && (
                <div className="articles-list">
                    {visible.map((post) => (
                        <div key={post.id} className="article-item">
                            <div className="article-item-info">
                                <h3>{post.title}</h3>
                                <p>
                                    {typeLabel(post.type)}
                                    {post.categoryId ? ` · ${categoryPathLabel(categoryTree, post.categoryId) || post.categoryName}` : post.categoryName ? ` · ${post.categoryName}` : ''}
                                    {post.readingTimeMinutes ? ` · ${post.readingTimeMinutes} دقیقه` : ''}
                                </p>
                            </div>
                            <div className="article-item-actions">
                                <button type="button" className="btn-edit" onClick={() => edit(post)}>ویرایش</button>
                                <button type="button" className="btn-delete" onClick={() => remove(post.id)}>حذف</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MagazinePostManagement;
