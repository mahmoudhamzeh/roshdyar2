'use strict';

const { formatAgeLabel } = require('./child-growth-data');

const TRIAGE = {
    NORMAL_VARIATION: 'NORMAL_VARIATION',
    MONITOR_CLOSELY: 'MONITOR_CLOSELY',
    CONSULT_SPECIALIST: 'CONSULT_SPECIALIST'
};

const HARD_RED = [
    'تشنج', 'سیاه شدن لب', 'تنگی نفس', 'قطع تنفس', 'بی‌حال شدید', 'بیحال شدید',
    'تب بالای ۴۰', 'تب بالای 40', 'تب 40', 'تب40', 'پسرفت مهارت', 'مهارت را از دست',
    'از دست دادن مهارت', 'عدم تماس چشمی کامل', 'اصلا نگاه نمی‌کند', 'اصلا نگاه نميکند'
];

const SPEECH = ['حرف', 'کلمه', 'گفتار', 'جیغ', 'اشاره', 'صحبت', 'زبان'];
const MOTOR = ['راه', 'قدم', 'ایست', 'نشستن', 'چهار دست', 'چهاردست', 'تعادل', 'افتادن', 'خزیدن'];
const SLEEP = ['خواب', 'بیدار', 'چرت', 'بدخواب'];
const FOOD = ['غذا', 'شیر', 'قاشق', 'بدغذا', 'اشتها', 'تغذیه', 'بخور', 'صبحانه', 'میان‌وعده', 'میان وعده'];
const BEHAVIOR = ['قشقرق', 'لجبازی', 'گاز', 'جدایی', 'جدايي', 'اضطراب', 'کج‌خلق', 'کج خلق'];

const DISCLAIMER = 'این راهنما آموزشی است و جای معاینه پزشک را نمی‌گیرد.';
const DIGITS = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

function monthsOf(child) {
    const n = Number(child && (child.age_in_months || child.ageInMonths));
    return Number.isFinite(n) ? n : 0;
}

function ageLabelOf(child, context) {
    if (context && context.ageLabel) return context.ageLabel;
    if (child && child.ageLabel) return child.ageLabel;
    return formatAgeLabel(monthsOf(child));
}

function childNameOf(child) {
    return (child && (child.name || child.firstName)) || 'کودک';
}

function genderWord(child) {
    return child && (child.gender === 'girl' || child.gender === 'female') ? 'دختر' : 'پسر';
}

function normalizeText(value) {
    return String(value || '')
        .replace(/[۰-۹٠-٩]/g, (digit) => DIGITS[digit] || digit)
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/‌/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasAny(text, list) {
    return list.some((word) => text.includes(word));
}

function extractFeverC(raw) {
    const text = normalizeText(raw);
    const patterns = [
        /تب[^0-9]{0,14}(\d{2}(?:[.,]\d)?)/,
        /(\d{2}(?:[.,]\d)?)\s*(?:درجه|°)[^0-9]{0,8}تب/,
        /(\d{2}(?:[.,]\d)?)[^0-9]{0,8}درجه/
    ];
    for (let i = 0; i < patterns.length; i += 1) {
        const match = text.match(patterns[i]);
        if (!match) continue;
        const value = parseFloat(String(match[1]).replace(',', '.'));
        if (value >= 37 && value <= 43.5) return value;
    }
    return null;
}

function listToTips(list, limit) {
    const cap = limit == null ? 3 : limit;
    return (Array.isArray(list) ? list : [])
        .slice(0, cap)
        .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item.trim();
            const title = item.title ? String(item.title).trim() : '';
            const detail = String(item.detail || item.description || item.summary || '').trim();
            if (title && detail) return `${title}: ${detail}`;
            return title || detail;
        })
        .filter(Boolean);
}

