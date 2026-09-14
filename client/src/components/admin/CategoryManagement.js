import React, { useEffect, useState } from 'react';
import { findCategoryPathById, flattenCategories } from '../../utils/shop';
import './ProductManagement.css';

const DEPTH_LABELS = ['گروه اصلی', 'زیرگروه', 'دسته جزئی', 'زیرشاخه'];

const pathLabel = (tree, node) =>
    findCategoryPathById(tree, node.id).map((item) => item.name).join(' ‹ ');

const CategoryTree = ({ nodes, tree, depth, onAddChild, onRename, onDelete }) => (
    <ul className={`category-tree-list depth-${depth}`}>
        {(nodes || []).map((node) => {
            const kids = node.children || [];
            return (
                <li key={node.id} className="category-tree-item">
                    <div className="category-tree-row">
                        <div>
                            <span className="category-depth-pill">{DEPTH_LABELS[Math.min(depth, DEPTH_LABELS.length - 1)]}</span>
                            <strong>{node.name}</strong>
                            {kids.length > 0 && <em>{kids.length} زیرگروه</em>}
                        </div>
                        <div className="category-tree-actions">
                            <button type="button" className="btn-edit" onClick={() => onAddChild(node)}>
                                افزودن زیرگروه
                            </button>
                            <button type="button" className="btn-edit" onClick={() => onRename(node)}>
                                تغییر نام
                            </button>
                            <button type="button" className="btn-delete" onClick={() => onDelete(node.id, node.name)}>
                                حذف
                            </button>
                        </div>
                    </div>
                    {kids.length > 0 && (
                        <CategoryTree
                            nodes={kids}
                            tree={tree}
                            depth={depth + 1}
                            onAddChild={onAddChild}
                            onRename={onRename}
                            onDelete={onDelete}
                        />
                    )}
                </li>
            );
        })}
    </ul>
);

const CategoryManagement = () => {
    const [tree, setTree] = useState([]);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [error, setError] = useState('');
    const [hint, setHint] = useState('');

    const load = async () => {
        const res = await fetch('/api/admin/product-categories');
        if (!res.ok) throw new Error('بارگذاری گروه‌ها ناموفق بود');
        setTree(await res.json());
    };

    useEffect(() => {
        load().catch((err) => setError(err.message));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/admin/product-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId: parentId || null })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(data.message || 'ثبت گروه ناموفق بود');
            return;
        }
        setName('');
        setParentId('');
        setHint(parentId ? 'زیرگروه اضافه شد.' : 'گروه اصلی اضافه شد.');
        load().catch((err) => setError(err.message));
    };

    const handleDelete = async (id, label) => {
        if (!window.confirm(`«${label || 'این گروه'}» و زیرگروه‌هایش حذف شود؟`)) return;
        await fetch(`/api/admin/product-categories/${id}`, { method: 'DELETE' });
        load().catch((err) => setError(err.message));
    };

    const handleRename = async (node) => {
        const next = window.prompt('نام جدید گروه', node.name);
        if (next == null || !next.trim() || next.trim() === node.name) return;
        const res = await fetch(`/api/admin/product-categories/${node.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: next.trim(), parentId: node.parentId || null, sortOrder: node.sortOrder || 0 })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'تغییر نام ناموفق بود');
            return;
        }
        load().catch((err) => setError(err.message));
    };

    const startChild = (node) => {
        setParentId(String(node.id));
        setName('');
        setHint(`زیرگروه برای «${pathLabel(tree, node)}»`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const flat = flattenCategories(tree);

    return (
        <div className="product-management">
            <h2>گروه و زیرگروه محصولات</h2>
            <p className="category-lead">
                اول <strong>گروه اصلی</strong> بسازید (مثل پوشاک یا تغذیه). بعد روی همان گروه «افزودن زیرگروه» بزنید.
                کالاها باید روی آخرین سطح (مثلاً پوشاک ‹ کفش) ثبت شوند.
            </p>
            <form className="product-form category-create-form" onSubmit={handleCreate}>
                <h3>{parentId ? 'افزودن زیرگروه' : 'افزودن گروه اصلی'}</h3>
                {hint && <p className="category-hint">{hint}</p>}
                <label>
                    این مورد زیرمجموعه کدام گروه باشد؟
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                        <option value="">گروه اصلی — در ریشه درخت</option>
                        {flat.map((node) => (
                            <option key={node.id} value={node.id}>
                                {pathLabel(tree, node)}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    نام {parentId ? 'زیرگروه' : 'گروه'}
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={parentId ? 'مثلاً کفش، مکمل، لگو' : 'مثلاً پوشاک، تغذیه'}
                        required
                    />
                </label>
                <div className="product-form-actions">
                    <button type="submit">{parentId ? 'ثبت زیرگروه' : 'ثبت گروه اصلی'}</button>
                    {parentId && (
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => { setParentId(''); setHint(''); }}
                        >
                            تبدیل به گروه اصلی
                        </button>
                    )}
                </div>
            </form>
            {error && <p className="error-message">{error}</p>}
            <div className="category-tree-wrap">
                {tree.length === 0 ? (
                    <p>هنوز گروهی ساخته نشده است.</p>
                ) : (
                    <CategoryTree
                        nodes={tree}
                        tree={tree}
                        depth={0}
                        onAddChild={startChild}
                        onRename={handleRename}
                        onDelete={handleDelete}
                    />
                )}
            </div>
        </div>
    );
};

export default CategoryManagement;
