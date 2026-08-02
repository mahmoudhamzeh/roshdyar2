const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { vaccinationSchedule } = require('./vaccination-schedule');
const { recommendedCheckupsData } = require('./recommendations');
const db = require('./db/database');

const app = express();
const port = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Ensure SQLite schema exists; auto-migrate from db.json on first run
db.getDb();
if (!db.isDatabaseSeeded()) {
    const jsonPath = path.join(__dirname, 'db.json');
    if (fs.existsSync(jsonPath)) {
        console.log('SQLite empty — importing data from db.json...');
        require('./db/migrate-from-json');
    }
}

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadsDir, { etag: false, lastModified: false }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

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
    const user = db.findUserByLogin(login);
    if (user && user.password === password) {
        const { password: _pw, ...userToSend } = user;
        res.status(200).json({ message: 'ورود موفقیت‌آمیز', user: userToSend });
    } else {
        res.status(401).json({ message: 'نام کاربری یا رمز عبور نامعتبر است' });
    }
});

app.post('/api/signup', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: 'نام کاربری و رمز عبور الزامی است' });

    const existingUser = db.findUserByUsernameOrEmail(login);
    if (existingUser) return res.status(409).json({ message: 'این نام کاربری قبلاً ثبت شده است' });

    db.createUser({ username: login, email: login, password, isAdmin: false });
    res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید.' });
});

// --- User Profile Routes ---
app.get('/api/users/:id', (req, res) => {
    const user = db.findUserById(req.params.id);
    if (user) {
        const { password, ...userToSend } = user;
        res.json(userToSend);
    } else res.status(404).json({ message: 'کاربر یافت نشد' });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    if (!db.findUserById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const { firstName, lastName, birthDate, province, city, mobile, email } = req.body;
    const updated = db.updateUserProfile(id, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(birthDate !== undefined && { birthDate }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
    });
    const { password, ...updatedUser } = updated;
    res.json({ message: 'اطلاعات با موفقیت ذخیره شد.', user: updatedUser });
});

app.put('/api/users/:id/password', (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const user = db.findUserById(id);

    if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: 'رمز عبور فعلی اشتباه است' });
    }
    if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });
    }

    db.updateUserPassword(id, newPassword);
    res.status(200).json({ message: 'رمز عبور با موفقیت تغییر کرد' });
});

// --- Children Routes ---
app.get('/api/children', (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'User ID is required' });
    const userChildren = db.getChildrenByUserId(userId)
        .map(c => ({ ...c, name: getChildDisplayName(c) }));
    res.json(userChildren);
});

