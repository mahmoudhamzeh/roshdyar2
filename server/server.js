const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '.env'),
    override: true
});
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { vaccinationSchedule } = require('./vaccination-schedule');
const { recommendedCheckupsData } = require('./recommendations');
const store = require('./db');
const { AGE_BANDS, flattenCategories } = require('./shop-model');
const rateLimit = require('express-rate-limit');
const {
    hashPassword,
    verifyPassword,
    isHashedPassword,
    signToken,
    verifyToken,
    readBearerToken,
    allowLegacyUserHeader
} = require('./auth');
const {
    MILESTONE_STATUS,
    getBandForAge,
    recommendActivities,
    buildAgeGuidePayload
} = require('./child-growth-data');
const { deliverOtp } = require('./sms');

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
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

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT || 20),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { message: 'تعداد درخواست بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }
});

app.get('/api/health', async (req, res) => {
    try {
        res.json(await store.health());
    } catch (err) {
        res.status(503).json({ ok: false, message: err.message });
    }
});

const API_CATALOG = {
    name: 'TatKids API',
    language: 'Node.js / Express',
    database: store.engine === 'postgresql'
        ? 'PostgreSQL (connection pool, indexed tables)'
        : 'SQLite relational (WAL, indexed tables)',
    groups: {
        system: ['GET /api', 'GET /api/health'],
        auth: [
            'POST /api/login',
            'POST /api/signup',
            'POST /api/auth/send-otp',
            'POST /api/auth/verify-otp',
            'POST /api/auth/forgot-password/send-otp',
            'POST /api/auth/forgot-password/verify-otp',
            'POST /api/auth/forgot-password/reset',
            'GET /api/auth/me'
        ],
        users: ['GET /api/users/:id', 'PUT /api/users/:id', 'PUT /api/users/:id/password'],
        children: [
            'GET /api/children',
            'POST /api/children',
            'GET /api/children/:childId',
            'PUT /api/children/:childId',
            'DELETE /api/children/:childId',
            'PUT /api/children/:childId/vaccination-records',
            'POST /api/children/:childId/avatar',
            'GET /api/children/:childId/age-guide',
            'GET /api/children/:childId/milestones',
            'POST /api/children/:childId/milestones/:milestoneId/status',
            'GET /api/children/:childId/activities',
            'POST /api/children/:childId/activities/:activityId/completion',
            'GET /api/children/:childId/growth-summary',
            'GET /api/children/:childId/concerns',
            'POST /api/children/:childId/concerns'
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
            'GET /api/shop/home',
            'GET /api/shop/sale',
            'GET /api/shop/categories',
            'GET /api/shop/skills',
            'GET /api/shop/age-bands',
            'GET /api/shop/products',
            'GET /api/shop/products/:id',
            'GET /api/shop/products/:id/offers',
            'GET /api/shop/orders',
            'GET /api/shop/orders/:id',
            'POST /api/shop/orders',
            'GET /api/shop/vendors/me',
            'POST /api/shop/vendors/apply'
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

app.get('/api', async (req, res) => {
    res.json(API_CATALOG);
});

async function resolveAuthUser(req) {
    const token = readBearerToken(req);
    if (token) {
        const payload = verifyToken(token);
        if (!payload || !payload.id) return null;
        const user = await store.users.getById(payload.id);
        if (user) req.user = user;
        return user || null;
    }
    if (!allowLegacyUserHeader()) return null;
    const userId = parseInt(req.headers['x-user-id'], 10);
    if (!userId) return null;
    const user = await store.users.getById(userId);
    if (user) req.user = user;
    return user || null;
}

async function requireUser(req, res) {
    const user = await resolveAuthUser(req);
    if (!user) {
        res.status(401).json({ message: 'لطفا وارد شوید' });
        return null;
    }
    return user;
}

function authSession(user) {
    return { user: publicUser(user), token: signToken(user) };
}

async function requireOwnedChild(req, res) {
    const user = await requireUser(req, res);
    if (!user) return null;
    const child = await store.children.getById(req.params.childId);
    if (!child) {
        res.status(404).json({ message: 'کودک یافت نشد' });
        return null;
    }
    if (Number(child.userId) !== Number(user.id) && !user.isAdmin) {
        res.status(403).json({ message: 'دسترسی غیرمجاز' });
        return null;
    }
    return { user, child };
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

async function findUserByPhone(phone) {
    return await store.users.findByPhone(phone);
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

async function ensureDefaultAdmin() {
    const existingAdmin = (await store.users.list()).find((u) => u.isAdmin);
    if (existingAdmin) {
        if (String(existingAdmin.username || '').toLowerCase() === 'admin') {
            await store.users.update(existingAdmin.id, { username: 'Amin' });
            console.log('Renamed legacy admin username to Amin');
        }
        return;
    }

    await store.users.create({
        username: 'Amin',
        email: 'admin@example.com',
        password: await hashPassword('admin'),
        isAdmin: true
    });
    console.log('Created default admin user: Amin / admin');
}

function publicUser(user) {
    const { password, ...userToSend } = user;
    return userToSend;
}

// --- Auth Routes ---
app.post('/api/login', authLimiter, async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });
    }
    const candidates = await store.users.findCandidatesForLogin(login);
    let user = null;
    for (const candidate of candidates) {
        if (!identitiesMatch(candidate, login) || candidate.password == null) continue;
        if (await verifyPassword(candidate.password, password)) {
            user = candidate;
            break;
        }
    }
    if (!user) {
        return res.status(401).json({ message: 'نام کاربری یا رمز عبور نامعتبر است' });
    }
    if (!isHashedPassword(user.password)) {
        user = await store.users.update(user.id, { password: await hashPassword(password) }) || user;
    }
    res.status(200).json({ message: 'ورود موفقیت‌آمیز', ...authSession(user) });
});

app.post('/api/signup', authLimiter, async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });

    const existingUser = await store.users.findByUsernameOrEmail(login);
    if (existingUser) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده است' });

    const created = await store.users.create({
        username: login,
        email: login,
        password: await hashPassword(password),
        isAdmin: false
    });
    res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.', ...authSession(created) });
});

async function issueOtp({ phone, purpose, res }) {
    const existing = await store.otp.get(phone);
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
        await store.otp.set(phone, { code, expiresAt, sentAt, attempts: 0, purpose });
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

async function readOtpEntry({ phone, code, purpose, consume }) {
    if (!isValidIranMobile(phone)) {
        return { error: { status: 400, body: { message: 'شماره موبایل معتبر نیست.' } } };
    }
    if (!/^\d{5}$/.test(code)) {
        return { error: { status: 400, body: { message: 'کد تأیید باید ۵ رقم باشد.' } } };
    }

    const entry = await store.otp.get(phone);
    if (!entry || entry.purpose !== purpose) {
        return { error: { status: 400, body: { message: 'کد تأیید یافت نشد. دوباره درخواست کنید.' } } };
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
        await store.otp.remove(phone);
        return { error: { status: 410, body: { message: 'کد تأیید منقضی شده است. دوباره درخواست کنید.' } } };
    }

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
        await store.otp.remove(phone);
        return {
            error: {
                status: 429,
                body: { message: 'تعداد تلاش بیش از حد مجاز است. کد جدید درخواست کنید.' }
            }
        };
    }

    if (entry.code !== code) {
        entry.attempts += 1;
        await store.otp.set(phone, entry);
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
        await store.otp.remove(phone);
    }
    return { ok: true, entry };
}

