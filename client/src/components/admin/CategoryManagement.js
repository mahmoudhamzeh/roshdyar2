import React, { useEffect, useMemo, useState } from 'react';
import { categoryMatchesQuery, findCategoryPathById, flattenCategories } from '../../utils/shop';
import './ProductManagement.css';
import './CategoryManagement.css';

const DEPTH_LABELS = ['گروه اصلی', 'زیرگروه', 'دسته جزئی', 'زیرشاخه'];

const pathLabel = (tree, node) =>
    findCategoryPathById(tree, node.id).map((item) => item.name).join(' ‹ ');

const filterTree = (nodes, query) => {
    if (!String(query || '').trim()) return nodes || [];
    const walk = (list) => {
        const result = [];
        (list || []).forEach((node) => {
            const self = categoryMatchesQuery(node, query);
            const children = walk(node.children || []);
            if (self) result.push({ ...node, children: node.children || [], forcedOpen: true });
            else if (children.length) result.push({ ...node, children, forcedOpen: true });
        });
        return result;
    };
    return walk(nodes);
};

const ChildList = ({ nodes, depth, onAddChild, onRename, onDelete }) => (
    <ul className={`cat-children depth-${depth}`}>
        {(nodes || []).map((node) => {
            const kids = node.children || [];
            return (
                <li key={node.id}>
                    <div className="cat-child-row">
                        <div className="cat-child-copy">
                            <span>{DEPTH_LABELS[Math.min(depth, DEPTH_LABELS.length - 1)]}</span>
                            <strong>{node.name}</strong>
                            {kids.length > 0 && <em>{kids.length} مورد</em>}
                        </div>
                        <div className="cat-row-actions">
                            <button type="button" onClick={() => onAddChild(node)}>زیرگروه</button>
                            <button type="button" onClick={() => onRename(node)}>نام</button>
                            <button type="button" className="is-danger" onClick={() => onDelete(node.id, node.name)}>حذف</button>
                        </div>
                    </div>
                    {kids.length > 0 && (
                        <ChildList
                            nodes={kids}
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
    const [asChild, setAsChild] = useState(false);
    const [parentQuery, setParentQuery] = useState('');
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [hint, setHint] = useState('');
    const [openIds, setOpenIds] = useState(() => new Set());

    const load = async () => {
        const res = await fetch('/api/admin/product-categories');
        if (!res.ok) throw new Error('بارگذاری گروه‌ها ناموفق بود');
        const data = await res.json();
        setTree(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        load().catch((err) => setError(err.message));
    }, []);

    const visibleTree = useMemo(() => filterTree(tree, search), [tree, search]);
    const flat = useMemo(() => flattenCategories(tree), [tree]);
    const parentOptions = useMemo(() => {
        return flat.filter((node) => categoryMatchesQuery(node, parentQuery, pathLabel(tree, node)));
    }, [flat, parentQuery, tree]);
    const selectedParent = flat.find((node) => String(node.id) === String(parentId));

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        if (asChild && !parentId) {
            setError('اول گروه والد را از فهرست انتخاب کنید.');
            return;
        }
        const res = await fetch('/api/admin/product-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId: asChild ? parentId : null })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(data.message || 'ثبت گروه ناموفق بود');
            return;
        }
        if (asChild && parentId) setOpenIds((prev) => new Set([...prev, Number(parentId)]));
        setName('');
        setHint(asChild ? 'زیرگروه اضافه شد.' : 'گروه اصلی اضافه شد.');
        if (!asChild) {
            setParentId('');
            setParentQuery('');
        }
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
            body: JSON.stringify({
                name: next.trim(),
                parentId: node.parentId || null,
                sortOrder: node.sortOrder || 0
            })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'تغییر نام ناموفق بود');
            return;
        }
        load().catch((err) => setError(err.message));
    };

    const startChild = (node) => {
        setAsChild(true);
        setParentId(String(node.id));
        setParentQuery('');
        setName('');
        setHint(`زیرگروه برای «${pathLabel(tree, node) || node.name}»`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleOpen = (id) => {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isOpen = (node) => Boolean(search) || node.forcedOpen || openIds.has(node.id);

    return (
        <div className="cat-admin">
            <header className="cat-admin-head">
                <div>
                    <h2>گروه و زیرگروه محصولات</h2>
                    <p>
                        گروه‌های اصلی را اینجا می‌بینید. روی «دیدن زیرگروه» بزنید تا شاخه‌ها باز شود.
                        {tree.length ? ` ${tree.length} گروه اصلی ثبت شده است.` : ''}
                    </p>
                </div>
                <label className="cat-search">
                    <span>جستجو در گروه‌ها</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="مثلاً کفش، تغذیه، لگو"
                    />
                </label>
            </header>

            <form className="cat-create" onSubmit={handleCreate}>
                <h3>{asChild ? 'افزودن زیرگروه' : 'افزودن گروه اصلی'}</h3>
                {hint && <p className="cat-hint">{hint}</p>}
                <div className="cat-mode">
                    <button
                        type="button"
                        className={!asChild ? 'is-on' : ''}
                        onClick={() => { setAsChild(false); setParentId(''); setHint(''); }}
                    >
                        گروه اصلی
                    </button>
                    <button
                        type="button"
                        className={asChild ? 'is-on' : ''}
                        onClick={() => setAsChild(true)}
                    >
                        زیرگروه
                    </button>
                </div>
                {asChild && (
                    <div className="cat-parent-picker">
                        <p>این زیرگروه مال کدام گروه باشد؟</p>
                        {selectedParent && (
                            <strong className="cat-parent-chosen">
                                انتخاب‌شده: {pathLabel(tree, selectedParent) || selectedParent.name}
                            </strong>
                        )}
                        <input
                            value={parentQuery}
                            onChange={(e) => setParentQuery(e.target.value)}
                            placeholder="جستجوی نام گروه، مثلاً اسباب‌بازی یا موسیقی"
                        />
                        <ul>
                            {parentOptions.length === 0 && <li className="cat-empty">گروهی پیدا نشد.</li>}
                            {parentOptions.map((node) => {
                                const path = pathLabel(tree, node);
                                return (
                                    <li key={node.id}>
                                        <button
                                            type="button"
                                            className={String(node.id) === String(parentId) ? 'is-on' : ''}
                                            onClick={() => setParentId(String(node.id))}
                                        >
                                            <span className="cat-parent-copy">
                                                <strong>{node.name}</strong>
                                                {path && path !== node.name && <small>{path}</small>}
                                            </span>
                                            <em>{DEPTH_LABELS[Math.min(node.depth || 0, DEPTH_LABELS.length - 1)]}</em>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                <label>
                    نام {asChild ? 'زیرگروه' : 'گروه اصلی'}
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={asChild ? 'مثلاً کفش، مکمل، لگو' : 'مثلاً پوشاک، تغذیه'}
                        required
                    />
                </label>
                <div className="cat-create-actions">
                    <button type="submit">{asChild ? 'ثبت زیرگروه' : 'ثبت گروه اصلی'}</button>
                </div>
            </form>

            {error && <p className="error-message">{error}</p>}

            {visibleTree.length === 0 ? (
                <p className="cat-empty-page">
                    {search ? 'هیچ گروهی با این جستجو پیدا نشد.' : 'هنوز گروه اصلی ساخته نشده است.'}
                </p>
            ) : (
                <div className="cat-root-list">
                    {visibleTree.map((root) => {
                        const kids = root.children || [];
                        const open = isOpen(root);
                        return (
                            <article key={root.id} className={`cat-root-card ${open ? 'is-open' : ''}`}>
                                <header>
                                    <button type="button" className="cat-root-toggle" onClick={() => toggleOpen(root.id)}>
                                        <span className="cat-root-badge">گروه اصلی</span>
                                        <strong>{root.name}</strong>
                                        <em>{kids.length ? `${kids.length} زیرگروه` : 'بدون زیرگروه'}</em>
                                        <b>{open ? 'بستن' : 'دیدن زیرگروه'}</b>
                                    </button>
                                    <div className="cat-row-actions">
                                        <button type="button" onClick={() => startChild(root)}>افزودن زیرگروه</button>
                                        <button type="button" onClick={() => handleRename(root)}>تغییر نام</button>
                                        <button type="button" className="is-danger" onClick={() => handleDelete(root.id, root.name)}>حذف</button>
                                    </div>
                                </header>
                                {open && (
                                    kids.length ? (
                                        <ChildList
                                            nodes={kids}
                                            depth={1}
                                            onAddChild={startChild}
                                            onRename={handleRename}
                                            onDelete={handleDelete}
                                        />
                                    ) : (
                                        <p className="cat-empty">این گروه هنوز زیرگروه ندارد.</p>
                                    )
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
