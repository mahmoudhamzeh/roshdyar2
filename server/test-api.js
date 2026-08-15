#!/usr/bin/env node
/**
 * HTTP smoke tests against the relational API.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roshdyar-api-'));
const dbFile = path.join(tmpDir, 'api.db');
const port = 5099;

function request(method, urlPath, { body, headers } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path: urlPath,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(headers || {})
                }
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => { raw += chunk; });
                res.on('end', () => {
                    let data = raw;
                    try { data = raw ? JSON.parse(raw) : null; } catch (_) { /* keep */ }
                    resolve({ status: res.statusCode, data });
                });
            }
        );
        req.on('error', reject);
        if (body !== undefined) req.write(JSON.stringify(body));
        req.end();
    });
}

function waitForHealth(child, timeoutMs = 15000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const tick = async () => {
            if (child.exitCode != null) {
                return reject(new Error(`server exited with ${child.exitCode}`));
            }
            try {
                const res = await request('GET', '/api/health');
                if (res.status === 200 && res.data && res.data.ok) return resolve(res.data);
            } catch (_) { /* retry */ }
            if (Date.now() - started > timeoutMs) return reject(new Error('health timeout'));
            setTimeout(tick, 200);
        };
        tick();
    });
}

async function run() {
    const child = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
            ...process.env,
            PORT: String(port),
            SQLITE_PATH: dbFile,
            NODE_ENV: 'test',
            SMS_PROVIDER: 'log'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdout.on('data', () => {});

    try {
        const health = await waitForHealth(child);
        assert.strictEqual(health.schemaVersion, 2);
        assert.strictEqual(health.wal, true);
        assert.ok(health.counts.users >= 1);

        const login = await request('POST', '/api/login', {
            body: { login: 'Amin', password: 'admin' }
        });
        assert.strictEqual(login.status, 200, JSON.stringify(login.data));
        assert.strictEqual(login.data.user.isAdmin, true);
        const adminId = login.data.user.id;

        const news = await request('GET', '/api/news');
        assert.strictEqual(news.status, 200);
        assert.ok(Array.isArray(news.data) && news.data.length >= 1);

        const products = await request('GET', '/api/shop/products');
        assert.strictEqual(products.status, 200);
        assert.ok(products.data.length >= 1);
        const product = products.data[0];
        const stockBefore = product.stock;

        const children = await request('GET', '/api/children', {
            headers: { 'x-user-id': String(adminId) }
        });
        assert.strictEqual(children.status, 200);
        assert.ok(children.data.length >= 1);
        const childId = children.data[0].id;

        const growth = await request('GET', `/api/growth/${childId}`);
        assert.strictEqual(growth.status, 200);
        assert.ok(Array.isArray(growth.data));

        const createdChild = await request('POST', '/api/children', {
            body: {
                userId: adminId,
                firstName: 'تست',
                lastName: 'ترافیک',
                gender: 'girl',
                birthDate: '2024-06-01',
                birthHeight: 50,
                birthWeight: 3.1,
                birthHeadCircumference: 34
            }
        });
        assert.strictEqual(createdChild.status, 201, JSON.stringify(createdChild.data));
        assert.ok(createdChild.data.id);
        assert.ok(Array.isArray(createdChild.data.growthData));
        assert.ok(createdChild.data.growthData.length >= 1);

        const order = await request('POST', '/api/shop/orders', {
            headers: { 'x-user-id': String(adminId) },
            body: {
                items: [{ productId: product.id, quantity: 1 }],
                shippingAddress: 'تهران، خیابان تست',
                phone: '09120000000'
            }
        });
        assert.strictEqual(order.status, 201, JSON.stringify(order.data));
        assert.strictEqual(order.data.status, 'pending');

        const productAfter = await request('GET', `/api/shop/products/${product.id}`);
        assert.strictEqual(productAfter.data.stock, stockBefore - 1);

        const stats = await request('GET', '/api/admin/stats', {
            headers: { 'x-user-id': String(adminId) }
        });
        assert.strictEqual(stats.status, 200);
        assert.ok(stats.data.totalOrders >= 1);

        const otp = await request('POST', '/api/auth/send-otp', {
            body: { phone: '09121112233' }
        });
        assert.strictEqual(otp.status, 200, JSON.stringify(otp.data));
        assert.ok(otp.data.devOtp);

        const verify = await request('POST', '/api/auth/verify-otp', {
            body: { phone: '09121112233', code: otp.data.devOtp }
        });
        assert.ok([200, 201].includes(verify.status), JSON.stringify(verify.data));
        assert.ok(verify.data.user.id);

        console.log('api smoke tests passed');
    } finally {
        if (child.pid) {
            child.kill('SIGTERM');
            await new Promise((resolve) => {
                const t = setTimeout(() => {
                    try { process.kill(child.pid, 'SIGKILL'); } catch (_) {}
                    resolve();
                }, 3000);
                child.on('exit', () => { clearTimeout(t); resolve(); });
            });
        }
        if (stderr && !stderr.includes('listening')) {
            // keep stderr for failures
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