async function consumeOtp({ phone, code, purpose }) {
    return await readOtpEntry({ phone, code, purpose, consume: true });
}

app.post('/api/auth/send-otp', authLimiter, async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    if (!isValidIranMobile(phone)) {
        return res.status(400).json({ message: 'شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx' });
    }

    // OTP is used for both login and registration — do not block existing phones.
    return issueOtp({ phone, purpose: 'auth', res });
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const result = await consumeOtp({ phone, code, purpose: 'auth' });
    if (result.error) {
        return res.status(result.error.status).json(result.error.body);
    }

    let user = await findUserByPhone(phone);
    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        user = await store.users.create({
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
        ...authSession(user),
        isNewUser
    });
});

// Forgot / set password via OTP (for users who registered without a password, or forgot it)
app.post('/api/auth/forgot-password/send-otp', authLimiter, async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    if (!isValidIranMobile(phone)) {
        return res.status(400).json({ message: 'شماره موبایل معتبر نیست. مثال: ۰۹۱۲xxxxxxx' });
    }

    const user = await findUserByPhone(phone);
    if (!user) {
        return res.status(404).json({
            message: 'حسابی با این شماره یافت نشد. ابتدا با پیامک ثبت‌نام کنید.'
        });
    }

    return issueOtp({ phone, purpose: 'reset', res });
});

app.post('/api/auth/forgot-password/verify-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const result = await readOtpEntry({ phone, code, purpose: 'reset', consume: false });
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

app.post('/api/auth/forgot-password/reset', async (req, res) => {
    const phone = normalizePhone(req.body.phone || req.body.mobile);
    const code = toEnglishDigits(req.body.code || req.body.otp || '').replace(/\D/g, '');
    const newPassword = req.body.newPassword || req.body.password;
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    const result = await consumeOtp({ phone, code, purpose: 'reset' });
    if (result.error) {
        return res.status(result.error.status).json(result.error.body);
    }

    const user = await findUserByPhone(phone);
    if (!user) {
        return res.status(404).json({ message: 'کاربر یافت نشد.' });
    }

    await store.users.update(user.id, { password: await hashPassword(String(newPassword)) });
    const updated = await store.users.getById(user.id);

    res.status(200).json({
        message: 'رمز عبور با موفقیت ثبت شد. اکنون می‌توانید وارد شوید.',
        user: publicUser(updated)
    });
});

app.get('/api/auth/me', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(authSession(user));
});

