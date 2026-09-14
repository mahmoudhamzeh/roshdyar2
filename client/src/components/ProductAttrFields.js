import React from 'react';
import { findCategoryPath } from '../utils/shop';
import { fieldsForCategoryPath } from '../utils/productAttrs';

const ProductAttrFields = ({ tree, category, attrs = {}, onChange, className = '' }) => {
    const path = findCategoryPath(tree, category);
    const fields = fieldsForCategoryPath(path);
    if (!fields.length) {
        return category ? (
            <p className="product-attr-empty">برای این گروه فیلد اختصاصی دیگری لازم نیست.</p>
        ) : null;
    }

    const setAttr = (key, value) => {
        onChange({ ...(attrs || {}), [key]: value });
    };

    return (
        <div className={`product-attr-fields ${className}`.trim()}>
            <h4>مشخصات این گروه کالا</h4>
            <p>این فیلدها بر اساس گروه و زیرگروه انتخاب‌شده نشان داده می‌شوند.</p>
            <div className="product-attr-grid">
                {fields.map((field) => (
                    <label key={field.key}>
                        {field.label}
                        {field.type === 'select' ? (
                            <select
                                value={attrs[field.key] || ''}
                                onChange={(e) => setAttr(field.key, e.target.value)}
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
                                onChange={(e) => setAttr(field.key, e.target.value)}
                            />
                        )}
                    </label>
                ))}
            </div>
        </div>
    );
};

export default ProductAttrFields;
