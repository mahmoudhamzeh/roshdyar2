'use strict';

const TRIAGE = {
    NORMAL_VARIATION: 'NORMAL_VARIATION',
    MONITOR_CLOSELY: 'MONITOR_CLOSELY',
    CONSULT_SPECIALIST: 'CONSULT_SPECIALIST'
};

const HARD_RED = [
    'تشنج', 'سیاه شدن لب', 'تنگی نفس', 'قطع تنفس', 'بی‌حال شدید', 'بیحال شدید',
    'تب بالای ۴۰', 'تب 40', 'پسرفت مهارت', 'مهارت را از دست', 'از دست دادن مهارت',
    'عدم تماس چشمی کامل', 'اصلا نگاه نمی‌کند', 'اصلا نگاه نميکند'
];

const SPEECH = ['حرف', 'کلمه', 'گفتار', 'جیغ', 'اشاره', 'صدا', 'اسمش'];
const MOTOR = ['راه', 'قدم', 'ایست', 'نشستن', 'چهار دست', 'تعادل', 'افتادن'];
const SLEEP = ['خواب', 'بیدار', 'چرت', 'شب'];
const FOOD = ['غذا', 'شیر', 'قاشق', 'بدغذا', 'اشتها'];
const BEHAVIOR = ['قشقرق', 'لج', 'نه', 'گاز', 'جدايي', 'جدایی', 'ترس'];

function monthsOf(child) {
    const n = Number(child && (child.age_in_months || child.ageInMonths));
    return Number.isFinite(n) ? n : 0;
}

function hasAny(text, list) {
    return list.some((word) => text.includes(word));
}

