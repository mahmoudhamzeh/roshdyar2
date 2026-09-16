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
    const validValue = required && (!value || (forceLeaf && needsLeaf)) ? '' : (value || '');

    const pick = (index, next) => {
        if (!next) {
            onChange(index === 0 ? '' : path[index - 1].name);
            return;
        }
        onChange(next);
    };

    return (
        <div className={`category-cascade${stacked ? ' is-stacked' : ''}`}>
            {path.length > 0 && (
                <p className="category-cascade-path">
                    مسیر انتخاب‌شده: {path.map((node) => node.name).join(' ‹ ')}
                </p>
            )}
            {levels.map((level, index) => (
                <div key={`${level.label}-${index}`} className="category-cascade-level">
                    <span>{index + 1}. {level.label}</span>
                    <div className="category-cascade-options" role="listbox" aria-label={level.label}>
                        {index > 0 && (
                            <button
                                type="button"
                                className={!level.selected ? 'is-on' : ''}
                                onClick={() => pick(index, '')}
                            >
                                پاک کردن
                            </button>
                        )}
                        {index === 0 && (
                            <button
                                type="button"
                                className={!level.selected ? 'is-on' : ''}
                                onClick={() => pick(0, '')}
                            >
                                {emptyLabel}
                            </button>
                        )}
                        {level.options.map((opt) => (
                            <button
                                type="button"
                                key={opt.id || opt.name}
                                className={opt.name === level.selected ? 'is-on' : ''}
                                onClick={() => pick(index, opt.name)}
                            >
                                {opt.name}
                                {(opt.children || []).length ? ' (دارای زیرگروه)' : ''}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            {required && (
                <input
                    className="category-cascade-required"
                    tabIndex={-1}
                    required
                    value={validValue}
                    onChange={() => {}}
                    aria-hidden="true"
                />
            )}
            {needsLeaf && (
                <p className="category-cascade-hint">این گروه زیرمجموعه دارد؛ لطفاً زیرگروه را هم انتخاب کنید.</p>
            )}
        </div>
    );
};

export default CategoryCascade;
