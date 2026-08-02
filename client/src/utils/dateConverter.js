import moment from 'jalali-moment';

/**
 * Converts a Gregorian date string (YYYY/MM/DD) to a Shamsi date string (YYYY/MM/DD).
 * @param {string} gregorianDate - The Gregorian date string.
 * @returns {string} The date in Shamsi format.
 */
export const toShamsi = (gregorianDate) => {
  if (!gregorianDate) return '';
  const normalized = String(gregorianDate).trim().replace(/\//g, '-');
  const parsed = moment(normalized, ['YYYY-MM-DD', 'YYYY/MM/DD'], true);
  if (!parsed.isValid()) {
    const fallback = moment(gregorianDate);
    return fallback.isValid() ? fallback.locale('fa').format('YYYY/MM/DD') : '';
  }
  return parsed.locale('fa').format('YYYY/MM/DD');
};

/**
 * Converts a Shamsi date object from the date picker to a Gregorian date string (YYYY/MM/DD).
 * The date picker returns an object like { year: 1401, month: 1, day: 1 }.
 * @param {object} shamsiDateObject - The Shamsi date object.
 * @returns {string} The date in Gregorian format.
 */
export const fromShamsi = (shamsiDateObject) => {
  if (!shamsiDateObject) return '';
  const { year, month, day } = shamsiDateObject;
  return moment.from(`${year}/${month}/${day}`, 'fa', 'YYYY/MM/DD').format('YYYY/MM/DD');
};

/**
 * Gets the current date and returns it as a Shamsi date object for the date picker.
 * @returns {object} The current date as a Shamsi date object.
 */
export const getCurrentShamsiDate = () => {
  const m = moment();
  return {
    year: m.jYear(),
    month: m.jMonth() + 1,
    day: m.jDate(),
  };
};

/**
 * Converts a standard JavaScript Date object or an ISO string to a Shamsi date string.
 * @param {Date|string} date - The date object or ISO string.
 * @returns {string} The date in Shamsi format.
 */
export const formatToShamsi = (date) => {
  if (!date) return '';
  return moment(date).locale('fa').format('YYYY/MM/DD');
};