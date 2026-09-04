const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
const shopStore = require('./shop-store');
const { buildCategoryTree } = require('./shop-model');

types.setTypeParser(20, (val) => Number(val));
types.setTypeParser(1700, (val) => Number(val));

const SCHEMA_VERSION = 3;
const SCHEMA_PATH = path.join(__dirname, 'schema.pg.sql');
const DEFAULT_SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, 'data', 'roshdyar.db');

const emptyState = () => ({
    users: {},
    children: [],
    growthData: {},
    medicalVisits: {},
    medicalDocuments: {},
    checkups: {},
    reminders: {},
    userReminders: {},
    messages: [],
    banners: [],
    articles: [],
    news: [],
    tickets: [],
    videos: [],
    podcasts: [],
    products: [],
    orders: []
});

let pool = null;
let connecting = null;
const publicCache = new Map();
const PUBLIC_CACHE_TTL_MS = 15 * 1000;

function databaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required for the PostgreSQL adapter');
    }
    return url;
}

function parseJson(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
}

function toJson(value) {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

function asBoolInt(value) {
    return value ? 1 : 0;
}

function asBool(value) {
    return value === 1 || value === true || value === '1' || value === 't';
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

function cacheGet(key) {
    const hit = publicCache.get(key);
    if (hit && Date.now() - hit.at < PUBLIC_CACHE_TTL_MS) return hit.value;
    return null;
}

function cacheSet(key, value) {
    publicCache.set(key, { at: Date.now(), value });
    return value;
}

function cacheInvalidate(prefix) {
    for (const key of publicCache.keys()) {
        if (!prefix || key.startsWith(prefix)) publicCache.delete(key);
    }
}

function rowToUser(row) {
    if (!row) return null;
    const extra = parseJson(row.extra, {});
    return {
        id: Number(row.id),
        username: row.username || '',
        email: row.email || '',
        mobile: row.mobile || extra.mobile || '',
        password: row.password,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        birthDate: row.birth_date || '',
        province: row.province || '',
        city: row.city || '',
        isAdmin: asBool(row.is_admin),
        profileComplete: asBool(row.profile_complete),
        createdAt: row.created_at || extra.createdAt || undefined,
        ...extra
    };
}

function rowToChildBase(row) {
    const extra = parseJson(row.extra, {});
    return {
        id: Number(row.id),
        userId: Number(row.user_id),
        firstName: row.first_name || extra.firstName || '',
        lastName: row.last_name || extra.lastName || '',
        name: row.name || extra.name || '',
        gender: row.gender,
        birthDate: row.birth_date,
        avatar: row.avatar || '',
        height: row.height,
        weight: row.weight,
        bloodType: row.blood_type,
        allergies: parseJson(row.allergies, row.allergies || ''),
        special_illnesses: parseJson(row.special_illnesses, row.special_illnesses || ''),
        nationalId: row.national_id,
        fatherName: row.father_name,
        birthWeight: row.birth_weight,
        birthHeight: row.birth_height,
        birthHeadCircumference: row.birth_head_circumference,
        birthType: row.birth_type,
        gestationalAge: row.gestational_age,
        birthPlace: row.birth_place,
        apgar1: row.apgar1,
        apgar5: row.apgar5,
        vaccineReminder: parseJson(row.vaccine_reminder, undefined),
        ...extra
    };
}

function rowToGrowth(row) {
    return {
        id: row.public_id || `g-${row.id}`,
        date: row.date,
        height: row.height,
        weight: row.weight,
        headCircumference: row.head_circumference
    };
}

function rowToVisit(row) {
    return {
        id: Number(row.id),
        date: row.date,
        doctorName: row.doctor_name,
        reason: row.reason,
        summary: row.summary,
        description: row.description
    };
}

function rowToDocument(row) {
    const url = row.url;
    return {
        id: Number(row.id),
        title: row.title,
        date: row.date,
        url,
        filePath: url,
        uploadedAt: row.uploaded_at
    };
}

function rowToCheckup(row) {
    return {
        id: Number(row.id),
        title: row.title,
        date: row.date,
        parameters: parseJson(row.parameters, {}),
        fileUrl: row.file_url
    };
}

function rowToReminder(row) {
    const extra = parseJson(row.extra, {});
    return {
        id: row.id,
        title: row.title,
        message: row.message,
        description: row.description,
        date: row.date,
        alarmAt: row.alarm_at,
        type: row.type,
        source: row.source,
        category: row.category,
        link: row.link,
        ...extra
    };
}

function rowToUserReminder(row) {
    const extra = parseJson(row.extra, {});
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        alarmAt: row.alarm_at,
        createdAt: row.created_at,
        notified: asBool(row.notified),
        type: row.type,
        source: row.source,
        ...extra
    };
}

function rowToProduct(row) {
    return {
        id: Number(row.id),
        name: row.name,
        description: row.description || '',
        category: row.category,
        price: row.price,
        stock: row.stock,
        imageUrl: row.image_url,
        active: asBool(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToOrder(row, items) {
    return {
        id: Number(row.id),
        userId: Number(row.user_id),
        items: items || [],
        total: row.total,
        shippingAddress: row.shipping_address,
        phone: row.phone,
        notes: row.notes || '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToNews(row) {
    return {
        id: Number(row.id),
        title: row.title,
        summary: row.summary,
        content: row.content,
        category: row.category,
        imageUrl: row.image_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToVideo(row) {
    return {
        id: Number(row.id),
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at
    };
}

function rowToPodcast(row) {
    return {
        id: Number(row.id),
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        createdAt: row.created_at
    };
}

function rowToBanner(row) {
    const productId = row.product_id != null ? Number(row.product_id) : null;
    const link = row.link || (productId ? `/shop/${productId}` : '');
    return {
        id: Number(row.id),
        title: row.title,
        subtitle: row.subtitle || '',
        link,
        imageUrl: row.image_url,
        placement: row.placement || 'home',
        productId,
        sortOrder: Number(row.sort_order || 0)
    };
}

async function q(text, params = [], client) {
    await connect();
    return (client || pool).query(text, params);
}

async function one(text, params, client) {
    const { rows } = await q(text, params, client);
    return rows[0] || null;
}

async function many(text, params, client) {
    const { rows } = await q(text, params, client);
    return rows;
}

async function withTx(fn) {
    await connect();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
        throw err;
    } finally {
        client.release();
    }
}

function userToParams(user) {
    const known = new Set([
        'id', 'username', 'email', 'mobile', 'password', 'firstName', 'lastName',
        'birthDate', 'province', 'city', 'isAdmin', 'profileComplete', 'createdAt'
    ]);
    const extra = {};
    for (const [key, value] of Object.entries(user)) {
        if (!known.has(key) && value !== undefined) extra[key] = value;
    }
    return [
        user.username || null,
        user.email || null,
        user.mobile || null,
        user.password == null ? null : String(user.password),
        user.firstName || null,
        user.lastName || null,
        user.birthDate || null,
        user.province || null,
        user.city || null,
        asBoolInt(user.isAdmin),
        asBoolInt(user.profileComplete),
        user.createdAt || null,
        Object.keys(extra).length ? JSON.stringify(extra) : null
    ];
}

async function replaceVaccinationRecords(childId, records, client) {
    await q('DELETE FROM vaccination_records WHERE child_id = $1', [childId], client);
    if (!records || typeof records !== 'object') return;
    for (const [ageGroup, vaccines] of Object.entries(records)) {
        if (!vaccines || typeof vaccines !== 'object') continue;
        for (const [vaccineName, value] of Object.entries(vaccines)) {
            if (value === false || value == null) continue;
            await q(
                `INSERT INTO vaccination_records (child_id, age_group, vaccine_name, value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (child_id, age_group, vaccine_name)
                 DO UPDATE SET value = EXCLUDED.value`,
                [childId, Number(ageGroup), vaccineName, value === true ? 'true' : String(value)],
                client
            );
        }
    }
}

async function attachVaccinations(childrenRows, client) {
    if (!childrenRows.length) return [];
    const ids = childrenRows.map((c) => Number(c.id));
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const rows = await many(
        `SELECT child_id, age_group, vaccine_name, value FROM vaccination_records WHERE child_id IN (${placeholders})`,
        ids,
        client
    );
    const map = {};
    for (const row of rows) {
        const childId = Number(row.child_id);
        if (!map[childId]) map[childId] = {};
        if (!map[childId][row.age_group]) map[childId][row.age_group] = {};
        map[childId][row.age_group][row.vaccine_name] = row.value === 'true' ? true : row.value;
    }
    return childrenRows.map((row) => {
        const child = rowToChildBase(row);
        child.vaccinationRecords = map[child.id] || {};
        return child;
    });
}

async function hydrateOrders(orderRows, client) {
    const result = [];
    for (const row of orderRows) {
        const items = (await many(
            'SELECT * FROM order_items WHERE order_id = $1',
            [row.id],
            client
        )).map(shopStore.mapOrderItemRow);
        result.push(rowToOrder(row, items));
    }
    return result;
}

async function resetIdentity(table, client) {
    await q(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
        [table],
        client
    );
}

async function importState(raw, client) {
    const state = normalizeState(raw);

    for (const user of Object.values(state.users || {})) {
        await q(
            `INSERT INTO users (
                id, username, email, mobile, password, first_name, last_name,
                birth_date, province, city, is_admin, profile_complete, created_at, extra
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [user.id, ...userToParams(user)],
            client
        );
    }

    for (const child of state.children || []) {
        await q(
            `INSERT INTO children (
                id, user_id, first_name, last_name, name, gender, birth_date, avatar,
                height, weight, blood_type, allergies, special_illnesses, national_id,
                father_name, birth_weight, birth_height, birth_head_circumference,
                birth_type, gestational_age, birth_place, apgar1, apgar5, vaccine_reminder, extra
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
            )`,
            [
                child.id,
                child.userId,
                child.firstName || null,
                child.lastName || null,
                child.name || null,
                child.gender || null,
                child.birthDate || null,
                child.avatar || null,
                child.height == null ? null : String(child.height),
                child.weight == null ? null : String(child.weight),
                child.bloodType || null,
                toJson(child.allergies),
                toJson(child.special_illnesses),
                child.nationalId || null,
                child.fatherName || null,
                child.birthWeight == null ? null : Number(child.birthWeight),
                child.birthHeight == null ? null : Number(child.birthHeight),
                child.birthHeadCircumference == null ? null : Number(child.birthHeadCircumference),
                child.birthType || null,
                child.gestationalAge == null ? null : Number(child.gestationalAge),
                child.birthPlace || null,
                child.apgar1 == null ? null : Number(child.apgar1),
                child.apgar5 == null ? null : Number(child.apgar5),
                toJson(child.vaccineReminder),
                null
            ],
            client
        );
        await replaceVaccinationRecords(child.id, child.vaccinationRecords, client);
    }

    for (const [childId, records] of Object.entries(state.growthData || {})) {
        (records || []).forEach(() => {});
        for (let index = 0; index < (records || []).length; index += 1) {
            const record = records[index];
            const date = record.date ? String(record.date).replace(/\//g, '-') : '';
            const publicId = record.id || `g-migrated-${childId}-${index}`;
            try {
                await q(
                    `INSERT INTO growth_records (public_id, child_id, date, height, weight, head_circumference)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [
                        publicId,
                        Number(childId),
                        date,
                        record.height == null ? null : Number(record.height),
                        record.weight == null ? null : Number(record.weight),
                        record.headCircumference == null ? null : Number(record.headCircumference)
                    ],
                    client
                );
            } catch (err) {
                if (!String(err.message || '').includes('duplicate key')) throw err;
            }
        }
    }

    for (const [childId, visits] of Object.entries(state.medicalVisits || {})) {
        for (const visit of visits || []) {
            await q(
                `INSERT INTO medical_visits (id, child_id, date, doctor_name, reason, summary, description)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [
                    visit.id || Date.now() + Number(childId),
                    Number(childId),
                    visit.date || null,
                    visit.doctorName || null,
                    visit.reason || null,
                    visit.summary || null,
                    visit.description || null
                ],
                client
            );
        }
    }

    for (const [childId, docs] of Object.entries(state.medicalDocuments || {})) {
        for (const doc of docs || []) {
            await q(
                `INSERT INTO medical_documents (id, child_id, title, date, url, uploaded_at)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    doc.id || Date.now() + Number(childId),
                    Number(childId),
                    doc.title || null,
                    doc.date || null,
                    doc.url || doc.filePath || null,
                    doc.uploadedAt || null
                ],
                client
            );
        }
    }

    for (const [childId, items] of Object.entries(state.checkups || {})) {
        for (const item of items || []) {
            await q(
                `INSERT INTO checkups (id, child_id, title, date, parameters, file_url)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    item.id || Date.now() + Number(childId),
                    Number(childId),
                    item.title || null,
                    item.date || null,
                    toJson(item.parameters),
                    item.fileUrl || null
                ],
                client
            );
        }
    }

    for (const [childId, items] of Object.entries(state.reminders || {})) {
        for (const item of items || []) {
            await q(
                `INSERT INTO reminders (
                    id, child_id, title, message, description, date, alarm_at, type, source, category, link, extra
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [
                    String(item.id),
                    Number(childId),
                    item.title || null,
                    item.message || null,
                    item.description || null,
                    item.date || null,
                    item.alarmAt || null,
                    item.type || null,
                    item.source || null,
                    item.category || null,
                    item.link || null,
                    null
                ],
                client
            );
        }
    }

    for (const [userId, items] of Object.entries(state.userReminders || {})) {
        for (const item of items || []) {
            await q(
                `INSERT INTO user_reminders (
                    id, user_id, title, description, alarm_at, created_at, notified, type, source, extra
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [
                    String(item.id),
                    Number(userId),
                    item.title || null,
                    item.description || null,
                    item.alarmAt || null,
                    item.createdAt || null,
                    asBoolInt(item.notified),
                    item.type || null,
                    item.source || null,
                    null
                ],
                client
            );
        }
    }

    for (const message of state.messages || []) {
        const inserted = await one(
            `INSERT INTO messages (id, title, body, link, image_url, type, is_bulk, created_at, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [
                message.id,
                message.title,
                message.body || '',
                message.link || null,
                message.imageUrl || null,
                message.type || 'admin',
                asBoolInt(message.isBulk),
                message.createdAt || null,
                message.createdBy || null
            ],
            client
        );
        const messageId = message.id || inserted.id;
        for (const userId of message.recipientIds || []) {
            const isRead = Array.isArray(message.readBy) && message.readBy.includes(userId) ? 1 : 0;
            await q(
                `INSERT INTO message_recipients (message_id, user_id, is_read)
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
                [messageId, userId, isRead],
                client
            );
        }
    }

    for (const banner of state.banners || []) {
        await q(
            'INSERT INTO banners (id, title, link, image_url) VALUES ($1,$2,$3,$4)',
            [banner.id, banner.title || null, banner.link || null, banner.imageUrl || null],
            client
        );
    }

    const newsItems = (state.news || []).length ? state.news : (state.articles || []);
    for (const item of newsItems) {
        await q(
            `INSERT INTO news (id, title, summary, content, category, image_url, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
                item.id,
                item.title || null,
                item.summary || null,
                item.content || null,
                item.category || null,
                item.imageUrl || null,
                item.createdAt || null,
                item.updatedAt || null
            ],
            client
        );
    }

    for (const video of state.videos || []) {
        await q(
            `INSERT INTO videos (id, title, summary, url, thumbnail_url, created_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
                video.id,
                video.title || null,
                video.summary || null,
                video.url || null,
                video.thumbnailUrl || null,
                video.createdAt || null
            ],
            client
        );
    }

    for (const podcast of state.podcasts || []) {
        await q(
            `INSERT INTO podcasts (id, title, summary, url, thumbnail_url, duration, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
                podcast.id,
                podcast.title || null,
                podcast.summary || null,
                podcast.url || null,
                podcast.thumbnailUrl || null,
                podcast.duration || null,
                podcast.createdAt || null
            ],
            client
        );
    }

    for (const ticket of state.tickets || []) {
        await q(
            `INSERT INTO tickets (id, user_id, status, created_at, updated_at, payload)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
                ticket.id,
                ticket.userId || null,
                ticket.status || 'open',
                ticket.createdAt || null,
                ticket.updatedAt || null,
                JSON.stringify(ticket)
            ],
            client
        );
    }

    for (const product of state.products || []) {
        await q(
            `INSERT INTO products (id, name, description, category, price, stock, image_url, active, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                product.id,
                product.name,
                product.description || '',
                product.category || null,
                product.price || 0,
                product.stock || 0,
                product.imageUrl || null,
                asBoolInt(product.active !== false),
                product.createdAt || null,
                product.updatedAt || null
            ],
            client
        );
    }

    for (const order of state.orders || []) {
        const inserted = await one(
            `INSERT INTO orders (id, user_id, total, shipping_address, phone, notes, status, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [
                order.id,
                order.userId,
                order.total || 0,
                order.shippingAddress || null,
                order.phone || null,
                order.notes || '',
                order.status || 'pending',
                order.createdAt || null,
                order.updatedAt || null
            ],
            client
        );
        const orderId = order.id || inserted.id;
        for (const item of order.items || []) {
            await q(
                `INSERT INTO order_items (
                    order_id, product_id, name, price, quantity, line_total,
                    offer_id, vendor_id, vendor_name, commission_pct, commission_amount, line_status
                )
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [
                    orderId,
                    item.productId,
                    item.name,
                    item.price,
                    item.quantity,
                    item.lineTotal,
                    item.offerId || null,
                    item.vendorId || null,
                    item.vendorName || null,
                    item.commissionPct || 0,
                    item.commissionAmount || 0,
                    item.lineStatus || 'pending'
                ],
                client
            );
        }
    }

    for (const table of [
        'users', 'children', 'vaccination_records', 'growth_records', 'medical_visits',
        'medical_documents', 'checkups', 'messages', 'banners', 'news', 'videos',
        'podcasts', 'tickets', 'products', 'orders', 'order_items'
    ]) {
        await resetIdentity(table, client);
    }
}

async function getSchemaVersion() {
    try {
        const row = await one('SELECT value FROM schema_meta WHERE key = $1', ['version']);
        return row ? Number(row.value) : 0;
    } catch (_) {
        return 0;
    }
}

async function setSchemaVersion(version, client) {
    await q(
        `INSERT INTO schema_meta (key, value) VALUES ('version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(version)],
        client
    );
}

async function seedFromJsonIfEmpty() {
    const count = await one('SELECT COUNT(*)::int AS n FROM users');
    if (count.n > 0) return false;
    const jsonPath = path.join(__dirname, 'db.json');
    if (!fs.existsSync(jsonPath)) return false;
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    await withTx((client) => importState(raw, client));
    console.log(`Seeded PostgreSQL from ${jsonPath}`);
    return true;
}

const SQLITE_COPY_TABLES = [
    'users', 'children', 'vaccination_records', 'growth_records',
    'medical_visits', 'medical_documents', 'checkups', 'reminders',
    'user_reminders', 'messages', 'message_recipients', 'banners', 'news',
    'videos', 'podcasts', 'tickets', 'products', 'orders', 'order_items', 'otp_codes'
];

const SQLITE_IDENTITY_TABLES = [
    'users', 'children', 'vaccination_records', 'growth_records',
    'medical_visits', 'medical_documents', 'checkups', 'messages',
    'banners', 'news', 'videos', 'podcasts', 'tickets', 'products', 'orders', 'order_items'
];

async function copySqliteDatabase(sqlitePath, { force = false } = {}) {
    if (!sqlitePath || !fs.existsSync(sqlitePath)) return false;
    const count = await one('SELECT COUNT(*)::int AS n FROM users');
    if (count.n > 0 && !force && process.env.FORCE_MIGRATE !== '1') {
        console.log('PostgreSQL already has users. Set FORCE_MIGRATE=1 to overwrite from SQLite.');
        return false;
    }
    let Database;
    try {
        Database = require('better-sqlite3');
    } catch (_) {
        console.warn('better-sqlite3 is not available; skip SQLite import');
        return false;
    }
    const sqlite = new Database(sqlitePath, { readonly: true });
    try {
        const tableNames = sqlite.prepare(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).all().map((row) => row.name);

        if (tableNames.includes('users')) {
            await withTx(async (client) => {
                if (force || process.env.FORCE_MIGRATE === '1') {
                    for (const table of [...SQLITE_COPY_TABLES].reverse()) {
                        await q(`DELETE FROM ${table}`, [], client);
                    }
                }
                for (const table of SQLITE_COPY_TABLES) {
                    if (!tableNames.includes(table)) continue;
                    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
                    for (const row of rows) {
                        const cols = Object.keys(row);
                        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
                        await q(
                            `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
                            cols.map((col) => row[col]),
                            client
                        );
                    }
                }
                for (const table of SQLITE_IDENTITY_TABLES) {
                    await resetIdentity(table, client);
                }
            });
            console.log(`Copied relational SQLite tables from ${sqlitePath}`);
            return true;
        }

        const blobTable = tableNames.includes('app_state')
            ? 'app_state'
            : (tableNames.includes('app_state_legacy') ? 'app_state_legacy' : null);
        if (!blobTable) return false;
        const row = sqlite.prepare(`SELECT data FROM ${blobTable} WHERE id = ?`).get('main');
        if (!row) return false;
        await withTx((client) => importState(JSON.parse(row.data), client));
        console.log(`Imported legacy SQLite blob from ${sqlitePath}`);
        return true;
    } finally {
        sqlite.close();
    }
}

