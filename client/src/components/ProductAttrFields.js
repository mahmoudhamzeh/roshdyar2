import React, { useEffect, useState } from 'react';
import { findCategoryPath } from '../utils/shop';
import { fieldsForCategoryPath } from '../utils/productAttrs';
import './ProductAttrFields.css';

let extraSeq = 0;

const extrasFromAttrs = (attrs, known) =>
    Object.entries(attrs || {})
        .filter(([key]) => !known.has(key))
        .map(([label, value]) => ({ id: `ex-${++extraSeq}`, label, value }));

const ProductAttrFields = ({
    tree,
    category,
    attrs = {},
    onChange,
    productName = '',
    resetKey = '',
    className = ''
}) => {
    const path = findCategoryPath(tree, category);
    const fields = fieldsForCategoryPath(path, productName);
    const knownKeys = new Set(fields.map((field) => field.key));
    const [extras, setExtras] = useState(() => extrasFromAttrs(attrs, knownKeys));

    useEffect(() => {
        setExtras(extrasFromAttrs(attrs, knownKeys));
        // Re-seed custom rows when switching product or category, not on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, resetKey]);

    if (!category) return null;

    const emit = (nextKnown, nextExtras) => {
        const next = { ...nextKnown };
        Object.keys(next).forEach((key) => {
            if (!knownKeys.has(key)) delete next[key];
        });
        nextExtras.forEach((row) => {
            const label = String(row.label || '').trim().slice(0, 80);
            const value = String(row.value || '').trim();
            if (label && value) next[label] = value.slice(0, 300);
        });
        onChange(next);
    };

    const setKnown = (key, value) => {
        emit({ ...(attrs || {}), [key]: value }, extras);
    };

    const setExtraAt = (id, patch) => {
        const nextExtras = extras.map((row) => (row.id === id ? { ...row, ...patch } : row));
        setExtras(nextExtras);
        emit(attrs || {}, nextExtras);
    };

    const removeExtra = (id) => {
        const nextExtras = extras.filter((row) => row.id !== id);
        setExtras(nextExtras);
        emit(attrs || {}, nextExtras);
    };

    const addExtra = () => {
        setExtras((prev) => [...prev, { id: `new-${++extraSeq}`, label: '', value: '' }]);
    };

    return (
        <div className={`product-attr-fields ${className}`.trim()}>
            <h4>مشخصات این محصول</h4>
            <p>
                بعضی فیلدها بر اساس گروه کالا پیشنهاد می‌شوند. مشخصه‌های خاص همین کالا
                (مثل کنترل‌دار بودن یا مدت نگهداری باتری) را خودتان اضافه کنید.
            </p>
            {fields.length > 0 && (
                <div className="product-attr-grid">
                    {fields.map((field) => (
                        <label key={field.key}>
                            {field.label}
                            {field.type === 'select' ? (
                                <select
                                    value={attrs[field.key] || ''}
                                    onChange={(e) => setKnown(field.key, e.target.value)}
                                >
                                    <option value="">انتخاب کنید</option>
                                    {(field.options || []).map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    value={attrs[field.key] || ''}
                                    placeholder={field.placeholder || ''}
                                    onChange={(e) => setKnown(field.key, e.target.value)}
                                />
                            )}
                        </label>
                    ))}
                </div>
            )}
            <div className="product-attr-custom">
                <strong>مشخصات اختصاصی این کالا</strong>
                {extras.map((row) => (
                    <div key={row.id} className="product-attr-extra-row">
                        <label>
                            نام مشخصه
                            <input
                                type="text"
                                value={row.label}
                                placeholder="مثلاً کنترل‌دار"
                                onChange={(e) => setExtraAt(row.id, { label: e.target.value })}
                            />
                        </label>
                        <label>
                            مقدار
                            <input
                                type="text"
                                value={row.value}
                                placeholder="مثلاً بله، ۲۰ دقیقه پرواز"
                                onChange={(e) => setExtraAt(row.id, { value: e.target.value })}
                            />
                        </label>
                        <button
                            type="button"
                            className="product-attr-remove"
                            onClick={() => removeExtra(row.id)}
                        >
                            حذف
                        </button>
                    </div>
                ))}
                <button type="button" className="product-attr-add" onClick={addExtra}>
                    افزودن مشخصه دیگر
                </button>
            </div>
        </div>
    );
};

export default ProductAttrFields;
