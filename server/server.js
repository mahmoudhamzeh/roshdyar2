require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { vaccinationSchedule } = require('./vaccination-schedule');
const { recommendedCheckupsData } = require('./recommendations');
const store = require('./db');

const app = express();
const port = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadsDir, { etag: false, lastModified: false }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.get('/api/health', (req, res) => {
    try {
        res.json(store.health());
    } catch (err) {
        res.status(503).json({ ok: false, message: err.message });
    }
});

const API_CATALOG = {
    name: 'TatKids API',
    language: 'Node.js / Express',
    database: 'SQLite relational (WAL, indexed tables)',
    groups: {
        system: ['GET /api', 'GET /api/health'],
        auth: [
            'POST /api/login',
            'POST /api/signup',
            'POST /api/auth/send-otp',
            'POST /api/auth/verify-otp',
            'POST /api/auth/forgot-password/send-otp',
            'POST /api/auth/forgot-password/verify-otp',
            'POST /api/auth/forgot-password/reset'
        ],
        users: ['GET /api/users/:id', 'PUT /api/users/:id', 'PUT /api/users/:id/password'],
        children: [
            'GET /api/children',
            'POST /api/children',
            'GET /api/children/:childId',
            'PUT /api/children/:childId',
            'DELETE /api/children/:childId',
            'PUT /api/children/:childId/vaccination-records',
            'POST /api/children/:childId/avatar'
        ],
        growth: [
            'GET /api/growth/:childId',
            'POST /api/growth/:childId',
            'PUT /api/growth/:childId/record/:recordId',
            'DELETE /api/growth/:childId/record/:recordId',
            'DELETE /api/growth/:childId/:date'
        ],
        health: [
            'GET /api/vaccination-status/:childId',
            'POST /api/vaccinate/:childId',
            'GET /api/vaccination-schedule',
            'GET /api/visits/:childId',
            'POST /api/visits/:childId',
            'DELETE /api/visits/:childId/:visitId',
            'GET /api/checkups/:childId',
            'POST /api/checkups/:childId',
            'DELETE /api/checkups/:childId/:checkupId',
            'GET /api/documents/:childId',
            'POST /api/documents/:childId',
            'DELETE /api/documents/:childId/:documentId',
            'GET /api/recommended-tests/:childId'
        ],
        content: [
            'GET /api/banners',
            'GET /api/news',
            'GET /api/news/:id',
            'GET /api/videos',
            'GET /api/videos/:id',
            'GET /api/podcasts',
            'GET /api/podcasts/:id'
        ],
        shop: [
            'GET /api/shop/categories',
            'GET /api/shop/products',
            'GET /api/shop/products/:id',
            'GET /api/shop/orders',
            'GET /api/shop/orders/:id',
            'POST /api/shop/orders'
        ],
        reminders: [
            'POST /api/generate-reminders/:userId',
            'GET /api/reminders/all/:childId',
            'POST /api/reminders/manual/:childId',
            'DELETE /api/reminders/manual/:childId/:reminderId',
            'GET /api/user-reminders',
            'POST /api/user-reminders',
            'PUT /api/user-reminders/:id',
            'DELETE /api/user-reminders/:id'
        ],
        messages: [
            'GET /api/messages',
            'GET /api/messages/unread-count',
            'PUT /api/messages/:id/read',
            'DELETE /api/messages/:id'
        ],
        tickets: ['GET /api/tickets', 'POST /api/tickets', 'GET /api/tickets/:id'],
        admin: [
            'GET /api/admin/stats',
            'GET /api/admin/users',
            'PUT /api/admin/users/:id',
            'DELETE /api/admin/users/:id',
            'GET /api/admin/users/:userId/children',
            'PUT /api/admin/users/:id/set-password',
            'GET /api/admin/tickets',
            'GET /api/admin/tickets/:id',
            'PUT /api/admin/tickets/:id',
            'POST /api/admin/banners',
            'PUT /api/admin/banners/:id',
            'DELETE /api/admin/banners/:id',
            'POST /api/admin/news',
            'PUT /api/admin/news/:id',
            'DELETE /api/admin/news/:id',
            'POST /api/admin/videos',
            'PUT /api/admin/videos/:id',
            'DELETE /api/admin/videos/:id',
            'POST /api/admin/podcasts',
            'PUT /api/admin/podcasts/:id',
            'DELETE /api/admin/podcasts/:id',
            'GET /api/admin/products',
            'POST /api/admin/products',
            'PUT /api/admin/products/:id',
            'DELETE /api/admin/products/:id',
            'GET /api/admin/orders',
            'PUT /api/admin/orders/:id',
            'GET /api/admin/messages',
            'POST /api/admin/messages',
            'DELETE /api/admin/messages/:id'
        ]
    }
};

app.get('/api', (req, res) => {
    res.json(API_CATALOG);
});

function requireUser(req, res) {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) {
        res.status(401).json({ message: 'لطفا وارد شوید' });
        return null;
    }
    const user = store.users.getById(userId);
    if (!user) {
        res.status(401).json({ message: 'لطفا وارد شوید' });
        return null;
    }
    return user;
}

