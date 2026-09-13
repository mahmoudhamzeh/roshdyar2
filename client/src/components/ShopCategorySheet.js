import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAppleWhole,
    faArrowRight,
    faBook,
    faBrain,
    faChevronLeft,
    faHeart,
    faLayerGroup,
    faMusic,
    faPuzzlePiece,
    faShirt,
    faStore,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { categoryVisual } from '../utils/shop';
import './ShopCategorySheet.css';

const ICONS = {
    apple: faAppleWhole,
    puzzle: faPuzzlePiece,
    shirt: faShirt,
    book: faBook,
    heart: faHeart,
    brain: faBrain,
    store: faStore,
    music: faMusic
};

const ShopCategorySheet = ({ open, onClose, onSelect, selected = 'همه' }) => {
    const [tree, setTree] = useState([]);
    const [stack, setStack] = useState([]);

    useEffect(() => {
        if (!open) return undefined;
        setStack([]);
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

    const current = stack[stack.length - 1] || null;
    const nodes = useMemo(
        () => (current ? (current.children || []) : tree),
        [current, tree]
    );
    const leafOnly = nodes.length > 0 && nodes.every((node) => !(node.children || []).length);

    if (!open) return null;

    const pick = (name) => {
        onSelect(name);
        onClose();
    };

    const openNode = (node) => {
        if ((node.children || []).length) {
            setStack((prev) => [...prev, node]);
            return;
        }
        pick(node.name);
    };

    const title = current ? current.name : 'دسته‌بندی‌ها';

    return (
        <div className="shop-cat-sheet" role="dialog" aria-modal="true" aria-labelledby="shop-cat-sheet-title">
            <button type="button" className="shop-cat-sheet__backdrop" aria-label="بستن" onClick={onClose} />
            <div className="shop-cat-sheet__panel">
                <header className="shop-cat-sheet__head">
                    {current ? (
                        <button
                            type="button"
                            className="shop-cat-sheet__back"
                            onClick={() => setStack((prev) => prev.slice(0, -1))}
                            aria-label="بازگشت"
                        >
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    ) : (
                        <span className="shop-cat-sheet__head-icon" aria-hidden="true">
                            <FontAwesomeIcon icon={faStore} />
                        </span>
                    )}
                    <div className="shop-cat-sheet__titles">
                        <p>{current ? 'زیرگروه‌های این دسته' : 'فروشگاه تات‌کیدز'}</p>
                        <h2 id="shop-cat-sheet-title">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="بستن">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </header>

                {stack.length > 0 && (
                    <nav className="shop-cat-sheet__crumbs" aria-label="مسیر دسته">
                        <button type="button" onClick={() => setStack([])}>همه</button>
                        {stack.map((node, index) => (
                            <React.Fragment key={node.id || `${node.name}-${index}`}>
                                <span>/</span>
                                <button
                                    type="button"
                                    className={index === stack.length - 1 ? 'is-current' : ''}
                                    onClick={() => setStack((prev) => prev.slice(0, index + 1))}
                                >
                                    {node.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                )}

                <div className="shop-cat-sheet__body">
                    <button
                        type="button"
                        className={`shop-cat-sheet__all ${!selected || selected === 'همه' || (current && selected === current.name) ? 'is-active' : ''}`}
                        onClick={() => pick(current ? current.name : 'همه')}
                    >
                        <span className="shop-cat-sheet__all-icon">
                            <FontAwesomeIcon icon={faLayerGroup} />
                        </span>
                        <span>
                            <strong>{current ? `همه کالاهای ${current.name}` : 'همه محصولات'}</strong>
                            <em>{current ? 'بدون فیلتر زیرگروه' : 'نمایش کل فروشگاه'}</em>
                        </span>
                    </button>

                    <ul className={`shop-cat-sheet__grid ${leafOnly ? 'is-leaves' : ''}`}>
                        {nodes.map((node) => {
                            const kids = node.children || [];
                            const visual = categoryVisual(node.name);
                            const hasKids = kids.length > 0;
                            return (
                                <li key={node.id || node.name}>
                                    <button
                                        type="button"
                                        className={`shop-cat-sheet__card ${selected === node.name ? 'is-active' : ''}`}
                                        onClick={() => openNode(node)}
                                    >
                                        <span className="shop-cat-sheet__card-icon" style={{ background: visual.color }}>
                                            <FontAwesomeIcon icon={ICONS[visual.icon] || faStore} />
                                        </span>
                                        <span className="shop-cat-sheet__card-text">
                                            <strong>{node.name}</strong>
                                            {hasKids ? (
                                                <em>{kids.length} زیرگروه</em>
                                            ) : (
                                                <em>مشاهده کالاها</em>
                                            )}
                                        </span>
                                        {hasKids && (
                                            <FontAwesomeIcon icon={faChevronLeft} className="shop-cat-sheet__card-chevron" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ShopCategorySheet;
