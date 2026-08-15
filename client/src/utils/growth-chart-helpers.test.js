import { buildChartData, getVisibleAgeDomain, buildAgeTicks, formatDelta } from './growth-chart-helpers';
import { formatAgeLabel } from './growth-dates';
import { analyzeGrowthMetric, getGrowthInterpretation, getAbsoluteStatus } from './growth-analyzer';

describe('growth chart helpers', () => {
    test('buildChartData merges WHO rows and child points by age', () => {
        const rows = buildChartData(
            [{ month: 0, P3: 46, P50: 50, P97: 54 }],
            [{ month: 2.4, value: 58, date: '2024-03-01' }]
        );
        expect(rows).toHaveLength(2);
        expect(rows[0].P50).toBe(50);
        expect(rows[1].value).toBe(58);
        expect(rows[1].recordDate).toBe('2024-03-01');
    });

    test('focused domain keeps young infants readable', () => {
        expect(getVisibleAgeDomain({
            childAgeInMonths: 4,
            points: [{ month: 3.5 }],
            mode: 'focus',
        })).toEqual([0, 12]);
    });

    test('focused domain zooms around older toddlers', () => {
        const [start, end] = getVisibleAgeDomain({
            childAgeInMonths: 48,
            points: [{ month: 36 }, { month: 47 }],
            mode: 'focus',
        });
        expect(start).toBeGreaterThanOrEqual(36);
        expect(end - start).toBeGreaterThanOrEqual(12);
        expect(end).toBeLessThan(60);
    });

    test('full domain always includes 0-60', () => {
        expect(getVisibleAgeDomain({
            childAgeInMonths: 10,
            points: [],
            mode: 'full',
        })).toEqual([0, 60]);
    });

    test('buildAgeTicks stays sparse on a long range', () => {
        const ticks = buildAgeTicks(0, 60);
        expect(ticks[0]).toBe(0);
        expect(ticks).toContain(60);
        expect(ticks.length).toBeLessThanOrEqual(8);
    });

    test('formatDelta keeps a signed unit label', () => {
        expect(formatDelta(1.25, 'cm')).toBe('+1.3 cm');
        expect(formatDelta(-0.4, 'kg')).toBe('-0.4 kg');
        expect(formatDelta(null, 'cm')).toBeNull();
    });
});

describe('growth labels and analysis', () => {
    test('formatAgeLabel uses years after 12 months', () => {
        expect(formatAgeLabel(8)).toBe('8 ماهگی');
        expect(formatAgeLabel(24)).toBe('2 سالگی');
        expect(formatAgeLabel(30)).toBe('2 سال و 6 ماه');
    });

    test('analyzeGrowthMetric returns percentile, delta and count', () => {
        const child = {
            gender: 'boy',
            birthDate: '2024-01-01',
            growthData: [
                { date: '2024-07-01', height: 67.6 },
                { date: '2025-01-01', height: 75.7 },
            ],
        };
        const analysis = analyzeGrowthMetric('height', child);
        expect(analysis.count).toBe(2);
        expect(analysis.value).toBe(75.7);
        expect(analysis.delta).toBeCloseTo(8.1);
        expect(analysis.percentile).toBeGreaterThan(40);
        expect(analysis.status).toBe('نرمال');
        expect(getGrowthInterpretation('height', analysis)).toMatch(/صدک/);
    });

    test('getAbsoluteStatus maps percentile edges', () => {
        expect(getAbsoluteStatus(2)).toBe('کمبود');
        expect(getAbsoluteStatus(50)).toBe('نرمال');
        expect(getAbsoluteStatus(98)).toBe('اضافه');
    });
});
