const fs = require('fs');
const path = require('path');
const { SqliteDatabase } = require('./sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'roshdyar.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;
let initPromise;

async function initDb() {
    if (db) return db;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const sqlite = new SqliteDatabase(DB_PATH);
        await sqlite.open();
        sqlite.exec('PRAGMA foreign_keys = ON;');
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        sqlite.exec(schema);
        db = sqlite;
        return db;
    })();

    return initPromise;
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call await initDb() before using the database.');
    }
    return db;
}

function parseJsonField(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function stringifyJsonField(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

function mapUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        isAdmin: !!row.is_admin,
        ...(row.first_name != null && { firstName: row.first_name }),
        ...(row.last_name != null && { lastName: row.last_name }),
        ...(row.birth_date != null && { birthDate: row.birth_date }),
        ...(row.province != null && { province: row.province }),
        ...(row.city != null && { city: row.city }),
        ...(row.mobile != null && { mobile: row.mobile }),
    };
}

function mapChild(row, vaccinationRecords = {}) {
    if (!row) return null;
    const child = {
        id: row.id,
        userId: row.user_id,
        name: row.name || null,
        firstName: row.first_name || null,
        lastName: row.last_name || null,
        gender: row.gender || null,
        birthDate: row.birth_date || null,
        avatar: row.avatar || null,
        height: row.height || null,
        weight: row.weight || null,
        bloodType: row.blood_type || null,
        allergies: parseJsonField(row.allergies, ''),
        special_illnesses: parseJsonField(row.special_illnesses, ''),
        nationalId: row.national_id || null,
        fatherName: row.father_name || null,
        birthWeight: row.birth_weight ?? null,
        birthHeight: row.birth_height ?? null,
        birthHeadCircumference: row.birth_head_circumference ?? null,
        birthType: row.birth_type || null,
        gestationalAge: row.gestational_age ?? null,
        birthPlace: row.birth_place || null,
        apgar1: row.apgar1 ?? null,
        apgar5: row.apgar5 ?? null,
        vaccinationRecords,
    };
    const documents = parseJsonField(row.documents, null);
    if (documents) child.documents = documents;
    const vaccineReminder = parseJsonField(row.vaccine_reminder, null);
    if (vaccineReminder != null) child.vaccineReminder = vaccineReminder;
    return child;
}

function mapGrowth(row) {
    return {
        date: row.recorded_on,
        ...(row.height != null && { height: row.height }),
        ...(row.weight != null && { weight: row.weight }),
        ...(row.head_circumference != null && { headCircumference: row.head_circumference }),
    };
}

function mapVisit(row) {
    return {
        id: row.id,
        date: row.visit_date,
        doctorName: row.doctor_name,
        reason: row.reason,
        summary: row.summary,
    };
}

function mapDocument(row) {
    return {
        id: row.id,
        title: row.title,
        url: row.file_path,
        filePath: row.file_path,
        uploadedAt: row.uploaded_at,
    };
}

function mapCheckup(row, parameters = []) {
    return {
        id: row.id,
        title: row.title,
        date: row.checkup_date,
        parameters,
        fileUrl: row.file_url,
    };
}

function mapReminder(row) {
    return {
        id: row.id,
        title: row.title,
        ...(row.message != null && { message: row.message }),
        ...(row.remind_on != null && { date: row.remind_on }),
        type: row.type || 'info',
        source: row.source || 'manual',
        ...(row.link != null && { link: row.link }),
    };
}

function mapBanner(row) {
    return { id: row.id, title: row.title, link: row.link, imageUrl: row.image_url };
}

function mapNews(row) {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        content: row.content,
        category: row.category,
        imageUrl: row.image_url,
        createdAt: row.created_at,
        ...(row.updated_at && { updatedAt: row.updated_at }),
    };
}

function mapVideo(row) {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at,
    };
}

function mapPodcast(row) {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        createdAt: row.created_at,
    };
}

// --- Users ---
function findUserByLogin(login) {
    const row = getDb().prepare(
        'SELECT * FROM users WHERE username = ? OR email = ?'
    ).get(login, login);
    return mapUser(row);
}

function findUserById(id) {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    return mapUser(row);
}

function findUserByUsernameOrEmail(login) {
    return findUserByLogin(login);
}

function listUsers() {
    return getDb().prepare('SELECT * FROM users ORDER BY id').all().map(mapUser);
}

function createUser({ username, email, password, isAdmin = false }) {
    const result = getDb().prepare(
        'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)'
    ).run(username, email, password, isAdmin ? 1 : 0);
    return findUserById(result.lastInsertRowid);
}

