const ORDER_STATUS_FLOW = [
    { id: 'cart', label: 'سبد خرید' },
    { id: 'pending_payment', label: 'در انتظار پرداخت' },
    { id: 'processing', label: 'در حال پردازش' },
    { id: 'shipping', label: 'در حال ارسال' },
    { id: 'delivered', label: 'تحویل شده' },
    { id: 'cancelled', label: 'لغو شده' },
    { id: 'returned', label: 'مرجوع شده' }
];

const STORED_ORDER_STATUSES = ORDER_STATUS_FLOW
    .filter((item) => item.id !== 'cart')
    .map((item) => item.id);

const ORDER_STATUS_LABELS = Object.fromEntries(
    ORDER_STATUS_FLOW.map((item) => [item.id, item.label])
);

const LINE_PROMOTE_AFTER_PAY = ['pending', 'pending_payment', 'preparing', 'confirmed'];

function canonicalOrderStatus(status, paymentStatus) {
    const raw = String(status || '').trim();
    if (raw === 'pending') {
        return paymentStatus === 'paid' ? 'processing' : 'pending_payment';
    }
    if (raw === 'confirmed' || raw === 'preparing') return 'processing';
    if (raw === 'shipped') return 'shipping';
    if (ORDER_STATUS_LABELS[raw]) return raw;
    return 'pending_payment';
}

function initialOrderStatus(paymentStatus) {
    return paymentStatus === 'paid' ? 'processing' : 'pending_payment';
}

function parseStoredOrderStatus(status, paymentStatus) {
    const next = canonicalOrderStatus(status, paymentStatus);
    return STORED_ORDER_STATUSES.includes(next) ? next : null;
}

function vendorLineDecision({ currentLineStatus, nextStatus, paymentStatus }) {
    const current = canonicalOrderStatus(currentLineStatus, paymentStatus);
    const next = parseStoredOrderStatus(nextStatus, paymentStatus);
    if (!next) {
        return { ok: false, statusCode: 400, message: 'وضعیت سفارش نامعتبر است' };
    }
    if (current === 'cancelled') {
        return { ok: false, statusCode: 409, message: 'سفارش لغو شده را نمی‌توان تغییر داد' };
    }
    if (next === 'cancelled' && paymentStatus === 'paid') {
        return { ok: false, statusCode: 409, message: 'سفارش پرداخت‌شده را نمی‌توان لغو کرد' };
    }
    return { ok: true, status: next };
}

module.exports = {
    ORDER_STATUS_FLOW,
    STORED_ORDER_STATUSES,
    ORDER_STATUS_LABELS,
    LINE_PROMOTE_AFTER_PAY,
    canonicalOrderStatus,
    initialOrderStatus,
    parseStoredOrderStatus,
    vendorLineDecision
};