async function maybeImportFromSqlite() {
    return copySqliteDatabase(DEFAULT_SQLITE_PATH);
}

async function connect() {
    if (pool) return pool;
    if (connecting) return connecting;
    connecting = (async () => {
        const next = new Pool({
            connectionString: databaseUrl(),
            max: Number(process.env.PG_POOL_SIZE || 20),
            idleTimeoutMillis: 30000
        });
        try {
            await next.query('SELECT 1');
            pool = next;
            const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
            await pool.query(schemaSql);
            await shopStore.ensureShopSchemaPg(q, one, many);
            await seedShopCategories();
            const version = await getSchemaVersion();
            if (version < SCHEMA_VERSION) {
                const importedSqlite = await maybeImportFromSqlite();
                if (!importedSqlite) await seedFromJsonIfEmpty();
                await setSchemaVersion(SCHEMA_VERSION);
            }
            await shopStore.ensureShopSchemaPg(q, one, many);
            await pool.query('DELETE FROM otp_codes WHERE expires_at < $1', [Date.now()]);
            console.log(`Connected to PostgreSQL schema v${SCHEMA_VERSION}`);
            return pool;
        } catch (err) {
            try { await next.end(); } catch (_) { /* ignore */ }
            pool = null;
            throw err;
        }
    })();
    try {
        return await connecting;
    } finally {
        connecting = null;
    }
}