function updateUserProfile(id, fields) {
    const allowed = {
        firstName: 'first_name',
        lastName: 'last_name',
        birthDate: 'birth_date',
        province: 'province',
        city: 'city',
        mobile: 'mobile',
        email: 'email',
        username: 'username',
        isAdmin: 'is_admin',
    };
    const sets = [];
    const values = [];
    for (const [key, col] of Object.entries(allowed)) {
        if (fields[key] !== undefined) {
            sets.push(`${col} = ?`);
            values.push(key === 'isAdmin' ? (fields[key] ? 1 : 0) : fields[key]);
        }
    }
    if (!sets.length) return findUserById(id);
    values.push(Number(id));
    getDb().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return findUserById(id);
}

function updateUserPassword(id, password) {
    getDb().prepare('UPDATE users SET password = ? WHERE id = ?').run(password, Number(id));
}

function deleteUser(id) {
    getDb().prepare('DELETE FROM users WHERE id = ?').run(Number(id));
}

function countUsers() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

// --- Vaccination helpers ---
function getVaccinationRecordsMap(childId) {
    const rows = getDb().prepare(
        'SELECT age_months, vaccine_name, administered_on FROM vaccination_records WHERE child_id = ?'
    ).all(Number(childId));
    const map = {};
    for (const row of rows) {
        const age = String(row.age_months);
        if (!map[age]) map[age] = {};
        map[age][row.vaccine_name] = row.administered_on || true;
    }
    return map;
}

function replaceVaccinationRecords(childId, vaccinationRecords) {
    const database = getDb();
    const replace = database.transaction((records) => {
        database.prepare('DELETE FROM vaccination_records WHERE child_id = ?').run(Number(childId));
        const insert = database.prepare(
            'INSERT INTO vaccination_records (child_id, age_months, vaccine_name, administered_on) VALUES (?, ?, ?, ?)'
        );
        if (!records || typeof records !== 'object') return;
        for (const [age, vaccines] of Object.entries(records)) {
            if (!vaccines || typeof vaccines !== 'object') continue;
            for (const [vaccineName, value] of Object.entries(vaccines)) {
                const administeredOn = typeof value === 'string' ? value : null;
                insert.run(Number(childId), Number(age), vaccineName, administeredOn);
            }
        }
    });
    replace(vaccinationRecords);
}

function upsertVaccinationRecord(childId, ageMonths, vaccineName, administeredOn) {
    getDb().prepare(`
        INSERT INTO vaccination_records (child_id, age_months, vaccine_name, administered_on)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(child_id, age_months, vaccine_name)
        DO UPDATE SET administered_on = excluded.administered_on
    `).run(Number(childId), Number(ageMonths), vaccineName, administeredOn);
}

// --- Children ---
function getChildById(id) {
    const row = getDb().prepare('SELECT * FROM children WHERE id = ?').get(Number(id));
    if (!row) return null;
    return mapChild(row, getVaccinationRecordsMap(id));
}

function getChildrenByUserId(userId) {
    const rows = getDb().prepare('SELECT * FROM children WHERE user_id = ? ORDER BY id').all(Number(userId));
    return rows.map((row) => mapChild(row, getVaccinationRecordsMap(row.id)));
}

function countChildren() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM children').get().c;
}

function createChild(childData) {
    const database = getDb();
    const insert = database.prepare(`
        INSERT INTO children (
            user_id, name, first_name, last_name, gender, birth_date, avatar,
            height, weight, blood_type, allergies, special_illnesses,
            national_id, father_name, birth_weight, birth_height, birth_head_circumference,
            birth_type, gestational_age, birth_place, apgar1, apgar5, documents, vaccine_reminder
        ) VALUES (
            @user_id, @name, @first_name, @last_name, @gender, @birth_date, @avatar,
            @height, @weight, @blood_type, @allergies, @special_illnesses,
            @national_id, @father_name, @birth_weight, @birth_height, @birth_head_circumference,
            @birth_type, @gestational_age, @birth_place, @apgar1, @apgar5, @documents, @vaccine_reminder
        )
    `);

    const params = {
        user_id: Number(childData.userId),
        name: childData.name || null,
        first_name: childData.firstName || null,
        last_name: childData.lastName || null,
        gender: childData.gender || null,
        birth_date: childData.birthDate || null,
        avatar: childData.avatar || null,
        height: childData.height != null ? String(childData.height) : null,
        weight: childData.weight != null ? String(childData.weight) : null,
        blood_type: childData.bloodType || null,
        allergies: stringifyJsonField(childData.allergies ?? ''),
        special_illnesses: stringifyJsonField(childData.special_illnesses ?? ''),
        national_id: childData.nationalId || null,
        father_name: childData.fatherName || null,
        birth_weight: childData.birthWeight ?? null,
        birth_height: childData.birthHeight ?? null,
        birth_head_circumference: childData.birthHeadCircumference ?? null,
        birth_type: childData.birthType || null,
        gestational_age: childData.gestationalAge ?? null,
        birth_place: childData.birthPlace || null,
        apgar1: childData.apgar1 ?? null,
        apgar5: childData.apgar5 ?? null,
        documents: stringifyJsonField(childData.documents) ?? null,
        vaccine_reminder: stringifyJsonField(childData.vaccineReminder) ?? null,
    };

    const result = insert.run(params);
    const childId = Number(result.lastInsertRowid);
    if (childData.vaccinationRecords) {
        replaceVaccinationRecords(childId, childData.vaccinationRecords);
    }
    return getChildById(childId);
}

