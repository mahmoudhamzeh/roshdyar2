const CLOTHING_SIZES = [
    '۰–۳ ماه',
    '۳–۶ ماه',
    '۶–۹ ماه',
    '۹–۱۲ ماه',
    '۱۲–۱۸ ماه',
    '۱۸–۲۴ ماه',
    '۲–۳ سال',
    '۳–۴ سال',
    '۴–۵ سال',
    '۵–۶ سال',
    '۶–۸ سال',
    '۸–۱۰ سال',
    '۱۰–۱۲ سال'
];

const SHOE_SIZES = Array.from({ length: 20 }, (_, index) => String(16 + index));

export const ATTR_FIELD_META = {
    color: { label: 'رنگ', type: 'text', placeholder: 'مثلاً آبی، کرم، سفید' },
    clothingSize: { label: 'سایز لباس', type: 'select', options: CLOTHING_SIZES },
    material: { label: 'جنس', type: 'text', placeholder: 'مثلاً پنبه، کتان' },
    shoeSize: { label: 'سایز کفش (EU)', type: 'select', options: SHOE_SIZES },
    shoeType: {
        label: 'نوع کفش',
        type: 'select',
        options: ['روزمره', 'ورزشی', 'صندل', 'چکمه', 'مجلسی']
    },
    expiryDate: { label: 'تاریخ انقضا', type: 'text', placeholder: 'مثلاً ۱۴۰۵/۰۶/۰۱ یا 2027-03-01' },
    netWeight: { label: 'وزن / حجم خالص', type: 'text', placeholder: 'مثلاً ۲۰۰ گرم' },
    ingredients: { label: 'ترکیبات کلیدی', type: 'text', placeholder: 'مثلاً ویتامین D، آهن' },
    dosage: { label: 'مقدار مصرف', type: 'text', placeholder: 'مثلاً روزانه ۱ قطره' },
    storage: { label: 'شرایط نگهداری', type: 'text', placeholder: 'مثلاً جای خشک و خنک' },
    pieceCount: { label: 'تعداد قطعات', type: 'text', placeholder: 'مثلاً ۴۸ قطعه' },
    publisher: { label: 'ناشر', type: 'text' },
    pages: { label: 'تعداد صفحه', type: 'text' },
    author: { label: 'نویسنده', type: 'text' },
    volume: { label: 'حجم', type: 'text', placeholder: 'مثلاً ۲۰۰ میلی‌لیتر' },
    skinType: { label: 'مناسب پوست', type: 'text', placeholder: 'مثلاً حساس، خشک' }
};

const addKeys = (keys, extra) => {
    extra.forEach((key) => {
        if (!keys.includes(key) && ATTR_FIELD_META[key]) keys.push(key);
    });
};

export const fieldsForCategoryPath = (path = []) => {
    const names = (path || [])
        .map((item) => (typeof item === 'string' ? item : item && item.name))
        .filter(Boolean);
    const text = names.join(' ');
    const keys = [];

    if (/کفش/.test(text)) addKeys(keys, ['color', 'shoeSize', 'shoeType', 'material']);
    else if (/پوشاک|لباس|نوزاد|کودک/.test(text)) addKeys(keys, ['color', 'clothingSize', 'material']);

    if (/مکمل|ویتامین/.test(text)) addKeys(keys, ['expiryDate', 'dosage', 'storage', 'netWeight']);
    else if (/تغذیه|غذا|میوه|میان.?وعده/.test(text)) addKeys(keys, ['expiryDate', 'netWeight', 'ingredients']);

    if (/اسباب|بازی|لگو|عروسک|ماشین|ساخت/.test(text)) addKeys(keys, ['material', 'pieceCount']);
    if (/کتاب|داستان|آموزش/.test(text)) addKeys(keys, ['author', 'publisher', 'pages']);
    if (/بهداشت|حمام|پوست/.test(text)) addKeys(keys, ['volume', 'expiryDate', 'skinType']);

    return keys.map((key) => ({ key, ...ATTR_FIELD_META[key] }));
};

export const attrEntries = (attrs = {}) =>
    Object.entries(attrs || {})
        .filter(([, value]) => value != null && String(value).trim() !== '')
        .map(([key, value]) => ({
            key,
            label: (ATTR_FIELD_META[key] && ATTR_FIELD_META[key].label) || key,
            value
        }));