async function close() {
    if (pool) {
        await pool.end();
        pool = null;
        publicCache.clear();
    }
}

async function ping() {
    const row = await one('SELECT 1 AS ok');
    return row && Number(row.ok) === 1;
}

async function health() {
    await connect();
    const row = await one('SELECT current_database() AS db, current_user AS db_user');
    const counts = await one(`
        SELECT
            (SELECT COUNT(*)::int FROM users) AS users,
            (SELECT COUNT(*)::int FROM children) AS children,
            (SELECT COUNT(*)::int FROM products) AS products,
            (SELECT COUNT(*)::int FROM orders) AS orders
    `);
    return {
        ok: await ping(),
        db: 'postgresql',
        engine: 'postgresql',
        database: row.db,
        schemaVersion: await getSchemaVersion(),
        poolMax: Number(process.env.PG_POOL_SIZE || 20),
        wal: false,
        counts
    };
}

const users = {
    async getById(id) {
        return rowToUser(await one('SELECT * FROM users WHERE id = $1', [Number(id)]));
    },
    async list() {
        return (await many('SELECT * FROM users ORDER BY id')).map(rowToUser);
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM users')).n;
    },
    async exists(id) {
        return !!(await users.getById(id));
    },
    async findByPhone(phone) {
        const normalized = normalizePhone(phone);
        return rowToUser(await one(
            'SELECT * FROM users WHERE mobile = $1 OR username = $1 LIMIT 1',
            [normalized]
        ));
    },
    async findByUsernameOrEmail(login) {
        const value = String(login || '').trim();
        return rowToUser(await one(
            'SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1',
            [value]
        ));
    },
    async findCandidatesForLogin(login) {
        const loginRaw = String(login || '').trim();
        if (!loginRaw) return [];
        const loginLower = loginRaw.toLowerCase();
        const phone = normalizePhone(loginRaw);
        const adminAlias = loginLower === 'amin' || loginLower === 'admin';
        const rows = await many(
            `SELECT * FROM users
             WHERE lower(username) = $1
                OR lower(email) = $1
                OR ($2 <> '' AND (mobile = $2 OR username = $2))
                OR ($3 AND is_admin = 1)`,
            [loginLower, phone, adminAlias]
        );
        return rows.map(rowToUser);
    },
    async listNonAdminIds() {
        return (await many('SELECT id FROM users WHERE is_admin = 0')).map((r) => Number(r.id));
    },
    async listAllIds() {
        return (await many('SELECT id FROM users')).map((r) => Number(r.id));
    },
    async create(user) {
        const row = await one(
            `INSERT INTO users (
                username, email, mobile, password, first_name, last_name,
                birth_date, province, city, is_admin, profile_complete, created_at, extra
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *`,
            userToParams(user)
        );
        return rowToUser(row);
    },
    async update(id, patch) {
        const current = await users.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        await q(
            `UPDATE users SET
                username=$1, email=$2, mobile=$3, password=$4, first_name=$5, last_name=$6,
                birth_date=$7, province=$8, city=$9, is_admin=$10, profile_complete=$11,
                created_at=$12, extra=$13
             WHERE id=$14`,
            [...userToParams(next), Number(id)]
        );
        return users.getById(id);
    },
    async remove(id) {
        const result = await q('DELETE FROM users WHERE id = $1', [Number(id)]);
        return result.rowCount > 0;
    }
};