function paginateList(list, req) {
    if (req.query.limit == null || req.query.limit === '') return list;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const total = list.length;
    const start = (page - 1) * limit;
    return {
        items: list.slice(start, start + limit),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
    };
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function calculateAgeInMonths(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(String(birthDate).replace(/\//g, '-'));
    if (Number.isNaN(birth.getTime())) return 0;
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
}

function getChildDisplayName(child) {
    if (!child) return 'کودک';
    if (child.name) return child.name;
    return `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'کودک';
}

function normalizeChildName(childData) {
    if (!childData) return childData;
    if (childData.firstName || childData.lastName) {
        childData.name = `${childData.firstName || ''} ${childData.lastName || ''}`.trim();
    } else if (childData.name && !childData.firstName) {
        const parts = String(childData.name).trim().split(/\s+/);
        childData.firstName = parts[0] || '';
        childData.lastName = parts.slice(1).join(' ');
    }
    return childData;
}

// --- Auth helpers (OTP registration) ---
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
/** Phones with an in-flight SMS send — prevents double-send races. */
const otpPending = new Set();

function otpCooldownResponse(phone, existing) {
    const now = Date.now();
    const retryAfterSec = Math.max(
        1,
        Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000)
    );
    const expiresInSec = Math.max(0, Math.ceil((existing.expiresAt - now) / 1000));
    return {
        message: `لطفاً ${retryAfterSec} ثانیه دیگر برای ارسال مجدد صبر کنید.`,
        retryAfterSec,
        expiresInSec,
        expiresAt: new Date(existing.expiresAt).toISOString(),
        codeAlreadySent: true,
        phone
    };
}

function validateNewPassword(password) {
    const value = String(password || '');
    if (value.length < 4) {
        return 'رمز عبور باید حداقل ۴ کاراکتر باشد';
    }
    return null;
}

function toEnglishDigits(value) {
    return String(value || '')
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function normalizePhone(phone) {
    let p = toEnglishDigits(phone).replace(/[\s\-_().]/g, '');
    if (p.startsWith('+98')) p = `0${p.slice(3)}`;
    else if (p.startsWith('0098')) p = `0${p.slice(4)}`;
    else if (p.startsWith('98') && p.length === 12) p = `0${p.slice(2)}`;
    return p;
}

function isValidIranMobile(phone) {
    return /^09\d{9}$/.test(phone);
}

function generateOtpCode() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

function findUserByPhone(phone) {
    return store.users.findByPhone(phone);
}

/** Admin accounts accept both "Amin" and "admin" as login aliases. */
const ADMIN_LOGIN_ALIASES = new Set(['amin', 'admin']);

function identitiesMatch(user, login) {
    const loginRaw = String(login || '').trim();
    if (!loginRaw) return false;

    const loginLower = loginRaw.toLowerCase();
    const usernameLower = String(user.username || '').toLowerCase();
    const emailLower = String(user.email || '').toLowerCase();
    const normalizedLogin = normalizePhone(loginRaw);

    const adminAliasMatch =
        user.isAdmin &&
        ADMIN_LOGIN_ALIASES.has(loginLower) &&
        ADMIN_LOGIN_ALIASES.has(usernameLower);

    return (
        usernameLower === loginLower ||
        emailLower === loginLower ||
        adminAliasMatch ||
        (normalizedLogin &&
            (normalizePhone(user.mobile) === normalizedLogin ||
                normalizePhone(user.username) === normalizedLogin))
    );
}

function ensureDefaultAdmin() {
    const existingAdmin = store.users.list().find((u) => u.isAdmin);
    if (existingAdmin) {
        if (String(existingAdmin.username || '').toLowerCase() === 'admin') {
            store.users.update(existingAdmin.id, { username: 'Amin' });
            console.log('Renamed legacy admin username to Amin');
        }
        return;
    }

    store.users.create({
        username: 'Amin',
        email: 'admin@example.com',
        password: 'admin',
        isAdmin: true
    });
    console.log('Created default admin user: Amin / admin');
}

function publicUser(user) {
    const { password, ...userToSend } = user;
    return userToSend;
}

function httpsJsonRequest(method, url, headers, bodyObj) {
    const https = require('https');
    const body = bodyObj === undefined ? null : JSON.stringify(bodyObj);
    const u = new URL(url);
    const reqHeaders = { Accept: 'application/json', ...(headers || {}) };
    if (body !== null) {
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(body);
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
        req.on('error', reject);
        if (body !== null) req.write(body);
        req.end();
    });
}

function toSmsIrMobile(phone) {
    // sms.ir examples commonly use 9xxxxxxxxx (without leading 0)
    return phone.startsWith('0') ? phone.slice(1) : phone;
}

async function deliverOtp(phone, code) {
    const apiKey = process.env.SMS_API_KEY;
    const provider = String(process.env.SMS_PROVIDER || '').toLowerCase();
    const lineNumber = process.env.SMS_LINE_NUMBER || process.env.SMS_LINE || '';
    const templateId = process.env.SMS_TEMPLATE_ID;
    const templateParam = process.env.SMS_TEMPLATE_PARAM || 'CODE';

    if (!apiKey || provider === 'console' || provider === 'log') {
        console.log(`[OTP] کد تأیید برای ${phone}: ${code} (معتبر به مدت ۵ دقیقه)`);
        return { delivered: true, channel: 'log' };
    }

    if (provider === 'sms.ir' || provider === 'smsir') {
        const mobile = toSmsIrMobile(phone);

        // Preferred: Verify template (service line / high priority)
        if (templateId) {
            const response = await httpsJsonRequest(
                'POST',
                'https://api.sms.ir/v1/send/verify',
                { 'x-api-key': apiKey, Accept: 'text/plain' },
                {
                    mobile,
                    templateId: Number(templateId),
                    parameters: [{ name: templateParam, value: String(code) }]
                }
            );
            if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.status === 1) {
                return { delivered: true, channel: 'sms.ir-verify', data: response.data.data };
            }
            const errMsg =
                (response.data && (response.data.message || response.data.Message)) ||
                response.raw ||
                `HTTP ${response.statusCode}`;
            throw new Error(`sms.ir verify failed: ${errMsg}`);
        }

        // Fallback: bulk text SMS with configured line number
        if (lineNumber) {
            const messageText = `کد تأیید تات کیدز: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
            const response = await httpsJsonRequest(
                'POST',
                'https://api.sms.ir/v1/send/bulk',
                { 'x-api-key': apiKey, Accept: 'text/plain' },
                {
                    lineNumber: Number(lineNumber),
                    messageText,
                    mobiles: [mobile],
                    sendDateTime: null
                }
            );
            if (response.statusCode >= 200 && response.statusCode < 300 && response.data && response.data.status === 1) {
                return { delivered: true, channel: 'sms.ir-bulk', data: response.data.data };
            }
            const errMsg =
                (response.data && (response.data.message || response.data.Message)) ||
                response.raw ||
                `HTTP ${response.statusCode}`;
            throw new Error(`sms.ir bulk failed: ${errMsg}`);
        }

        throw new Error('SMS_TEMPLATE_ID یا SMS_LINE_NUMBER برای sms.ir تنظیم نشده است');
    }

    console.log(`[OTP] Unknown SMS_PROVIDER="${provider}". کد برای ${phone}: ${code}`);
    return { delivered: true, channel: 'log' };
}

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });
    }
    const user = store.users.findCandidatesForLogin(login).find(
        (u) => identitiesMatch(u, login) && u.password != null && u.password === password
    );
    if (user) {
        res.status(200).json({ message: 'ورود موفقیت‌آمیز', user: publicUser(user) });
    } else {
        res.status(401).json({ message: 'نام کاربری یا رمز عبور نامعتبر است' });
    }
});

app.post('/api/signup', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });

    const existingUser = store.users.findByUsernameOrEmail(login);
    if (existingUser) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده است' });

    store.users.create({ username: login, email: login, password, isAdmin: false });
    res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.' });
});

async function issueOtp({ phone, purpose, res }) {
    const existing = store.otp.get(phone);
    const now = Date.now();

    if (existing && existing.purpose === purpose && now - existing.sentAt < OTP_RESEND_COOLDOWN_MS) {
        return res.status(429).json(otpCooldownResponse(phone, existing));
    }

    if (otpPending.has(phone)) {
        return res.status(429).json({
            message: 'در حال ارسال کد هستید. لطفاً چند لحظه صبر کنید.',
            retryAfterSec: 5,
            phone
        });
    }

    const code = generateOtpCode();
    const expiresAt = now + OTP_TTL_MS;
    otpPending.add(phone);

    try {
        // Persist OTP only after SMS succeeds so failed sends do not trigger cooldown.
        await deliverOtp(phone, code);
        const sentAt = Date.now();
        store.otp.set(phone, { code, expiresAt, sentAt, attempts: 0, purpose });
    } catch (err) {
        console.error('OTP delivery failed:', err);
        return res.status(502).json({ message: 'ارسال کد تأیید ناموفق بود. دوباره تلاش کنید.' });
    } finally {
        otpPending.delete(phone);
    }

    const payload = {
        message: 'کد تأیید ارسال شد.',
        phone,
        expiresInSec: Math.floor(OTP_TTL_MS / 1000),
        expiresAt: new Date(expiresAt).toISOString()
    };
    // Help local testing when no SMS provider is configured
    if (process.env.NODE_ENV !== 'production' || !process.env.SMS_API_KEY) {
        payload.devOtp = code;
    }
    return res.status(200).json(payload);
}

