import React, { useEffect, useState } from 'react';
import './ProductManagement.css';

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

    return (
        <div className="product-management">
            <h2>گروه و زیرگروه محصولات</h2>
            <form className="product-form" onSubmit={handleCreate}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام گروه یا زیرگروه" required />
                <label>زیرگروه از</label>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="">گروه اصلی</option>
                    {tree.map((group) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
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
                            {(group.children || []).map((child) => (
                                <p key={child.id}>
                                    {child.name}
                                    {' '}
                                    <button type="button" className="btn-delete" onClick={() => handleDelete(child.id)}>حذف</button>
                                </p>
                            ))}
                        </div>
                        <button type="button" className="btn-delete" onClick={() => handleDelete(group.id)}>حذف گروه</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryManagement;
