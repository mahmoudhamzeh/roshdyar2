const https = require('https');
const { URL, URLSearchParams } = require('url');

const IDEKAVAN_BASE = 'https://api.m.idekavan.com';
const TOKEN_TTL_MS = 50 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;

let cachedBearer = null;

function envValue(env, key, fallback = '') {
    const value = env && env[key] != null ? env[key] : process.env[key];
    return value == null ? fallback : String(value);
}

function looksLikePlaceholder(value) {
    const text = String(value || '').trim();
    if (!text) return true;
    return /^(YOUR_|CHANGE_ME|placeholder|xxx+$)/i.test(text);
}

function credentialValue(env, key) {
    const value = envValue(env, key).trim();
    return looksLikePlaceholder(value) ? '' : value;
}

function nodeEnvName(env) {
    return envValue(env, 'NODE_ENV', process.env.NODE_ENV || '').trim().toLowerCase();
}

function smsRuntimeStatus(env = process.env) {
    return {
        provider: providerName(env),
        configured: hasSmsCredentials(env),
        hasLine: Boolean(envValue(env, 'SMS_LINE_NUMBER', envValue(env, 'SMS_LINE')).trim()),
        hasPattern: Boolean(envValue(env, 'SMS_PATTERN_ID', envValue(env, 'SMS_TEMPLATE_ID')).trim())
    };
}

function providerName(env) {
    return String(envValue(env, 'SMS_PROVIDER', 'idekavan')).trim().toLowerCase();
}

function idekavanBase(env) {
    return String(envValue(env, 'SMS_API_BASE', IDEKAVAN_BASE)).replace(/\/$/, '');
}

function toIdekavanMobile(phone) {
    let p = String(phone || '').replace(/[\s\-_().]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('98') && p.length >= 12) return p;
    if (p.startsWith('0')) p = p.slice(1);
    if (/^9\d{9}$/.test(p)) return `98${p}`;
    return p;
}

function toIdekavanSource(line) {
    let p = String(line || '').replace(/[\s\-_().]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('98')) return p;
    if (p.startsWith('0')) return `98${p.slice(1)}`;
    return p;
}

function toSmsIrMobile(phone) {
    const p = toIdekavanMobile(phone);
    return p.startsWith('98') ? p.slice(2) : p;
}

