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
            JWT_SECRET: 'test-jwt-secret',
            AUTH_ALLOW_LEGACY_HEADER: '0',
            SMS_PROVIDER: 'log',
            DATABASE_URL: ''
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdout.on('data', () => {});

    try {
        const health = await waitForHealth(child);
        assert.strictEqual(health.schemaVersion, 3);
        assert.strictEqual(health.wal, true);
        assert.ok(health.counts.users >= 1);

        const login = await request('POST', '/api/login', {
            body: { login: 'Amin', password: 'admin' }
        });
        assert.strictEqual(login.status, 200, JSON.stringify(login.data));
        assert.strictEqual(login.data.user.isAdmin, true);
        assert.ok(login.data.token, 'login must return a JWT');
        const adminId = login.data.user.id;
        const auth = { Authorization: `Bearer ${login.data.token}` };

        const unauthChildren = await request('GET', '/api/children');
        assert.strictEqual(unauthChildren.status, 401);

        const spoof = await request('GET', '/api/children', {
            headers: { 'x-user-id': String(adminId) }
        });
        assert.strictEqual(spoof.status, 401, 'legacy x-user-id must not authenticate');

        const news = await request('GET', '/api/news');
        assert.strictEqual(news.status, 200);
        assert.ok(Array.isArray(news.data) && news.data.length >= 1);

        const products = await request('GET', '/api/shop/products');
        assert.strictEqual(products.status, 200);
        assert.ok(products.data.length >= 1);
        const product = products.data[0];
        const stockBefore = product.stock;
        assert.ok(product.offerId || product.vendorName, 'catalog product should carry offer/vendor');

        const skills = await request('GET', '/api/shop/skills');
        assert.strictEqual(skills.status, 200);
        assert.ok(Array.isArray(skills.data) && skills.data.length >= 5);

        const shopHome = await request('GET', '/api/shop/home');
        assert.strictEqual(shopHome.status, 200);
        assert.strictEqual(shopHome.data.mode, 'single_vendor');
        assert.ok(shopHome.data.vendor);
        assert.ok(Array.isArray(shopHome.data.newest));

        const sorted = await request('GET', '/api/shop/products?sort=price-asc');
        assert.strictEqual(sorted.status, 200);
        if (sorted.data.length >= 2) {
            assert.ok(sorted.data[0].price <= sorted.data[1].price);
        }

        const children = await request('GET', '/api/children', {
            headers: auth
        });
        assert.strictEqual(children.status, 200);
        assert.ok(children.data.length >= 1);
        const childId = children.data[0].id;

        const ageGuide = await request('GET', `/api/children/${childId}/age-guide`, {
            headers: auth
        });
        assert.strictEqual(ageGuide.status, 200, JSON.stringify(ageGuide.data));
        assert.ok(ageGuide.data.band);
        assert.ok(Array.isArray(ageGuide.data.milestones.items));

        const growth = await request('GET', `/api/growth/${childId}`, { headers: auth });
        assert.strictEqual(growth.status, 200);
        assert.ok(Array.isArray(growth.data));

        const createdChild = await request('POST', '/api/children', {
            headers: auth,
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
            headers: auth,
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
            headers: auth
        });
        assert.strictEqual(stats.status, 200);
        assert.ok(stats.data.totalOrders >= 1);

        const catalog = await request('GET', '/api');
        assert.strictEqual(catalog.status, 200);
        assert.ok(catalog.data.groups.tickets.length >= 3);
        assert.ok(catalog.data.groups.admin.includes('POST /api/admin/podcasts'));

        const ticket = await request('POST', '/api/tickets', {
            headers: auth,
            body: { subject: 'سؤال تست', content: 'متن تیکت برای بار ترافیک' }
        });
        assert.strictEqual(ticket.status, 201, JSON.stringify(ticket.data));
        assert.strictEqual(ticket.data.subject, 'سؤال تست');

        const myTickets = await request('GET', '/api/tickets', {
            headers: auth
        });
        assert.strictEqual(myTickets.status, 200);
        assert.ok(myTickets.data.some((t) => t.id === ticket.data.id));

        const visit = await request('POST', `/api/visits/${childId}`, {
            headers: auth,
            body: { date: '2024-06-01', doctorName: 'دکتر تست', reason: 'معاینه' }
        });
        assert.strictEqual(visit.status, 201, JSON.stringify(visit.data));
        const deletedVisit = await request('DELETE', `/api/visits/${childId}/${visit.data.id}`, {
            headers: auth
        });
        assert.strictEqual(deletedVisit.status, 200);

        const podcast = await request('POST', '/api/admin/podcasts', {
            headers: auth,
            body: { title: 'پادکست تست', url: 'https://example.com/p', summary: 'خلاصه' }
        });
        assert.strictEqual(podcast.status, 201, JSON.stringify(podcast.data));
        const podcastGet = await request('GET', `/api/podcasts/${podcast.data.id}`);
        assert.strictEqual(podcastGet.status, 200);

        const pagedNews = await request('GET', '/api/news?limit=2&page=1');
        assert.strictEqual(pagedNews.status, 200);
        assert.ok(Array.isArray(pagedNews.data.items));
        assert.ok(pagedNews.data.total >= 1);

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
        assert.ok(verify.data.token, 'OTP login must return a JWT');

        const me = await request('GET', '/api/auth/me', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(me.status, 200, JSON.stringify(me.data));
        assert.strictEqual(me.data.user.id, verify.data.user.id);

        const loginAgain = await request('POST', '/api/login', {
            body: { login: 'Amin', password: 'admin' }
        });
        assert.strictEqual(loginAgain.status, 200, JSON.stringify(loginAgain.data));
        assert.ok(loginAgain.data.token);

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
