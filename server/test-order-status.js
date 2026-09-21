const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    ORDER_STATUS_FLOW,
    STORED_ORDER_STATUSES,
    canonicalOrderStatus,
    initialOrderStatus,
    parseStoredOrderStatus,
    vendorLineDecision
} = require('./order-status');

assert.deepStrictEqual(
    ORDER_STATUS_FLOW.map((item) => item.label),
    ['سبد خرید', 'در انتظار پرداخت', 'در حال پردازش', 'در حال ارسال', 'تحویل شده', 'لغو شده', 'مرجوع شده']
);
assert.ok(!STORED_ORDER_STATUSES.includes('cart'));
assert.strictEqual(canonicalOrderStatus('pending', 'unpaid'), 'pending_payment');
assert.strictEqual(canonicalOrderStatus('pending', 'pending'), 'pending_payment');
assert.strictEqual(canonicalOrderStatus('pending', 'paid'), 'processing');
assert.strictEqual(canonicalOrderStatus('confirmed', 'paid'), 'processing');
assert.strictEqual(canonicalOrderStatus('preparing'), 'processing');
assert.strictEqual(canonicalOrderStatus('shipped'), 'shipping');
assert.strictEqual(canonicalOrderStatus('returned'), 'returned');
assert.strictEqual(initialOrderStatus('pending'), 'pending_payment');
assert.strictEqual(initialOrderStatus('paid'), 'processing');
assert.strictEqual(parseStoredOrderStatus('confirmed'), 'processing');
assert.strictEqual(parseStoredOrderStatus('cart'), null);

const paidCancel = vendorLineDecision({
    currentLineStatus: 'processing',
    nextStatus: 'cancelled',
    paymentStatus: 'paid'
});
assert.strictEqual(paidCancel.ok, false);
assert.ok(/پرداخت/.test(paidCancel.message));

const unpaidCancel = vendorLineDecision({
    currentLineStatus: 'pending_payment',
    nextStatus: 'cancelled',
    paymentStatus: 'pending'
});
assert.strictEqual(unpaidCancel.ok, true);
assert.strictEqual(unpaidCancel.status, 'cancelled');

const fromCancelled = vendorLineDecision({
    currentLineStatus: 'cancelled',
    nextStatus: 'processing',
    paymentStatus: 'pending'
});
assert.strictEqual(fromCancelled.ok, false);
assert.ok(/لغو شده/.test(fromCancelled.message));

const paidShip = vendorLineDecision({
    currentLineStatus: 'processing',
    nextStatus: 'shipping',
    paymentStatus: 'paid'
});
assert.strictEqual(paidShip.ok, true);
assert.strictEqual(paidShip.status, 'shipping');

const clientSrc = fs.readFileSync(path.join(__dirname, '../client/src/utils/orderStatus.js'), 'utf8');
ORDER_STATUS_FLOW.forEach((item) => {
    assert.ok(clientSrc.includes(`'${item.id}'`), `client order status missing ${item.id}`);
    assert.ok(clientSrc.includes(item.label), `client order status missing ${item.label}`);
});
assert.ok(clientSrc.includes('سفارش پرداخت‌شده را نمی‌توان لغو کرد') === false);
assert.ok(clientSrc.includes('vendorLineOptions'));

const vendorSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/VendorPanelPage.js'), 'utf8');
assert.ok(vendorSrc.includes('vendorLineOptions'));
assert.ok(vendorSrc.includes('isVendorLineLocked'));

const shippingSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/CheckoutShippingPage.js'), 'utf8');
assert.ok(/checkout-days/.test(shippingSrc));
assert.ok(/checkout-day/.test(shippingSrc));
assert.ok(/checkout-slots/.test(shippingSrc));
assert.ok(/weekday/.test(shippingSrc));
assert.ok(!/checkout-chips/.test(shippingSrc.split('زمان ارسال')[1] || ''), 'delivery days must not use wrapping chips');

console.log('order status tests passed');
