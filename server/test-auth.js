#!/usr/bin/env node
const assert = require('assert');
const {
    hashPassword,
    verifyPassword,
    isHashedPassword,
    signToken,
    verifyToken
} = require('./auth');

async function run() {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    const hashed = await hashPassword('admin');
    assert.ok(isHashedPassword(hashed));
    assert.strictEqual(await verifyPassword(hashed, 'admin'), true);
    assert.strictEqual(await verifyPassword(hashed, 'nope'), false);
    assert.strictEqual(await verifyPassword('admin', 'admin'), true, 'plaintext fallback');
    assert.strictEqual(await hashPassword(hashed), hashed, 'do not double-hash');

    const token = signToken({ id: 7, isAdmin: true });
    const payload = verifyToken(token);
    assert.strictEqual(payload.id, 7);
    assert.strictEqual(payload.isAdmin, true);
    assert.strictEqual(verifyToken('bad.token'), null);
    console.log('auth unit tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
