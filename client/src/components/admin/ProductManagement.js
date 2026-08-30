import React, { useEffect, useState } from 'react';
import { formatPrice } from '../../utils/cart';
import './ProductManagement.css';

const API = '';
const emptyForm = {
    name: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    active: true,
    images: [],
};

const getAdmin = () => {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch {
        return null;
    }
};

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [categories, setCategories] = useState([]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const admin = getAdmin();
            const res = await fetch(`${API}/api/admin/products`, {
                headers: { 'x-user-id': admin.id },
            });
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(data);
            const catRes = await fetch(`${API}/api/admin/product-categories`, {
                headers: { 'x-user-id': admin.id }
            });
            if (catRes.ok) setCategories(await catRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setForm({
            name: product.name || '',
            description: product.description || '',
            category: product.category || 'تغذیه',
            price: String(product.price ?? ''),
            stock: String(product.stock ?? ''),
            active: product.active !== false,
            images: [],
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const admin = getAdmin();
        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('description', form.description);
        formData.append('category', form.category);
        formData.append('price', form.price);
        formData.append('stock', form.stock);
        formData.append('active', String(form.active));
        Array.from(form.images || []).forEach((file) => formData.append('images', file));

        try {
            const url = editingId
                ? `${API}/api/admin/products/${editingId}`
                : `${API}/api/admin/products`;
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'x-user-id': admin.id },
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'خطا در ذخیره محصول');
            }
            resetForm();
            fetchProducts();
            alert(editingId ? 'محصول به‌روزرسانی شد' : 'محصول ایجاد شد');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
        try {
            const admin = getAdmin();
            await fetch(`${API}/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': admin.id },
            });
            fetchProducts();
            alert('محصول حذف شد');
        } catch (err) {
            alert(`خطا در حذف: ${err.message}`);
        }
    };

    return (
        <div className="product-management">
            <h2>مدیریت محصولات فروشگاه</h2>
            <button
                type="button"
                className="btn-add-product"
                onClick={() => {
                    if (showForm && !editingId) {
                        resetForm();
                    } else {
                        setEditingId(null);
                        setForm(emptyForm);
                        setShowForm(true);
                    }
                }}
            >
                {showForm && !editingId ? 'پنهان کردن فرم' : 'افزودن محصول جدید'}
            </button>

            {showForm && (
                <form className="product-form" onSubmit={handleSubmit}>
                    <h3>{editingId ? 'ویرایش محصول' : 'محصول جدید'}</h3>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="نام محصول"
                        required
                    />
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="توضیحات"
                        rows="4"
                    />
                    <label>دسته‌بندی</label>
                    <select
                        name="category"
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                        <option value="">انتخاب گروه</option>
                        {categories.map((group) => (
                            <optgroup key={group.id} label={group.name}>
                                <option value={group.name}>{group.name}</option>
                                {(group.children || []).map((child) => (
                                    <option key={child.id} value={child.name}>{child.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <div className="product-form-row">
                        <label>
                            قیمت (تومان)
                            <input
                                type="number"
                                min="0"
                                value={form.price}
                                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                                required
                            />
                        </label>
                        <label>
                            موجودی
                            <input
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                                required
                            />
                        </label>
                    </div>
                    <label className="product-active-label">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                        />
                        فعال در فروشگاه
                    </label>
                    <label>تصاویر محصول (چند فایل)</label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setForm((p) => ({ ...p, images: e.target.files }))}
                    />
                    <div className="product-form-actions">
                        <button type="submit">{editingId ? 'ذخیره تغییرات' : 'ایجاد محصول'}</button>
                        {editingId && (
                            <button type="button" className="btn-cancel" onClick={resetForm}>انصراف</button>
                        )}
                    </div>
                </form>
            )}

            <div className="products-admin-list">
                {loading ? (
                    <p>در حال بارگذاری...</p>
                ) : products.length === 0 ? (
                    <p>هنوز محصولی ثبت نشده است.</p>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="product-admin-item">
                            <div className="product-admin-info">
                                <h3>
                                    {product.name}
                                    {product.active === false && <span className="inactive-badge">غیرفعال</span>}
                                </h3>
                                <p>{product.category} · {formatPrice(product.price)} · موجودی: {product.stock}</p>
                                <small>{product.description}</small>
                            </div>
                            <div className="product-admin-actions">
                                <button type="button" className="btn-edit" onClick={() => handleEdit(product)}>
                                    ویرایش
                                </button>
                                <button type="button" className="btn-delete" onClick={() => handleDelete(product.id)}>
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ProductManagement;
