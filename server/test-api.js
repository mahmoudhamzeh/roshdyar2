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

const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

function requestMultipart(method, urlPath, { fields = {}, files = [], headers = {} } = {}) {
    const boundary = '----TatKidsFormBoundary7MA4YWxkTrZu0gW';
    const chunks = [];
    Object.entries(fields).forEach(([name, value]) => {
        chunks.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
        ));
    });
    files.forEach((file) => {
        chunks.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${file.field || 'images'}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType || 'image/png'}\r\n\r\n`
        ));
        chunks.push(file.body);
        chunks.push(Buffer.from('\r\n'));
    });
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(chunks);
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path: urlPath,
                method,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length,
                    ...headers
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
        req.write(body);
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

        const namedProfile = await request('PUT', `/api/users/${adminId}`, {
            headers: auth,
            body: { firstName: 'امین', lastName: 'ادمین' }
        });
        assert.strictEqual(namedProfile.status, 200, JSON.stringify(namedProfile.data));
        assert.strictEqual(namedProfile.data.user.profileComplete, true);

        const incompleteProfile = await request('PUT', `/api/users/${adminId}`, {
            headers: auth,
            body: { firstName: 'امین', lastName: '   ' }
        });
        assert.strictEqual(incompleteProfile.status, 200, JSON.stringify(incompleteProfile.data));
        assert.strictEqual(incompleteProfile.data.user.profileComplete, false);

        const restoredProfile = await request('PUT', `/api/users/${adminId}`, {
            headers: auth,
            body: { firstName: 'امین', lastName: 'ادمین', birthDate: '1990-05-01' }
        });
        assert.strictEqual(restoredProfile.status, 200, JSON.stringify(restoredProfile.data));
        assert.strictEqual(restoredProfile.data.user.profileComplete, true);
        assert.strictEqual(restoredProfile.data.user.birthDate, '1990-05-01');

        const unauthChildren = await request('GET', '/api/children');
        assert.strictEqual(unauthChildren.status, 401);

        const spoof = await request('GET', '/api/children', {
            headers: { 'x-user-id': String(adminId) }
        });
        assert.strictEqual(spoof.status, 401, 'legacy x-user-id must not authenticate');

        const news = await request('GET', '/api/news');
        assert.strictEqual(news.status, 200);
        assert.ok(Array.isArray(news.data) && news.data.length >= 1);
        const sidebarBanners = await request('GET', '/api/banners?placement=sidebar');
        assert.strictEqual(sidebarBanners.status, 200);
        assert.ok(Array.isArray(sidebarBanners.data));
        const serverSrc = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
        assert.ok(/placement === 'sidebar'/.test(serverSrc), 'banner API must accept sidebar placement');

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
        assert.ok(shopHome.data.mode === 'marketplace' || shopHome.data.mode === 'single_vendor');
        assert.ok(Array.isArray(shopHome.data.onSale));
        assert.ok(shopHome.data.vendor);
        assert.ok(Array.isArray(shopHome.data.newest));

        const sorted = await request('GET', '/api/shop/products?sort=price-asc');
        assert.strictEqual(sorted.status, 200);
        if (sorted.data.length >= 2) {
            assert.ok(sorted.data[0].price <= sorted.data[1].price);
        }

        const genders = await request('GET', '/api/shop/genders');
        assert.strictEqual(genders.status, 200);
        assert.ok((genders.data || []).some((item) => item.id === 'boy'));
        const boyFilter = await request('GET', '/api/shop/products?gender=boy');
        assert.strictEqual(boyFilter.status, 200, JSON.stringify(boyFilter.data));
        (boyFilter.data || []).forEach((item) => {
            assert.ok(['boy', 'unisex'].includes(item.gender || 'unisex'), item.name);
        });

        const adminCats = await request('GET', '/api/admin/product-categories', { headers: auth });
        assert.strictEqual(adminCats.status, 200, JSON.stringify(adminCats.data));
        const flatCats = [];
        const walkCats = (nodes) => (nodes || []).forEach((node) => {
            flatCats.push(node.name);
            walkCats(node.children);
        });
        walkCats(adminCats.data);
        assert.ok(flatCats.includes('کفش'), 'پوشاک should include کفش');
        assert.ok(flatCats.includes('مکمل'), 'تغذیه should include مکمل');

        const shoeProduct = await request('POST', '/api/admin/products', {
            headers: auth,
            body: {
                name: 'کفش پیاده‌روی کودک',
                category: 'کفش',
                price: 280000,
                stock: 5,
                brand: 'تات کیدز',
                attrs: { color: 'آبی', shoeSize: '24' }
            }
        });
        assert.strictEqual(shoeProduct.status, 201, JSON.stringify(shoeProduct.data));
        assert.strictEqual(shoeProduct.data.brand, 'تات کیدز');
        assert.strictEqual(shoeProduct.data.attrs.color, 'آبی');
        assert.strictEqual(shoeProduct.data.attrs.shoeSize, '24');

        const supplement = await request('POST', '/api/admin/products', {
            headers: auth,
            body: {
                name: 'قطره ویتامین د',
                category: 'مکمل',
                price: 90000,
                stock: 8,
                brand: 'فیروز',
                attrs: { expiryDate: '2027-03-01', dosage: 'روزانه یک قطره' }
            }
        });
        assert.strictEqual(supplement.status, 201, JSON.stringify(supplement.data));
        assert.strictEqual(supplement.data.attrs.expiryDate, '2027-03-01');

        const helicopter = await request('POST', '/api/admin/products', {
            headers: auth,
            body: {
                name: 'هلیکوپتر کنترلی',
                category: 'حرکتی',
                price: 450000,
                stock: 4,
                brand: 'تات کیدز',
                attrs: {
                    hasRemote: 'بله',
                    batteryLife: '۲۰ دقیقه پرواز',
                    'برد کنترل': '۳۰ متر'
                }
            }
        });
        assert.strictEqual(helicopter.status, 201, JSON.stringify(helicopter.data));
        assert.strictEqual(helicopter.data.attrs.hasRemote, 'بله');
        assert.strictEqual(helicopter.data.attrs.batteryLife, '۲۰ دقیقه پرواز');
        assert.strictEqual(helicopter.data.attrs['برد کنترل'], '۳۰ متر');

        const nineFiles = Array.from({ length: 9 }, (_, index) => ({
            filename: `heli-${index + 1}.png`,
            body: TINY_PNG
        }));
        const heliUpload = await requestMultipart('POST', '/api/admin/products', {
            headers: auth,
            fields: {
                name: 'هلیکوپتر با ۹ عکس',
                category: 'ماشین',
                price: '380000',
                stock: '2',
                attrs: JSON.stringify({ hasRemote: 'بله', batteryLife: '۱۵ دقیقه' })
            },
            files: nineFiles
        });
        assert.strictEqual(heliUpload.status, 201, JSON.stringify(heliUpload.data));
        assert.ok((heliUpload.data.images || []).length >= 1 || heliUpload.data.imageUrl);

        const tooMany = await requestMultipart('POST', '/api/admin/products', {
            headers: auth,
            fields: {
                name: 'محصول با عکس زیاد',
                category: 'ماشین',
                price: '10000',
                stock: '1'
            },
            files: Array.from({ length: 21 }, (_, index) => ({
                filename: `extra-${index + 1}.png`,
                body: TINY_PNG
            }))
        });
        assert.strictEqual(tooMany.status, 400, JSON.stringify(tooMany.data));
        assert.ok(String(tooMany.data && tooMany.data.message).includes('۲۰'));

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
        assert.ok(Array.isArray(ageGuide.data.expectSections) && ageGuide.data.expectSections.length >= 3);
        assert.ok(Array.isArray(ageGuide.data.activities));
        assert.ok(ageGuide.data.activities.length <= 3);
        assert.ok(ageGuide.data.today);

        const analyzed = await request('POST', `/api/children/${childId}/concerns/analyze`, {
            headers: auth,
            body: { concern: 'پسرم هنوز تنهایی راه نمیفته و فقط جیغ می‌زند' }
        });
        assert.strictEqual(analyzed.status, 201, JSON.stringify(analyzed.data));
        assert.ok(analyzed.data.triage_status);
        assert.ok(analyzed.data.status_badge);

        const foodAsk = await request('POST', `/api/children/${childId}/concerns/chat`, {
            headers: auth,
            body: { message: 'در این سن چه چیزی بخورد؟', history: [] }
        });
        assert.strictEqual(foodAsk.status, 201, JSON.stringify(foodAsk.data));
        assert.ok(foodAsk.data.reply);
        assert.ok(!foodAsk.data.reply.includes('مشاهده کوتاه'), foodAsk.data.reply);
        assert.ok(!foodAsk.data.reply.includes('بازه طبیعی'), foodAsk.data.reply);
        assert.strictEqual(foodAsk.data.intent, 'food');

        const feverAsk = await request('POST', `/api/children/${childId}/concerns/chat`, {
            headers: auth,
            body: { message: 'تب دارد 39', history: foodAsk.data.messages }
        });
        assert.strictEqual(feverAsk.status, 201, JSON.stringify(feverAsk.data));
        assert.ok(/پزشک|اورژانس/.test(feverAsk.data.reply), feverAsk.data.reply);
        assert.ok(!feverAsk.data.reply.includes('بازه طبیعی'), feverAsk.data.reply);
        assert.ok(feverAsk.data.intent === 'urgent' || feverAsk.data.intent === 'fever');

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

        const tehranTodayEarly = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        const [ty, tm, td] = tehranTodayEarly.split('-').map(Number);
        const tomorrowGrowth = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
        const futureGrowth = await request('POST', `/api/growth/${createdChild.data.id}`, {
            headers: auth,
            body: { date: tomorrowGrowth, height: 80, weight: 10 }
        });
        assert.strictEqual(futureGrowth.status, 400, JSON.stringify(futureGrowth.data));
        assert.ok(/آینده/.test(String(futureGrowth.data && futureGrowth.data.message || '')));

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

        const cascadeSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/CategoryCascade.js'), 'utf8');
        assert.ok(!/<select[\s>]/.test(cascadeSrc), 'product category picker must not use native select');
        const shopPageSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/ShopPage.js'), 'utf8');
        assert.ok(!/PageAdRail/.test(shopPageSrc), 'shop page must not show left ad rail');
        const cartPageSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/CartPage.js'), 'utf8');
        assert.ok(!/WithLeftAds/.test(cartPageSrc), 'cart must not wrap with left ads');
        assert.ok(/صورتحساب/.test(cartPageSrc));
        assert.ok(/نام خانوادگی/.test(cartPageSrc), 'cart must show buyer first and last name');
        const profileUtilSrc = fs.readFileSync(path.join(__dirname, '../client/src/utils/profile.js'), 'utf8');
        assert.ok(/complete=1/.test(profileUtilSrc), 'profile helper must send users to complete flow');

        const userInfoSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/UserInfo.js'), 'utf8');
        assert.ok(/react-multi-date-picker/.test(userInfoSrc), 'profile birth date must use shamsi date picker');
        assert.ok(/calendars\/persian/.test(userInfoSrc));
        assert.ok(!/type: 'date'/.test(userInfoSrc), 'profile must not use native gregorian date input');

        const childGrowthSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/ChildGrowthPage.js'), 'utf8');
        assert.ok(/سانتی‌متر/.test(childGrowthSrc));
        assert.ok(/کیلوگرم/.test(childGrowthSrc));
        assert.ok(!/`\$\{heightAnalysis\.value\} سم`/.test(childGrowthSrc));
        assert.ok(!/`\$\{weightAnalysis\.value\} کگ`/.test(childGrowthSrc));

        const growthChartSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/GrowthChartPage.js'), 'utf8');
        assert.ok(/maxDate/.test(growthChartSrc), 'growth chart must block future dates');
        assert.ok(/سانتی‌متر/.test(growthChartSrc));
        assert.ok(/کیلوگرم/.test(growthChartSrc));

        const shippingSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/CheckoutShippingPage.js'), 'utf8');
        assert.ok(/خودم/.test(shippingSrc));
        assert.ok(/شخص دیگری/.test(shippingSrc));

        const savedAddress = await request('POST', '/api/shop/addresses', {
            headers: auth,
            body: {
                title: 'خانه',
                recipient: 'امین',
                phone: '09120000000',
                province: 'تهران',
                city: 'تهران',
                address: 'خیابان تست پلاک ۱',
                lat: 35.7,
                lng: 51.4,
                isDefault: true
            }
        });
        assert.strictEqual(savedAddress.status, 201, JSON.stringify(savedAddress.data));
        assert.strictEqual(savedAddress.data.city, 'تهران');
        const addressList = await request('GET', '/api/shop/addresses', { headers: auth });
        assert.strictEqual(addressList.status, 200);
        assert.ok((addressList.data || []).some((item) => item.id === savedAddress.data.id));

        const tehranToday = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        const [yy, mm, dd] = tehranToday.split('-').map(Number);
        const deliveryDate = new Date(Date.UTC(yy, mm - 1, dd + 1)).toISOString().slice(0, 10);
        const checkoutProduct = (products.data || []).find((item) => item.id !== product.id && Number(item.stock) > 0);
        assert.ok(checkoutProduct, 'need another in-stock product for checkout payment');
        const paidOrder = await request('POST', '/api/shop/orders', {
            headers: auth,
            body: {
                items: [{ productId: checkoutProduct.id, quantity: 1 }],
                shippingAddress: savedAddress.data.address,
                phone: savedAddress.data.phone,
                addressId: savedAddress.data.id,
                deliveryDate,
                deliverySlot: '13-17',
                lat: 35.7,
                lng: 51.4,
                startPayment: true
            }
        });
        assert.strictEqual(paidOrder.status, 201, JSON.stringify(paidOrder.data));
        assert.ok(paidOrder.data.paymentUrl, 'checkout must return a payment URL');
        assert.ok(String(paidOrder.data.authority || '').startsWith('MOCK'));
        assert.strictEqual(paidOrder.data.paymentStatus, 'pending');
        assert.strictEqual(paidOrder.data.deliverySlot, '13-17');

        const verifiedPay = await request('POST', '/api/shop/payments/verify', {
            headers: auth,
            body: { authority: paidOrder.data.authority, status: 'OK' }
        });
        assert.strictEqual(verifiedPay.status, 200, JSON.stringify(verifiedPay.data));
        assert.strictEqual(verifiedPay.data.ok, true);
        assert.strictEqual(verifiedPay.data.order.paymentStatus, 'paid');
        assert.strictEqual(verifiedPay.data.order.status, 'confirmed');
        assert.ok(verifiedPay.data.refId);

        const badDay = await request('POST', '/api/shop/orders', {
            headers: auth,
            body: {
                items: [{ productId: checkoutProduct.id, quantity: 1 }],
                shippingAddress: 'تهران',
                phone: '09120000000',
                deliveryDate: tehranToday,
                deliverySlot: '09-13',
                startPayment: true
            }
        });
        assert.strictEqual(badDay.status, 400, JSON.stringify(badDay.data));

        const adminComment = await request('POST', `/api/shop/products/${product.id}/comments`, {
            headers: auth,
            body: { body: 'نظر تست ادمین برای امتیاز محصول', rating: 4 }
        });
        assert.strictEqual(adminComment.status, 201, JSON.stringify(adminComment.data));
        assert.strictEqual(adminComment.data.author, 'Amin');
        assert.strictEqual(adminComment.data.status, 'pending');
        assert.ok(adminComment.data.pending);
        assert.ok(!/\d{8,}/.test(String(adminComment.data.author || '')));

        const hiddenComments = await request('GET', `/api/shop/products/${product.id}/comments`);
        assert.strictEqual(hiddenComments.status, 200);
        assert.ok(!(hiddenComments.data || []).some((item) => item.id === adminComment.data.id));

        const approve = await request('PATCH', `/api/admin/shop/comments/${adminComment.data.id}`, {
            headers: auth,
            body: { status: 'approved' }
        });
        assert.strictEqual(approve.status, 200, JSON.stringify(approve.data));
        assert.strictEqual(approve.data.status, 'approved');

        const publicComments = await request('GET', `/api/shop/products/${product.id}/comments`);
        assert.ok((publicComments.data || []).some((item) => item.id === adminComment.data.id));

        const liked = await request('POST', `/api/shop/comments/${adminComment.data.id}/vote`, {
            headers: auth,
            body: { vote: 1 }
        });
        assert.strictEqual(liked.status, 200, JSON.stringify(liked.data));
        assert.strictEqual(liked.data.likeCount, 1);
        assert.strictEqual(liked.data.myVote, 1);

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
        assert.ok(Array.isArray(myTickets.data));
        assert.ok(myTickets.data.some((t) => t.id === ticket.data.id));

        const adminTickets = await request('GET', '/api/admin/tickets', { headers: auth });
        assert.strictEqual(adminTickets.status, 200, JSON.stringify(adminTickets.data));
        assert.ok(Array.isArray(adminTickets.data.tickets));
        assert.ok(adminTickets.data.counts.total >= 1);
        const listedTicket = adminTickets.data.tickets.find((item) => item.id === ticket.data.id);
        assert.ok(listedTicket, 'admin must see the created ticket');
        assert.ok(listedTicket.user && listedTicket.user.displayName);
        assert.strictEqual(listedTicket.status, 'open');

        const adminReply = await request('PUT', `/api/admin/tickets/${ticket.data.id}`, {
            headers: auth,
            body: { reply: 'پاسخ پشتیبانی برای کاربر' }
        });
        assert.strictEqual(adminReply.status, 200, JSON.stringify(adminReply.data));
        assert.strictEqual(adminReply.data.status, 'waiting_user');
        assert.ok((adminReply.data.replies || []).some((item) => item.content.includes('پاسخ پشتیبانی')));
        assert.strictEqual(adminReply.data.replies[adminReply.data.replies.length - 1].authorRole, 'admin');

        const waiting = await request('PUT', `/api/admin/tickets/${ticket.data.id}`, {
            headers: auth,
            body: { status: 'waiting_user' }
        });
        assert.strictEqual(waiting.status, 200);
        assert.strictEqual(waiting.data.status, 'waiting_user');

        const reviewing = await request('PUT', `/api/admin/tickets/${ticket.data.id}`, {
            headers: auth,
            body: { status: 'in_review' }
        });
        assert.strictEqual(reviewing.status, 200);
        assert.strictEqual(reviewing.data.status, 'in_review');

        const closed = await request('PUT', `/api/admin/tickets/${ticket.data.id}`, {
            headers: auth,
            body: { status: 'closed' }
        });
        assert.strictEqual(closed.status, 200);
        assert.strictEqual(closed.data.status, 'closed');

        const closedReplyBlocked = await request('POST', `/api/tickets/${ticket.data.id}/replies`, {
            headers: auth,
            body: { content: 'نباید روی تیکت بسته جواب بدهم' }
        });
        assert.strictEqual(closedReplyBlocked.status, 400);

        const reopened = await request('PUT', `/api/admin/tickets/${ticket.data.id}`, {
            headers: auth,
            body: { status: 'open' }
        });
        assert.strictEqual(reopened.status, 200);
        assert.strictEqual(reopened.data.status, 'open');

        const userFollowUp = await request('POST', `/api/tickets/${ticket.data.id}/replies`, {
            headers: auth,
            body: { content: 'ممنون، سؤال دیگری دارم' }
        });
        assert.strictEqual(userFollowUp.status, 201, JSON.stringify(userFollowUp.data));
        assert.strictEqual(userFollowUp.data.status, 'open');
        assert.ok((userFollowUp.data.replies || []).some((item) => item.content.includes('سؤال دیگری')));

        const filteredOpen = await request('GET', '/api/admin/tickets?status=open', { headers: auth });
        assert.ok(filteredOpen.data.tickets.every((item) => item.status === 'open'));
        assert.ok(filteredOpen.data.tickets.some((item) => item.id === ticket.data.id));

        const statsAfterTickets = await request('GET', '/api/admin/stats', { headers: auth });
        assert.ok(statsAfterTickets.data.ticketCounts);
        assert.ok(statsAfterTickets.data.ticketCounts.total >= 1);

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

        const phoneComment = await request('POST', `/api/shop/products/${product.id}/comments`, {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { body: 'نظر کاربر پیامکی بدون نمایش موبایل', rating: 5 }
        });
        assert.strictEqual(phoneComment.status, 201, JSON.stringify(phoneComment.data));
        assert.strictEqual(phoneComment.data.author, 'کاربر تات کیدز');
        assert.strictEqual(phoneComment.data.status, 'pending');
        assert.ok(!/\d{8,}/.test(String(phoneComment.data.author || '')));
        const stillHidden = await request('GET', `/api/shop/products/${product.id}/comments`);
        assert.ok(!(stillHidden.data || []).some((item) => item.id === phoneComment.data.id));

        const ratingOnly = await request('POST', `/api/shop/products/${product.id}/comments`, {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { rating: 5 }
        });
        assert.strictEqual(ratingOnly.status, 201, JSON.stringify(ratingOnly.data));
        assert.strictEqual(ratingOnly.data.status, 'pending');
        assert.ok(ratingOnly.data.pending);
        assert.ok(/متشکر/.test(String(ratingOnly.data.message || '')), ratingOnly.data.message);
        assert.ok(!String(ratingOnly.data.body || '').trim());
        const hiddenRating = await request('GET', `/api/shop/products/${product.id}/comments`);
        assert.ok(!(hiddenRating.data || []).some((item) => item.id === ratingOnly.data.id));

        const categories = await request('GET', '/api/shop/categories');
        assert.strictEqual(categories.status, 200);
        const names = [];
        const walk = (nodes) => (nodes || []).forEach((node) => {
            names.push(node.name);
            walk(node.children);
        });
        walk(categories.data);
        assert.ok(names.includes('پسرانه'));
        assert.ok(names.includes('لگو'));
        const shopModel = require('./shop-model');
        assert.strictEqual(shopModel.inferGenderFromCategory('لگو', categories.data), 'boy');
        assert.strictEqual(shopModel.inferGenderFromCategory('عروسک', categories.data), 'girl');
        assert.strictEqual(shopModel.inferGenderFromCategory('کتاب', categories.data), 'unisex');

        const vendorApply = await request('POST', '/api/shop/vendors/apply', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                displayName: 'فروشگاه بازی‌کده تست',
                personKind: 'individual',
                ownerName: 'علی فروشنده',
                nationalId: '0012345678',
                phone: '09121112233',
                address: 'تهران، خیابان تست',
                bankName: 'ملی',
                bankSheba: 'IR120170000000123456789001'
            }
        });
        assert.strictEqual(vendorApply.status, 201, JSON.stringify(vendorApply.data));
        assert.strictEqual(vendorApply.data.status, 'pending');
        assert.strictEqual(vendorApply.data.profileComplete, false);

        const pendingBlocked = await request('POST', '/api/vendor/products', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { name: 'کالای زودهنگام', category: 'لگو', price: 1000, stock: 1 }
        });
        assert.strictEqual(pendingBlocked.status, 403, JSON.stringify(pendingBlocked.data));

        const pendingTicket = await request('POST', '/api/tickets', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                groupName: 'فروشنده',
                subgroup: 'مدارک',
                subject: 'وضعیت بررسی مدارک',
                content: 'درخواست فروشندگی من چه زمانی بررسی می‌شود؟'
            }
        });
        assert.strictEqual(pendingTicket.status, 201, JSON.stringify(pendingTicket.data));

        const vendorTicketSeen = await request('GET', '/api/admin/tickets', { headers: auth });
        const vendorListed = (vendorTicketSeen.data.tickets || []).find((item) => item.id === pendingTicket.data.id);
        assert.ok(vendorListed, 'admin must see vendor tickets');
        assert.strictEqual(Number(vendorListed.userId), Number(verify.data.user.id));
        assert.ok(vendorListed.user);
        assert.ok(vendorListed.user.displayName);
        assert.ok(String(vendorListed.user.mobile || '').includes('0912') || String(vendorListed.userName || '').length > 0);

        const listedVendors = await request('GET', '/api/admin/vendors', { headers: auth });
        const listedVendor = (listedVendors.data || []).find((item) => Number(item.id) === Number(vendorApply.data.id));
        assert.ok(listedVendor);
        assert.strictEqual(listedVendor.profileComplete, false);
        assert.ok((listedVendor.profileGaps || []).length > 0);

        const approveIncomplete = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { status: 'active' }
        });
        assert.strictEqual(approveIncomplete.status, 200, JSON.stringify(approveIncomplete.data));
        assert.strictEqual(approveIncomplete.data.status, 'active');
        assert.strictEqual(approveIncomplete.data.profileComplete, false);

        const resetPending = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { status: 'pending' }
        });
        assert.strictEqual(resetPending.status, 200, JSON.stringify(resetPending.data));
        assert.strictEqual(resetPending.data.status, 'pending');

        const needNote = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { status: 'returned' }
        });
        assert.strictEqual(needNote.status, 400);

        const requestDocs = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: {
                status: 'returned',
                reviewNote: 'کارت ملی و تأییدیه شبا لازم است',
                requestedDocs: [
                    { kind: 'national_card' },
                    { kind: 'bank_certificate', note: 'با مهر بانک' }
                ]
            }
        });
        assert.strictEqual(requestDocs.status, 200, JSON.stringify(requestDocs.data));
        assert.strictEqual(requestDocs.data.status, 'returned');
        assert.strictEqual(requestDocs.data.reviewNote, 'کارت ملی و تأییدیه شبا لازم است');
        assert.ok(Array.isArray(requestDocs.data.requestedDocs));
        assert.strictEqual(requestDocs.data.requestedDocs.length, 2);
        assert.ok(requestDocs.data.requestedDocs.some((item) => item.kind === 'national_card'));
        assert.ok(requestDocs.data.requestedDocs.some((item) => item.kind === 'bank_certificate' && item.note === 'با مهر بانک'));

        const vendorSeesNote = await request('GET', '/api/shop/vendors/me', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(vendorSeesNote.status, 200);
        assert.strictEqual(vendorSeesNote.data.status, 'returned');
        assert.strictEqual(vendorSeesNote.data.reviewNote, 'کارت ملی و تأییدیه شبا لازم است');
        assert.strictEqual((vendorSeesNote.data.requestedDocs || []).length, 2);

        const rejectVendor = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { status: 'rejected', note: 'اطلاعات با مدارک همخوانی ندارد' }
        });
        assert.strictEqual(rejectVendor.status, 200, JSON.stringify(rejectVendor.data));
        assert.strictEqual(rejectVendor.data.status, 'rejected');
        assert.strictEqual(rejectVendor.data.reviewNote, 'اطلاعات با مدارک همخوانی ندارد');
        assert.deepStrictEqual(rejectVendor.data.requestedDocs || [], []);

        const boundary = `----tatkids${Date.now()}`;
        const fileBody = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\nnational_card\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="docs"; filename="card1.txt"\r\nContent-Type: text/plain\r\n\r\ncard-one\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="docs"; filename="card2.txt"\r\nContent-Type: text/plain\r\n\r\ncard-two\r\n`),
            Buffer.from(`--${boundary}--\r\n`)
        ]);
        const docs = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port,
                path: '/api/shop/vendors/me/docs',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${verify.data.token}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': fileBody.length
                }
            }, (res) => {
                let raw = '';
                res.on('data', (chunk) => { raw += chunk; });
                res.on('end', () => {
                    let data = raw;
                    try { data = raw ? JSON.parse(raw) : null; } catch (_) {}
                    resolve({ status: res.statusCode, data });
                });
            });
            req.on('error', reject);
            req.write(fileBody);
            req.end();
        });
        assert.strictEqual(docs.status, 201, JSON.stringify(docs.data));
        assert.ok(docs.data.profileComplete);
        assert.strictEqual(docs.data.status, 'pending');

        const approveVendor = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { status: 'active', commissionPct: 10 }
        });
        assert.strictEqual(approveVendor.status, 200, JSON.stringify(approveVendor.data));
        assert.strictEqual(approveVendor.data.status, 'active');
        assert.strictEqual(approveVendor.data.personKind, 'individual');
        assert.strictEqual(approveVendor.data.reviewNote, '');
        assert.deepStrictEqual(approveVendor.data.requestedDocs || [], []);

        const adminEditVendor = await request('PUT', `/api/admin/vendors/${vendorApply.data.id}`, {
            headers: auth,
            body: { displayName: 'فروشگاه اصلاح‌شده ادمین', phone: '09123334455', commissionPct: 12 }
        });
        assert.strictEqual(adminEditVendor.status, 200, JSON.stringify(adminEditVendor.data));
        assert.strictEqual(adminEditVendor.data.displayName, 'فروشگاه اصلاح‌شده ادمین');
        assert.strictEqual(adminEditVendor.data.phone, '09123334455');
        assert.strictEqual(Number(adminEditVendor.data.commissionPct), 12);
        assert.strictEqual(adminEditVendor.data.status, 'active');

        const vendorDossier = await request('GET', `/api/admin/vendors/${vendorApply.data.id}`, { headers: auth });
        assert.strictEqual(vendorDossier.status, 200, JSON.stringify(vendorDossier.data));
        assert.ok(vendorDossier.data.vendor);
        assert.strictEqual(vendorDossier.data.vendor.displayName, 'فروشگاه اصلاح‌شده ادمین');
        assert.ok(Array.isArray(vendorDossier.data.orders));
        assert.ok(Array.isArray(vendorDossier.data.offers));
        assert.ok(Array.isArray(vendorDossier.data.invoices));
        assert.ok(vendorDossier.data.finance);
        assert.ok(vendorDossier.data.finance.walletAvailable != null);

        const vendorProduct = await request('POST', '/api/vendor/products', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                name: 'حلقه چوبی فروشنده',
                description: 'محصول فروشنده برای تأیید ادمین',
                category: 'لگو',
                price: 120000,
                stock: 4
            }
        });
        assert.strictEqual(vendorProduct.status, 201, JSON.stringify(vendorProduct.data));
        assert.strictEqual(vendorProduct.data.reviewStatus, 'pending');
        assert.strictEqual(vendorProduct.data.active, false);
        assert.strictEqual(vendorProduct.data.gender, 'boy');

        const hiddenVendorProduct = await request('GET', `/api/shop/products/${vendorProduct.data.id}`);
        assert.strictEqual(hiddenVendorProduct.status, 404);

        const approveProduct = await request('PATCH', `/api/admin/products/${vendorProduct.data.id}/review`, {
            headers: auth,
            body: { status: 'approved' }
        });
        assert.strictEqual(approveProduct.status, 200, JSON.stringify(approveProduct.data));
        assert.strictEqual(approveProduct.data.reviewStatus, 'approved');
        assert.strictEqual(approveProduct.data.active, true);

        const editApproved = await request('PUT', `/api/vendor/products/${vendorProduct.data.id}`, {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                name: 'حلقه چوبی فروشنده',
                description: 'توضیح اصلاح‌شده برای پشتیبانی',
                category: 'لگو',
                price: 125000,
                stock: 4
            }
        });
        assert.strictEqual(editApproved.status, 200, JSON.stringify(editApproved.data));
        assert.strictEqual(editApproved.data.reviewStatus, 'pending');
        assert.strictEqual(editApproved.data.active, true);
        const stillOnSite = await request('GET', `/api/shop/products/${vendorProduct.data.id}`);
        assert.strictEqual(stillOnSite.status, 200);
        const reapprove = await request('PATCH', `/api/admin/products/${vendorProduct.data.id}/review`, {
            headers: auth,
            body: { status: 'approved' }
        });
        assert.strictEqual(reapprove.status, 200, JSON.stringify(reapprove.data));

        const finance = await request('GET', '/api/vendor/finance', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(finance.status, 200, JSON.stringify(finance.data));
        assert.ok(finance.data.sales);
        assert.ok(finance.data.walletAvailable != null);

        const vendorOffers = await request('GET', '/api/vendor/offers', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(vendorOffers.status, 200, JSON.stringify(vendorOffers.data));
        assert.ok(Array.isArray(vendorOffers.data.created));
        assert.ok(Array.isArray(vendorOffers.data.listings));

        const vendorCatalog = await request('GET', '/api/vendor/catalog', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(vendorCatalog.status, 200, JSON.stringify(vendorCatalog.data));
        assert.ok(Array.isArray(vendorCatalog.data) && vendorCatalog.data.length >= 1);
        const existingSku = vendorCatalog.data.find((item) => Number(item.id) !== Number(vendorProduct.data.id));
        assert.ok(existingSku, 'catalog must contain another product');
        assert.ok(existingSku.minPrice != null && existingSku.maxPrice != null, JSON.stringify(existingSku));
        assert.ok(Number(existingSku.minPrice) <= Number(existingSku.maxPrice));

        const catalogSearch = await request('GET', `/api/vendor/catalog?q=${encodeURIComponent(String(existingSku.name).slice(0, 4))}`, {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(catalogSearch.status, 200, JSON.stringify(catalogSearch.data));
        assert.ok(catalogSearch.data.some((item) => Number(item.id) === Number(existingSku.id)));

        const badPrice = await request('POST', '/api/vendor/offers', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { productId: existingSku.id, price: 'abc', stock: 1 }
        });
        assert.strictEqual(badPrice.status, 400);

        const sellExisting = await request('POST', '/api/vendor/offers', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { productId: existingSku.id, price: '۲۱۰۰۰۰', stock: '۳' }
        });
        assert.strictEqual(sellExisting.status, 201, JSON.stringify(sellExisting.data));
        assert.strictEqual(Number(sellExisting.data.productId), Number(existingSku.id));
        assert.strictEqual(Number(sellExisting.data.price), 210000);
        assert.strictEqual(Number(sellExisting.data.stock), 3);

        const editPersian = await request('PUT', `/api/vendor/offers/${sellExisting.data.id}`, {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { price: '۲۲۰۰۰۰', stock: '۴' }
        });
        assert.strictEqual(editPersian.status, 200, JSON.stringify(editPersian.data));
        assert.strictEqual(Number(editPersian.data.price), 220000);
        assert.strictEqual(Number(editPersian.data.stock), 4);

        const pdp = await request('GET', `/api/shop/products/${existingSku.id}`);
        assert.strictEqual(pdp.status, 200, JSON.stringify(pdp.data));
        assert.ok(Array.isArray(pdp.data.offers) && pdp.data.offers.length >= 1);
        assert.ok(pdp.data.offers.some((offer) => Number(offer.vendorId) === Number(vendorApply.data.id)));
        assert.ok(Array.isArray(pdp.data.similar));
        assert.ok(Array.isArray(pdp.data.recommended));

        const vendorOffersAfter = await request('GET', '/api/vendor/offers', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(vendorOffersAfter.status, 200, JSON.stringify(vendorOffersAfter.data));
        assert.ok(vendorOffersAfter.data.created.some((item) => Number(item.id) === Number(vendorProduct.data.id)));
        assert.ok(vendorOffersAfter.data.listings.some((item) => Number(item.productId) === Number(existingSku.id)));

        const vendorTicket = await request('POST', '/api/tickets', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                groupName: 'فروشنده',
                subgroup: 'محصول',
                subject: 'سؤال فروشنده',
                content: 'چطور قیمت کالای موجود را عوض کنم؟'
            }
        });
        assert.strictEqual(vendorTicket.status, 201, JSON.stringify(vendorTicket.data));

        const pendingTwo = await request('POST', '/api/vendor/products', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                name: 'کتاب پارچه‌ای فروشنده',
                description: 'نیاز به بررسی عکس',
                category: 'لگو',
                price: 80000,
                stock: 2
            }
        });
        assert.strictEqual(pendingTwo.status, 201, JSON.stringify(pendingTwo.data));
        const rejected = await request('PATCH', `/api/admin/products/${pendingTwo.data.id}/review`, {
            headers: auth,
            body: { status: 'rejected', note: 'عکس واضح‌تر لازم است' }
        });
        assert.strictEqual(rejected.status, 200, JSON.stringify(rejected.data));
        assert.strictEqual(rejected.data.reviewStatus, 'rejected');
        assert.strictEqual(rejected.data.reviewNote, 'عکس واضح‌تر لازم است');

        const resubmit = await request('PUT', `/api/vendor/products/${pendingTwo.data.id}`, {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: {
                name: 'کتاب پارچه‌ای فروشنده',
                category: 'لگو',
                price: 85000,
                stock: 2
            }
        });
        assert.strictEqual(resubmit.status, 200, JSON.stringify(resubmit.data));
        assert.strictEqual(resubmit.data.reviewStatus, 'pending');

        const invoices = await request('GET', '/api/vendor/invoices', {
            headers: { Authorization: `Bearer ${verify.data.token}` }
        });
        assert.strictEqual(invoices.status, 200, JSON.stringify(invoices.data));
        assert.ok(Array.isArray(invoices.data));

        const withdraw = await request('POST', '/api/vendor/wallet/withdraw', {
            headers: { Authorization: `Bearer ${verify.data.token}` },
            body: { amount: 5000 }
        });
        assert.strictEqual(withdraw.status, 400);

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
