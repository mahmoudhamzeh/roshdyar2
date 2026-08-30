export const AGE_BANDS = [
    { id: '0-1', label: '۰ تا ۱ سال' },
    { id: '1-3', label: '۱ تا ۳ سال' },
    { id: '3-6', label: '۳ تا ۶ سال' },
    { id: '6-9', label: '۶ تا ۹ سال' },
    { id: '9-12', label: '۹ تا ۱۲ سال' }
];

export const SORT_OPTIONS = [
    { id: 'newest', label: 'جدیدترین' },
    { id: 'popular', label: 'پرفروش‌ترین' },
    { id: 'rating', label: 'بیشترین امتیاز' },
    { id: 'price-asc', label: 'ارزان‌ترین' },
    { id: 'price-desc', label: 'گران‌ترین' }
];

export const ageBandLabel = (id) =>
    (AGE_BANDS.find((band) => band.id === id) || {}).label || id;

export const monthsFromBirthDate = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
};

export const ageBandFromBirthDate = (birthDate) => {
    const months = monthsFromBirthDate(birthDate);
    if (months == null || months < 0) return null;
    const bands = [
        { id: '0-1', max: 12 },
        { id: '1-3', max: 36 },
        { id: '3-6', max: 72 },
        { id: '6-9', max: 108 },
        { id: '9-12', max: 144 }
    ];
    return bands.find((band) => months < band.max) || bands[bands.length - 1];
};

export const flattenCategories = (tree, depth = 0) => {
    const out = [];
    (tree || []).forEach((node) => {
        out.push({ ...node, depth });
        out.push(...flattenCategories(node.children || [], depth + 1));
    });
    return out;
};

export const stars = (value) => {
    const n = Math.round(Number(value) || 0);
    return '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));
};
