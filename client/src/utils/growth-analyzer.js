import { whoStats } from '../who-stats';

const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const normalized = String(value).trim().replace(/\//g, '-');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const calculateAgeInMonths = (date, birthDate) => {
    const recordDate = parseDate(date);
    const birth = parseDate(birthDate);
    if (!recordDate || !birth) return null;
    return (recordDate - birth) / (1000 * 60 * 60 * 24 * 30.4375);
};

const getPercentileForValue = (value, ageInMonths, gender, metric) => {
    if (value == null || ageInMonths == null || Number.isNaN(ageInMonths)) return null;

    const table = whoStats[`${metric}ForAge${gender === 'boy' ? 'Boys' : 'Girls'}`];
    if (!table || table.length === 0) return null;

    const minMonth = table[0].month;
    const maxMonth = table[table.length - 1].month;
    const clampedAge = Math.min(Math.max(ageInMonths, minMonth), maxMonth);

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

export const getAbsoluteStatus = (percentile) => {
    if (percentile === null || percentile === undefined) return 'نامشخص';
    if (percentile < 3) return 'کمبود';
    if (percentile > 97) return 'اضافه';
    return 'نرمال';
};

export const analyzeGrowthMetric = (metric, child) => {
    if (!child || !child.growthData || child.growthData.length === 0) {
        return { value: null, status: 'نامشخص', trend: 'stable' };
    }

    const sortedData = [...child.growthData].sort(
        (a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)
    );
    const recordsWithMetric = sortedData.filter(
        (r) => r[metric] !== undefined && r[metric] !== null && r[metric] !== ''
    );

    if (recordsWithMetric.length === 0) {
        return { value: null, status: 'نامشخص', trend: 'stable' };
    }

    const latestRecord = recordsWithMetric[recordsWithMetric.length - 1];
    const latestAge = calculateAgeInMonths(latestRecord.date, child.birthDate);
    const latestP = getPercentileForValue(latestRecord[metric], latestAge, child.gender, metric);

    let trend = 'stable';
    if (recordsWithMetric.length >= 2) {
        const previousRecord = recordsWithMetric[recordsWithMetric.length - 2];
        const previousAge = calculateAgeInMonths(previousRecord.date, child.birthDate);
        const previousP = getPercentileForValue(previousRecord[metric], previousAge, child.gender, metric);
        if (latestP !== null && previousP !== null) {
            const diff = latestP - previousP;
            if (Math.abs(diff) > 5) {
                trend = diff > 0 ? 'improving' : 'declining';
            }
        }
    }

    return {
        value: latestRecord[metric],
        percentile: latestP,
        status: getAbsoluteStatus(latestP),
        trend,
    };
};
