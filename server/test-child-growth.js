#!/usr/bin/env node
const assert = require('assert');
const {
    getBandForAge,
    recommendActivities,
    buildAgeGuidePayload,
    calendarDayKey,
    isCompletedOnDay
} = require('./child-growth-data');
const { analyzeConcernLocal } = require('./child-growth-ai');

const band = getBandForAge(13);
assert.ok(band && band.activities && band.activities.length >= 3, '12-15 band needs activities');

const first = band.activities[0];
const dayA = '2026-09-01';
const dayB = '2026-09-02';
const setA = recommendActivities(band, { completions: {}, today: dayA, dailyCount: 3 }).map((a) => a.id);
const setB = recommendActivities(band, { completions: {}, today: dayB, dailyCount: 3 }).map((a) => a.id);
assert.strictEqual(setA.length, 3);
assert.ok(JSON.stringify(setA) !== JSON.stringify(setB), 'daily set should rotate by date');

const afterDone = recommendActivities(band, {
    today: dayA,
    dailyCount: 3,
    completions: {
        [first.id]: { completed: true, completedAt: `${dayA}T10:00:00.000Z` }
    }
});
assert.ok(afterDone.every((item) => item.id !== first.id || item.completedToday), 'completed today stays marked');
assert.ok(!afterDone.some((item) => item.id === first.id && !item.completedToday) || afterDone.length <= 3);

const nextDay = recommendActivities(band, {
    today: dayB,
    dailyCount: 3,
    completions: {
        [first.id]: { completed: true, completedAt: `${dayA}T10:00:00.000Z` }
    }
});
assert.ok(nextDay.some((item) => item.id !== first.id), 'next day should offer another activity');
assert.ok(!isCompletedOnDay({ completed: true, completedAt: `${dayA}T10:00:00.000Z` }, dayB));

const payload = buildAgeGuidePayload({
    firstName: 'محمد',
    lastName: 'محمد',
    birthDate: '2025-08-01',
    gender: 'boy'
}, { today: dayA, completions: {}, safetyChecks: {} });
assert.ok(payload.expectSections.length >= 3);
assert.ok(payload.redFlags.length >= 1);
assert.ok(payload.safetyTasks.length >= 1);
assert.strictEqual(payload.today, dayA);
assert.ok(payload.activities.length <= 3);

const older = buildAgeGuidePayload({
    firstName: 'آریا',
    lastName: 'تست',
    birthDate: '2023-08-01',
    gender: 'boy'
}, { today: dayA, completions: {}, safetyChecks: {} });
assert.strictEqual(older.band && older.band.id, '36-48');
assert.strictEqual(older.expectSections.length, 5);
assert.ok(older.expectSections.every((section) => section.items && section.items.length > 0));
assert.ok(older.activities.length <= 3);
assert.ok(older.safetyTasks.length >= 1);

const walking = analyzeConcernLocal(
    { name: 'محمد', gender: 'boy', ageInMonths: 13 },
    'پسرم هنوز تنهایی راه نمیفته و وقتی می‌خواد چیزی بخواد فقط جیغ می‌زنه و کلمه‌ای نمیگه.'
);
assert.strictEqual(walking.triage_status, 'NORMAL_VARIATION');
assert.strictEqual(walking.status_badge.color, 'green');
assert.ok(walking.home_actions.length >= 2);
assert.ok(walking.summary_verdict);

const urgent = analyzeConcernLocal(
    { name: 'محمد', gender: 'boy', ageInMonths: 13 },
    'تشنج کرده و لب‌هاش سیاه شده'
);
assert.strictEqual(urgent.triage_status, 'CONSULT_SPECIALIST');
assert.strictEqual(urgent.recommended_action.needs_doctor_visit, true);

console.log('child growth unit tests passed');
console.log('day key sample', calendarDayKey(new Date('2026-09-02T08:00:00.000Z')));