// --- User Profile Routes ---
app.get('/api/users/:id', async (req, res) => {
    const actor = await requireUser(req, res);
    if (!actor) return;
    const { id } = req.params;
    if (Number(actor.id) !== Number(id) && !actor.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    const user = await store.users.getById(id);
    if (user) {
        res.json(publicUser(user));
    } else res.status(404).json({ message: 'کاربر یافت نشد' });
});

app.put('/api/users/:id', async (req, res) => {
    const actor = await requireUser(req, res);
    if (!actor) return;
    const { id } = req.params;
    if (Number(actor.id) !== Number(id) && !actor.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    const current = await store.users.getById(id);
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
    const updated = await store.users.update(id, patch);
    res.json({ message: 'اطلاعات با موفقیت ذخیره شد.', user: publicUser(updated) });
});

app.put('/api/users/:id/password', async (req, res) => {
    const actor = await requireUser(req, res);
    if (!actor) return;
    const { id } = req.params;
    if (Number(actor.id) !== Number(id) && !actor.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    const { currentPassword, newPassword } = req.body;
    const user = await store.users.getById(id);

    if (!user || !(await verifyPassword(user.password, currentPassword))) {
        return res.status(401).json({ message: 'رمز عبور فعلی اشتباه است' });
    }
    if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
    }

    await store.users.update(id, { password: await hashPassword(newPassword) });
    res.status(200).json({ message: 'رمز عبور با موفقیت تغییر کرد' });
});

// --- Children Routes ---
app.get('/api/children', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userChildren = (await store.children.listByUserId(user.id))
        .map(c => ({ ...c, name: getChildDisplayName(c) }));
    res.json(userChildren);
});

app.post('/api/children', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const childData = req.body || {};
    const ownerId = user.isAdmin && childData.userId ? parseInt(childData.userId, 10) : user.id;
    normalizeChildName(childData);
    const newChild = await store.children.create({
        ...childData,
        userId: ownerId,
        vaccinationRecords: childData.vaccinationRecords || {}
    });

    const birthHeight = parseFloat(childData.height || childData.birthHeight);
    const birthWeight = parseFloat(childData.weight || childData.birthWeight);
    const birthHead = parseFloat(childData.birthHeadCircumference);
    if (childData.birthDate && (birthHeight || birthWeight || birthHead)) {
        await store.growth.upsert(newChild.id, {
            date: String(childData.birthDate).replace(/\//g, '-'),
            height: birthHeight || null,
            weight: birthWeight ? (birthWeight > 100 ? birthWeight / 1000 : birthWeight) : null,
            headCircumference: birthHead || null
        });
    }

    res.status(201).json({ ...newChild, growthData: await store.growth.list(newChild.id) });
});

app.get('/api/children/:childId', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const { childId } = req.params;
    if (child) {
        res.json({
            ...child,
            name: getChildDisplayName(child),
            growthData: await store.growth.list(childId)
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

async function getChildMilestoneMap(childId) {
    const state = await store.children.getGrowthState(childId);
    return state ? state.milestones : {};
}

async function getChildCompletionMap(childId) {
    const state = await store.children.getGrowthState(childId);
    return state ? state.completions : {};
}

async function buildGrowthSummaryForChild(childId, child) {
    const records = (await store.growth.list(childId)).slice().sort((a, b) => {
        const da = new Date(String(a.date || '').replace(/\//g, '-')).getTime() || 0;
        const db = new Date(String(b.date || '').replace(/\//g, '-')).getTime() || 0;
        return da - db;
    });
    if (!records.length) {
        return {
            lastMeasurement: null,
            indicators: { heightForAge: null, weightForAge: null, bmiForAge: null },
            trend: 'UNKNOWN',
            note: 'هنوز اندازه‌گیری جدیدی ثبت نکرده‌اید.',
        };
    }
    const latest = records[records.length - 1];
    const prev = records.length > 1 ? records[records.length - 2] : null;
    let trend = 'STABLE';
    if (prev && latest.height != null && prev.height != null) {
        const diff = Number(latest.height) - Number(prev.height);
        if (diff > 1.5) trend = 'INCREASING';
        else if (diff < -0.5) trend = 'DECREASING';
    }
    return {
        lastMeasurement: {
            date: latest.date || null,
            height: latest.height ?? null,
            weight: latest.weight ?? null,
            headCircumference: latest.headCircumference ?? null,
        },
        indicators: {
            heightForAge: { value: latest.height ?? null, note: 'روند قد را در نمودار رشد مشاهده کنید.' },
            weightForAge: { value: latest.weight ?? null, note: 'از یک اندازه‌گیری به‌تنهایی نتیجه پزشکی گرفته نمی‌شود.' },
            bmiForAge: null,
        },
        trend,
        note: 'بر اساس اندازه‌گیری‌های ثبت‌شده، روند رشد در نمودار قابل مشاهده است.',
    };
}

app.get('/api/children/:childId/age-guide', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const milestoneStatuses = await getChildMilestoneMap(req.params.childId);
    const completions = await getChildCompletionMap(req.params.childId);
    const payload = buildAgeGuidePayload(
        { ...child, name: getChildDisplayName(child) },
        {
            milestoneStatuses,
            completions,
            growthSummary: await buildGrowthSummaryForChild(req.params.childId, child),
            parentConcern: req.query.concern || null
        }
    );
    payload.activities = (payload.activities || []).map((activity) => ({
        ...activity,
        completed: Boolean(completions[activity.id]?.completed),
        completion: completions[activity.id] || null
    }));
    res.json(payload);
});

app.get('/api/children/:childId/milestones', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const guide = buildAgeGuidePayload({ ...child, name: getChildDisplayName(child) }, {});
    const contentAge = guide.child.isPremature && guide.child.ageInMonths < 24
        ? guide.child.correctedAgeInMonths
        : guide.child.ageInMonths;
    const band = getBandForAge(contentAge);
    const statuses = await getChildMilestoneMap(req.params.childId);
    const items = (band.milestones || []).map((milestone) => ({
        ...milestone,
        status: statuses[milestone.id]?.status || MILESTONE_STATUS.NOT_CHECKED,
        observedAt: statuses[milestone.id]?.observedAt || statuses[milestone.id]?.updatedAt || null
    }));
    res.json({
        band: { id: band.id, title: band.title, subtitle: band.subtitle },
        total: items.length,
        checked: items.filter((item) => item.status !== MILESTONE_STATUS.NOT_CHECKED).length,
        observed: items.filter((item) => item.status === MILESTONE_STATUS.OBSERVED).length,
        items
    });
});

app.post('/api/children/:childId/milestones/:milestoneId/status', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const { status, observedAt } = req.body || {};
    const allowed = Object.values(MILESTONE_STATUS);
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: 'وضعیت نامعتبر است' });
    }
    const state = await store.children.getGrowthState(req.params.childId);
    const milestones = { ...state.milestones };
    milestones[req.params.milestoneId] = {
        status,
        observedAt: observedAt || (status === MILESTONE_STATUS.OBSERVED ? new Date().toISOString().slice(0, 10) : null),
        updatedAt: new Date().toISOString()
    };
    await store.children.saveGrowthState(req.params.childId, { milestones });
    res.json({ milestoneId: req.params.milestoneId, ...milestones[req.params.milestoneId] });
});

app.get('/api/children/:childId/activities', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const guide = buildAgeGuidePayload({ ...child, name: getChildDisplayName(child) }, {});
    const contentAge = guide.child.isPremature && guide.child.ageInMonths < 24
        ? guide.child.correctedAgeInMonths
        : guide.child.ageInMonths;
    const band = getBandForAge(contentAge);
    const completions = await getChildCompletionMap(req.params.childId);
    const recommended = recommendActivities(band, {
        milestoneStatuses: await getChildMilestoneMap(req.params.childId),
        completions,
        parentConcern: req.query.concern || null
    });
    res.json({
        band: { id: band.id, title: band.title },
        activities: recommended.map((activity) => ({
            ...activity,
            completed: Boolean(completions[activity.id]?.completed),
            completion: completions[activity.id] || null
        }))
    });
});

app.post('/api/children/:childId/activities/:activityId/completion', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const { completed = true, duration = null } = req.body || {};
    const state = await store.children.getGrowthState(req.params.childId);
    const completions = { ...state.completions };
    completions[req.params.activityId] = {
        completed: Boolean(completed),
        duration,
        completedAt: new Date().toISOString()
    };
    await store.children.saveGrowthState(req.params.childId, { completions });
    res.json({ activityId: req.params.activityId, ...completions[req.params.activityId] });
});

app.get('/api/children/:childId/growth-summary', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    res.json(await buildGrowthSummaryForChild(req.params.childId, child));
});

app.get('/api/children/:childId/concerns', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const state = await store.children.getGrowthState(req.params.childId);
    res.json({ concerns: state.concerns || [] });
});

app.post('/api/children/:childId/concerns', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;
    const state = await store.children.getGrowthState(req.params.childId);
    const entry = {
        id: `c-${Date.now()}`,
        topic: req.body?.topic || 'موضوع دیگر',
        answers: req.body?.answers || [],
        result: req.body?.result || 'green',
        createdAt: new Date().toISOString()
    };
    await store.children.saveGrowthState(req.params.childId, { concerns: [entry, ...(state.concerns || [])] });
    res.status(201).json(entry);
});