function numbered(items) {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function joinReply(parts) {
    return parts.filter(Boolean).join('\n\n');
}

function sectionItems(guide, id) {
    const sections = (guide && guide.expectSections) || [];
    const found = sections.find((item) => item.id === id);
    return listToTips(found && found.items, 2);
}

function collectTags(section) {
    if (!section) return '';
    if (typeof section === 'string') return section.trim();
    if (section.description && typeof section.description === 'string' && section.description.trim()) {
        const types = section.types && typeof section.types === 'object'
            ? Object.entries(section.types).filter(([, on]) => on).map(([label]) => label)
            : [];
        return [...types, section.description.trim()].filter(Boolean).join('، ');
    }
    if (section.types && typeof section.types === 'object') {
        return Object.entries(section.types).filter(([, on]) => on).map(([label]) => label).join('، ');
    }
    if (Array.isArray(section)) return section.map((item) => String(item).trim()).filter(Boolean).join('، ');
    return '';
}

function buildAssistantContext(guide, extra) {
    const src = extra || {};
    const child = (guide && guide.child) || {};
    const nutrition = (guide && guide.nutrition) || null;
    const sleep = (guide && guide.sleep) || null;
    const health = (guide && guide.health) || null;
    const last = src.lastMeasurement || {};
    return {
        bandTitle: (guide && guide.band && guide.band.title) || src.bandTitle || '',
        ageLabel: child.ageLabel || src.ageLabel || '',
        nutrition: (nutrition && (nutrition.overview || '')) || src.nutrition || '',
        nutritionTips: listToTips(nutrition && (nutrition.priorities || nutrition.guidance)),
        sleep: (sleep && (sleep.overview || '')) || src.sleep || '',
        sleepTips: listToTips(sleep && (sleep.routine || sleep.guidance)),
        playTips: ((guide && guide.activities) || []).slice(0, 3).map((item) => item.title).filter(Boolean),
        focus: ((guide && guide.monthlyFocus) || []).slice(0, 3).map((item) => item.title || item.summary).filter(Boolean),
        health: (health && (health.overview || '')) || src.health || '',
        expectFood: sectionItems(guide, 'food'),
        expectMotor: sectionItems(guide, 'motor'),
        expectSpeech: sectionItems(guide, 'speech'),
        expectSleep: sectionItems(guide, 'sleep'),
        heightLabel: src.heightLabel || (last.height != null ? `قد ${last.height} سم` : ''),
        weightLabel: src.weightLabel || (last.weight != null ? `وزن ${last.weight} کگ` : ''),
        allergies: src.allergies || collectTags(src.child && src.child.allergies),
        illnesses: src.illnesses || collectTags(src.child && src.child.special_illnesses)
    };
}

function detectChatIntent(raw, child) {
    const text = normalizeText(raw);
    if (!text) return 'empty';
    const months = monthsOf(child);
    const feverC = extractFeverC(text);
    if (hasAny(text, HARD_RED) || (feverC != null && (feverC >= 38.5 || months < 3))) return 'urgent';
    if (feverC != null || /تب/.test(text)) return 'fever';
    if (/^(سلام|درود|هی|hi|hello)([\s!؟?].*)?$/i.test(text)) return 'greeting';
    if (/قد|وزن|صدک|منحنی|نمودار/.test(text)) return 'growth';
    if (/خور|غذا|تغذیه|شیر|اشتها|بدغذا|قاشق|صبحانه|میان.?وعده|لقمه/.test(text)) return 'food';
    if (/خواب|بیدار|چرت|بدخواب/.test(text) || /شب(?:‌| )?ها/.test(text)) return 'sleep';
    if (/واکسن/.test(text)) return 'vaccine';
    if (/مدرسه|تمرکز|مشق/.test(text)) return 'school';
    if (/بازی|فعالیت/.test(text)) return 'play';
    if (/راه|قدم|ایستادن|ایستاده|نشستن|چهار ?دست|تعادل|خزیدن/.test(text)) return 'motor';
    if (/حرف|کلمه|گفتار|جیغ|اشاره|صحبت|زبان/.test(text)) return 'speech';
    if (/قشقرق|لجبازی|گاز|جدایی|اضطراب|کج.?خلق|رفتار/.test(text)) return 'behavior';
    if (/رشد/.test(text)) return 'growth';
    return 'other';
}

function isUrgentConcern(text, child) {
    return detectChatIntent(text, child) === 'urgent';
}

function analyzeConcernLocal(child, concernText) {
    const name = childNameOf(child);
    const months = monthsOf(child);
    const gender = genderWord(child);
    const text = normalizeText(concernText);
    const ageLabel = ageLabelOf(child);
    const feverC = extractFeverC(text);

    if (!text) {
        return {
            triage_status: TRIAGE.NORMAL_VARIATION,
            status_badge: { text: 'هنوز نگرانی نوشته نشده', color: 'green' },
            summary_verdict: `برای ${name} یک جمله کوتاه درباره نگرانی‌تان بنویسید تا راهنمایی متناسب با سن ${ageLabel} بدهیم.`,
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

    const urgent = isUrgentConcern(text, child);
    const fever = /تب/.test(text) || feverC != null;
    const speech = hasAny(text, SPEECH);
    const motor = hasAny(text, MOTOR);
    const sleep = hasAny(text, SLEEP) || /شب(?:‌| )?ها/.test(text);
    const food = hasAny(text, FOOD);
    const behavior = hasAny(text, BEHAVIOR);

    let status = TRIAGE.NORMAL_VARIATION;
    if (urgent) status = TRIAGE.CONSULT_SPECIALIST;
    else if (fever) status = TRIAGE.MONITOR_CLOSELY;
    else if ((motor && months >= 18 && /راه|قدم/.test(text)) || (speech && months >= 18 && /هیچ کلم|کلمه‌ای نمی|کلمه ای نمی/.test(text))) {
        status = TRIAGE.MONITOR_CLOSELY;
    } else if ((motor && months >= 15 && /اصلا.*راه|تنهایی راه نمی/.test(text)) || (speech && months >= 15 && /اصلا حرف|هیچ کلم/.test(text))) {
        status = TRIAGE.MONITOR_CLOSELY;
    }

    const badge = status === TRIAGE.CONSULT_SPECIALIST
        ? { text: 'نیاز به بررسی تخصصی', color: 'red' }
        : status === TRIAGE.MONITOR_CLOSELY
            ? { text: 'نیاز به پیگیری نزدیک', color: 'yellow' }
            : { text: 'روند طبیعی رشد در این بازه سنی', color: 'green' };

    let summary = `برای ${gender} ${ageLabel}، خیلی از تفاوت‌ها هنوز در بازه طبیعی است.`;
    if (fever || urgent) {
        summary = feverC
            ? `تب حدود ${feverC} درجه برای ${name} (${ageLabel}) موضوع رشد طبیعی نیست؛ با پزشک کودک تماس بگیرید.`
            : `با توجه به نشانه‌هایی که نوشتید، این موضوع را زود با پزشک کودک مطرح کنید. این پیام تشخیص نیست.`;
    } else if (motor && months < 18) {
        summary = `تا حدود ۱۸ ماهگی راه نرفتن مستقل در بسیاری از کودکان دیده می‌شود؛ اگر می‌ایستد یا با کمک جابه‌جا می‌شود معمولاً روند طبیعی است.`;
    } else if (motor && months >= 36) {
        summary = `در ${ageLabel} راه رفتن مستقل انتظار می‌رود. اگر تعادل اخیراً بد شده یا مهارتی از دست رفته، با پزشک مطرح کنید.`;
    }
    if (speech && months < 16 && !fever && !urgent) {
        summary = `${summary} در این سن اشاره، آوا و یکی‌دو کلمه معنی‌دار مهم‌تر از جمله کامل است.`;
    }

    const analysis = {
        motor_explanation: motor
            ? (months < 18
                ? 'کودکان معمولاً بین ۹ تا ۱۸ ماهگی راه می‌افتند. ایستادن با تکیه یا چند قدم با دست شما نشانه تقویت عضله است، نه تأخیر قطعی.'
                : months < 36
                    ? 'بعد از ۱۸ ماهگی اگر هنوز بدون کمک نمی‌ایستد یا راه نمی‌رود، بهتر است وضعیت حرکت توسط پزشک بررسی شود.'
                    : 'در این سن تمرکز روی تعادل، دویدن و مهارت ظریف است، نه شروع راه رفتن.')
            : '',
        speech_explanation: speech
            ? (months < 16
                ? 'جیغ یا اشاره برای درخواست در این سن رایج است. مهم این است که به اسمش واکنش بدهد و اشاره هدفمند داشته باشد؛ شما مدل کلمه را آرام تکرار کنید.'
                : 'اگر پس از ۱۶–۱۸ ماهگی هیچ کلمه معنی‌دار یا اشاره‌ای نیست، یا تماس چشمی خیلی کم است، پیگیری گفتار و شنوایی توصیه می‌شود.')
            : ''
    };

    const home_actions = [];
    if (fever || urgent) {
        home_actions.push({
            title: 'آرام‌کردن تب و تماس با پزشک',
            description: 'لباس سبک، مایعات، محیط خنک. اگر بی‌حالی، تنفس سخت، جوش منتشر، تشنج یا سن زیر ۳ ماه است فوری به پزشک/اورژانس مراجعه کنید.'
        });
    }
    if (motor && months < 36) {
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
        fever || urgent ? 'بی‌حالی، تنفس سخت، تشنج، جوش منتشر یا ننوشیدن مایعات' : (months >= 15 ? 'عدم توانایی ایستادن حتی با تکیه تا ۱۵ ماهگی' : 'سستی شدید بدن یا استفاده نکردن از یک سمت بدن'),
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

function analysisToChatReply(analysis) {
    const lines = [analysis.summary_verdict];
    const home = (analysis.home_actions || []).slice(0, 3);
    if (home.length) {
        lines.push(`الان در خانه:\n${home.map((item, index) => `${index + 1}. ${item.title}: ${item.description}`).join('\n')}`);
    }
    if (analysis.recommended_action && analysis.recommended_action.needs_doctor_visit) {
        lines.push('این مورد را زود با پزشک کودک مطرح کنید. این پیام تشخیص پزشکی نیست.');
    } else {
        lines.push(DISCLAIMER);
    }
    return lines.filter(Boolean).join('\n\n');
}

function lastUserText(messages) {
    const list = Array.isArray(messages) ? messages : [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
        if (list[i] && list[i].role === 'user' && String(list[i].content || '').trim()) {
            return String(list[i].content).trim();
        }
    }
    return '';
}

function withAllergyNote(ctx, months) {
    const allergy = ctx && ctx.allergies;
    if (allergy) return `آلرژی ثبت‌شده: ${allergy}. هر غذای جدید را با احتیاط و هماهنگی پزشک بدهید.`;
    if (months < 12) return 'اگر سابقه‌ای از آلرژی در خانواده هست، غذای جدید را تک‌ماده و با فاصله معرفی کنید.';
    return '';
}

function feverReply(child, context, text) {
    const name = childNameOf(child);
    const months = monthsOf(child);
    const ageLabel = ageLabelOf(child, context);
    const feverC = extractFeverC(text);
    const urgent = isUrgentConcern(text, child);
    const tempBit = feverC != null ? `حدود ${feverC} درجه` : 'که نوشتید';
    const infant = months < 3;
    const heading = urgent || infant
        ? `تب ${tempBit} برای ${name} (${ageLabel}) را دست‌کم نگیرید. این «روند طبیعی رشد» نیست.`
        : `تب ${tempBit} برای ${name} در ${ageLabel} را باید پایش کنید، نه اینکه آن را طبیعی رشد بدانید.`;
    const steps = infant
        ? [
            'لباس را سبک کنید و مایعات/شیر را ادامه دهید؛ دارو را خودسرانه شروع نکنید.',
            'نوزاد زیر ۳ ماه با تب را همین امروز به پزشک یا اورژانس ببرید.',
            'اگر بی‌حال است، تنفس سخت است یا لب کبود شده، بدون معطلی اورژانس.'
        ]
        : [
            'لباس سبک، محیط خنک و مایعات کافی؛ در صورت توصیه قبلی پزشک، تب‌بر را با دوز مناسب سن بدهید.',
            feverC != null && feverC >= 39
                ? 'تب ۳۹ و بالاتر را با پزشک کودک مطرح کنید؛ اگر بی‌حال است یا مایع نمی‌خورد امروز مراجعه کنید.'
                : 'اگر تب بیش از ۴۸ ساعت ماند، جوش منتشر آمد یا حال عمومی بد شد، به پزشک مراجعه کنید.',
            'نشانه‌های خطر: تشنج، تنگی نفس، خواب‌آلودگی غیرعادی، استفراغ مکرر، خشکی دهان.'
        ];
    if (context && context.illnesses) {
        steps.push(`بیماری ثبت‌شده (${context.illnesses}) را هم به پزشک بگویید.`);
    }
    return joinReply([
        heading,
        `الان چه کار کنید:\n${numbered(steps)}`,
        urgent || infant
            ? 'این پیام تشخیص پزشکی نیست؛ برای تب با پزشک کودک تماس بگیرید.'
            : DISCLAIMER
    ]);
}

function foodReply(child, context) {
    const name = childNameOf(child);
    const months = monthsOf(child);
    const ageLabel = ageLabelOf(child, context);
    const band = (context && context.bandTitle) || ageLabel;
    const overview = (context && context.nutrition) || (
        months < 6
            ? 'در این سن تغذیه اصلی شیر مادر یا شیر خشک مناسب است؛ غذای کمکی معمولاً لازم نیست مگر توصیه پزشک.'
            : months < 12
                ? 'کنار شیر، غذای کمکی نرم و تک‌ماده را آرام گسترش دهید.'
                : 'غذای خانواده با بافت مناسب سن، وعده منظم و میان‌وعده سالم معمولاً مناسب است.'
    );
    const tips = (context && context.nutritionTips && context.nutritionTips.length)
        ? context.nutritionTips
        : (context && context.expectFood) || [
            'دو گزینه قابل‌قبول بدهید و اجبار نکنید.',
            'زمان غذا را محدود و بدون صفحه نمایش تمام کنید.'
        ];
    return joinReply([
        `برای ${name} در ${band}: ${overview}`,
        `الان در خانه:\n${numbered(tips)}`,
        withAllergyNote(context, months),
        DISCLAIMER
    ]);
}

function sleepReply(child, context) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const overview = (context && context.sleep) || `در ${ageLabel} روتین کوتاه و ثابت شب معمولاً بهتر از حرف زیاد جواب می‌دهد.`;
    const tips = (context && context.sleepTips && context.sleepTips.length)
        ? context.sleepTips
        : (context && context.expectSleep) || [
            'هر شب همان سه کار کوتاه را تکرار کنید.',
            'پاسخ بیداری شب را کم‌نور، کوتاه و یکنواخت نگه دارید.'
        ];
    return joinReply([
        `خواب این سن برای ${name}: ${overview}`,
        `پیشنهاد عملی:\n${numbered(tips)}`,
        DISCLAIMER
    ]);
}

function growthReply(child, context) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const height = context && context.heightLabel;
    const weight = context && context.weightLabel;
    if (!height && !weight) {
        return joinReply([
            `قد و وزن ${name} (${ageLabel}) هنوز در نمودار رشد ثبت نشده.`,
            'با ثبت اندازه‌گیری در همین صفحه می‌توانم بگویم نسبت به منحنی رشد در چه محدوده‌ای است. از یک عدد به‌تنهایی نتیجه پزشکی گرفته نمی‌شود.',
            DISCLAIMER
        ]);
    }
    return joinReply([
        `آخرین اندازه‌گیری ${name} در ${ageLabel}: ${[height, weight].filter(Boolean).join(' و ')}.`,
        'از یک عدد به‌تنهایی نتیجه پزشکی گرفته نمی‌شود؛ روند را در نمودار قد و وزن همین صفحه ببینید. اگر جهش یا افت ناگهانی دیدید با پزشک مطرح کنید.',
        DISCLAIMER
    ]);
}

function motorReply(child, context, last) {
    const months = monthsOf(child);
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    if (months >= 36) {
        const tips = (context && context.expectMotor) || [
            'بازی تعادلی و دویدن در فضای امن را وارد روز کنید.',
            'اگر مهارت حرکتی اخیراً پسرفت کرده، با پزشک مطرح کنید.'
        ];
        return joinReply([
            `در ${ageLabel} راه رفتن مستقل برای ${name} انتظار می‌رود؛ سؤال «هنوز راه نمی‌رود» مربوط به شیرخوارگی است.`,
            `تمرکز این سن:\n${numbered(tips)}`,
            DISCLAIMER
        ]);
    }
    const extra = (context && context.expectMotor) || [];
    const analysis = analyzeConcernLocal(child, last);
    if (extra.length && analysis.home_actions) {
        extra.forEach((tip) => {
            analysis.home_actions.push({ title: 'انتظار این سن', description: tip });
        });
    }
    return analysisToChatReply(analysis);
}

function schoolReply(child, context) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const health = (context && context.health) || 'خواب کافی، صبحانه و بازی بدون صفحه قبل از تکلیف به تمرکز کمک می‌کند.';
    const tips = [
        ...(context && context.sleepTips ? context.sleepTips.slice(0, 1) : []),
        ...(context && context.nutritionTips ? context.nutritionTips.slice(0, 1) : []),
        ...(context && context.playTips ? context.playTips.slice(0, 1).map((title) => `بازی پیشنهادی امروز: ${title}`) : [])
    ].filter(Boolean);
    if (!tips.length) {
        tips.push('ساعت خواب ثابت', 'صبحانه قبل از خروج', 'تکلیف کوتاه با استراحت میانی');
    }
    return joinReply([
        `برای تمرکز ${name} در ${ageLabel}: ${health}`,
        `شروع از خانه:\n${numbered(tips)}`,
        DISCLAIMER
    ]);
}

function playReply(child, context) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const tips = (context && context.playTips && context.playTips.length)
        ? context.playTips.map((title) => title)
        : (context && context.focus) || ['بازی کوتاه و مشترک بهتر از اسباب‌بازی زیاد است.'];
    return joinReply([
        `برای ${name} در ${ageLabel} بازی امروز می‌تواند این‌ها باشد:`,
        numbered(tips),
        DISCLAIMER
    ]);
}

function vaccineReply(child, context) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const health = (context && context.health) || 'نوبت‌های واکسن را از کارت واکسن همین کودک ببینید.';
    return joinReply([
        `برای ${name} در ${ageLabel}: ${health}`,
        'جزئیات نوبت‌ها در صفحه کارت واکسن است. تب خفیف بعد واکسن شایع است؛ تب بالا، بی‌حالی شدید یا تنفس سخت را با پزشک مطرح کنید.',
        DISCLAIMER
    ]);
}

