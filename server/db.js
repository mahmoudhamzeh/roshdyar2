const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 2;
const DB_FILE = process.env.SQLITE_PATH || path.join(__dirname, 'data', 'roshdyar.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

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
    childIdCounter: 1,
    userIdCounter: 1,
    messageIdCounter: 1,
    banners: [],
    articles: [],
    news: [],
    tickets: [],
    videos: [],
    podcasts: [],
    products: [],
    orders: [],
    productIdCounter: 1,
    orderIdCounter: 1
});

let db = null;
let stmts = null;
const publicCache = new Map();
const PUBLIC_CACHE_TTL_MS = 15 * 1000;

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
    return value === 1 || value === true || value === '1';
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
        id: row.id,
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
        id: row.id,
        userId: row.user_id,
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
        id: row.id,
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
        id: row.id,
        title: row.title,
        date: row.date,
        url,
        filePath: url,
        uploadedAt: row.uploaded_at
    };
}

function rowToCheckup(row) {
    return {
        id: row.id,
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
        id: row.id,
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
        id: row.id,
        userId: row.user_id,
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
        id: row.id,
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
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at
    };
}

function rowToPodcast(row) {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        createdAt: row.created_at
    };
}

function rowToBanner(row) {
    return {
        id: row.id,
        title: row.title,
        link: row.link,
        imageUrl: row.image_url
    };
}

function getSchemaVersion() {
    try {
        const row = db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version');
        return row ? Number(row.value) : 0;
    } catch (_) {
        return 0;
    }
}

