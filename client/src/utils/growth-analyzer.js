import { whoStats } from '../who-stats';
import { ageInMonths, parseLocalDate } from './growth-dates';

const getPercentileForValue = (value, ageMonths, gender, metric) => {
    if (value == null || ageMonths == null || Number.isNaN(ageMonths)) return null;

    const table = whoStats[`${metric}ForAge${gender === 'boy' ? 'Boys' : 'Girls'}`];
    if (!table || table.length === 0) return null;

    const minMonth = table[0].month;
    const maxMonth = table[table.length - 1].month;
    const clampedAge = Math.min(Math.max(ageMonths, minMonth), maxMonth);

    let lowerBound = table[0];
    let upperBound = table[table.length - 1];
    for (const row of table) {
        if (row.month <= clampedAge) lowerBound = row;
        if (row.month >= clampedAge) {
            upperBound = row;
            break;
        }
    }

    const interpolate = (p1, p2) => {
        if (p1.month === p2.month) return p1;
        const factor = (clampedAge - p1.month) / (p2.month - p1.month);
        return {
            P3: p1.P3 + factor * (p2.P3 - p1.P3),
            P50: p1.P50 + factor * (p2.P50 - p1.P50),
            P97: p1.P97 + factor * (p2.P97 - p1.P97),
        };
    };

    const standard = interpolate(lowerBound, upperBound);
    if (value < standard.P3) return 2;
    if (value > standard.P97) return 98;
    if (value < standard.P50) {
        return 3 + 47 * ((value - standard.P3) / (standard.P50 - standard.P3));
    }
    return 50 + 47 * ((value - standard.P50) / (standard.P97 - standard.P50));
};

export const METRIC_META = {
    height: { key: 'height', label: 'قد', unit: 'cm', unitFa: 'سانتی‌متر' },
    weight: { key: 'weight', label: 'وزن', unit: 'kg', unitFa: 'کیلوگرم' },
    headCircumference: { key: 'headCircumference', label: 'دور سر', unit: 'cm', unitFa: 'سانتی‌متر' },
};

export const getAbsoluteStatus = (percentile) => {
    if (percentile === null || percentile === undefined) return 'نامشخص';
    if (percentile < 3) return 'کمبود';
    if (percentile > 97) return 'اضافه';
    return 'نرمال';
};

export const roundPercentile = (percentile) => {
    if (percentile == null || Number.isNaN(percentile)) return null;
    return Math.round(percentile);
};

export const getTrendMeta = (trend) => {
    if (trend === 'improving') return { key: 'improving', label: 'صدک رو به افزایش', short: 'افزایشی' };
    if (trend === 'declining') return { key: 'declining', label: 'صدک رو به کاهش', short: 'کاهشی' };
    return { key: 'stable', label: 'روند پایدار', short: 'پایدار' };
};

export const getGrowthInterpretation = (metric, analysis) => {
    const name = METRIC_META[metric]?.label || 'رشد';
    if (!analysis || analysis.value == null || analysis.value === '') {
        return `هنوز ${name} ثبت نشده است. با ثبت اندازه‌گیری، جایگاه کودک روی منحنی رشد مشخص می‌شود.`;
    }

    const percentile = roundPercentile(analysis.percentile);
    if (analysis.status === 'کمبود') {
        return `آخرین ${name} پایین‌تر از صدک ۳ منحنی سازمان بهداشت جهانی است. این به‌تنهایی تشخیص نیست؛ برای تفسیر با پزشک کودک مشورت کنید.`;
    }
    if (analysis.status === 'اضافه') {
        return `آخرین ${name} بالاتر از صدک ۹۷ است. این به‌تنهایی تشخیص نیست؛ برای تفسیر با پزشک کودک مشورت کنید.`;
    }
    if (percentile != null) {
        return `آخرین ${name} حدود صدک ${percentile} است و در محدوده طبیعی منحنی رشد قرار دارد.`;
    }
    return `آخرین ${name} ثبت شده است.`;
};

export const analyzeRecordMetric = (metric, child, record) => {
    if (!child || !record) {
        return { value: null, percentile: null, status: 'نامشخص', ageInMonths: null };
    }
    const raw = record[metric];
    const value = raw === undefined || raw === null || raw === '' ? null : Number(raw);
    const age = ageInMonths(record.date, child.birthDate);
    if (value == null || Number.isNaN(value)) {
        return { value: null, percentile: null, status: 'نامشخص', ageInMonths: age };
    }
    const percentile = getPercentileForValue(value, age, child.gender, metric);
    return {
        value,
        percentile,
        status: getAbsoluteStatus(percentile),
        ageInMonths: age,
    };
};

export const analyzeGrowthMetric = (metric, child) => {
    const empty = {
        value: null,
        date: null,
        ageInMonths: null,
        percentile: null,
        status: 'نامشخص',
        trend: 'stable',
        previousValue: null,
        previousDate: null,
        delta: null,
        count: 0,
    };

    if (!child || !child.growthData || child.growthData.length === 0) {
        return empty;
    }

    const sortedData = [...child.growthData].sort(
        (a, b) => (parseLocalDate(a.date)?.getTime() || 0) - (parseLocalDate(b.date)?.getTime() || 0)
    );
    const recordsWithMetric = sortedData.filter((r) => {
        const value = r[metric];
        return value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value));
    });

    if (recordsWithMetric.length === 0) {
        return empty;
    }

    const latestRecord = recordsWithMetric[recordsWithMetric.length - 1];
    const latestAge = ageInMonths(latestRecord.date, child.birthDate);
    const latestValue = Number(latestRecord[metric]);
    const latestP = getPercentileForValue(latestValue, latestAge, child.gender, metric);

    let trend = 'stable';
    let previousValue = null;
    let previousDate = null;
    let delta = null;

    if (recordsWithMetric.length >= 2) {
        const previousRecord = recordsWithMetric[recordsWithMetric.length - 2];
        const previousAge = ageInMonths(previousRecord.date, child.birthDate);
        previousValue = Number(previousRecord[metric]);
        previousDate = previousRecord.date || null;
        delta = latestValue - previousValue;
        const previousP = getPercentileForValue(previousValue, previousAge, child.gender, metric);
        if (latestP !== null && previousP !== null) {
            const diff = latestP - previousP;
            if (Math.abs(diff) > 5) {
                trend = diff > 0 ? 'improving' : 'declining';
            }
        }
    }

    return {
        value: latestValue,
        date: latestRecord.date || null,
        ageInMonths: latestAge,
        percentile: latestP,
        status: getAbsoluteStatus(latestP),
        trend,
        previousValue,
        previousDate,
        delta,
        count: recordsWithMetric.length,
    };
};
