// WHO Child Growth Standards (0-60 months)
// Values derived from WHO LMS tables (P3 / P50 / P97).
// Height/length: length 0–24 months, height thereafter.
// Source: WHO Multicentre Growth Reference Study.

const heightForAgeBoys = [
    { month: 0, P3: 46.3, P50: 49.9, P97: 53.4 },
    { month: 2, P3: 54.7, P50: 58.4, P97: 62.2 },
    { month: 4, P3: 60.0, P50: 63.9, P97: 67.8 },
    { month: 6, P3: 63.6, P50: 67.6, P97: 71.7 },
    { month: 12, P3: 71.3, P50: 75.7, P97: 80.2 },
    { month: 18, P3: 77.2, P50: 82.3, P97: 87.3 },
    { month: 24, P3: 82.1, P50: 87.8, P97: 93.5 },
    { month: 36, P3: 89.1, P50: 96.1, P97: 103.1 },
    { month: 48, P3: 95.4, P50: 103.3, P97: 111.2 },
    { month: 60, P3: 101.2, P50: 110.0, P97: 118.7 },
];

const weightForAgeBoys = [
    { month: 0, P3: 2.5, P50: 3.3, P97: 4.3 },
    { month: 2, P3: 4.4, P50: 5.6, P97: 7.0 },
    { month: 4, P3: 5.6, P50: 7.0, P97: 8.6 },
    { month: 6, P3: 6.4, P50: 7.9, P97: 9.7 },
    { month: 12, P3: 7.8, P50: 9.6, P97: 11.8 },
    { month: 18, P3: 8.9, P50: 10.9, P97: 13.5 },
    { month: 24, P3: 9.8, P50: 12.1, P97: 15.1 },
    { month: 36, P3: 11.4, P50: 14.3, P97: 18.0 },
    { month: 48, P3: 12.9, P50: 16.3, P97: 20.9 },
    { month: 60, P3: 14.3, P50: 18.3, P97: 23.8 },
];

const heightForAgeGirls = [
    { month: 0, P3: 45.6, P50: 49.1, P97: 52.7 },
    { month: 2, P3: 53.2, P50: 57.1, P97: 60.9 },
    { month: 4, P3: 58.0, P50: 62.1, P97: 66.2 },
    { month: 6, P3: 61.5, P50: 65.8, P97: 70.0 },
    { month: 12, P3: 69.2, P50: 74.0, P97: 78.8 },
    { month: 18, P3: 75.3, P50: 80.7, P97: 86.2 },
    { month: 24, P3: 80.3, P50: 86.4, P97: 92.5 },
    { month: 36, P3: 87.9, P50: 95.1, P97: 102.2 },
    { month: 48, P3: 94.6, P50: 102.7, P97: 110.8 },
    { month: 60, P3: 100.5, P50: 109.4, P97: 118.4 },
];

const weightForAgeGirls = [
    { month: 0, P3: 2.4, P50: 3.2, P97: 4.2 },
    { month: 2, P3: 4.0, P50: 5.1, P97: 6.5 },
    { month: 4, P3: 5.1, P50: 6.4, P97: 8.1 },
    { month: 6, P3: 5.8, P50: 7.3, P97: 9.2 },
    { month: 12, P3: 7.1, P50: 8.9, P97: 11.3 },
    { month: 18, P3: 8.2, P50: 10.2, P97: 13.0 },
    { month: 24, P3: 9.2, P50: 11.5, P97: 14.6 },
    { month: 36, P3: 11.0, P50: 13.9, P97: 17.8 },
    { month: 48, P3: 12.5, P50: 16.1, P97: 21.1 },
    { month: 60, P3: 14.0, P50: 18.2, P97: 24.4 },
];

const headCircumferenceForAgeBoys = [
    { month: 0, P3: 32.1, P50: 34.5, P97: 36.9 },
    { month: 2, P3: 36.9, P50: 39.1, P97: 41.3 },
    { month: 4, P3: 39.4, P50: 41.6, P97: 43.9 },
    { month: 6, P3: 41.0, P50: 43.3, P97: 45.6 },
    { month: 12, P3: 43.6, P50: 46.1, P97: 48.5 },
    { month: 18, P3: 44.9, P50: 47.4, P97: 49.9 },
    { month: 24, P3: 45.7, P50: 48.2, P97: 50.8 },
    { month: 36, P3: 46.8, P50: 49.5, P97: 52.1 },
    { month: 48, P3: 47.5, P50: 50.2, P97: 53.0 },
    { month: 60, P3: 47.9, P50: 50.7, P97: 53.5 },
];

const headCircumferenceForAgeGirls = [
    { month: 0, P3: 31.7, P50: 33.9, P97: 36.1 },
    { month: 2, P3: 36.0, P50: 38.3, P97: 40.5 },
    { month: 4, P3: 38.2, P50: 40.6, P97: 43.0 },
    { month: 6, P3: 39.8, P50: 42.2, P97: 44.7 },
    { month: 12, P3: 42.3, P50: 44.9, P97: 47.4 },
    { month: 18, P3: 43.6, P50: 46.2, P97: 48.8 },
    { month: 24, P3: 44.6, P50: 47.2, P97: 49.8 },
    { month: 36, P3: 45.9, P50: 48.5, P97: 51.2 },
    { month: 48, P3: 46.7, P50: 49.3, P97: 52.0 },
    { month: 60, P3: 47.2, P50: 49.9, P97: 52.6 },
];

export const whoStats = {
    heightForAgeBoys,
    weightForAgeBoys,
    heightForAgeGirls,
    weightForAgeGirls,
    headCircumferenceForAgeBoys,
    headCircumferenceForAgeGirls,
};
