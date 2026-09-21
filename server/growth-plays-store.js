const sqliteTable = `
CREATE TABLE IF NOT EXISTS growth_plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 8,
    band_id TEXT,
    min_months INTEGER,
    max_months INTEGER,
    instructions TEXT NOT NULL DEFAULT '[]',
    goal TEXT,
    materials TEXT,
    image_url TEXT,
    scene TEXT NOT NULL DEFAULT 'blocks',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);
`;

const pgTable = `
CREATE TABLE IF NOT EXISTS growth_plays (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 8,
    band_id TEXT,
    min_months INTEGER,
    max_months INTEGER,
    instructions TEXT NOT NULL DEFAULT '[]',
    goal TEXT,
    materials TEXT,
    image_url TEXT,
    scene TEXT NOT NULL DEFAULT 'blocks',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT NOW()::text,
    updated_at TEXT
);
`;

function parseInstructions(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
        } catch (_) { /* plain text */ }
        return trimmed.split(/\r?\n/).map((item) => item.replace(/^\s*\d+[\.\-)]\s*/, '').trim()).filter(Boolean);
    }
    return [];
}

function rowToPlay(row) {
    if (!row) return null;
    const id = Number(row.id);
    return {
        id,
        publicId: `admin-play-${id}`,
        title: row.title,
        duration: Number(row.duration || 8),
        bandId: row.band_id || '',
        minMonths: row.min_months == null ? null : Number(row.min_months),
        maxMonths: row.max_months == null ? null : Number(row.max_months),
        instructions: parseInstructions(row.instructions),
        goal: row.goal || '',
        materials: row.materials || '',
        imageUrl: row.image_url || '',
        scene: row.scene || 'blocks',
        active: row.active == null ? true : Boolean(Number(row.active)),
        sortOrder: Number(row.sort_order || 0),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

function toActivity(play) {
    return {
        id: play.publicId,
        title: play.title,
        shortDescription: play.goal || play.title,
        duration: play.duration,
        difficulty: 'easy',
        domains: [],
        goal: play.goal,
        materials: play.materials,
        instructions: play.instructions,
        imageUrl: play.imageUrl,
        scene: play.scene,
        source: 'admin',
        relatedMilestones: [],
    };
}

function matchesAge(play, months, bandId) {
    if (!play.active) return false;
    if (play.bandId && play.bandId === bandId) return true;
    const min = play.minMonths;
    const max = play.maxMonths;
    if (min == null && max == null && !play.bandId) return true;
    if (min != null && months < min) return false;
    if (max != null && months > max) return false;
    if (min != null || max != null) return true;
    return false;
}

function ensureSqlite(db) {
    db.exec(sqliteTable);
}

function listSqlite(db) {
    return db.prepare('SELECT * FROM growth_plays ORDER BY sort_order, id DESC').all().map(rowToPlay);
}

function getSqlite(db, id) {
    return rowToPlay(db.prepare('SELECT * FROM growth_plays WHERE id = ?').get(Number(id)));
}

function createSqlite(db, payload) {
    const info = db.prepare(`
        INSERT INTO growth_plays (
            title, duration, band_id, min_months, max_months, instructions,
            goal, materials, image_url, scene, active, sort_order, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        payload.title,
        payload.duration,
        payload.bandId || null,
        payload.minMonths,
        payload.maxMonths,
        JSON.stringify(payload.instructions || []),
        payload.goal || null,
        payload.materials || null,
        payload.imageUrl || null,
        payload.scene || 'blocks',
        payload.active === false ? 0 : 1,
        Number(payload.sortOrder || 0)
    );
    return getSqlite(db, info.lastInsertRowid);
}

function updateSqlite(db, id, payload) {
    const current = getSqlite(db, id);
    if (!current) return null;
    db.prepare(`
        UPDATE growth_plays SET
            title = ?, duration = ?, band_id = ?, min_months = ?, max_months = ?,
            instructions = ?, goal = ?, materials = ?, image_url = ?, scene = ?,
            active = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
    `).run(
        payload.title != null ? payload.title : current.title,
        payload.duration != null ? payload.duration : current.duration,
        payload.bandId !== undefined ? (payload.bandId || null) : (current.bandId || null),
        payload.minMonths !== undefined ? payload.minMonths : current.minMonths,
        payload.maxMonths !== undefined ? payload.maxMonths : current.maxMonths,
        JSON.stringify(payload.instructions != null ? payload.instructions : current.instructions),
        payload.goal !== undefined ? payload.goal : current.goal,
        payload.materials !== undefined ? payload.materials : current.materials,
        payload.imageUrl !== undefined ? payload.imageUrl : current.imageUrl,
        payload.scene || current.scene,
        payload.active === false ? 0 : (payload.active === true ? 1 : (current.active ? 1 : 0)),
        payload.sortOrder != null ? payload.sortOrder : current.sortOrder,
        Number(id)
    );
    return getSqlite(db, id);
}

function removeSqlite(db, id) {
    db.prepare('DELETE FROM growth_plays WHERE id = ?').run(Number(id));
    return true;
}

function listForAgeSqlite(db, months, bandId) {
    return listSqlite(db).filter((play) => matchesAge(play, months, bandId)).map(toActivity);
}

async function ensurePg(q) {
    await q(pgTable);
}

function listPg(many) {
    return many('SELECT * FROM growth_plays ORDER BY sort_order, id DESC').then((rows) => rows.map(rowToPlay));
}

function getPg(one, id) {
    return one('SELECT * FROM growth_plays WHERE id = $1', [Number(id)]).then(rowToPlay);
}

async function createPg(q, one, payload) {
    const row = await one(`
        INSERT INTO growth_plays (
            title, duration, band_id, min_months, max_months, instructions,
            goal, materials, image_url, scene, active, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW()::text)
        RETURNING *
    `, [
        payload.title,
        payload.duration,
        payload.bandId || null,
        payload.minMonths,
        payload.maxMonths,
        JSON.stringify(payload.instructions || []),
        payload.goal || null,
        payload.materials || null,
        payload.imageUrl || null,
        payload.scene || 'blocks',
        payload.active === false ? 0 : 1,
        Number(payload.sortOrder || 0)
    ]);
    return rowToPlay(row);
}

async function updatePg(q, one, id, payload) {
    const current = await getPg(one, id);
    if (!current) return null;
    const row = await one(`
        UPDATE growth_plays SET
            title = $1, duration = $2, band_id = $3, min_months = $4, max_months = $5,
            instructions = $6, goal = $7, materials = $8, image_url = $9, scene = $10,
            active = $11, sort_order = $12, updated_at = NOW()::text
        WHERE id = $13
        RETURNING *
    `, [
        payload.title != null ? payload.title : current.title,
        payload.duration != null ? payload.duration : current.duration,
        payload.bandId !== undefined ? (payload.bandId || null) : (current.bandId || null),
        payload.minMonths !== undefined ? payload.minMonths : current.minMonths,
        payload.maxMonths !== undefined ? payload.maxMonths : current.maxMonths,
        JSON.stringify(payload.instructions != null ? payload.instructions : current.instructions),
        payload.goal !== undefined ? payload.goal : current.goal,
        payload.materials !== undefined ? payload.materials : current.materials,
        payload.imageUrl !== undefined ? payload.imageUrl : current.imageUrl,
        payload.scene || current.scene,
        payload.active === false ? 0 : (payload.active === true ? 1 : (current.active ? 1 : 0)),
        payload.sortOrder != null ? payload.sortOrder : current.sortOrder,
        Number(id)
    ]);
    return rowToPlay(row);
}

async function removePg(q, id) {
    await q('DELETE FROM growth_plays WHERE id = $1', [Number(id)]);
    return true;
}

async function listForAgePg(many, months, bandId) {
    const all = await listPg(many);
    return all.filter((play) => matchesAge(play, months, bandId)).map(toActivity);
}

function mergePlayActivities(builtIn, custom) {
    const extra = (custom || []).slice(0, 4);
    if (!extra.length) return (builtIn || []).slice(0, 3);
    const ids = new Set(extra.map((item) => item.id));
    const fill = (builtIn || []).filter((item) => !ids.has(item.id)).slice(0, Math.max(0, 3 - extra.length));
    return extra.concat(fill);
}

module.exports = {
    parseInstructions,
    toActivity,
    matchesAge,
    mergePlayActivities,
    ensureSqlite,
    listSqlite,
    getSqlite,
    createSqlite,
    updateSqlite,
    removeSqlite,
    listForAgeSqlite,
    ensurePg,
    listPg,
    getPg,
    createPg,
    updatePg,
    removePg,
    listForAgePg,
};