const children = {
    async getById(id) {
        const row = await one('SELECT * FROM children WHERE id = $1', [Number(id)]);
        if (!row) return null;
        return (await attachVaccinations([row]))[0];
    },
    async listByUserId(userId) {
        return attachVaccinations(await many(
            'SELECT * FROM children WHERE user_id = $1 ORDER BY id',
            [Number(userId)]
        ));
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM children')).n;
    },
    async create(child) {
        return withTx(async (client) => {
            const row = await one(
                `INSERT INTO children (
                    user_id, first_name, last_name, name, gender, birth_date, avatar,
                    height, weight, blood_type, allergies, special_illnesses, national_id,
                    father_name, birth_weight, birth_height, birth_head_circumference,
                    birth_type, gestational_age, birth_place, apgar1, apgar5, vaccine_reminder, extra
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
                ) RETURNING *`,
                [
                    child.userId,
                    child.firstName || null,
                    child.lastName || null,
                    child.name || null,
                    child.gender || null,
                    child.birthDate || null,
                    child.avatar || null,
                    child.height == null ? null : String(child.height),
                    child.weight == null ? null : String(child.weight),
                    child.bloodType || null,
                    toJson(child.allergies),
                    toJson(child.special_illnesses),
                    child.nationalId || null,
                    child.fatherName || null,
                    child.birthWeight == null ? null : Number(child.birthWeight),
                    child.birthHeight == null ? null : Number(child.birthHeight),
                    child.birthHeadCircumference == null ? null : Number(child.birthHeadCircumference),
                    child.birthType || null,
                    child.gestationalAge == null ? null : Number(child.gestationalAge),
                    child.birthPlace || null,
                    child.apgar1 == null ? null : Number(child.apgar1),
                    child.apgar5 == null ? null : Number(child.apgar5),
                    toJson(child.vaccineReminder),
                    null
                ],
                client
            );
            await replaceVaccinationRecords(row.id, child.vaccinationRecords || {}, client);
            return (await attachVaccinations([row], client))[0];
        });
    },
    async update(id, patch) {
        const current = await children.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        return withTx(async (client) => {
            await q(
                `UPDATE children SET
                    user_id=$1, first_name=$2, last_name=$3, name=$4, gender=$5, birth_date=$6,
                    avatar=$7, height=$8, weight=$9, blood_type=$10, allergies=$11, special_illnesses=$12,
                    national_id=$13, father_name=$14, birth_weight=$15, birth_height=$16,
                    birth_head_circumference=$17, birth_type=$18, gestational_age=$19, birth_place=$20,
                    apgar1=$21, apgar5=$22, vaccine_reminder=$23
                 WHERE id=$24`,
                [
                    next.userId,
                    next.firstName || null,
                    next.lastName || null,
                    next.name || null,
                    next.gender || null,
                    next.birthDate || null,
                    next.avatar || null,
                    next.height == null ? null : String(next.height),
                    next.weight == null ? null : String(next.weight),
                    next.bloodType || null,
                    toJson(next.allergies),
                    toJson(next.special_illnesses),
                    next.nationalId || null,
                    next.fatherName || null,
                    next.birthWeight == null ? null : Number(next.birthWeight),
                    next.birthHeight == null ? null : Number(next.birthHeight),
                    next.birthHeadCircumference == null ? null : Number(next.birthHeadCircumference),
                    next.birthType || null,
                    next.gestationalAge == null ? null : Number(next.gestationalAge),
                    next.birthPlace || null,
                    next.apgar1 == null ? null : Number(next.apgar1),
                    next.apgar5 == null ? null : Number(next.apgar5),
                    toJson(next.vaccineReminder),
                    Number(id)
                ],
                client
            );
            if (patch.vaccinationRecords) {
                await replaceVaccinationRecords(Number(id), patch.vaccinationRecords, client);
            }
            const row = await one('SELECT * FROM children WHERE id = $1', [Number(id)], client);
            return (await attachVaccinations([row], client))[0];
        });
    },
    async remove(id) {
        const result = await q('DELETE FROM children WHERE id = $1', [Number(id)]);
        return result.rowCount > 0;
    },
    async getGrowthState(childId) {
        const row = await one('SELECT extra FROM children WHERE id = $1', [Number(childId)]);
        if (!row) return null;
        const extra = parseJson(row.extra, {});
        return {
            milestones: extra.milestones && typeof extra.milestones === 'object' ? extra.milestones : {},
            completions: extra.completions && typeof extra.completions === 'object' ? extra.completions : {},
            concerns: Array.isArray(extra.concerns) ? extra.concerns : [],
            safetyChecks: extra.safetyChecks && typeof extra.safetyChecks === 'object' ? extra.safetyChecks : {}
        };
    },
    async saveGrowthState(childId, patch) {
        const row = await one('SELECT extra FROM children WHERE id = $1', [Number(childId)]);
        if (!row) return null;
        const extra = parseJson(row.extra, {});
        const next = {
            ...extra,
            milestones: patch.milestones !== undefined ? patch.milestones : extra.milestones || {},
            completions: patch.completions !== undefined ? patch.completions : extra.completions || {},
            concerns: patch.concerns !== undefined ? patch.concerns : extra.concerns || [],
            safetyChecks: patch.safetyChecks !== undefined ? patch.safetyChecks : extra.safetyChecks || {}
        };
        await q('UPDATE children SET extra = $1 WHERE id = $2', [JSON.stringify(next), Number(childId)]);
        return children.getGrowthState(childId);
    },
    async setVaccinationValue(childId, ageGroup, vaccineName, value) {
        await q(
            `INSERT INTO vaccination_records (child_id, age_group, vaccine_name, value)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (child_id, age_group, vaccine_name)
             DO UPDATE SET value = EXCLUDED.value`,
            [Number(childId), Number(ageGroup), vaccineName, value === true ? 'true' : String(value)]
        );
        return children.getById(childId);
    }
};

const growth = {
    async list(childId) {
        return (await many(
            'SELECT * FROM growth_records WHERE child_id = $1 ORDER BY date',
            [Number(childId)]
        )).map(rowToGrowth);
    },
    async upsert(childId, record) {
        const existing = await one(
            'SELECT * FROM growth_records WHERE child_id = $1 AND date = $2',
            [Number(childId), record.date]
        );
        if (existing) {
            await q(
                `UPDATE growth_records SET height=$1, weight=$2, head_circumference=$3
                 WHERE child_id=$4 AND public_id=$5`,
                [record.height, record.weight, record.headCircumference, Number(childId), existing.public_id]
            );
            return {
                record: rowToGrowth({
                    ...existing,
                    date: record.date,
                    height: record.height,
                    weight: record.weight,
                    head_circumference: record.headCircumference
                }),
                created: false
            };
        }
        const publicId = record.id || `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await q(
            `INSERT INTO growth_records (public_id, child_id, date, height, weight, head_circumference)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [publicId, Number(childId), record.date, record.height, record.weight, record.headCircumference]
        );
        return {
            record: {
                id: publicId,
                date: record.date,
                height: record.height,
                weight: record.weight,
                headCircumference: record.headCircumference
            },
            created: true
        };
    },
    async update(childId, recordId, record) {
        const existing = await one(
            'SELECT * FROM growth_records WHERE child_id = $1 AND public_id = $2',
            [Number(childId), String(recordId)]
        );
        if (!existing) return null;
        const dateOwner = await one(
            'SELECT * FROM growth_records WHERE child_id = $1 AND date = $2',
            [Number(childId), record.date]
        );
        if (dateOwner && dateOwner.public_id !== String(recordId)) {
            return { error: 'duplicate-date' };
        }
        await q(
            `UPDATE growth_records SET date=$1, height=$2, weight=$3, head_circumference=$4
             WHERE child_id=$5 AND public_id=$6`,
            [record.date, record.height, record.weight, record.headCircumference, Number(childId), String(recordId)]
        );
        return {
            record: {
                id: String(recordId),
                date: record.date,
                height: record.height,
                weight: record.weight,
                headCircumference: record.headCircumference
            }
        };
    },
    async removeById(childId, recordId) {
        const result = await q(
            'DELETE FROM growth_records WHERE child_id = $1 AND public_id = $2',
            [Number(childId), String(recordId)]
        );
        return result.rowCount > 0;
    },
    async removeByDate(childId, date) {
        const result = await q(
            'DELETE FROM growth_records WHERE child_id = $1 AND date = $2',
            [Number(childId), date]
        );
        return result.rowCount > 0;
    }
};

