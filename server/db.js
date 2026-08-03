const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE =
    process.env.SQLITE_PATH || path.join(__dirname, 'data', 'roshdyar.db');

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

function normalizeState(raw = {}) {
    const base = emptyState();
    const users = raw.users || {};
    const userKeys = Object.keys(users).map(Number).filter((k) => !Number.isNaN(k));
    const children = (raw.children || []).map((child) => ({
        ...child,
        vaccinationRecords: child.vaccinationRecords || {}
    }));
    const messages = raw.messages || [];
    const products = raw.products || [];
    const orders = raw.orders || [];

    return {
        ...base,
        ...raw,
        users,
        children,
        growthData: raw.growthData || {},
        medicalVisits: raw.medicalVisits || {},
        medicalDocuments: raw.medicalDocuments || {},
        checkups: raw.checkups || {},
        reminders: raw.reminders || {},
        userReminders: raw.userReminders || {},
        messages,
        banners: raw.banners || [],
        articles: raw.articles || [],
        news: raw.news || [],
        tickets: raw.tickets || [],
        videos: raw.videos || [],
        podcasts: raw.podcasts || [],
        products,
        orders,
        childIdCounter: raw.childIdCounter || 1,
        userIdCounter: raw.userIdCounter || (userKeys.length ? Math.max(...userKeys) + 1 : 1),
        messageIdCounter:
            raw.messageIdCounter ||
            (messages.length ? Math.max(...messages.map((m) => m.id || 0)) + 1 : 1),
        productIdCounter:
            raw.productIdCounter ||
            (products.length ? Math.max(...products.map((p) => p.id || 0)) + 1 : 1),
        orderIdCounter:
            raw.orderIdCounter ||
            (orders.length ? Math.max(...orders.map((o) => o.id || 0)) + 1 : 1)
    };
}

function connect() {
    if (db) return db;
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_state (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    console.log(`Connected to SQLite (${DB_FILE})`);
    return db;
}

function loadState() {
    connect();
    const row = db.prepare('SELECT data FROM app_state WHERE id = ?').get('main');
    if (!row) {
        const state = emptyState();
        saveState(state);
        return state;
    }
    return normalizeState(JSON.parse(row.data));
}

function saveState(state) {
    connect();
    const payload = JSON.stringify(state);
    const updatedAt = new Date().toISOString();
    db.prepare(`
        INSERT INTO app_state (id, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            updated_at = excluded.updated_at
    `).run('main', payload, updatedAt);
}

function migrateFromJson(jsonPath) {
    connect();
    const existing = db.prepare('SELECT id FROM app_state WHERE id = ?').get('main');
    if (existing && process.env.FORCE_MIGRATE !== '1') {
        console.log('SQLite already has data. Set FORCE_MIGRATE=1 to overwrite from db.json');
        return false;
    }
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const state = normalizeState(raw);
    saveState(state);
    console.log(`Migrated ${jsonPath} -> SQLite database "${DB_FILE}"`);
    return true;
}

function close() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    connect,
    loadState,
    saveState,
    migrateFromJson,
    close,
    emptyState,
    normalizeState,
    DB_FILE
};
