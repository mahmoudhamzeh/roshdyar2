import React, { useEffect, useState } from 'react';
import MagazineCategoryPicker from './MagazineCategoryPicker';
import { categoryPathLabel } from '../../utils/magazine';
import './ArticleManagement.css';
import './MagazineAdmin.css';
import '../magazine/Magazine.css';

const STATUS_LABEL = {
    pending: 'در انتظار',
    approved: 'تأیید شده',
    rejected: 'رد شده'
};

const CategoryTreeList = ({ nodes, depth = 0, onDelete }) => (
    <ul className={`mag-cat-tree depth-${depth}`}>
        {(nodes || []).map((node) => (
            <li key={node.id}>
                <div className="mag-cat-row">
                    <div>
                        <strong>{node.name}</strong>
                        {(node.children || []).length > 0
                            ? <em> {node.children.length} زیرگروه</em>
                            : <span className="mag-cat-leaf"> دسته پایانی</span>}
                    </div>
                    <button
                        type="button"
                        className="btn-delete"
                        onClick={() => onDelete(node)}
                    >
                        حذف
                    </button>
                </div>
                {(node.children || []).length > 0 && (
                    <CategoryTreeList nodes={node.children} depth={depth + 1} onDelete={onDelete} />
                )}
            </li>
        ))}
    </ul>
);

export const MagazineTaxonomy = () => {
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [catForm, setCatForm] = useState({ name: '', parentId: '', slug: '' });
    const [tagName, setTagName] = useState('');

    const load = async () => {
        const [c, t] = await Promise.all([fetch('/api/magazine/categories'), fetch('/api/magazine/tags')]);
        if (c.ok) setCategories(await c.json());
        if (t.ok) setTags(await t.json());
    };
    useEffect(() => { load(); }, []);

    const saveCategory = async (e) => {
        e.preventDefault();
        await fetch('/api/admin/magazine/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(catForm)
        });
        setCatForm({ name: '', parentId: '', slug: '' });
        load();
    };

    const saveTag = async (e) => {
        e.preventDefault();
        await fetch('/api/admin/magazine/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tagName })
        });
        setTagName('');
        load();
    };

    const removeCategory = async (node) => {
        const path = categoryPathLabel(categories, node.id) || node.name;
        if (!window.confirm(`دسته «${path}» حذف شود؟`)) return;
        await fetch(`/api/admin/magazine/categories/${node.id}`, { method: 'DELETE' });
        load();
    };

    return (
        <div className="article-management">
            <h2>دسته‌بندی و برچسب‌های مجله</h2>
            <p className="magazine-muted">دسته‌ها به‌صورت درخت نمایش داده می‌شوند؛ اول گروه اصلی، بعد زیرگروه.</p>
            <form className="article-form" onSubmit={saveCategory}>
                <h3>دسته جدید</h3>
                <input required placeholder="نام دسته" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                <input placeholder="نامک (اختیاری)" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} />
                <label>دسته والد</label>
                <MagazineCategoryPicker
                    tree={categories}
                    value={catForm.parentId}
                    onChange={(parentId) => setCatForm({ ...catForm, parentId })}
                    emptyLabel="دسته اصلی (بدون والد)"
                />
                <button type="submit">افزودن دسته</button>
            </form>
            <CategoryTreeList nodes={categories} onDelete={removeCategory} />
            <form className="article-form" onSubmit={saveTag}>
                <h3>برچسب جدید</h3>
                <input required placeholder="نام برچسب" value={tagName} onChange={(e) => setTagName(e.target.value })} />
                <button type="submit">افزودن برچسب</button>
            </form>
            <div className="magazine-tags">
                {tags.map((tag) => (
                    <span key={tag.id}>
                        #{tag.name}
                        <button type="button" onClick={async () => {
                            await fetch(`/api/admin/magazine/tags/${tag.id}`, { method: 'DELETE' });
                            load();
                        }}>×</button>
                    </span>
                ))}
            </div>
        </div>
    );
};

