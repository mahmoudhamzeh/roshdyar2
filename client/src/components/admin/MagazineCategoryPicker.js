import React, { useMemo, useState } from 'react';
import { categoryPathLabel, findCategoryPathById, flattenCategories } from '../../utils/magazine';

const MagazineCategoryPicker = ({
    tree = [],
    value,
    onChange,
    allowEmpty = true,
    emptyLabel = 'بدون دسته',
    placeholder = 'جستجوی دسته یا زیرگروه…'
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const flat = useMemo(() => flattenCategories(tree), [tree]);
    const selectedLabel = categoryPathLabel(tree, value) || emptyLabel;

    const matches = useMemo(() => {
        const needle = String(query || '').trim();
        return flat.filter((node) => {
            const label = categoryPathLabel(tree, node.id);
            if (!needle) return true;
            return label.includes(needle) || String(node.name || '').includes(needle);
        });
    }, [flat, query, tree]);

    const pick = (id) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    return (
        <div className="mag-cat-picker">
            <button
                type="button"
                className={`mag-cat-picker-trigger ${value ? 'has-value' : ''}`}
                onClick={() => setOpen((prev) => !prev)}
            >
                {selectedLabel}
            </button>
            {open && (
                <div className="mag-cat-picker-panel">
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                    />
                    {allowEmpty && (
                        <button
                            type="button"
                            className={!value ? 'is-on' : ''}
                            onClick={() => pick('')}
                        >
                            {emptyLabel}
                        </button>
                    )}
                    {matches.map((node) => {
                        const path = findCategoryPathById(tree, node.id);
                        const label = path.map((item) => item.name).join(' ‹ ');
                        const depth = Math.max(0, path.length - 1);
                        return (
                            <button
                                type="button"
                                key={node.id}
                                className={String(node.id) === String(value) ? 'is-on' : ''}
                                style={{ paddingInlineStart: `${0.75 + depth * 0.85}rem` }}
                                onClick={() => pick(node.id)}
                            >
                                {label}
                            </button>
                        );
                    })}
                    {matches.length === 0 && <p className="mag-cat-empty">دسته‌ای پیدا نشد.</p>}
                </div>
            )}
        </div>
    );
};

export default MagazineCategoryPicker;