function buildOtpMessage(code) {
    return `کد تأیید تات کیدز: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
}

function httpRequest(method, url, { headers, body, timeoutMs } = {}) {
    const u = new URL(url);
    let payload = null;
    const reqHeaders = {
        Accept: 'application/json',
        'User-Agent': 'TatKids/1.0',
        ...(headers || {})
    };

    if (body !== undefined && body !== null) {
        if (typeof body === 'string') {
            payload = body;
            if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
                reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
            }
        } else {
            payload = JSON.stringify(body);
            if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
                reqHeaders['Content-Type'] = 'application/json';
            }
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: u.hostname,
                path: `${u.pathname}${u.search}`,
                method,
                headers: reqHeaders
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    let data = raw;
                    try {
                        data = raw ? JSON.parse(raw) : null;
                    } catch (_) {
                        /* keep raw string */
                    }
                    resolve({ statusCode: res.statusCode, data, raw });
                });
            }
        );
        req.setTimeout(timeoutMs || REQUEST_TIMEOUT_MS, () => {
            req.destroy(new Error(`SMS request timeout after ${timeoutMs || REQUEST_TIMEOUT_MS}ms`));
        });
        req.on('error', reject);
        if (payload !== null) req.write(payload);
        req.end();
    });
}

function buildAuthHeaders(env, extra = {}) {
    const apiKey = credentialValue(env, 'SMS_API_KEY');
    const username = credentialValue(env, 'SMS_USERNAME');
    const password = credentialValue(env, 'SMS_PASSWORD');
    const bearer = credentialValue(env, 'SMS_BEARER_TOKEN');

    const headers = { ...extra };
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
        return headers;
    }
    if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
        return headers;
    }
    if (username && password) {
        headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
        return headers;
    }
    return null;
}

function hasSmsCredentials(env) {
    return Boolean(buildAuthHeaders(env));
}

function summarizeResponse(response) {
    const data = response && response.data;
    if (data && typeof data === 'object') {
        return data.message || data.Message || data.error || data.title || JSON.stringify(data).slice(0, 200);
    }
    const raw = (typeof data === 'string' ? data : (response && response.raw)) || '';
    if (/<html/i.test(raw) || /Forbidden/i.test(raw)) {
        const status = response && response.statusCode;
        if (status === 403) {
            return 'HTTP 403 Forbidden — IP این سرور باید در پنل ایده کاوان مجاز شود';
        }
        return `HTTP ${status} (HTML)`;
    }
    return String(raw).slice(0, 240) || `HTTP ${response && response.statusCode}`;
}

function idekavanError(prefix, response) {
    const data = response && response.data;
    const message = summarizeResponse(response);
    const code = data && typeof data === 'object' && (data.resultCode != null ? data.resultCode : data.status);
    return new Error(code != null ? `${prefix}: ${message} (resultCode=${code})` : `${prefix}: ${message}`);
}

function assertIdekavanSuccess(response, prefix) {
    const data = response && response.data;
    const okHttp = response && response.statusCode >= 200 && response.statusCode < 300;
    const succeeded = data && (data.succeeded === true || data.resultCode === 100);
    if (okHttp && succeeded) return data;
    throw idekavanError(prefix, response);
}

async function fetchIdekavanToken(env, requestFn = httpRequest) {
    const username = credentialValue(env, 'SMS_USERNAME');
    const password = credentialValue(env, 'SMS_PASSWORD');
    if (!username || !password) {
        throw new Error('SMS_USERNAME و SMS_PASSWORD برای دریافت توکن ایده کاوان لازم است');
    }

    if (cachedBearer && cachedBearer.expiresAt > Date.now()) {
        return cachedBearer.token;
    }

    const response = await requestFn('POST', `${idekavanBase(env)}/connect/token`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            scope: 'ApiAccess',
            username,
            password
        }).toString()
    });

    const token = response && response.data && response.data.access_token;
    if (!token) {
        throw idekavanError('idekavan token failed', response);
    }

    cachedBearer = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return token;
}

async function idekavanHeaders(env, requestFn = httpRequest) {
    const headers = buildAuthHeaders(env);
    if (headers) return headers;

    const username = credentialValue(env, 'SMS_USERNAME');
    const password = credentialValue(env, 'SMS_PASSWORD');
    if (username && password) {
        const token = await fetchIdekavanToken(env, requestFn);
        return { Authorization: `Bearer ${token}` };
    }
    throw new Error('برای ایده کاوان SMS_API_KEY یا SMS_USERNAME/SMS_PASSWORD تنظیم نشده است');
}

async function sendIdekavanMessage({ phone, text, code, env, requestFn = httpRequest }) {
    const line = envValue(env, 'SMS_LINE_NUMBER', envValue(env, 'SMS_LINE'));
    if (!line) {
        throw new Error('SMS_LINE_NUMBER برای ایده کاوان تنظیم نشده است');
    }

    const headers = await idekavanHeaders(env, requestFn);
    const version = envValue(env, 'SMS_API_VERSION', '1');
    const destination = toIdekavanMobile(phone);
    const source = toIdekavanSource(line);
    const patternId = envValue(env, 'SMS_PATTERN_ID', envValue(env, 'SMS_TEMPLATE_ID')).trim();

    if (patternId) {
        const response = await requestFn(
            'POST',
            `${idekavanBase(env)}/api/PatternMessage/send`,
            {
                headers,
                body: {
                    destinations: [destination],
                    parameters: [String(code != null ? code : text)],
                    patternId
                }
            }
        );
        const data = assertIdekavanSuccess(response, 'idekavan pattern failed');
        return { delivered: true, channel: 'idekavan-pattern', data: data.data };
    }

    const response = await requestFn(
        'POST',
        `${idekavanBase(env)}/api/${version}/message/send`,
        {
            headers,
            body: [
                {
                    SourceAddress: source,
                    DestinationAddress: destination,
                    MessageText: text,
                    DataCoding: 8
                }
            ]
        }
    );
    const data = assertIdekavanSuccess(response, 'idekavan send failed');
    return { delivered: true, channel: 'idekavan', data: data.data };
}

async function sendSmsIrMessage({ phone, code, env, requestFn = httpRequest }) {
    const apiKey = envValue(env, 'SMS_API_KEY').trim();
    const lineNumber = envValue(env, 'SMS_LINE_NUMBER', envValue(env, 'SMS_LINE'));
    const templateId = envValue(env, 'SMS_TEMPLATE_ID').trim();
    const templateParam = envValue(env, 'SMS_TEMPLATE_PARAM', 'CODE');
    const mobile = toSmsIrMobile(phone);

    if (templateId) {
        const response = await requestFn('POST', 'https://api.sms.ir/v1/send/verify', {
            headers: { 'x-api-key': apiKey, Accept: 'text/plain' },
            body: {
                mobile,
                templateId: Number(templateId),
                parameters: [{ name: templateParam, value: String(code) }]
            }
        });
        if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.status === 1) {
            return { delivered: true, channel: 'sms.ir-verify', data: response.data.data };
        }
        throw idekavanError('sms.ir verify failed', response);
    }

    if (lineNumber) {
        const response = await requestFn('POST', 'https://api.sms.ir/v1/send/bulk', {
            headers: { 'x-api-key': apiKey, Accept: 'text/plain' },
            body: {
                lineNumber: Number(lineNumber),
                messageText: buildOtpMessage(code),
                mobiles: [mobile],
                sendDateTime: null
            }
        });
        if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.status === 1) {
            return { delivered: true, channel: 'sms.ir-bulk', data: response.data.data };
        }
        throw idekavanError('sms.ir bulk failed', response);
    }

    throw new Error('SMS_TEMPLATE_ID یا SMS_LINE_NUMBER برای sms.ir تنظیم نشده است');
}

async function fetchUserInfo(env, requestFn = httpRequest) {
    const headers = await idekavanHeaders(env, requestFn);
    const response = await requestFn('GET', `${idekavanBase(env)}/api/user/userinfo`, { headers });
    return assertIdekavanSuccess(response, 'idekavan userinfo failed');
}

async function pingProvider(env, requestFn = httpRequest) {
    const headers = await idekavanHeaders(env, requestFn);
    const response = await requestFn('GET', `${idekavanBase(env)}/api/Tools/Ping`, { headers });
    return { statusCode: response.statusCode, data: response.data, raw: response.raw };
}

async function deliverOtp(phone, code, deps = {}) {
    const env = deps.env || process.env;
    const requestFn = deps.requestFn || httpRequest;
    const provider = providerName(env);

    if (provider === 'console' || provider === 'log') {
        if (nodeEnvName(env) === 'production') {
            throw new Error('در production نمی‌توان SMS_PROVIDER=log گذاشت. SMS_PROVIDER=idekavan را در server/.env تنظیم کنید.');
        }
        console.log(`[OTP] کد تأیید برای ${phone}: ${code} (معتبر به مدت ۵ دقیقه)`);
        return { delivered: true, channel: 'log' };
    }

    if (provider === 'idekavan' || provider === 'idekavan.com') {
        return sendIdekavanMessage({
            phone,
            text: buildOtpMessage(code),
            code,
            env,
            requestFn
        });
    }

    if (provider === 'sms.ir' || provider === 'smsir') {
        if (!envValue(env, 'SMS_API_KEY').trim()) {
            throw new Error('SMS_API_KEY برای sms.ir تنظیم نشده است');
        }
        return sendSmsIrMessage({ phone, code, env, requestFn });
    }

    throw new Error(`SMS_PROVIDER ناشناخته است: ${provider}`);
}

function resetTokenCache() {
    cachedBearer = null;
}

module.exports = {
    deliverOtp,
    sendIdekavanMessage,
    fetchUserInfo,
    pingProvider,
    toIdekavanMobile,
    toIdekavanSource,
    toSmsIrMobile,
    buildOtpMessage,
    buildAuthHeaders,
    hasSmsCredentials,
    smsRuntimeStatus,
    httpRequest,
    resetTokenCache
};