app.put('/api/children/:childId', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const { childId } = req.params;
    const updatedData = { ...req.body };
    normalizeChildName(updatedData);
    delete updatedData.id;
    delete updatedData.growthData;
    const updated = await store.children.update(childId, updatedData);
    if (updated) {
        res.status(200).json({
            ...updated,
            name: getChildDisplayName(updated),
            growthData: await store.growth.list(childId)
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.delete('/api/children/:childId', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const { childId } = req.params;
    if (await store.children.remove(childId)) {
        res.status(200).json({ message: 'کودک و تمام اطلاعات مربوطه با موفقیت حذف شدند' });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId/vaccination-records', async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const { childId } = req.params;
    const { vaccinationRecords } = req.body;
    const updated = await store.children.update(childId, { vaccinationRecords });
    if (updated) res.status(200).json(updated);
    else res.status(404).json({ message: 'کودک یافت نشد' });
});

app.post('/api/children/:childId/avatar', upload.single('avatar'), async (req, res) => {
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const { childId } = req.params;
    const child = owned.child;
    if (!req.file) {
        return res.status(400).json({ message: 'فایل عکس انتخاب نشده است' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    await store.children.update(childId, { avatar: avatarPath });
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

app.get('/api/growth/:childId', async (req, res) => {
    const { childId } = req.params;
    if (!(await requireOwnedChild(req, res))) return;
    const list = (await store.growth.list(childId)).slice().sort((a, b) => compareGrowthDates(a.date, b.date));
    res.json(list);
});

app.post('/api/growth/:childId', async (req, res) => {
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
    if (!(await requireOwnedChild(req, res))) return;

    const result = await store.growth.upsert(childId, { date, height, weight, headCircumference });
    res.status(result.created ? 201 : 200).json(result.record);
});

app.put('/api/growth/:childId/record/:recordId', async (req, res) => {
    const { childId, recordId } = req.params;
    if (!(await requireOwnedChild(req, res))) return;

    const list = await store.growth.list(childId);
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

    const result = await store.growth.update(childId, recordId, { date, height, weight, headCircumference });
    if (!result) return res.status(404).json({ message: 'رکورد یافت نشد' });
    if (result.error === 'duplicate-date') {
        return res.status(400).json({ message: 'برای این تاریخ قبلاً رکورد دیگری ثبت شده است.' });
    }
    res.json(result.record);
});

app.delete('/api/growth/:childId/record/:recordId', async (req, res) => {
    const { childId, recordId } = req.params;
    if (!await store.growth.removeById(childId, recordId)) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    res.json({ message: 'رکورد حذف شد' });
});

app.delete('/api/growth/:childId/:date', async (req, res) => {
    const { childId, date } = req.params;
    const normalized = normalizeGrowthDate(decodeURIComponent(date));
    if (!await store.growth.removeByDate(childId, normalized) && !await store.growth.removeByDate(childId, date)) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    res.status(200).json({ message: 'رکورد حذف شد' });
});

// --- Vaccination Status Routes ---
app.get('/api/vaccination-status/:childId', async (req, res) => {
    const { childId } = req.params;
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;

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

app.post('/api/vaccinate/:childId', async (req, res) => {
    const { childId } = req.params;
    const { vaccineName, dose, date, age } = req.body;
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;

    let targetAge = age !== undefined ? Number(age) : null;
    if (targetAge === null || Number.isNaN(targetAge)) {
        const match = vaccinationSchedule.find(group =>
            group.vaccines.some(v => v.name === vaccineName && (!dose || v.details === dose || String(v.details) === String(dose)))
        ) || vaccinationSchedule.find(group => group.vaccines.some(v => v.name === vaccineName));
        if (!match) return res.status(404).json({ message: 'واکسن در برنامه یافت نشد' });
        targetAge = match.age;
    }

    const updated = await store.children.setVaccinationValue(childId, targetAge, vaccineName, date || true);
    res.status(200).json({ message: 'وضعیت واکسن به‌روز شد', vaccinationRecords: updated.vaccinationRecords });
});

// --- Medical Data Routes ---
app.get('/api/visits/:childId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    res.json(await store.visits.list(req.params.childId));
});

app.post('/api/visits/:childId', async (req, res) => {
    const { childId } = req.params;
    const { date, doctorName, reason, summary } = req.body;
    if (!date || !doctorName || !reason) {
        return res.status(400).json({ message: 'تاریخ، نام پزشک و علت مراجعه الزامی است' });
    }
    if (!(await requireOwnedChild(req, res))) return;
    const newVisit = await store.visits.create(childId, { date, doctorName, reason, summary });
    res.status(201).json(newVisit);
});

app.delete('/api/visits/:childId/:visitId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    if (await store.visits.remove(req.params.childId, req.params.visitId)) {
        return res.json({ message: 'مراجعه حذف شد' });
    }
    res.status(404).json({ message: 'مراجعه یافت نشد' });
});

app.get('/api/checkups/:childId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    res.json(await store.checkups.list(req.params.childId));
});

app.post('/api/checkups/:childId', upload.single('checkupFile'), async (req, res) => {
    const { childId } = req.params;
    const { title, date, parameters } = req.body;

    if (!title || !date || !parameters) {
        return res.status(400).json({ message: 'عنوان، تاریخ و پارامترها الزامی هستند.' });
    }
    if (!(await requireOwnedChild(req, res))) return;

    let parsedParameters;
    try {
        parsedParameters = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
    } catch (err) {
        return res.status(400).json({ message: 'فرمت پارامترها نامعتبر است.' });
    }

    const newCheckup = await store.checkups.create(childId, {
        title,
        date,
        parameters: parsedParameters,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });
    res.status(201).json(newCheckup);
});

app.delete('/api/checkups/:childId/:checkupId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    if (await store.checkups.remove(req.params.childId, req.params.checkupId)) {
        return res.json({ message: 'آزمایش حذف شد' });
    }
    res.status(404).json({ message: 'آزمایش یافت نشد' });
});

app.get('/api/documents/:childId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    res.json(await store.documents.list(req.params.childId));
});

app.post('/api/documents/:childId', upload.single('document'), async (req, res) => {
    const { childId } = req.params;
    if (!(await requireOwnedChild(req, res))) return;
    if (!req.file) {
        return res.status(400).json({ message: 'فایل مدرک الزامی است' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const newDocument = await store.documents.create(childId, {
        title: req.body.title || req.file.originalname,
        url: filePath,
        filePath,
        uploadedAt: new Date().toISOString()
    });
    res.status(201).json(newDocument);
});

app.delete('/api/documents/:childId/:documentId', async (req, res) => {
    if (!(await requireOwnedChild(req, res))) return;
    if (await store.documents.remove(req.params.childId, req.params.documentId)) {
        return res.json({ message: 'مدرک حذف شد' });
    }
    res.status(404).json({ message: 'مدرک یافت نشد' });
});

app.get('/api/recommended-tests/:childId', async (req, res) => {
    const { childId } = req.params;
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;

    const ageInMonths = calculateAgeInMonths(child.birthDate);
    let ageGroup = '24-60';
    if (ageInMonths <= 6) ageGroup = '0-6';
    else if (ageInMonths <= 12) ageGroup = '6-12';
    else if (ageInMonths <= 24) ageGroup = '12-24';

    res.json(recommendedCheckupsData[ageGroup] || []);
});

// --- Admin Middleware ---
const isAdmin = (req, res, next) => {
    Promise.resolve(resolveAuthUser(req)).then((user) => {
        if (!user) return res.status(401).json({ message: 'دسترسی غیرمجاز: شناسه کاربری ارائه نشده است' });
        if (!user.isAdmin) return res.status(403).json({ message: 'دسترسی غیرمجاز: شما مدیر نیستید' });
        req.user = user;
        next();
    }).catch(next);
};

const requireVendor = (req, res, next) => {
    Promise.resolve(resolveAuthUser(req)).then(async (user) => {
        if (!user) return res.status(401).json({ message: 'لطفا وارد شوید' });
        const vendor = await store.shop.getVendorByUser(user.id);
        if (!vendor) return res.status(403).json({ message: 'حساب فروشندگی یافت نشد' });
        if (vendor.status !== 'active' && !user.isAdmin) {
            return res.status(403).json({ message: 'پنل فروشنده هنوز تأیید نشده است' });
        }
        req.user = user;
        req.vendor = vendor;
        next();
    }).catch(next);
};

// --- Admin Routes ---
app.get('/api/admin/users', isAdmin, async (req, res) => {
    res.json((await store.users.list()).map((u) => publicUser(u)));
});

app.put('/api/admin/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const userData = { ...req.body };
    const current = await store.users.getById(id);
    if (!current) return res.status(404).json({ message: 'کاربر یافت نشد' });

    delete userData.password;
    if (Number(id) === Number(req.user.id) && current.isAdmin && !userData.isAdmin) {
        return res.status(400).json({ message: 'شما نمی‌توانید دسترسی ادمین خود را لغو کنید.' });
    }

    const updated = await store.users.update(id, userData);
    res.json(publicUser(updated));
});

app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    if (!await store.users.getById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    if (Number(id) === Number(req.user.id)) return res.status(400).json({ message: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.' });

    await store.users.remove(id);
    res.status(200).json({ message: 'کاربر با موفقیت حذف شد' });
});

app.get('/api/admin/users/:userId/children', isAdmin, async (req, res) => {
    res.json(await store.children.listByUserId(req.params.userId));
});

app.put('/api/admin/users/:id/set-password', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!await store.users.getById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });

    await store.users.update(id, { password: await hashPassword(newPassword) });
    res.status(200).json({ message: 'رمز عبور کاربر با موفقیت تغییر کرد' });
});

app.get('/api/admin/tickets', isAdmin, async (req, res) => {
    res.json(await store.tickets.list());
});

app.get('/api/admin/tickets/:id', isAdmin, async (req, res) => {
    const ticket = await store.tickets.getById(req.params.id);
    if (ticket) res.json(ticket);
    else res.status(404).json({ message: 'تیکت یافت نشد' });
});

app.put('/api/admin/tickets/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, reply } = req.body;
    const ticket = await store.tickets.getById(id);
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });

    if (status) ticket.status = status;
    if (reply) {
        ticket.replies = ticket.replies || [];
        ticket.replies.push({
            userId: req.user.id,
            content: reply,
            createdAt: new Date().toISOString()
        });
        ticket.status = 'answered';
    }
    ticket.updatedAt = new Date().toISOString();
    res.json(await store.tickets.update(id, ticket));
});

app.get('/api/admin/stats', isAdmin, async (req, res) => {
    res.json(await store.stats());
});

// --- User tickets ---
app.get('/api/tickets', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await store.tickets.listByUser(user.id));
});

