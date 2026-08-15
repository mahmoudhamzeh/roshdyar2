#!/usr/bin/env node
/**
 * PostgreSQL tests: schema, seed, indexes, transactions.
 */
const { Client } = require('pg');
const assert = require('assert');
const store = require('./db');

const ADMIN_URL = process.env.DATABASE_ADMIN_URL
    || 'postgres://roshdyar:roshdyar@127.0.0.1:5432/postgres';
const TEST_DB = `roshdyar_test_${process.pid}`;

function testUrl() {
    const base = new URL(ADMIN_URL);
    base.pathname = `/${TEST_DB}`;
    return base.toString();
}

async function createTestDb() {
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await admin.query(`CREATE DATABASE ${TEST_DB} OWNER roshdyar`);
    await admin.end();
    process.env.DATABASE_URL = testUrl();
}

async function dropTestDb() {
    try { await store.close(); } catch (_) { /* ignore */ }
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await admin.end();
}

async function run() {
    await createTestDb();
    await store.connect();
    const health = await store.health();
    assert.strictEqual(health.ok, true);
    assert.strictEqual(health.db, 'postgresql');
    assert.strictEqual(health.schemaVersion, 3);
    assert.ok(health.counts.users >= 1, 'seeded users');
    assert.ok(health.counts.children >= 1, 'seeded children');
    assert.ok(health.counts.products >= 1, 'seeded products');

    const adminUser = (await store.users.findCandidatesForLogin('Amin')).find((u) => u.isAdmin);
    assert.ok(adminUser, 'admin Amin exists');
    assert.strictEqual(adminUser.username, 'Amin');

    const kids = await store.children.listByUserId(adminUser.id);
    assert.ok(kids.length >= 1);
    const child = await store.children.getById(kids[0].id);
    assert.ok(child.vaccinationRecords);

    const createdUser = await store.users.create({
        username: 'traffic-user',
        email: 'traffic@example.com',
        password: 'secret',
        mobile: '09120000000',
        isAdmin: false
    });
    assert.ok(createdUser.id > 0);

    const createdChild = await store.children.create({
        userId: createdUser.id,
        firstName: 'آریا',
        lastName: 'تست',
        name: 'آریا تست',
        gender: 'boy',
        birthDate: '2024-01-01',
        vaccinationRecords: { 0: { 'ب ث ژ': true } }
    });
    assert.strictEqual(createdChild.vaccinationRecords[0]['ب ث ژ'], true);

    const upsert = await store.growth.upsert(createdChild.id, {
        date: '2024-01-01',
        height: 50,
        weight: 3.2,
        headCircumference: 35
    });
    assert.strictEqual(upsert.created, true);
    const upsert2 = await store.growth.upsert(createdChild.id, {
        date: '2024-01-01',
        height: 51,
        weight: 3.3,
        headCircumference: 35.5
    });
    assert.strictEqual(upsert2.created, false);
    assert.strictEqual((await store.growth.list(createdChild.id)).length, 1);

    const product = (await store.products.listActive())[0];
    assert.ok(product);
    const stockBefore = product.stock;
    const order = await store.orders.create({
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
    assert.strictEqual((await store.products.getById(product.id)).stock, stockBefore - 1);

    const cancelled = await store.orders.updateStatus(order.id, 'cancelled');
    assert.strictEqual(cancelled.status, 'cancelled');
    assert.strictEqual((await store.products.getById(product.id)).stock, stockBefore);

    await store.otp.set('09123334444', {
        code: '12345',
        purpose: 'auth',
        expiresAt: Date.now() + 60000,
        sentAt: Date.now(),
        attempts: 0
    });
    assert.strictEqual((await store.otp.get('09123334444')).code, '12345');

    const pool = await store.connect();
    const indexRows = (await pool.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
    )).rows.map((r) => r.indexname);
    assert.ok(indexRows.includes('idx_children_user_id'));
    assert.ok(indexRows.includes('idx_users_mobile'));
    assert.ok(indexRows.includes('idx_orders_user_created'));
    assert.ok(indexRows.includes('idx_growth_child_date'));

    console.log('postgresql tests passed');
}

run()
    .then(dropTestDb)
    .catch(async (err) => {
        console.error(err);
        await dropTestDb();
        process.exit(1);
    });
