/**
 * One-time migration: server/db.json → SQLite (server/data/roshdyar.db)
 *
 * Usage:
 *   node db/migrate-from-json.js
 *   node db/migrate-from-json.js --force   # wipe existing SQLite and re-import
 */
const fs = require('fs');
const path = require('path');
const {
    initDb,
    getDb,
    DB_PATH,
    isDatabaseSeeded,
} = require('./database');

const JSON_PATH = path.join(__dirname, '..', 'db.json');

function loadJson() {
    if (!fs.existsSync(JSON_PATH)) {
        throw new Error(`JSON database not found at ${JSON_PATH}`);
    }
    return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}

function wipeDatabase(db) {
    db.exec(`
        PRAGMA foreign_keys = OFF;
        DELETE FROM ticket_replies;
        DELETE FROM tickets;
        DELETE FROM checkup_parameters;
        DELETE FROM checkups;
        DELETE FROM medical_documents;
        DELETE FROM medical_visits;
        DELETE FROM growth_records;
        DELETE FROM vaccination_records;
        DELETE FROM reminders;
        DELETE FROM children;
        DELETE FROM banners;
        DELETE FROM news;
        DELETE FROM videos;
        DELETE FROM podcasts;
        DELETE FROM users;
        DELETE FROM meta;
        PRAGMA foreign_keys = ON;
    `);
}

