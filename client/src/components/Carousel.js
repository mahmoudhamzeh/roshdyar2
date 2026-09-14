import React from 'react';
import { Carousel as ResponsiveCarousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import './Carousel.css'; // Your custom styles

const Carousel = ({ slides = [] }) => {

    if (!slides || slides.length === 0) {
        return null; // Don't render anything if there are no slides
    }

    const handleImageError = (e) => {
        e.target.onerror = null; // prevent infinite loop
        e.target.src = 'https://placehold.co/1200x400/cccccc/ffffff?text=Image+Not+Available';
    };

    const handleItemClick = (index, item) => {
        let url = item.props.url;
        if (url) {
            // Check for internal links (e.g., /dashboard, /profile)
            if (url.startsWith('/')) {
                window.location.href = url;
            } else {
                // It's an external link, ensure it has a protocol
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    }

    return (
        // The library's Carousel component handles all the state and sliding logic
        <ResponsiveCarousel
            key={slides.length}
            showThumbs={false}
            showStatus={false}
            infiniteLoop
            useKeyboardArrows
            autoPlay
            interval={5000}
            onClickItem={handleItemClick}
            className="presentation-mode"
        >
            {slides.map((slide) => (
                // The library expects simple children. We pass the link as a custom prop 'url'.
                <div key={slide.id} url={slide.link}>
                    <img src={slide.image} alt={slide.title} decoding="async" onError={handleImageError} />
                    <p className="legend">{slide.title}</p>
                </div>
            ))}
        </ResponsiveCarousel>
    );
};

export default Carousel;