const TICKET_GROUPS = {
    'حساب کاربری': ['ورود و ثبت‌نام', 'پروفایل', 'رمز عبور'],
    'کودکان و پرونده': ['ثبت کودک', 'واکسیناسیون', 'نمودار رشد', 'پرونده سلامت'],
    'فروشگاه': ['سفارش', 'پرداخت', 'محصول'],
    'فنی': ['خطای سایت', 'پیشنهاد'],
    'سایر': ['عمومی']
};

app.get('/api/tickets/groups', (req, res) => {
    res.json(TICKET_GROUPS);
});

function maybeMultipart(field, maxCount) {
    return (req, res, next) => {
        const type = String(req.headers['content-type'] || '');
        if (type.includes('multipart/form-data')) {
            return upload.array(field, maxCount)(req, res, next);
        }
        return next();
    };
}

app.post('/api/tickets', maybeMultipart('attachments', 4), async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const subject = String(req.body.subject || '').trim();
    const content = String(req.body.content || req.body.message || '').trim();
    const groupName = String(req.body.groupName || req.body.group || 'سایر').trim();
    const subgroup = String(req.body.subgroup || 'عمومی').trim();
    if (!subject || !content) {
        return res.status(400).json({ message: 'موضوع و متن تیکت الزامی است' });
    }
    const allowed = TICKET_GROUPS[groupName];
    if (!allowed || !allowed.includes(subgroup)) {
        return res.status(400).json({ message: 'گروه یا زیرگروه نامعتبر است' });
    }
    const attachments = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const ticket = await store.tickets.create({
        userId: user.id,
        subject,
        content,
        groupName,
        subgroup,
        attachments
    });
    res.status(201).json(ticket);
});

app.get('/api/tickets/:id', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const ticket = await store.tickets.getById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });
    if (ticket.userId !== user.id && !user.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    res.json(ticket);
});

// --- Banner, News, Video, Podcast Routes (Content Management) ---
app.get('/api/banners', async (req, res) => {
    const list = store.banners.listByPlacement
        ? await store.banners.listByPlacement(req.query.placement)
        : await store.banners.list();
    res.set('Cache-Control', 'no-store').json(list);
});
app.post('/api/admin/banners', isAdmin, upload.single('image'), async (req, res) => {
    const { title, link, placement, productId, subtitle, sortOrder } = req.body;
    if (!req.file) return res.status(400).json({ message: 'تصویر بنر الزامی است' });
    const parsedProduct = productId ? Number(productId) : null;
    const newBanner = await store.banners.create({
        title,
        link: link || (parsedProduct ? `/shop/${parsedProduct}` : ''),
        imageUrl: `/uploads/${req.file.filename}`,
        placement: placement === 'shop' ? 'shop' : 'home',
        productId: parsedProduct,
        subtitle,
        sortOrder
    });
    res.status(201).json(newBanner);
});
app.put('/api/admin/banners/:id', isAdmin, upload.single('image'), async (req, res) => {
    const current = (await store.banners.list()).find((b) => Number(b.id) === Number(req.params.id));
    if (!current) return res.status(404).json({ message: 'بنر یافت نشد' });
    const parsedProduct = req.body.productId !== undefined
        ? (req.body.productId ? Number(req.body.productId) : null)
        : current.productId;
    const updated = await store.banners.update(req.params.id, {
        title: req.body.title !== undefined ? req.body.title : current.title,
        link: req.body.link !== undefined ? req.body.link : (parsedProduct ? `/shop/${parsedProduct}` : current.link),
        imageUrl: req.file ? `/uploads/${req.file.filename}` : current.imageUrl,
        placement: req.body.placement || current.placement,
        productId: parsedProduct,
        subtitle: req.body.subtitle !== undefined ? req.body.subtitle : current.subtitle,
        sortOrder: req.body.sortOrder !== undefined ? req.body.sortOrder : current.sortOrder
    });
    res.json(updated);
});
app.delete('/api/admin/banners/:id', isAdmin, async (req, res) => {
    if (await store.banners.remove(req.params.id)) res.status(200).json({ message: 'بنر با موفقیت حذف شد' });
    else res.status(404).json({ message: 'بنر یافت نشد' });
});

app.get('/api/news', async (req, res) => res.json(paginateList(await store.news.list(), req)));
app.get('/api/news/:id', async (req, res) => {
    const article = await store.news.getById(req.params.id);
    if (article) res.json(article);
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});
app.post('/api/admin/news', isAdmin, upload.single('image'), async (req, res) => {
    const { title, content, summary, category } = req.body;
    const newArticle = await store.news.create({
        title,
        summary,
        content,
        category: category || 'عمومی',
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newArticle);
});
app.put('/api/admin/news/:id', isAdmin, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, content, summary, category } = req.body;
    const current = await store.news.getById(id);
    if (!current) return res.status(404).json({ message: 'مقاله یافت نشد' });

    const updatedArticle = await store.news.update(id, {
        title,
        summary,
        content,
        category: category || current.category,
        updatedAt: new Date().toISOString(),
        ...(req.file ? { imageUrl: `/uploads/${req.file.filename}` } : {})
    });
    res.json(updatedArticle);
});
app.delete('/api/admin/news/:id', isAdmin, async (req, res) => {
    if (await store.news.remove(req.params.id)) res.status(200).json({ message: 'مقاله با موفقیت حذف شد' });
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});