export const MagazineAuthors = () => {
    const [authors, setAuthors] = useState([]);
    const [form, setForm] = useState({ firstName: '', lastName: '', specialty: '', bio: '', photo: null });
    const load = async () => {
        const res = await fetch('/api/magazine/authors');
        if (res.ok) setAuthors(await res.json());
    };
    useEffect(() => { load(); }, []);
    const submit = async (e) => {
        e.preventDefault();
        const body = new FormData();
        body.append('firstName', form.firstName);
        body.append('lastName', form.lastName);
        body.append('specialty', form.specialty);
        body.append('bio', form.bio);
        if (form.photo) body.append('photo', form.photo);
        await fetch('/api/admin/magazine/authors', { method: 'POST', body });
        setForm({ firstName: '', lastName: '', specialty: '', bio: '', photo: null });
        load();
    };
    return (
        <div className="article-management">
            <h2>نویسندگان و متخصصان</h2>
            <form className="article-form" onSubmit={submit}>
                <input required placeholder="نام" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <input required placeholder="نام خانوادگی" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                <input placeholder="تخصص / سمت" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                <textarea placeholder="بیوگرافی کوتاه" rows="4" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, photo: e.target.files[0] })} />
                <button type="submit">افزودن نویسنده</button>
            </form>
            {authors.map((author) => (
                <div key={author.id} className="article-item">
                    <div className="article-item-info">
                        <h3>{author.fullName}</h3>
                        <p>{author.specialty}</p>
                    </div>
                    <button type="button" className="btn-delete" onClick={async () => {
                        await fetch(`/api/admin/magazine/authors/${author.id}`, { method: 'DELETE' });
                        load();
                    }}>حذف</button>
                </div>
            ))}
        </div>
    );
};

