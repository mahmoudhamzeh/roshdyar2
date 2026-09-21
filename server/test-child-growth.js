#!/usr/bin/env node
const assert = require('assert');
const {
    getBandForAge,
    recommendActivities,
    buildAgeGuidePayload,
    calendarDayKey,
    isCompletedOnDay
} = require('./child-growth-data');
const { analyzeConcernLocal, chatGrowthAssistantLocal, detectChatIntent, extractFeverC, buildAssistantContext } = require('./child-growth-ai');

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

const { mergePlayActivities } = require('./growth-plays-store');
const merged = mergePlayActivities(payload.activities, [{
    id: 'admin-play-1',
    title: 'داستان تصویری',
    duration: 8,
    instructions: ['صفحه را با هم ببینید.'],
    source: 'admin'
}]);
assert.strictEqual(merged[0].id, 'admin-play-1');
assert.ok(merged.length <= 3);

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

const foodChat = chatGrowthAssistantLocal(
    { name: 'محمد', gender: 'boy', ageInMonths: 13 },
    [{ role: 'user', content: 'چی بخوره؟' }],
    { bandTitle: '۱۲ تا ۱۵ ماهگی', nutrition: 'غذای خانواده با لقمه‌های نرم.' }
);
assert.ok(foodChat.includes('لقمه‌های نرم'));

const walkChat = chatGrowthAssistantLocal(
    { name: 'محمد', gender: 'boy', ageInMonths: 13 },
    [{ role: 'user', content: 'هنوز تنهایی راه نمی‌رود' }]
);
assert.ok(walkChat.includes('۱۸ ماهگی') || walkChat.includes('طبیعی'));

assert.strictEqual(extractFeverC('تب دارد 39'), 39);
assert.strictEqual(extractFeverC('تب دارد ۳۹'), 39);
assert.strictEqual(detectChatIntent('در این سن چه چیزی بخورد؟', { ageInMonths: 13 }), 'food');
assert.strictEqual(detectChatIntent('قد و وزنش مناسب است؟', { ageInMonths: 13 }), 'growth');
assert.strictEqual(detectChatIntent('شب‌ها بدخواب است', { ageInMonths: 13 }), 'sleep');
assert.strictEqual(detectChatIntent('تب دارد 39', { ageInMonths: 13 }), 'urgent');

const toddler = { name: 'محمد', gender: 'boy', ageInMonths: 13, ageLabel: '1 سال و 1 ماه' };
const foodChip = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'در این سن چه چیزی بخورد؟' }],
    { bandTitle: '۱۲ تا ۱۵ ماهگی', nutrition: 'غذای خانواده با لقمه‌های نرم.', nutritionTips: ['هم‌غذایی خانواده: همان غذا با بافت نرم‌تر.'] }
);
assert.ok(foodChip.includes('لقمه‌های نرم') || foodChip.includes('غذا'));
assert.ok(!foodChip.includes('مشاهده کوتاه'));
assert.ok(!foodChip.includes('بازه طبیعی'));

const feverChat = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'تب دارد 39' }]
);
assert.ok(/پزشک|اورژانس/.test(feverChat), feverChat);
assert.ok(!feverChat.includes('بازه طبیعی'), feverChat);
assert.ok(!feverChat.includes('مشاهده کوتاه'), feverChat);

const feverFa = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'تب دارد ۳۹' }]
);
assert.ok(/۳۹|39/.test(feverFa) && /پزشک/.test(feverFa));

const growthChat = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'قد و وزنش مناسب است؟' }],
    { heightLabel: 'قد ۸۰ سانتی‌متر', weightLabel: 'وزن ۱۰ کیلوگرم' }
);
assert.ok(growthChat.includes('۸۰') || growthChat.includes('قد'));
assert.ok(!growthChat.includes('بازه طبیعی'));

const sleepChat = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'شب‌ها بدخواب است' }],
    { sleep: 'روتین کوتاه شب در این سن مهم است.', sleepTips: ['ساعت خواب نسبتاً ثابت'] }
);
assert.ok(sleepChat.includes('خواب'));
assert.ok(!sleepChat.includes('مشاهده کوتاه'));

const guideCtx = buildAssistantContext(payload, {});
assert.ok(guideCtx.nutrition);
const fromGuide = chatGrowthAssistantLocal(
    toddler,
    [{ role: 'user', content: 'در این سن چه چیزی بخورد؟' }],
    guideCtx
);
assert.ok(!fromGuide.includes('مشاهده کوتاه'));
assert.ok(/غذا|شیر|لقمه|خانواده/.test(fromGuide), fromGuide);

const teenWalk = chatGrowthAssistantLocal(
    { name: 'آریا', gender: 'boy', ageInMonths: 156, ageLabel: '13 ساله' },
    [{ role: 'user', content: 'هنوز تنهایی راه نمی‌رود' }]
);
assert.ok(!teenWalk.includes('۱۸ ماهگی'), teenWalk);

const fs = require('fs');
const path = require('path');
const growthPageSrc = fs.readFileSync(path.join(__dirname, '../client/src/components/ChildGrowthPage.js'), 'utf8');
const growthCss = fs.readFileSync(path.join(__dirname, '../client/src/components/ChildGrowthPage.css'), 'utf8');
assert.ok(/cg-edu-modal-scroll/.test(growthPageSrc), 'education popup must have a dedicated scroll region');
assert.ok(/document\.body\.style\.overflow/.test(growthPageSrc), 'education popup must lock page scroll');
assert.ok(/z-index:\s*2600/.test(growthCss), 'education popup must sit above the mobile bottom nav');
assert.ok(/overscroll-behavior:\s*contain/.test(growthCss));
assert.ok(/cg-edu-card-copy/.test(growthCss), 'education cards should use a readable copy column');

console.log('child growth unit tests passed');
console.log('day key sample', calendarDayKey(new Date('2026-09-02T08:00:00.000Z')));