function readOtpEntry({ phone, code, purpose, consume }) {
    if (!isValidIranMobile(phone)) {
        return { error: { status: 400, body: { message: 'شماره موبایل معتبر نیست.' } } };
    }
    if (!/^\d{5}$/.test(code)) {
        return { error: { status: 400, body: { message: 'کد تأیید باید ۵ رقم باشد.' } } };
    }

    const entry = store.otp.get(phone);
    if (!entry || entry.purpose !== purpose) {
        return { error: { status: 400, body: { message: 'کد تأیید یافت نشد. دوباره درخواست کنید.' } } };
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
        store.otp.remove(phone);
        return { error: { status: 410, body: { message: 'کد تأیید منقضی شده است. دوباره درخواست کنید.' } } };
    }

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
        store.otp.remove(phone);
        return {
            error: {
                status: 429,
                body: { message: 'تعداد تلاش بیش از حد مجاز است. کد جدید درخواست کنید.' }
            }
        };
    }

    if (entry.code !== code) {
        entry.attempts += 1;
        store.otp.set(phone, entry);
        const remaining = OTP_MAX_ATTEMPTS - entry.attempts;
        return {
            error: {
                status: 401,
                body: {
                    message:
                        remaining > 0
                            ? `کد تأیید نادرست است. ${remaining} تلاش باقی مانده.`
                            : 'کد تأیید نادرست است. کد جدید درخواست کنید.'
                }
            }
        };
    }

    if (consume) {
        store.otp.remove(phone);
    }
    return { ok: true, entry };
}

function consumeOtp({ phone, code, purpose }) {
    return readOtpEntry({ phone, code, purpose, consume: true });
}

app.post('/api/auth/send-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    if (!isValidIranMobile(phone)) {
        return res.status(400).json({ message: 'شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx' });
    }

    // OTP is used for both login and registration — do not block existing phones.
    return issueOtp({ phone, purpose: 'auth', res });
});

app.post('/api/auth/verify-otp', (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const result = consumeOtp({ phone, code, purpose: 'auth' });
    if (result.error) {
        return res.status(result.error.status).json(result.error.body);
    }

    let user = findUserByPhone(phone);
    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        user = store.users.create({
            username: phone,
            email: '',
            mobile: phone,
            password: null,
            firstName: '',
            lastName: '',
            birthDate: '',
            province: '',
            city: '',
            isAdmin: false,
            profileComplete: false,
            createdAt: new Date().toISOString()
        });
    }

    res.status(isNewUser ? 201 : 200).json({
        message: isNewUser ? 'ثبت‌نام با موفقیت انجام شد.' : 'ورود موفقیت‌آمیز.',
        user: publicUser(user),
        isNewUser
    });
});

// Forgot / set password via OTP (for users who registered without a password, or forgot it)
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    if (!isValidIranMobile(phone)) {
        return res.status(400).json({ message: 'شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx' });
    }

    const user = findUserByPhone(phone);
    if (!user) {
        return res.status(404).json({
            message: 'حسابی با این شماره یافت نشد. ابتدا با پیامک ثبت‌نام کنید.'
        });
    }

    return issueOtp({ phone, purpose: 'reset', res });
});

app.post('/api/auth/forgot-password/verify-otp', (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const result = readOtpEntry({ phone, code, purpose: 'reset', consume: false });
    if (result.error) {
        return res.status(result.error.status).json(result.error.body);
    }
    return res.status(200).json({
        message: 'کد تأیید صحیح است.',
        phone,
        expiresAt: new Date(result.entry.expiresAt).toISOString(),
        expiresInSec: Math.max(0, Math.ceil((result.entry.expiresAt - Date.now()) / 1000))
    });
});

app.post('/api/auth/forgot-password/reset', (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const newPassword = req.body.newPassword || req.body.password;
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    const result = consumeOtp({ phone, code, purpose: 'reset' });
    if (result.error) {
        return res.status(result.error.status).json(result.error.body);
    }

    const user = findUserByPhone(phone);
    if (!user) {
        return res.status(404).json({ message: 'کاربر یافت نشد.' });
    }

    store.users.update(user.id, { password: String(newPassword) });
    const updated = store.users.getById(user.id);

    res.status(200).json({
        message: 'رمز عبور با موفقیت ثبت شد. اکنون می‌توانید وارد شوید.',
        user: publicUser(updated)
    });
});

// --- User Profile Routes ---
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const user = store.users.getById(id);
    if (user) {
        res.json(publicUser(user));
    } else res.status(404).json({ message: 'کاربر یافت نشد' });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const current = store.users.getById(id);
    if (!current) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const { firstName, lastName, birthDate, province, city, mobile, email } = req.body;
    const patch = {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
    };
    const nextFirst = patch.firstName !== undefined ? patch.firstName : current.firstName;
    const nextLast = patch.lastName !== undefined ? patch.lastName : current.lastName;
    patch.profileComplete = Boolean(String(nextFirst || '').trim() || String(nextLast || '').trim());
    const updated = store.users.update(id, patch);
    res.json({ message: 'اطلاعات با موفقیت ذخیره شد.', user: publicUser(updated) });
});

app.put('/api/users/:id/password', (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const user = store.users.getById(id);

    if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: 'رمز عبور فعلی اشتباه است' });
    }
    if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
    }

    store.users.update(id, { password: newPassword });
    res.status(200).json({ message: 'رمز عبور با موفقیت تغییر کرد' });
});

// --- Children Routes ---
app.get('/api/children', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'User ID is required' });
    const userChildren = store.children.listByUserId(userId)
        .map(c => ({ ...c, name: getChildDisplayName(c) }));
    res.json(userChildren);
});

