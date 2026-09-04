import React, { useEffect, useState } from 'react';
import './ProductManagement.css';

const DOC_LABELS = {
    national_card: 'کارت ملی',
    company_id: 'شناسه ملی / آگهی',
    business_license: 'جواز کسب',
    bank_certificate: 'تأییدیه شبا',
    other: 'سایر'
};

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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(data.message || 'به‌روزرسانی ناموفق بود');
            return;
        }
        setError('');
        load();
    };

    return (
        <div className="product-management">
            <h2>فروشندگان مارکت‌پلیس</h2>
            <p>ثبت‌نام حقیقی/حقوقی → مدارک و شبا → تأیید → کمیسیون و تسویه.</p>
            {error && <p className="error-message">{error}</p>}
            <div className="products-admin-list">
                {vendors.map((vendor) => (
                    <div key={vendor.id} className="product-admin-item">
                        <div className="product-admin-info">
                            <h3>{vendor.displayName}</h3>
                            <p>
                                {vendor.kind === 'internal' ? 'فروشنده داخلی مجموعه' : (vendor.personKind === 'company' ? 'حقوقی' : 'حقیقی')}
                                {' · '}
                                وضعیت: {vendor.status}
                                {vendor.profileComplete ? ' · پرونده کامل' : ' · ناقص'}
                            </p>
                            <small>
                                {vendor.ownerName} · {vendor.nationalId} · {vendor.phone}
                                {vendor.bankSheba ? ` · شبا ${vendor.bankSheba}` : ''}
                            </small>
                            {(vendor.docs || []).length > 0 && (
                                <p>
                                    {(vendor.docs || []).map((doc) => (
                                        <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ marginLeft: '0.75rem' }}>
                                            {DOC_LABELS[doc.kind] || doc.kind}
                                        </a>
                                    ))}
                                </p>
                            )}
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
