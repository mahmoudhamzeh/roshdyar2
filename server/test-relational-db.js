#!/usr/bin/env node
/**
 * Relational SQLite tests: schema, migration, indexes, transactions.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roshdyar-db-'));
process.env.SQLITE_PATH = path.join(tmpDir, 'test.db');

const store = require('./db');

function assertTables(db) {
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    for (const table of [
        'users', 'children', 'growth_records', 'vaccination_records',
        'products', 'orders', 'order_items', 'messages', 'message_recipients', 'otp_codes'
    ]) {
        assert.ok(names.includes(table), `missing table ${table}`);
    }
    assert.ok(!names.includes('app_state') || names.includes('app_state_legacy'), 'legacy blob should be retired');
}

function run() {
    store.connect();
    const db = store.connect();
    assertTables(db);

    const health = store.health();
    assert.strictEqual(health.ok, true);
    assert.strictEqual(health.wal, true);
    assert.strictEqual(health.schemaVersion, 2);
    assert.ok(health.counts.users >= 1, 'seeded users');
    assert.ok(health.counts.children >= 1, 'seeded children');
    assert.ok(health.counts.products >= 1, 'seeded products');

    const admin = store.users.findCandidatesForLogin('Amin').find((u) => u.isAdmin);
    assert.ok(admin, 'admin Amin exists');
    assert.strictEqual(admin.username, 'Amin');

    const kids = store.children.listByUserId(admin.id);
    assert.ok(kids.length >= 1);
    const child = store.children.getById(kids[0].id);
    assert.ok(child.vaccinationRecords);

    const growth = store.growth.list(child.id);
    assert.ok(Array.isArray(growth));

    const createdUser = store.users.create({
        username: 'traffic-user',
        email: 'traffic@example.com',
        password: 'secret',
        mobile: '09120000000',
        isAdmin: false
    });
    assert.ok(createdUser.id > 0);

    const createdChild = store.children.create({
        userId: createdUser.id,
        firstName: 'آریا',
        lastName: 'تست',
        name: 'آریا تست',
        gender: 'boy',
        birthDate: '2024-01-01',
        vaccinationRecords: { 0: { 'ب ث ژ': true } }
    });
    assert.strictEqual(createdChild.vaccinationRecords[0]['ب ث ژ'], true);

    const upsert = store.growth.upsert(createdChild.id, {
        date: '2024-01-01',
        height: 50,
        weight: 3.2,
        headCircumference: 35
    });
    assert.strictEqual(upsert.created, true);
    const upsert2 = store.growth.upsert(createdChild.id, {
        date: '2024-01-01',
        height: 51,
        weight: 3.3,
        headCircumference: 35.5
    });
    assert.strictEqual(upsert2.created, false);
    assert.strictEqual(store.growth.list(createdChild.id).length, 1);

    const product = store.products.listActive()[0];
    assert.ok(product);
    const stockBefore = product.stock;
    const order = store.orders.create({
        userId: createdUser.id,
        items: [{
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            lineTotal: product.price
        }],
        total: product.price,
        shippingAddress: 'تهران',
        phone: '09120000000',
        notes: ''
    });
    assert.ok(order.id);
    assert.strictEqual(order.status, 'pending');
    assert.strictEqual(store.products.getById(product.id).stock, stockBefore - 1);

    const cancelled = store.orders.updateStatus(order.id, 'cancelled');
    assert.strictEqual(cancelled.status, 'cancelled');
    assert.strictEqual(store.products.getById(product.id).stock, stockBefore);

    store.otp.set('09123334444', {
        code: '12345',
        purpose: 'auth',
        expiresAt: Date.now() + 60000,
        sentAt: Date.now(),
        attempts: 0
    });
    assert.strictEqual(store.otp.get('09123334444').code, '12345');

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r) => r.name);
    assert.ok(indexes.includes('idx_children_user_id'));
    assert.ok(indexes.includes('idx_users_mobile'));
    assert.ok(indexes.includes('idx_orders_user_created'));
    assert.ok(indexes.includes('idx_growth_child_date'));
    assert.ok(indexes.includes('idx_tickets_user'));

    const ticket = store.tickets.create({
        userId: createdUser.id,
        subject: 'سؤال تست',
        content: 'متن تیکت'
    });
    assert.ok(ticket.id);
    assert.strictEqual(store.tickets.listByUser(createdUser.id).length, 1);

    const podcast = store.podcasts.create({
        title: 'پادکست تست',
        url: 'https://example.com/p',
        summary: 'خلاصه'
    });
    assert.ok(store.podcasts.getById(podcast.id));
    store.podcasts.remove(podcast.id);
    assert.strictEqual(store.podcasts.getById(podcast.id), null);

    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('relational db tests passed');
}

function runLegacyMigration() {
    const { spawnSync } = require('child_process');
    const script = `
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const assert = require('assert');
        const Database = require('better-sqlite3');
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roshdyar-legacy-'));
        const dbFile = path.join(tmpDir, 'legacy.db');
        const old = new Database(dbFile);
        old.exec('CREATE TABLE app_state (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
        const raw = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
        old.prepare('INSERT INTO app_state (id, data, updated_at) VALUES (?, ?, ?)').run('main', raw, new Date().toISOString());
        old.close();
        process.env.SQLITE_PATH = dbFile;
        const store = require('./db');
        store.connect();
        const health = store.health();
        assert.strictEqual(health.schemaVersion, 2);
        assert.ok(health.counts.users >= 1);
        assert.ok(health.counts.children >= 1);
        const tables = store.connect().prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
        assert.ok(tables.includes('app_state_legacy'));
        store.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
        console.log('legacy blob migration passed');
    `;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: __dirname, encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || 'legacy migration failed');
    }
    process.stdout.write(result.stdout);
}

try {
    run();
    runLegacyMigration();
} catch (err) {
    console.error(err);
    process.exit(1);
}