function analyzeConcernLocal(child, concernText) {
    const name = (child && (child.name || child.firstName)) || 'کودک';
    const months = monthsOf(child);
    const gender = child && (child.gender === 'girl' || child.gender === 'female') ? 'دختر' : 'پسر';
    const text = String(concernText || '').trim();
    const lower = text;

    if (!text) {
        return {
            triage_status: TRIAGE.NORMAL_VARIATION,
            status_badge: { text: 'هنوز نگرانی نوشته نشده', color: 'green' },
            summary_verdict: `برای ${name} یک جمله کوتاه درباره نگرانی‌تان بنویسید تا راهنمایی متناسب با سن ${months} ماهگی بدهیم.`,
            analysis: {
                motor_explanation: '',
                speech_explanation: ''
            },
            home_actions: [],
            red_flags_to_watch: [],
            recommended_action: {
                needs_doctor_visit: false,
                cta_text: 'بازگشت به کارهای امروز',
                cta_url: ''
            }
        };
    }

    const urgent = hasAny(lower, HARD_RED);
    const speech = hasAny(lower, SPEECH);
    const motor = hasAny(lower, MOTOR);
    const sleep = hasAny(lower, SLEEP);
    const food = hasAny(lower, FOOD);
    const behavior = hasAny(lower, BEHAVIOR);

    let status = TRIAGE.NORMAL_VARIATION;
    if (urgent) status = TRIAGE.CONSULT_SPECIALIST;
    else if ((motor && months >= 18 && /راه|قدم/.test(lower)) || (speech && months >= 18 && /هیچ کلم|کلمه‌ای نمی|کلمه ای نمی/.test(lower))) {
        status = TRIAGE.MONITOR_CLOSELY;
    } else if ((motor && months >= 15 && /اصلا.*راه|تنهایی راه نمی/.test(lower)) || (speech && months >= 15 && /اصلا حرف|هیچ کلم/.test(lower))) {
        status = TRIAGE.MONITOR_CLOSELY;
    }

    const badge = status === TRIAGE.CONSULT_SPECIALIST
        ? { text: 'نیاز به بررسی تخصصی', color: 'red' }
        : status === TRIAGE.MONITOR_CLOSELY
            ? { text: 'نیاز به پیگیری نزدیک', color: 'yellow' }
            : { text: 'روند طبیعی رشد در این بازه سنی', color: 'green' };

    let summary = `برای ${gender} ${months} ماهه، خیلی از تفاوت‌ها هنوز در بازه طبیعی است.`;
    if (motor && months < 18) {
        summary = `تا حدود ۱۸ ماهگی راه نرفتن مستقل در بسیاری از کودکان دیده می‌شود؛ اگر می‌ایستد یا با کمک جابه‌جا می‌شود معمولاً روند طبیعی است.`;
    }
    if (speech && months < 16) {
        summary = `${summary} در این سن اشاره، آوا و یکی‌دو کلمه معنی‌دار مهم‌تر از جمله کامل است.`;
    }
    if (urgent) {
        summary = 'با توجه به نشانه‌هایی که نوشتید، این موضوع را زود با پزشک کودک مطرح کنید. این پیام تشخیص نیست.';
    }

    const analysis = {
        motor_explanation: motor
            ? (months < 18
                ? 'کودکان معمولاً بین ۹ تا ۱۸ ماهگی راه می‌افتند. ایستادن با تکیه یا چند قدم با دست شما نشانه تقویت عضله است، نه تأخیر قطعی.'
                : 'بعد از ۱۸ ماهگی اگر هنوز بدون کمک نمی‌ایستد یا راه نمی‌رود، بهتر است وضعیت حرکت توسط پزشک بررسی شود.')
            : '',
        speech_explanation: speech
            ? (months < 16
                ? 'جیغ یا اشاره برای درخواست در این سن رایج است. مهم این است که به اسمش واکنش بدهد و اشاره هدفمند داشته باشد؛ شما مدل کلمه را آرام تکرار کنید.'
                : 'اگر پس از ۱۶–۱۸ ماهگی هیچ کلمه معنی‌دار یا اشاره‌ای نیست، یا تماس چشمی خیلی کم است، پیگیری گفتار و شنوایی توصیه می‌شود.')
            : ''
    };

    const home_actions = [];
    if (motor) {
        home_actions.push({
            title: 'تشویق با بازی هل‌دادن',
            description: 'با نظارت، جعبه سبک یا واگن ایمن را هل بدهد تا اعتمادبه‌نفس قدم برداشتن بیشتر شود. هل‌دادن اجباری نکنید.'
        });
    }
    if (speech) {
        home_actions.push({
            title: 'پاسخ کلامی به جیغ یا اشاره',
            description: 'وقتی اشاره یا جیغ می‌زند، اسم خواسته‌اش را آرام بگویید: «آب می‌خوای؟ بفرما آب» و بعد خواسته را برآورده کنید.'
        });
    }
    if (sleep) {
        home_actions.push({
            title: 'روتین کوتاه و ثابت شب',
            description: 'هر شب همان سه کار کوتاه (مثلاً کتاب، نور کم، بغل آرام) را تکرار کنید. پاسخ شب را یکنواخت نگه دارید.'
        });
    }
    if (food) {
        home_actions.push({
            title: 'دو انتخاب کوچک در غذا',
            description: 'بین دو خوراک نرم و ایمن انتخاب بدهید. زمان غذا را محدود و بدون اجبار تمام کنید.'
        });
    }
    if (behavior) {
        home_actions.push({
            title: 'مرز کوتاه با حضور آرام',
            description: 'در قشقرق نزدیک بمانید، جمله را کوتاه کنید («نه، گاز نه») و بعد کار بعدی را نشان دهید.'
        });
    }
    if (!home_actions.length) {
        home_actions.push({
            title: 'مشاهده کوتاه و ثبت',
            description: `تا چند روز بازی و ارتباط ${name} را در همین سن دنبال کنید و اگر نشانه تازه نگران‌کننده دیدید دوباره بنویسید.`
        });
    }

    const red_flags_to_watch = [
        months >= 15 ? 'عدم توانایی ایستادن حتی با تکیه تا ۱۵ ماهگی' : 'سستی شدید بدن یا استفاده نکردن از یک سمت بدن',
        'عدم واکنش به صدا زدن نام یا قطع شدن تماس چشمی',
        'از دست رفتن مهارتی که قبلاً پایدار بوده'
    ];

    return {
        triage_status: status,
        status_badge: badge,
        summary_verdict: summary,
        analysis,
        home_actions,
        red_flags_to_watch,
        recommended_action: {
            needs_doctor_visit: status === TRIAGE.CONSULT_SPECIALIST,
            cta_text: status === TRIAGE.CONSULT_SPECIALIST
                ? 'رزرو نوبت مشاوره رشد و تکامل'
                : 'در صورت تمایل، چکاپ رشد با متخصص تات‌کیدز',
            cta_url: '/dashboard'
        }
    };
}

async function analyzeConcernWithModel(child, concernText) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GROWTH_AI_KEY;
    if (!apiKey) return analyzeConcernLocal(child, concernText);
    const endpoint = process.env.GROWTH_AI_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.GROWTH_AI_MODEL || 'gpt-4o-mini';
    const payload = {
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: 'شما دستیار هوشمند ارزیابی رشد کودک تات‌کیدز هستید. فقط JSON معتبر برگردانید. لحن آرام، علمی و بدون برچسب‌زنی. در red flag فوری به پزشک ارجاع دهید.'
            },
            {
                role: 'user',
                content: JSON.stringify({
                    child_info: {
                        name: child.name,
                        gender: child.gender,
                        age_in_months: monthsOf(child),
                        age_bracket: child.age_bracket || child.ageBand || ''
                    },
                    parent_concern: concernText
                })
            }
        ]
    };
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) return analyzeConcernLocal(child, concernText);
        const data = await res.json();
        const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.triage_status || !parsed.status_badge) {
            return analyzeConcernLocal(child, concernText);
        }
        return parsed;
    } catch (_err) {
        return analyzeConcernLocal(child, concernText);
    }
}

module.exports = {
    TRIAGE,
    analyzeConcernLocal,
    analyzeConcernWithModel
};
