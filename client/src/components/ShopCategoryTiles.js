import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAppleWhole,
    faPuzzlePiece,
    faShirt,
    faBook,
    faHeart,
    faBrain,
    faStore,
    faEllipsis,
    faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { categoryVisual } from '../utils/shop';
import './ShopCategoryTiles.css';

const ICONS = {
    apple: faAppleWhole,
    puzzle: faPuzzlePiece,
    shirt: faShirt,
    book: faBook,
    heart: faHeart,
    brain: faBrain,
    store: faStore
};

const ShopCategoryTiles = ({ tree = [], selected, onSelect }) => {
    const [parentId, setParentId] = useState(null);

    const parent = useMemo(
        () => (tree || []).find((node) => String(node.id) === String(parentId)) || null,
        [tree, parentId]
    );
    const nodes = parent ? (parent.children || []) : (tree || []);

    const pick = (node) => {
        if ((node.children || []).length) {
            setParentId(node.id);
            return;
        }
        onSelect(node.name);
    };

    return (
        <section className="shop-circles" aria-label="دسته‌بندی درختی">
            {parent && (
                <div className="shop-circles__crumb">
                    <button type="button" onClick={() => setParentId(null)}>همه گروه‌ها</button>
                    <span>/</span>
                    <strong>{parent.name}</strong>
                </div>
            )}
            <div className="shop-circles__row">
                <button
                    type="button"
                    className={`shop-circle ${!selected || selected === 'همه' ? 'is-active' : ''}`}
                    onClick={() => {
                        setParentId(null);
                        onSelect('همه');
                    }}
                >
                    <span className="shop-circle__icon" style={{ background: '#0f766e' }}>
                        <FontAwesomeIcon icon={faLayerGroup} />
                    </span>
                    <em>همه</em>
                </button>
                {nodes.map((node) => {
                    const visual = categoryVisual(node.name);
                    return (
                        <button
                            key={node.id || node.name}
                            type="button"
                            className={`shop-circle ${selected === node.name ? 'is-active' : ''}`}
                            onClick={() => pick(node)}
                        >
                            <span className="shop-circle__icon" style={{ background: visual.color }}>
                                <FontAwesomeIcon icon={ICONS[visual.icon] || faStore} />
                            </span>
                            <em>{node.name}</em>
                        </button>
                    );
                })}
                {!parent && (
                    <a className="shop-circle" href="/shop/categories">
                        <span className="shop-circle__icon" style={{ background: '#64748b' }}>
                            <FontAwesomeIcon icon={faEllipsis} />
                        </span>
                        <em>بیشتر</em>
                    </a>
                )}
            </div>
        </section>
    );
};

export default ShopCategoryTiles;