app.post('/api/children', (req, res) => {
    const childData = req.body;
    if (!childData || !childData.userId) {
        return res.status(400).json({ message: 'Child data and userId are required' });
    }
    normalizeChildName(childData);
    const newChild = store.children.create({
        ...childData,
        userId: parseInt(childData.userId, 10),
        vaccinationRecords: childData.vaccinationRecords || {}
    });

    const birthHeight = parseFloat(childData.height || childData.birthHeight);
    const birthWeight = parseFloat(childData.weight || childData.birthWeight);
    const birthHead = parseFloat(childData.birthHeadCircumference);
    if (childData.birthDate && (birthHeight || birthWeight || birthHead)) {
        store.growth.upsert(newChild.id, {
            date: String(childData.birthDate).replace(/\//g, '-'),
            height: birthHeight || null,
            weight: birthWeight ? (birthWeight > 100 ? birthWeight / 1000 : birthWeight) : null,
            headCircumference: birthHead || null
        });
    }

    res.status(201).json({ ...newChild, growthData: store.growth.list(newChild.id) });
});

app.get('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const child = store.children.getById(childId);
    if (child) {
        res.json({
            ...child,
            name: getChildDisplayName(child),
            growthData: store.growth.list(childId)
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const updatedData = { ...req.body };
    normalizeChildName(updatedData);
    delete updatedData.id;
    delete updatedData.growthData;
    const updated = store.children.update(childId, updatedData);
    if (updated) {
        res.status(200).json({
            ...updated,
            name: getChildDisplayName(updated),
            growthData: store.growth.list(childId)
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.delete('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    if (store.children.remove(childId)) {
        res.status(200).json({ message: 'کودک و تمام اطلاعات مربوطه با موفقیت حذف شدند' });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId/vaccination-records', (req, res) => {
    const { childId } = req.params;
    const { vaccinationRecords } = req.body;
    const updated = store.children.update(childId, { vaccinationRecords });
    if (updated) res.status(200).json(updated);
    else res.status(404).json({ message: 'کودک یافت نشد' });
});

app.post('/api/children/:childId/avatar', upload.single('avatar'), (req, res) => {
    const { childId } = req.params;
    const userId = req.headers['x-user-id'];
    const child = store.children.getById(childId);

    if (!child) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (!userId || child.userId !== Number(userId)) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز برای تغییر عکس این کودک' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'فایل عکس انتخاب نشده است' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    store.children.update(childId, { avatar: avatarPath });
    res.status(200).json({ message: 'عکس با موفقیت آپلود شد', filePath: avatarPath });
});

// --- Growth Data Helpers & Routes ---
const normalizeGrowthDate = (value) => {
    if (!value) return '';
    const match = String(value).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return '';
    const y = match[1];
    const m = String(match[2]).padStart(2, '0');
    const d = String(match[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseOptionalNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(num) ? num : null;
};

const compareGrowthDates = (a, b) => {
    const da = normalizeGrowthDate(a) || String(a || '');
    const db = normalizeGrowthDate(b) || String(b || '');
    return da.localeCompare(db);
};

app.get('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    if (!store.children.getById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const list = store.growth.list(childId).slice().sort((a, b) => compareGrowthDates(a.date, b.date));
    res.json(list);
});

app.post('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    const date = normalizeGrowthDate(req.body?.date);
    const height = parseOptionalNumber(req.body?.height);
    const weight = parseOptionalNumber(req.body?.weight);
    const headCircumference = parseOptionalNumber(req.body?.headCircumference);

    if (!date) {
        return res.status(400).json({ message: 'تاریخ معتبر الزامی است.' });
    }
    if (height == null && weight == null && headCircumference == null) {
        return res.status(400).json({ message: 'حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.' });
    }
    if (!store.children.getById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const result = store.growth.upsert(childId, { date, height, weight, headCircumference });
    res.status(result.created ? 201 : 200).json(result.record);
});

app.put('/api/growth/:childId/record/:recordId', (req, res) => {
    const { childId, recordId } = req.params;
    if (!store.children.getById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const list = store.growth.list(childId);
    const current = list.find((r) => String(r.id) === String(recordId));
    if (!current) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }

    const date = normalizeGrowthDate(req.body?.date) || normalizeGrowthDate(current.date);
    const height = req.body?.height !== undefined ? parseOptionalNumber(req.body.height) : current.height;
    const weight = req.body?.weight !== undefined ? parseOptionalNumber(req.body.weight) : current.weight;
    const headCircumference = req.body?.headCircumference !== undefined
        ? parseOptionalNumber(req.body.headCircumference)
        : current.headCircumference;

    if (!date) {
        return res.status(400).json({ message: 'تاریخ معتبر الزامی است.' });
    }
    if (height == null && weight == null && headCircumference == null) {
        return res.status(400).json({ message: 'حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.' });
    }

    const result = store.growth.update(childId, recordId, { date, height, weight, headCircumference });
    if (!result) return res.status(404).json({ message: 'رکورد یافت نشد' });
    if (result.error === 'duplicate-date') {
        return res.status(400).json({ message: 'برای این تاریخ قبلاً رکورد دیگری ثبت شده است.' });
    }
    res.json(result.record);
});

app.delete('/api/growth/:childId/record/:recordId', (req, res) => {
    const { childId, recordId } = req.params;
    if (!store.growth.removeById(childId, recordId)) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    res.json({ message: 'رکورد حذف شد' });
});

app.delete('/api/growth/:childId/:date', (req, res) => {
    const { childId, date } = req.params;
    const normalized = normalizeGrowthDate(decodeURIComponent(date));
    if (!store.growth.removeByDate(childId, normalized) && !store.growth.removeByDate(childId, date)) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    res.status(200).json({ message: 'رکورد حذف شد' });
});

// --- Vaccination Status Routes ---
app.get('/api/vaccination-status/:childId', (req, res) => {
    const { childId } = req.params;
    const child = store.children.getById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const ageInMonths = calculateAgeInMonths(child.birthDate);
    const records = child.vaccinationRecords || {};
    const status = [];

    vaccinationSchedule.forEach(group => {
        group.vaccines.forEach((vaccine, index) => {
            const isDone = !!(records[group.age] && records[group.age][vaccine.name]);
            let vaccineStatus = 'upcoming';
            if (isDone) {
                vaccineStatus = 'done';
            } else if (ageInMonths > group.age + 2) {
                vaccineStatus = 'overdue';
            } else if (ageInMonths < group.age) {
                vaccineStatus = 'future';
            }
            status.push({
                name: vaccine.name,
                dose: vaccine.details || String(index + 1),
                month: group.age,
                age: group.age,
                status: vaccineStatus,
                administeredDate: typeof (records[group.age] && records[group.age][vaccine.name]) === 'string'
                    ? records[group.age][vaccine.name]
                    : null
            });
        });
    });

    res.json(status);
});

app.post('/api/vaccinate/:childId', (req, res) => {
    const { childId } = req.params;
    const { vaccineName, dose, date, age } = req.body;
    const child = store.children.getById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    let targetAge = age !== undefined ? Number(age) : null;
    if (targetAge === null || Number.isNaN(targetAge)) {
        const match = vaccinationSchedule.find(group =>
            group.vaccines.some(v => v.name === vaccineName && (!dose || v.details === dose || String(v.details) === String(dose)))
        ) || vaccinationSchedule.find(group => group.vaccines.some(v => v.name === vaccineName));
        if (!match) return res.status(404).json({ message: 'واکسن در برنامه یافت نشد' });
        targetAge = match.age;
    }

    const updated = store.children.setVaccinationValue(childId, targetAge, vaccineName, date || true);
    res.status(200).json({ message: 'وضعیت واکسن به‌روز شد', vaccinationRecords: updated.vaccinationRecords });
});

// --- Medical Data Routes ---
app.get('/api/visits/:childId', (req, res) => {
    res.json(store.visits.list(req.params.childId));
});

app.post('/api/visits/:childId', (req, res) => {
    const { childId } = req.params;
    const { date, doctorName, reason, summary } = req.body;
    if (!date || !doctorName || !reason) {
        return res.status(400).json({ message: 'تاریخ، نام پزشک و علت مراجعه الزامی است' });
    }
    if (!store.children.getById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const newVisit = store.visits.create(childId, { date, doctorName, reason, summary });
    res.status(201).json(newVisit);
});

app.delete('/api/visits/:childId/:visitId', (req, res) => {
    if (!store.children.getById(req.params.childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (store.visits.remove(req.params.childId, req.params.visitId)) {
        return res.json({ message: 'مراجعه حذف شد' });
    }
    res.status(404).json({ message: 'مراجعه یافت نشد' });
});

app.get('/api/checkups/:childId', (req, res) => {
    res.json(store.checkups.list(req.params.childId));
});

app.post('/api/checkups/:childId', upload.single('checkupFile'), (req, res) => {
    const { childId } = req.params;
    const { title, date, parameters } = req.body;

    if (!title || !date || !parameters) {
        return res.status(400).json({ message: 'عنوان، تاریخ و پارامترها الزامی هستند.' });
    }
    if (!store.children.getById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    let parsedParameters;
    try {
        parsedParameters = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
    } catch (err) {
        return res.status(400).json({ message: 'فرمت پارامترها نامعتبر است.' });
    }

    const newCheckup = store.checkups.create(childId, {
        title,
        date,
        parameters: parsedParameters,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });
    res.status(201).json(newCheckup);
});

app.delete('/api/checkups/:childId/:checkupId', (req, res) => {
    if (!store.children.getById(req.params.childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (store.checkups.remove(req.params.childId, req.params.checkupId)) {
        return res.json({ message: 'آزمایش حذف شد' });
    }
    res.status(404).json({ message: 'آزمایش یافت نشد' });
});

app.get('/api/documents/:childId', (req, res) => {
    res.json(store.documents.list(req.params.childId));
});

app.post('/api/documents/:childId', upload.single('document'), (req, res) => {
    const { childId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'فایل مدرک الزامی است' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const newDocument = store.documents.create(childId, {
        title: req.body.title || req.file.originalname,
        url: filePath,
        filePath,
        uploadedAt: new Date().toISOString()
    });
    res.status(201).json(newDocument);
});

app.delete('/api/documents/:childId/:documentId', (req, res) => {
    if (!store.children.getById(req.params.childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (store.documents.remove(req.params.childId, req.params.documentId)) {
        return res.json({ message: 'مدرک حذف شد' });
    }
    res.status(404).json({ message: 'مدرک یافت نشد' });
});

app.get('/api/recommended-tests/:childId', (req, res) => {
    const { childId } = req.params;
    const child = store.children.getById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const ageInMonths = calculateAgeInMonths(child.birthDate);
    let ageGroup = '24-60';
    if (ageInMonths <= 6) ageGroup = '0-6';
    else if (ageInMonths <= 12) ageGroup = '6-12';
    else if (ageInMonths <= 24) ageGroup = '12-24';

    res.json(recommendedCheckupsData[ageGroup] || []);
});

// --- Admin Middleware ---
const isAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'دسترسی غیرمجاز: شناسه کاربری ارائه نشده است' });
    const user = store.users.getById(userId);
    if (user && user.isAdmin) next();
    else res.status(403).json({ message: 'دسترسی غیرمجاز: شما مدیر نیستید' });
};

// --- Admin Routes ---
app.get('/api/admin/users', isAdmin, (req, res) => {
    res.json(store.users.list().map((u) => publicUser(u)));
});

app.put('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const userData = { ...req.body };
    const current = store.users.getById(id);
    if (!current) return res.status(404).json({ message: 'کاربر یافت نشد' });

    delete userData.password;
    const requestingUserId = req.headers['x-user-id'];
    if (id === requestingUserId && current.isAdmin && !userData.isAdmin) {
        return res.status(400).json({ message: 'شما نمی‌توانید دسترسی ادمین خود را لغو کنید.' });
    }

    const updated = store.users.update(id, userData);
    res.json(publicUser(updated));
});

app.delete('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    if (!store.users.getById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const requestingUserId = req.headers['x-user-id'];
    if (id === requestingUserId) return res.status(400).json({ message: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.' });

    store.users.remove(id);
    res.status(200).json({ message: 'کاربر با موفقیت حذف شد' });
});

app.get('/api/admin/users/:userId/children', isAdmin, (req, res) => {
    res.json(store.children.listByUserId(req.params.userId));
});

app.put('/api/admin/users/:id/set-password', isAdmin, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!store.users.getById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });

    store.users.update(id, { password: newPassword });
    res.status(200).json({ message: 'رمز عبور کاربر با موفقیت تغییر کرد' });
});

app.get('/api/admin/tickets', isAdmin, (req, res) => {
    res.json(store.tickets.list());
});

app.get('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const ticket = store.tickets.getById(req.params.id);
    if (ticket) res.json(ticket);
    else res.status(404).json({ message: 'تیکت یافت نشد' });
});

app.put('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { status, reply } = req.body;
    const ticket = store.tickets.getById(id);
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });

    if (status) ticket.status = status;
    if (reply) {
        ticket.replies = ticket.replies || [];
        ticket.replies.push({
            userId: req.headers['x-user-id'],
            content: reply,
            createdAt: new Date().toISOString()
        });
        ticket.status = 'answered';
    }
    ticket.updatedAt = new Date().toISOString();
    res.json(store.tickets.update(id, ticket));
});

app.get('/api/admin/stats', isAdmin, (req, res) => {
    res.json(store.stats());
});

// --- User tickets ---
app.get('/api/tickets', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    res.json(store.tickets.listByUser(user.id));
});

app.post('/api/tickets', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const subject = String(req.body.subject || '').trim();
    const content = String(req.body.content || req.body.message || '').trim();
    if (!subject || !content) {
        return res.status(400).json({ message: 'موضوع و متن تیکت الزامی است' });
    }
    const ticket = store.tickets.create({ userId: user.id, subject, content });
    res.status(201).json(ticket);
});

app.get('/api/tickets/:id', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const ticket = store.tickets.getById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });
    if (ticket.userId !== user.id && !user.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    res.json(ticket);
});

// --- Banner, News, Video, Podcast Routes (Content Management) ---
app.get('/api/banners', (req, res) => res.set('Cache-Control', 'no-store').json(store.banners.list()));
app.post('/api/admin/banners', isAdmin, upload.single('image'), (req, res) => {
    const { title, link } = req.body;
    if (!req.file) return res.status(400).json({ message: 'تصویر بنر الزامی است' });
    const newBanner = store.banners.create({ title, link, imageUrl: `/uploads/${req.file.filename}` });
    res.status(201).json(newBanner);
});
app.put('/api/admin/banners/:id', isAdmin, upload.single('image'), (req, res) => {
    const current = store.banners.list().find((b) => Number(b.id) === Number(req.params.id));
    if (!current) return res.status(404).json({ message: 'بنر یافت نشد' });
    const updated = store.banners.update(req.params.id, {
        title: req.body.title !== undefined ? req.body.title : current.title,
        link: req.body.link !== undefined ? req.body.link : current.link,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : current.imageUrl
    });
    res.json(updated);
});
app.delete('/api/admin/banners/:id', isAdmin, (req, res) => {
    if (store.banners.remove(req.params.id)) res.status(200).json({ message: 'بنر با موفقیت حذف شد' });
    else res.status(404).json({ message: 'بنر یافت نشد' });
});

app.get('/api/news', (req, res) => res.json(paginateList(store.news.list(), req)));
app.get('/api/news/:id', (req, res) => {
    const article = store.news.getById(req.params.id);
    if (article) res.json(article);
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});
app.post('/api/admin/news', isAdmin, upload.single('image'), (req, res) => {
    const { title, content, summary, category } = req.body;
    const newArticle = store.news.create({
        title,
        summary,
        content,
        category: category || 'عمومی',
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newArticle);
});
app.put('/api/admin/news/:id', isAdmin, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, content, summary, category } = req.body;
    const current = store.news.getById(id);
    if (!current) return res.status(404).json({ message: 'مقاله یافت نشد' });

    const updatedArticle = store.news.update(id, {
        title,
        summary,
        content,
        category: category || current.category,
        updatedAt: new Date().toISOString(),
        ...(req.file ? { imageUrl: `/uploads/${req.file.filename}` } : {})
    });
    res.json(updatedArticle);
});
app.delete('/api/admin/news/:id', isAdmin, (req, res) => {
    if (store.news.remove(req.params.id)) res.status(200).json({ message: 'مقاله با موفقیت حذف شد' });
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});

app.get('/api/videos', (req, res) => res.json(paginateList(store.videos.list(), req)));
app.get('/api/videos/:id', (req, res) => {
    const video = store.videos.getById(req.params.id);
    if (video) res.json(video);
    else res.status(404).json({ message: 'ویدیو یافت نشد' });
});
app.post('/api/admin/videos', isAdmin, upload.single('thumbnail'), (req, res) => {
    const { title, url, summary } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Title and URL are required' });
    if (!req.file) return res.status(400).json({ message: 'تصویر کاور ویدیو الزامی است' });
    const newVideo = store.videos.create({
        title,
        url,
        summary: summary || '',
        thumbnailUrl: `/uploads/${req.file.filename}`,
        createdAt: new Date().toISOString(),
    });
    res.status(201).json(newVideo);
});
app.delete('/api/admin/videos/:id', isAdmin, (req, res) => {
    const removed = store.videos.remove(req.params.id);
    if (removed) {
        if (removed.thumbnailUrl && removed.thumbnailUrl.startsWith('/uploads/')) {
            const filePath = path.join(uploadsDir, path.basename(removed.thumbnailUrl));
            fs.unlink(filePath, () => {});
        }
        res.status(200).json({ message: 'ویدیو با موفقیت حذف شد' });
    } else res.status(404).json({ message: 'ویدیو یافت نشد' });
});
app.put('/api/admin/videos/:id', isAdmin, upload.single('thumbnail'), (req, res) => {
    const current = store.videos.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'ویدیو یافت نشد' });
    const { title, url, summary } = req.body;
    const updated = store.videos.update(req.params.id, {
        title: title !== undefined ? title : current.title,
        url: url !== undefined ? url : current.url,
        summary: summary !== undefined ? summary : current.summary,
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : current.thumbnailUrl
    });
    res.json(updated);
});

