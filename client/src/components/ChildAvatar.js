import React from 'react';
import { getChildDisplayName } from '../utils/childName';
import './ChildAvatar.css';

export const childPhotoSrc = (avatar) => {
    const value = String(avatar || '').trim();
    if (!value || /pravatar\.cc/i.test(value)) return null;
    return value;
};

export const childGenderKind = (child) => {
    const raw = String((child && child.gender) || '').trim().toLowerCase();
    if (['girl', 'female', 'f', 'دختر', 'دخترانه'].includes(raw)) return 'girl';
    return 'boy';
};

const BoyIllustration = () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="40" fill="#bae6fd" />
        <circle cx="18" cy="18" r="5" fill="#fff" opacity="0.45" />
        <ellipse cx="40" cy="74" rx="24" ry="14" fill="#0f766e" />
        <path d="M20 36c3-18 11-24 20-24s17 6 20 24c-4-9-11-13-20-13s-16 4-20 13z" fill="#1e3a5f" />
        <circle cx="40" cy="43" r="18" fill="#ffd7b5" />
        <path d="M24 38c2-12 8-16 16-16s14 4 16 16c-4-7-9-10-16-10s-12 3-16 10z" fill="#1e3a5f" />
        <circle cx="33.2" cy="42.5" r="2.3" fill="#1f2937" />
        <circle cx="46.8" cy="42.5" r="2.3" fill="#1f2937" />
        <circle cx="32.4" cy="41.6" r="0.7" fill="#fff" />
        <circle cx="46" cy="41.6" r="0.7" fill="#fff" />
        <path d="M34 51.5c3.8 3.4 8.2 3.4 12 0" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28" cy="48" r="3.2" fill="#fda4af" opacity="0.8" />
        <circle cx="52" cy="48" r="3.2" fill="#fda4af" opacity="0.8" />
    </svg>
);

const GirlIllustration = () => (
    <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="40" fill="#fbcfe8" />
        <circle cx="62" cy="16" r="5" fill="#fff" opacity="0.45" />
        <ellipse cx="40" cy="75" rx="24" ry="13" fill="#db2777" />
        <path d="M14 46c5-24 14-32 26-32s21 8 26 32c-6 11-16 17-26 17s-20-6-26-17z" fill="#7c2d12" />
        <circle cx="40" cy="43" r="17.2" fill="#ffd7b5" />
        <path d="M24 39c3-13 9-17 16-17s13 4 16 17" fill="#7c2d12" />
        <circle cx="40" cy="17.5" r="5.6" fill="#db2777" />
        <circle cx="40" cy="17.5" r="2.4" fill="#fde68a" />
        <circle cx="33.4" cy="42.6" r="2.15" fill="#1f2937" />
        <circle cx="46.6" cy="42.6" r="2.15" fill="#1f2937" />
        <circle cx="32.6" cy="41.8" r="0.65" fill="#fff" />
        <circle cx="45.8" cy="41.8" r="0.65" fill="#fff" />
        <path d="M34.2 51.2c3.7 3.2 7.9 3.2 11.6 0" fill="none" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28.5" cy="48" r="3.1" fill="#fb7185" opacity="0.82" />
        <circle cx="51.5" cy="48" r="3.1" fill="#fb7185" opacity="0.82" />
    </svg>
);

const ChildAvatar = ({ child, size = 'md', className = '', alt }) => {
    const src = childPhotoSrc(child && child.avatar);
    const name = alt || getChildDisplayName(child);
    const gender = childGenderKind(child);
    const classes = `child-avatar child-avatar--${size} ${className}`.trim();

    if (src) {
        return <img className={classes} src={src} alt={name} />;
    }

    return (
        <span className={`${classes} child-avatar--illus child-avatar--${gender}`} role="img" aria-label={name}>
            {gender === 'girl' ? <GirlIllustration /> : <BoyIllustration />}
        </span>
    );
};

export default ChildAvatar;