app.post('/api/children', (req, res) => {
    const childData = req.body;
    if (!childData || !childData.userId) {
        return res.status(400).json({ message: 'Child data and userId are required' });
    }
    normalizeChildName(childData);
    const newChild = db.createChild({
        ...childData,
        userId: parseInt(childData.userId, 10),
        vaccinationRecords: childData.vaccinationRecords || {}
    });

    // Seed growth data from birth measurements when available
    const birthHeight = parseFloat(childData.height || childData.birthHeight);
    const birthWeight = parseFloat(childData.weight || childData.birthWeight);
    const birthHead = parseFloat(childData.birthHeadCircumference);
    let growth = [];
    if (childData.birthDate && (birthHeight || birthWeight || birthHead)) {
        const record = db.addGrowthRecord(newChild.id, {
            date: String(childData.birthDate).replace(/\//g, '-'),
            ...(birthHeight ? { height: birthHeight } : {}),
            ...(birthWeight ? { weight: birthWeight > 100 ? birthWeight / 1000 : birthWeight } : {}),
            ...(birthHead ? { headCircumference: birthHead } : {}),
        });
        growth = [record];
    }

    res.status(201).json({ ...newChild, growthData: growth });
});

app.get('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const child = db.getChildById(childId);
    if (child) {
        res.json({
            ...child,
            name: getChildDisplayName(child),
            growthData: db.getGrowthRecords(childId)
        });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    const updatedData = { ...req.body };
    if (!db.getChildById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    normalizeChildName(updatedData);
    delete updatedData.id;
    delete updatedData.growthData;

    const updated = db.updateChild(childId, updatedData);
    res.status(200).json({
        ...updated,
        name: getChildDisplayName(updated),
        growthData: db.getGrowthRecords(childId)
    });
});

app.delete('/api/children/:childId', (req, res) => {
    const { childId } = req.params;
    if (db.deleteChild(childId)) {
        res.status(200).json({ message: 'کودک و تمام اطلاعات مربوطه با موفقیت حذف شدند' });
    } else {
        res.status(404).json({ message: 'کودک یافت نشد' });
    }
});

app.put('/api/children/:childId/vaccination-records', (req, res) => {
    const { childId } = req.params;
    const { vaccinationRecords } = req.body;
    if (!db.getChildById(childId)) return res.status(404).json({ message: 'کودک یافت نشد' });
    db.replaceVaccinationRecords(childId, vaccinationRecords);
    res.status(200).json(db.getChildById(childId));
});

app.post('/api/children/:childId/avatar', upload.single('avatar'), (req, res) => {
    const { childId } = req.params;
    const userId = req.headers['x-user-id'];
    const child = db.getChildById(childId);

    if (!child) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    if (!userId || child.userId !== Number(userId)) {
        return res.status(403).json({ message: 'دسترسی غیرمجاز برای تغییر عکس این کودک' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'فایل عکس انتخاب نشده است' });
    }

    const avatarPath = `/uploads/${req.file.filename}`;
    db.updateChildAvatar(childId, avatarPath);
    res.status(200).json({ message: 'عکس با موفقیت آپلود شد', filePath: avatarPath });
});

// --- Growth Data Routes ---
app.get('/api/growth/:childId', (req, res) => {
    res.json(db.getGrowthRecords(req.params.childId));
});

app.post('/api/growth/:childId', (req, res) => {
    const { childId } = req.params;
    const { date, height, weight, headCircumference } = req.body;
    if (!date || (!height && !weight && !headCircumference)) {
        return res.status(400).json({ message: 'تاریخ و حداقل یک اندازه‌گیری الزامی است.' });
    }
    if (!db.getChildById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    const newRecord = db.addGrowthRecord(childId, { date, height, weight, headCircumference });
    res.status(201).json(newRecord);
});

app.delete('/api/growth/:childId/:date', (req, res) => {
    const { childId, date } = req.params;
    if (db.deleteGrowthRecord(childId, date)) {
        res.status(200).json({ message: 'رکورد حذف شد' });
    } else {
        res.status(404).json({ message: 'رکورد یافت نشد' });
    }
});

// --- Vaccination Status Routes ---
app.get('/api/vaccination-status/:childId', (req, res) => {
    const { childId } = req.params;
    const child = db.getChildById(childId);
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
    const child = db.getChildById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    let targetAge = age !== undefined ? Number(age) : null;
    if (targetAge === null || Number.isNaN(targetAge)) {
        const match = vaccinationSchedule.find(group =>
            group.vaccines.some(v => v.name === vaccineName && (!dose || v.details === dose || String(v.details) === String(dose)))
        ) || vaccinationSchedule.find(group => group.vaccines.some(v => v.name === vaccineName));
        if (!match) return res.status(404).json({ message: 'واکسن در برنامه یافت نشد' });
        targetAge = match.age;
    }

    db.upsertVaccinationRecord(childId, targetAge, vaccineName, date || null);
    res.status(200).json({
        message: 'وضعیت واکسن به‌روز شد',
        vaccinationRecords: db.getVaccinationRecordsMap(childId)
    });
});

// --- Medical Data Routes ---
app.get('/api/visits/:childId', (req, res) => {
    res.json(db.getVisits(req.params.childId));
});

app.post('/api/visits/:childId', (req, res) => {
    const { childId } = req.params;
    const { date, doctorName, reason, summary } = req.body;
    if (!date || !doctorName || !reason) {
        return res.status(400).json({ message: 'تاریخ، نام پزشک و علت مراجعه الزامی است' });
    }
    if (!db.getChildById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const newVisit = db.addVisit(childId, { date, doctorName, reason, summary });
    res.status(201).json(newVisit);
});

app.get('/api/checkups/:childId', (req, res) => {
    res.json(db.getCheckups(req.params.childId));
});

app.post('/api/checkups/:childId', upload.single('checkupFile'), (req, res) => {
    const { childId } = req.params;
    const { title, date, parameters } = req.body;

    if (!title || !date || !parameters) {
        return res.status(400).json({ message: 'عنوان، تاریخ و پارامترها الزامی هستند.' });
    }
    if (!db.getChildById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }

    let parsedParameters;
    try {
        parsedParameters = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
    } catch (err) {
        return res.status(400).json({ message: 'فرمت پارامترها نامعتبر است.' });
    }

    const newCheckup = db.addCheckup(childId, {
        title,
        date,
        parameters: parsedParameters,
        fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });
    res.status(201).json(newCheckup);
});

app.get('/api/documents/:childId', (req, res) => {
    res.json(db.getDocuments(req.params.childId));
});

app.post('/api/documents/:childId', upload.single('document'), (req, res) => {
    const { childId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'فایل مدرک الزامی است' });
    }
    if (!db.getChildById(childId)) {
        return res.status(404).json({ message: 'کودک یافت نشد' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const newDocument = db.addDocument(childId, {
        title: req.body.title || req.file.originalname,
        filePath,
        uploadedAt: new Date().toISOString()
    });
    res.status(201).json(newDocument);
});

app.get('/api/recommended-tests/:childId', (req, res) => {
    const { childId } = req.params;
    const child = db.getChildById(childId);
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
    const user = db.findUserById(userId);
    if (user && user.isAdmin) next();
    else res.status(403).json({ message: 'دسترسی غیرمجاز: شما مدیر نیستید' });
};

// --- Admin Routes ---
app.get('/api/admin/users', isAdmin, (req, res) => {
    const usersWithoutPasswords = db.listUsers().map(u => {
        const { password, ...user } = u;
        return user;
    });
    res.json(usersWithoutPasswords);
});

app.put('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const userData = { ...req.body };
    if (!db.findUserById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    delete userData.password;
    const requestingUserId = req.headers['x-user-id'];
    const current = db.findUserById(id);
    if (String(id) === String(requestingUserId) && current.isAdmin && userData.isAdmin === false) {
        return res.status(400).json({ message: 'شما نمی‌توانید دسترسی ادمین خود را لغو کنید.' });
    }

    const updated = db.updateUserProfile(id, userData);
    const { password, ...updatedUser } = updated;
    res.json(updatedUser);
});

app.delete('/api/admin/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    if (!db.findUserById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });

    const requestingUserId = req.headers['x-user-id'];
    if (String(id) === String(requestingUserId)) {
        return res.status(400).json({ message: 'شما نمی‌توانید حساب کاربری خود را حذف کنید.' });
    }

    db.deleteUser(id);
    res.status(200).json({ message: 'کاربر با موفقیت حذف شد' });
});

app.get('/api/admin/users/:userId/children', isAdmin, (req, res) => {
    res.json(db.getChildrenByUserId(req.params.userId));
});

app.put('/api/admin/users/:id/set-password', isAdmin, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!db.findUserById(id)) return res.status(404).json({ message: 'کاربر یافت نشد' });
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });

    db.updateUserPassword(id, newPassword);
    res.status(200).json({ message: 'رمز عبور کاربر با موفقیت تغییر کرد' });
});

app.get('/api/admin/tickets', isAdmin, (req, res) => {
    res.json(db.listTickets());
});

app.get('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const ticket = db.getTicketById(req.params.id);
    if (ticket) res.json(ticket);
    else res.status(404).json({ message: 'تیکت یافت نشد' });
});

