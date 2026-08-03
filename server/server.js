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

let users, children, growthData, medicalVisits, medicalDocuments, checkups, reminders, userReminders, messages, childIdCounter, userIdCounter, messageIdCounter, banners, articles, news, tickets, videos, podcasts;

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
        userReminders = data.userReminders || {};
        messages = data.messages || [];
        childIdCounter = data.childIdCounter || 1;
        const userKeys = Object.keys(users).map(Number).filter(k => !isNaN(k));
        userIdCounter = data.userIdCounter || (userKeys.length ? Math.max(...userKeys) + 1 : 1);
        messageIdCounter = data.messageIdCounter || (messages.length ? Math.max(...messages.map(m => m.id || 0)) + 1 : 1);
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
        userReminders = {};
        messages = [];
        childIdCounter = 1;
        userIdCounter = 1;
        messageIdCounter = 1;
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
        userReminders,
        messages,
        childIdCounter,
        userIdCounter,
        messageIdCounter,
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

// --- Growth Data Helpers & Routes ---
const normalizeGrowthDate = (value) => {
    if (!value) return '';
    const match = String(value).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return '';
    const y = match[1];
    const m = String(match[2]).padStart(2, '0');
    const d = String(match[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseOptionalNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(num) ? num : null;
};

const compareGrowthDates = (a, b) => {
    const da = normalizeGrowthDate(a) || String(a || '');
    const db = normalizeGrowthDate(b) || String(b || '');
    return da.localeCompare(db);
};

const ensureGrowthRecordIds = (records) => {
    let changed = false;
    const next = (records || []).map((record, index) => {
        if (record && record.id) return record;
        changed = true;
        return {
            ...record,
            id: `g-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            date: normalizeGrowthDate(record?.date) || record?.date
        };
    });
    return { records: next, changed };
};

const getGrowthList = (childId) => {
    const key = String(childId);
    const ensured = ensureGrowthRecordIds(growthData[key] || growthData[childId] || []);
    if (ensured.changed) {
        growthData[key] = ensured.records;
        saveData();
    }
    return growthData[key] || [];
};

app.get('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    if (!children.find(c => c.id === parseInt(childId, 10))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const list = getGrowthList(childId).slice().sort((a, b) => compareGrowthDates(a.date, b.date));
    res.json(list);
});

app.post('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    const date = normalizeGrowthDate(req.body?.date);
    const height = parseOptionalNumber(req.body?.height);
    const weight = parseOptionalNumber(req.body?.weight);
    const headCircumference = parseOptionalNumber(req.body?.headCircumference);

    if (!date) {
        return res.status(400).json({ message: 'تاریخ معتبر الزامی است.' });
    }
    if (height == null && weight == null && headCircumference == null) {
        return res.status(400).json({ message: 'حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.' });
    }
    if (!children.find(c => c.id === parseInt(childId, 10))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const key = String(childId);
    const list = getGrowthList(childId);
    const existingIndex = list.findIndex((r) => normalizeGrowthDate(r.date) === date);

    const record = {
        id: existingIndex >= 0 ? list[existingIndex].id : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        height,
        weight,
        headCircumference
    };

    if (existingIndex >= 0) {
        list[existingIndex] = record;
    } else {
        list.push(record);
    }

    list.sort((a, b) => compareGrowthDates(a.date, b.date));
    growthData[key] = list;
    saveData();
    res.status(existingIndex >= 0 ? 200 : 201).json(record);
});

app.put('/api/growth/:childId/record/:recordId', (req, res) => {
    const { childId, recordId } = req.params;
    if (!children.find(c => c.id === parseInt(childId, 10))) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const key = String(childId);
    const list = getGrowthList(childId);
    const index = list.findIndex((r) => String(r.id) === String(recordId));
    if (index < 0) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }

    const date = normalizeGrowthDate(req.body?.date) || normalizeGrowthDate(list[index].date);
    const height = req.body?.height !== undefined ? parseOptionalNumber(req.body.height) : list[index].height;
    const weight = req.body?.weight !== undefined ? parseOptionalNumber(req.body.weight) : list[index].weight;
    const headCircumference = req.body?.headCircumference !== undefined
        ? parseOptionalNumber(req.body.headCircumference)
        : list[index].headCircumference;

    if (!date) {
        return res.status(400).json({ message: 'تاریخ معتبر الزامی است.' });
    }
    if (height == null && weight == null && headCircumference == null) {
        return res.status(400).json({ message: 'حداقل یکی از موارد قد، وزن یا دور سر را وارد کنید.' });
    }

    const duplicate = list.findIndex((r, i) => i !== index && normalizeGrowthDate(r.date) === date);
    if (duplicate >= 0) {
        return res.status(400).json({ message: 'برای این تاریخ قبلاً رکورد دیگری ثبت شده است.' });
    }

    list[index] = {
        id: list[index].id,
        date,
        height,
        weight,
        headCircumference
    };
    list.sort((a, b) => compareGrowthDates(a.date, b.date));
    growthData[key] = list;
    saveData();
    res.json(list[index]);
});

app.delete('/api/growth/:childId/record/:recordId', (req, res) => {
    const { childId, recordId } = req.params;
    const key = String(childId);
    const list = getGrowthList(childId);
    const next = list.filter((record) => String(record.id) !== String(recordId));
    if (next.length === list.length) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    growthData[key] = next;
    saveData();
    res.json({ message: 'رکورد حذف شد' });
});

app.delete('/api/growth/:childId/:date', (req, res) => {
    const { childId, date } = req.params;
    const key = String(childId);
    const normalized = normalizeGrowthDate(decodeURIComponent(date));
    const list = getGrowthList(childId);
    const next = list.filter((record) => normalizeGrowthDate(record.date) !== normalized && record.date !== date);
    if (next.length === list.length) {
        return res.status(404).json({ message: 'رکورد یافت نشد' });
    }
    growthData[key] = next;
    saveData();
    res.status(200).json({ message: 'رکورد حذف شد' });
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
const childHasOverdueVaccination = (child) => {
    const ageInMonths = calculateAgeInMonths(new Date(child.birthDate));
    const childVaccinations = child.vaccinationRecords || {};
    return vaccinationSchedule.some(group => {
        if (ageInMonths < group.age) return false;
        return group.vaccines.some(vaccine =>
            !childVaccinations[group.age] || !childVaccinations[group.age][vaccine.name]
        );
    });
};

// One consolidated message per child for vaccine injection delay
const getOverdueVaccinationReminders = (child) => {
    if (!childHasOverdueVaccination(child)) return [];
    return [{
        id: `vaccine-delay-${child.id}`,
        title: 'تاخیر در تزریق واکس',
        message: 'تاخیر در تزریق واکس',
        type: 'danger',
        link: `/vaccination-status/${child.id}`,
        source: 'auto',
        category: 'vaccine_delay'
    }];
};

const getVaccineDelayMessagesForUser = (userId) => {
    const userChildren = children.filter(c => c.userId === parseInt(userId, 10));
    return userChildren
        .filter(childHasOverdueVaccination)
        .map(child => ({
            id: `vaccine-delay-${child.id}`,
            title: 'تاخیر در تزریق واکس',
            body: 'تاخیر در تزریق واکس',
            link: `/vaccination-status/${child.id}`,
            imageUrl: null,
            type: 'vaccine_delay',
            source: 'auto',
            createdAt: new Date().toISOString(),
            isRead: false,
            childId: child.id,
            childName: getChildDisplayName(child)
        }));
};

app.get('/api/vaccination-schedule', (req, res) => res.json(vaccinationSchedule));

app.post('/api/generate-reminders/:userId', (req, res) => {
    const { userId } = req.params;
    const userChildren = children.filter(c => c.userId === parseInt(userId));
    let created = 0;

    userChildren.forEach(child => {
        const childKey = String(child.id);
        if (!reminders[childKey]) reminders[childKey] = [];
        const reminderId = `generated-vaccine-delay-${child.id}`;
        const alreadyExists = reminders[childKey].some(r => r.id === reminderId || r.id === `vaccine-delay-${child.id}`);

        if (!alreadyExists && childHasOverdueVaccination(child)) {
            reminders[childKey].push({
                id: reminderId,
                title: 'تاخیر در تزریق واکس',
                date: new Date().toISOString().split('T')[0],
                message: 'تاخیر در تزریق واکس',
                type: 'danger',
                link: `/vaccination-status/${child.id}`,
                source: 'manual',
                category: 'vaccine_delay'
            });
            created++;
        }
    });

    saveData();
    res.status(201).json({ message: 'یادآورها با موفقیت تولید شدند', created });
});

app.get('/api/reminders/all/:childId', (req, res) => {
    const { childId } = req.params;
    const child = children.find(c => c.id === parseInt(childId));
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const manualReminders = (reminders[childId] || []).filter(r => {
        if (r.category === 'vaccine_delay') return false;
        if (r.id && String(r.id).startsWith('generated-vaccine')) return false;
        if (r.title && (r.title.includes('تأخیر در واکسن') || r.title.includes('تاخیر در تزریق'))) return false;
        return true;
    });
    const autoReminders = getOverdueVaccinationReminders(child);
    res.json([...autoReminders, ...manualReminders]);
});

app.post('/api/reminders/manual/:childId', (req, res) => {
    const { childId } = req.params;
    const { title, date, description, alarmAt } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'عنوان و تاریخ الزامی است' });

    if (!reminders[childId]) reminders[childId] = [];
    const newReminder = {
        id: `manual-${Date.now()}`,
        title,
        date,
        description: description || '',
        message: description || '',
        alarmAt: alarmAt || null,
        type: 'info',
        source: 'manual'
    };
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

// --- User personal reminders / alarms ---
app.get('/api/user-reminders', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    const list = userReminders[String(userId)] || [];
    res.json(list);
});

app.post('/api/user-reminders', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    if (!users[userId]) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const { title, description, alarmAt } = req.body;
    if (!title || !alarmAt) {
        return res.status(400).json({ message: 'عنوان و زمان آلارم الزامی است' });
    }
    if (Number.isNaN(new Date(alarmAt).getTime())) {
        return res.status(400).json({ message: 'زمان آلارم نامعتبر است' });
    }

    const key = String(userId);
    if (!userReminders[key]) userReminders[key] = [];
    const newReminder = {
        id: `user-reminder-${Date.now()}`,
        title,
        description: description || '',
        alarmAt: new Date(alarmAt).toISOString(),
        createdAt: new Date().toISOString(),
        notified: false,
        type: 'info',
        source: 'user'
    };
    userReminders[key].push(newReminder);
    saveData();
    res.status(201).json(newReminder);
});

app.put('/api/user-reminders/:id', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    const key = String(userId);
    const list = userReminders[key] || [];
    const index = list.findIndex(r => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'یادآوری یافت نشد' });

    const { title, description, alarmAt, notified } = req.body;
    if (title !== undefined) list[index].title = title;
    if (description !== undefined) list[index].description = description;
    if (alarmAt !== undefined) {
        if (Number.isNaN(new Date(alarmAt).getTime())) {
            return res.status(400).json({ message: 'زمان آلارم نامعتبر است' });
        }
        list[index].alarmAt = new Date(alarmAt).toISOString();
    }
    if (notified !== undefined) list[index].notified = !!notified;
    userReminders[key] = list;
    saveData();
    res.json(list[index]);
});

app.delete('/api/user-reminders/:id', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });
    const key = String(userId);
    const list = userReminders[key] || [];
    const initialLength = list.length;
    userReminders[key] = list.filter(r => r.id !== req.params.id);
    if (userReminders[key].length < initialLength) {
        saveData();
        return res.status(200).json({ message: 'یادآوری حذف شد' });
    }
    res.status(404).json({ message: 'یادآوری یافت نشد' });
});

// --- Messages (inbox) ---
const toUserId = (value) => {
    const id = parseInt(value, 10);
    return Number.isNaN(id) ? null : id;
};

const getUserById = (id) => {
    const key = String(id);
    return users[key] || users[id] || null;
};

const messageHasRecipient = (message, userId) => {
    if (!message || !Array.isArray(message.recipientIds)) return false;
    const target = Number(userId);
    return message.recipientIds.some(id => Number(id) === target);
};

const messageIsReadBy = (message, userId) => {
    if (!message || !Array.isArray(message.readBy)) return false;
    const target = Number(userId);
    return message.readBy.some(id => Number(id) === target);
};

const normalizeMobile = (mobile) => {
    if (mobile === undefined || mobile === null) return '';
    let value = String(mobile).trim();
    value = value.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    value = value.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    value = value.replace(/[^\d+]/g, '');
    if (value.startsWith('+98')) value = `0${value.slice(3)}`;
    else if (value.startsWith('0098')) value = `0${value.slice(4)}`;
    else if (value.startsWith('98') && value.length >= 12) value = `0${value.slice(2)}`;
    if (value.length === 10 && value.startsWith('9')) value = `0${value}`;
    return value;
};

const parseMobilesFromText = (text) => {
    if (!text) return [];
    return String(text)
        .split(/[\n\r,;|\t]+/)
        .map(normalizeMobile)
        .filter(mobile => mobile.length >= 10);
};

const findUserIdsByMobiles = (mobileList) => {
    const normalizedSet = new Set(mobileList.map(normalizeMobile).filter(Boolean));
    const matchedIds = [];
    const unmatchedMobiles = [];

    normalizedSet.forEach(mobile => {
        const match = Object.values(users).find(user => normalizeMobile(user.mobile) === mobile);
        if (match) matchedIds.push(Number(match.id));
        else unmatchedMobiles.push(mobile);
    });

    return {
        matchedIds: [...new Set(matchedIds)],
        unmatchedMobiles
    };
};

const uniqueRecipientIds = (ids) => [...new Set(
    (ids || [])
        .map(toUserId)
        .filter(id => id !== null && getUserById(id))
)];

app.get('/api/messages', (req, res) => {
    const userId = toUserId(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const inbox = messages
        .filter(m => messageHasRecipient(m, userId))
        .map(m => ({
            id: m.id,
            title: m.title,
            body: m.body,
            link: m.link || null,
            imageUrl: m.imageUrl || null,
            type: m.type || 'admin',
            source: 'admin',
            isBulk: !!m.isBulk,
            createdAt: m.createdAt,
            isRead: messageIsReadBy(m, userId)
        }));

    const vaccineMessages = getVaccineDelayMessagesForUser(userId);
    const combined = [...vaccineMessages, ...inbox].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(combined);
});

app.get('/api/messages/unread-count', (req, res) => {
    const userId = toUserId(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const unreadAdmin = messages.filter(m =>
        messageHasRecipient(m, userId) && !messageIsReadBy(m, userId)
    ).length;
    const unreadVaccine = getVaccineDelayMessagesForUser(userId).length;
    res.json({ count: unreadAdmin + unreadVaccine });
});

app.put('/api/messages/:id/read', (req, res) => {
    const userId = toUserId(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const messageId = req.params.id;
    if (String(messageId).startsWith('vaccine-delay-')) {
        return res.json({ message: 'پیام واکسن به‌عنوان خوانده‌شده در نظر گرفته شد' });
    }

    const msg = messages.find(m => Number(m.id) === Number(messageId));
    if (!msg || !messageHasRecipient(msg, userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    msg.readBy = msg.readBy || [];
    if (!messageIsReadBy(msg, userId)) msg.readBy.push(userId);
    saveData();
    res.json({ message: 'پیام خوانده شد', id: msg.id });
});

app.delete('/api/messages/:id', (req, res) => {
    const userId = toUserId(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ message: 'شناسه کاربری الزامی است' });

    const messageId = toUserId(req.params.id);
    const msg = messages.find(m => Number(m.id) === Number(messageId));
    if (!msg || !messageHasRecipient(msg, userId)) {
        return res.status(404).json({ message: 'پیام یافت نشد' });
    }
    msg.recipientIds = msg.recipientIds
        .map(toUserId)
        .filter(id => id !== null && id !== userId);
    msg.readBy = (msg.readBy || [])
        .map(toUserId)
        .filter(id => id !== null && id !== userId);
    if (msg.recipientIds.length === 0) {
        messages = messages.filter(m => Number(m.id) !== Number(messageId));
    }
    saveData();
    res.json({ message: 'پیام حذف شد' });
});

app.get('/api/admin/messages', isAdmin, (req, res) => {
    const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const enriched = sorted.map(msg => ({
        ...msg,
        recipientIds: uniqueRecipientIds(msg.recipientIds),
        recipients: uniqueRecipientIds(msg.recipientIds).map(id => {
            const user = getUserById(id);
            return {
                id,
                username: user?.username || '',
                mobile: user?.mobile || '',
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || `کاربر ${id}`
            };
        })
    }));
    res.json(enriched);
});

const messageUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mobilesFile', maxCount: 1 }
]);

app.post('/api/admin/messages', isAdmin, messageUpload, (req, res) => {
    const { title, body, link, mode, userId, userIds, mobiles } = req.body;
    if (!title || !String(title).trim()) {
        return res.status(400).json({ message: 'عنوان پیام الزامی است' });
    }

    let recipientIds = [];
    let unmatchedMobiles = [];
    const sendMode = mode === 'bulk' ? 'bulk' : 'single';
    const imageFile = req.files && req.files.image && req.files.image[0] ? req.files.image[0] : null;
    const mobilesFile = req.files && req.files.mobilesFile && req.files.mobilesFile[0]
        ? req.files.mobilesFile[0]
        : null;

    if (sendMode === 'bulk') {
        if (userIds) {
            try {
                const parsed = typeof userIds === 'string' ? JSON.parse(userIds) : userIds;
                recipientIds = uniqueRecipientIds(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                return res.status(400).json({ message: 'لیست کاربران نامعتبر است' });
            }
        }

        let mobilesFromFile = [];
        if (mobilesFile) {
            try {
                const fileText = fs.readFileSync(mobilesFile.path, 'utf8');
                mobilesFromFile = parseMobilesFromText(fileText);
            } catch (e) {
                return res.status(400).json({ message: 'خواندن فایل شماره موبایل ناموفق بود' });
            }
        }

        const mobilesFromText = parseMobilesFromText(mobiles || '');
        const allMobiles = [...mobilesFromFile, ...mobilesFromText];
        if (allMobiles.length > 0) {
            const matched = findUserIdsByMobiles(allMobiles);
            recipientIds = uniqueRecipientIds([...recipientIds, ...matched.matchedIds]);
            unmatchedMobiles = matched.unmatchedMobiles;
        }

        // Only fall back to all users when no explicit recipients/mobiles were provided
        const hasExplicitTargets = Boolean(userIds) || allMobiles.length > 0;
        if (recipientIds.length === 0 && !hasExplicitTargets) {
            recipientIds = uniqueRecipientIds(
                Object.keys(users).map(Number).filter(id => getUserById(id) && !getUserById(id).isAdmin)
            );
            if (recipientIds.length === 0) {
                recipientIds = uniqueRecipientIds(Object.keys(users).map(Number));
            }
        }
    } else {
        // Single: prefer explicit userId, otherwise resolve by mobile
        let targetId = toUserId(userId);
        if (!targetId && mobiles) {
            const matched = findUserIdsByMobiles(parseMobilesFromText(mobiles));
            targetId = matched.matchedIds[0] || null;
            unmatchedMobiles = matched.unmatchedMobiles;
        }
        if (!targetId || !getUserById(targetId)) {
            return res.status(400).json({ message: 'کاربر گیرنده معتبر نیست. شناسه یا موبایل صحیح وارد کنید.' });
        }
        recipientIds = [targetId];
    }

    if (recipientIds.length === 0) {
        return res.status(400).json({
            message: unmatchedMobiles.length
                ? `هیچ گیرنده‌ای یافت نشد. موبایل‌های بدون کاربر: ${unmatchedMobiles.join(', ')}`
                : 'هیچ گیرنده‌ای یافت نشد'
        });
    }

    const newMessage = {
        id: messageIdCounter++,
        title: String(title).trim(),
        body: body ? String(body).trim() : '',
        link: link ? String(link).trim() : null,
        imageUrl: imageFile ? `/uploads/${imageFile.filename}` : null,
        type: 'admin',
        isBulk: sendMode === 'bulk',
        recipientIds,
        readBy: [],
        createdAt: new Date().toISOString(),
        createdBy: toUserId(req.headers['x-user-id']),
        unmatchedMobiles
    };
    messages.push(newMessage);
    saveData();

    // Clean uploaded mobiles file from uploads (not needed for serving)
    if (mobilesFile && mobilesFile.path && fs.existsSync(mobilesFile.path)) {
        try { fs.unlinkSync(mobilesFile.path); } catch (e) { /* ignore */ }
    }

    res.status(201).json({
        ...newMessage,
        recipients: recipientIds.map(id => {
            const user = getUserById(id);
            return {
                id,
                username: user?.username || '',
                mobile: user?.mobile || '',
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || `کاربر ${id}`
            };
        })
    });
});

app.delete('/api/admin/messages/:id', isAdmin, (req, res) => {
    const id = toUserId(req.params.id);
    const initialLength = messages.length;
    messages = messages.filter(m => Number(m.id) !== Number(id));
    if (messages.length < initialLength) {
        saveData();
        return res.status(200).json({ message: 'پیام حذف شد' });
    }
    res.status(404).json({ message: 'پیام یافت نشد' });
});

app.listen(port, () => console.log(`Roshdyar server is listening on port ${port}`));
