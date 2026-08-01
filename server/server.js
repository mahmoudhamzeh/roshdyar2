const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { vaccinationSchedule } = require('./vaccination-schedule');
const { recommendedCheckupsData } = require('./recommendations');

const app = express();
const port = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadsDir, { etag: false, lastModified: false }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const dbPath = path.join(__dirname, 'db.json');

let users, children, growthData, medicalVisits, medicalDocuments, checkups, reminders, childIdCounter, userIdCounter, banners, articles, news, tickets, videos, podcasts;

const loadData = () => {
    if (fs.existsSync(dbPath)) {
        const rawData = fs.readFileSync(dbPath);
        const data = JSON.parse(rawData);
        users = data.users || {};
        children = (data.children || []).map(child => ({
            ...child,
            vaccinationRecords: child.vaccinationRecords || {}
        }));
        growthData = data.growthData || {};
        medicalVisits = data.medicalVisits || {};
        medicalDocuments = data.medicalDocuments || {};
        checkups = data.checkups || {};
        reminders = data.reminders || {};
        childIdCounter = data.childIdCounter || 1;
        const userKeys = Object.keys(users).map(Number).filter(k => !isNaN(k));
        userIdCounter = data.userIdCounter || (userKeys.length ? Math.max(...userKeys) + 1 : 1);
        banners = data.banners || [];
        articles = data.articles || [];
        news = data.news || [];
        tickets = data.tickets || [];
        videos = data.videos || [];
        podcasts = data.podcasts || [];
    } else {
        users = {};
        children = [];
        growthData = {};
        medicalVisits = {};
        medicalDocuments = {};
        checkups = {};
        reminders = {};
        childIdCounter = 1;
        userIdCounter = 1;
        banners = [];
        articles = [];
        news = [];
        tickets = [];
        videos = [];
        podcasts = [];
    }
};

loadData();