function setSchemaVersion(version) {
    db.prepare(`
        INSERT INTO schema_meta (key, value) VALUES ('version', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(version));
}

function applyPragmas() {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('cache_size = -64000');
}

function prepareStatements() {
    stmts = {
        getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
        insertUser: db.prepare(`
            INSERT INTO users (
                id, username, email, mobile, password, first_name, last_name,
                birth_date, province, city, is_admin, profile_complete, created_at, extra
            ) VALUES (
                @id, @username, @email, @mobile, @password, @first_name, @last_name,
                @birth_date, @province, @city, @is_admin, @profile_complete, @created_at, @extra
            )
        `),
        insertUserAuto: db.prepare(`
            INSERT INTO users (
                username, email, mobile, password, first_name, last_name,
                birth_date, province, city, is_admin, profile_complete, created_at, extra
            ) VALUES (
                @username, @email, @mobile, @password, @first_name, @last_name,
                @birth_date, @province, @city, @is_admin, @profile_complete, @created_at, @extra
            )
        `),
        updateUser: db.prepare(`
            UPDATE users SET
                username = @username,
                email = @email,
                mobile = @mobile,
                password = @password,
                first_name = @first_name,
                last_name = @last_name,
                birth_date = @birth_date,
                province = @province,
                city = @city,
                is_admin = @is_admin,
                profile_complete = @profile_complete,
                created_at = @created_at,
                extra = @extra
            WHERE id = @id
        `),
        deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
        countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
        listUsers: db.prepare('SELECT * FROM users ORDER BY id'),
        getChildById: db.prepare('SELECT * FROM children WHERE id = ?'),
        listChildrenByUser: db.prepare('SELECT * FROM children WHERE user_id = ? ORDER BY id'),
        countChildren: db.prepare('SELECT COUNT(*) AS n FROM children'),
        deleteChild: db.prepare('DELETE FROM children WHERE id = ?'),
        listVaccinationsForChild: db.prepare(
            'SELECT age_group, vaccine_name, value FROM vaccination_records WHERE child_id = ?'
        ),
        deleteVaccinationsForChild: db.prepare('DELETE FROM vaccination_records WHERE child_id = ?'),
        upsertVaccination: db.prepare(`
            INSERT INTO vaccination_records (child_id, age_group, vaccine_name, value)
            VALUES (@child_id, @age_group, @vaccine_name, @value)
            ON CONFLICT(child_id, age_group, vaccine_name)
            DO UPDATE SET value = excluded.value
        `),
        listGrowth: db.prepare('SELECT * FROM growth_records WHERE child_id = ? ORDER BY date'),
        getGrowthByPublicId: db.prepare(
            'SELECT * FROM growth_records WHERE child_id = ? AND public_id = ?'
        ),
        getGrowthByDate: db.prepare('SELECT * FROM growth_records WHERE child_id = ? AND date = ?'),
        insertGrowth: db.prepare(`
            INSERT INTO growth_records (public_id, child_id, date, height, weight, head_circumference)
            VALUES (@public_id, @child_id, @date, @height, @weight, @head_circumference)
        `),
        updateGrowth: db.prepare(`
            UPDATE growth_records SET
                date = @date, height = @height, weight = @weight, head_circumference = @head_circumference
            WHERE child_id = @child_id AND public_id = @public_id
        `),
        deleteGrowthByPublicId: db.prepare(
            'DELETE FROM growth_records WHERE child_id = ? AND public_id = ?'
        ),
        deleteGrowthByDate: db.prepare('DELETE FROM growth_records WHERE child_id = ? AND date = ?'),
        listVisits: db.prepare('SELECT * FROM medical_visits WHERE child_id = ? ORDER BY date DESC'),
        insertVisit: db.prepare(`
            INSERT INTO medical_visits (id, child_id, date, doctor_name, reason, summary, description)
            VALUES (@id, @child_id, @date, @doctor_name, @reason, @summary, @description)
        `),
        listDocuments: db.prepare('SELECT * FROM medical_documents WHERE child_id = ? ORDER BY id DESC'),
        insertDocument: db.prepare(`
            INSERT INTO medical_documents (id, child_id, title, date, url, uploaded_at)
            VALUES (@id, @child_id, @title, @date, @url, @uploaded_at)
        `),
        listCheckups: db.prepare('SELECT * FROM checkups WHERE child_id = ? ORDER BY date DESC'),
        insertCheckup: db.prepare(`
            INSERT INTO checkups (id, child_id, title, date, parameters, file_url)
            VALUES (@id, @child_id, @title, @date, @parameters, @file_url)
        `),
        listReminders: db.prepare('SELECT * FROM reminders WHERE child_id = ?'),
        insertReminder: db.prepare(`
            INSERT INTO reminders (
                id, child_id, title, message, description, date, alarm_at, type, source, category, link, extra
            ) VALUES (
                @id, @child_id, @title, @message, @description, @date, @alarm_at, @type, @source, @category, @link, @extra
            )
        `),
        deleteReminder: db.prepare('DELETE FROM reminders WHERE child_id = ? AND id = ?'),
        listUserReminders: db.prepare('SELECT * FROM user_reminders WHERE user_id = ? ORDER BY alarm_at'),
        insertUserReminder: db.prepare(`
            INSERT INTO user_reminders (
                id, user_id, title, description, alarm_at, created_at, notified, type, source, extra
            ) VALUES (
                @id, @user_id, @title, @description, @alarm_at, @created_at, @notified, @type, @source, @extra
            )
        `),
        deleteUserReminder: db.prepare('DELETE FROM user_reminders WHERE user_id = ? AND id = ?'),
        getUserReminder: db.prepare('SELECT * FROM user_reminders WHERE user_id = ? AND id = ?'),
        listBanners: db.prepare('SELECT * FROM banners ORDER BY id'),
        insertBanner: db.prepare(
            'INSERT INTO banners (id, title, link, image_url) VALUES (@id, @title, @link, @image_url)'
        ),
        deleteBanner: db.prepare('DELETE FROM banners WHERE id = ?'),
        countBanners: db.prepare('SELECT COUNT(*) AS n FROM banners'),
        listNews: db.prepare('SELECT * FROM news ORDER BY created_at DESC, id DESC'),
        getNews: db.prepare('SELECT * FROM news WHERE id = ?'),
        insertNews: db.prepare(`
            INSERT INTO news (id, title, summary, content, category, image_url, created_at, updated_at)
            VALUES (@id, @title, @summary, @content, @category, @image_url, @created_at, @updated_at)
        `),
        deleteNews: db.prepare('DELETE FROM news WHERE id = ?'),
        countNews: db.prepare('SELECT COUNT(*) AS n FROM news'),
        listVideos: db.prepare('SELECT * FROM videos ORDER BY created_at DESC, id DESC'),
        insertVideo: db.prepare(`
            INSERT INTO videos (id, title, summary, url, thumbnail_url, created_at)
            VALUES (@id, @title, @summary, @url, @thumbnail_url, @created_at)
        `),
        getVideo: db.prepare('SELECT * FROM videos WHERE id = ?'),
        deleteVideo: db.prepare('DELETE FROM videos WHERE id = ?'),
        listPodcasts: db.prepare('SELECT * FROM podcasts ORDER BY created_at DESC, id DESC'),
        getPodcast: db.prepare('SELECT * FROM podcasts WHERE id = ?'),
        insertPodcast: db.prepare(`
            INSERT INTO podcasts (id, title, summary, url, thumbnail_url, duration, created_at)
            VALUES (@id, @title, @summary, @url, @thumbnail_url, @duration, @created_at)
        `),
        deletePodcast: db.prepare('DELETE FROM podcasts WHERE id = ?'),
        listTickets: db.prepare('SELECT * FROM tickets ORDER BY id DESC'),
        listTicketsByUser: db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY id DESC'),
        getTicket: db.prepare('SELECT * FROM tickets WHERE id = ?'),
        insertTicket: db.prepare(`
            INSERT INTO tickets (user_id, status, created_at, updated_at, payload)
            VALUES (@user_id, @status, @created_at, @updated_at, @payload)
        `),
        countTickets: db.prepare('SELECT COUNT(*) AS n FROM tickets'),
        countOpenTickets: db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE status = 'open'"),
        deleteVisit: db.prepare('DELETE FROM medical_visits WHERE child_id = ? AND id = ?'),
        deleteDocument: db.prepare('DELETE FROM medical_documents WHERE child_id = ? AND id = ?'),
        deleteCheckup: db.prepare('DELETE FROM checkups WHERE child_id = ? AND id = ?'),
        getProduct: db.prepare('SELECT * FROM products WHERE id = ?'),
        listAllProducts: db.prepare('SELECT * FROM products ORDER BY id DESC'),
        countProducts: db.prepare('SELECT COUNT(*) AS n FROM products'),
        deleteProduct: db.prepare('DELETE FROM products WHERE id = ?'),
        insertProduct: db.prepare(`
            INSERT INTO products (id, name, description, category, price, stock, image_url, active, created_at, updated_at)
            VALUES (@id, @name, @description, @category, @price, @stock, @image_url, @active, @created_at, @updated_at)
        `),
        insertProductAuto: db.prepare(`
            INSERT INTO products (name, description, category, price, stock, image_url, active, created_at, updated_at)
            VALUES (@name, @description, @category, @price, @stock, @image_url, @active, @created_at, @updated_at)
        `),
        getOrder: db.prepare('SELECT * FROM orders WHERE id = ?'),
        listOrdersByUser: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC'),
        listAllOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC'),
        listOrderItems: db.prepare('SELECT * FROM order_items WHERE order_id = ?'),
        countOrders: db.prepare('SELECT COUNT(*) AS n FROM orders'),
        countPendingOrders: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"),
        insertOrder: db.prepare(`
            INSERT INTO orders (user_id, total, shipping_address, phone, notes, status, created_at, updated_at)
            VALUES (@user_id, @total, @shipping_address, @phone, @notes, @status, @created_at, @updated_at)
        `),
        insertOrderItem: db.prepare(`
            INSERT INTO order_items (order_id, product_id, name, price, quantity, line_total)
            VALUES (@order_id, @product_id, @name, @price, @quantity, @line_total)
        `),
        updateOrderStatus: db.prepare(
            'UPDATE orders SET status = @status, updated_at = @updated_at WHERE id = @id'
        ),
        adjustStock: db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?'),
        getOtp: db.prepare('SELECT * FROM otp_codes WHERE phone = ?'),
        upsertOtp: db.prepare(`
            INSERT INTO otp_codes (phone, code, purpose, expires_at, sent_at, attempts)
            VALUES (@phone, @code, @purpose, @expires_at, @sent_at, @attempts)
            ON CONFLICT(phone) DO UPDATE SET
                code = excluded.code,
                purpose = excluded.purpose,
                expires_at = excluded.expires_at,
                sent_at = excluded.sent_at,
                attempts = excluded.attempts
        `),
        deleteOtp: db.prepare('DELETE FROM otp_codes WHERE phone = ?'),
        purgeOtp: db.prepare('DELETE FROM otp_codes WHERE expires_at < ?')
    };
}

function userToRow(user, { includeId } = {}) {
    const known = new Set([
        'id', 'username', 'email', 'mobile', 'password', 'firstName', 'lastName',
        'birthDate', 'province', 'city', 'isAdmin', 'profileComplete', 'createdAt'
    ]);
    const extra = {};
    for (const [key, value] of Object.entries(user)) {
        if (!known.has(key) && value !== undefined) extra[key] = value;
    }
    const row = {
        username: user.username || null,
        email: user.email || null,
        mobile: user.mobile || null,
        password: user.password == null ? null : String(user.password),
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        birth_date: user.birthDate || null,
        province: user.province || null,
        city: user.city || null,
        is_admin: asBoolInt(user.isAdmin),
        profile_complete: asBoolInt(user.profileComplete),
        created_at: user.createdAt || null,
        extra: Object.keys(extra).length ? JSON.stringify(extra) : null
    };
    if (includeId) row.id = user.id;
    return row;
}

function insertChildRow(child) {
    const extra = {};
    const known = new Set([
        'id', 'userId', 'firstName', 'lastName', 'name', 'gender', 'birthDate', 'avatar',
        'height', 'weight', 'bloodType', 'allergies', 'special_illnesses', 'nationalId',
        'fatherName', 'birthWeight', 'birthHeight', 'birthHeadCircumference', 'birthType',
        'gestationalAge', 'birthPlace', 'apgar1', 'apgar5', 'vaccinationRecords', 'vaccineReminder'
    ]);
    for (const [key, value] of Object.entries(child)) {
        if (!known.has(key) && value !== undefined) extra[key] = value;
    }
    const info = db.prepare(`
        INSERT INTO children (
            id, user_id, first_name, last_name, name, gender, birth_date, avatar,
            height, weight, blood_type, allergies, special_illnesses, national_id,
            father_name, birth_weight, birth_height, birth_head_circumference,
            birth_type, gestational_age, birth_place, apgar1, apgar5, vaccine_reminder, extra
        ) VALUES (
            @id, @user_id, @first_name, @last_name, @name, @gender, @birth_date, @avatar,
            @height, @weight, @blood_type, @allergies, @special_illnesses, @national_id,
            @father_name, @birth_weight, @birth_height, @birth_head_circumference,
            @birth_type, @gestational_age, @birth_place, @apgar1, @apgar5, @vaccine_reminder, @extra
        )
    `).run({
        id: child.id,
        user_id: child.userId,
        first_name: child.firstName || null,
        last_name: child.lastName || null,
        name: child.name || null,
        gender: child.gender || null,
        birth_date: child.birthDate || null,
        avatar: child.avatar || null,
        height: child.height == null ? null : String(child.height),
        weight: child.weight == null ? null : String(child.weight),
        blood_type: child.bloodType || null,
        allergies: toJson(child.allergies),
        special_illnesses: toJson(child.special_illnesses),
        national_id: child.nationalId || null,
        father_name: child.fatherName || null,
        birth_weight: child.birthWeight == null ? null : Number(child.birthWeight),
        birth_height: child.birthHeight == null ? null : Number(child.birthHeight),
        birth_head_circumference:
            child.birthHeadCircumference == null ? null : Number(child.birthHeadCircumference),
        birth_type: child.birthType || null,
        gestational_age: child.gestationalAge == null ? null : Number(child.gestationalAge),
        birth_place: child.birthPlace || null,
        apgar1: child.apgar1 == null ? null : Number(child.apgar1),
        apgar5: child.apgar5 == null ? null : Number(child.apgar5),
        vaccine_reminder: toJson(child.vaccineReminder),
        extra: Object.keys(extra).length ? JSON.stringify(extra) : null
    });
    return child.id || Number(info.lastInsertRowid);
}

function attachVaccinations(childrenRows) {
    if (!childrenRows.length) return [];
    const ids = childrenRows.map((c) => c.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(
        `SELECT child_id, age_group, vaccine_name, value FROM vaccination_records WHERE child_id IN (${placeholders})`
    ).all(...ids);
    const map = {};
    for (const row of rows) {
        if (!map[row.child_id]) map[row.child_id] = {};
        if (!map[row.child_id][row.age_group]) map[row.child_id][row.age_group] = {};
        map[row.child_id][row.age_group][row.vaccine_name] =
            row.value === 'true' ? true : row.value;
    }
    return childrenRows.map((row) => {
        const child = rowToChildBase(row);
        child.vaccinationRecords = map[row.id] || {};
        return child;
    });
}

function replaceVaccinationRecords(childId, records) {
    stmts.deleteVaccinationsForChild.run(childId);
    if (!records || typeof records !== 'object') return;
    for (const [ageGroup, vaccines] of Object.entries(records)) {
        if (!vaccines || typeof vaccines !== 'object') continue;
        for (const [vaccineName, value] of Object.entries(vaccines)) {
            if (value === false || value == null) continue;
            stmts.upsertVaccination.run({
                child_id: childId,
                age_group: Number(ageGroup),
                vaccine_name: vaccineName,
                value: value === true ? 'true' : String(value)
            });
        }
    }
}

function hydrateOrders(orderRows) {
    return orderRows.map((row) => {
        const items = stmts.listOrderItems.all(row.id).map((item) => ({
            productId: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            lineTotal: item.line_total
        }));
        return rowToOrder(row, items);
    });
}

function importState(raw) {
    const state = normalizeState(raw);
    const tx = db.transaction(() => {
        for (const user of Object.values(state.users || {})) {
            stmts.insertUser.run(userToRow(user, { includeId: true }));
        }

        for (const child of state.children || []) {
            insertChildRow(child);
            replaceVaccinationRecords(child.id, child.vaccinationRecords);
        }

        for (const [childId, records] of Object.entries(state.growthData || {})) {
            (records || []).forEach((record, index) => {
                const date = record.date ? String(record.date).replace(/\//g, '-') : '';
                const publicId = record.id || `g-migrated-${childId}-${index}`;
                try {
                    stmts.insertGrowth.run({
                        public_id: publicId,
                        child_id: Number(childId),
                        date,
                        height: record.height == null ? null : Number(record.height),
                        weight: record.weight == null ? null : Number(record.weight),
                        head_circumference:
                            record.headCircumference == null ? null : Number(record.headCircumference)
                    });
                } catch (err) {
                    if (!String(err.message || '').includes('UNIQUE')) throw err;
                }
            });
        }

        for (const [childId, visits] of Object.entries(state.medicalVisits || {})) {
            for (const visit of visits || []) {
                stmts.insertVisit.run({
                    id: visit.id || Date.now() + Number(childId),
                    child_id: Number(childId),
                    date: visit.date || null,
                    doctor_name: visit.doctorName || null,
                    reason: visit.reason || null,
                    summary: visit.summary || null,
                    description: visit.description || null
                });
            }
        }

        for (const [childId, docs] of Object.entries(state.medicalDocuments || {})) {
            for (const doc of docs || []) {
                stmts.insertDocument.run({
                    id: doc.id || Date.now() + Number(childId),
                    child_id: Number(childId),
                    title: doc.title || null,
                    date: doc.date || null,
                    url: doc.url || doc.filePath || null,
                    uploaded_at: doc.uploadedAt || null
                });
            }
        }

        for (const [childId, items] of Object.entries(state.checkups || {})) {
            for (const item of items || []) {
                stmts.insertCheckup.run({
                    id: item.id || Date.now() + Number(childId),
                    child_id: Number(childId),
                    title: item.title || null,
                    date: item.date || null,
                    parameters: toJson(item.parameters),
                    file_url: item.fileUrl || null
                });
            }
        }

        for (const [childId, items] of Object.entries(state.reminders || {})) {
            for (const item of items || []) {
                stmts.insertReminder.run({
                    id: String(item.id),
                    child_id: Number(childId),
                    title: item.title || null,
                    message: item.message || null,
                    description: item.description || null,
                    date: item.date || null,
                    alarm_at: item.alarmAt || null,
                    type: item.type || null,
                    source: item.source || null,
                    category: item.category || null,
                    link: item.link || null,
                    extra: null
                });
            }
        }

        for (const [userId, items] of Object.entries(state.userReminders || {})) {
            for (const item of items || []) {
                stmts.insertUserReminder.run({
                    id: String(item.id),
                    user_id: Number(userId),
                    title: item.title || null,
                    description: item.description || null,
                    alarm_at: item.alarmAt || null,
                    created_at: item.createdAt || null,
                    notified: asBoolInt(item.notified),
                    type: item.type || null,
                    source: item.source || null,
                    extra: null
                });
            }
        }

        for (const message of state.messages || []) {
            const info = db.prepare(`
                INSERT INTO messages (id, title, body, link, image_url, type, is_bulk, created_at, created_by)
                VALUES (@id, @title, @body, @link, @image_url, @type, @is_bulk, @created_at, @created_by)
            `).run({
                id: message.id,
                title: message.title,
                body: message.body || '',
                link: message.link || null,
                image_url: message.imageUrl || null,
                type: message.type || 'admin',
                is_bulk: asBoolInt(message.isBulk),
                created_at: message.createdAt || null,
                created_by: message.createdBy || null
            });
            const messageId = message.id || Number(info.lastInsertRowid);
            const insertRecipient = db.prepare(`
                INSERT OR IGNORE INTO message_recipients (message_id, user_id, is_read)
                VALUES (?, ?, ?)
            `);
            for (const userId of message.recipientIds || []) {
                const isRead = Array.isArray(message.readBy) && message.readBy.includes(userId) ? 1 : 0;
                insertRecipient.run(messageId, userId, isRead);
            }
        }

        for (const banner of state.banners || []) {
            stmts.insertBanner.run({
                id: banner.id,
                title: banner.title || null,
                link: banner.link || null,
                image_url: banner.imageUrl || null
            });
        }

        const newsItems = (state.news || []).length ? state.news : (state.articles || []);
        for (const item of newsItems) {
            stmts.insertNews.run({
                id: item.id,
                title: item.title || null,
                summary: item.summary || null,
                content: item.content || null,
                category: item.category || null,
                image_url: item.imageUrl || null,
                created_at: item.createdAt || null,
                updated_at: item.updatedAt || null
            });
        }

        for (const video of state.videos || []) {
            stmts.insertVideo.run({
                id: video.id,
                title: video.title || null,
                summary: video.summary || null,
                url: video.url || null,
                thumbnail_url: video.thumbnailUrl || null,
                created_at: video.createdAt || null
            });
        }

        for (const podcast of state.podcasts || []) {
            db.prepare(`
                INSERT INTO podcasts (id, title, summary, url, thumbnail_url, duration, created_at)
                VALUES (@id, @title, @summary, @url, @thumbnail_url, @duration, @created_at)
            `).run({
                id: podcast.id,
                title: podcast.title || null,
                summary: podcast.summary || null,
                url: podcast.url || null,
                thumbnail_url: podcast.thumbnailUrl || null,
                duration: podcast.duration || null,
                created_at: podcast.createdAt || null
            });
        }

        for (const ticket of state.tickets || []) {
            db.prepare(`
                INSERT INTO tickets (id, user_id, status, created_at, updated_at, payload)
                VALUES (@id, @user_id, @status, @created_at, @updated_at, @payload)
            `).run({
                id: ticket.id,
                user_id: ticket.userId || null,
                status: ticket.status || 'open',
                created_at: ticket.createdAt || null,
                updated_at: ticket.updatedAt || null,
                payload: JSON.stringify(ticket)
            });
        }

        for (const product of state.products || []) {
            stmts.insertProduct.run({
                id: product.id,
                name: product.name,
                description: product.description || '',
                category: product.category || null,
                price: product.price || 0,
                stock: product.stock || 0,
                image_url: product.imageUrl || null,
                active: asBoolInt(product.active !== false),
                created_at: product.createdAt || null,
                updated_at: product.updatedAt || null
            });
        }

        for (const order of state.orders || []) {
            const info = db.prepare(`
                INSERT INTO orders (id, user_id, total, shipping_address, phone, notes, status, created_at, updated_at)
                VALUES (@id, @user_id, @total, @shipping_address, @phone, @notes, @status, @created_at, @updated_at)
            `).run({
                id: order.id,
                user_id: order.userId,
                total: order.total || 0,
                shipping_address: order.shippingAddress || null,
                phone: order.phone || null,
                notes: order.notes || '',
                status: order.status || 'pending',
                created_at: order.createdAt || null,
                updated_at: order.updatedAt || null
            });
            const orderId = order.id || Number(info.lastInsertRowid);
            for (const item of order.items || []) {
                stmts.insertOrderItem.run({
                    order_id: orderId,
                    product_id: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    line_total: item.lineTotal
                });
            }
        }
    });
    tx();
}

function maybeMigrateLegacyBlob() {
    const hasAppState = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_state'"
    ).get();
    if (!hasAppState) return false;
    const row = db.prepare('SELECT data FROM app_state WHERE id = ?').get('main');
    if (!row) return false;
    const raw = JSON.parse(row.data);
    importState(raw);
    db.exec('ALTER TABLE app_state RENAME TO app_state_legacy');
    console.log('Migrated legacy app_state JSON blob into relational tables');
    return true;
}

function seedFromJsonIfEmpty() {
    const userCount = stmts.countUsers.get().n;
    if (userCount > 0) return false;
    const jsonPath = path.join(__dirname, 'db.json');
    if (!fs.existsSync(jsonPath)) return false;
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    importState(raw);
    console.log(`Seeded relational SQLite from ${jsonPath}`);
    return true;
}

function connect() {
    if (db) return db;
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_FILE);
    applyPragmas();
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    prepareStatements();

    const version = getSchemaVersion();
    if (version < SCHEMA_VERSION) {
        const migrated = maybeMigrateLegacyBlob();
        if (!migrated) seedFromJsonIfEmpty();
        setSchemaVersion(SCHEMA_VERSION);
    }

    stmts.purgeOtp.run(Date.now());
    console.log(`Connected to relational SQLite (${DB_FILE}) schema v${SCHEMA_VERSION}`);
    return db;
}

function close() {
    if (db) {
        db.close();
        db = null;
        stmts = null;
        publicCache.clear();
    }
}

function ping() {
    connect();
    const row = db.prepare('SELECT 1 AS ok').get();
    return row && row.ok === 1;
}

function health() {
    connect();
    const wal = String(db.pragma('journal_mode', { simple: true }) || '').toLowerCase() === 'wal';
    return {
        ok: ping(),
        db: 'sqlite',
        file: DB_FILE,
        schemaVersion: getSchemaVersion(),
        wal,
        counts: {
            users: stmts.countUsers.get().n,
            children: stmts.countChildren.get().n,
            products: stmts.countProducts.get().n,
            orders: stmts.countOrders.get().n
        }
    };
}

const users = {
    getById(id) {
        connect();
        return rowToUser(stmts.getUserById.get(Number(id)));
    },
    list() {
        connect();
        return stmts.listUsers.all().map(rowToUser);
    },
    count() {
        connect();
        return stmts.countUsers.get().n;
    },
    exists(id) {
        return !!users.getById(id);
    },
    findByPhone(phone) {
        connect();
        const normalized = normalizePhone(phone);
        const row = db.prepare(`
            SELECT * FROM users
            WHERE mobile = ? OR username = ?
            LIMIT 1
        `).get(normalized, normalized);
        return rowToUser(row);
    },
    findByUsernameOrEmail(login) {
        connect();
        const value = String(login || '').trim();
        const row = db.prepare(`
            SELECT * FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
        `).get(value, value);
        return rowToUser(row);
    },
    findCandidatesForLogin(login) {
        connect();
        const loginRaw = String(login || '').trim();
        if (!loginRaw) return [];
        const loginLower = loginRaw.toLowerCase();
        const phone = normalizePhone(loginRaw);
        const adminAlias = loginLower === 'amin' || loginLower === 'admin';
        const rows = db.prepare(`
            SELECT * FROM users
            WHERE lower(username) = @loginLower
               OR lower(email) = @loginLower
               OR (@phone != '' AND (mobile = @phone OR username = @phone))
               OR (@adminAlias = 1 AND is_admin = 1)
        `).all({
            loginLower,
            phone,
            adminAlias: adminAlias ? 1 : 0
        });
        return rows.map(rowToUser);
    },
    listNonAdminIds() {
        connect();
        return db.prepare('SELECT id FROM users WHERE is_admin = 0').all().map((r) => r.id);
    },
    listAllIds() {
        connect();
        return db.prepare('SELECT id FROM users').all().map((r) => r.id);
    },
    create(user) {
        connect();
        const row = userToRow(user);
        const info = stmts.insertUserAuto.run(row);
        return users.getById(Number(info.lastInsertRowid));
    },
    update(id, patch) {
        connect();
        const current = users.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        stmts.updateUser.run(userToRow(next, { includeId: true }));
        return users.getById(id);
    },
    remove(id) {
        connect();
        const info = stmts.deleteUser.run(Number(id));
        return info.changes > 0;
    }
};

const children = {
    getById(id) {
        connect();
        const row = stmts.getChildById.get(Number(id));
        if (!row) return null;
        return attachVaccinations([row])[0];
    },
    listByUserId(userId) {
        connect();
        return attachVaccinations(stmts.listChildrenByUser.all(Number(userId)));
    },
    count() {
        connect();
        return stmts.countChildren.get().n;
    },
    create(child) {
        connect();
        const created = db.transaction(() => {
            const info = db.prepare(`
                INSERT INTO children (
                    user_id, first_name, last_name, name, gender, birth_date, avatar,
                    height, weight, blood_type, allergies, special_illnesses, national_id,
                    father_name, birth_weight, birth_height, birth_head_circumference,
                    birth_type, gestational_age, birth_place, apgar1, apgar5, vaccine_reminder, extra
                ) VALUES (
                    @user_id, @first_name, @last_name, @name, @gender, @birth_date, @avatar,
                    @height, @weight, @blood_type, @allergies, @special_illnesses, @national_id,
                    @father_name, @birth_weight, @birth_height, @birth_head_circumference,
                    @birth_type, @gestational_age, @birth_place, @apgar1, @apgar5, @vaccine_reminder, @extra
                )
            `).run({
                user_id: child.userId,
                first_name: child.firstName || null,
                last_name: child.lastName || null,
                name: child.name || null,
                gender: child.gender || null,
                birth_date: child.birthDate || null,
                avatar: child.avatar || null,
                height: child.height == null ? null : String(child.height),
                weight: child.weight == null ? null : String(child.weight),
                blood_type: child.bloodType || null,
                allergies: toJson(child.allergies),
                special_illnesses: toJson(child.special_illnesses),
                national_id: child.nationalId || null,
                father_name: child.fatherName || null,
                birth_weight: child.birthWeight == null ? null : Number(child.birthWeight),
                birth_height: child.birthHeight == null ? null : Number(child.birthHeight),
                birth_head_circumference:
                    child.birthHeadCircumference == null ? null : Number(child.birthHeadCircumference),
                birth_type: child.birthType || null,
                gestational_age: child.gestationalAge == null ? null : Number(child.gestationalAge),
                birth_place: child.birthPlace || null,
                apgar1: child.apgar1 == null ? null : Number(child.apgar1),
                apgar5: child.apgar5 == null ? null : Number(child.apgar5),
                vaccine_reminder: toJson(child.vaccineReminder),
                extra: null
            });
            const id = Number(info.lastInsertRowid);
            replaceVaccinationRecords(id, child.vaccinationRecords || {});
            return id;
        })();
        return children.getById(created);
    },
    update(id, patch) {
        connect();
        const current = children.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        db.transaction(() => {
            db.prepare(`
                UPDATE children SET
                    user_id = @user_id,
                    first_name = @first_name,
                    last_name = @last_name,
                    name = @name,
                    gender = @gender,
                    birth_date = @birth_date,
                    avatar = @avatar,
                    height = @height,
                    weight = @weight,
                    blood_type = @blood_type,
                    allergies = @allergies,
                    special_illnesses = @special_illnesses,
                    national_id = @national_id,
                    father_name = @father_name,
                    birth_weight = @birth_weight,
                    birth_height = @birth_height,
                    birth_head_circumference = @birth_head_circumference,
                    birth_type = @birth_type,
                    gestational_age = @gestational_age,
                    birth_place = @birth_place,
                    apgar1 = @apgar1,
                    apgar5 = @apgar5,
                    vaccine_reminder = @vaccine_reminder
                WHERE id = @id
            `).run({
                id: Number(id),
                user_id: next.userId,
                first_name: next.firstName || null,
                last_name: next.lastName || null,
                name: next.name || null,
                gender: next.gender || null,
                birth_date: next.birthDate || null,
                avatar: next.avatar || null,
                height: next.height == null ? null : String(next.height),
                weight: next.weight == null ? null : String(next.weight),
                blood_type: next.bloodType || null,
                allergies: toJson(next.allergies),
                special_illnesses: toJson(next.special_illnesses),
                national_id: next.nationalId || null,
                father_name: next.fatherName || null,
                birth_weight: next.birthWeight == null ? null : Number(next.birthWeight),
                birth_height: next.birthHeight == null ? null : Number(next.birthHeight),
                birth_head_circumference:
                    next.birthHeadCircumference == null ? null : Number(next.birthHeadCircumference),
                birth_type: next.birthType || null,
                gestational_age: next.gestationalAge == null ? null : Number(next.gestationalAge),
                birth_place: next.birthPlace || null,
                apgar1: next.apgar1 == null ? null : Number(next.apgar1),
                apgar5: next.apgar5 == null ? null : Number(next.apgar5),
                vaccine_reminder: toJson(next.vaccineReminder)
            });
            if (patch.vaccinationRecords) {
                replaceVaccinationRecords(Number(id), patch.vaccinationRecords);
            }
        })();
        return children.getById(id);
    },
    remove(id) {
        connect();
        const info = stmts.deleteChild.run(Number(id));
        return info.changes > 0;
    },
    setVaccinationValue(childId, ageGroup, vaccineName, value) {
        connect();
        stmts.upsertVaccination.run({
            child_id: Number(childId),
            age_group: Number(ageGroup),
            vaccine_name: vaccineName,
            value: value === true ? 'true' : String(value)
        });
        return children.getById(childId);
    }
};

const growth = {
    list(childId) {
        connect();
        return stmts.listGrowth.all(Number(childId)).map(rowToGrowth);
    },
    upsert(childId, record) {
        connect();
        const existing = stmts.getGrowthByDate.get(Number(childId), record.date);
        if (existing) {
            stmts.updateGrowth.run({
                child_id: Number(childId),
                public_id: existing.public_id,
                date: record.date,
                height: record.height,
                weight: record.weight,
                head_circumference: record.headCircumference
            });
            return { record: rowToGrowth({ ...existing, ...{
                date: record.date,
                height: record.height,
                weight: record.weight,
                head_circumference: record.headCircumference
            }}), created: false };
        }
        const publicId = record.id || `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        stmts.insertGrowth.run({
            public_id: publicId,
            child_id: Number(childId),
            date: record.date,
            height: record.height,
            weight: record.weight,
            head_circumference: record.headCircumference
        });
        return {
            record: { id: publicId, date: record.date, height: record.height, weight: record.weight, headCircumference: record.headCircumference },
            created: true
        };
    },
    update(childId, recordId, record) {
        connect();
        const existing = stmts.getGrowthByPublicId.get(Number(childId), String(recordId));
        if (!existing) return null;
        const dateOwner = stmts.getGrowthByDate.get(Number(childId), record.date);
        if (dateOwner && dateOwner.public_id !== String(recordId)) {
            return { error: 'duplicate-date' };
        }
        stmts.updateGrowth.run({
            child_id: Number(childId),
            public_id: String(recordId),
            date: record.date,
            height: record.height,
            weight: record.weight,
            head_circumference: record.headCircumference
        });
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
    removeById(childId, recordId) {
        connect();
        const info = stmts.deleteGrowthByPublicId.run(Number(childId), String(recordId));
        return info.changes > 0;
    },
    removeByDate(childId, date) {
        connect();
        const info = stmts.deleteGrowthByDate.run(Number(childId), date);
        return info.changes > 0;
    }
};

const visits = {
    list(childId) {
        connect();
        return stmts.listVisits.all(Number(childId)).map(rowToVisit);
    },
    create(childId, visit) {
        connect();
        const id = visit.id || Date.now();
        stmts.insertVisit.run({
            id,
            child_id: Number(childId),
            date: visit.date || null,
            doctor_name: visit.doctorName || null,
            reason: visit.reason || null,
            summary: visit.summary || null,
            description: visit.description || null
        });
        return { ...visit, id };
    },
    remove(childId, visitId) {
        connect();
        const info = stmts.deleteVisit.run(Number(childId), Number(visitId));
        return info.changes > 0;
    }
};

const documents = {
    list(childId) {
        connect();
        return stmts.listDocuments.all(Number(childId)).map(rowToDocument);
    },
    create(childId, doc) {
        connect();
        const id = doc.id || Date.now();
        stmts.insertDocument.run({
            id,
            child_id: Number(childId),
            title: doc.title || null,
            date: doc.date || null,
            url: doc.url || doc.filePath || null,
            uploaded_at: doc.uploadedAt || null
        });
        return { ...doc, id, filePath: doc.url || doc.filePath };
    },
    remove(childId, docId) {
        connect();
        const info = stmts.deleteDocument.run(Number(childId), Number(docId));
        return info.changes > 0;
    }
};

const checkups = {
    list(childId) {
        connect();
        return stmts.listCheckups.all(Number(childId)).map(rowToCheckup);
    },
    create(childId, checkup) {
        connect();
        const id = checkup.id || Date.now();
        stmts.insertCheckup.run({
            id,
            child_id: Number(childId),
            title: checkup.title || null,
            date: checkup.date || null,
            parameters: toJson(checkup.parameters),
            file_url: checkup.fileUrl || null
        });
        return { ...checkup, id };
    },
    remove(childId, checkupId) {
        connect();
        const info = stmts.deleteCheckup.run(Number(childId), Number(checkupId));
        return info.changes > 0;
    }
};

const reminders = {
    list(childId) {
        connect();
        return stmts.listReminders.all(Number(childId)).map(rowToReminder);
    },
    create(childId, reminder) {
        connect();
        stmts.insertReminder.run({
            id: String(reminder.id),
            child_id: Number(childId),
            title: reminder.title || null,
            message: reminder.message || null,
            description: reminder.description || null,
            date: reminder.date || null,
            alarm_at: reminder.alarmAt || null,
            type: reminder.type || null,
            source: reminder.source || null,
            category: reminder.category || null,
            link: reminder.link || null,
            extra: null
        });
        return reminder;
    },
    remove(childId, reminderId) {
        connect();
        const info = stmts.deleteReminder.run(Number(childId), String(reminderId));
        return info.changes > 0;
    }
};

const userReminders = {
    list(userId) {
        connect();
        return stmts.listUserReminders.all(Number(userId)).map(rowToUserReminder);
    },
    create(userId, reminder) {
        connect();
        stmts.insertUserReminder.run({
            id: String(reminder.id),
            user_id: Number(userId),
            title: reminder.title || null,
            description: reminder.description || null,
            alarm_at: reminder.alarmAt || null,
            created_at: reminder.createdAt || null,
            notified: asBoolInt(reminder.notified),
            type: reminder.type || null,
            source: reminder.source || null,
            extra: null
        });
        return reminder;
    },
    update(userId, reminderId, patch) {
        connect();
        const current = stmts.getUserReminder.get(Number(userId), String(reminderId));
        if (!current) return null;
        const next = { ...rowToUserReminder(current), ...patch };
        db.prepare(`
            UPDATE user_reminders SET
                title = @title,
                description = @description,
                alarm_at = @alarm_at,
                notified = @notified
            WHERE user_id = @user_id AND id = @id
        `).run({
            user_id: Number(userId),
            id: String(reminderId),
            title: next.title || null,
            description: next.description || null,
            alarm_at: next.alarmAt || null,
            notified: asBoolInt(next.notified)
        });
        return next;
    },
    remove(userId, reminderId) {
        connect();
        const info = stmts.deleteUserReminder.run(Number(userId), String(reminderId));
        return info.changes > 0;
    }
};

function messageFromRows(row, recipients) {
    return {
        id: row.id,
        title: row.title,
        body: row.body,
        link: row.link,
        imageUrl: row.image_url,
        type: row.type || 'admin',
        isBulk: asBool(row.is_bulk),
        createdAt: row.created_at,
        createdBy: row.created_by,
        recipientIds: recipients.map((r) => r.user_id),
        readBy: recipients.filter((r) => r.is_read).map((r) => r.user_id)
    };
}

const messages = {
    getById(id) {
        connect();
        const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(id));
        if (!row) return null;
        const recipients = db.prepare(
            'SELECT user_id, is_read FROM message_recipients WHERE message_id = ?'
        ).all(Number(id));
        return messageFromRows(row, recipients);
    },
    listAll() {
        connect();
        const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC').all();
        return rows.map((row) => {
            const recipients = db.prepare(
                'SELECT user_id, is_read FROM message_recipients WHERE message_id = ?'
            ).all(row.id);
            return messageFromRows(row, recipients);
        });
    },
    listForUser(userId) {
        connect();
        const rows = db.prepare(`
            SELECT m.*, r.is_read
            FROM messages m
            JOIN message_recipients r ON r.message_id = m.id
            WHERE r.user_id = ?
            ORDER BY m.created_at DESC, m.id DESC
        `).all(Number(userId));
        return rows.map((row) => ({
            id: row.id,
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
    unreadCount(userId) {
        connect();
        return db.prepare(
            'SELECT COUNT(*) AS n FROM message_recipients WHERE user_id = ? AND is_read = 0'
        ).get(Number(userId)).n;
    },
    markRead(id, userId) {
        connect();
        const info = db.prepare(`
            UPDATE message_recipients SET is_read = 1
            WHERE message_id = ? AND user_id = ?
        `).run(Number(id), Number(userId));
        return info.changes > 0;
    },
    removeRecipient(id, userId) {
        connect();
        const info = db.prepare(
            'DELETE FROM message_recipients WHERE message_id = ? AND user_id = ?'
        ).run(Number(id), Number(userId));
        if (info.changes === 0) return false;
        const remaining = db.prepare(
            'SELECT COUNT(*) AS n FROM message_recipients WHERE message_id = ?'
        ).get(Number(id)).n;
        if (remaining === 0) {
            db.prepare('DELETE FROM messages WHERE id = ?').run(Number(id));
        }
        return true;
    },
    create(message) {
        connect();
        const created = db.transaction(() => {
            const info = db.prepare(`
                INSERT INTO messages (title, body, link, image_url, type, is_bulk, created_at, created_by)
                VALUES (@title, @body, @link, @image_url, @type, @is_bulk, @created_at, @created_by)
            `).run({
                title: message.title,
                body: message.body || '',
                link: message.link || null,
                image_url: message.imageUrl || null,
                type: message.type || 'admin',
                is_bulk: asBoolInt(message.isBulk),
                created_at: message.createdAt || new Date().toISOString(),
                created_by: message.createdBy || null
            });
            const id = Number(info.lastInsertRowid);
            const insertRecipient = db.prepare(`
                INSERT INTO message_recipients (message_id, user_id, is_read) VALUES (?, ?, 0)
            `);
            for (const userId of message.recipientIds || []) {
                insertRecipient.run(id, Number(userId));
            }
            return id;
        })();
        return messages.getById(created);
    },
    remove(id) {
        connect();
        const info = db.prepare('DELETE FROM messages WHERE id = ?').run(Number(id));
        return info.changes > 0;
    }
};

const banners = {
    list() {
        connect();
        const cached = cacheGet('banners');
        if (cached) return cached;
        return cacheSet('banners', stmts.listBanners.all().map(rowToBanner));
    },
    count() {
        connect();
        return stmts.countBanners.get().n;
    },
    create(banner) {
        connect();
        const id = banner.id || Date.now();
        stmts.insertBanner.run({
            id,
            title: banner.title || null,
            link: banner.link || null,
            image_url: banner.imageUrl || null
        });
        cacheInvalidate('banners');
        return { ...banner, id };
    },
    update(id, patch) {
        connect();
        const current = banners.list().find((item) => Number(item.id) === Number(id));
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        db.prepare(`
            UPDATE banners SET title = @title, link = @link, image_url = @image_url
            WHERE id = @id
        `).run({
            id: Number(id),
            title: next.title || null,
            link: next.link || null,
            image_url: next.imageUrl || null
        });
        cacheInvalidate('banners');
        return next;
    },
    remove(id) {
        connect();
        const info = stmts.deleteBanner.run(Number(id));
        cacheInvalidate('banners');
        return info.changes > 0;
    }
};

const news = {
    list() {
        connect();
        const cached = cacheGet('news');
        if (cached) return cached;
        return cacheSet('news', stmts.listNews.all().map(rowToNews));
    },
    getById(id) {
        connect();
        const row = stmts.getNews.get(Number(id));
        return row ? rowToNews(row) : null;
    },
    count() {
        connect();
        return stmts.countNews.get().n;
    },
    create(item) {
        connect();
        const id = item.id || Date.now();
        stmts.insertNews.run({
            id,
            title: item.title || null,
            summary: item.summary || null,
            content: item.content || null,
            category: item.category || null,
            image_url: item.imageUrl || null,
            created_at: item.createdAt || new Date().toISOString(),
            updated_at: item.updatedAt || null
        });
        cacheInvalidate('news');
        return { ...item, id };
    },
    update(id, item) {
        connect();
        const current = news.getById(id);
        if (!current) return null;
        const next = { ...current, ...item, id: Number(id) };
        db.prepare(`
            UPDATE news SET
                title = @title,
                summary = @summary,
                content = @content,
                category = @category,
                image_url = @image_url,
                updated_at = @updated_at
            WHERE id = @id
        `).run({
            id: Number(id),
            title: next.title || null,
            summary: next.summary || null,
            content: next.content || null,
            category: next.category || null,
            image_url: next.imageUrl || null,
            updated_at: next.updatedAt || new Date().toISOString()
        });
        cacheInvalidate('news');
        return news.getById(id);
    },
    remove(id) {
        connect();
        const info = stmts.deleteNews.run(Number(id));
        cacheInvalidate('news');
        return info.changes > 0;
    }
};

const videos = {
    list() {
        connect();
        const cached = cacheGet('videos');
        if (cached) return cached;
        return cacheSet('videos', stmts.listVideos.all().map(rowToVideo));
    },
    getById(id) {
        connect();
        const row = stmts.getVideo.get(Number(id));
        return row ? rowToVideo(row) : null;
    },
    create(item) {
        connect();
        const id = item.id || Date.now();
        stmts.insertVideo.run({
            id,
            title: item.title || null,
            summary: item.summary || null,
            url: item.url || null,
            thumbnail_url: item.thumbnailUrl || null,
            created_at: item.createdAt || new Date().toISOString()
        });
        cacheInvalidate('videos');
        return { ...item, id };
    },
    update(id, patch) {
        connect();
        const current = videos.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        db.prepare(`
            UPDATE videos SET title = @title, summary = @summary, url = @url, thumbnail_url = @thumbnail_url
            WHERE id = @id
        `).run({
            id: Number(id),
            title: next.title || null,
            summary: next.summary || null,
            url: next.url || null,
            thumbnail_url: next.thumbnailUrl || null
        });
        cacheInvalidate('videos');
        return videos.getById(id);
    },
    remove(id) {
        connect();
        const row = stmts.getVideo.get(Number(id));
        if (!row) return null;
        stmts.deleteVideo.run(Number(id));
        cacheInvalidate('videos');
        return rowToVideo(row);
    }
};

const podcasts = {
    list() {
        connect();
        const cached = cacheGet('podcasts');
        if (cached) return cached;
        return cacheSet('podcasts', stmts.listPodcasts.all().map(rowToPodcast));
    },
    getById(id) {
        connect();
        const row = stmts.getPodcast.get(Number(id));
        return row ? rowToPodcast(row) : null;
    },
    create(item) {
        connect();
        const id = item.id || Date.now();
        stmts.insertPodcast.run({
            id,
            title: item.title || null,
            summary: item.summary || null,
            url: item.url || null,
            thumbnail_url: item.thumbnailUrl || null,
            duration: item.duration || null,
            created_at: item.createdAt || new Date().toISOString()
        });
        cacheInvalidate('podcasts');
        return podcasts.getById(id);
    },
    update(id, patch) {
        connect();
        const current = podcasts.getById(id);
        if (!current) return null;
        const next = { ...current, ...patch, id: Number(id) };
        db.prepare(`
            UPDATE podcasts SET
                title = @title,
                summary = @summary,
                url = @url,
                thumbnail_url = @thumbnail_url,
                duration = @duration
            WHERE id = @id
        `).run({
            id: Number(id),
            title: next.title || null,
            summary: next.summary || null,
            url: next.url || null,
            thumbnail_url: next.thumbnailUrl || null,
            duration: next.duration || null
        });
        cacheInvalidate('podcasts');
        return podcasts.getById(id);
    },
    remove(id) {
        connect();
        const row = stmts.getPodcast.get(Number(id));
        if (!row) return null;
        stmts.deletePodcast.run(Number(id));
        cacheInvalidate('podcasts');
        return rowToPodcast(row);
    }
};

function rowToTicket(row) {
    const payload = parseJson(row.payload, {});
    return {
        ...payload,
        id: row.id,
        userId: row.user_id,
        status: row.status,
        subject: payload.subject || row.subject || '',
        content: payload.content || payload.message || '',
        replies: payload.replies || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

const tickets = {
    list() {
        connect();
        return stmts.listTickets.all().map(rowToTicket);
    },
    listByUser(userId) {
        connect();
        return stmts.listTicketsByUser.all(Number(userId)).map(rowToTicket);
    },
    getById(id) {
        connect();
        const row = stmts.getTicket.get(Number(id));
        return row ? rowToTicket(row) : null;
    },
    create({ userId, subject, content }) {
        connect();
        const createdAt = new Date().toISOString();
        const payload = {
            subject: String(subject || '').trim(),
            content: String(content || '').trim(),
            replies: []
        };
        const info = stmts.insertTicket.run({
            user_id: Number(userId),
            status: 'open',
            created_at: createdAt,
            updated_at: createdAt,
            payload: JSON.stringify(payload)
        });
        return tickets.getById(Number(info.lastInsertRowid));
    },
    count() {
        connect();
        return stmts.countTickets.get().n;
    },
    countOpen() {
        connect();
        return stmts.countOpenTickets.get().n;
    },
    update(id, ticket) {
        connect();
        const info = db.prepare(`
            UPDATE tickets SET status = @status, updated_at = @updated_at, payload = @payload
            WHERE id = @id
        `).run({
            id: Number(id),
            status: ticket.status || 'open',
            updated_at: ticket.updatedAt || new Date().toISOString(),
            payload: JSON.stringify(ticket)
        });
        return info.changes > 0 ? tickets.getById(id) : null;
    }
};

const products = {
    getById(id) {
        connect();
        const row = stmts.getProduct.get(Number(id));
        return row ? rowToProduct(row) : null;
    },
    listAll() {
        connect();
        return stmts.listAllProducts.all().map(rowToProduct);
    },
    listActive({ category, q } = {}) {
        connect();
        let sql = 'SELECT * FROM products WHERE active = 1';
        const params = [];
        if (category && category !== 'همه') {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (q && String(q).trim()) {
            sql += ' AND (lower(name) LIKE ? OR lower(description) LIKE ?)';
            const term = `%${String(q).trim().toLowerCase()}%`;
            params.push(term, term);
        }
        sql += ' ORDER BY id DESC';
        return db.prepare(sql).all(...params).map(rowToProduct);
    },
    count() {
        connect();
        return stmts.countProducts.get().n;
    },
    create(product) {
        connect();
        const info = stmts.insertProductAuto.run({
            name: product.name,
            description: product.description || '',
            category: product.category || null,
            price: product.price,
            stock: product.stock || 0,
            image_url: product.imageUrl || null,
            active: asBoolInt(product.active !== false),
            created_at: product.createdAt || new Date().toISOString(),
            updated_at: product.updatedAt || null
        });
        cacheInvalidate('products');
        return products.getById(Number(info.lastInsertRowid));
    },
    update(id, product) {
        connect();
        const current = products.getById(id);
        if (!current) return null;
        const next = { ...current, ...product, id: Number(id) };
        db.prepare(`
            UPDATE products SET
                name = @name,
                description = @description,
                category = @category,
                price = @price,
                stock = @stock,
                image_url = @image_url,
                active = @active,
                updated_at = @updated_at
            WHERE id = @id
        `).run({
            id: Number(id),
            name: next.name,
            description: next.description || '',
            category: next.category || null,
            price: next.price,
            stock: next.stock,
            image_url: next.imageUrl || null,
            active: asBoolInt(next.active !== false),
            updated_at: next.updatedAt || new Date().toISOString()
        });
        cacheInvalidate('products');
        return products.getById(id);
    },
    remove(id) {
        connect();
        const info = stmts.deleteProduct.run(Number(id));
        cacheInvalidate('products');
        return info.changes > 0;
    }
};

const orders = {
    getById(id) {
        connect();
        const row = stmts.getOrder.get(Number(id));
        if (!row) return null;
        return hydrateOrders([row])[0];
    },
    listByUser(userId) {
        connect();
        return hydrateOrders(stmts.listOrdersByUser.all(Number(userId)));
    },
    listAll() {
        connect();
        return hydrateOrders(stmts.listAllOrders.all());
    },
    count() {
        connect();
        return stmts.countOrders.get().n;
    },
    countPending() {
        connect();
        return stmts.countPendingOrders.get().n;
    },
    create({ userId, items, total, shippingAddress, phone, notes }) {
        connect();
        return db.transaction(() => {
            for (const item of items) {
                const product = stmts.getProduct.get(item.productId);
                if (!product || !asBool(product.active)) {
                    const err = new Error(`product-missing:${item.productId}`);
                    err.code = 'PRODUCT_MISSING';
                    throw err;
                }
                if (product.stock < item.quantity) {
                    const err = new Error(product.name);
                    err.code = 'OUT_OF_STOCK';
                    throw err;
                }
            }
            for (const item of items) {
                stmts.adjustStock.run(-item.quantity, item.productId);
            }
            const createdAt = new Date().toISOString();
            const info = stmts.insertOrder.run({
                user_id: Number(userId),
                total,
                shipping_address: shippingAddress,
                phone,
                notes: notes || '',
                status: 'pending',
                created_at: createdAt,
                updated_at: null
            });
            const orderId = Number(info.lastInsertRowid);
            for (const item of items) {
                stmts.insertOrderItem.run({
                    order_id: orderId,
                    product_id: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    line_total: item.lineTotal
                });
            }
            return orders.getById(orderId);
        })();
    },
    updateStatus(id, status) {
        connect();
        return db.transaction(() => {
            const current = orders.getById(id);
            if (!current) return null;
            if (status === 'cancelled' && current.status !== 'cancelled') {
                for (const item of current.items || []) {
                    if (item.productId) stmts.adjustStock.run(item.quantity, item.productId);
                }
            }
            stmts.updateOrderStatus.run({
                id: Number(id),
                status,
                updated_at: new Date().toISOString()
            });
            return orders.getById(id);
        })();
    }
};

const otp = {
    get(phone) {
        connect();
        const row = stmts.getOtp.get(phone);
        if (!row) return null;
        return {
            code: row.code,
            purpose: row.purpose,
            expiresAt: row.expires_at,
            sentAt: row.sent_at,
            attempts: row.attempts
        };
    },
    set(phone, entry) {
        connect();
        stmts.upsertOtp.run({
            phone,
            code: entry.code,
            purpose: entry.purpose,
            expires_at: entry.expiresAt,
            sent_at: entry.sentAt,
            attempts: entry.attempts || 0
        });
    },
    remove(phone) {
        connect();
        stmts.deleteOtp.run(phone);
    }
};

function normalizeState(raw = {}) {
    const base = emptyState();
    const usersMap = raw.users || {};
    const userKeys = Object.keys(usersMap).map(Number).filter((k) => !Number.isNaN(k));
    const childrenList = (raw.children || []).map((child) => ({
        ...child,
        vaccinationRecords: child.vaccinationRecords || {}
    }));
    const messagesList = raw.messages || [];
    const productsList = raw.products || [];
    const ordersList = raw.orders || [];

    return {
        ...base,
        ...raw,
        users: usersMap,
        children: childrenList,
        growthData: raw.growthData || {},
        medicalVisits: raw.medicalVisits || {},
        medicalDocuments: raw.medicalDocuments || {},
        checkups: raw.checkups || {},
        reminders: raw.reminders || {},
        userReminders: raw.userReminders || {},
        messages: messagesList,
        banners: raw.banners || [],
        articles: raw.articles || [],
        news: raw.news || [],
        tickets: raw.tickets || [],
        videos: raw.videos || [],
        podcasts: raw.podcasts || [],
        products: productsList,
        orders: ordersList,
        childIdCounter: raw.childIdCounter || 1,
        userIdCounter: raw.userIdCounter || (userKeys.length ? Math.max(...userKeys) + 1 : 1),
        messageIdCounter:
            raw.messageIdCounter ||
            (messagesList.length ? Math.max(...messagesList.map((m) => m.id || 0)) + 1 : 1),
        productIdCounter:
            raw.productIdCounter ||
            (productsList.length ? Math.max(...productsList.map((p) => p.id || 0)) + 1 : 1),
        orderIdCounter:
            raw.orderIdCounter ||
            (ordersList.length ? Math.max(...ordersList.map((o) => o.id || 0)) + 1 : 1)
    };
}

function migrateFromJson(jsonPath) {
    connect();
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    const userCount = stmts.countUsers.get().n;
    if (userCount > 0 && process.env.FORCE_MIGRATE !== '1') {
        console.log('SQLite already has relational data. Set FORCE_MIGRATE=1 to overwrite from db.json');
        return false;
    }
    if (process.env.FORCE_MIGRATE === '1' && userCount > 0) {
        db.exec(`
            DELETE FROM order_items;
            DELETE FROM orders;
            DELETE FROM products;
            DELETE FROM message_recipients;
            DELETE FROM messages;
            DELETE FROM vaccination_records;
            DELETE FROM growth_records;
            DELETE FROM medical_visits;
            DELETE FROM medical_documents;
            DELETE FROM checkups;
            DELETE FROM reminders;
            DELETE FROM user_reminders;
            DELETE FROM children;
            DELETE FROM users;
            DELETE FROM banners;
            DELETE FROM news;
            DELETE FROM videos;
            DELETE FROM podcasts;
            DELETE FROM tickets;
        `);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    importState(raw);
    setSchemaVersion(SCHEMA_VERSION);
    console.log(`Migrated ${jsonPath} -> relational SQLite "${DB_FILE}"`);
    return true;
}

function stats() {
    connect();
    return {
        totalUsers: users.count(),
        totalChildren: children.count(),
        totalBanners: banners.count(),
        totalArticles: news.count(),
        totalTickets: tickets.count(),
        openTickets: tickets.countOpen(),
        totalProducts: products.count(),
        totalOrders: orders.count(),
        pendingOrders: orders.countPending()
    };
}

module.exports = {
    connect,
    close,
    ping,
    health,
    stats,
    migrateFromJson,
    emptyState,
    normalizeState,
    DB_FILE,
    SCHEMA_VERSION,
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
    orders,
    otp,
    normalizePhone
};