function migrate() {
    const force = process.argv.includes('--force');
    const data = loadJson();
    const db = getDb();

    if (isDatabaseSeeded() && !force) {
        console.log(`SQLite already has data at ${DB_PATH}. Use --force to re-import.`);
        return;
    }

    if (force) {
        console.log('Wiping existing SQLite data...');
        wipeDatabase(db);
    }

    const tx = db.transaction(() => {
        const insertUser = db.prepare(`
            INSERT INTO users (id, username, email, password, is_admin, first_name, last_name, birth_date, province, city, mobile)
            VALUES (@id, @username, @email, @password, @is_admin, @first_name, @last_name, @birth_date, @province, @city, @mobile)
        `);

        for (const user of Object.values(data.users || {})) {
            insertUser.run({
                id: user.id,
                username: user.username,
                email: user.email || user.username,
                password: user.password,
                is_admin: user.isAdmin ? 1 : 0,
                first_name: user.firstName || null,
                last_name: user.lastName || null,
                birth_date: user.birthDate || null,
                province: user.province || null,
                city: user.city || null,
                mobile: user.mobile || null,
            });
        }

        const insertChild = db.prepare(`
            INSERT INTO children (
                id, user_id, name, first_name, last_name, gender, birth_date, avatar,
                height, weight, blood_type, allergies, special_illnesses,
                national_id, father_name, birth_weight, birth_height, birth_head_circumference,
                birth_type, gestational_age, birth_place, apgar1, apgar5, documents, vaccine_reminder
            ) VALUES (
                @id, @user_id, @name, @first_name, @last_name, @gender, @birth_date, @avatar,
                @height, @weight, @blood_type, @allergies, @special_illnesses,
                @national_id, @father_name, @birth_weight, @birth_height, @birth_head_circumference,
                @birth_type, @gestational_age, @birth_place, @apgar1, @apgar5, @documents, @vaccine_reminder
            )
        `);

        const insertVaccination = db.prepare(`
            INSERT INTO vaccination_records (child_id, age_months, vaccine_name, administered_on)
            VALUES (?, ?, ?, ?)
        `);

        const knownChildIds = new Set();

        for (const child of data.children || []) {
            knownChildIds.add(Number(child.id));
            insertChild.run({
                id: child.id,
                user_id: child.userId,
                name: child.name || null,
                first_name: child.firstName || null,
                last_name: child.lastName || null,
                gender: child.gender || null,
                birth_date: child.birthDate || null,
                avatar: child.avatar || null,
                height: child.height != null ? String(child.height) : null,
                weight: child.weight != null ? String(child.weight) : null,
                blood_type: child.bloodType || null,
                allergies: typeof child.allergies === 'object'
                    ? JSON.stringify(child.allergies)
                    : (child.allergies ?? ''),
                special_illnesses: typeof child.special_illnesses === 'object'
                    ? JSON.stringify(child.special_illnesses)
                    : (child.special_illnesses ?? ''),
                national_id: child.nationalId || null,
                father_name: child.fatherName || null,
                birth_weight: child.birthWeight ?? null,
                birth_height: child.birthHeight ?? null,
                birth_head_circumference: child.birthHeadCircumference ?? null,
                birth_type: child.birthType || null,
                gestational_age: child.gestationalAge ?? null,
                birth_place: child.birthPlace || null,
                apgar1: child.apgar1 ?? null,
                apgar5: child.apgar5 ?? null,
                documents: child.documents ? JSON.stringify(child.documents) : null,
                vaccine_reminder: child.vaccineReminder != null
                    ? JSON.stringify(child.vaccineReminder)
                    : null,
            });

            const records = child.vaccinationRecords || {};
            for (const [age, vaccines] of Object.entries(records)) {
                if (!vaccines || typeof vaccines !== 'object') continue;
                for (const [vaccineName, value] of Object.entries(vaccines)) {
                    insertVaccination.run(
                        child.id,
                        Number(age),
                        vaccineName,
                        typeof value === 'string' ? value : null
                    );
                }
            }
        }

        const insertGrowth = db.prepare(`
            INSERT INTO growth_records (child_id, recorded_on, height, weight, head_circumference)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const [childId, records] of Object.entries(data.growthData || {})) {
            if (!knownChildIds.has(Number(childId))) continue;
            for (const record of records || []) {
                insertGrowth.run(
                    Number(childId),
                    record.date,
                    record.height ?? null,
                    record.weight ?? null,
                    record.headCircumference ?? null
                );
            }
        }

        const insertVisit = db.prepare(`
            INSERT INTO medical_visits (id, child_id, visit_date, doctor_name, reason, summary)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const [childId, visits] of Object.entries(data.medicalVisits || {})) {
            if (!knownChildIds.has(Number(childId))) continue;
            for (const visit of visits || []) {
                insertVisit.run(
                    visit.id || Date.now() + Math.floor(Math.random() * 1000),
                    Number(childId),
                    visit.date,
                    visit.doctorName,
                    visit.reason,
                    visit.summary || null
                );
            }
        }

        const insertDoc = db.prepare(`
            INSERT INTO medical_documents (id, child_id, title, file_path, uploaded_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const [childId, docs] of Object.entries(data.medicalDocuments || {})) {
            if (!knownChildIds.has(Number(childId))) continue;
            for (const doc of docs || []) {
                insertDoc.run(
                    doc.id || Date.now() + Math.floor(Math.random() * 1000),
                    Number(childId),
                    doc.title || null,
                    doc.filePath || doc.url,
                    doc.uploadedAt || new Date().toISOString()
                );
            }
        }

        const insertCheckup = db.prepare(`
            INSERT INTO checkups (id, child_id, title, checkup_date, file_url)
            VALUES (?, ?, ?, ?, ?)
        `);
        const insertParam = db.prepare(`
            INSERT INTO checkup_parameters (checkup_id, name, value, unit)
            VALUES (?, ?, ?, ?)
        `);
        for (const [childId, checkups] of Object.entries(data.checkups || {})) {
            if (!knownChildIds.has(Number(childId))) continue;
            for (const checkup of checkups || []) {
                insertCheckup.run(
                    checkup.id || Date.now() + Math.floor(Math.random() * 1000),
                    Number(childId),
                    checkup.title,
                    checkup.date,
                    checkup.fileUrl || null
                );
                for (const param of checkup.parameters || []) {
                    insertParam.run(
                        checkup.id,
                        param.name,
                        param.value != null ? String(param.value) : null,
                        param.unit || null
                    );
                }
            }
        }

        const insertReminder = db.prepare(`
            INSERT INTO reminders (id, child_id, title, message, remind_on, type, source, link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const [childId, reminders] of Object.entries(data.reminders || {})) {
            if (!knownChildIds.has(Number(childId))) continue;
            for (const reminder of reminders || []) {
                insertReminder.run(
                    String(reminder.id),
                    Number(childId),
                    reminder.title,
                    reminder.message || null,
                    reminder.date || null,
                    reminder.type || 'info',
                    reminder.source || 'manual',
                    reminder.link || null
                );
            }
        }

        const insertBanner = db.prepare(
            'INSERT INTO banners (id, title, link, image_url) VALUES (?, ?, ?, ?)'
        );
        for (const banner of data.banners || []) {
            insertBanner.run(banner.id, banner.title || null, banner.link || null, banner.imageUrl);
        }

        const insertNews = db.prepare(`
            INSERT INTO news (id, title, summary, content, category, image_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const article of data.news || []) {
            insertNews.run(
                article.id,
                article.title,
                article.summary || null,
                article.content || null,
                article.category || 'عمومی',
                article.imageUrl || null,
                article.createdAt || new Date().toISOString(),
                article.updatedAt || null
            );
        }

        const insertVideo = db.prepare(`
            INSERT INTO videos (id, title, summary, url, thumbnail_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const video of data.videos || []) {
            insertVideo.run(
                video.id,
                video.title,
                video.summary || null,
                video.url,
                video.thumbnailUrl || null,
                video.createdAt || new Date().toISOString()
            );
        }

        const insertPodcast = db.prepare(`
            INSERT INTO podcasts (id, title, summary, url, thumbnail_url, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const podcast of data.podcasts || []) {
            insertPodcast.run(
                podcast.id,
                podcast.title,
                podcast.summary || null,
                podcast.url,
                podcast.thumbnailUrl || null,
                podcast.duration || null,
                podcast.createdAt || new Date().toISOString()
            );
        }

        const insertTicket = db.prepare(`
            INSERT INTO tickets (id, user_id, subject, message, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertReply = db.prepare(`
            INSERT INTO ticket_replies (ticket_id, user_id, content, created_at)
            VALUES (?, ?, ?, ?)
        `);
        for (const ticket of data.tickets || []) {
            insertTicket.run(
                ticket.id,
                ticket.userId,
                ticket.subject,
                ticket.message,
                ticket.status || 'open',
                ticket.createdAt || new Date().toISOString(),
                ticket.updatedAt || null
            );
            for (const reply of ticket.replies || []) {
                insertReply.run(
                    ticket.id,
                    reply.userId != null ? Number(reply.userId) : null,
                    reply.content,
                    reply.createdAt || new Date().toISOString()
                );
            }
        }

        // Keep sqlite sequence in sync with imported IDs
        const maxUserId = db.prepare('SELECT MAX(id) AS m FROM users').get().m || 0;
        const maxChildId = db.prepare('SELECT MAX(id) AS m FROM children').get().m || 0;
        db.prepare(
            "INSERT INTO meta (key, value) VALUES ('migrated_from_json', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(new Date().toISOString());
        db.prepare(
            "INSERT INTO meta (key, value) VALUES ('legacy_child_id_counter', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(String(data.childIdCounter || maxChildId + 1));
        db.prepare(
            "INSERT INTO meta (key, value) VALUES ('legacy_user_id_counter', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(String(data.userIdCounter || maxUserId + 1));

        // Reset AUTOINCREMENT sequences
        db.prepare(
            "DELETE FROM sqlite_sequence WHERE name IN ('users', 'children')"
        ).run();
        if (maxUserId) {
            db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ?)").run(maxUserId);
        }
        if (maxChildId) {
            db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('children', ?)").run(maxChildId);
        }
    });

    tx();

    const counts = {
        users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
        children: db.prepare('SELECT COUNT(*) AS c FROM children').get().c,
        growth: db.prepare('SELECT COUNT(*) AS c FROM growth_records').get().c,
        news: db.prepare('SELECT COUNT(*) AS c FROM news').get().c,
        videos: db.prepare('SELECT COUNT(*) AS c FROM videos').get().c,
        podcasts: db.prepare('SELECT COUNT(*) AS c FROM podcasts').get().c,
        reminders: db.prepare('SELECT COUNT(*) AS c FROM reminders').get().c,
    };

    console.log(`Migration complete → ${DB_PATH}`);
    console.log(counts);
}

async function runCli() {
    try {
        await initDb();
        migrate();
        getDb().persist();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    runCli();
}

module.exports = { migrate };