const saveData = () => {
    const data = JSON.stringify({
        users,
        children,
        growthData,
        medicalVisits,
        medicalDocuments,
        checkups,
        reminders,
        childIdCounter,
        userIdCounter,
        banners,
        articles,
        news,
        tickets,
        videos,
        podcasts
    }, null, 2);
    fs.writeFileSync(dbPath, data);
};

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function calculateAgeInMonths(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(String(birthDate).replace(/\//g, '-'));
    if (Number.isNaN(birth.getTime())) return 0;
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
}

function getChildDisplayName(child) {
    if (!child) return 'کودک';
    if (child.name) return child.name;
    return `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'کودک';
}

function normalizeChildName(childData) {
    if (!childData) return childData;
    if (childData.firstName || childData.lastName) {
        childData.name = `${childData.firstName || ''} ${childData.lastName || ''}`.trim();
    } else if (childData.name && !childData.firstName) {
        const parts = String(childData.name).trim().split(/\s+/);
        childData.firstName = parts[0] || '';
        childData.lastName = parts.slice(1).join(' ');
    }
    return childData;
}

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const user = Object.values(users).find(u => (u.username === login || u.email === login) && u.password === password);
    if (user) {
        const { password, ...userToSend } = user;
        res.status(200).json({ message: 'ورود موفقیت‌آمیز', user: userToSend });
    } else {
        res.status(401).json({ message: 'نام کاربری یا رمز عبور نامعتبر است' });
    }
});

app.post('/api/signup', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });

    const existingUser = Object.values(users).find(u => u.username === login || u.email === login);
    if (existingUser) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده است' });

    const newId = userIdCounter++;
    const newUser = { id: newId, username: login, email: login, password, isAdmin: false };
    users[String(newId)] = newUser;
    saveData();
    res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.' });
});

// --- User Profile Routes ---
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const user = users[id];
    if (user) {
        const { password, ...userToSend } = user;
        res.json(userToSend);
    } else res.status(404).json({ message: 'کاربر یافت نشد' });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    if (!users[id]) return res.status(404).json({ message: 'کاربر یافت نشد' });

    // Only allow safe profile fields from the client (prevents isAdmin escalation)
    const { firstName, lastName, birthDate, province, city, mobile, email } = req.body;
    users[id] = {
        ...users[id],
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
    };
    saveData();
    const { password, ...updatedUser } = users[id];
    res.json({ message: 'اطلاعات با موفقیت ذخیره شد.', user: updatedUser });
});

app.put('/api/users/:id/password', (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const user = users[id];

    if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: 'رمز عبور فعلی اشتباه است' });
    }
    if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
    }

    users[id].password = newPassword;
    saveData();
    res.status(200).json({ message: 'رمز عبور با موفقیت تغییر کرد' });
});

// --- Children Routes ---
app.get('/api/children', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'User ID is required' });
    const userChildren = children
        .filter(c => c.userId === parseInt(userId))
        .map(c => ({ ...c, name: getChildDisplayName(c) }));
    res.json(userChildren);
});

app.post('/api/children', (req, res) => {
    const childData = req.body;
    if (!childData || !childData.userId) {
        return res.status(400).json({ message: 'Child data and userId are required' });
    }
    normalizeChildName(childData);
    const newChild = {
        ...childData,
        id: childIdCounter++,
        userId: parseInt(childData.userId, 10),
        vaccinationRecords: childData.vaccinationRecords || {}
    };
    children.push(newChild);

    // Seed growth data from birth measurements when available
    const birthHeight = parseFloat(childData.height || childData.birthHeight);
    const birthWeight = parseFloat(childData.weight || childData.birthWeight);
    const birthHead = parseFloat(childData.birthHeadCircumference);
    if (childData.birthDate && (birthHeight || birthWeight || birthHead)) {
        growthData[String(newChild.id)] = [{
            date: String(childData.birthDate).replace(/\//g, '-'),
            ...(birthHeight ? { height: birthHeight } : {}),
            ...(birthWeight ? { weight: birthWeight > 100 ? birthWeight / 1000 : birthWeight } : {}),
            ...(birthHead ? { headCircumference: birthHead } : {}),
        }];
    }

    medicalVisits[String(newChild.id)] = medicalVisits[String(newChild.id)] || [];
    medicalDocuments[String(newChild.id)] = medicalDocuments[String(newChild.id)] || [];
    checkups[String(newChild.id)] = checkups[String(newChild.id)] || [];
    reminders[String(newChild.id)] = reminders[String(newChild.id)] || [];

    saveData();
    res.status(201).json({ ...newChild, growthData: growthData[String(newChild.id)] || [] });
});

app.get('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const child = children.find(c => c.id === parseInt(childId));
    if (child) {
        res.json({
            ...child,
            name: getChildDisplayName(child),
            growthData: growthData[childId] || growthData[String(childId)] || []
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const updatedData = { ...req.body };
    const childIndex = children.findIndex(c => c.id === parseInt(childId));

    if (childIndex !== -1) {
        normalizeChildName(updatedData);
        // Never let clients overwrite the id via body
        delete updatedData.id;
        delete updatedData.growthData;
        children[childIndex] = { ...children[childIndex], ...updatedData };
        saveData();
        res.status(200).json({
            ...children[childIndex],
            name: getChildDisplayName(children[childIndex]),
            growthData: growthData[childId] || growthData[String(childId)] || []
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.delete('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const idKey = String(childId);
    const initialLength = children.length;
    children = children.filter(c => c.id !== parseInt(childId));
    if (children.length < initialLength) {
        // Also delete associated data
        delete growthData[childId];
        delete growthData[idKey];
        delete medicalVisits[childId];
        delete medicalVisits[idKey];
        delete medicalDocuments[childId];
        delete medicalDocuments[idKey];
        delete checkups[childId];
        delete checkups[idKey];
        delete reminders[childId];
        delete reminders[idKey];
        saveData();
        res.status(200).json({ message: 'کودک و تمام اطلاعات مربوطه با موفقیت حذف شدند' });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId/vaccination-records', (req, res) => {
    const { childId } = req.params;
    const { vaccinationRecords } = req.body;
    const childIndex = children.findIndex(c => c.id === parseInt(childId));
    if (childIndex !== -1) {
        children[childIndex].vaccinationRecords = vaccinationRecords;
        saveData();
        res.status(200).json(children[childIndex]);
    } else res.status(404).json({ message: 'کودک یافت نشد' });
});

app.post('/api/children/:childId/avatar', upload.single('avatar'), (req, res) => {
    const { childId } = req.params;
    const userId = req.headers['x-user-id'];
    const childIndex = children.findIndex(c => c.id === parseInt(childId));

    if (childIndex === -1) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (!userId || children[childIndex].userId !== Number(userId)) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز برای تغییر عکس این کودک' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'فایل عکس انتخاب نشده است' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    children[childIndex].avatar = avatarPath;
    saveData();
    res.status(200).json({ message: 'عکس با موفقیت آپلود شد', filePath: avatarPath });
});

// --- Growth Data Routes ---
app.get('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    res.json(growthData[childId] || growthData[String(childId)] || []);
});

app.post('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    const { date, height, weight, headCircumference } = req.body;
    if (!date || (!height && !weight && !headCircumference)) {
        return res.status(400).json({ message: 'تاریخ و حداقل یک اندازه‌گیری الزامی است.' });
    }
    if (!children.find(c => c.id === parseInt(childId))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const key = String(childId);
    if (!growthData[key]) growthData[key] = [];

    const newRecord = {
        date,
        height: height !== undefined && height !== '' ? parseFloat(height) : undefined,
        weight: weight !== undefined && weight !== '' ? parseFloat(weight) : undefined,
        headCircumference: headCircumference !== undefined && headCircumference !== '' ? parseFloat(headCircumference) : undefined
    };
    growthData[key].push(newRecord);
    growthData[key].sort((a, b) => new Date(String(a.date).replace(/\//g, '-')) - new Date(String(b.date).replace(/\//g, '-')));
    saveData();
    res.status(201).json(newRecord);
});

app.delete('/api/growth/:childId/:date', (req, res) => {
    const { childId, date } = req.params;
    const key = String(childId);
    if (!growthData[key]) return res.status(404).json({ message: 'داده‌ای یافت نشد' });
    const initialLength = growthData[key].length;
    growthData[key] = growthData[key].filter(record => record.date !== date);
    if (growthData[key].length < initialLength) {
        saveData();
        res.status(200).json({ message: 'رکورد حذف شد' });
    } else {
        res.status(404).json({ message: 'رکورد یافت نشد' });
    }
});

// --- Vaccination Status Routes ---
app.get('/api/vaccination-status/:childId', (req, res) => {
    const { childId } = req.params;
    const child = children.find(c => c.id === parseInt(childId));
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const ageInMonths = calculateAgeInMonths(child.birthDate);
    const records = child.vaccinationRecords || {};
    const status = [];

    vaccinationSchedule.forEach(group => {
        group.vaccines.forEach((vaccine, index) => {
            const isDone = !!(records[group.age] && records[group.age][vaccine.name]);
            let vaccineStatus = 'upcoming';
            if (isDone) {
                vaccineStatus = 'done';
            } else if (ageInMonths > group.age + 2) {
                vaccineStatus = 'overdue';
            } else if (ageInMonths < group.age) {
                vaccineStatus = 'future';
            }
            status.push({
                name: vaccine.name,
                dose: vaccine.details || String(index + 1),
                month: group.age,
                age: group.age,
                status: vaccineStatus,
                administeredDate: typeof (records[group.age] && records[group.age][vaccine.name]) === 'string'
                    ? records[group.age][vaccine.name]
                    : null
            });
        });
    });

    res.json(status);
});

app.post('/api/vaccinate/:childId', (req, res) => {
    const { childId } = req.params;
    const { vaccineName, dose, date, age } = req.body;
    const childIndex = children.findIndex(c => c.id === parseInt(childId));
    if (childIndex === -1) return res.status(404).json({ message: 'کودک یافت نشد' });

    const child = children[childIndex];
    if (!child.vaccinationRecords) child.vaccinationRecords = {};

    let targetAge = age !== undefined ? Number(age) : null;
    if (targetAge === null || Number.isNaN(targetAge)) {
        // Resolve age group from schedule using vaccine name (+ optional dose/details)
        const match = vaccinationSchedule.find(group =>
            group.vaccines.some(v => v.name === vaccineName && (!dose || v.details === dose || String(v.details) === String(dose)))
        ) || vaccinationSchedule.find(group => group.vaccines.some(v => v.name === vaccineName));
        if (!match) return res.status(404).json({ message: 'واکسن در برنامه یافت نشد' });
        targetAge = match.age;
    }

    if (!child.vaccinationRecords[targetAge]) child.vaccinationRecords[targetAge] = {};
    child.vaccinationRecords[targetAge][vaccineName] = date || true;
    saveData();
    res.status(200).json({ message: 'وضعیت واکسن به‌روز شد', vaccinationRecords: child.vaccinationRecords });
});

// --- Medical Data Routes ---
app.get('/api/visits/:childId', (req, res) => {
    const { childId } = req.params;
    res.json(medicalVisits[childId] || medicalVisits[String(childId)] || []);
});

app.post('/api/visits/:childId', (req, res) => {
    const { childId } = req.params;
    const { date, doctorName, reason, summary } = req.body;
    if (!date || !doctorName || !reason) {
        return res.status(400).json({ message: 'تاریخ، نام پزشک و علت مراجعه الزامی است' });
    }
    if (!children.find(c => c.id === parseInt(childId))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const key = String(childId);
    if (!medicalVisits[key]) medicalVisits[key] = [];
    const newVisit = { id: Date.now(), date, doctorName, reason, summary };
    medicalVisits[key].push(newVisit);
    medicalVisits[key].sort((a, b) => new Date(String(b.date).replace(/\//g, '-')) - new Date(String(a.date).replace(/\//g, '-')));
    saveData();
    res.status(201).json(newVisit);
});

app.get('/api/checkups/:childId', (req, res) => {
    const { childId } = req.params;
    res.json(checkups[childId] || checkups[String(childId)] || []);
});

app.post('/api/checkups/:childId', upload.single('checkupFile'), (req, res) => {
    const { childId } = req.params;
    const { title, date, parameters } = req.body;

    if (!title || !date || !parameters) {
        return res.status(400).json({ message: 'عنوان، تاریخ و پارامترها الزامی هستند.' });
    }
    if (!children.find(c => c.id === parseInt(childId))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const key = String(childId);
    if (!checkups[key]) checkups[key] = [];

    let parsedParameters;
    try {
        parsedParameters = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
    } catch (err) {
        return res.status(400).json({ message: 'فرمت پارامترها نامعتبر است.' });
    }

    const newCheckup = {
        id: Date.now(),
        title,
        date,
        parameters: parsedParameters,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    };

    checkups[key].push(newCheckup);
    checkups[key].sort((a, b) => new Date(b.date) - new Date(a.date));
    saveData();
    res.status(201).json(newCheckup);
});

app.get('/api/documents/:childId', (req, res) => {
    const { childId } = req.params;
    res.json(medicalDocuments[childId] || medicalDocuments[String(childId)] || []);
});

app.post('/api/documents/:childId', upload.single('document'), (req, res) => {
    const { childId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'فایل مدرک الزامی است' });
    }
    const key = String(childId);
    if (!medicalDocuments[key]) {
        medicalDocuments[key] = [];
    }
    const filePath = `/uploads/${req.file.filename}`;
    const newDocument = {
        id: Date.now(),
        title: req.body.title || req.file.originalname,
        url: filePath,
        filePath, // backward-compatible with EditChildPage
        uploadedAt: new Date().toISOString()
    };
    medicalDocuments[key].push(newDocument);
    saveData();
    res.status(201).json(newDocument);
});

app.get('/api/recommended-tests/:childId', (req, res) => {
    const { childId } = req.params;
    const child = children.find(c => c.id === parseInt(childId));
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const ageInMonths = calculateAgeInMonths(child.birthDate);
    let ageGroup = '24-60';
    if (ageInMonths <= 6) ageGroup = '0-6';
    else if (ageInMonths <= 12) ageGroup = '6-12';
    else if (ageInMonths <= 24) ageGroup = '12-24';

    res.json(recommendedCheckupsData[ageGroup] || []);
});

// --- Admin Middleware ---
const isAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'دسترسی غیرمجاز: شناسه کاربری ارائه نشده است' });
    const user = users[userId];
    if (user && user.isAdmin) next();
    else res.status(403).json({ message: 'دسترسی غیرمجاز: شما مدیر نیستید' });
};

// --- Admin Routes ---
app.get('/api/admin/users', isAdmin, (req, res) => {
    const usersWithoutPasswords = Object.values(users).map(u => {
        const { password, ...user } = u;
        return user;
    });
    res.json(usersWithoutPasswords);
});

app.put('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const userData = req.body;
    if (!users[id]) return res.status(404).json({ message: 'کاربر یافت نشد' });

    delete userData.password;
    const requestingUserId = req.headers['x-user-id'];
    if (id === requestingUserId && users[id].isAdmin && !userData.isAdmin) return res.status(400).json({ message: 'شما نمی‌توانید دسترسی ادمین خود را لغو کنید.' });

    users[id] = { ...users[id], ...userData };
    saveData();
    const { password, ...updatedUser } = users[id];
    res.json(updatedUser);
});

app.delete('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    if (!users[id]) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const requestingUserId = req.headers['x-user-id'];
    if (id === requestingUserId) return res.status(400).json({ message: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.' });

    delete users[id];
    saveData();
    res.status(200).json({ message: 'کاربر با موفقیت حذف شد' });
});

app.get('/api/admin/users/:userId/children', isAdmin, (req, res) => {
    const { userId } = req.params;
    const userChildren = children.filter(c => c.userId === parseInt(userId));
    res.json(userChildren);
});

app.put('/api/admin/users/:id/set-password', isAdmin, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!users[id]) return res.status(404).json({ message: 'کاربر یافت نشد' });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });

    users[id].password = newPassword;
    saveData();
    res.status(200).json({ message: 'رمز عبور کاربر با موفقیت تغییر کرد' });
});

app.get('/api/admin/tickets', isAdmin, (req, res) => {
    res.json(tickets);
});

app.get('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const ticket = tickets.find(t => t.id === parseInt(req.params.id));
    if (ticket) res.json(ticket);
    else res.status(404).json({ message: 'تیکت یافت نشد' });
});

app.put('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { status, reply } = req.body;
    const ticketIndex = tickets.findIndex(t => t.id === parseInt(id));
    if (ticketIndex === -1) return res.status(404).json({ message: 'تیکت یافت نشد' });

    const ticket = tickets[ticketIndex];
    if (status) ticket.status = status;
    if (reply) {
        ticket.replies = ticket.replies || [];
        ticket.replies.push({
            userId: req.headers['x-user-id'],
            content: reply,
            createdAt: new Date().toISOString()
        });
        ticket.status = 'answered';
    }
    ticket.updatedAt = new Date().toISOString();
    tickets[ticketIndex] = ticket;
    saveData();
    res.json(ticket);
});

app.get('/api/admin/stats', isAdmin, (req, res) => {
    res.json({
        totalUsers: Object.keys(users).length,
        totalChildren: children.length,
        totalBanners: banners.length,
        totalArticles: news.length,
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length
    });
});

// --- Banner, News, Video, Podcast Routes (Content Management) ---
app.get('/api/banners', (req, res) => res.set('Cache-Control', 'no-store').json(banners));
app.post('/api/admin/banners', isAdmin, upload.single('image'), (req, res) => {
    const { title, link } = req.body;
    if (!req.file) return res.status(400).json({ message: 'تصویر بنر الزامی است' });
    const newBanner = { id: Date.now(), title, link, imageUrl: `/uploads/${req.file.filename}` };
    banners.push(newBanner);
    saveData();
    res.status(201).json(newBanner);
});
app.delete('/api/admin/banners/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const initialLength = banners.length;
    banners = banners.filter(b => b.id !== parseInt(id));
    if (banners.length < initialLength) { saveData(); res.status(200).json({ message: 'بنر با موفقیت حذف شد' }); }
    else res.status(404).json({ message: 'بنر یافت نشد' });
});

app.get('/api/news', (req, res) => res.json(news));
app.get('/api/news/:id', (req, res) => {
    const article = news.find(n => n.id === parseInt(req.params.id));
    if (article) res.json(article);
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});
app.post('/api/admin/news', isAdmin, upload.single('image'), (req, res) => {
    const { title, content, summary, category } = req.body;
    const newArticle = { id: Date.now(), title, summary, content, category: category || 'عمومی', imageUrl: req.file ? `/uploads/${req.file.filename}` : null, createdAt: new Date().toISOString() };
    news.unshift(newArticle);
    saveData();
    res.status(201).json(newArticle);
});
app.put('/api/admin/news/:id', isAdmin, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, content, summary, category } = req.body;
    const articleIndex = news.findIndex(n => n.id === parseInt(id));
    if (articleIndex === -1) return res.status(404).json({ message: 'مقاله یافت نشد' });

    const updatedArticle = { ...news[articleIndex], title, summary, content, category: category || news[articleIndex].category, updatedAt: new Date().toISOString() };
    if (req.file) updatedArticle.imageUrl = `/uploads/${req.file.filename}`;
    news[articleIndex] = updatedArticle;
    saveData();
    res.json(updatedArticle);
});
app.delete('/api/admin/news/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const initialLength = news.length;
    news = news.filter(n => n.id !== parseInt(id));
    if (news.length < initialLength) { saveData(); res.status(200).json({ message: 'مقاله با موفقیت حذف شد' }); }
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});

app.get('/api/videos', (req, res) => res.json(videos));
app.post('/api/admin/videos', isAdmin, (req, res) => {
    const { title, url, summary } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Title and URL are required' });
    const newVideo = { id: Date.now(), title, url, summary, createdAt: new Date().toISOString() };
    videos.unshift(newVideo);
    saveData();
    res.status(201).json(newVideo);
});
app.delete('/api/admin/videos/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const initialLength = videos.length;
    videos = videos.filter(v => v.id !== parseInt(id));
    if (videos.length < initialLength) { saveData(); res.status(200).json({ message: 'ویدیو با موفقیت حذف شد' }); }
    else res.status(404).json({ message: 'ویدیو یافت نشد' });
});

app.get('/api/podcasts', (req, res) => res.json(podcasts));

// --- Reminder / Vaccination ---
const getOverdueVaccinationReminders = (child) => {
    const ageInMonths = calculateAgeInMonths(new Date(child.birthDate));
    const childVaccinations = child.vaccinationRecords || {};
    const remindersList = [];
    vaccinationSchedule.forEach(group => {
        if (ageInMonths >= group.age) {
            group.vaccines.forEach(vaccine => {
                if (!childVaccinations[group.age] || !childVaccinations[group.age][vaccine.name]) {
                    remindersList.push({
                        id: `vaccine-${child.id}-${group.age}-${vaccine.name}`,
                        title: `تأخیر در واکسن: ${vaccine.name}`,
                        message: `واکسن ${vaccine.name} (${group.label}) کودک شما به تأخیر افتاده است.`,
                        type: 'danger',
                        link: `/vaccination-status/${child.id}`,
                        source: 'auto'
                    });
                }
            });
        }
    });
    return remindersList;
};

app.get('/api/vaccination-schedule', (req, res) => res.json(vaccinationSchedule));

app.post('/api/generate-reminders/:userId', (req, res) => {
    const { userId } = req.params;
    const userChildren = children.filter(c => c.userId === parseInt(userId));
    let created = 0;

    userChildren.forEach(child => {
        const childKey = String(child.id);
        if (!reminders[childKey]) reminders[childKey] = [];
        const ageInMonths = calculateAgeInMonths(child.birthDate);
        const childVaccinations = child.vaccinationRecords || {};
        const childName = getChildDisplayName(child);

        vaccinationSchedule.forEach(group => {
            if (ageInMonths < group.age - 1) return;
            group.vaccines.forEach(vaccine => {
                const reminderId = `generated-vaccine-${child.id}-${group.age}-${vaccine.name}`;
                const alreadyExists = reminders[childKey].some(r => r.id === reminderId);
                const isDone = childVaccinations[group.age] && childVaccinations[group.age][vaccine.name];
                if (!alreadyExists && !isDone) {
                    reminders[childKey].push({
                        id: reminderId,
                        title: `واکسن ${vaccine.name}`,
                        date: new Date().toISOString().split('T')[0],
                        message: `واکسن ${vaccine.name} (${group.label}) برای ${childName}`,
                        type: ageInMonths >= group.age ? 'danger' : 'info',
                        link: `/vaccination-status/${child.id}`,
                        source: 'manual'
                    });
                    created++;
                }
            });
        });
    });

    saveData();
    res.status(201).json({ message: 'یادآورها با موفقیت تولید شدند', created });
});

app.get('/api/reminders/all/:childId', (req, res) => {
    const { childId } = req.params;
    const child = children.find(c => c.id === parseInt(childId));
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const manualReminders = reminders[childId] || [];
    const autoReminders = getOverdueVaccinationReminders(child);
    res.json([...autoReminders, ...manualReminders]);
});

app.post('/api/reminders/manual/:childId', (req, res) => {
    const { childId } = req.params;
    const { title, date } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'عنوان و تاریخ الزامی است' });

    if (!reminders[childId]) reminders[childId] = [];
    // The message will be constructed on the client-side to ensure consistent date formatting.
    const newReminder = { id: `manual-${Date.now()}`, title, date, type: 'info', source: 'manual' };
    reminders[childId].push(newReminder);
    saveData();
    res.status(201).json(newReminder);
});

app.delete('/api/reminders/manual/:childId/:reminderId', (req, res) => {
    const { childId, reminderId } = req.params;
    if (!reminders[childId]) return res.status(404).json({ message: 'هیچ یادآوری برای این کودک یافت نشد' });

    const initialLength = reminders[childId].length;
    reminders[childId] = reminders[childId].filter(r => r.id !== reminderId);
    if (reminders[childId].length < initialLength) { saveData(); res.status(200).json({ message: 'یادآوری با موفقیت حذف شد' }); }
    else res.status(404).json({ message: 'یادآوری مشخص شده یافت نشد' });
});

app.listen(port, () => console.log(`Roshdyar server is listening on port ${port}`));