const visits = {
    async list(childId) {
        return (await many(
            'SELECT * FROM medical_visits WHERE child_id = $1 ORDER BY date DESC',
            [Number(childId)]
        )).map(rowToVisit);
    },
    async create(childId, visit) {
        const row = await one(
            `INSERT INTO medical_visits (child_id, date, doctor_name, reason, summary, description)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [Number(childId), visit.date || null, visit.doctorName || null, visit.reason || null, visit.summary || null, visit.description || null]
        );
        return rowToVisit(row);
    },
    async remove(childId, visitId) {
        const result = await q(
            'DELETE FROM medical_visits WHERE child_id = $1 AND id = $2',
            [Number(childId), Number(visitId)]
        );
        return result.rowCount > 0;
    }
};

const documents = {
    async list(childId) {
        return (await many(
            'SELECT * FROM medical_documents WHERE child_id = $1 ORDER BY id DESC',
            [Number(childId)]
        )).map(rowToDocument);
    },
    async create(childId, doc) {
        const row = await one(
            `INSERT INTO medical_documents (child_id, title, date, url, uploaded_at)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [Number(childId), doc.title || null, doc.date || null, doc.url || doc.filePath || null, doc.uploadedAt || null]
        );
        return rowToDocument(row);
    },
    async remove(childId, docId) {
        const result = await q(
            'DELETE FROM medical_documents WHERE child_id = $1 AND id = $2',
            [Number(childId), Number(docId)]
        );
        return result.rowCount > 0;
    }
};

const checkups = {
    async list(childId) {
        return (await many(
            'SELECT * FROM checkups WHERE child_id = $1 ORDER BY date DESC',
            [Number(childId)]
        )).map(rowToCheckup);
    },
    async create(childId, checkup) {
        const row = await one(
            `INSERT INTO checkups (child_id, title, date, parameters, file_url)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [Number(childId), checkup.title || null, checkup.date || null, toJson(checkup.parameters), checkup.fileUrl || null]
        );
        return rowToCheckup(row);
    },
    async remove(childId, checkupId) {
        const result = await q(
            'DELETE FROM checkups WHERE child_id = $1 AND id = $2',
            [Number(childId), Number(checkupId)]
        );
        return result.rowCount > 0;
    }
};

const reminders = {
    async list(childId) {
        return (await many('SELECT * FROM reminders WHERE child_id = $1', [Number(childId)])).map(rowToReminder);
    },
    async create(childId, reminder) {
        await q(
            `INSERT INTO reminders (
                id, child_id, title, message, description, date, alarm_at, type, source, category, link, extra
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
                String(reminder.id),
                Number(childId),
                reminder.title || null,
                reminder.message || null,
                reminder.description || null,
                reminder.date || null,
                reminder.alarmAt || null,
                reminder.type || null,
                reminder.source || null,
                reminder.category || null,
                reminder.link || null,
                null
            ]
        );
        return reminder;
    },
    async remove(childId, reminderId) {
        const result = await q(
            'DELETE FROM reminders WHERE child_id = $1 AND id = $2',
            [Number(childId), String(reminderId)]
        );
        return result.rowCount > 0;
    }
};

const userReminders = {
    async list(userId) {
        return (await many(
            'SELECT * FROM user_reminders WHERE user_id = $1 ORDER BY alarm_at',
            [Number(userId)]
        )).map(rowToUserReminder);
    },
    async create(userId, reminder) {
        await q(
            `INSERT INTO user_reminders (
                id, user_id, title, description, alarm_at, created_at, notified, type, source, extra
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                String(reminder.id),
                Number(userId),
                reminder.title || null,
                reminder.description || null,
                reminder.alarmAt || null,
                reminder.createdAt || null,
                asBoolInt(reminder.notified),
                reminder.type || null,
                reminder.source || null,
                null
            ]
        );
        return reminder;
    },
    async update(userId, reminderId, patch) {
        const current = await one(
            'SELECT * FROM user_reminders WHERE user_id = $1 AND id = $2',
            [Number(userId), String(reminderId)]
        );
        if (!current) return null;
        const next = { ...rowToUserReminder(current), ...patch };
        await q(
            `UPDATE user_reminders SET title=$1, description=$2, alarm_at=$3, notified=$4
             WHERE user_id=$5 AND id=$6`,
            [next.title || null, next.description || null, next.alarmAt || null, asBoolInt(next.notified), Number(userId), String(reminderId)]
        );
        return next;
    },
    async remove(userId, reminderId) {
        const result = await q(
            'DELETE FROM user_reminders WHERE user_id = $1 AND id = $2',
            [Number(userId), String(reminderId)]
        );
        return result.rowCount > 0;
    }
};

function messageFromRows(row, recipients) {
    return {
        id: Number(row.id),
        title: row.title,
        body: row.body,
        link: row.link,
        imageUrl: row.image_url,
        type: row.type || 'admin',
        isBulk: asBool(row.is_bulk),
        createdAt: row.created_at,
        createdBy: row.created_by == null ? null : Number(row.created_by),
        recipientIds: recipients.map((r) => Number(r.user_id)),
        readBy: recipients.filter((r) => r.is_read).map((r) => Number(r.user_id))
    };
}

const messages = {
    async getById(id) {
        const row = await one('SELECT * FROM messages WHERE id = $1', [Number(id)]);
        if (!row) return null;
        const recipients = await many(
            'SELECT user_id, is_read FROM message_recipients WHERE message_id = $1',
            [Number(id)]
        );
        return messageFromRows(row, recipients);
    },
    async listAll() {
        const rows = await many('SELECT * FROM messages ORDER BY created_at DESC, id DESC');
        const result = [];
        for (const row of rows) {
            const recipients = await many(
                'SELECT user_id, is_read FROM message_recipients WHERE message_id = $1',
                [row.id]
            );
            result.push(messageFromRows(row, recipients));
        }
        return result;
    },
    async listForUser(userId) {
        const rows = await many(
            `SELECT m.*, r.is_read
             FROM messages m
             JOIN message_recipients r ON r.message_id = m.id
             WHERE r.user_id = $1
             ORDER BY m.created_at DESC, m.id DESC`,
            [Number(userId)]
        );
        return rows.map((row) => ({
            id: Number(row.id),
            title: row.title,
            body: row.body,
            link: row.link || null,
            imageUrl: row.image_url || null,
            type: row.type || 'admin',
            source: 'admin',
            isBulk: asBool(row.is_bulk),
            createdAt: row.created_at,
            isRead: asBool(row.is_read)
        }));
    },
    async unreadCount(userId) {
        return (await one(
            'SELECT COUNT(*)::int AS n FROM message_recipients WHERE user_id = $1 AND is_read = 0',
            [Number(userId)]
        )).n;
    },
    async markRead(id, userId) {
        const result = await q(
            'UPDATE message_recipients SET is_read = 1 WHERE message_id = $1 AND user_id = $2',
            [Number(id), Number(userId)]
        );
        return result.rowCount > 0;
    },
    async removeRecipient(id, userId) {
        const result = await q(
            'DELETE FROM message_recipients WHERE message_id = $1 AND user_id = $2',
            [Number(id), Number(userId)]
        );
        if (result.rowCount === 0) return false;
        const remaining = await one(
            'SELECT COUNT(*)::int AS n FROM message_recipients WHERE message_id = $1',
            [Number(id)]
        );
        if (remaining.n === 0) {
            await q('DELETE FROM messages WHERE id = $1', [Number(id)]);
        }
        return true;
    },
    async create(message) {
        return withTx(async (client) => {
            const row = await one(
                `INSERT INTO messages (title, body, link, image_url, type, is_bulk, created_at, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                [
                    message.title,
                    message.body || '',
                    message.link || null,
                    message.imageUrl || null,
                    message.type || 'admin',
                    asBoolInt(message.isBulk),
                    message.createdAt || new Date().toISOString(),
                    message.createdBy || null
                ],
                client
            );
            for (const userId of message.recipientIds || []) {
                await q(
                    'INSERT INTO message_recipients (message_id, user_id, is_read) VALUES ($1,$2,0)',
                    [row.id, Number(userId)],
                    client
                );
            }
            const recipients = await many(
                'SELECT user_id, is_read FROM message_recipients WHERE message_id = $1',
                [row.id],
                client
            );
            return messageFromRows(row, recipients);
        });
    },
    async remove(id) {
        const result = await q('DELETE FROM messages WHERE id = $1', [Number(id)]);
        return result.rowCount > 0;
    }
};