app.get('/api/podcasts', (req, res) => res.json(paginateList(store.podcasts.list(), req)));
app.get('/api/podcasts/:id', (req, res) => {
    const podcast = store.podcasts.getById(req.params.id);
    if (podcast) res.json(podcast);
    else res.status(404).json({ message: 'پادکست یافت نشد' });
});
app.post('/api/admin/podcasts', isAdmin, upload.single('thumbnail'), (req, res) => {
    const { title, url, summary, duration } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'عنوان و لینک پادکست الزامی است' });
    const newPodcast = store.podcasts.create({
        title,
        url,
        summary: summary || '',
        duration: duration || '',
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newPodcast);
});
app.put('/api/admin/podcasts/:id', isAdmin, upload.single('thumbnail'), (req, res) => {
    const current = store.podcasts.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'پادکست یافت نشد' });
    const { title, url, summary, duration } = req.body;
    const updated = store.podcasts.update(req.params.id, {
        title: title !== undefined ? title : current.title,
        url: url !== undefined ? url : current.url,
        summary: summary !== undefined ? summary : current.summary,
        duration: duration !== undefined ? duration : current.duration,
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : current.thumbnailUrl
    });
    res.json(updated);
});
app.delete('/api/admin/podcasts/:id', isAdmin, (req, res) => {
    const removed = store.podcasts.remove(req.params.id);
    if (removed) return res.json({ message: 'پادکست حذف شد' });
    res.status(404).json({ message: 'پادکست یافت نشد' });
});