export const MagazineComments = () => {
    const [comments, setComments] = useState([]);
    const [status, setStatus] = useState('pending');
    const [replyFor, setReplyFor] = useState(null);
    const [replyBody, setReplyBody] = useState('');
    const [sending, setSending] = useState(false);

    const load = async (next = status) => {
        const res = await fetch(`/api/admin/magazine/comments?status=${next}`);
        if (res.ok) setComments(await res.json());
    };
    useEffect(() => { load(status); }, [status]);

    const update = async (id, nextStatus) => {
        await fetch(`/api/admin/magazine/comments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        load(status);
    };

    const sendReply = async (comment) => {
        const body = replyBody.trim();
        if (body.length < 2) {
            alert('متن پاسخ را بنویسید.');
            return;
        }
        setSending(true);
        const res = await fetch(`/api/admin/magazine/comments/${comment.id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body })
        });
        setSending(false);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'ارسال پاسخ ناموفق بود');
            return;
        }
        setReplyFor(null);
        setReplyBody('');
        load(status === 'pending' ? 'approved' : status);
        if (status === 'pending') setStatus('approved');
    };

    const statusClass = (value) => {
        if (value === 'pending') return 'is-pending';
        if (value === 'rejected') return 'is-rejected';
        return '';
    };

    return (
        <div className="article-management">
            <h2>نظرات مجله</h2>
            <p className="magazine-muted">نظر را تأیید یا رد کنید. اگر لازم است، همان‌جا پاسخ تحریریه بفرستید.</p>
            <div className="magazine-filters">
                {['pending', 'approved', 'rejected', 'all'].map((item) => (
                    <button key={item} type="button" className={status === item ? 'is-active' : ''} onClick={() => setStatus(item)}>
                        {item === 'pending' ? 'در انتظار' : item === 'approved' ? 'تأیید شده' : item === 'rejected' ? 'رد شده' : 'همه'}
                    </button>
                ))}
            </div>
            {comments.length === 0 && <p className="magazine-muted">موردی در این فهرست نیست.</p>}
            {comments.map((comment) => (
                <div key={comment.id} className="article-item magazine-comment-card">
                    <div className="article-item-info">
                        <h3>{comment.postTitle}</h3>
                        <p>
                            {comment.authorName}
                            {comment.badge ? ` · ${comment.badge}` : ''}
                            {' '}
                            <span className={`magazine-status-pill ${statusClass(comment.status)} ${comment.isStaff ? 'is-staff' : ''}`}>
                                {comment.isStaff ? 'پاسخ تحریریه' : (STATUS_LABEL[comment.status] || comment.status)}
                            </span>
                        </p>
                        {comment.parentBody && (
                            <blockquote className="magazine-comment-quote">
                                پاسخ به {comment.parentAuthor || 'دیدگاه قبلی'}: {comment.parentBody}
                            </blockquote>
                        )}
                        <small>{comment.body}</small>
                        {replyFor === comment.id && (
                            <div className="magazine-comment-reply-box">
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    placeholder="پاسخ تحریریه را بنویسید. پس از ارسال، روی سایت دیده می‌شود."
                                />
                                <div className="magazine-composer-actions">
                                    <button type="button" className="is-cancel" onClick={() => { setReplyFor(null); setReplyBody(''); }}>
                                        انصراف
                                    </button>
                                    <button type="button" className="is-save" disabled={sending} onClick={() => sendReply(comment)}>
                                        {sending ? 'در حال ارسال…' : 'ارسال پاسخ'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="article-item-actions">
                        {!comment.isStaff && (
                            <button
                                type="button"
                                className="btn-edit"
                                onClick={() => {
                                    setReplyFor(comment.id);
                                    setReplyBody('');
                                }}
                            >
                                پاسخ
                            </button>
                        )}
                        {comment.status !== 'approved' && (
                            <button type="button" className="btn-edit" onClick={() => update(comment.id, 'approved')}>تأیید</button>
                        )}
                        {comment.status !== 'rejected' && (
                            <button type="button" className="btn-delete" onClick={() => update(comment.id, 'rejected')}>رد</button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const MagazineBanners = () => {
    const [banners, setBanners] = useState([]);
    const [form, setForm] = useState({
        placement: 'hero', title: '', subtitle: '', category: '', link: '', sortOrder: 0, expiresAt: '', image: null
    });
    const load = async () => {
        const res = await fetch('/api/magazine/banners?placement=all');
        if (res.ok) setBanners(await res.json());
    };
    useEffect(() => { load(); }, []);
    const submit = async (e) => {
        e.preventDefault();
        if (!form.image) {
            alert('تصویر بنر لازم است');
            return;
        }
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (key === 'image') body.append('image', value);
            else body.append(key, value);
        });
        await fetch('/api/admin/magazine/banners', { method: 'POST', body });
        setForm({ placement: 'hero', title: '', subtitle: '', category: '', link: '', sortOrder: 0, expiresAt: '', image: null });
        load();
    };
    return (
        <div className="article-management">
            <h2>بنرهای مجله سلامت</h2>
            <form className="article-form" onSubmit={submit}>
                <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
                    <option value="hero">اسلایدر صفحه اصلی</option>
                    <option value="sidebar-300x250">سایدبار ۳۰۰×۲۵۰</option>
                    <option value="sidebar-300x600">سایدبار ۳۰۰×۶۰۰</option>
                </select>
                <input placeholder="عنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <input placeholder="زیرعنوان" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                <input placeholder="دسته‌بندی نمایشی" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <input placeholder="لینک خروجی" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
                <input type="number" placeholder="ترتیب" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                <label>تاریخ انقضا</label>
                <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                <input type="file" accept="image/*,.webp,.avif" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
                <button type="submit">افزودن بنر</button>
            </form>
            {banners.map((banner) => (
                <div key={banner.id} className="article-item">
                    <div className="article-item-info">
                        <h3>{banner.title || banner.placement}</h3>
                        <p>{banner.placement} · کلیک {banner.clicks} · نمایش {banner.impressions}</p>
                    </div>
                    <button type="button" className="btn-delete" onClick={async () => {
                        await fetch(`/api/admin/magazine/banners/${banner.id}`, { method: 'DELETE' });
                        load();
                    }}>حذف</button>
                </div>
            ))}
        </div>
    );
};
