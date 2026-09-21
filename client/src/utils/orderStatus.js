export const ORDER_STATUS_FLOW = [
    { id: 'cart', label: 'سبد خرید' },
    { id: 'pending_payment', label: 'در انتظار پرداخت' },
    { id: 'processing', label: 'در حال پردازش' },
    { id: 'shipping', label: 'در حال ارسال' },
    { id: 'delivered', label: 'تحویل شده' },
    { id: 'cancelled', label: 'لغو شده' },
    { id: 'returned', label: 'مرجوع شده' }
];

export const STORED_ORDER_STATUSES = ORDER_STATUS_FLOW
    .filter((item) => item.id !== 'cart')
    .map((item) => item.id);

export const ORDER_STATUS_LABELS = Object.fromEntries(
    ORDER_STATUS_FLOW.map((item) => [item.id, item.label])
);

export const canonicalOrderStatus = (status, paymentStatus) => {
    const raw = String(status || '').trim();
    if (raw === 'pending') {
        return paymentStatus === 'paid' ? 'processing' : 'pending_payment';
    }
    if (raw === 'confirmed' || raw === 'preparing') return 'processing';
    if (raw === 'shipped') return 'shipping';
    if (ORDER_STATUS_LABELS[raw]) return raw;
    return 'pending_payment';
};

export const orderStatusLabel = (status, paymentStatus) => {
    const id = canonicalOrderStatus(status, paymentStatus);
    return ORDER_STATUS_LABELS[id] || id;
};

export const vendorLineOptions = (currentLineStatus, paymentStatus) => {
    const current = canonicalOrderStatus(currentLineStatus, paymentStatus);
    const options = ORDER_STATUS_FLOW.filter((item) => item.id !== 'cart');
    if (current === 'cancelled') {
        return options.filter((item) => item.id === 'cancelled');
    }
    if (paymentStatus === 'paid') {
        return options.filter((item) => item.id !== 'cancelled' && item.id !== 'pending_payment');
    }
    return options;
};

export const isVendorLineLocked = (currentLineStatus, paymentStatus) =>
    canonicalOrderStatus(currentLineStatus, paymentStatus) === 'cancelled';