app.put('/api/admin/tickets/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { status, reply } = req.body;
    const ticket = db.updateTicket(id, {
        status,
        reply,
        replyUserId: req.headers['x-user-id'],
    });
    if (!ticket) return res.status(404).json({ message: 'تیکت یافت نشد' });
    res.json(ticket);
});

app.get('/api/admin/stats', isAdmin, (req, res) => {
    res.json({
        totalUsers: db.countUsers(),
        totalChildren: db.countChildren(),
        totalBanners: db.countBanners(),
        totalArticles: db.countNews(),
        totalTickets: db.countTickets(),
        openTickets: db.countOpenTickets()
    });
});

// --- Banner, News, Video, Podcast Routes (Content Management) ---
app.get('/api/banners', (req, res) => res.set('Cache-Control', 'no-store').json(db.listBanners()));
app.post('/api/admin/banners', isAdmin, upload.single('image'), (req, res) => {
    const { title, link } = req.body;
    if (!req.file) return res.status(400).json({ message: 'تصویر بنر الزامی است' });
    const newBanner = db.createBanner({ title, link, imageUrl: `/uploads/${req.file.filename}` });
    res.status(201).json(newBanner);
});
app.delete('/api/admin/banners/:id', isAdmin, (req, res) => {
    if (db.deleteBanner(req.params.id)) res.status(200).json({ message: 'بنر با موفقیت حذف شد' });
    else res.status(404).json({ message: 'بنر یافت نشد' });
});

