import React, { useMemo } from 'react';
import { findCategoryPath } from '../utils/shop';

const LEVEL_LABELS = ['گروه اصلی', 'زیرگروه', 'دسته جزئی', 'زیرشاخه'];

const CategoryCascade = ({
    tree = [],
    value = '',
    onChange,
    emptyLabel = 'انتخاب کنید',
    required = false,
    forceLeaf = false,
    stacked = false
}) => {
    const path = useMemo(() => findCategoryPath(tree, value), [tree, value]);
    const levels = [];
    levels.push({
        label: LEVEL_LABELS[0],
        options: tree || [],
        selected: path[0] ? path[0].name : ''
    });
    path.forEach((node, index) => {
        const kids = node.children || [];
        if (kids.length) {
            levels.push({
                label: LEVEL_LABELS[Math.min(index + 1, LEVEL_LABELS.length - 1)],
                options: kids,
                selected: path[index + 1] ? path[index + 1].name : ''
            });
        }
    });
    const needsLeaf = forceLeaf && path.length > 0 && (path[path.length - 1].children || []).length > 0;

    return (
        <div className={`category-cascade${stacked ? ' is-stacked' : ''}`}>
            {path.length > 0 && (
                <p className="category-cascade-path">
                    مسیر انتخاب‌شده: {path.map((node) => node.name).join(' ‹ ')}
                </p>
            )}
            {levels.map((level, index) => (
                <label key={`${level.label}-${index}`}>
                    <span>{index + 1}. {level.label}</span>
                    <select
                        required={required && (index === 0 || (forceLeaf && index === levels.length - 1 && needsLeaf))}
                        value={level.selected}
                        onChange={(e) => {
                            const next = e.target.value;
                            if (!next) {
                                onChange(index === 0 ? '' : path[index - 1].name);
                                return;
                            }
                            onChange(next);
                        }}
                    >
                        <option value="">{index === 0 ? emptyLabel : `انتخاب ${level.label}`}</option>
                        {level.options.map((opt) => (
                            <option key={opt.id || opt.name} value={opt.name}>
                                {opt.name}
                                {(opt.children || []).length ? ' (دارای زیرگروه)' : ''}
                            </option>
                        ))}
                    </select>
                </label>
            ))}
            {needsLeaf && (
                <p className="category-cascade-hint">این گروه زیرمجموعه دارد؛ لطفاً زیرگروه را هم انتخاب کنید.</p>
            )}
        </div>
    );
};

export default CategoryCascade;