app.get('/api/videos', async (req, res) => res.json(paginateList(await store.videos.list(), req)));
app.get('/api/videos/:id', async (req, res) => {
    const video = await store.videos.getById(req.params.id);
    if (video) res.json(video);
    else res.status(404).json({ message: 'ویدیو یافت نشد' });
});
app.post('/api/admin/videos', isAdmin, upload.single('thumbnail'), async (req, res) => {
    const { title, url, summary } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Title and URL are required' });
    if (!req.file) return res.status(400).json({ message: 'تصویر کاور ویدیو الزامی است' });
    const newVideo = await store.videos.create({
        title,
        url,
        summary: summary || '',
        thumbnailUrl: `/uploads/${req.file.filename}`,
        createdAt: new Date().toISOString(),
    });
    res.status(201).json(newVideo);
});
app.delete('/api/admin/videos/:id', isAdmin, async (req, res) => {
    const removed = await store.videos.remove(req.params.id);
    if (removed) {
        if (removed.thumbnailUrl && removed.thumbnailUrl.startsWith('/uploads/')) {
            const filePath = path.join(uploadsDir, path.basename(removed.thumbnailUrl));
            fs.unlink(filePath, () => {});
        }
        res.status(200).json({ message: 'ویدیو با موفقیت حذف شد' });
    } else res.status(404).json({ message: 'ویدیو یافت نشد' });
});
app.put('/api/admin/videos/:id', isAdmin, upload.single('thumbnail'), async (req, res) => {
    const current = await store.videos.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'ویدیو یافت نشد' });
    const { title, url, summary } = req.body;
    const updated = await store.videos.update(req.params.id, {
        title: title !== undefined ? title : current.title,
        url: url !== undefined ? url : current.url,
        summary: summary !== undefined ? summary : current.summary,
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : current.thumbnailUrl
    });
    res.json(updated);
});

app.get('/api/podcasts', async (req, res) => res.json(paginateList(await store.podcasts.list(), req)));
app.get('/api/podcasts/:id', async (req, res) => {
    const podcast = await store.podcasts.getById(req.params.id);
    if (podcast) res.json(podcast);
    else res.status(404).json({ message: 'پادکست یافت نشد' });
});
app.post('/api/admin/podcasts', isAdmin, upload.single('thumbnail'), async (req, res) => {
    const { title, url, summary, duration } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'عنوان و لینک پادکست الزامی است' });
    const newPodcast = await store.podcasts.create({
        title,
        url,
        summary: summary || '',
        duration: duration || '',
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newPodcast);
});
app.put('/api/admin/podcasts/:id', isAdmin, upload.single('thumbnail'), async (req, res) => {
    const current = await store.podcasts.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'پادکست یافت نشد' });
    const { title, url, summary, duration } = req.body;
    const updated = await store.podcasts.update(req.params.id, {
        title: title !== undefined ? title : current.title,
        url: url !== undefined ? url : current.url,
        summary: summary !== undefined ? summary : current.summary,
        duration: duration !== undefined ? duration : current.duration,
        thumbnailUrl: req.file ? `/uploads/${req.file.filename}` : current.thumbnailUrl
    });
    res.json(updated);
});
app.delete('/api/admin/podcasts/:id', isAdmin, async (req, res) => {
    const removed = await store.podcasts.remove(req.params.id);
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

const parseSkillIds = (body) => {
    if (!body) return undefined;
    if (Array.isArray(body.skillIds)) return body.skillIds;
    if (typeof body.skillIds === 'string' && body.skillIds.trim()) {
        try {
            const parsed = JSON.parse(body.skillIds);
            return Array.isArray(parsed) ? parsed : String(body.skillIds).split(',').filter(Boolean);
        } catch (_) {
            return String(body.skillIds).split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    if (body['skillIds[]'] != null) return [].concat(body['skillIds[]']);
    return undefined;
};

app.get('/api/shop/categories', async (req, res) => {
    const tree = await store.productCategories.tree();
    res.json(tree.length ? tree : SHOP_CATEGORIES.map((name) => ({ name, children: [] })));
});

app.get('/api/shop/skills', async (req, res) => {
    res.json(await store.shop.listSkills());
});

app.get('/api/shop/age-bands', (req, res) => {
    res.json(AGE_BANDS);
});

app.get('/api/shop/home', async (req, res) => {
    const [newest, popular, allActive, skills, categories, vendor, campaign, shopBanners] = await Promise.all([
        store.products.listActive({ sort: 'newest' }),
        store.products.listActive({ sort: 'popular' }),
        store.products.listActive({}),
        store.shop.listSkills(),
        store.productCategories.tree(),
        store.shop.getInternalVendor(),
        store.shop.campaign(),
        store.banners.listByPlacement ? store.banners.listByPlacement('shop') : store.banners.list()
    ]);
    const onSale = (allActive || []).filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    res.json({
        mode: 'marketplace',
        vendor: vendor || { slug: 'tatkids', displayName: 'مجموعه تات کیدز', kind: 'internal' },
        ageBands: AGE_BANDS,
        skills,
        categories: categories.length ? categories : SHOP_CATEGORIES.map((name) => ({ name, children: [] })),
        newest: (newest || []).slice(0, 8),
        bestsellers: (popular || []).slice(0, 8),
        onSale: onSale.slice(0, 10),
        campaign,
        banners: shopBanners
    });
});

app.get('/api/shop/sale', async (req, res) => {
    const products = await store.products.listActive({});
    const onSale = (products || []).filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
    res.json({
        campaign: await store.shop.campaign(),
        products: onSale
    });
});

app.get('/api/shop/products/:id/offers', async (req, res) => {
    res.json(await store.shop.listOffers(req.params.id));
});

app.get('/api/admin/product-categories', isAdmin, async (req, res) => {
    res.json(await store.productCategories.tree({ includeInactive: true }));
});

app.post('/api/admin/product-categories', isAdmin, async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'نام گروه الزامی است' });
    res.status(201).json(await store.productCategories.create({
        name,
        parentId: req.body.parentId || null,
        sortOrder: req.body.sortOrder || 0
    }));
});

app.put('/api/admin/product-categories/:id', isAdmin, async (req, res) => {
    const updated = await store.productCategories.update(req.params.id, {
        name: req.body.name,
        parentId: req.body.parentId || null,
        sortOrder: req.body.sortOrder || 0
    });
    if (!updated) return res.status(404).json({ message: 'گروه یافت نشد' });
    res.json(updated);
});

app.delete('/api/admin/product-categories/:id', isAdmin, async (req, res) => {
    if (await store.productCategories.remove(req.params.id)) {
        return res.json({ message: 'گروه حذف شد' });
    }
    res.status(404).json({ message: 'گروه یافت نشد' });
});

app.get('/api/shop/products/:id/comments', async (req, res) => {
    res.json(await store.productComments.listByProduct(req.params.id));
});

app.post('/api/shop/products/:id/comments', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = String(req.body.body || req.body.comment || '').trim();
    if (body.length < 3) return res.status(400).json({ message: 'متن نظر خیلی کوتاه است' });
    const product = await store.products.getById(req.params.id);
    if (!product || product.active === false) return res.status(404).json({ message: 'محصول یافت نشد' });
    const comment = await store.productComments.create({
        productId: product.id,
        userId: user.id,
        body,
        rating: req.body.rating
    });
    res.status(201).json(comment);
});

