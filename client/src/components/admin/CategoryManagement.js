import React, { useEffect, useState } from 'react';
import { flattenCategories } from '../../utils/shop';
import './ProductManagement.css';

const renderNodes = (nodes, onDelete, depth = 0) =>
    (nodes || []).map((node) => (
        <div key={node.id} className="category-tree-node" style={{ marginRight: depth ? '1rem' : 0 }}>
            <p>
                {node.name}
                {' '}
                <button type="button" className="btn-delete" onClick={() => onDelete(node.id)}>حذف</button>
            </p>
            {renderNodes(node.children, onDelete, depth + 1)}
        </div>
    ));

const CategoryManagement = () => {
    const [tree, setTree] = useState([]);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [error, setError] = useState('');

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
        load().catch((err) => setError(err.message));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('این گروه حذف شود؟')) return;
        await fetch(`/api/admin/product-categories/${id}`, { method: 'DELETE' });
        load().catch((err) => setError(err.message));
    };

    const flat = flattenCategories(tree);

    return (
        <div className="product-management">
            <h2>گروه و زیرگروه محصولات</h2>
            <p>درخت دسته با عمق نامحدود؛ هر گره می‌تواند زیرگروه داشته باشد.</p>
            <form className="product-form" onSubmit={handleCreate}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام گروه یا زیرگروه" required />
                <label>زیرگروه از</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="">گروه اصلی</option>
                    {flat.map((node) => (
                        <option key={node.id} value={node.id}>
                            {'— '.repeat(node.depth || 0)}{node.name}
                        </option>
                    ))}
                </select>
                <button type="submit">افزودن</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            <div className="products-admin-list">
                {tree.map((group) => (
                    <div key={group.id} className="product-admin-item">
                        <div>
                            <h3>{group.name}</h3>
                            {renderNodes(group.children, handleDelete, 1)}
                        </div>
                        <button type="button" className="btn-delete" onClick={() => handleDelete(group.id)}>حذف گروه</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryManagement;