// --- Shop / Products / Orders ---
const SHOP_CATEGORIES = ['تغذیه', 'اسباب‌بازی', 'پوشاک', 'کتاب', 'بهداشت'];
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const parsePrice = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

app.get('/api/shop/categories', (req, res) => {
    res.json(SHOP_CATEGORIES);
});

app.get('/api/shop/products', (req, res) => {
    res.json(paginateList(store.products.listActive({ category: req.query.category, q: req.query.q }), req));
});

app.get('/api/shop/products/:id', (req, res) => {
    const product = store.products.getById(req.params.id);
    if (!product || product.active === false) {
        return res.status(404).json({ message: 'محصول یافت نشد' });
    }
    res.json(product);
});

app.get('/api/admin/products', isAdmin, (req, res) => {
    res.json(store.products.listAll());
});

app.post('/api/admin/products', isAdmin, upload.single('image'), (req, res) => {
    const { name, description, category, price, stock } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'نام محصول الزامی است' });
    }
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
        return res.status(400).json({ message: 'قیمت معتبر نیست' });
    }
    const parsedStock = stock === undefined || stock === '' ? 0 : parseInt(stock, 10);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ message: 'موجودی معتبر نیست' });
    }

    const newProduct = store.products.create({
        name: String(name).trim(),
        description: description ? String(description).trim() : '',
        category: SHOP_CATEGORIES.includes(category) ? category : 'تغذیه',
        price: parsedPrice,
        stock: parsedStock,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        active: true,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newProduct);
});