app.get('/api/shop/products', async (req, res) => {
    const filters = {
        category: req.query.category,
        q: req.query.q,
        sort: req.query.sort,
        age: req.query.age || req.query.ageBand,
        skill: req.query.skill
    };
    if (req.query.categoryId) {
        const tree = await store.productCategories.tree({ includeInactive: true });
        const node = flattenCategories(tree).find((c) => String(c.id) === String(req.query.categoryId));
        if (node) filters.category = node.name;
    }
    res.json(paginateList(await store.products.listActive(filters), req));
});

app.get('/api/shop/products/:id', async (req, res) => {
    const product = await store.products.getById(req.params.id);
    if (!product || product.active === false) {
        return res.status(404).json({ message: 'محصول یافت نشد' });
    }
    const offers = await store.shop.listOffers(product.id);
    res.json({ ...product, offers });
});

app.get('/api/admin/products', isAdmin, async (req, res) => {
    res.json(await store.products.listAll());
});

app.post('/api/admin/products', isAdmin, upload.array('images', 8), async (req, res) => {
    const { name, description, category, price, stock, ageBand, brand, safetyWarning, compareAtPrice } = req.body;
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

    const uploaded = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const newProduct = await store.products.create({
        name: String(name).trim(),
        description: description ? String(description).trim() : '',
        category: category ? String(category).trim() : 'تغذیه',
        price: parsedPrice,
        stock: parsedStock,
        imageUrl: uploaded[0] || null,
        active: true,
        createdAt: new Date().toISOString(),
        ageBand,
        brand,
        safetyWarning,
        compareAtPrice,
        skillIds: parseSkillIds(req.body)
    });
    if (uploaded.length) {
        await store.productImages.replace(newProduct.id, uploaded);
    }
    res.status(201).json(await store.products.getById(newProduct.id));
});

app.put('/api/admin/products/:id', isAdmin, upload.array('images', 8), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const current = await store.products.getById(id);
    if (!current) return res.status(404).json({ message: 'محصول یافت نشد' });

    const { name, description, category, price, stock, active, ageBand, brand, safetyWarning, compareAtPrice } = req.body;
    const updated = { ...current, updatedAt: new Date().toISOString() };
    if (ageBand !== undefined) updated.ageBand = ageBand;
    if (brand !== undefined) updated.brand = brand;
    if (safetyWarning !== undefined) updated.safetyWarning = safetyWarning;
    if (compareAtPrice !== undefined) updated.compareAtPrice = compareAtPrice;
    const skillIds = parseSkillIds(req.body);
    if (skillIds) updated.skillIds = skillIds;

    if (name !== undefined) {
        if (!String(name).trim()) return res.status(400).json({ message: 'نام محصول الزامی است' });
        updated.name = String(name).trim();
    }
    if (description !== undefined) updated.description = String(description).trim();
    if (category !== undefined) {
        updated.category = String(category || '').trim() || updated.category;
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
    const uploaded = (req.files || []).map((file) => `/uploads/${file.filename}`);
    if (uploaded[0]) updated.imageUrl = uploaded[0];
    const saved = await store.products.update(id, updated);
    if (uploaded.length) {
        await store.productImages.replace(id, uploaded);
    }
    res.json(await store.products.getById(id) || saved);
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
    if (await store.products.remove(req.params.id)) {
        return res.status(200).json({ message: 'محصول حذف شد' });
    }
    res.status(404).json({ message: 'محصول یافت نشد' });
});

app.get('/api/shop/orders', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);
    res.json(await store.orders.listByUser(userId));
});

app.get('/api/shop/orders/:id', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);
    const order = await store.orders.getById(req.params.id);
    if (!order) return res.status(404).json({ message: 'سفارش یافت نشد' });
    if (order.userId !== userId && !user.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    res.json(order);
});

app.post('/api/shop/orders', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);

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
        const product = await store.products.getById(productId);
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
        const newOrder = await store.orders.create({
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

app.get('/api/admin/orders', isAdmin, async (req, res) => {
    res.json(await store.orders.listAll());
});

app.put('/api/admin/orders/:id', isAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'وضعیت سفارش نامعتبر است' });
    }
    const updated = await store.orders.updateStatus(id, status);
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

const getVaccineDelayMessagesForUser = async (userId) => {
    const userChildren = await store.children.listByUserId(userId);
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

app.get('/api/vaccination-schedule', async (req, res) => res.json(vaccinationSchedule));

app.post('/api/generate-reminders/:userId', async (req, res) => {
    const actor = await requireUser(req, res);
    if (!actor) return;
    const { userId } = req.params;
    if (Number(actor.id) !== Number(userId) && !actor.isAdmin) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز' });
    }
    const userChildren = await store.children.listByUserId(userId);
    let created = 0;

    for (const child of userChildren) {
        const existing = await store.reminders.list(child.id);
        const reminderId = `generated-vaccine-delay-${child.id}`;
        const alreadyExists = existing.some(r => r.id === reminderId || r.id === `vaccine-delay-${child.id}`);

        if (!alreadyExists && childHasOverdueVaccination(child)) {
            await store.reminders.create(child.id, {
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
    }

    res.status(201).json({ message: 'یادآورها با موفقیت تولید شدند', created });
});

app.get('/api/reminders/all/:childId', async (req, res) => {
    const { childId } = req.params;
    const owned = await requireOwnedChild(req, res);
    if (!owned) return;
    const child = owned.child;

    const manualReminders = (await store.reminders.list(childId)).filter(r => {
        if (r.category === 'vaccine_delay') return false;
        if (r.id && String(r.id).startsWith('generated-vaccine')) return false;
        if (r.title && (r.title.includes('تأخیر در واکسن') || r.title.includes('تاخیر در تزریق'))) return false;
        return true;
    });
    const autoReminders = getOverdueVaccinationReminders(child);
    res.json([...autoReminders, ...manualReminders]);
});

app.post('/api/reminders/manual/:childId', async (req, res) => {
    const { childId } = req.params;
    const { title, date, description, alarmAt } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'عنوان و تاریخ الزامی است' });
    if (!(await requireOwnedChild(req, res))) return;

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
    await store.reminders.create(childId, newReminder);
    res.status(201).json(newReminder);
});

app.delete('/api/reminders/manual/:childId/:reminderId', async (req, res) => {
    const { childId, reminderId } = req.params;
    if (await store.reminders.remove(childId, reminderId)) {
        res.status(200).json({ message: 'یادآوری با موفقیت حذف شد' });
    } else {
        res.status(404).json({ message: 'یادآوری مشخص شده یافت نشد' });
    }
});

// --- User personal reminders / alarms ---
app.get('/api/user-reminders', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = user.id;
    res.json(await store.userReminders.list(userId));
});

app.post('/api/user-reminders', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = user.id;
    if (!await store.users.getById(userId)) return res.status(404).json({ message: 'کاربر یافت نشد' });

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
    await store.userReminders.create(userId, newReminder);
    res.status(201).json(newReminder);
});

