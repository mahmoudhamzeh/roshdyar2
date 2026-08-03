const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.MONGODB_DB || 'roshdyar';
const STATE_ID = 'main';

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

let client = null;
let collection = null;
let writeChain = Promise.resolve();

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

async function connect() {
    if (collection) return collection;
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection('app_state');
    await collection.createIndex({ updatedAt: -1 });
    console.log(`Connected to MongoDB (${DB_NAME})`);
    return collection;
}

async function loadState() {
    await connect();
    const doc = await collection.findOne({ _id: STATE_ID });
    if (!doc) {
        const state = emptyState();
        await collection.updateOne(
            { _id: STATE_ID },
            { $set: { ...state, updatedAt: new Date() } },
            { upsert: true }
        );
        return state;
    }
    const { _id, updatedAt, ...raw } = doc;
    return normalizeState(raw);
}

function saveState(state) {
    const snapshot = JSON.parse(JSON.stringify(state));
    writeChain = writeChain
        .then(async () => {
            await connect();
            await collection.updateOne(
                { _id: STATE_ID },
                { $set: { ...snapshot, updatedAt: new Date() } },
                { upsert: true }
            );
        })
        .catch((err) => {
            console.error('Failed to persist state to MongoDB:', err);
        });
    return writeChain;
}

async function migrateFromJson(jsonPath) {
    await connect();
    const existing = await collection.findOne({ _id: STATE_ID });
    if (existing && process.env.FORCE_MIGRATE !== '1') {
        console.log('MongoDB already has data. Set FORCE_MIGRATE=1 to overwrite from db.json');
        return false;
    }
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`JSON file not found: ${jsonPath}`);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const state = normalizeState(raw);
    await collection.updateOne(
        { _id: STATE_ID },
        { $set: { ...state, updatedAt: new Date(), migratedFrom: path.basename(jsonPath) } },
        { upsert: true }
    );
    console.log(`Migrated ${jsonPath} -> MongoDB database "${DB_NAME}"`);
    return true;
}

async function close() {
    if (client) {
        await client.close();
        client = null;
        collection = null;
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
    MONGODB_URI,
    DB_NAME
};
