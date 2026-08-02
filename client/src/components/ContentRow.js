import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import './ContentRow.css';

const ContentRow = ({ title, items, viewAllLink, scrollable = false, visibleCount = 4 }) => {
    const rowRef = useRef(null);
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const updateScrollState = () => {
        const el = rowRef.current;
        if (!el) return;

        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 2) {
            setCanScrollPrev(false);
            setCanScrollNext(false);
            return;
        }

        const scrollPos = Math.abs(el.scrollLeft);
        const atStart = scrollPos <= 2;
        const atEnd = scrollPos >= maxScroll - 2;

        // In RTL, scrollLeft may be negative; treat "prev" as toward start of content.
        const scrollingNegative = el.scrollLeft < 0;
        if (scrollingNegative) {
            setCanScrollPrev(el.scrollLeft < -2);
            setCanScrollNext(el.scrollLeft > -(maxScroll - 2));
        } else {
            setCanScrollPrev(!atStart);
            setCanScrollNext(!atEnd);
        }
    };

    useEffect(() => {
        const el = rowRef.current;
        if (!el || !scrollable) return undefined;

        const frame = window.requestAnimationFrame(updateScrollState);
        el.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            window.cancelAnimationFrame(frame);
            el.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [scrollable, items, visibleCount]);

    const scrollByPage = (direction) => {
        const el = rowRef.current;
        if (!el) return;
        const amount = el.clientWidth;
        el.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    const renderItem = (item) => {
        const card = (
            <div className="content-card">
                <div className="content-card-media">
                    <img src={item.image} alt={item.title} />
                    {item.isVideo && <span className="content-card-play" aria-hidden="true">▶</span>}
                </div>
                <div className="content-card-text">
                    <h4>{item.title}</h4>
                    {item.summary && <p>{item.summary}</p>}
                </div>
            </div>
        );

        if (item.externalUrl) {
            return (
                <a
                    href={item.externalUrl}
                    key={item.id}
                    className="content-card-link"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {card}
                </a>
            );
        }

        if (item.link) {
            return (
                <Link to={item.link} key={item.id} className="content-card-link">
                    {card}
                </Link>
            );
        }

        return <div key={item.id} className="content-card-link">{card}</div>;
    };

    return (
        <div className={`content-row-container ${scrollable ? 'is-scrollable' : ''}`}>
            <div className="content-row-header">
                <h3>{title}</h3>
                {viewAllLink && (
                    <Link to={viewAllLink} className="view-all-link">
                        نمایش همه
                    </Link>
                )}
            </div>

            <div className="content-row-viewport">
                {scrollable && (
                    <button
                        type="button"
                        className="content-row-nav content-row-nav-prev"
                        onClick={() => scrollByPage(1)}
                        disabled={!canScrollPrev}
                        aria-label="اسکرول به راست"
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                )}

                <div
                    ref={rowRef}
                    className={`content-row ${scrollable ? 'scrollable' : ''}`}
                    style={scrollable ? { '--visible-count': visibleCount } : undefined}
                >
                    {items.map(renderItem)}
                </div>

                {scrollable && (
                    <button
                        type="button"
                        className="content-row-nav content-row-nav-next"
                        onClick={() => scrollByPage(-1)}
                        disabled={!canScrollNext}
                        aria-label="اسکرول به چپ"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ContentRow;