app.put('/api/user-reminders/:id', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = user.id;
    const { title, description, alarmAt, notified } = req.body;
    if (alarmAt !== undefined && Number.isNaN(new Date(alarmAt).getTime())) {
        return res.status(400).json({ message: 'زمان آلارم نامعتبر است' });
    }
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (alarmAt !== undefined) patch.alarmAt = new Date(alarmAt).toISOString();
    if (notified !== undefined) patch.notified = !!notified;
    const updated = await store.userReminders.update(userId, req.params.id, patch);
    if (!updated) return res.status(404).json({ message: 'یادآوری یافت نشد' });
    res.json(updated);
});

app.delete('/api/user-reminders/:id', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = user.id;
    if (await store.userReminders.remove(userId, req.params.id)) {
        return res.status(200).json({ message: 'یادآوری حذف شد' });
    }
    res.status(404).json({ message: 'یادآوری یافت نشد' });
});

// --- Messages (inbox) ---
app.get('/api/messages', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);

    const inbox = await store.messages.listForUser(userId);
    const vaccineMessages = await getVaccineDelayMessagesForUser(userId);
    const combined = [...vaccineMessages, ...inbox].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(combined);
});

app.get('/api/messages/unread-count', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);
    const unreadAdmin = await store.messages.unreadCount(userId);
    const unreadVaccine = (await getVaccineDelayMessagesForUser(userId)).length;
    res.json({ count: unreadAdmin + unreadVaccine });
});

app.put('/api/messages/:id/read', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);

    const messageId = req.params.id;
    if (String(messageId).startsWith('vaccine-delay-')) {
        return res.json({ message: 'پیام واکسن به‌عنوان خوانده‌شده در نظر گرفته شد' });
    }

    const msg = await store.messages.getById(messageId);
    if (!msg || !Array.isArray(msg.recipientIds) || !msg.recipientIds.includes(userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    await store.messages.markRead(messageId, userId);
    res.json({ message: 'پیام خوانده شد', id: msg.id });
});

app.delete('/api/messages/:id', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const userId = Number(user.id);

    const messageId = parseInt(req.params.id, 10);
    const msg = await store.messages.getById(messageId);
    if (!msg || !Array.isArray(msg.recipientIds) || !msg.recipientIds.includes(userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    await store.messages.removeRecipient(messageId, userId);
    res.json({ message: 'پیام حذف شد' });
});

app.get('/api/admin/messages', isAdmin, async (req, res) => {
    res.json(await store.messages.listAll());
});

app.post('/api/admin/messages', isAdmin, upload.single('image'), async (req, res) => {
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
                const ids = (Array.isArray(parsed) ? parsed : []).map(id => parseInt(id, 10));
                recipientIds = [];
                for (const id of ids) {
                    if (Number.isNaN(id)) continue;
                    if (await store.users.getById(id)) recipientIds.push(id);
                }
            } catch (e) {
                return res.status(400).json({ message: 'لیست کاربران نامعتبر است' });
            }
        }
        if (recipientIds.length === 0) {
            recipientIds = await store.users.listNonAdminIds();
            if (recipientIds.length === 0) {
                recipientIds = await store.users.listAllIds();
            }
        }
    } else {
        const targetId = parseInt(userId, 10);
        if (!targetId || !await store.users.getById(targetId)) {
            return res.status(400).json({ message: 'کاربر گیرنده معتبر نیست' });
        }
        recipientIds = [targetId];
    }

    if (recipientIds.length === 0) {
        return res.status(400).json({ message: 'هیچ گیرنده‌ای یافت نشد' });
    }

    const newMessage = await store.messages.create({
        title: String(title).trim(),
        body: body ? String(body).trim() : '',
        link: link ? String(link).trim() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        type: 'admin',
        isBulk: sendMode === 'bulk',
        recipientIds,
        createdAt: new Date().toISOString(),
        createdBy: req.user ? Number(req.user.id) : null
    });
    res.status(201).json(newMessage);
});

app.delete('/api/admin/messages/:id', isAdmin, async (req, res) => {
    if (await store.messages.remove(req.params.id)) {
        return res.status(200).json({ message: 'پیام حذف شد' });
    }
    res.status(404).json({ message: 'پیام یافت نشد' });
});

app.get('/api/shop/vendors/me', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await store.shop.getVendorByUser(user.id));
});

app.post('/api/shop/vendors/apply', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const displayName = String(req.body.displayName || '').trim();
    if (displayName.length < 3) return res.status(400).json({ message: 'نام فروشگاه خیلی کوتاه است' });
    const vendor = await store.shop.applyVendor({
        userId: user.id,
        displayName,
        phone: req.body.phone || user.mobile || '',
        docsNote: req.body.docsNote || ''
    });
    res.status(201).json(vendor);
});

app.get('/api/admin/vendors', isAdmin, async (req, res) => {
    res.json(await store.shop.listVendors());
});

app.put('/api/admin/vendors/:id', isAdmin, async (req, res) => {
    const updated = await store.shop.updateVendor(req.params.id, {
        displayName: req.body.displayName,
        status: req.body.status,
        commissionPct: req.body.commissionPct,
        settlementCycle: req.body.settlementCycle,
        phone: req.body.phone,
        docsNote: req.body.docsNote
    });
    if (!updated) return res.status(404).json({ message: 'فروشنده یافت نشد' });
    res.json(updated);
});

app.get('/api/vendor/offers', requireVendor, async (req, res) => {
    const all = await store.products.listAll();
    res.json((all || []).filter((p) => Number(p.vendorId) === Number(req.vendor.id)));
});

app.post('/api/vendor/products', requireVendor, upload.array('images', 8), async (req, res) => {
    const { name, description, category, price, stock, ageBand, brand, safetyWarning, compareAtPrice } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'نام محصول الزامی است' });
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) return res.status(400).json({ message: 'قیمت معتبر نیست' });
    const parsedStock = stock === undefined || stock === '' ? 0 : parseInt(stock, 10);
    const uploaded = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const created = await store.products.create({
        name: String(name).trim(),
        description: description ? String(description).trim() : '',
        category: category ? String(category).trim() : 'اسباب‌بازی',
        price: parsedPrice,
        stock: Number.isFinite(parsedStock) ? parsedStock : 0,
        imageUrl: uploaded[0] || null,
        active: true,
        createdAt: new Date().toISOString(),
        ageBand,
        brand,
        safetyWarning,
        compareAtPrice,
        skillIds: parseSkillIds(req.body),
        vendorId: req.vendor.id
    });
    if (uploaded.length) await store.productImages.replace(created.id, uploaded);
    res.status(201).json(await store.products.getById(created.id));
});

app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).json({ message: 'خطای داخلی سرور' });
});

async function startServer() {
    try {
        await store.connect();
        await ensureDefaultAdmin();
        app.listen(port, '0.0.0.0', () => console.log(`TatKids server is listening on port ${port}`));
    } catch (err) {
        console.error('Failed to start TatKids server:', err);
        process.exit(1);
    }
}

startServer();
