import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faStore, faTimes } from '@fortawesome/free-solid-svg-icons';
import { categoryVisual } from '../utils/shop';
import './ShopCategorySheet.css';

const ShopCategorySheet = ({ open, onClose, onSelect, selected = 'همه' }) => {
    const [tree, setTree] = useState([]);
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        if (!open) return undefined;
        fetch('/api/shop/categories')
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setTree(Array.isArray(data) ? data : []))
            .catch(() => setTree([]));
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const pick = (name) => {
        onSelect(name);
        onClose();
    };

    const renderNodes = (nodes, depth = 0) =>
        (nodes || []).map((node) => {
            const kids = node.children || [];
            const hasKids = kids.length > 0;
            const isOpen = Boolean(expanded[node.id || node.name]);
            const visual = categoryVisual(node.name);
            return (
                <li key={node.id || node.name} style={{ '--depth': depth }}>
                    <div className={`shop-cat-sheet__row ${selected === node.name ? 'is-active' : ''}`}>
                        {hasKids ? (
                            <button
                                type="button"
                                className={`shop-cat-sheet__chevron ${isOpen ? 'is-open' : ''}`}
                                onClick={() => setExpanded((prev) => ({
                                    ...prev,
                                    [node.id || node.name]: !prev[node.id || node.name]
                                }))}
                                aria-expanded={isOpen}
                                aria-label={isOpen ? 'بستن زیرگروه' : 'باز کردن زیرگروه'}
                            >
                                <FontAwesomeIcon icon={faChevronDown} />
                            </button>
                        ) : (
                            <span className="shop-cat-sheet__dot" style={{ background: visual.color }} />
                        )}
                        <button type="button" className="shop-cat-sheet__pick" onClick={() => pick(node.name)}>
                            {node.name}
                        </button>
                    </div>
                    {hasKids && isOpen && <ul>{renderNodes(kids, depth + 1)}</ul>}
                </li>
            );
        });

    return (
        <div className="shop-cat-sheet" role="dialog" aria-modal="true" aria-labelledby="shop-cat-sheet-title">
            <button type="button" className="shop-cat-sheet__backdrop" aria-label="بستن" onClick={onClose} />
            <div className="shop-cat-sheet__panel">
                <header className="shop-cat-sheet__head">
                    <h2 id="shop-cat-sheet-title">
                        <FontAwesomeIcon icon={faStore} />
                        دسته‌بندی‌ها
                    </h2>
                    <button type="button" onClick={onClose} aria-label="بستن">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </header>
                <ul className="shop-cat-sheet__tree">
                    <li>
                        <div className={`shop-cat-sheet__row ${!selected || selected === 'همه' ? 'is-active' : ''}`}>
                            <span className="shop-cat-sheet__dot" style={{ background: '#0f766e' }} />
                            <button type="button" className="shop-cat-sheet__pick" onClick={() => pick('همه')}>
                                همه محصولات
                            </button>
                        </div>
                    </li>
                    {renderNodes(tree)}
                </ul>
            </div>
        </div>
    );
};

export default ShopCategorySheet;
