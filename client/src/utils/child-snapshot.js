import { getAbsoluteStatus } from './growth-analyzer';

export const collectHealthTags = (section) => {
    if (!section) return [];
    if (typeof section === 'string') {
        return section.trim() ? [section.trim()] : [];
    }
    if (section.types && typeof section.types === 'object') {
        return Object.entries(section.types)
            .filter(([, active]) => Boolean(active))
            .map(([label]) => label);
    }
    if (Array.isArray(section)) {
        return section.map((item) => String(item).trim()).filter(Boolean);
    }
    return [];
};

export const statusPhrase = (status) => {
    if (status === 'نرمال') return { tone: 'ok', text: 'مناسب' };
    if (status === 'کمبود') return { tone: 'watch', text: 'پایین‌تر از محدوده' };
    if (status === 'اضافه') return { tone: 'watch', text: 'بالاتر از محدوده' };
    return { tone: 'muted', text: 'ثبت نشده' };
};

export const buildOverallStatus = ({
    childName,
    height,
    weight,
    illnesses,
    allergies,
    overdueVaccines,
}) => {
    const alerts = [];
    const heightPhrase = statusPhrase(height?.status);
    const weightPhrase = statusPhrase(weight?.status);
    if (heightPhrase.tone === 'watch') alerts.push(`قد ${heightPhrase.text} است`);
    if (weightPhrase.tone === 'watch') alerts.push(`وزن ${weightPhrase.text} است`);
    if ((illnesses || []).length) alerts.push('بیماری ثبت‌شده دارد');
    if ((allergies || []).length) alerts.push('آلرژی ثبت‌شده دارد');
    if (overdueVaccines > 0) alerts.push(`${overdueVaccines} واکسن عقب افتاده`);

    if (!height?.value && !weight?.value && !(illnesses || []).length && overdueVaccines === 0) {
        return {
            tone: 'muted',
            title: `وضعیت ${childName} هنوز کامل ثبت نشده`,
            detail: 'قد و وزن را در نمودار رشد وارد کنید تا تحلیل دقیق‌تری ببینید.',
        };
    }
    if (alerts.length) {
        return {
            tone: 'watch',
            title: 'چند مورد نیاز به توجه دارد',
            detail: `${alerts.join('؛ ')}. این جمع‌بندی تشخیص پزشکی نیست.`,
        };
    }
    return {
        tone: 'ok',
        title: `وضعیت کلی ${childName} مناسب به نظر می‌رسد`,
        detail: 'قد و وزن در محدوده طبیعی است و بیماری یا واکسن عقب‌افتاده‌ای ثبت نشده.',
    };
};

export const metricCaption = (analysis) => {
    if (!analysis || analysis.value == null) return 'هنوز ثبت نشده';
    const phrase = statusPhrase(analysis.status || getAbsoluteStatus(analysis.percentile));
    const pct = analysis.percentile != null ? ` · صدک ${Math.round(analysis.percentile)}` : '';
    return `${phrase.text}${pct}`;
};
