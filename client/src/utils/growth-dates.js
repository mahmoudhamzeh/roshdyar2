/**
 * Parse YYYY-MM-DD or YYYY/MM/DD as a local calendar date (no UTC shift).
 */
export const parseLocalDate = (value) => {
    if (!value && value !== 0) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const match = String(value).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }
    return date;
};

/** Normalize any supported date input to YYYY-MM-DD. */
export const normalizeDateString = (value) => {
    if (!value) return '';
    if (typeof value === 'object' && value !== null) {
        // react-date-object DateObject
        if (typeof value.convert === 'function' && typeof value.format === 'function') {
            try {
                // Keep current calendar numbers but prefer gregorian conversion when available
                const formatted = value.format?.('YYYY-MM-DD');
                if (formatted && /^\d{4}-\d{2}-\d{2}$/.test(formatted) && Number(formatted.slice(0, 4)) > 1700) {
                    return formatted;
                }
            } catch (e) {
                // fall through
            }
        }
        if (typeof value.toDate === 'function') {
            return formatLocalDate(value.toDate());
        }
    }
    const parsed = parseLocalDate(value);
    return parsed ? formatLocalDate(parsed) : '';
};

/** Format a Date as local YYYY-MM-DD (avoids toISOString timezone drift). */
export const formatLocalDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/** Age in months using average month length used by WHO charts. */
export const ageInMonths = (dateValue, birthDateValue) => {
    const date = dateValue instanceof Date ? dateValue : parseLocalDate(dateValue);
    const birth = parseLocalDate(birthDateValue);
    if (!date || !birth || Number.isNaN(date.getTime())) return null;
    const ms = date.getTime() - birth.getTime();
    if (ms < 0) return 0;
    return ms / (1000 * 60 * 60 * 24 * 30.4375);
};

export const roundAgeMonths = (months, digits = 1) => {
    if (months == null || Number.isNaN(months)) return null;
    const factor = 10 ** digits;
    return Math.round(months * factor) / factor;
};

export const formatAgeLabel = (months) => {
    const value = roundAgeMonths(months, 1);
    if (value == null) return '—';
    return `${value} ماهگی`;
};