function updateChild(id, updatedData) {
    const existing = getChildById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updatedData, id: existing.id, userId: updatedData.userId ?? existing.userId };
    delete merged.growthData;
    delete merged.vaccinationRecords;

    getDb().prepare(`
        UPDATE children SET
            user_id = @user_id,
            name = @name,
            first_name = @first_name,
            last_name = @last_name,
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
            documents = @documents,
            vaccine_reminder = @vaccine_reminder
        WHERE id = @id
    `).run({
        id: Number(id),
        user_id: Number(merged.userId),
        name: merged.name || null,
        first_name: merged.firstName || null,
        last_name: merged.lastName || null,
        gender: merged.gender || null,
        birth_date: merged.birthDate || null,
        avatar: merged.avatar || null,
        height: merged.height != null ? String(merged.height) : null,
        weight: merged.weight != null ? String(merged.weight) : null,
        blood_type: merged.bloodType || null,
        allergies: stringifyJsonField(merged.allergies ?? ''),
        special_illnesses: stringifyJsonField(merged.special_illnesses ?? ''),
        national_id: merged.nationalId || null,
        father_name: merged.fatherName || null,
        birth_weight: merged.birthWeight ?? null,
        birth_height: merged.birthHeight ?? null,
        birth_head_circumference: merged.birthHeadCircumference ?? null,
        birth_type: merged.birthType || null,
        gestational_age: merged.gestationalAge ?? null,
        birth_place: merged.birthPlace || null,
        apgar1: merged.apgar1 ?? null,
        apgar5: merged.apgar5 ?? null,
        documents: stringifyJsonField(merged.documents) ?? null,
        vaccine_reminder: stringifyJsonField(merged.vaccineReminder) ?? null,
    });

    if (updatedData.vaccinationRecords !== undefined) {
        replaceVaccinationRecords(id, updatedData.vaccinationRecords);
    }
    return getChildById(id);
}

function updateChildAvatar(id, avatarPath) {
    getDb().prepare('UPDATE children SET avatar = ? WHERE id = ?').run(avatarPath, Number(id));
    return getChildById(id);
}

function deleteChild(id) {
    const result = getDb().prepare('DELETE FROM children WHERE id = ?').run(Number(id));
    return result.changes > 0;
}

// --- Growth ---
function getGrowthRecords(childId) {
    return getDb().prepare(
        "SELECT * FROM growth_records WHERE child_id = ? ORDER BY date(replace(recorded_on, '/', '-'))"
    ).all(Number(childId)).map(mapGrowth);
}

function addGrowthRecord(childId, { date, height, weight, headCircumference }) {
    getDb().prepare(`
        INSERT INTO growth_records (child_id, recorded_on, height, weight, head_circumference)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        Number(childId),
        date,
        height !== undefined && height !== '' && height != null ? Number(height) : null,
        weight !== undefined && weight !== '' && weight != null ? Number(weight) : null,
        headCircumference !== undefined && headCircumference !== '' && headCircumference != null
            ? Number(headCircumference)
            : null
    );
    return {
        date,
        ...(height !== undefined && height !== '' && height != null && { height: Number(height) }),
        ...(weight !== undefined && weight !== '' && weight != null && { weight: Number(weight) }),
        ...(headCircumference !== undefined && headCircumference !== '' && headCircumference != null
            && { headCircumference: Number(headCircumference) }),
    };
}

function deleteGrowthRecord(childId, date) {
    const result = getDb().prepare(
        'DELETE FROM growth_records WHERE child_id = ? AND recorded_on = ?'
    ).run(Number(childId), date);
    return result.changes > 0;
}

// --- Visits ---
function getVisits(childId) {
    return getDb().prepare(
        "SELECT * FROM medical_visits WHERE child_id = ? ORDER BY date(replace(visit_date, '/', '-')) DESC"
    ).all(Number(childId)).map(mapVisit);
}

function addVisit(childId, { date, doctorName, reason, summary }) {
    const id = Date.now();
    getDb().prepare(`
        INSERT INTO medical_visits (id, child_id, visit_date, doctor_name, reason, summary)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, Number(childId), date, doctorName, reason, summary || null);
    return { id, date, doctorName, reason, summary };
}

