const https = require('https');

const LIVE = {
    request: 'https://payment.zarinpal.com/pg/v4/payment/request.json',
    verify: 'https://payment.zarinpal.com/pg/v4/payment/verify.json',
    start: 'https://payment.zarinpal.com/pg/StartPay/'
};

const SANDBOX = {
    request: 'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
    verify: 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json',
    start: 'https://sandbox.zarinpal.com/pg/StartPay/'
};

function merchantId() {
    return String(process.env.ZARINPAL_MERCHANT_ID || '').trim();
}

function isMock() {
    return !merchantId() || process.env.ZARINPAL_MOCK === '1' || process.env.NODE_ENV === 'test';
}

function endpoints() {
    return String(process.env.ZARINPAL_SANDBOX || '') === '1' ? SANDBOX : LIVE;
}

function postJson(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const parsed = new URL(url);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw || '{}'));
                } catch (err) {
                    reject(new Error('پاسخ زرین‌پال نامعتبر است'));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function requestPayment({ amount, description, callbackUrl, mobile, email, orderId }) {
    if (isMock()) {
        const authority = `MOCK${String(orderId || Date.now())}${Math.random().toString(36).slice(2, 8)}`;
        const join = String(callbackUrl || '').includes('?') ? '&' : '?';
        return {
            mock: true,
            authority,
            paymentUrl: `${callbackUrl}${join}Authority=${encodeURIComponent(authority)}&Status=OK`
        };
    }
    const ep = endpoints();
    const payload = {
        merchant_id: merchantId(),
        amount: Math.round(Number(amount)),
        currency: process.env.ZARINPAL_CURRENCY || 'IRT',
        description: description || 'پرداخت سفارش تات کیدز',
        callback_url: callbackUrl,
        metadata: {}
    };
    if (mobile) payload.metadata.mobile = String(mobile);
    if (email) payload.metadata.email = String(email);
    if (orderId) payload.metadata.order_id = String(orderId);
    const result = await postJson(ep.request, payload);
    const code = result && result.data && result.data.code;
    const authority = result && result.data && result.data.authority;
    if (code !== 100 || !authority) {
        const message = (result && result.errors && (result.errors.message || result.errors[0]))
            || 'خطا در اتصال به درگاه پرداخت';
        const err = new Error(typeof message === 'string' ? message : 'خطا در اتصال به درگاه پرداخت');
        err.zarinpal = result;
        throw err;
    }
    return {
        mock: false,
        authority,
        paymentUrl: `${ep.start}${authority}`
    };
}

async function verifyPayment({ amount, authority }) {
    if (isMock() || String(authority || '').startsWith('MOCK')) {
        return {
            code: 100,
            message: 'Verified',
            ref_id: Number(String(Date.now()).slice(-8)),
            card_pan: '6037********0000',
            mock: true
        };
    }
    const ep = endpoints();
    const result = await postJson(ep.verify, {
        merchant_id: merchantId(),
        amount: Math.round(Number(amount)),
        authority
    });
    return (result && result.data) || {};
}

module.exports = {
    requestPayment,
    verifyPayment,
    merchantId,
    isMock
};