function otherReply(child, context, last) {
    const name = childNameOf(child);
    const ageLabel = ageLabelOf(child, context);
    const band = (context && context.bandTitle) || ageLabel;
    const focus = (context && context.focus) || [];
    const analysis = analyzeConcernLocal(child, last);
    if (analysis.triage_status !== TRIAGE.NORMAL_VARIATION || (analysis.home_actions || []).length > 1) {
        return analysisToChatReply(analysis);
    }
    const tips = focus.length ? focus : [
        'غذا، خواب، قد و وزن یا نگرانی مشخص را بپرسید تا جواب دقیق‌تر بدهم.',
        (context && context.nutrition) || 'وعده منظم و بدون اجبار.',
        (context && context.sleep) || 'روتین ثابت شب.'
    ];
    return joinReply([
        `سؤال‌تان را درباره ${name} در ${band} گرفتم. برای جواب دقیق‌تر بگویید موضوع غذاست، خواب، قد و وزن، حرکت یا تب.`,
        `در این سن معمولاً روی این‌ها تمرکز می‌شود:\n${numbered(tips.slice(0, 3))}`,
        DISCLAIMER
    ]);
}

function chatGrowthAssistantLocal(child, messages, context) {
    const name = childNameOf(child);
    const months = monthsOf(child);
    const ctx = context || {};
    const last = lastUserText(messages);
    const intent = detectChatIntent(last, child);
    if (intent === 'empty') {
        return `سلام، من دستیار رشد ${name} هستم. سنش حدود ${ageLabelOf(child, ctx) || `${months} ماهگی`} است. از قد و وزن، غذا، خواب یا نگرانی‌تان بپرسید.`;
    }
    if (intent === 'urgent' || intent === 'fever') return feverReply(child, ctx, last);
    if (intent === 'greeting') {
        return `سلام، من دستیار رشد ${name} هستم (${ageLabelOf(child, ctx)}). می‌توانید از غذا، خواب، قد و وزن یا نگرانی‌تان بپرسید.`;
    }
    if (intent === 'food') return foodReply(child, ctx);
    if (intent === 'sleep') return sleepReply(child, ctx);
    if (intent === 'growth') return growthReply(child, ctx);
    if (intent === 'motor') return motorReply(child, ctx, last);
    if (intent === 'school') return schoolReply(child, ctx);
    if (intent === 'play') return playReply(child, ctx);
    if (intent === 'vaccine') return vaccineReply(child, ctx);
    if (intent === 'speech' || intent === 'behavior') return analysisToChatReply(analyzeConcernLocal(child, last));
    return otherReply(child, ctx, last);
}