app.put('/api/admin/products/:id', isAdmin, upload.single('image'), (req, res) => {
    const id = parseInt(req.params.id, 10);
    const current = store.products.getById(id);
    if (!current) return res.status(404).json({ message: 'محصول یافت نشد' });

    const { name, description, category, price, stock, active } = req.body;
    const updated = { ...current, updatedAt: new Date().toISOString() };

    if (name !== undefined) {
        if (!String(name).trim()) return res.status(400).json({ message: 'نام محصول الزامی است' });
        updated.name = String(name).trim();
    }
    if (description !== undefined) updated.description = String(description).trim();
    if (category !== undefined) {
        updated.category = SHOP_CATEGORIES.includes(category) ? category : updated.category;
    }
    if (price !== undefined && price !== '') {
        const parsedPrice = parsePrice(price);
        if (parsedPrice === null) return res.status(400).json({ message: 'قیمت معتبر نیست' });
        updated.price = parsedPrice;
    }
    if (stock !== undefined && stock !== '') {
        const parsedStock = parseInt(stock, 10);
        if (!Number.isFinite(parsedStock) || parsedStock < 0) {
            return res.status(400).json({ message: 'موجودی معتبر نیست' });
        }
        updated.stock = parsedStock;
    }
    if (active !== undefined) {
        updated.active = active === true || active === 'true';
    }
    if (req.file) updated.imageUrl = `/uploads/${req.file.filename}`;

    res.json(store.products.update(id, updated));
});

app.delete('/api/admin/products/:id', isAdmin, (req, res) => {
    if (store.products.remove(req.params.id)) {
        return res.status(200).json({ message: 'محصول حذف شد' });
    }
    res.status(404).json({ message: 'محصول یافت نشد' });
});

app.get('/api/shop/orders', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId || !store.users.getById(userId)) {
        return res.status(401).json({ message: 'لطفا وارد شوید' });
    }
    res.json(store.orders.listByUser(userId));
});

app.get('/api/shop/orders/:id', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId || !store.users.getById(userId)) {
        return res.status(401).json({ message: 'لطفا وارد شوید' });
    }
    const order = store.orders.getById(req.params.id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد' });
    const user = store.users.getById(userId);
    if (order.userId !== userId && !(user && user.isAdmin)) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    res.json(order);
});

app.post('/api/shop/orders', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId || !store.users.getById(userId)) {
        return res.status(401).json({ message: 'لطفا وارد شوید' });
    }

    const { items, shippingAddress, phone, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'سبد خرید خالی است' });
    }
    if (!shippingAddress || !String(shippingAddress).trim()) {
        return res.status(400).json({ message: 'آدرس ارسال الزامی است' });
    }
    if (!phone || !String(phone).trim()) {
        return res.status(400).json({ message: 'شماره تماس الزامی است' });
    }

    const orderItems = [];
    let total = 0;

    for (const item of items) {
        const productId = parseInt(item.productId, 10);
        const quantity = parseInt(item.quantity, 10);
        if (!productId || !Number.isFinite(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'آیتم سفارش نامعتبر است' });
        }
        const product = store.products.getById(productId);
        if (!product || product.active === false) {
            return res.status(400).json({ message: `محصول با شناسه ${productId} یافت نشد` });
        }
        if (product.stock < quantity) {
            return res.status(400).json({ message: `موجودی «${product.name}» کافی نیست` });
        }
        const lineTotal = product.price * quantity;
        total += lineTotal;
        orderItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            lineTotal
        });
    }

    try {
        const newOrder = store.orders.create({
            userId,
            items: orderItems,
            total,
            shippingAddress: String(shippingAddress).trim(),
            phone: String(phone).trim(),
            notes: notes ? String(notes).trim() : ''
        });
        res.status(201).json(newOrder);
    } catch (err) {
        if (err.code === 'OUT_OF_STOCK') {
            return res.status(400).json({ message: `موجودی «${err.message}» کافی نیست` });
        }
        if (err.code === 'PRODUCT_MISSING') {
            return res.status(400).json({ message: 'محصول یافت نشد' });
        }
        throw err;
    }
});

app.get('/api/admin/orders', isAdmin, (req, res) => {
    res.json(store.orders.listAll());
});

app.put('/api/admin/orders/:id', isAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'وضعیت سفارش نامعتبر است' });
    }
    const updated = store.orders.updateStatus(id, status);
    if (!updated) return res.status(404).json({ message: 'سفارش یافت نشد' });
    res.json(updated);
});

// --- Reminder / Vaccination ---
const childHasOverdueVaccination = (child) => {
    const ageInMonths = calculateAgeInMonths(new Date(child.birthDate));
    const childVaccinations = child.vaccinationRecords || {};
    return vaccinationSchedule.some(group => {
        if (ageInMonths < group.age) return false;
        return group.vaccines.some(vaccine =>
            !childVaccinations[group.age] || !childVaccinations[group.age][vaccine.name]
        );
    });
};

const getOverdueVaccinationReminders = (child) => {
    if (!childHasOverdueVaccination(child)) return [];
    return [{
        id: `vaccine-delay-${child.id}`,
        title: 'تاخیر در تزریق واکس',
        message: 'تاخیر در تزریق واکس',
        type: 'danger',
        link: `/vaccination-status/${child.id}`,
        source: 'auto',
        category: 'vaccine_delay'
    }];
};

const getVaccineDelayMessagesForUser = (userId) => {
    const userChildren = store.children.listByUserId(userId);
    return userChildren
        .filter(childHasOverdueVaccination)
        .map(child => ({
            id: `vaccine-delay-${child.id}`,
            title: 'تاخیر در تزریق واکس',
            body: 'تاخیر در تزریق واکس',
            link: `/vaccination-status/${child.id}`,
            imageUrl: null,
            type: 'vaccine_delay',
            source: 'auto',
            createdAt: new Date().toISOString(),
            isRead: false,
            childId: child.id,
            childName: getChildDisplayName(child)
        }));
};

app.get('/api/vaccination-schedule', (req, res) => res.json(vaccinationSchedule));

app.post('/api/generate-reminders/:userId', (req, res) => {
    const { userId } = req.params;
    const userChildren = store.children.listByUserId(userId);
    let created = 0;

    userChildren.forEach(child => {
        const existing = store.reminders.list(child.id);
        const reminderId = `generated-vaccine-delay-${child.id}`;
        const alreadyExists = existing.some(r => r.id === reminderId || r.id === `vaccine-delay-${child.id}`);

        if (!alreadyExists && childHasOverdueVaccination(child)) {
            store.reminders.create(child.id, {
                id: reminderId,
                title: 'تاخیر در تزریق واکس',
                date: new Date().toISOString().split('T')[0],
                message: 'تاخیر در تزریق واکس',
                type: 'danger',
                link: `/vaccination-status/${child.id}`,
                source: 'manual',
                category: 'vaccine_delay'
            });
            created++;
        }
    });

    res.status(201).json({ message: 'یادآورها با موفقیت تولید شدند', created });
});