const banners = {
    async list() {
        const cached = cacheGet('banners');
        if (cached) return cached;
        const all = (await many('SELECT * FROM banners ORDER BY sort_order, id')).map(rowToBanner);
        return cacheSet('banners', all);
    },
    async listByPlacement(placement) {
        const all = await banners.list();
        if (!placement || placement === 'all') return all;
        const filtered = all.filter((b) => b.placement === placement);
        return filtered.length ? filtered : all;
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM banners')).n;
    },
    async create(banner) {
        const row = await one(
            `INSERT INTO banners (title, link, image_url, placement, product_id, sort_order, subtitle)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                banner.title || null,
                banner.link || null,
                banner.imageUrl || null,
                banner.placement || 'home',
                banner.productId ? Number(banner.productId) : null,
                Number(banner.sortOrder || 0),
                banner.subtitle || null
            ]
        );
        cacheInvalidate('banners');
        return rowToBanner(row);
    },
    async update(id, patch) {
        const current = (await banners.list()).find((item) => Number(item.id) === Number(id));
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        await q(
            `UPDATE banners SET title=$1, link=$2, image_url=$3, placement=$4, product_id=$5, sort_order=$6, subtitle=$7
             WHERE id=$8`,
            [
                next.title || null,
                next.link || null,
                next.imageUrl || null,
                next.placement || 'home',
                next.productId ? Number(next.productId) : null,
                Number(next.sortOrder || 0),
                next.subtitle || null,
                Number(id)
            ]
        );
        cacheInvalidate('banners');
        return banners.list().then((list) => list.find((item) => Number(item.id) === Number(id)));
    },
    async remove(id) {
        const result = await q('DELETE FROM banners WHERE id = $1', [Number(id)]);
        cacheInvalidate('banners');
        return result.rowCount > 0;
    }
};

const news = {
    async list() {
        const cached = cacheGet('news');
        if (cached) return cached;
        return cacheSet('news', (await many('SELECT * FROM news ORDER BY created_at DESC, id DESC')).map(rowToNews));
    },
    async getById(id) {
        const row = await one('SELECT * FROM news WHERE id = $1', [Number(id)]);
        return row ? rowToNews(row) : null;
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM news')).n;
    },
    async create(item) {
        const row = await one(
            `INSERT INTO news (title, summary, content, category, image_url, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [
                item.title || null,
                item.summary || null,
                item.content || null,
                item.category || null,
                item.imageUrl || null,
                item.createdAt || new Date().toISOString(),
                item.updatedAt || null
            ]
        );
        cacheInvalidate('news');
        return rowToNews(row);
    },
    async update(id, item) {
        const current = await news.getById(id);
        if (!current) return null;
        const next = { ...current, ...item, id: Number(id) };
        await q(
            `UPDATE news SET title=$1, summary=$2, content=$3, category=$4, image_url=$5, updated_at=$6
             WHERE id=$7`,
            [
                next.title || null,
                next.summary || null,
                next.content || null,
                next.category || null,
                next.imageUrl || null,
                next.updatedAt || new Date().toISOString(),
                Number(id)
            ]
        );
        cacheInvalidate('news');
        return news.getById(id);
    },
    async remove(id) {
        const result = await q('DELETE FROM news WHERE id = $1', [Number(id)]);
        cacheInvalidate('news');
        return result.rowCount > 0;
    }
};

const videos = {
    async list() {
        const cached = cacheGet('videos');
        if (cached) return cached;
        return cacheSet('videos', (await many('SELECT * FROM videos ORDER BY created_at DESC, id DESC')).map(rowToVideo));
    },
    async getById(id) {
        const row = await one('SELECT * FROM videos WHERE id = $1', [Number(id)]);
        return row ? rowToVideo(row) : null;
    },
    async create(item) {
        const row = await one(
            `INSERT INTO videos (title, summary, url, thumbnail_url, created_at)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [item.title || null, item.summary || null, item.url || null, item.thumbnailUrl || null, item.createdAt || new Date().toISOString()]
        );
        cacheInvalidate('videos');
        return rowToVideo(row);
    },
    async update(id, patch) {
        const current = await videos.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        await q(
            'UPDATE videos SET title=$1, summary=$2, url=$3, thumbnail_url=$4 WHERE id=$5',
            [next.title || null, next.summary || null, next.url || null, next.thumbnailUrl || null, Number(id)]
        );
        cacheInvalidate('videos');
        return videos.getById(id);
    },
    async remove(id) {
        const row = await one('SELECT * FROM videos WHERE id = $1', [Number(id)]);
        if (!row) return null;
        await q('DELETE FROM videos WHERE id = $1', [Number(id)]);
        cacheInvalidate('videos');
        return rowToVideo(row);
    }
};

const podcasts = {
    async list() {
        const cached = cacheGet('podcasts');
        if (cached) return cached;
        return cacheSet('podcasts', (await many(
            'SELECT * FROM podcasts ORDER BY created_at DESC, id DESC'
        )).map(rowToPodcast));
    },
    async getById(id) {
        const row = await one('SELECT * FROM podcasts WHERE id = $1', [Number(id)]);
        return row ? rowToPodcast(row) : null;
    },
    async create(item) {
        const row = await one(
            `INSERT INTO podcasts (title, summary, url, thumbnail_url, duration, created_at)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
                item.title || null,
                item.summary || null,
                item.url || null,
                item.thumbnailUrl || null,
                item.duration || null,
                item.createdAt || new Date().toISOString()
            ]
        );
        cacheInvalidate('podcasts');
        return rowToPodcast(row);
    },
    async update(id, patch) {
        const current = await podcasts.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        await q(
            `UPDATE podcasts SET title=$1, summary=$2, url=$3, thumbnail_url=$4, duration=$5 WHERE id=$6`,
            [next.title || null, next.summary || null, next.url || null, next.thumbnailUrl || null, next.duration || null, Number(id)]
        );
        cacheInvalidate('podcasts');
        return podcasts.getById(id);
    },
    async remove(id) {
        const row = await one('SELECT * FROM podcasts WHERE id = $1', [Number(id)]);
        if (!row) return null;
        await q('DELETE FROM podcasts WHERE id = $1', [Number(id)]);
        cacheInvalidate('podcasts');
        return rowToPodcast(row);
    }
};

