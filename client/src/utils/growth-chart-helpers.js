import { roundAgeMonths } from './growth-dates';

export const buildChartData = (standardData, childPoints) => {
    const rows = (standardData || []).map((row) => ({
        month: row.month,
        P3: row.P3,
        P50: row.P50,
        P97: row.P97,
        value: null,
        recordDate: null,
    }));

    (childPoints || []).forEach((point) => {
        if (point.month == null || point.value == null || Number.isNaN(point.month)) return;
        const month = roundAgeMonths(Math.max(0, point.month), 2);
        rows.push({
            month,
            P3: null,
            P50: null,
            P97: null,
            value: point.value,
            recordDate: point.date || null,
        });
    });

    return rows.sort((a, b) => a.month - b.month);
};

export const getVisibleAgeDomain = ({ childAgeInMonths, points, mode }) => {
    const age = Number(childAgeInMonths) || 0;
    const pointMonths = (points || [])
        .map((point) => point.month)
        .filter((month) => month != null && !Number.isNaN(month));
    const lastPoint = pointMonths.length ? Math.max(...pointMonths) : 0;
    const focusAge = Math.max(age, lastPoint, 0);

    if (mode === 'full') {
        return [0, Math.max(60, Math.ceil(focusAge + 1))];
    }

    if (focusAge <= 18) {
        return [0, Math.min(60, Math.max(12, Math.ceil(focusAge + 6)))];
    }

    const start = Math.max(0, Math.floor(focusAge - 12));
    let end = Math.ceil(focusAge + 6);
    if (end - start < 12) end = start + 12;
    return [start, Math.min(Math.max(end, 12), Math.max(60, Math.ceil(focusAge + 1)))];
};

export const buildAgeTicks = (minAge, maxAge) => {
    const span = Math.max(1, maxAge - minAge);
    const step = span <= 12 ? 2 : span <= 24 ? 3 : span <= 36 ? 6 : 12;
    const ticks = [];
    const first = Math.ceil(minAge / step) * step;
    if (minAge === 0 || first - minAge > step / 2) {
        ticks.push(Math.round(minAge));
    }
    for (let tick = first; tick <= maxAge + 0.001; tick += step) {
        const rounded = Math.round(tick);
        if (!ticks.includes(rounded)) ticks.push(rounded);
    }
    const last = Math.round(maxAge);
    if (!ticks.includes(last)) ticks.push(last);
    return ticks;
};

export const formatDelta = (delta, unit) => {
    if (delta == null || Number.isNaN(delta)) return null;
    const rounded = Math.round(delta * 10) / 10;
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded} ${unit}`;
};