app.get('/api/reminders/all/:childId', (req, res) => {
    const { childId } = req.params;
    const child = store.children.getById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const manualReminders = store.reminders.list(childId).filter(r => {
        if (r.category === 'vaccine_delay') return false;
        if (r.id && String(r.id).startsWith('generated-vaccine')) return false;
        if (r.title && (r.title.includes('تأخیر در واکسن') || r.title.includes('تاخیر در تزریق'))) return false;
        return true;
    });
    const autoReminders = getOverdueVaccinationReminders(child);
    res.json([...autoReminders, ...manualReminders]);
});

app.post('/api/reminders/manual/:childId', (req, res) => {
    const { childId } = req.params;
    const { title, date, description, alarmAt } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'عنوان و تاریخ الزامی است' });
    if (!store.children.getById(childId)) return res.status(404).json({ message: 'کودک یافت نشد' });

    const newReminder = {
        id: `manual-${Date.now()}`,
        title,
        date,
        description: description || '',
        message: description || '',
        alarmAt: alarmAt || null,
        type: 'info',
        source: 'manual'
    };
    store.reminders.create(childId, newReminder);
    res.status(201).json(newReminder);
});

app.delete('/api/reminders/manual/:childId/:reminderId', (req, res) => {
    const { childId, reminderId } = req.params;
    if (store.reminders.remove(childId, reminderId)) {
        res.status(200).json({ message: 'یادآوری با موفقیت حذف شد' });
    } else {
        res.status(404).json({ message: 'یادآوری مشخص شده یافت نشد' });
    }
});

// --- User personal reminders / alarms ---
app.get('/api/user-reminders', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    res.json(store.userReminders.list(userId));
});

app.post('/api/user-reminders', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    if (!store.users.getById(userId)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const { title, description, alarmAt } = req.body;
    if (!title || !alarmAt) {
        return res.status(400).json({ message: 'عنوان و زمان آلارم الزامی است' });
    }
    if (Number.isNaN(new Date(alarmAt).getTime())) {
        return res.status(400).json({ message: 'زمان آلارم نامعتبر است' });
    }

    const newReminder = {
        id: `user-reminder-${Date.now()}`,
        title,
        description: description || '',
        alarmAt: new Date(alarmAt).toISOString(),
        createdAt: new Date().toISOString(),
        notified: false,
        type: 'info',
        source: 'user'
    };
    store.userReminders.create(userId, newReminder);
    res.status(201).json(newReminder);
});

app.put('/api/user-reminders/:id', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    const { title, description, alarmAt, notified } = req.body;
    if (alarmAt !== undefined && Number.isNaN(new Date(alarmAt).getTime())) {
        return res.status(400).json({ message: 'زمان آلارم نامعتبر است' });
    }
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (alarmAt !== undefined) patch.alarmAt = new Date(alarmAt).toISOString();
    if (notified !== undefined) patch.notified = !!notified;
    const updated = store.userReminders.update(userId, req.params.id, patch);
    if (!updated) return res.status(404).json({ message: 'یادآوری یافت نشد' });
    res.json(updated);
});

app.delete('/api/user-reminders/:id', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    if (store.userReminders.remove(userId, req.params.id)) {
        return res.status(200).json({ message: 'یادآوری حذف شد' });
    }
    res.status(404).json({ message: 'یادآوری یافت نشد' });
});

// --- Messages (inbox) ---
app.get('/api/messages', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const inbox = store.messages.listForUser(userId);
    const vaccineMessages = getVaccineDelayMessagesForUser(userId);
    const combined = [...vaccineMessages, ...inbox].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(combined);
});

app.get('/api/messages/unread-count', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    const unreadAdmin = store.messages.unreadCount(userId);
    const unreadVaccine = getVaccineDelayMessagesForUser(userId).length;
    res.json({ count: unreadAdmin + unreadVaccine });
});

app.put('/api/messages/:id/read', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const messageId = req.params.id;
    if (String(messageId).startsWith('vaccine-delay-')) {
        return res.json({ message: 'پیام واکسن به‌عنوان خوانده‌شده در نظر گرفته شد' });
    }

    const msg = store.messages.getById(messageId);
    if (!msg || !Array.isArray(msg.recipientIds) || !msg.recipientIds.includes(userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    store.messages.markRead(messageId, userId);
    res.json({ message: 'پیام خوانده شد', id: msg.id });
});

app.delete('/api/messages/:id', (req, res) => {
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const messageId = parseInt(req.params.id, 10);
    const msg = store.messages.getById(messageId);
    if (!msg || !Array.isArray(msg.recipientIds) || !msg.recipientIds.includes(userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    store.messages.removeRecipient(messageId, userId);
    res.json({ message: 'پیام حذف شد' });
});

app.get('/api/admin/messages', isAdmin, (req, res) => {
    res.json(store.messages.listAll());
});

app.post('/api/admin/messages', isAdmin, upload.single('image'), (req, res) => {
    const { title, body, link, mode, userId, userIds } = req.body;
    if (!title || !String(title).trim()) {
        return res.status(400).json({ message: 'عنوان پیام الزامی است' });
    }

    let recipientIds = [];
    const sendMode = mode === 'bulk' ? 'bulk' : 'single';

    if (sendMode === 'bulk') {
        if (userIds) {
            try {
                const parsed = typeof userIds === 'string' ? JSON.parse(userIds) : userIds;
                recipientIds = (Array.isArray(parsed) ? parsed : [])
                    .map(id => parseInt(id, 10))
                    .filter(id => !Number.isNaN(id) && store.users.getById(id));
            } catch (e) {
                return res.status(400).json({ message: 'لیست کاربران نامعتبر است' });
            }
        }
        if (recipientIds.length === 0) {
            recipientIds = store.users.listNonAdminIds();
            if (recipientIds.length === 0) {
                recipientIds = store.users.listAllIds();
            }
        }
    } else {
        const targetId = parseInt(userId, 10);
        if (!targetId || !store.users.getById(targetId)) {
            return res.status(400).json({ message: 'کاربر گیرنده معتبر نیست' });
        }
        recipientIds = [targetId];
    }

    if (recipientIds.length === 0) {
        return res.status(400).json({ message: 'هیچ گیرنده‌ای یافت نشد' });
    }

    const newMessage = store.messages.create({
        title: String(title).trim(),
        body: body ? String(body).trim() : '',
        link: link ? String(link).trim() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        type: 'admin',
        isBulk: sendMode === 'bulk',
        recipientIds,
        createdAt: new Date().toISOString(),
        createdBy: parseInt(req.headers['x-user-id'], 10)
    });
    res.status(201).json(newMessage);
});

app.delete('/api/admin/messages/:id', isAdmin, (req, res) => {
    if (store.messages.remove(req.params.id)) {
        return res.status(200).json({ message: 'پیام حذف شد' });
    }
    res.status(404).json({ message: 'پیام یافت نشد' });
});

async function startServer() {
    try {
        store.connect();
        ensureDefaultAdmin();
        app.listen(port, () => console.log(`TatKids server is listening on port ${port}`));
    } catch (err) {
        console.error('Failed to start server with SQLite:', err);
        process.exit(1);
    }
}

startServer();
