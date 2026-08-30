import React, { useEffect, useState } from 'react';
import './ProductManagement.css';

const VendorManagement = () => {
    const [vendors, setVendors] = useState([]);
    const [error, setError] = useState('');

    const load = async () => {
        const res = await fetch('/api/admin/vendors');
        if (!res.ok) {
            setError('بارگذاری فروشندگان ناموفق بود');
            return;
        }
        setVendors(await res.json());
    };

    useEffect(() => {
        load();
    }, []);

    const update = async (vendor, patch) => {
        const res = await fetch(`/api/admin/vendors/${vendor.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...vendor, ...patch })
        });
        if (!res.ok) return;
        load();
    };

    return (
        <div className="product-management">
            <h2>فروشندگان مارکت‌پلیس</h2>
            <p>ثبت‌نام → بررسی مدارک → تأیید → تعیین کمیسیون و تسویه.</p>
            {error && <p className="error-message">{error}</p>}
            <div className="products-admin-list">
                {vendors.map((vendor) => (
                    <div key={vendor.id} className="product-admin-item">
                        <div>
                            <h3>{vendor.displayName}</h3>
                            <p>{vendor.kind === 'internal' ? 'فروشنده داخلی مجموعه' : 'مارکت‌پلیس'} · وضعیت: {vendor.status}</p>
                            <small>{vendor.docsNote || vendor.phone}</small>
                        </div>
                        <div className="product-admin-actions">
                            {vendor.kind !== 'internal' && vendor.status !== 'active' && (
                                <button type="button" className="btn-edit" onClick={() => update(vendor, { status: 'active' })}>
                                    تأیید
                                </button>
                            )}
                            {vendor.status === 'active' && vendor.kind !== 'internal' && (
                                <button type="button" className="btn-delete" onClick={() => update(vendor, { status: 'suspended' })}>
                                    تعلیق
                                </button>
                            )}
                            <label>
                                کمیسیون ٪
                                <input
                                    type="number"
                                    min="0"
                                    defaultValue={vendor.commissionPct}
                                    onBlur={(e) => update(vendor, { commissionPct: e.target.value })}
                                />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VendorManagement;
