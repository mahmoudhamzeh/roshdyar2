import React from 'react';

/**
 * TatKids brand mark — uses the shared logo asset.
 * size: pixel size of the icon (default 32)
 */
const BrandLogo = ({ size = 32, className = '', alt = 'تات کیدز' }) => (
    <img
        className={className}
        src={`${process.env.PUBLIC_URL || ''}/logo-192.png`}
        width={size}
        height={size}
        alt={alt}
        decoding="async"
    />
);

export default BrandLogo;