app.get('/api/news', (req, res) => res.json(db.listNews()));
app.get('/api/news/:id', (req, res) => {
    const article = db.getNewsById(req.params.id);
    if (article) res.json(article);
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});
app.post('/api/admin/news', isAdmin, upload.single('image'), (req, res) => {
    const { title, content, summary, category } = req.body;
    const newArticle = db.createNews({
        title,
        summary,
        content,
        category: category || 'عمومی',
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newArticle);
});
app.put('/api/admin/news/:id', isAdmin, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, content, summary, category } = req.body;
    if (!db.getNewsById(id)) return res.status(404).json({ message: 'مقاله یافت نشد' });

    const updatedArticle = db.updateNews(id, {
        title,
        summary,
        content,
        category,
        ...(req.file && { imageUrl: `/uploads/${req.file.filename}` }),
        updatedAt: new Date().toISOString()
    });
    res.json(updatedArticle);
});
app.delete('/api/admin/news/:id', isAdmin, (req, res) => {
    if (db.deleteNews(req.params.id)) res.status(200).json({ message: 'مقاله با موفقیت حذف شد' });
    else res.status(404).json({ message: 'مقاله یافت نشد' });
});

app.get('/api/videos', (req, res) => res.json(db.listVideos()));
app.post('/api/admin/videos', isAdmin, (req, res) => {
    const { title, url, summary } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Title and URL are required' });
    const newVideo = db.createVideo({
        title,
        url,
        summary,
        createdAt: new Date().toISOString()
    });
    res.status(201).json(newVideo);
});
app.delete('/api/admin/videos/:id', isAdmin, (req, res) => {
    if (db.deleteVideo(req.params.id)) res.status(200).json({ message: 'ویدیو با موفقیت حذف شد' });
    else res.status(404).json({ message: 'ویدیو یافت نشد' });
});

app.get('/api/podcasts', (req, res) => res.json(db.listPodcasts()));

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
    const userChildren = db.getChildrenByUserId(userId);
    let created = 0;

    userChildren.forEach(child => {
        const ageInMonths = calculateAgeInMonths(child.birthDate);
        const childVaccinations = child.vaccinationRecords || {};
        const childName = getChildDisplayName(child);

        vaccinationSchedule.forEach(group => {
            if (ageInMonths < group.age - 1) return;
            group.vaccines.forEach(vaccine => {
                const reminderId = `generated-vaccine-${child.id}-${group.age}-${vaccine.name}`;
                const alreadyExists = db.reminderExists(child.id, reminderId);
                const isDone = childVaccinations[group.age] && childVaccinations[group.age][vaccine.name];
                if (!alreadyExists && !isDone) {
                    db.addReminder(child.id, {
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

    res.status(201).json({ message: 'یادآورها با موفقیت تولید شدند', created });
});

app.get('/api/reminders/all/:childId', (req, res) => {
    const { childId } = req.params;
    const child = db.getChildById(childId);
    if (!child) return res.status(404).json({ message: 'کودک یافت نشد' });

    const manualReminders = db.getReminders(childId);
    const autoReminders = getOverdueVaccinationReminders(child);
    res.json([...autoReminders, ...manualReminders]);
});

app.post('/api/reminders/manual/:childId', (req, res) => {
    const { childId } = req.params;
    const { title, date } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'عنوان و تاریخ الزامی است' });
    if (!db.getChildById(childId)) return res.status(404).json({ message: 'کودک یافت نشد' });

    const newReminder = { id: `manual-${Date.now()}`, title, date, type: 'info', source: 'manual' };
    db.addReminder(childId, newReminder);
    res.status(201).json(newReminder);
});

app.delete('/api/reminders/manual/:childId/:reminderId', (req, res) => {
    const { childId, reminderId } = req.params;
    if (db.deleteReminder(childId, reminderId)) {
        res.status(200).json({ message: 'یادآوری با موفقیت حذف شد' });
    } else {
        res.status(404).json({ message: 'یادآوری مشخص شده یافت نشد' });
    }
});

app.listen(port, () => console.log(`Roshdyar server is listening on port ${port}`));