// --- Documents ---
function getDocuments(childId) {
    return getDb().prepare(
        'SELECT * FROM medical_documents WHERE child_id = ? ORDER BY uploaded_at DESC'
    ).all(Number(childId)).map(mapDocument);
}

function addDocument(childId, { title, filePath, uploadedAt }) {
    const id = Date.now();
    getDb().prepare(`
        INSERT INTO medical_documents (id, child_id, title, file_path, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, Number(childId), title, filePath, uploadedAt);
    return mapDocument({
        id,
        title,
        file_path: filePath,
        uploaded_at: uploadedAt,
    });
}

// --- Checkups ---
function getCheckups(childId) {
    const database = getDb();
    const rows = database.prepare(
        "SELECT * FROM checkups WHERE child_id = ? ORDER BY date(replace(checkup_date, '/', '-')) DESC"
    ).all(Number(childId));
    const paramStmt = database.prepare(
        'SELECT name, value, unit FROM checkup_parameters WHERE checkup_id = ? ORDER BY id'
    );
    return rows.map((row) => mapCheckup(row, paramStmt.all(row.id).map((p) => ({
        name: p.name,
        value: p.value,
        unit: p.unit,
    }))));
}

function addCheckup(childId, { title, date, parameters, fileUrl }) {
    const database = getDb();
    const id = Date.now();
    const insert = database.transaction(() => {
        database.prepare(`
            INSERT INTO checkups (id, child_id, title, checkup_date, file_url)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, Number(childId), title, date, fileUrl || null);
        const insertParam = database.prepare(
            'INSERT INTO checkup_parameters (checkup_id, name, value, unit) VALUES (?, ?, ?, ?)'
        );
        for (const param of parameters || []) {
            insertParam.run(id, param.name, param.value != null ? String(param.value) : null, param.unit || null);
        }
    });
    insert();
    return { id, title, date, parameters, fileUrl: fileUrl || null };
}

// --- Reminders ---
function getReminders(childId) {
    return getDb().prepare(
        'SELECT * FROM reminders WHERE child_id = ? ORDER BY remind_on'
    ).all(Number(childId)).map(mapReminder);
}

function addReminder(childId, reminder) {
    getDb().prepare(`
        INSERT INTO reminders (id, child_id, title, message, remind_on, type, source, link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        reminder.id,
        Number(childId),
        reminder.title,
        reminder.message || null,
        reminder.date || null,
        reminder.type || 'info',
        reminder.source || 'manual',
        reminder.link || null
    );
    return reminder;
}

function reminderExists(childId, reminderId) {
    return !!getDb().prepare(
        'SELECT 1 FROM reminders WHERE child_id = ? AND id = ?'
    ).get(Number(childId), reminderId);
}

function deleteReminder(childId, reminderId) {
    const result = getDb().prepare(
        'DELETE FROM reminders WHERE child_id = ? AND id = ?'
    ).run(Number(childId), reminderId);
    return result.changes > 0;
}

// --- CMS ---
function listBanners() {
    return getDb().prepare('SELECT * FROM banners ORDER BY id').all().map(mapBanner);
}

function createBanner({ title, link, imageUrl }) {
    const id = Date.now();
    getDb().prepare(
        'INSERT INTO banners (id, title, link, image_url) VALUES (?, ?, ?, ?)'
    ).run(id, title || null, link || null, imageUrl);
    return { id, title, link, imageUrl };
}

function deleteBanner(id) {
    return getDb().prepare('DELETE FROM banners WHERE id = ?').run(Number(id)).changes > 0;
}

function countBanners() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM banners').get().c;
}

function listNews() {
    return getDb().prepare('SELECT * FROM news ORDER BY datetime(created_at) DESC').all().map(mapNews);
}

function getNewsById(id) {
    const row = getDb().prepare('SELECT * FROM news WHERE id = ?').get(Number(id));
    return mapNews(row);
}

function createNews({ title, summary, content, category, imageUrl, createdAt }) {
    const id = Date.now();
    getDb().prepare(`
        INSERT INTO news (id, title, summary, content, category, image_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, summary || null, content || null, category || 'عمومی', imageUrl || null, createdAt);
    return getNewsById(id);
}

function updateNews(id, fields) {
    const existing = getNewsById(id);
    if (!existing) return null;
    getDb().prepare(`
        UPDATE news SET
            title = ?, summary = ?, content = ?, category = ?, image_url = ?, updated_at = ?
        WHERE id = ?
    `).run(
        fields.title,
        fields.summary,
        fields.content,
        fields.category || existing.category,
        fields.imageUrl !== undefined ? fields.imageUrl : existing.imageUrl,
        fields.updatedAt,
        Number(id)
    );
    return getNewsById(id);
}

function deleteNews(id) {
    return getDb().prepare('DELETE FROM news WHERE id = ?').run(Number(id)).changes > 0;
}

function countNews() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM news').get().c;
}

