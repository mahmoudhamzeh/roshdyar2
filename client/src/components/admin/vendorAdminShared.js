import React from 'react';
import { ORDER_STATUS_LABELS } from '../../utils/orderStatus';

export const DOC_KINDS = [
    { id: 'national_card', label: 'کارت ملی / شناسنامه' },
    { id: 'company_id', label: 'آگهی تأسیس / شناسه ملی' },
    { id: 'business_license', label: 'جواز کسب یا پروانه' },
    { id: 'bank_certificate', label: 'تأییدیه شبا / کارت بانکی' },
    { id: 'other', label: 'سایر مدارک' }
];

export const DOC_LABELS = Object.fromEntries(DOC_KINDS.map((item) => [item.id, item.label]));

export const STATUS_LABELS = {
    pending: 'در انتظار بررسی',
    active: 'تأیید شده',
    suspended: 'تعلیق',
    returned: 'نیاز به اصلاح',
    rejected: 'رد شده'
};

export const LINE_STATUS_LABELS = ORDER_STATUS_LABELS;

export const LEDGER_LABELS = {
    sale: 'فروش',
    commission: 'کمیسیون',
    vendor_hold: 'مانده امانی',
    refund: 'بازگشت',
    vendor_payout: 'تسویه'
};

export const empty = (value) => !String(value || '').trim();

export const isImageDoc = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url || '');

export const isRequestStatus = (vendor) =>
    vendor && vendor.kind !== 'internal' && ['pending', 'returned', 'rejected'].includes(vendor.status);

export const Field = ({ label, value }) => (
    <div className={`vendor-review-field ${empty(value) ? 'is-empty' : ''}`}>
        <span>{label}</span>
        <strong>{empty(value) ? 'ثبت نشده' : value}</strong>
    </div>
);

export const statusCaption = (vendor) => {
    if (!vendor) return '';
    if (vendor.status === 'returned' && (vendor.requestedDocs || []).length) return 'در انتظار مدارک';
    return STATUS_LABELS[vendor.status] || vendor.status;
};

export const uploadedDocKinds = (vendor) => new Set((vendor.docs || []).map((doc) => doc.kind));

export const VendorDocs = ({ vendor }) => {
    if (!(vendor.docs || []).length) {
        return <p className="vendor-review-muted">هنوز مدرکی بارگذاری نشده است.</p>;
    }
    return (
        <ul className="vendor-review-docs">
            {(vendor.docs || []).map((doc) => (
                <li key={doc.id}>
                    {isImageDoc(doc.fileUrl) && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                            <img src={doc.fileUrl} alt={doc.originalName || doc.kind} />
                        </a>
                    )}
                    <div>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                            {DOC_LABELS[doc.kind] || doc.kind}
                        </a>
                        <small>{doc.originalName || doc.fileUrl}</small>
                    </div>
                </li>
            ))}
        </ul>
    );
};