function groundedSystemPrompt(child, context, localReply) {
    const months = monthsOf(child);
    return [
        'شما دستیار رشد تات‌کیدز هستید. فقط فارسی، کوتاه و مرتبط با سؤال آخر والد جواب بدهید.',
        'تشخیص بیماری ندهید. تب، تشنج، تنگی نفس یا بی‌حالی را هرگز «روند طبیعی رشد» نخوانید و به پزشک ارجاع دهید.',
        'از سن واقعی کودک و زمینه زیر استفاده کنید؛ مثال شیرخوارگی را برای کودک بزرگ‌تر نیاورید.',
        `کودک: ${JSON.stringify({
            name: childNameOf(child),
            gender: child && child.gender,
            age_in_months: months,
            age_label: ageLabelOf(child, context),
            context: context || {}
        })}`,
        `پاسخ مرجع داخلی (اولویت با همین مضمون): ${localReply}`
    ].join('\n');
}

async function chatGrowthAssistant(child, messages, context) {
    const last = lastUserText(messages);
    const intent = detectChatIntent(last, child);
    const localReply = chatGrowthAssistantLocal(child, messages, context);
    const apiKey = process.env.OPENAI_API_KEY || process.env.GROWTH_AI_KEY;
    if (!apiKey || intent === 'urgent' || intent === 'fever') {
        return { reply: localReply, source: 'local', intent };
    }

    const endpoint = process.env.GROWTH_AI_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.GROWTH_AI_MODEL || 'gpt-4o-mini';
    const history = (Array.isArray(messages) ? messages : [])
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
        .slice(-12)
        .map((item) => ({ role: item.role, content: String(item.content).slice(0, 1200) }));
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                messages: [
                    { role: 'system', content: groundedSystemPrompt(child, context, localReply) },
                    ...history
                ]
            })
        });
        if (!res.ok) return { reply: localReply, source: 'local', intent };
        const data = await res.json();
        const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!reply) return { reply: localReply, source: 'local', intent };
        return { reply: String(reply).trim(), source: 'model', intent };
    } catch (_err) {
        return { reply: localReply, source: 'local', intent };
    }
}

async function analyzeConcernWithModel(child, concernText) {
    if (isUrgentConcern(concernText, child) || detectChatIntent(concernText, child) === 'fever') {
        return analyzeConcernLocal(child, concernText);
    }
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
                content: 'شما دستیار هوشمند ارزیابی رشد کودک تات‌کیدز هستید. فقط JSON معتبر برگردانید. لحن آرام، علمی و بدون برچسب‌زنی. در red flag فوری به پزشک ارجاع دهید. تب را روند طبیعی نخوانید.'
            },
            {
                role: 'user',
                content: JSON.stringify({
                    child_info: {
                        name: child.name,
                        gender: child.gender,
                        age_in_months: monthsOf(child),
                        age_label: ageLabelOf(child),
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
    analyzeConcernWithModel,
    chatGrowthAssistantLocal,
    chatGrowthAssistant,
    detectChatIntent,
    extractFeverC,
    buildAssistantContext
};