function listVideos() {
    return getDb().prepare('SELECT * FROM videos ORDER BY datetime(created_at) DESC').all().map(mapVideo);
}

function createVideo({ title, url, summary, createdAt }) {
    const id = Date.now();
    getDb().prepare(`
        INSERT INTO videos (id, title, summary, url, thumbnail_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, summary || null, url, null, createdAt);
    return {
        id, title, url, summary, thumbnailUrl: null, createdAt,
    };
}

function deleteVideo(id) {
    return getDb().prepare('DELETE FROM videos WHERE id = ?').run(Number(id)).changes > 0;
}

function listPodcasts() {
    return getDb().prepare('SELECT * FROM podcasts ORDER BY datetime(created_at) DESC').all().map(mapPodcast);
}

// --- Tickets ---
function listTickets() {
    const database = getDb();
    const tickets = database.prepare('SELECT * FROM tickets ORDER BY datetime(created_at) DESC').all();
    const replyStmt = database.prepare(
        'SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY datetime(created_at)'
    );
    return tickets.map((t) => ({
        id: t.id,
        userId: t.user_id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        createdAt: t.created_at,
        ...(t.updated_at && { updatedAt: t.updated_at }),
        replies: replyStmt.all(t.id).map((r) => ({
            userId: r.user_id,
            content: r.content,
            createdAt: r.created_at,
        })),
    }));
}

function getTicketById(id) {
    return listTickets().find((t) => t.id === Number(id)) || null;
}

function updateTicket(id, { status, reply, replyUserId }) {
    const database = getDb();
    const ticket = database.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(id));
    if (!ticket) return null;

    const updatedAt = new Date().toISOString();
    let nextStatus = status || ticket.status;

    const tx = database.transaction(() => {
        if (reply) {
            database.prepare(`
                INSERT INTO ticket_replies (ticket_id, user_id, content, created_at)
                VALUES (?, ?, ?, ?)
            `).run(Number(id), replyUserId != null ? Number(replyUserId) : null, reply, updatedAt);
            nextStatus = 'answered';
        }
        database.prepare(
            'UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?'
        ).run(nextStatus, updatedAt, Number(id));
    });
    tx();
    return getTicketById(id);
}

function countTickets() {
    return getDb().prepare('SELECT COUNT(*) AS c FROM tickets').get().c;
}

function countOpenTickets() {
    return getDb().prepare("SELECT COUNT(*) AS c FROM tickets WHERE status = 'open'").get().c;
}

function isDatabaseSeeded() {
    return countUsers() > 0;
}

module.exports = {
    initDb,
    getDb,
    DB_PATH,
    findUserByLogin,
    findUserById,
    findUserByUsernameOrEmail,
    listUsers,
    createUser,
    updateUserProfile,
    updateUserPassword,
    deleteUser,
    countUsers,
    getChildById,
    getChildrenByUserId,
    countChildren,
    createChild,
    updateChild,
    updateChildAvatar,
    deleteChild,
    getVaccinationRecordsMap,
    replaceVaccinationRecords,
    upsertVaccinationRecord,
    getGrowthRecords,
    addGrowthRecord,
    deleteGrowthRecord,
    getVisits,
    addVisit,
    getDocuments,
    addDocument,
    getCheckups,
    addCheckup,
    getReminders,
    addReminder,
    reminderExists,
    deleteReminder,
    listBanners,
    createBanner,
    deleteBanner,
    countBanners,
    listNews,
    getNewsById,
    createNews,
    updateNews,
    deleteNews,
    countNews,
    listVideos,
    createVideo,
    deleteVideo,
    listPodcasts,
    listTickets,
    getTicketById,
    updateTicket,
    countTickets,
    countOpenTickets,
    isDatabaseSeeded,
    stringifyJsonField,
};