function rowToTicket(row) {
    const payload = parseJson(row.payload, {});
    return {
        ...payload,
        id: Number(row.id),
        userId: row.user_id == null ? null : Number(row.user_id),
        status: row.status,
        subject: payload.subject || row.subject || '',
        content: payload.content || payload.message || '',
        replies: payload.replies || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

const tickets = {
    async list() {
        return (await many('SELECT * FROM tickets ORDER BY id DESC')).map(rowToTicket);
    },
    async listByUser(userId) {
        return (await many(
            'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
            [Number(userId)]
        )).map(rowToTicket);
    },
    async getById(id) {
        const row = await one('SELECT * FROM tickets WHERE id = $1', [Number(id)]);
        return row ? rowToTicket(row) : null;
    },
    async create({ userId, subject, content, groupName, subgroup, attachments }) {
        const createdAt = new Date().toISOString();
        const payload = {
            subject: String(subject || '').trim(),
            content: String(content || '').trim(),
            groupName: String(groupName || '').trim(),
            subgroup: String(subgroup || '').trim(),
            attachments: Array.isArray(attachments) ? attachments : [],
            replies: []
        };
        const row = await one(
            `INSERT INTO tickets (user_id, status, created_at, updated_at, payload)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [Number(userId), 'open', createdAt, createdAt, JSON.stringify(payload)]
        );
        const ticket = rowToTicket(row);
        ticket.ticketNumber = `TK-${String(ticket.id).padStart(5, '0')}`;
        return tickets.update(ticket.id, ticket);
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM tickets')).n;
    },
    async countOpen() {
        return (await one("SELECT COUNT(*)::int AS n FROM tickets WHERE status = 'open'")).n;
    },
    async update(id, ticket) {
        const result = await q(
            'UPDATE tickets SET status=$1, updated_at=$2, payload=$3 WHERE id=$4',
            [ticket.status || 'open', ticket.updatedAt || new Date().toISOString(), JSON.stringify(ticket), Number(id)]
        );
        return result.rowCount > 0 ? tickets.getById(id) : null;
    }
};

const products = {
    async getById(id) {
        const row = await one('SELECT * FROM products WHERE id = $1', [Number(id)]);
        return row ? hydrateProduct(rowToProduct(row)) : null;
    },
    async listAll() {
        return shopStore.listCatalogPg(many, asBool, {}, { activeOnly: false });
    },
    async listActive(filters = {}) {
        return shopStore.listCatalogPg(many, asBool, filters);
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM products')).n;
    },
    async create(product) {
        const row = await one(
            `INSERT INTO products (name, description, category, price, stock, image_url, active, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [
                product.name,
                product.description || '',
                product.category || null,
                product.price,
                product.stock || 0,
                product.imageUrl || null,
                asBoolInt(product.active !== false),
                product.createdAt || new Date().toISOString(),
                product.updatedAt || null
            ]
        );
        cacheInvalidate('products');
        await shopStore.syncProductCommercePg(q, one, row.id, product);
        return products.getById(row.id);
    },
    async update(id, product) {
        const current = await products.getById(id);
        if (!current) return null;
        const next = { ...current, ...product, id: Number(id) };
        await q(
            `UPDATE products SET name=$1, description=$2, category=$3, price=$4, stock=$5,
                image_url=$6, active=$7, updated_at=$8
             WHERE id=$9`,
            [
                next.name,
                next.description || '',
                next.category || null,
                next.price,
                next.stock,
                next.imageUrl || null,
                asBoolInt(next.active !== false),
                next.updatedAt || new Date().toISOString(),
                Number(id)
            ]
        );
        cacheInvalidate('products');
        await shopStore.syncProductCommercePg(q, one, Number(id), next);
        return products.getById(id);
    },
    async remove(id) {
        const result = await q('DELETE FROM products WHERE id = $1', [Number(id)]);
        cacheInvalidate('products');
        return result.rowCount > 0;
    }
};

const orders = {
    async getById(id) {
        const row = await one('SELECT * FROM orders WHERE id = $1', [Number(id)]);
        if (!row) return null;
        return (await hydrateOrders([row]))[0];
    },
    async listByUser(userId) {
        return hydrateOrders(await many(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
            [Number(userId)]
        ));
    },
    async listAll() {
        return hydrateOrders(await many('SELECT * FROM orders ORDER BY created_at DESC, id DESC'));
    },
    async count() {
        return (await one('SELECT COUNT(*)::int AS n FROM orders')).n;
    },
    async countPending() {
        return (await one("SELECT COUNT(*)::int AS n FROM orders WHERE status = 'pending'")).n;
    },
    async create({ userId, items, total, shippingAddress, phone, notes }) {
        return withTx(async (client) => {
            const resolved = [];
            for (const item of items) {
                const product = await one('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId], client);
                if (!product || !asBool(product.active)) {
                    const err = new Error(`product-missing:${item.productId}`);
                    err.code = 'PRODUCT_MISSING';
                    throw err;
                }
                const offer = item.offerId
                    ? await shopStore.getOfferByIdPg(one, item.offerId)
                    : await shopStore.cheapestOfferForProductPg(many, item.productId);
                const stock = offer ? offer.stock : product.stock;
                if (stock < item.quantity) {
                    const err = new Error(product.name);
                    err.code = 'OUT_OF_STOCK';
                    throw err;
                }
                const price = item.price != null ? Number(item.price) : (offer ? offer.price : product.price);
                const lineTotal = item.lineTotal != null ? Number(item.lineTotal) : price * item.quantity;
                const commissionPct = offer ? Number(offer.commissionPct || 0) : 0;
                const commissionAmount = Math.round((lineTotal * commissionPct) / 100);
                resolved.push({
                    product,
                    offer,
                    quantity: item.quantity,
                    name: item.name || product.name,
                    price,
                    lineTotal,
                    commissionPct,
                    commissionAmount
                });
            }
            for (const item of resolved) {
                await q('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product.id], client);
                if (item.offer) {
                    await shopStore.adjustOfferStockByIdPg(q, item.offer.id, -item.quantity, client);
                } else {
                    await shopStore.adjustOfferStockPg(q, item.product.id, -item.quantity, client);
                }
            }
            const createdAt = new Date().toISOString();
            const orderRow = await one(
                `INSERT INTO orders (user_id, total, shipping_address, phone, notes, status, created_at)
                 VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
                [Number(userId), total, shippingAddress, phone, notes || '', createdAt],
                client
            );
            for (const item of resolved) {
                const line = await one(
                    `INSERT INTO order_items (
                        order_id, product_id, name, price, quantity, line_total,
                        offer_id, vendor_id, vendor_name, commission_pct, commission_amount, line_status
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending') RETURNING id`,
                    [
                        orderRow.id,
                        item.product.id,
                        item.name,
                        item.price,
                        item.quantity,
                        item.lineTotal,
                        item.offer ? item.offer.id : null,
                        item.offer ? item.offer.vendorId : null,
                        item.offer ? item.offer.vendorName : null,
                        item.commissionPct,
                        item.commissionAmount
                    ],
                    client
                );
                const ledgerBase = {
                    orderId: orderRow.id,
                    orderItemId: line.id,
                    vendorId: item.offer ? item.offer.vendorId : null,
                    createdAt
                };
                await shopStore.insertLedgerPg(q, {
                    ...ledgerBase,
                    kind: 'sale',
                    amount: item.lineTotal,
                    note: `فروش ${item.name}`
                }, client);
                await shopStore.insertLedgerPg(q, {
                    ...ledgerBase,
                    kind: 'commission',
                    amount: item.commissionAmount,
                    note: `کمیسیون ${item.commissionPct}٪`
                }, client);
                await shopStore.insertLedgerPg(q, {
                    ...ledgerBase,
                    kind: 'vendor_hold',
                    amount: item.lineTotal - item.commissionAmount,
                    note: 'نگهداری امانی تا تحویل و پایان مهلت مرجوعی'
                }, client);
            }
            return (await hydrateOrders([orderRow], client))[0];
        });
    },
    async updateStatus(id, status) {
        return withTx(async (client) => {
            const currentRows = await hydrateOrders(
                await many('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [Number(id)], client),
                client
            );
            const current = currentRows[0];
            if (!current) return null;
            if (status === 'cancelled' && current.status !== 'cancelled') {
                const now = new Date().toISOString();
                for (const item of current.items || []) {
                    if (item.productId) {
                        await q(
                            'UPDATE products SET stock = stock + $1 WHERE id = $2',
                            [item.quantity, item.productId],
                            client
                        );
                        if (item.offerId) {
                            await shopStore.adjustOfferStockByIdPg(q, item.offerId, item.quantity, client);
                        } else {
                            await shopStore.adjustOfferStockPg(q, item.productId, item.quantity, client);
                        }
                    }
                    await shopStore.insertLedgerPg(q, {
                        kind: 'refund',
                        orderId: current.id,
                        orderItemId: item.id,
                        vendorId: item.vendorId,
                        amount: -(item.lineTotal || 0),
                        note: 'لغو سفارش و آزادسازی موجودی',
                        createdAt: now
                    }, client);
                }
            }
            await q(
                'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3',
                [status, new Date().toISOString(), Number(id)],
                client
            );
            const updated = await one('SELECT * FROM orders WHERE id = $1', [Number(id)], client);
            return (await hydrateOrders([updated], client))[0];
        });
    }
};

const otp = {
    async get(phone) {
        const row = await one('SELECT * FROM otp_codes WHERE phone = $1', [phone]);
        if (!row) return null;
        return {
            code: row.code,
            purpose: row.purpose,
            expiresAt: Number(row.expires_at),
            sentAt: Number(row.sent_at),
            attempts: row.attempts
        };
    },
    async set(phone, entry) {
        await q(
            `INSERT INTO otp_codes (phone, code, purpose, expires_at, sent_at, attempts)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (phone) DO UPDATE SET
                code = EXCLUDED.code,
                purpose = EXCLUDED.purpose,
                expires_at = EXCLUDED.expires_at,
                sent_at = EXCLUDED.sent_at,
                attempts = EXCLUDED.attempts`,
            [phone, entry.code, entry.purpose, entry.expiresAt, entry.sentAt, entry.attempts || 0]
        );
    },
    async remove(phone) {
        await q('DELETE FROM otp_codes WHERE phone = $1', [phone]);
    }
};

function normalizeState(raw = {}) {
    const base = emptyState();
    return {
        ...base,
        ...raw,
        users: raw.users || {},
        children: (raw.children || []).map((child) => ({
            ...child,
            vaccinationRecords: child.vaccinationRecords || {}
        })),
        growthData: raw.growthData || {},
        medicalVisits: raw.medicalVisits || {},
        medicalDocuments: raw.medicalDocuments || {},
        checkups: raw.checkups || {},
        reminders: raw.reminders || {},
        userReminders: raw.userReminders || {},
        messages: raw.messages || [],
        banners: raw.banners || [],
        articles: raw.articles || [],
        news: raw.news || [],
        tickets: raw.tickets || [],
        videos: raw.videos || [],
        podcasts: raw.podcasts || [],
        products: raw.products || [],
        orders: raw.orders || []
    };
}

async function migrateFromJson(jsonPath) {
    await connect();
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    const userCount = (await one('SELECT COUNT(*)::int AS n FROM users')).n;
    if (userCount > 0 && process.env.FORCE_MIGRATE !== '1') {
        console.log('PostgreSQL already has data. Set FORCE_MIGRATE=1 to overwrite from db.json');
        return false;
    }
    if (process.env.FORCE_MIGRATE === '1' && userCount > 0) {
        await q(`
            TRUNCATE TABLE
                order_items, orders, products, message_recipients, messages,
                vaccination_records, growth_records, medical_visits, medical_documents,
                checkups, reminders, user_reminders, children, users, banners, news,
                videos, podcasts, tickets, otp_codes
            RESTART IDENTITY CASCADE
        `);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    await withTx((client) => importState(raw, client));
    await setSchemaVersion(SCHEMA_VERSION);
    console.log(`Migrated ${jsonPath} -> PostgreSQL`);
    return true;
}

const DEFAULT_SHOP_GROUPS = ['تغذیه', 'اسباب‌بازی', 'پوشاک', 'کتاب', 'بهداشت'];

async function seedShopCategories() {
    const count = await one('SELECT COUNT(*)::int AS n FROM product_categories');
    if (count.n > 0) return;
    for (let i = 0; i < DEFAULT_SHOP_GROUPS.length; i += 1) {
        await q('INSERT INTO product_categories (name, parent_id, sort_order) VALUES ($1, NULL, $2)', [
            DEFAULT_SHOP_GROUPS[i],
            i
        ]);
    }
}

function rowToCategory(row) {
    return {
        id: Number(row.id),
        name: row.name,
        parentId: row.parent_id == null ? null : Number(row.parent_id),
        sortOrder: Number(row.sort_order || 0),
        active: row.active == null ? true : asBool(row.active)
    };
}

const productCategories = {
    async list() {
        await seedShopCategories();
        return (await many('SELECT * FROM product_categories ORDER BY sort_order, id')).map(rowToCategory);
    },
    async tree({ includeInactive } = {}) {
        const all = (await productCategories.list()).filter((c) => includeInactive || c.active !== false);
        return buildCategoryTree(all);
    },
    async create({ name, parentId, sortOrder }) {
        const row = await one(
            'INSERT INTO product_categories (name, parent_id, sort_order) VALUES ($1,$2,$3) RETURNING *',
            [String(name || '').trim(), parentId ? Number(parentId) : null, Number(sortOrder || 0)]
        );
        return rowToCategory(row);
    },
    async update(id, { name, parentId, sortOrder }) {
        const row = await one(
            'UPDATE product_categories SET name=$1, parent_id=$2, sort_order=$3 WHERE id=$4 RETURNING *',
            [String(name || '').trim(), parentId ? Number(parentId) : null, Number(sortOrder || 0), Number(id)]
        );
        return row ? rowToCategory(row) : null;
    },
    async remove(id) {
        const result = await q('DELETE FROM product_categories WHERE id = $1', [Number(id)]);
        return result.rowCount > 0;
    }
};

const productImages = {
    async listByProduct(productId) {
        return (await many(
            'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, id',
            [Number(productId)]
        )).map((row) => ({
            id: Number(row.id),
            productId: Number(row.product_id),
            imageUrl: row.image_url,
            sortOrder: Number(row.sort_order || 0)
        }));
    },
    async replace(productId, urls) {
        await q('DELETE FROM product_images WHERE product_id = $1', [Number(productId)]);
        for (let i = 0; i < (urls || []).length; i += 1) {
            if (urls[i]) {
                await q(
                    'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1,$2,$3)',
                    [Number(productId), urls[i], i]
                );
            }
        }
        return productImages.listByProduct(productId);
    },
    async add(productId, url) {
        const max = await one(
            'SELECT COALESCE(MAX(sort_order), -1)::int AS n FROM product_images WHERE product_id = $1',
            [Number(productId)]
        );
        await q(
            'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ($1,$2,$3)',
            [Number(productId), url, max.n + 1]
        );
        return productImages.listByProduct(productId);
    }
};

const COMMENT_SELECT_PG = `
    SELECT c.*, u.username, u.first_name, u.last_name, p.name AS product_name,
        (SELECT COUNT(*) FROM product_comment_votes v WHERE v.comment_id = c.id AND v.vote = 1) AS like_count,
        (SELECT COUNT(*) FROM product_comment_votes v WHERE v.comment_id = c.id AND v.vote = -1) AS dislike_count
    FROM product_comments c
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN products p ON p.id = c.product_id
`;

async function attachMyVotePg(rows, voterId) {
    if (!voterId || !rows.length) {
        return rows.map((row) => shopStore.mapCommentRow(row));
    }
    const ids = rows.map((row) => Number(row.id));
    const votes = await many(
        'SELECT comment_id, vote FROM product_comment_votes WHERE user_id = $1 AND comment_id = ANY($2::bigint[])',
        [Number(voterId), ids]
    );
    const mine = new Map(votes.map((row) => [Number(row.comment_id), Number(row.vote)]));
    return rows.map((row) => shopStore.mapCommentRow(row, { myVote: mine.get(Number(row.id)) || 0 }));
}

const productComments = {
    async getById(id, { voterId } = {}) {
        const row = await one(`${COMMENT_SELECT_PG} WHERE c.id = $1`, [Number(id)]);
        if (!row) return null;
        return (await attachMyVotePg([row], voterId))[0];
    },
    async listByProduct(productId, { status = 'approved', voterId } = {}) {
        const rows = status
            ? await many(`${COMMENT_SELECT_PG} WHERE c.product_id = $1 AND c.status = $2 ORDER BY c.id DESC`, [Number(productId), status])
            : await many(`${COMMENT_SELECT_PG} WHERE c.product_id = $1 ORDER BY c.id DESC`, [Number(productId)]);
        return attachMyVotePg(rows, voterId);
    },
    async listAdmin({ status } = {}) {
        const rows = status
            ? await many(`${COMMENT_SELECT_PG} WHERE c.status = $1 ORDER BY c.id DESC`, [status])
            : await many(`${COMMENT_SELECT_PG} ORDER BY c.id DESC`);
        return rows.map((row) => shopStore.mapCommentRow(row));
    },
    async create({ productId, userId, body, rating }) {
        const createdAt = new Date().toISOString();
        const parsedRating = Number(rating);
        const safeRating = Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5
            ? Math.round(parsedRating)
            : null;
        const row = await one(
            "INSERT INTO product_comments (product_id, user_id, body, rating, status, created_at) VALUES ($1,$2,$3,$4,'pending',$5) RETURNING *",
            [Number(productId), userId ? Number(userId) : null, String(body || '').trim(), safeRating, createdAt]
        );
        return productComments.getById(row.id);
    },
    async updateStatus(id, status) {
        const allowed = ['pending', 'approved', 'rejected'];
        if (!allowed.includes(status)) return null;
        await q('UPDATE product_comments SET status = $1 WHERE id = $2', [status, Number(id)]);
        return productComments.getById(id);
    },
    async vote({ commentId, userId, vote }) {
        const comment = await productComments.getById(commentId);
        if (!comment || comment.status !== 'approved') return null;
        const next = Number(vote);
        if (![1, -1, 0].includes(next)) {
            const err = new Error('invalid-vote');
            err.code = 'INVALID_VOTE';
            throw err;
        }
        if (next === 0) {
            await q('DELETE FROM product_comment_votes WHERE comment_id = $1 AND user_id = $2', [Number(commentId), Number(userId)]);
        } else {
            await q(`
                INSERT INTO product_comment_votes (comment_id, user_id, vote, created_at)
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (comment_id, user_id) DO UPDATE SET vote = EXCLUDED.vote
            `, [Number(commentId), Number(userId), next, new Date().toISOString()]);
        }
        return productComments.getById(commentId, { voterId: userId });
    }
};

async function hydrateProduct(product) {
    if (!product) return null;
    const images = await productImages.listByProduct(product.id);
    const comments = await productComments.listByProduct(product.id, { status: 'approved' });
    const cover = product.imageUrl ? [{ id: 0, productId: product.id, imageUrl: product.imageUrl, sortOrder: -1 }] : [];
    return shopStore.enrichProductPg(many, asBool, {
        ...product,
        images: [...cover, ...images.filter((img) => img.imageUrl !== product.imageUrl)],
        comments
    });
}

async function stats() {
    return {
        totalUsers: await users.count(),
        totalChildren: await children.count(),
        totalBanners: await banners.count(),
        totalArticles: await news.count(),
        totalTickets: await tickets.count(),
        openTickets: await tickets.countOpen(),
        totalProducts: await products.count(),
        totalOrders: await orders.count(),
        pendingOrders: await orders.countPending()
    };
}

module.exports = {
    engine: 'postgresql',
    connect,
    close,
    ping,
    health,
    stats,
    migrateFromJson,
    copySqliteDatabase,
    emptyState,
    normalizeState,
    SCHEMA_VERSION,
    databaseUrl,
    users,
    children,
    growth,
    visits,
    documents,
    checkups,
    reminders,
    userReminders,
    messages,
    banners,
    news,
    videos,
    podcasts,
    tickets,
    products,
    productCategories,
    productImages,
    productComments,
    shop: {
        listSkills() {
            return shopStore.listSkillsPg(many);
        },
        getInternalVendor() {
            return shopStore.getInternalVendorPg(one);
        },
        campaign() {
            return shopStore.listCampaignPg(one);
        },
        listOffers(productId) {
            return shopStore.listOffersForProductPg(many, productId);
        },
        getOffer(offerId) {
            return shopStore.getOfferByIdPg(one, offerId);
        },
        listVendors() {
            return shopStore.listVendorsPg(many);
        },
        getVendorByUser(userId) {
            return shopStore.getVendorByUserPg(one, userId);
        },
        applyVendor(payload) {
            return shopStore.applyVendorPg(q, one, payload);
        },
        updateVendor(id, patch) {
            return shopStore.updateVendorPg(q, one, id, patch);
        },
        ageBands: shopStore.AGE_BANDS,
        skills: shopStore.SKILLS
    },
    orders,
    otp,
    normalizePhone
};
