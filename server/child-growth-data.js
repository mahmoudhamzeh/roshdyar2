/**
 * Child growth age-band content for TatKids.
 * Educational parenting guidance only — not medical diagnosis.
 * CommonJS module for the Express server.
 */

'use strict';

const DOMAINS = {
  LANGUAGE: { id: 'LANGUAGE', label: 'زبان', labelFull: 'رشد زبان و گفتار' },
  SOCIAL: { id: 'SOCIAL', label: 'اجتماعی', labelFull: 'رشد اجتماعی و عاطفی' },
  COGNITIVE: { id: 'COGNITIVE', label: 'شناخت', labelFull: 'رشد شناختی و یادگیری' },
  MOTOR: { id: 'MOTOR', label: 'حرکتی', labelFull: 'رشد حرکتی درشت و ظریف' },
  INDEPENDENCE: { id: 'INDEPENDENCE', label: 'استقلال', labelFull: 'مهارت‌های استقلال روزمره' },
};

const MILESTONE_STATUS = {
  NOT_CHECKED: 'NOT_CHECKED',
  OBSERVED: 'OBSERVED',
  NOT_YET_OBSERVED: 'NOT_YET_OBSERVED',
  UNSURE: 'UNSURE',
};

const DISCLAIMER =
  'این راهنما جنبه آموزشی دارد و جایگزین معاینه، تشخیص یا درمان پزشکی نیست. اگر درباره رشد، تغذیه، خواب یا رفتار کودک نگران هستید، با پزشک کودکان مشورت کنید.';

const CONCERN_DOMAIN_MAP = {
  گفتار: 'LANGUAGE',
  زبان: 'LANGUAGE',
  حرکت: 'MOTOR',
  حرکتی: 'MOTOR',
  رفتار: 'SOCIAL',
  اجتماعی: 'SOCIAL',
  تغذیه: 'INDEPENDENCE',
  خواب: 'SOCIAL',
  قد: 'MOTOR',
  وزن: 'MOTOR',
  بینایی: 'COGNITIVE',
  شنوایی: 'LANGUAGE',
  شناخت: 'COGNITIVE',
  استقلال: 'INDEPENDENCE',
};

function getAgeInMonths(birthDate) {
  if (!birthDate) return 0;
  const birth = new Date(String(birthDate).replace(/\//g, '-'));
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

function formatAgeLabel(months) {
  const total = Math.max(0, Number(months) || 0);
  const years = Math.floor(total / 12);
  const rem = total % 12;
  if (years <= 0) {
    if (total === 0) return 'کمتر از یک ماه';
    if (total === 1) return '1 ماهه';
    return `${total} ماهه`;
  }
  if (rem === 0) {
    if (years === 1) return '1 ساله';
    return `${years} ساله`;
  }
  const yearPart = years === 1 ? '1 سال' : `${years} سال`;
  const monthPart = rem === 1 ? '1 ماه' : `${rem} ماه`;
  return `${yearPart} و ${monthPart}`;
}

/**
 * Corrected age for premature infants (gestationalAge < 37 weeks).
 * Formula: max(0, chronologicalMonths - (40 - gestationalAgeWeeks)).
 * Conceptually most useful under 24 months chronological age.
 */
function getCorrectedAgeMonths(child) {
  const chronological = getAgeInMonths(child && child.birthDate);
  const gestational = Number(child && child.gestationalAge);
  if (!gestational || Number.isNaN(gestational) || gestational >= 37) {
    return chronological;
  }
  const adjustmentWeeks = Math.max(0, 40 - gestational);
  return Math.max(0, chronological - adjustmentWeeks);
}

function isChildPremature(child) {
  const gestational = Number(child && child.gestationalAge);
  return Boolean(gestational && !Number.isNaN(gestational) && gestational < 37);
}

function getChildDisplayName(child) {
  if (!child) return 'کودک';
  if (child.name && String(child.name).trim()) return String(child.name).trim();
  const combined = [child.firstName, child.lastName]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return combined || 'کودک';
}

function getBandForAge(ageInMonths) {
  const months = Math.max(0, Number(ageInMonths) || 0);
  if (!AGE_BANDS.length) return null;
  if (months > 72) return AGE_BANDS[AGE_BANDS.length - 1];
  return (
    AGE_BANDS.find((band) => months >= band.minMonths && months <= band.maxMonths) ||
    AGE_BANDS[0]
  );
}

function normalizeStatus(entry) {
  if (!entry) return MILESTONE_STATUS.NOT_CHECKED;
  if (typeof entry === 'string') return entry;
  return entry.status || MILESTONE_STATUS.NOT_CHECKED;
}

function calendarDayKey(now) {
  const date = now instanceof Date ? now : new Date(now || Date.now());
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    return `${fallback.getUTCFullYear()}-${String(fallback.getUTCMonth() + 1).padStart(2, '0')}-${String(fallback.getUTCDate()).padStart(2, '0')}`;
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function completionDayKey(completion) {
  if (!completion || typeof completion !== 'object') return null;
  const at = completion.completedAt || completion.updatedAt || null;
  if (!at) return null;
  return String(at).slice(0, 10);
}

function hashDay(value) {
  return String(value || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function isCompletedOnDay(completion, dayKey) {
  if (!completion || (completion.completed !== true && completion !== true)) return false;
  const doneDay = completionDayKey(completion);
  return Boolean(doneDay && doneDay === dayKey);
}

const EXPECT_BLUEPRINT = [
  { id: 'speech', title: 'کلام و ارتباط', domains: ['LANGUAGE'], sources: [] },
  { id: 'motor', title: 'حرکت و تعادل', domains: ['MOTOR'], sources: [] },
  { id: 'food', title: 'تغذیه و استقلال', domains: ['INDEPENDENCE'], sources: ['nutrition'] },
  { id: 'sleep', title: 'خواب و روتین', domains: [], sources: ['sleep'] },
  { id: 'mood', title: 'رفتار و خلق‌وخو', domains: ['SOCIAL'], sources: ['behavior'] }
];

function shortText(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function buildExpectSections(band) {
  const focus = (band && band.monthlyFocus) || [];
  return EXPECT_BLUEPRINT.map((slot) => {
    const fromFocus = focus
      .filter((item) => slot.domains.includes(item.domain))
      .map((item) => ({
        title: item.title,
        summary: item.summary,
        detail: item.detail
      }));
    const extra = [];
    slot.sources.forEach((source) => {
      const block = band && band[source];
      if (!block) return;
      if (block.overview) {
        extra.push({
          title: source === 'sleep' ? 'خواب این مرحله' : source === 'nutrition' ? 'تغذیه این مرحله' : 'رفتار این مرحله',
          summary: shortText(block.overview, 90),
          detail: block.overview
        });
      }
      const list = block.routine || block.priorities || block.topics || [];
      list.slice(0, 2).forEach((item) => {
        extra.push({
          title: item.title,
          summary: shortText(item.detail, 90),
          detail: item.detail
        });
      });
    });
    const items = (fromFocus.length ? fromFocus : extra).slice(0, 3);
    if (!items.length && extra.length) items.push(...extra.slice(0, 2));
    return {
      id: slot.id,
      title: slot.title,
      teaser: items[0] ? items[0].summary || items[0].title : 'در این ماه این حوزه را آرام و کوتاه دنبال کنید.',
      items
    };
  }).filter((section) => section.items.length > 0);
}

function buildRedFlags(band) {
  const healthItems = ((band && band.health && (band.health.priorities || band.health.topics)) || []).slice(0, 3);
  const safetyItems = ((band && band.safety && band.safety.items) || []).slice(0, 2);
  const flags = [];
  healthItems.forEach((item) => {
    flags.push({
      id: item.id || `h-${item.title}`,
      title: item.title,
      detail: shortText(item.detail, 140),
      level: 'watch'
    });
  });
  safetyItems.forEach((item) => {
    flags.push({
      id: item.id || `s-${item.title}`,
      title: item.title,
      detail: shortText(item.detail, 140),
      level: 'alert'
    });
  });
  return flags.slice(0, 5);
}

function buildSafetyTasks(band, safetyChecks) {
  const checks = safetyChecks || {};
  return ((band && band.safety && band.safety.items) || []).slice(0, 4).map((item) => ({
    id: item.id,
    title: item.title,
    detail: shortText(item.detail, 120),
    done: Boolean(checks[item.id] && checks[item.id].done)
  }));
}

function recommendActivities(band, options) {
  const opts = options || {};
  const milestoneStatuses = opts.milestoneStatuses || {};
  const completions = opts.completions || {};
  const parentConcern = opts.parentConcern || null;
  const todayKey = opts.today || calendarDayKey();
  const dailyCount = Number(opts.dailyCount) > 0 ? Number(opts.dailyCount) : 3;
  const activities = (band && band.activities) || [];
  if (!activities.length) return [];

  const concernDomain =
    parentConcern && CONCERN_DOMAIN_MAP[String(parentConcern).trim()]
      ? CONCERN_DOMAIN_MAP[String(parentConcern).trim()]
      : null;

  const scored = activities.map((activity) => {
    let score = 10;
    const reasons = [];
    const completion = completions[activity.id];
    const completedToday = isCompletedOnDay(completion, todayKey);
    const lastDay = completionDayKey(completion);

    const related = activity.relatedMilestones || [];
    let relatedBoost = 0;
    related.forEach((milestoneId) => {
      const status = normalizeStatus(milestoneStatuses[milestoneId]);
      if (status === MILESTONE_STATUS.NOT_YET_OBSERVED) {
        relatedBoost += 5;
      } else if (status === MILESTONE_STATUS.UNSURE) {
        relatedBoost += 3;
      } else if (status === MILESTONE_STATUS.OBSERVED) {
        relatedBoost -= 1;
      }
    });
    if (relatedBoost > 0) {
      score += relatedBoost;
      reasons.push('مرتبط با مهارتی که هنوز کامل مشاهده نشده');
    }

    if (completedToday) {
      score -= 20;
      reasons.push('امروز انجام شده');
    } else if (lastDay && lastDay !== todayKey) {
      score -= 3;
      reasons.push('قبلاً انجام شده؛ امروز بازی تازه‌تری پیشنهاد می‌شود');
    } else {
      score += 2;
      reasons.push('هنوز برای امروز تیک نخورده');
    }

    if (concernDomain && Array.isArray(activity.domains) && activity.domains.includes(concernDomain)) {
      score += 6;
      reasons.push('هم‌راستا با موضوعی که مطرح کرده‌اید');
    }

    if (activity.difficulty === 'easy') {
      score += 1;
      reasons.push('شروع آسان برای امروز');
    }

    if (!reasons.length) {
      reasons.push('مناسب سن فعلی کودک');
    }

    return Object.assign({}, activity, { score, reasons, completedToday, lastCompletedOn: lastDay });
  });

  scored.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  const available = scored.filter((item) => !item.completedToday);
  const doneToday = scored.filter((item) => item.completedToday);
  const pool = available.length ? available : scored;
  const offset = pool.length ? hashDay(`${todayKey}:${band && band.id ? band.id : ''}`) % pool.length : 0;
  const rotated = pool.length ? pool.slice(offset).concat(pool.slice(0, offset)) : [];
  const daily = rotated.slice(0, Math.min(dailyCount, rotated.length));
  const ids = new Set(daily.map((item) => item.id));
  doneToday.forEach((item) => {
    if (daily.length < dailyCount && !ids.has(item.id)) {
      daily.push(item);
      ids.add(item.id);
    }
  });
  return daily;
}

function buildAgeGuidePayload(child, options) {
  const opts = options || {};
  const milestoneStatuses = opts.milestoneStatuses || {};
  const completions = opts.completions || {};
  const safetyChecks = opts.safetyChecks || {};
  const todayKey = opts.today || calendarDayKey();
  const growthSummary = opts.growthSummary != null ? opts.growthSummary : null;

  const ageInMonths = getAgeInMonths(child && child.birthDate);
  const premature = isChildPremature(child);
  const correctedAgeInMonths = getCorrectedAgeMonths(child);
  const contentAge =
    premature && ageInMonths < 24 ? correctedAgeInMonths : ageInMonths;
  const band = getBandForAge(contentAge);
  const ageYears = Math.floor(ageInMonths / 12);
  const ageMonthsRemainder = ageInMonths % 12;

  const milestoneItems = ((band && band.milestones) || []).map((milestone) => {
    const status = normalizeStatus(milestoneStatuses[milestone.id]);
    return Object.assign({}, milestone, { status });
  });
  const checked = milestoneItems.filter(
    (item) => item.status && item.status !== MILESTONE_STATUS.NOT_CHECKED
  ).length;
  const observed = milestoneItems.filter(
    (item) => item.status === MILESTONE_STATUS.OBSERVED
  ).length;

  const activities = recommendActivities(band, {
    milestoneStatuses,
    completions,
    parentConcern: opts.parentConcern,
    today: todayKey,
    dailyCount: 3
  });

  return {
    child: {
      id: child && child.id != null ? child.id : null,
      name: getChildDisplayName(child),
      ageInMonths,
      ageYears,
      ageMonthsRemainder,
      ageLabel: formatAgeLabel(ageInMonths),
      correctedAgeInMonths,
      isPremature: premature,
    },
    band: band
      ? { id: band.id, title: band.title, subtitle: band.subtitle }
      : null,
    today: todayKey,
    expectSections: buildExpectSections(band),
    redFlags: buildRedFlags(band),
    safetyTasks: buildSafetyTasks(band, safetyChecks),
    monthlyFocus: (band && band.monthlyFocus) || [],
    milestones: {
      total: milestoneItems.length,
      checked,
      observed,
      items: milestoneItems,
    },
    activities,
    growthSummary,
    health: (band && band.health) || null,
    nutrition: (band && band.nutrition) || null,
    sleep: (band && band.sleep) || null,
    behavior: (band && band.behavior) || null,
    safety: (band && band.safety) || null,
    disclaimer: DISCLAIMER,
  };
}

const AGE_BANDS = [
  {
    "id": "0-2",
    "minMonths": 0,
    "maxMonths": 1,
    "title": "۰ تا ۲ ماهگی",
    "subtitle": "پیوند، آرامش و شناخت دنیای جدید",
    "monthlyFocus": [
      {
        "domain": "SOCIAL",
        "title": "پیوند و احساس امنیت",
        "summary": "تماس پوستی، پاسخ به گریه و لبخند آرام",
        "detail": "در این سن مهم‌ترین کار شما حضور آرام و قابل پیش‌بینی است. وقتی به گریه پاسخ می‌دهید، کودک یاد می‌گیرد دنیا امن است. تماس پوستی کوتاه در بیداری، بغل کردن و نگاه مهربان، پایه دلبستگی را می‌سازد."
      },
      {
        "domain": "MOTOR",
        "title": "حمایت گردن و tummy time کوتاه",
        "summary": "زمان کوتاه روی شکم زیر نظارت کامل",
        "detail": "عضلات گردن و شانه به‌تدریج قوی می‌شوند. چند نوبت کوتاه tummy time در بیداری و روی سطح سفت، بهتر از یک نوبت طولانی است. همیشه گردن را حمایت کنید و هرگز نوزاد را روی شکم تنها نگذارید."
      },
      {
        "domain": "LANGUAGE",
        "title": "شنیدن صدای آشنا",
        "summary": "حرف زدن آرام، آواز و نام بردن حس‌ها",
        "detail": "نوزاد هنوز حرف نمی‌زند اما مغز او برای زبان فعال است. با صدای آرام درباره کارهای روزمره حرف بزنید و گاهی آواز بخوانید. مکث کوتاه بعد از صدای او، حس گفت‌وگوی دوطرفه را تمرین می‌دهد."
      },
      {
        "domain": "COGNITIVE",
        "title": "توجه به چهره و نور ملایم",
        "summary": "دنبال کردن چهره از فاصله نزدیک",
        "detail": "چهره شما جذاب‌ترین تصویر برای نوزاد است. در فاصله حدود ۲۰ تا ۳۰ سانتی‌متر با او چشم در چشم باشید. نور خیلی تند یا صدای بلند را کم کنید تا بتواند بهتر تمرکز کند و زود خسته نشود."
      }
    ],
    "milestones": [
      {
        "id": "m0-eye-contact",
        "domain": "SOCIAL",
        "title": "تماس چشمی کوتاه",
        "description": "برای چند لحظه به چهره شما نگاه می‌کند."
      },
      {
        "id": "m0-calm-voice",
        "domain": "SOCIAL",
        "title": "آرام شدن با صدای والد",
        "description": "با صدای آشنا یا بغل شدن کمی آرام‌تر می‌شود."
      },
      {
        "id": "m0-startle",
        "domain": "COGNITIVE",
        "title": "واکنش به صدای ناگهانی",
        "description": "به صدای بلند با پلک زدن یا تکان خوردن واکنش نشان می‌دهد."
      },
      {
        "id": "m0-track-near",
        "domain": "COGNITIVE",
        "title": "دنبال کردن شیء نزدیک",
        "description": "شیء یا چهره را در محدوده نزدیک با چشم دنبال می‌کند."
      },
      {
        "id": "m0-head-lift",
        "domain": "MOTOR",
        "title": "بلند کردن مختصر سر روی شکم",
        "description": "روی شکم برای لحظاتی سر را از سطح جدا می‌کند."
      },
      {
        "id": "m0-hands-face",
        "domain": "MOTOR",
        "title": "حرکت دست به سمت صورت",
        "description": "دست‌ها را به سمت دهان یا صورت می‌آورد."
      },
      {
        "id": "m0-suck",
        "domain": "INDEPENDENCE",
        "title": "مکیدن مؤثر هنگام تغذیه",
        "description": "در تغذیه، ریتم مکیدن نسبتاً منظم دارد."
      },
      {
        "id": "m0-soft-sounds",
        "domain": "LANGUAGE",
        "title": "صداهای نرم و ناله کوتاه",
        "description": "غیر از گریه، صداهای کوتاه و نرم درمی‌آورد."
      },
      {
        "id": "m0-prefer-face",
        "domain": "SOCIAL",
        "title": "ترجیح چهره به اشیاء",
        "description": "به چهره انسان بیشتر از اشیای بی‌جان توجه می‌کند."
      }
    ],
    "activities": [
      {
        "id": "a0-face-time",
        "title": "بازی چهره به چهره",
        "shortDescription": "لبخند، نگاه و حرف آرام روبروی نوزاد",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "تقویت پیوند و توجه اجتماعی",
        "materials": "نیازی به وسیله خاص نیست",
        "instructions": [
          "نوزاد را در فاصله امن روبروی صورت خود بگیرید و گردن را حمایت کنید.",
          "لبخند بزنید و با صدای آرام چند جمله کوتاه بگویید.",
          "وقتی به شما نگاه کرد، همان نگاه را چند ثانیه نگه دارید.",
          "اگر روی برگرداند یا بی‌قرار شد، بازی را تمام کنید و بعداً برگردید."
        ],
        "tip": "بهترین زمان معمولاً بعد از تغذیه و تعویض پوشک و وقتی کاملاً بیدار است.",
        "safety": "هرگز گردن نوزاد را بدون حمایت رها نکنید.",
        "relatedMilestones": [
          "m0-eye-contact",
          "m0-prefer-face"
        ]
      },
      {
        "id": "a0-tummy-short",
        "title": "زمان کوتاه روی شکم",
        "shortDescription": "۱ تا ۳ دقیقه tummy time با تشویق چهره شما",
        "duration": 3,
        "difficulty": "easy",
        "domains": [
          "MOTOR"
        ],
        "goal": "تقویت گردن و شانه‌ها",
        "materials": "سطح سفت تمیز و یک پتوی نازک",
        "instructions": [
          "در بیداری کامل، نوزاد را روی شکم روی سطح سفت بگذارید.",
          "صورت خود را نزدیک او قرار دهید تا تشویق به بالا آوردن سر شود.",
          "۱ تا ۳ دقیقه ادامه دهید و سپس به پشت برگردانید.",
          "این کار را چند نوبت کوتاه در روز تکرار کنید."
        ],
        "tip": "اگر خیلی ناراحت شد، tummy time را روی سینه خودتان امتحان کنید.",
        "safety": "فقط در بیداری و با نظارت کامل؛ هرگز روی شکم برای خواب تنها نگذارید.",
        "relatedMilestones": [
          "m0-head-lift"
        ]
      },
      {
        "id": "a0-soft-song",
        "title": "آواز و نام‌بردن حس‌ها",
        "shortDescription": "آواز کوتاه و توصیف آنچه حس می‌کند",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "COGNITIVE"
        ],
        "goal": "آشنایی با ریتم زبان و آرامش",
        "materials": "نیازی نیست",
        "instructions": [
          "یک آهنگ آرام و تکراری بخوانید.",
          "لمس ملایم دست یا پا را با کلمه همراه کنید: «دست نرمه».",
          "بعد از هر عبارت کوتاه مکث کنید.",
          "اگر آرام شد، همان الگو را یک دور دیگر تکرار کنید."
        ],
        "tip": "صدای شما از هر اسباب‌بازی مهم‌تر است.",
        "safety": "صدای خیلی بلند یا موسیقی تند نزدیک گوش نوزاد پخش نکنید.",
        "relatedMilestones": [
          "m0-soft-sounds",
          "m0-calm-voice"
        ]
      },
      {
        "id": "a0-contrast-card",
        "title": "کارت ساده سیاه و سفید",
        "shortDescription": "نشان دادن الگوی ساده با حرکت آهسته",
        "duration": 4,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "تمرین دنبال کردن بینایی",
        "materials": "یک کارت یا کاغذ با الگوی ساده سیاه‌وسفید",
        "instructions": [
          "کارت را در فاصله حدود ۲۵ سانتی‌متر نگه دارید.",
          "آهسته به چپ و راست حرکت دهید.",
          "صبر کنید ببینید چشم‌ها مسیر را دنبال می‌کنند.",
          "بعد از ۱ تا ۲ دقیقه متوقف شوید تا خسته نشود."
        ],
        "tip": "نور اتاق را ملایم نگه دارید تا خیرگی ایجاد نشود.",
        "safety": "کارت را به دهان نوزاد نزدیک نکنید و اشیای جداشدنی نداشته باشد.",
        "relatedMilestones": [
          "m0-track-near"
        ]
      }
    ],
    "sleep": {
      "overview": "خواب نوزاد در هفته‌های اول نامنظم و کوتاه است و این طبیعی است. اولویت با خواب ایمن است: به پشت خواباندن، سطح سفت، و دوری از بالش، پتو شل و اسباب نرم داخل تخت.",
      "routine": [
        {
          "title": "نشانه‌های خواب‌آلودگی را بشناسید",
          "detail": "مالیدن چشم، خیره شدن یا بی‌قراری آرام معمولاً یعنی وقت آرام‌سازی است."
        },
        {
          "title": "محیط را کمی تاریک و ساکت کنید",
          "detail": "نور ملایم و صدای کم کمک می‌کند مغز بین روز و شب تفاوت بگذارد."
        },
        {
          "title": "تغذیه و آروغ را کامل کنید",
          "detail": "قبل از خواباندن، تغذیه و آروغ مناسب ناراحتی شکمی را کمتر می‌کند."
        },
        {
          "title": "به پشت در تخت امن بخوابانید",
          "detail": "پس از آرام شدن، نوزاد را به پشت در فضای خواب خودش بگذارید."
        },
        {
          "title": "پاسخ شبانه را آرام نگه دارید",
          "detail": "شب‌ها نور و حرف را کم کنید تا بیداری‌ها کوتاه‌تر بمانند."
        }
      ],
      "guidance": [
        "خواب روز و شب در ابتدا شبیه هم است؛ انتظار نظم کامل نداشته باشید.",
        "هم‌خوابی روی مبل یا صندلی ناایمن است.",
        "اگر نوزاد خیلی سخت بیدار می‌شود یا تنفس غیرعادی دارد، فوراً با پزشک تماس بگیرید.",
        "دمای اتاق را متعادل نگه دارید؛ لباس زیاد و گرمای بیش از حد خطرناک است.",
        "پاسخ به نیازهای شبانه بخشی از مراقبت سالم است، نه «لوس کردن»."
      ],
      "problems": [
        {
          "id": "sleep-day-night",
          "title": "جا‌به‌جا بودن خواب روز و شب",
          "guidance": [
            "برای «جا‌به‌جا بودن خواب روز و شب»، روزها نور طبیعی و تعامل کوتاه داشته باشید. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "برای «جا‌به‌جا بودن خواب روز و شب»، شب‌ها فعالیت و حرف را کمتر کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "تغییر معمولاً چند هفته طول می‌کشد؛ صبور باشید."
          ]
        },
        {
          "id": "sleep-short-naps",
          "title": "چرت‌های خیلی کوتاه",
          "guidance": [
            "برای «چرت‌های خیلی کوتاه»، چرت کوتاه در این سن شایع است. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "قبل از خواب بعدی نشانه‌های خستگی را زودتر بگیرید.",
            "اگر تغذیه و وزن‌گیری خوب است، معمولاً نگران‌کننده نیست."
          ]
        },
        {
          "id": "sleep-frequent-waking",
          "title": "بیدار شدن مکرر شب",
          "guidance": [
            "برای «بیدار شدن مکرر شب»، معده کوچک نوزاد به تغذیه شبانه نیاز دارد. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیدار شدن مکرر شب»، بیداری را آرام، کم‌نور و کوتاه نگه دارید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر تعداد بیداری‌ها ناگهان خیلی زیاد شد یا بی‌حالی دیدید، با پزشک مشورت کنید."
          ]
        },
        {
          "id": "sleep-hard-settle",
          "title": "سخت به خواب رفتن",
          "guidance": [
            "برای «سخت به خواب رفتن»، از بازی هیجانی درست قبل خواب پرهیز کنید. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "قنداق ایمن (در صورت مناسب بودن سن و توصیه پزشک) یا قنداق‌ جایگزین مناسب را بررسی کنید.",
            "اگر نوزاد بیش از حد داغ یا سرد است لباس را تنظیم کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "در ۰ تا ۲ ماهگی تغذیه اصلی شیر مادر یا شیر خشک مناسب است. نشانه‌های گرسنگی و سیری را دنبال کنید و درباره وزن‌گیری با پزشک هماهنگ باشید.",
      "priorities": [
        {
          "title": "تغذیه بر اساس نیاز",
          "detail": "به‌جای اجبار ساعت ثابت سخت، به نشانه‌های گرسنگی مثل مکیدن دست و بی‌قراری توجه کنید."
        },
        {
          "title": "وضعیت درست تغذیه",
          "detail": "سر و بدن در یک راستا باشد و بعد از تغذیه آروغ گرفتن را فراموش نکنید."
        },
        {
          "title": "رشد وزن",
          "detail": "وزن‌گیری منظم مهم‌تر از مقایسه با دیگران است؛ منحنی رشد را با پزشک ببینید."
        },
        {
          "title": "بهداشت شیر خشک",
          "detail": "اگر از شیر خشک استفاده می‌کنید، نسبت آب و پودر و شستشوی شیشه را دقیق رعایت کنید."
        }
      ],
      "guidance": [
        "معمولاً نیاز به آب، آبمیوه یا غذای کمکی در این سن نیست مگر توصیه پزشک.",
        "عسل برای زیر یک‌سالگی توصیه نمی‌شود.",
        "تعداد پوشک خیس و حال عمومی نشانه‌های مفید هیدراتاسیون هستند.",
        "اگر تغذیه بسیار سخت، استفراغ پرتابی یا بی‌حالی دیدید، زودتر ارزیابی پزشکی بگیرید."
      ],
      "problems": [
        {
          "id": "nut-spitup",
          "title": "برگشت شیر ملایم",
          "guidance": [
            "بعد از تغذیه کمی عمودی نگه دارید و آروغ بگیرید.",
            "برای «برگشت شیر ملایم»، از تکان شدید بلافاصله بعد تغذیه پرهیز کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر وزن‌گیری ضعیف یا استفراغ شدید است با پزشک صحبت کنید."
          ]
        },
        {
          "id": "nut-gassy",
          "title": "بی‌قراری گازی",
          "guidance": [
            "برای «بی‌قراری گازی»، آروغ وسط و پایان تغذیه کمک‌کننده است. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "پاهای نوزاد را آرام به سمت شکم حرکت دوچرخه‌ای بدهید.",
            "تغییر خودسرانه شیر را بدون مشورت انجام ندهید."
          ]
        },
        {
          "id": "nut-cluster",
          "title": "تغذیه خوشه‌ای عصرگاهی",
          "guidance": [
            "در برخی روزها نوزاد مکرر شیر می‌خواهد؛ اغلب موقتی است.",
            "حمایت از والد مراقبت‌کننده و استراحت نوبتی مهم است.",
            "اگر تعداد دفعات ادرار کم شد، بررسی پزشکی لازم است."
          ]
        },
        {
          "id": "nut-slow-feed",
          "title": "خسته شدن وسط تغذیه",
          "guidance": [
            "برای «خسته شدن وسط تغذیه»، محیط را آرام کنید و وقفه‌های کوتاه بدهید. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "برای «خسته شدن وسط تغذیه»، وضعیت تغذیه را کمی تغییر دهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر همیشه زود خسته می‌شود یا عرق سرد می‌کند، با پزشک در میان بگذارید."
          ]
        }
      ]
    },
    "health": {
      "overview": "مراقبت‌های این دوره حول تغذیه، خواب ایمن، زردی اوایل تولد، واکسن‌ها و شناخت علائم خطر است. هر نگرانی جدی را زود با پزشک مطرح کنید.",
      "topics": [
        {
          "title": "پیگیری وزن و معاینات",
          "detail": "نوبت‌های اولیه و وزن‌گیری را طبق برنامه مرکز بهداشت یا پزشک انجام دهید."
        },
        {
          "title": "واکسن‌های آغازین",
          "detail": "برنامه واکسیناسیون بدو تولد و نوبت‌های بعدی را ثبت و پیگیری کنید."
        },
        {
          "title": "مراقبت بند ناف و پوست",
          "detail": "ناحیه بند ناف را خشک و تمیز نگه دارید و از مواد تحریک‌کننده بدون توصیه پرهیز کنید."
        },
        {
          "title": "علائم خطر",
          "detail": "تب در نوزاد کوچک، بی‌حالی شدید، تنفس سخت، یا نخوردن مکرر را فوری پیگیری کنید."
        },
        {
          "title": "سلامت روان والد",
          "detail": "خستگی و خلق پایین بعد از زایمان شایع است؛ درخواست کمک نشانه قدرت است."
        }
      ],
      "guidance": [
        "دمای اتاق و لباس نوزاد را متعادل نگه دارید.",
        "از دود سیگار و بخارات تند کاملاً دور بمانید.",
        "دست‌ها را قبل از لمس نوزاد بشویید، مخصوصاً اگر مهمان دارید.",
        "هر دارو یا دمنوش را فقط با نظر پزشک بدهید."
      ]
    },
    "behavior": {
      "overview": "گریه راه اصلی ارتباط نوزاد است. هدف آرام‌سازی و فهم نیاز است، نه ساکت کردن فوری به هر قیمت.",
      "situations": [
        {
          "id": "beh-crying",
          "title": "گریه طولانی",
          "guidance": [
            "پوشک، گرسنگی، گرما/سرما و نیاز به آروغ را بررسی کنید.",
            "بغل ریتمیک، صدای سفید ملایم یا راه رفتن آرام را امتحان کنید.",
            "اگر شما خسته شدید نوزاد را در جای امن بگذارید و چند دقیقه نفس بگیرید."
          ]
        },
        {
          "id": "beh-overstim",
          "title": "تحریک بیش از حد",
          "guidance": [
            "برای «تحریک بیش از حد»، نور، صدا و بازی را کم کنید. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "برای «تحریک بیش از حد»، کودک را به فضای ساکت‌تر ببرید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «تحریک بیش از حد»، زمان بیداری را کوتاه‌تر کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "beh-evening-fuss",
          "title": "بی‌قراری عصرگاهی",
          "guidance": [
            "در بسیاری از نوزادان عصرها بی‌قراری بیشتر می‌شود.",
            "برای «بی‌قراری عصرگاهی»، محیط را ساده‌تر و تماس بدنی را بیشتر کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر گریه با قوس بدن شدید و مداوم است، با پزشک مطرح کنید."
          ]
        },
        {
          "id": "beh-soothing",
          "title": "نیاز به آغوش زیاد",
          "guidance": [
            "برای «نیاز به آغوش زیاد»، نیاز به تماس نزدیک در این سن طبیعی است. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "از آغوشی ایمن در بیداری می‌توانید استفاده کنید.",
            "مراقبت نوبتی بین اعضای خانواده به شما استراحت می‌دهد."
          ]
        },
        {
          "id": "beh-parent-stress",
          "title": "استرس والد",
          "guidance": [
            "برای «استرس والد»، هرگز نوزاد را تکان شدید ندهید. در هفته‌های نخست این کار را با ثبات و آرامش تکرار کنید.",
            "اگر احساس خشم یا درماندگی کردید، کودک را ایمن بگذارید و کمک بگیرید.",
            "برای «استرس والد»، صحبت با فرد مورد اعتماد یا متخصص مفید است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "ایمنی خواب، حمایت از سر و گردن، و دوری از خطرات خفگی و افتادن در این سن حیاتی است.",
      "items": [
        {
          "id": "saf-sleep",
          "title": "خواب ایمن",
          "detail": "به پشت، سطح سفت، بدون بالش و اسباب نرم داخل فضای خواب."
        },
        {
          "id": "saf-choking",
          "title": "خطر خفگی",
          "detail": "اشیای کوچک، پلاستیک و بندهای بلند را از دسترس دور کنید."
        },
        {
          "id": "saf-falls",
          "title": "سقوط از سطح",
          "detail": "روی مبل، تخت بزرگسال یا میز تعویض هرگز تنها نگذارید."
        },
        {
          "id": "saf-car",
          "title": "صندلی خودرو",
          "detail": "از صندلی مناسب نوزاد رو به عقب طبق راهنما استفاده کنید."
        },
        {
          "id": "saf-heat",
          "title": "گرما و سوختگی",
          "detail": "مایعات داغ، بخاری و آب حمام خیلی گرم را دور نگه دارید."
        },
        {
          "id": "saf-smoke",
          "title": "دود و آلودگی",
          "detail": "محیط را کاملاً بدون دود نگه دارید. در هفته‌های نخست این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "saf-pets",
          "title": "حیوانات خانگی",
          "detail": "تعامل با حیوان فقط با نظارت و بدون گذاشتن حیوان روی نوزاد."
        },
        {
          "id": "saf-meds",
          "title": "دارو و مواد شوینده",
          "detail": "همه داروها و شوینده‌ها را قفل و دور از دسترس نگه دارید."
        }
      ]
    }
  },
  {
    "id": "2-4",
    "minMonths": 2,
    "maxMonths": 3,
    "title": "۲ تا ۴ ماهگی",
    "subtitle": "لبخند اجتماعی، کنترل سر و ققن",
    "monthlyFocus": [
      {
        "domain": "SOCIAL",
        "title": "لبخند اجتماعی و بازی دوطرفه",
        "summary": "پاسخ به چهره و صدای آشنا با لبخند",
        "detail": "لبخند اجتماعی یکی از شیرین‌ترین نشانه‌های این دوره است. وقتی لبخند می‌زنید و مکث می‌کنید، به کودک فرصت پاسخ می‌دهید. این رفت‌وبرگشت ساده، پایه مهارت‌های ارتباطی بعدی است."
      },
      {
        "domain": "MOTOR",
        "title": "کنترل بهتر سر و رسیدن با دست",
        "summary": "نگه داشتن پایدارتر سر و لمس اسباب ایمن",
        "detail": "با قوی‌تر شدن گردن، tummy time را کمی طولانی‌تر کنید. اسباب سبک را در دید او بگیرید تا دست دراز کند. موفقیت کوچک را با تشویق کلامی همراه کنید تا انگیزه حرکت بیشتر شود."
      },
      {
        "domain": "LANGUAGE",
        "title": "ققن و نوبت صوتی",
        "summary": "صداسازی و تقلید لحن",
        "detail": "ققن یعنی تمرین گفتار. وقتی صدا درآورد مکث کنید و با لحن مشابه پاسخ دهید. نام بردن کارهای روزمره («الان پوشک عوض می‌کنیم») واژه‌ها را در بافت واقعی به گوش او می‌رساند."
      },
      {
        "domain": "COGNITIVE",
        "title": "دنبال کردن و کشف دست‌ها",
        "summary": "توجه به اشیای متحرک و دست‌های خودش",
        "detail": "کودک کم‌کم دست‌هایش را کشف می‌کند و اشیاء را با چشم دنبال می‌کند. بازی‌های آهسته با جغجغه یا پارچه رنگی توجه را تقویت می‌کند. اگر خسته شد، نشانه خوبی است که استراحت بدهید."
      }
    ],
    "milestones": [
      {
        "id": "m2-social-smile",
        "domain": "SOCIAL",
        "title": "لبخند اجتماعی",
        "description": "در پاسخ به چهره یا صدای شما لبخند می‌زند."
      },
      {
        "id": "m2-coo",
        "domain": "LANGUAGE",
        "title": "ققن و صداسازی",
        "description": "صداهای نرم و تکراری غیر از گریه تولید می‌کند."
      },
      {
        "id": "m2-head-steady",
        "domain": "MOTOR",
        "title": "نگه داشتن پایدارتر سر",
        "description": "در وضعیت نشسته با حمایت، سر کمتر به طرفین می‌افتد."
      },
      {
        "id": "m2-reach",
        "domain": "MOTOR",
        "title": "دراز کردن دست به سمت اسباب",
        "description": "به سمت اسباب‌بازی نزدیک دست دراز می‌کند."
      },
      {
        "id": "m2-track",
        "domain": "COGNITIVE",
        "title": "دنبال کردن شیء متحرک",
        "description": "شیء را با چشم از یک سمت به سمت دیگر دنبال می‌کند."
      },
      {
        "id": "m2-midline",
        "domain": "COGNITIVE",
        "title": "آوردن دست‌ها به خط وسط",
        "description": "دست‌ها را جلوی بدن به هم نزدیک می‌کند."
      },
      {
        "id": "m2-turn-sound",
        "domain": "LANGUAGE",
        "title": "چرخاندن سر به سمت صدا",
        "description": "به صدای آشنا یا جغجغه با چرخاندن سر واکنش می‌دهد."
      },
      {
        "id": "m2-laugh",
        "domain": "SOCIAL",
        "title": "خنده با بازی",
        "description": "در بازی‌های بامزه ممکن است بخندد یا هیجان نشان دهد."
      },
      {
        "id": "m2-grasp",
        "domain": "MOTOR",
        "title": "گرفتن اسباب سبک",
        "description": "اگر اسباب در دستش قرار گیرد، برای لحظاتی نگه می‌دارد."
      },
      {
        "id": "m2-calm-routine",
        "domain": "INDEPENDENCE",
        "title": "آرام‌تر شدن با روال آشنا",
        "description": "با روال تکراری تغذیه یا خواب کمی قابل پیش‌بینی‌تر آرام می‌شود."
      }
    ],
    "activities": [
      {
        "id": "a2-coo-talk",
        "title": "گفت‌وگوی ققن",
        "shortDescription": "نوبت‌گیری صوتی با مکث و پاسخ",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "تقویت نوبت در ارتباط",
        "materials": "نیازی نیست",
        "instructions": [
          "روبروی کودک بنشینید و لبخند بزنید.",
          "وقتی صدا درآورد، یک لحظه مکث کنید.",
          "با لحن شاد شبیه همان صدا پاسخ دهید.",
          "این رفت‌وبرگشت را چند دور کوتاه ادامه دهید.",
          "اگر روی برگرداند، بازی را تمام کنید."
        ],
        "tip": "ارتباط چشمی مهم‌تر از کامل بودن صداهای شماست.",
        "safety": "محیط را آرام نگه دارید تا زود خسته نشود.",
        "relatedMilestones": [
          "m2-coo",
          "m2-social-smile"
        ]
      },
      {
        "id": "a2-rattle-reach",
        "title": "بازی جغجغه نرم",
        "shortDescription": "تشویق به رسیدن و گرفتن",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "تقویت رسیدن و توجه",
        "materials": "یک جغجغه سبک و ایمن",
        "instructions": [
          "جغجغه را در دید کودک به آرامی تکان دهید.",
          "کمی صبر کنید تا دست دراز کند.",
          "اگر گرفت، تشویق کلامی کوتاه بگویید.",
          "جغجغه را به سمت دیگر ببرید و دوباره امتحان کنید."
        ],
        "tip": "اگر علاقه‌ای نبود رنگ یا صدای دیگری را امتحان کنید.",
        "safety": "از اشیای کوچک جداشدنی یا بند بلند استفاده نکنید.",
        "relatedMilestones": [
          "m2-reach",
          "m2-grasp",
          "m2-track"
        ]
      },
      {
        "id": "a2-tummy-play",
        "title": "tummy time با اسباب",
        "shortDescription": "زمان روی شکم با انگیزه بینایی",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "MOTOR"
        ],
        "goal": "تقویت گردن، سینه و شانه",
        "materials": "آینه ایمن کودک یا اسباب رنگی",
        "instructions": [
          "کودک را روی شکم روی سطح سفت بگذارید.",
          "آینه یا اسباب را جلوی صورتش قرار دهید.",
          "با صدای آرام تشویقش کنید سر را بالا نگه دارد.",
          "پس از چند دقیقه به پشت برگردانید و استراحت دهید."
        ],
        "tip": "چند نوبت کوتاه در روز معمولاً بهتر تحمل می‌شود.",
        "safety": "فقط در بیداری و نظارت کامل انجام دهید.",
        "relatedMilestones": [
          "m2-head-steady"
        ]
      },
      {
        "id": "a2-mirror",
        "title": "نگاه در آینه ایمن",
        "shortDescription": "کشف چهره و حرکت در آینه",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "SOCIAL"
        ],
        "goal": "توجه بصری و هیجان اجتماعی",
        "materials": "آینه نشکن مخصوص کودک",
        "instructions": [
          "آینه را در فاصله مناسب نگه دارید یا روی زمین tummy time بگذارید.",
          "به تصویر اشاره کنید و بگویید «ببین این تویی».",
          "صورت خود را کنار تصویر نشان دهید.",
          "با لبخند و صدای کوتاه بازی را زنده نگه دارید."
        ],
        "tip": "نیازی نیست مفهوم آینه را بفهمد؛ تجربه حسی کافی است.",
        "safety": "فقط از آینه نشکن کودک استفاده کنید.",
        "relatedMilestones": [
          "m2-track",
          "m2-laugh"
        ]
      },
      {
        "id": "a2-knee-bounce",
        "title": "بازی ریتم روی زانو",
        "shortDescription": "حرکت ملایم با آواز کوتاه",
        "duration": 4,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "لذت مشترک و حس ریتم",
        "materials": "نیازی نیست",
        "instructions": [
          "کودک را روی پاهای خود بنشانید و تنه را حمایت کنید.",
          "یک آواز کوتاه با حرکت خیلی ملایم بخوانید.",
          "حرکت را متوقف کنید و منتظر نگاه یا لبخند بمانید.",
          "اگر خواست ادامه، یک دور دیگر تکرار کنید."
        ],
        "tip": "اگر نشانه خستگی دیدید فوراً متوقف شوید.",
        "safety": "هرگز حرکات شدید یا پرتابی انجام ندهید.",
        "relatedMilestones": [
          "m2-laugh",
          "m2-social-smile"
        ]
      }
    ],
    "sleep": {
      "overview": "در ۲ تا ۴ ماهگی ممکن است دوره‌های بیداری کمی منظم‌تر شود، اما هنوز بیداری شبانه طبیعی است. روال ساده قبل خواب و حفظ خواب ایمن مهم‌ترین کارها هستند.",
      "routine": [
        {
          "title": "زمان بیداری را متناسب نگه دارید",
          "detail": "بیداری خیلی طولانی اغلب به بی‌قراری و سخت خوابیدن منجر می‌شود."
        },
        {
          "title": "علائم خواب را زود بشناسید",
          "detail": "خمیازه، خیره شدن و کاهش تعامل یعنی وقت آرام‌سازی است."
        },
        {
          "title": "روال کوتاه بسازید",
          "detail": "تغذیه، پوشک، نور کم و لالایی کوتاه الگوی پیش‌بینی‌پذیر می‌سازد."
        },
        {
          "title": "تفاوت روز و شب را پررنگ کنید",
          "detail": "روز نور و تعامل، شب سکوت و نور خیلی کم."
        },
        {
          "title": "به پشت در فضای امن بخوابانید",
          "detail": "اصول خواب ایمن را مثل ماه‌های قبل ادامه دهید."
        }
      ],
      "guidance": [
        "هر کودک ریتم خودش را دارد؛ با همسال مقایسه سخت‌گیرانه نکنید.",
        "اگر رفلکس مورو خواب را قطع می‌کند، لباس خواب مناسب و محیط آرام کمک می‌کند.",
        "صفحه نمایش برای آرام کردن نوزاد توصیه نمی‌شود.",
        "در صورت خروپف شدید، وقفه‌های تنفسی یا بی‌حالی با پزشک مشورت کنید."
      ],
      "problems": [
        {
          "id": "s24-late",
          "title": "دیر خوابیدن شب",
          "guidance": [
            "برای «دیر خوابیدن شب»، چرت خیلی دیر عصر را کوتاه‌تر کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن شب»، روال شب را کمی زودتر شروع کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن شب»، بازی پرتحرک نزدیک خواب را کم کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s24-night-wake",
          "title": "بیدار شدن شب",
          "guidance": [
            "برای «بیدار شدن شب»، بیداری را کم‌محرک نگه دارید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیدار شدن شب»، نیاز واقعی تغذیه یا پوشک را بررسی کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "تغییر ناگهانی الگو را با دندان‌درآوردن یا جهش رشدی احتمالی در نظر بگیرید."
          ]
        },
        {
          "id": "s24-catnap",
          "title": "چرت‌های کوتاه روزانه",
          "guidance": [
            "برای «چرت‌های کوتاه روزانه»، محیط چرت را کمی تاریک‌تر کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «چرت‌های کوتاه روزانه»، فاصله بیداری قبل چرت را تنظیم کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر حال عمومی خوب است، معمولاً با رشد بهتر می‌شود."
          ]
        },
        {
          "id": "s24-contact-sleep",
          "title": "فقط در آغوش خوابیدن",
          "guidance": [
            "پس از نیمه‌خواب شدن، انتقال آرام به تخت را تمرین کنید.",
            "از انتظار کمال فوری پرهیز کنید؛ تدریجی پیش بروید.",
            "برای «فقط در آغوش خوابیدن»، ایمنی را فدای راحتی نکنید؛ روی مبل نخوابید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "شیر همچنان تغذیه اصلی است. نشانه‌های گرسنگی و سیری را دنبال کنید و شروع غذای کمکی را به حدود ۶ ماهگی و نظر پزشک موکول کنید.",
      "priorities": [
        {
          "title": "ادامه شیر مادر یا شیر خشک",
          "detail": "حجم و دفعات بر اساس نیاز کودک و راهنمایی پزشک تنظیم می‌شود."
        },
        {
          "title": "پایش وزن و پوشک",
          "detail": "وزن‌گیری و تعداد پوشک خیس نشانه‌های مفید کفایت تغذیه هستند."
        },
        {
          "title": "آروغ و وضعیت تغذیه",
          "detail": "وضعیت راحت و آروغ مناسب ناراحتی را کمتر می‌کند."
        },
        {
          "title": "پرهیز از غذای زودهنگام",
          "detail": "غذای جامد زودتر از موعد را بدون توصیه پزشک شروع نکنید."
        }
      ],
      "guidance": [
        "آبمیوه و نوشیدنی شیرین لازم نیست.",
        "ویتامین‌ها را فقط طبق نظر پزشک بدهید.",
        "اگر استفراغ پرتابی مکرر یا وزن‌گیری ضعیف دیدید ارزیابی بگیرید.",
        "تغذیه را با اجبار یا حواس‌پرتی صفحه نمایش همراه نکنید."
      ],
      "problems": [
        {
          "id": "n24-spit",
          "title": "برگشت شیر",
          "guidance": [
            "برای «برگشت شیر»، بعد تغذیه عمودی نگه دارید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "از فشار روی شکم بلافاصله بعد شیر اجتناب کنید.",
            "در صورت سبز بودن صفراوی یا وزن کم، پزشکی مراجعه کنید."
          ]
        },
        {
          "id": "n24-refuse",
          "title": "کم‌میل شدن موقت",
          "guidance": [
            "بیماری خفیف یا جهش رشد می‌تواند میل را تغییر دهد.",
            "برای «کم‌میل شدن موقت»، نشانه‌های کم‌آبی را جدی بگیرید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر بیش از چند نوبت پشت‌سرهم خوب نمی‌خورد با پزشک تماس بگیرید."
          ]
        },
        {
          "id": "n24-gas",
          "title": "گاز و پیچش پا",
          "guidance": [
            "برای «گاز و پیچش پا»، آروغ و حرکت دوچرخه‌ای پا کمک می‌کند. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «گاز و پیچش پا»، پوشک خیلی سفت نبندید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «گاز و پیچش پا»، تغییر شیر را خودسرانه انجام ندهید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n24-long-feed",
          "title": "طولانی شدن تغذیه",
          "guidance": [
            "برای «طولانی شدن تغذیه»، محیط را خلوت کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "در صورت خواب‌آلودگی ملایم تحریک لمسی کوتاه بدهید.",
            "اگر همیشه خیلی طول می‌کشد، تکنیک تغذیه را با مشاور شیردهی یا پزشک بررسی کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "این سن زمان پیگیری واکسن‌های دو و چهار ماهگی، بررسی رشد حرکتی و حفظ مراقبت‌های پوست و خواب ایمن است.",
      "topics": [
        {
          "title": "واکسیناسیون",
          "detail": "نوبت‌های دو و چهار ماهگی را در کارت واکسن علامت بزنید و تأخیر را جبران کنید."
        },
        {
          "title": "پایش رشد",
          "detail": "قد، وزن و دور سر را در مراجعات ثبت کنید."
        },
        {
          "title": "پوست و بثورات",
          "detail": "بثورات پوشک را با تعویض به‌موقع و خشک نگه داشتن مدیریت کنید."
        },
        {
          "title": "شنوایی و بینایی",
          "detail": "عدم واکنش به صدا یا عدم دنبال کردن بینایی را با پزشک در میان بگذارید."
        }
      ],
      "guidance": [
        "تب بعد واکسن را طبق راهنمای پزشک مدیریت کنید.",
        "داروی بدون نسخه را خودسرانه تکرار نکنید.",
        "از تماس با افراد بیمار حتی‌الامکان بکاهید.",
        "اگر کودک لبخند اجتماعی ندارد یا تماس چشمی بسیار محدود است، در مراجعه بعدی مطرح کنید."
      ]
    },
    "behavior": {
      "overview": "بی‌قراری هنوز راه بیان نیاز است. الگوی آرام‌سازی شما به کودک کمک می‌کند هیجانش را تنظیم کند.",
      "situations": [
        {
          "id": "b24-fuss",
          "title": "بی‌قراری عصر",
          "guidance": [
            "برای «بی‌قراری عصر»، نور و صدا را کم کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "بغل ریتمیک و صدای یکنواخت ملایم را امتحان کنید.",
            "برای «بی‌قراری عصر»، زمان بیداری را کوتاه‌تر کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b24-overstim",
          "title": "تحریک زیاد",
          "guidance": [
            "برای «تحریک زیاد»، تعداد اسباب و مهمان را کم کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «تحریک زیاد»، به فضای ساکت بروید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «تحریک زیاد»، بازی را کوتاه و با کیفیت نگه دارید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b24-stranger",
          "title": "هوشیاری نسبت به افراد جدید",
          "guidance": [
            "اجازه دهید کودک اول شما را ببیند بعد به مهمان نزدیک شود.",
            "برای «هوشیاری نسبت به افراد جدید»، اجبار به بغل دیگران نکنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «هوشیاری نسبت به افراد جدید»، پاسخ ترس را با آرامش بپذیرید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b24-separation-short",
          "title": "ناراحتی جدا شدن کوتاه",
          "guidance": [
            "خداحافظی کوتاه و مطمئن بهتر از غیب شدن ناگهانی است.",
            "روال بازگشت را تکرار کنید تا قابل پیش‌بینی شود.",
            "اگر مراقبت‌کننده جدید است، زمان هم‌پوشانی بگذارید."
          ]
        },
        {
          "id": "b24-self-soothe-start",
          "title": "شروع آرام‌سازی با کمک",
          "guidance": [
            "برای «شروع آرام‌سازی با کمک»، قبل از اوج گریه مداخله آرام کنید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "گاهی مکث کوتاه چندثانیه‌ای برای تنظیم خودش مفید است، نه نادیده گرفتن طولانی.",
            "هدف آموزش تحمل ناراحتی شدید نیست؛ هدف حمایت هم‌تنظیمی است."
          ]
        }
      ]
    },
    "safety": {
      "overview": "با شروع حرکت دست و چرخش، خطر سقوط و رسیدن به اشیای خطرناک بیشتر می‌شود.",
      "items": [
        {
          "id": "sf24-falls",
          "title": "سقوط",
          "detail": "روی سطوح بلند هرگز بدون دست‌گذاری رها نکنید؛ حتی یک لحظه."
        },
        {
          "id": "sf24-choking",
          "title": "خفگی",
          "detail": "اسباب باید بزرگ‌تر از دهان و بدون قطعه جداشدنی باشد."
        },
        {
          "id": "sf24-burns",
          "title": "سوختگی",
          "detail": "لیوان داغ و اتو را از لبه میز دور کنید. در ماه‌های ابتدایی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf24-sleep",
          "title": "خواب ایمن",
          "detail": "به پشت خواباندن و سطح سفت را ادامه دهید."
        },
        {
          "id": "sf24-car",
          "title": "خودرو",
          "detail": "صندلی کودک را هر بار درست مهار کنید. در ماه‌های ابتدایی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf24-pets",
          "title": "حیوانات",
          "detail": "صورت کودک را از دسترس پنجه و لیس حیوان دور نگه دارید."
        },
        {
          "id": "sf24-cleaners",
          "title": "مواد شوینده",
          "detail": "شوینده‌ها را در کابینت قفل‌دار بگذارید. در ماه‌های ابتدایی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "4-6",
    "minMonths": 4,
    "maxMonths": 5,
    "title": "۴ تا ۶ ماهگی",
    "subtitle": "غلت زدن، خنده و آمادگی برای کشف بیشتر",
    "monthlyFocus": [
      {
        "domain": "MOTOR",
        "title": "غلت زدن و نشستن با حمایت",
        "summary": "حرکت بدن و تقویت تنه",
        "detail": "غلتیدن از شکم به پشت یا برعکس دنیای جدیدی باز می‌کند. فضای ایمن روی زمین بهترین زمین بازی است. نشستن با حمایت بالش فقط با نظارت و برای زمان کوتاه مناسب است."
      },
      {
        "domain": "SOCIAL",
        "title": "خنده، Mimic و هیجان مشترک",
        "summary": "تقلید حالت چهره و لذت بازی",
        "detail": "کودک از واکنش شما انرژی می‌گیرد. بازی‌های بامزه با مکث و اغراق ملایم در چهره، نوبت اجتماعی را تقویت می‌کند. وقتی خسته شد، احترام به علامت او مهم‌تر از ادامه بازی است."
      },
      {
        "domain": "LANGUAGE",
        "title": "صداهای متنوع‌تر",
        "summary": "ققن با زیر و بم و پاسخ به اسم",
        "detail": "صداها متنوع‌تر می‌شوند. نام او را با لحن روشن صدا کنید و صبر کنید. کتاب پارچه‌ای و آواز کوتاه روزانه، گوش زبانی را تغذیه می‌کند حتی اگر هنوز کلمه‌ای نگوید."
      },
      {
        "domain": "COGNITIVE",
        "title": "علت و معلول ساده",
        "summary": "کشف اینکه کار او نتیجه‌ای دارد",
        "detail": "تکان دادن جغجغه یا فشار دادن اسباب صدادار به او حس اثرگذاری می‌دهد. اسباب را کمی دورتر بگذارید تا تلاش کند برسد. این تلاش‌های کوتاه، پشتکار اولیه را می‌سازند."
      }
    ],
    "milestones": [
      {
        "id": "m4-roll",
        "domain": "MOTOR",
        "title": "غلت زدن",
        "description": "حداقل در یک جهت غلت می‌زند یا تلاش پایدار دارد."
      },
      {
        "id": "m4-sit-support",
        "domain": "MOTOR",
        "title": "نشستن با حمایت",
        "description": "با حمایت، سر و تنه را برای لحظاتی نگه می‌دارد."
      },
      {
        "id": "m4-reach-grasp",
        "domain": "MOTOR",
        "title": "گرفتن هدفمند",
        "description": "به اسباب می‌رسد و آن را به دهان یا وسط می‌آورد."
      },
      {
        "id": "m4-babble-vary",
        "domain": "LANGUAGE",
        "title": "صداهای متنوع",
        "description": "ققن با زیر و بم یا صداهای جدید بیشتر شنیده می‌شود."
      },
      {
        "id": "m4-name-attend",
        "domain": "LANGUAGE",
        "title": "توجه به صدا شدن",
        "description": "گاهی با شنیدن صدای آشنا سر برمی‌گرداند."
      },
      {
        "id": "m4-laugh-ready",
        "domain": "SOCIAL",
        "title": "خنده در بازی",
        "description": "در بازی‌های آشنا می‌خندد یا هیجان نشان می‌دهد."
      },
      {
        "id": "m4-object-explore",
        "domain": "COGNITIVE",
        "title": "کاوش اسباب با دست و دهان",
        "description": "اسباب را می‌چرخاند، می‌کوبد یا به دهان می‌برد."
      },
      {
        "id": "m4-both-hands",
        "domain": "COGNITIVE",
        "title": "انتقال اسباب بین دست‌ها",
        "description": "گاهی اسباب را از یک دست به دست دیگر جابه‌جا می‌کند."
      },
      {
        "id": "m4-hold-bottle-toy",
        "domain": "INDEPENDENCE",
        "title": "کمک در نگه داشتن شیشه یا اسباب",
        "description": "در نگه داشتن شیشه یا اسباب سبک مشارکت می‌کند."
      },
      {
        "id": "m4-express-prefer",
        "domain": "SOCIAL",
        "title": "نشان دادن علاقه یا نارضایتی",
        "description": "با حالت بدن یا صدا علاقه و نارضایتی را واضح‌تر نشان می‌دهد."
      }
    ],
    "activities": [
      {
        "id": "a4-roll-play",
        "title": "تشویق غلت زدن",
        "shortDescription": "گذاشتن اسباب در سمت کناری برای انگیزه غلت",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "تقویت غلت و چرخش بدن",
        "materials": "یک اسباب مورد علاقه",
        "instructions": [
          "کودک را روی پشت یا شکم روی فرش ایمن بگذارید.",
          "اسباب را کمی در سمتی که می‌خواهید غلت بزند قرار دهید.",
          "با صدا تشویقش کنید به سمت اسباب بچرخد.",
          "پس از تلاش، کمک ملایم در لگن یا شانه بدهید نه هل دادن کامل.",
          "طرف دیگر را هم در نوبت بعد تمرین کنید."
        ],
        "tip": "اگر مقاوم بود همان روز اصرار نکنید.",
        "safety": "فضای بدون لبه تیز و پله انتخاب کنید.",
        "relatedMilestones": [
          "m4-roll"
        ]
      },
      {
        "id": "a4-cause-effect",
        "title": "اسباب دکمه و صدا",
        "shortDescription": "کشف اینکه فشار دادن نتیجه دارد",
        "duration": 7,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "درک علت و معلول",
        "materials": "اسباب ایمن با دکمه درشت یا بافت صدادار",
        "instructions": [
          "یک بار خودتان دکمه را بزنید و نتیجه را نشان دهید.",
          "دست کودک را به‌آرامی راهنمایی کنید.",
          "وقتی خودش امتحان کرد تشویق کوتاه بگویید.",
          "اجازه دهید چند بار آزادانه تکرار کند."
        ],
        "tip": "یک اسباب کافی است؛ شلوغی توجه را کم می‌کند.",
        "safety": "باتری و قطعات کوچک باید غیرقابل دسترس باشند.",
        "relatedMilestones": [
          "m4-object-explore",
          "m4-reach-grasp"
        ]
      },
      {
        "id": "a4-name-song",
        "title": "آواز اسم من",
        "shortDescription": "گنجاندن اسم کودک در آواز کوتاه",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "توجه به نام و ریتم زبان",
        "materials": "نیازی نیست",
        "instructions": [
          "یک ملودی ساده انتخاب کنید و اسم کودک را داخلش بگذارید.",
          "اسم را کمی واضح‌تر و با مکث بگویید.",
          "صبر کنید ببینید سر برمی‌گرداند یا لبخند می‌زند.",
          "همان آواز را در موقعیت‌های مختلف روز تکرار کنید."
        ],
        "tip": "تکرار در حمام یا تعویض پوشک یادگیری را طبیعی می‌کند.",
        "safety": "صدای خیلی بلند نزدیک گوش پخش نکنید.",
        "relatedMilestones": [
          "m4-name-attend",
          "m4-babble-vary"
        ]
      },
      {
        "id": "a4-supported-sit",
        "title": "نشستن حمایتی کوتاه",
        "shortDescription": "تمرین تنه با حمایت دست شما یا بالش",
        "duration": 5,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "تقویت عضلات مرکزی",
        "materials": "بالش نرم و فضای فرش",
        "instructions": [
          "کودک را بین پاهای خود یا با حمایت بالش بنشانید.",
          "یک اسباب جلو بگذارید تا کمی به جلو خم شود.",
          "با دست آماده باشید تا اگر کج شد بگیرید.",
          "۱ تا ۳ دقیقه کافی است؛ سپس درازش کنید."
        ],
        "tip": "نشستن طولانی با حمایت زیاد ممکن است فشار اضافه بگذارد؛ کوتاه نگه دارید.",
        "safety": "هرگز با حمایت سست تنها نگذارید.",
        "relatedMilestones": [
          "m4-sit-support"
        ]
      },
      {
        "id": "a4-texture",
        "title": "کیسه بافت‌های ایمن",
        "shortDescription": "لمس پارچه‌های مختلف با راهنمایی شما",
        "duration": 6,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "SOCIAL"
        ],
        "goal": "کاوش حسی و واژه‌آموزی لمسی",
        "materials": "۲ یا ۳ تکه پارچه تمیز با بافت متفاوت",
        "instructions": [
          "پارچه را روی دست یا پا به نرمی بکشید.",
          "بگویید «نرمه» یا «زبره».",
          "اجازه دهید خودش پارچه را بگیرد.",
          "اگر به دهان برد، پارچه باید تمیز و بدون نخ باز باشد."
        ],
        "tip": "بافت‌های خیلی خشن یا پُرزریز استفاده نکنید.",
        "safety": "از اشیای ریز و پارچه‌های پوسیده پرهیز کنید.",
        "relatedMilestones": [
          "m4-object-explore"
        ]
      }
    ],
    "sleep": {
      "overview": "ممکن است الگوی چرت‌ها کمی واضح‌تر شود اما رگرسیون خواب اطراف جهش‌های رشدی شایع است. روال ثابت و خواب ایمن را حفظ کنید.",
      "routine": [
        {
          "title": "پنجره خواب را پیدا کنید",
          "detail": "قبل از بی‌قراری شدید به روال خواب بروید."
        },
        {
          "title": "روال ۲ تا ۴ دقیقه‌ای",
          "detail": "پوشک، تاریکی ملایم، آواز ثابت و خواباندن در تخت امن."
        },
        {
          "title": "چرت‌های روز را پخش کنید",
          "detail": "چرت خیلی دیر نزدیک شب می‌تواند خواب شب را سخت کند."
        },
        {
          "title": "بیداری شب را خسته‌کننده نکنید",
          "detail": "نور کم، صدای کم و کار لازم فقط."
        }
      ],
      "guidance": [
        "غلت زدن در خواب ممکن است شروع شود؛ فضای خواب را همچنان بدون اشیای نرم نگه دارید.",
        "اگر روی شکم غلتید، معمولاً می‌تواند برگردد؛ باز هم شروع خواب به پشت باشد.",
        "ساعت خواب ثابت‌تر از هفته‌های اول مفید است اما انعطاف هم لازم است.",
        "اگر خروپف جدید یا تنفس سخت دیدید ارزیابی پزشکی بگیرید."
      ],
      "problems": [
        {
          "id": "s46-regression",
          "title": "پسرفت موقت خواب",
          "guidance": [
            "برای «پسرفت موقت خواب»، روال را ثابت نگه دارید نه پیچیده‌تر. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «پسرفت موقت خواب»، نیاز به تغذیه شبانه را دوباره بررسی کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "معمولاً پس از عبور از جهش رشدی آرام‌تر می‌شود."
          ]
        },
        {
          "id": "s46-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، آخرین چرت را جلوتر بیاورید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، محرک عصر را کم کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، روال را ۱۵ دقیقه زودتر شروع کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s46-short-night",
          "title": "بیدار شدن‌های مکرر",
          "guidance": [
            "برای «بیدار شدن‌های مکرر»، بررسی گرسنگی، دندان شروع‌شونده و دمای اتاق. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیدار شدن‌های مکرر»، پاسخ یکنواخت شبانه بدهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر با تب یا بی‌حالی همراه است پزشکی مراجعه کنید."
          ]
        },
        {
          "id": "s46-only-nurse-sleep",
          "title": "خواب فقط با شیر",
          "guidance": [
            "گاهی تغذیه را کمی زودتر از خواب کامل تمام کنید و آرام‌سازی دیگر اضافه کنید.",
            "برای «خواب فقط با شیر»، تغییر را تدریجی و مهربان انجام دهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "هدف محروم کردن از شیر نیست؛ تنوع راه آرام‌سازی است."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "تا حدود ۶ ماهگی شیر منبع اصلی است. نزدیک پایان این بازه می‌توانید با پزشک درباره آمادگی غذای کمکی حرف بزنید، نه اینکه عجله کنید.",
      "priorities": [
        {
          "title": "شیر کافی",
          "detail": "غذای کمکی جایگزین شیر در این سن نیست."
        },
        {
          "title": "علائم آمادگی غذایی",
          "detail": "کنترل سر، علاقه به غذا و از بین رفتن نسبی رفلکس بیرون راندن زبان را با پزشک مرور کنید."
        },
        {
          "title": "آهن و رشد",
          "detail": "درباره مکمل‌ها فقط مطابق توصیه پزشکی عمل کنید."
        },
        {
          "title": "ایمنی تغذیه",
          "detail": "عسل و شیر گاو به‌عنوان نوشیدنی اصلی برای زیر یک‌سالگی مناسب نیست."
        }
      ],
      "guidance": [
        "اگر غذای کمکی شروع نشده نگران عقب ماندن از مد روز نباشید.",
        "نشانه‌های سیری را احترام بگذارید.",
        "استفراغ مکرر یا مدفوع خیلی متفاوت را ثبت و مطرح کنید.",
        "از اضافه کردن نمک و شکر به هر پوره آزمایشی بپرهیزید."
      ],
      "problems": [
        {
          "id": "n46-picky-milk",
          "title": "کم‌میل شدن به شیر در برخی نوبت‌ها",
          "guidance": [
            "برای «کم‌میل شدن به شیر در برخی نوبت‌ها»، محیط آرام‌تری برای تغذیه بسازید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «کم‌میل شدن به شیر در برخی نوبت‌ها»، بیماری خفیف را در نظر بگیرید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «کم‌میل شدن به شیر در برخی نوبت‌ها»، اگر پوشک خیس کم شد سریع‌تر پیگیری کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n46-reflux",
          "title": "ناراحتی بعد تغذیه",
          "guidance": [
            "برای «ناراحتی بعد تغذیه»، آروغ و نگه داشتن عمودی را جدی بگیرید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «ناراحتی بعد تغذیه»، لباس تنگ دور شکم نپوشانید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "علائم هشدار مثل وزن کم یا استفراغ شدید را پزشکی بررسی کنید."
          ]
        },
        {
          "id": "n46-distract",
          "title": "حواس‌پرتی وسط شیر",
          "guidance": [
            "در این سن کنجکاوی زیاد می‌شود؛ مکان خلوت‌تر کمک می‌کند.",
            "برای «حواس‌پرتی وسط شیر»، وقفه کوتاه و برگشت دوباره طبیعی است. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «حواس‌پرتی وسط شیر»، اجبار طولانی معمولاً نتیجه عکس می‌دهد. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n46-early-solid-pressure",
          "title": "فشار اطرافیان برای غذای زودهنگام",
          "guidance": [
            "برای «فشار اطرافیان برای غذای زودهنگام»، تصمیم را با پزشک و علائم آمادگی کودک بگیرید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «فشار اطرافیان برای غذای زودهنگام»، شروع زودهنگام لزوماً بهتر نیست. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «فشار اطرافیان برای غذای زودهنگام»، پاسخ کوتاه و قاطع به اطرافیان کافی است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "واکسن چهار ماهگی، آمادگی تدریجی برای حرکت بیشتر و بررسی واکنش به صدا و لبخند اجتماعی از محورهای مراقبت است.",
      "topics": [
        {
          "title": "نوبت واکسن و رشد",
          "detail": "در مراجعه، سؤال‌های حرکتی و تغذیه‌ای را از قبل یادداشت کنید."
        },
        {
          "title": "سلامت دهان اولیه",
          "detail": "حتی قبل دندان، لثه را با پارچه تمیز مرطوب می‌توانید آرام پاک کنید."
        },
        {
          "title": "پوست و آلرژی تماسی",
          "detail": "شوینده لباس ملایم و تعویض به‌موقع پوشک کمک‌کننده است."
        },
        {
          "title": "علائم نیازمند بررسی",
          "detail": "عدم غلت زدن هیچ‌طرفی، سفتی یا شلی شدید عضلانی را مطرح کنید."
        }
      ],
      "guidance": [
        "داروهای تب را طبق دوز وزن و نظر پزشک بدهید.",
        "از قرار گرفتن طولانی در آفتاب مستقیم بپرهیزید.",
        "اگر کودک به صدا واکنش نمی‌دهد زودتر بگویید.",
        "مراقبت از کمر و وضعیت خودتان هنگام بغل کردن طولانی مهم است."
      ]
    },
    "behavior": {
      "overview": "هیجان‌ها پررنگ‌تر می‌شوند. کودک ممکن است برای جلب توجه بیشتر صدا کند؛ پاسخ گرم و مرزهای ایمنی با هم لازم‌اند.",
      "situations": [
        {
          "id": "b46-attention",
          "title": "صدا کردن برای توجه",
          "guidance": [
            "برای «صدا کردن برای توجه»، وقتی ممکن است با نگاه و صدا پاسخ دهید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "نیازی نیست هر صدا را با برداشتن فوری جواب دهید؛ گاهی حرف زدن از دور کافی است.",
            "برای «صدا کردن برای توجه»، پاسخ‌های پیش‌بینی‌پذیر حس امنیت می‌سازند. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b46-frustration",
          "title": "ناامیدی وقتی به اسباب نمی‌رسد",
          "guidance": [
            "برای «ناامیدی وقتی به اسباب نمی‌رسد»، کمی صبر کنید تا تلاش کند. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «ناامیدی وقتی به اسباب نمی‌رسد»، سپس کمک جزئی بدهید نه حل کامل. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «ناامیدی وقتی به اسباب نمی‌رسد»، موفقیت کوچک را جشن بگیرید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b46-stranger",
          "title": "محتاط شدن با غریبه",
          "guidance": [
            "برای «محتاط شدن با غریبه»، اجازه دهید کودک از آغوش شما افراد را ببیند. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «محتاط شدن با غریبه»، اجبار به بغل را حذف کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «محتاط شدن با غریبه»، آشنایی تدریجی را توضیح دهید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b46-separation",
          "title": "ناراحتی جدا شدن",
          "guidance": [
            "برای «ناراحتی جدا شدن»، خداحافظی کوتاه بگویید و برگردید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "شیء آرامش‌بخش آشنا در صورت مناسب بودن سن و ایمنی می‌تواند کمک کند.",
            "برای «ناراحتی جدا شدن»، تمرین جدایی‌های خیلی کوتاه در خانه مفید است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b46-overtired",
          "title": "بی‌قراری از خستگی",
          "guidance": [
            "برای «بی‌قراری از خستگی»، نشانه‌های خواب را جدی‌تر بگیرید. در ماه‌های ابتدایی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بی‌قراری از خستگی»، برنامه بیداری را کوتاه کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بی‌قراری از خستگی»، محرک‌ها را کم کنید تا آرام شود. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "غلت زدن یعنی خطر سقوط واقعی شده است. خانه را از دید کودک روی زمین بازبینی کنید.",
      "items": [
        {
          "id": "sf46-falls",
          "title": "سقوط از تخت و مبل",
          "detail": "حتی یک ثانیه ترک کردن روی سطح بلند خطرناک است."
        },
        {
          "id": "sf46-choking",
          "title": "خفگی با اشیای کوچک",
          "detail": "همه‌چیز به دهان می‌رود؛ کف زمین را روزانه بررسی کنید."
        },
        {
          "id": "sf46-water",
          "title": "آب",
          "detail": "هرگز کنار وان یا لگن آب تنها نگذارید؛ چند سانتی‌متر هم خطر دارد."
        },
        {
          "id": "sf46-burns",
          "title": "سوختگی",
          "detail": "قبل از حمام دمای آب را با مچ دست چک کنید."
        },
        {
          "id": "sf46-windows",
          "title": "پنجره",
          "detail": "کنار پنجره باز یا توری سست نگذارید. در ماه‌های ابتدایی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf46-meds",
          "title": "داروها",
          "detail": "دارو را بعد مصرف فوراً سر جایش قفل کنید."
        },
        {
          "id": "sf46-cords",
          "title": "بند پرده و کابل",
          "detail": "بندها را بالا جمع و دور از دسترس کنید. در ماه‌های ابتدایی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf46-car",
          "title": "صندلی خودرو",
          "detail": "با رشد قد و وزن، تناسب صندلی را دوباره چک کنید."
        }
      ]
    }
  },
  {
    "id": "6-9",
    "minMonths": 6,
    "maxMonths": 8,
    "title": "۶ تا ۹ ماهگی",
    "subtitle": "نشستن، شروع غذای کمکی و بازی دالی",
    "monthlyFocus": [
      {
        "domain": "MOTOR",
        "title": "نشستن و جابه‌جایی",
        "summary": "نشستن پایدارتر و شروع خزیدن یا کِرم رفتن",
        "detail": "بسیاری از کودکان در این بازه بدون حمایت می‌نشینند و برای جابه‌جایی تلاش می‌کنند. فضای وسیع روی زمین و لباس راحت حرکت را تشویق می‌کند. به جای وادار کردن به ایستادن زودهنگام، اجازه دهید مراحل خودش را طی کند."
      },
      {
        "domain": "LANGUAGE",
        "title": "صداهای بابا/ماما و پاسخ به اسم",
        "summary": "بابلینگ هجایی و توجه به نام",
        "detail": "صداهای تکراری مثل با-با و دا-دا بیشتر شنیده می‌شود. اسم او را صدا کنید و صبر کنید. هر اشاره یا صدا را با نام شیء گسترش دهید تا پل بین صدا و معنی ساخته شود."
      },
      {
        "domain": "COGNITIVE",
        "title": "permanence اولیه شیء",
        "summary": "پیدا کردن شیء نیمه‌پنهان",
        "detail": "بازی دالی و پوشاندن اسباب با پارچه به درک این‌که چیزها هنوز هستند کمک می‌کند. این بازی هم شناخت و هم آرامش جدایی کوتاه را تغذیه می‌کند."
      },
      {
        "domain": "SOCIAL",
        "title": "اضطراب جدایی نوپا",
        "summary": "چسبیدن بیشتر به مراقب اصلی",
        "detail": "ممکن است نسبت به غریبه‌ها محتاط‌تر شود. این نشانه دلبستگی است نه لجبازی. خداحافظی کوتاه، بازگشت قابل پیش‌بینی و آغوش امن کمک می‌کند."
      }
    ],
    "milestones": [
      {
        "id": "m6-sit",
        "domain": "MOTOR",
        "title": "نشستن بدون کمک یا با کمک کم",
        "description": "برای لحظاتی بدون افتادن کامل می‌نشیند."
      },
      {
        "id": "m6-move",
        "domain": "MOTOR",
        "title": "جابه‌جایی روی زمین",
        "description": "خزیدن، کِرم رفتن یا حرکت به سمت اسباب دیده می‌شود."
      },
      {
        "id": "m6-pincer-start",
        "domain": "MOTOR",
        "title": "شروع گرفتن ریزتر",
        "description": "با انگشتان برای برداشتن تکه‌های نرم تلاش می‌کند."
      },
      {
        "id": "m6-name",
        "domain": "LANGUAGE",
        "title": "واکنش به اسم",
        "description": "وقتی اسمش را صدا می‌کنید اغلب توجه می‌کند."
      },
      {
        "id": "m6-babble",
        "domain": "LANGUAGE",
        "title": "بابلینگ هجایی",
        "description": "صداهایی شبیه ماما/بابا یا هجاهای تکراری می‌گوید."
      },
      {
        "id": "m6-peek",
        "domain": "SOCIAL",
        "title": "بازی دالی",
        "description": "از پنهان و ظاهر شدن شما لذت می‌برد."
      },
      {
        "id": "m6-find",
        "domain": "COGNITIVE",
        "title": "پیدا کردن شیء نیمه‌پنهان",
        "description": "اسباب زیر پارچه نازک را جست‌وجو می‌کند."
      },
      {
        "id": "m6-transfer",
        "domain": "COGNITIVE",
        "title": "جابه‌جایی اسباب بین دست‌ها",
        "description": "اسباب را آگاهانه‌تر بین دست‌ها منتقل می‌کند."
      },
      {
        "id": "m6-self-feed",
        "domain": "INDEPENDENCE",
        "title": "بردن غذا به دهان با دست",
        "description": "تکه‌های نرم مناسب را به دهان می‌برد."
      },
      {
        "id": "m6-stranger",
        "domain": "SOCIAL",
        "title": "تشخیص آشنا از غریبه",
        "description": "ممکن است کنار غریبه به مراقب بچسبد."
      }
    ],
    "activities": [
      {
        "id": "a6-peekaboo",
        "title": "بازی دالی‌موشه",
        "shortDescription": "پنهان و ظاهر شدن با پارچه نرم",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "COGNITIVE"
        ],
        "goal": "تقویت پیوند و مفهوم ماندگاری",
        "materials": "یک پارچه نرم نازک",
        "instructions": [
          "صورت خود را کوتاه بپوشانید و بگویید کجا رفت؟",
          "با لبخند ظاهر شوید و بگویید پیدات کردم.",
          "نوبت کودک را هم بدهید اگر پارچه را می‌کشد.",
          "اگر مضطرب شد سریع‌تر ظاهر شوید.",
          "۲ تا ۳ دقیقه کافی است."
        ],
        "tip": "نسخه آهسته‌تر برای کودک حساس‌تر بهتر است.",
        "safety": "پارچه را روی صورت کودک نگه ندارید.",
        "relatedMilestones": [
          "m6-peek",
          "m6-find"
        ]
      },
      {
        "id": "a6-name-objects",
        "title": "نام‌بردن وسایل روزانه",
        "shortDescription": "تکرار نام اشیا هنگام بازی و غذا",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE"
        ],
        "goal": "گسترش درک واژه‌ها",
        "materials": "وسایل روزمره ایمن",
        "instructions": [
          "یک وسیله را نشان دهید و نامش را واضح بگویید.",
          "صبر کنید تا اشاره یا صدا کند.",
          "همان واژه را دوباره تکرار کنید.",
          "در موقعیت واقعی مثل قاشق سر غذا هم نام ببرید."
        ],
        "tip": "روزانه چند واژه کافی است.",
        "safety": "وسایل تیز یا شکستنی استفاده نکنید.",
        "relatedMilestones": [
          "m6-name",
          "m6-babble"
        ]
      },
      {
        "id": "a6-sit-reach",
        "title": "نشستن و رسیدن به اسباب",
        "shortDescription": "تمرین تعادل نشسته با اسباب کمی دور",
        "duration": 8,
        "difficulty": "medium",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "تعادل نشستن و برنامه‌ریزی حرکت",
        "materials": "۲ اسباب نرم",
        "instructions": [
          "کودک را در وضعیت نشسته امن قرار دهید.",
          "اسباب را کمی جلوتر بگذارید.",
          "اجازه دهید خودش خم شود و برسد.",
          "اگر افتاد با آرامش کمک کنید دوباره بنشیند."
        ],
        "tip": "سطح کمی نرم مثل فرش بهتر از سرامیک لخت است.",
        "safety": "بالش‌های زیاد دورش نچینید که زیر آن‌ها خفه نشود؛ نظارت کنید.",
        "relatedMilestones": [
          "m6-sit",
          "m6-move"
        ]
      },
      {
        "id": "a6-soft-fingerfood",
        "title": "غذای انگشتی خیلی نرم",
        "shortDescription": "تمرین خودتغذیه‌ای ایمن زیر نظارت",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "INDEPENDENCE",
          "MOTOR"
        ],
        "goal": "هماهنگی دست و دهان و استقلال تغذیه",
        "materials": "تکه‌های نرم مناسب سن (طبق توصیه پزشک)",
        "instructions": [
          "کودک را در صندلی غذای امن بنشانید.",
          "۲ تا ۳ تکه نرم جلو بگذارید.",
          "اجازه دهید خودش امتحان کند.",
          "در تمام مدت کنارش بمانید.",
          "اگر خسته شد تمام کنید."
        ],
        "tip": "بافت را از نرم‌ترین شروع کنید.",
        "safety": "از خوراکی‌های گرد سفت و خطر خفگی پرهیز کنید؛ فقط نشسته و هوشیار.",
        "relatedMilestones": [
          "m6-self-feed",
          "m6-pincer-start"
        ]
      },
      {
        "id": "a6-pot-bang",
        "title": "آشپزخانه صدادار ایمن",
        "shortDescription": "کوبیدن قابلمه سبک و قاشق چوبی",
        "duration": 7,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "علت و معلول و رها کردن انرژی",
        "materials": "قابلمه سبک و قاشق چوبی",
        "instructions": [
          "وسایل را روی زمین بدهید.",
          "یک بار الگو بدهید.",
          "اجازه بازی آزاد بدهید.",
          "کلمات صدا بلند/آروم را اضافه کنید."
        ],
        "tip": "اگر صدا برای شما زیاد است مدت را کوتاه کنید.",
        "safety": "وسایل تیز، داغ یا سنگین ندهید.",
        "relatedMilestones": [
          "m6-transfer"
        ]
      }
    ],
    "sleep": {
      "overview": "با شروع حرکت و دندان‌درآوردن، خواب ممکن است ناپایدارتر شود. روال ثابت شب و محیط ایمن همچنان ستون اصلی است.",
      "routine": [
        {
          "title": "روال آشنای شب",
          "detail": "حمام کوتاه یا شستشو، لباس خواب، کتاب یا آواز، خواب در فضای امن."
        },
        {
          "title": "زمان‌بندی چرت",
          "detail": "معمولاً ۲ تا ۳ چرت؛ چرت خیلی دیر عصر را محدود کنید."
        },
        {
          "title": "بررسی دندان‌درآوردن",
          "detail": "اگر لثه ناراحت است آرامش و خنکای ایمن کمک می‌کند؛ دارو فقط با نظر پزشک."
        },
        {
          "title": "پاسخ یکنواخت شبانه",
          "detail": "نور کم و کار لازم بدون بازی."
        },
        {
          "title": "ایمنی با غلت و حرکت",
          "detail": "تخت خالی از اسباب نرم و بالش."
        }
      ],
      "guidance": [
        "انتقال از قنداق باید پیش از غلت زدن کامل انجام شده باشد.",
        "اگر کودک در خواب جابه‌جا می‌شود، فضای خواب را وسیع و ایمن نگه دارید.",
        "صفحه نمایش برای خواب آوردن مناسب نیست.",
        "تب همراه اختلال خواب را جدی بگیرید."
      ],
      "problems": [
        {
          "id": "s69-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "برای «بیدار شدن شب»، نیاز تغذیه/دندان/دمای اتاق را چک کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیدار شدن شب»، پاسخ کوتاه و آرام بدهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بیدار شدن شب»، روال روز را خیلی شلوغ نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s69-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، آخرین چرت را جلو بیاورید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، علائم خواب را زودتر بگیرید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، محرک عصر را کم کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s69-short-nap",
          "title": "چرت کوتاه",
          "guidance": [
            "برای «چرت کوتاه»، محیط را تاریک‌تر و ساکت‌تر کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «چرت کوتاه»، فاصله بیداری را تنظیم کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «چرت کوتاه»، اگر شب خوب می‌خوابد گاهی قابل قبول است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s69-separation-night",
          "title": "اعتراض هنگام خواباندن",
          "guidance": [
            "برای «اعتراض هنگام خواباندن»، شیء آرامش‌بخش ایمن در صورت مناسب بودن. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «اعتراض هنگام خواباندن»، خداحافظی کوتاه و حضور قابل پیش‌بینی. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «اعتراض هنگام خواباندن»، از ترک ناگهانی بدون کلام بپرهیزید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "حدود ۶ ماهگی زمان رایج شروع غذای کمکی کنار شیر است. شیر همچنان مهم است و غذا برای تمرین مهارت و مکمل تغذیه می‌آید.",
      "priorities": [
        {
          "title": "شروع تک‌ماده",
          "detail": "هر ماده جدید را جدا و با فاصله معرفی کنید تا واکنش احتمالی مشخص شود."
        },
        {
          "title": "بافت نرم",
          "detail": "پوره نرم یا انگشتی خیلی نرم مناسب مهارت فعلی انتخاب کنید."
        },
        {
          "title": "آهن‌دارها",
          "detail": "با راهنمایی پزشک منابع مناسب آهن را در برنامه بگذارید."
        },
        {
          "title": "نشسته غذا خوردن",
          "detail": "فقط در وضعیت نشسته و بیدار غذا بدهید."
        }
      ],
      "guidance": [
        "عسل زیر یک‌سالگی نه.",
        "نمک و شکر اضافه نکنید.",
        "اجبار به تمام کردن ظرف لازم نیست.",
        "آلرژی خانوادگی را با پزشک مرور کنید."
      ],
      "problems": [
        {
          "id": "n69-refuse",
          "title": "بدغذایی اولیه",
          "guidance": [
            "برای «بدغذایی اولیه»، غذا را بدون فشار دوباره ارائه دهید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بدغذایی اولیه»، خودتان با آرامش از همان غذا بخورید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بدغذایی اولیه»، بین وعده‌ها خوراکی شیرین جایگزین نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n69-veg",
          "title": "رد کردن سبزیجات",
          "guidance": [
            "برای «رد کردن سبزیجات»، بافت و شکل را عوض کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "با غذایی که دوست دارد ترکیب کنید نه پنهان‌کاری افراطی.",
            "برای «رد کردن سبزیجات»، تکرارهای متعدد طبیعی است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n69-snack",
          "title": "میان‌وعده جایگزین وعده",
          "guidance": [
            "برای «میان‌وعده جایگزین وعده»، زمان منظم وعده و میان‌وعده تعیین کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «میان‌وعده جایگزین وعده»، میان‌وعده را سبک و مغذی نگه دارید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "شیر را نزدیک وعده خیلی حجیم نکنید اگر میل غذا کم می‌شود؛ با پزشک هماهنگ کنید."
          ]
        },
        {
          "id": "n69-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "برای «طولانی شدن غذا»، زمان حدود ۱۵ تا ۲۰ دقیقه را هدف بگیرید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «طولانی شدن غذا»، حواس‌پرتی صفحه را حذف کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "اگر بازی با غذا زیاد شد وعده را با آرامش تمام کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "شروع غذای کمکی، دندان‌درآوردن، واکسن‌های این بازه و ایمن‌سازی خانه برای حرکت از محورها هستند.",
      "topics": [
        {
          "title": "مراجعات رشد",
          "detail": "وزن و قد و سؤال درباره نشستن/خزیدن را مطرح کنید."
        },
        {
          "title": "دندان و لثه",
          "detail": "لثه متورم را با دندان‌گیر تمیز و سرد (نه یخ سخت) آرام کنید."
        },
        {
          "title": "مکمل‌ها",
          "detail": "ویتامین D یا آهن را فقط طبق نظر پزشک ادامه دهید."
        },
        {
          "title": "علائم هشدار حرکتی",
          "detail": "اگر به‌سختی سر را نگه می‌دارد یا یک سمت بدن را خیلی کمتر استفاده می‌کند بگویید."
        },
        {
          "title": "ایمنی خانه",
          "detail": "پریز، مواد شوینده و گوشه‌های تیز را قبل از خزیدن ایمن کنید."
        }
      ],
      "guidance": [
        "مدفوع با شروع غذا تغییر می‌کند؛ خون یا کم‌آبی را جدی بگیرید.",
        "از داروهای دندان‌درآوردن حاوی مواد خطرناک بدون نسخه مطمئن پرهیز کنید.",
        "اگر واکنش آلرژیک مثل تورم لب یا تنگی نفس دیدید اورژانسی اقدام کنید.",
        "شنوایی: عدم واکنش پایدار به اسم را مطرح کنید."
      ]
    },
    "behavior": {
      "overview": "اضطراب جدایی و احتیاط از غریبه در این سن شایع است. حمایت عاطفی را با فرصت کشف ایمن متعادل کنید.",
      "situations": [
        {
          "id": "b69-sep",
          "title": "اضطراب جدایی",
          "guidance": [
            "در نیمه دوم سال اول برای «اضطراب جدایی» روی «خداحافظی کوتاه و بازگشت» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "برای «اضطراب جدایی»، تمرین جدا شدن‌های خیلی کوتاه در خانه. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «اضطراب جدایی»، مراقب جدید را تدریجی آشنا کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b69-stranger",
          "title": "ترس از غریبه",
          "guidance": [
            "برای «ترس از غریبه»، کودک را مجبور به بغل نکنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «ترس از غریبه»، از فاصله با صدای آرام شروع کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «ترس از غریبه»، احساسش را نام ببرید: انگار کمی ناآشناست. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b69-frust",
          "title": "ناامیدی حرکتی",
          "guidance": [
            "برای «ناامیدی حرکتی»، فضای امن برای تلاش بدهید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "در نیمه دوم سال اول برای «ناامیدی حرکتی» کمک جزئی بدهید نه حل کامل؛ بگذارید کمی خودش تلاش کند.",
            "برای «ناامیدی حرکتی»، تشویق تلاش مهم‌تر از نتیجه است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b69-no-share",
          "title": "کشی‌مکش بر سر اسباب",
          "guidance": [
            "برای «کشی‌مکش بر سر اسباب»، هنوز نوبت‌گیری واقعی نیست. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «کشی‌مکش بر سر اسباب»، اسباب مشابه زیاد کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «کشی‌مکش بر سر اسباب»، مدل گفتن نوبت تو را نشان دهید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b69-cling",
          "title": "چسبیدن زیاد",
          "guidance": [
            "برای «چسبیدن زیاد»، زمان بازی روی زمین کنار شما را بیشتر کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «چسبیدن زیاد»، پاسخ گرم به نیاز نزدیکی بدهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «چسبیدن زیاد»، استقلال را با اجبار جدا کردن نسازید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "با خزیدن و بردن همه چیز به دهان، ایمن‌سازی خانه ضروری می‌شود.",
      "items": [
        {
          "id": "sf69-choking",
          "title": "خفگی",
          "detail": "اشیای کوچک، سکه، باتری دکمه‌ای و مغزیجات کامل را دور کنید."
        },
        {
          "id": "sf69-falls",
          "title": "سقوط",
          "detail": "محافظ پله نصب کنید و مبل را برای بالا رفتن ایمن ببینید."
        },
        {
          "id": "sf69-cabinets",
          "title": "کابینت",
          "detail": "مواد شوینده و پلاستیک‌های خطرناک را قفل کنید."
        },
        {
          "id": "sf69-water",
          "title": "آب",
          "detail": "ظرف آب روی زمین و توالت را ایمن کنید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf69-burns",
          "title": "سوختگی",
          "detail": "دسته‌های قابلمه را به داخل گاز بچرخانید."
        },
        {
          "id": "sf69-windows",
          "title": "پنجره",
          "detail": "قفل کودک و توری مطمئن. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf69-cords",
          "title": "کابل و بند",
          "detail": "کابل‌های برق را جمع و پوشیده کنید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf69-car",
          "title": "خودرو",
          "detail": "هرگز کودک را حتی یک لحظه در خودرو تنها نگذارید."
        }
      ]
    }
  },
  {
    "id": "9-12",
    "minMonths": 9,
    "maxMonths": 11,
    "title": "۹ تا ۱۲ ماهگی",
    "subtitle": "ایستادن، اشاره و استقلال نوپا",
    "monthlyFocus": [
      {
        "domain": "MOTOR",
        "title": "ایستادن با تکیه‌گاه و کروزینگ",
        "summary": "بالا کشیدن و گام پهلو با مبل",
        "detail": "بسیاری از کودکان با گرفتن مبل می‌ایستند و پله‌پله کنار آن حرکت می‌کنند. کفش در خانه معمولاً لازم نیست؛ پا برهنه روی سطح امن تعادل را بهتر می‌کند. هل دادن واکرهای نشیمن‌دار کلاسیک توصیه نمی‌شود."
      },
      {
        "domain": "LANGUAGE",
        "title": "اشاره و درک ساده",
        "summary": "اشاره برای خواستن و فهم نه/بده",
        "detail": "اشاره کردن یک مهارت زبانی مهم است. وقتی اشاره کرد نام شیء را بگویید. دستورهای خیلی ساده یک‌مرحله‌ای مثل بده را در بازی تمرین کنید."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "خودتغذیه‌ای بیشتر",
        "summary": "قاشق‌بازی و انگشتی‌ها",
        "detail": "کثیف شدن بخشی از یادگیری است. پیش‌بند و سطح قابل شستشو فراهم کنید و اجازه دهید قاشق را امتحان کند حتی اگر کم به دهان برسد."
      },
      {
        "domain": "SOCIAL",
        "title": "تقلید و بازی اجتماعی",
        "summary": "دست زدن، بای‌بای و دالی",
        "detail": "بازی‌های تقلیدی کوتاه عالی‌اند. وقتی بای‌بای می‌کنید صبر کنید او هم تلاش کند. تشویق گرم بهتر از فشار برای اجرای کامل است."
      }
    ],
    "milestones": [
      {
        "id": "m9-pull",
        "domain": "MOTOR",
        "title": "بالا کشیدن برای ایستادن",
        "description": "با گرفتن مبل یا شما خودش را بالا می‌کشد."
      },
      {
        "id": "m9-cruise",
        "domain": "MOTOR",
        "title": "گام برداشتن با تکیه‌گاه",
        "description": "کنار مبل چند گام پهلو برمی‌دارد."
      },
      {
        "id": "m9-pincer",
        "domain": "MOTOR",
        "title": "گرفتن انبری",
        "description": "اقلام کوچک ایمن را با شست و اشاره برمی‌دارد."
      },
      {
        "id": "m9-point",
        "domain": "LANGUAGE",
        "title": "اشاره برای نشان دادن یا خواستن",
        "description": "با انگشت یا دست به خواسته اشاره می‌کند."
      },
      {
        "id": "m9-understand",
        "domain": "LANGUAGE",
        "title": "درک واژه یا اشاره آشنا",
        "description": "به کلماتی مثل نه یا بده گاهی درست واکنش می‌دهد."
      },
      {
        "id": "m9-wave",
        "domain": "SOCIAL",
        "title": "بای‌بای یا دست زدن",
        "description": "تقلید بازی‌های اجتماعی ساده را نشان می‌دهد."
      },
      {
        "id": "m9-find-hide",
        "domain": "COGNITIVE",
        "title": "پیدا کردن اسباب پنهان",
        "description": "دنبال اسبابی که دیده پنهان شده می‌گردد."
      },
      {
        "id": "m9-container",
        "domain": "COGNITIVE",
        "title": "گذاشتن و درآوردن از ظرف",
        "description": "اسباب را داخل سبد می‌گذارد یا درمی‌آورد."
      },
      {
        "id": "m9-spoon",
        "domain": "INDEPENDENCE",
        "title": "تلاش با قاشق",
        "description": "قاشق را نگه می‌دارد و به غذا نزدیک می‌کند."
      },
      {
        "id": "m9-help-dress",
        "domain": "INDEPENDENCE",
        "title": "کمک در لباس",
        "description": "دست یا پا را برای لباس پوشاندن جلو می‌آورد."
      }
    ],
    "activities": [
      {
        "id": "a9-cruise-safe",
        "title": "مسیر کروزینگ ایمن",
        "shortDescription": "چیدن مبلمان پایدار برای گام پهلو",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "تقویت ایستادن و جابه‌جایی ایستاده",
        "materials": "مبل پایدار و اسباب انگیزشی",
        "instructions": [
          "گوشه‌های تیز را بپوشانید.",
          "یک اسباب را کمی دورتر روی مبل بگذارید.",
          "کنار کودک بمانید تا با تکیه‌گاه برود.",
          "تشویق کلامی کوتاه بدهید.",
          "اگر خسته شد بنشانیدش."
        ],
        "tip": "سطح لغزنده جوراب‌دار را کم کنید.",
        "safety": "مبل سبک که واژگون می‌شود استفاده نکنید.",
        "relatedMilestones": [
          "m9-pull",
          "m9-cruise"
        ]
      },
      {
        "id": "a9-point-book",
        "title": "کتاب اشاره‌ای",
        "shortDescription": "اشاره مشترک به تصاویر",
        "duration": 6,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "COGNITIVE"
        ],
        "goal": "توجه مشترک و واژه‌آموزی",
        "materials": "کتاب ضخیم تصویری",
        "instructions": [
          "صفحه را باز کنید و یک تصویر را نام ببرید.",
          "از او بخواهید نشان بده.",
          "اگر اشاره کرد همان واژه را تکرار کنید.",
          "۲ تا ۳ صفحه کافی است."
        ],
        "tip": "اجازه دهید صفحه را خودش ورق بزند حتی اگر نامرتب است.",
        "safety": "کتاب خیلی کوچک جداشدنی ندهید.",
        "relatedMilestones": [
          "m9-point",
          "m9-understand"
        ]
      },
      {
        "id": "a9-in-out",
        "title": "بازی تو و درآر",
        "shortDescription": "گذاشتن مکعب‌ها در ظرف",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "مفهوم ظرف و حل مسئله ساده",
        "materials": "ظرف درباز و چند مکعب بزرگ",
        "instructions": [
          "یک مکعب را داخل بیندازید و بگویید رفت تو.",
          "از او بخواهید امتحان کند.",
          "بعد با هم خالی کنید.",
          "جشن کوچک برای هر موفقیت بگیرید."
        ],
        "tip": "تعداد قطعات را کم نگه دارید.",
        "safety": "قطعات باید بزرگ‌تر از خطر خفگی باشند.",
        "relatedMilestones": [
          "m9-container",
          "m9-pincer"
        ]
      },
      {
        "id": "a9-wave-game",
        "title": "بازی بای‌بای و دست‌زدن",
        "shortDescription": "تقلید اشاره اجتماعی",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "مهارت‌های اجتماعی اولیه",
        "materials": "نیازی نیست",
        "instructions": [
          "خودتان بای‌بای کنید و بگویید خداحافظ.",
          "صبر کنید او تقلید کند.",
          "دست بزنید و آواز کوتاه بخوانید.",
          "اگر نکرد دستش را به‌اجبار تکان ندهید؛ مدل را تکرار کنید."
        ],
        "tip": "در موقعیت واقعی رفتن مهمان هم تمرین کنید.",
        "safety": "اجبار بدنی برای ادا درآوردن لازم نیست.",
        "relatedMilestones": [
          "m9-wave"
        ]
      },
      {
        "id": "a9-spoon-play",
        "title": "قاشق‌بازی سر غذا",
        "shortDescription": "تمرین خودتغذیه کنار قاشق شما",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "INDEPENDENCE",
          "MOTOR"
        ],
        "goal": "هماهنگی و استقلال غذایی",
        "materials": "دو قاشق نرم کودک",
        "instructions": [
          "یک قاشق به کودک بدهید و یکی دست خودتان.",
          "بگذارید او هم در غذا آغشته کند.",
          "لقمه کمکی شما را ادامه دهید.",
          "کثیفی را با آرامش بپذیرید.",
          "زمان را خیلی طولانی نکنید."
        ],
        "tip": "هدف مهارت است نه مصرف کامل توسط خودش.",
        "safety": "صندلی غذا مهار باشد و هرگز تنها نماند.",
        "relatedMilestones": [
          "m9-spoon",
          "m9-help-dress"
        ]
      }
    ],
    "sleep": {
      "overview": "نزدیک یک‌سالگی بسیاری از کودکان به سمت ۱ تا ۲ چرت می‌روند. اعتراض موقع خواب با اضطراب جدایی شایع است.",
      "routine": [
        {
          "title": "روال ثابت ۵ مرحله‌ای",
          "detail": "شام سبک/شیر، شستشو، لباس، کتاب، خواب."
        },
        {
          "title": "کاهش محرک",
          "detail": "بازی هیجانی و صفحه را از یک ساعت قبل کم کنید."
        },
        {
          "title": "جدا شدن تدریجی",
          "detail": "بعد از روال، خداحافظی کوتاه و خروج آرام."
        },
        {
          "title": "هماهنگی چرت",
          "detail": "اگر شب دیر می‌خوابد چرت عصر را کوتاه کنید."
        }
      ],
      "guidance": [
        "روال سفر و مهمانی را تا حد ممکن شبیه خانه نگه دارید.",
        "اگر راه رفتن نزدیک است ممکن است شب بیشتر بیدار شود؛ موقتی است.",
        "ایمنی تخت را با قد و ایستادن او بازبینی کنید.",
        "در صورت وقفه تنفسی یا خروپف شدید پزشکی مراجعه کنید."
      ],
      "problems": [
        {
          "id": "s912-protest",
          "title": "اعتراض هنگام خواب",
          "guidance": [
            "برای «اعتراض هنگام خواب»، روال را کوتاه و پیش‌بینی‌پذیر کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «اعتراض هنگام خواب»، بازگشت‌های مکرر طولانی بازی نسازید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «اعتراض هنگام خواب»، آرامش خودتان مدل آرامش اوست. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s912-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "برای «بیدار شدن شب»، نیاز واقعی را چک کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیدار شدن شب»، پاسخ کم‌نور بدهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بیدار شدن شب»، تغییر بزرگ روزانه را در نظر بگیرید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s912-early",
          "title": "بیداری خیلی زود صبح",
          "guidance": [
            "برای «بیداری خیلی زود صبح»، آخرین چرت و ساعت خواب شب را بررسی کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بیداری خیلی زود صبح»، اتاق را تاریک نگه دارید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "شروع روز را با محرک قوی خیلی زود پاسخ ندهید اگر ممکن است."
          ]
        },
        {
          "id": "s912-nap-drop",
          "title": "حذف زودهنگام چرت",
          "guidance": [
            "برای «حذف زودهنگام چرت»، حذف هر دو چرت معمولاً زود است. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «حذف زودهنگام چرت»، علائم خستگی روزانه را ببینید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «حذف زودهنگام چرت»، به‌جای حذف کامل، زمان‌بندی را جابه‌جا کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "تنوع غذایی بیشتر می‌شود اما شیر همچنان بخش مهم انرژی است. بافت‌ها را به‌تدریج نزدیک غذای خانواده کنید.",
      "priorities": [
        {
          "title": "تنوع رنگی",
          "detail": "در هفته از گروه‌های مختلف غذایی ارائه دهید."
        },
        {
          "title": "انگشتی ایمن",
          "detail": "تکه‌های نرم انگشتی برای تمرین انبری عالی است."
        },
        {
          "title": "الگوی وعده",
          "detail": "وعده و میان‌وعده منظم بهتر از خوردن مداوم است."
        },
        {
          "title": "آب در وعده",
          "detail": "آب کمی در لیوان مناسب سن همراه غذا قابل بررسی است."
        }
      ],
      "guidance": [
        "عسل هنوز نه.",
        "آبمیوه صنعتی لازم نیست.",
        "اجبار به خوردن را حذف کنید.",
        "خطر خفگی خوراکی‌های گرد سفت را جدی بگیرید."
      ],
      "problems": [
        {
          "id": "n912-refuse",
          "title": "بدغذایی",
          "guidance": [
            "برای «بدغذایی»، غذا را بدون هیجان منفی دوباره بیاورید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بدغذایی»، میان‌وعده نزدیک وعده ندهید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بدغذایی»، یک ماده آشنا کنار ماده جدید بگذارید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n912-veg",
          "title": "سبزیجات",
          "guidance": [
            "برای «سبزیجات»، بخارپز نرم و طعم ملایم. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "در نیمه دوم سال اول برای «سبزیجات» اقدام کاربردی‌تان «مشارکت در دادن قاشق» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «سبزیجات»، الگوی خوردن شما مؤثر است. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n912-snack",
          "title": "میان‌وعده شیرین",
          "guidance": [
            "برای «میان‌وعده شیرین»، میوه یا لبنیات ساده را پیش‌فرض کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «میان‌وعده شیرین»، شیرینی را عادت روزانه نکنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای آرام کردن هیجان از خوراکی استفاده دائمی نکنید."
          ]
        },
        {
          "id": "n912-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "برای «طولانی شدن غذا»، تایمر ذهنی ۱۵ تا ۲۰ دقیقه. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "در نیمه دوم سال اول برای «طولانی شدن غذا» وعده را آرام تمام کنید؛ تهدید غذایی معمولاً نتیجه معکوس دارد.",
            "بازی نامحدود با غذا را محدود کنید بدون تنبیه سخت."
          ]
        }
      ]
    },
    "health": {
      "overview": "نزدیک یک‌سالگی زمان مرور واکسن‌ها، رشد گفتار اولیه، دندان و ایمنی حرکت ایستاده است.",
      "topics": [
        {
          "title": "واکسن ۱۲ ماهگی",
          "detail": "برنامه را چک و نوبت را رزرو کنید. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "دندان",
          "detail": "با رویش دندان مسواک انگشتی یا نرم مناسب را شروع کنید."
        },
        {
          "title": "غربالگری رشد",
          "detail": "درباره اشاره، بابلینگ و ایستادن با پزشک حرف بزنید."
        },
        {
          "title": "کم‌خونی و تغذیه",
          "detail": "در صورت توصیه، آزمایش‌های این سن را انجام دهید."
        },
        {
          "title": "کفش",
          "detail": "برای بیرون کفش انعطاف‌پذیر؛ در خانه اغلب پا برهنه بهتر است."
        }
      ],
      "guidance": [
        "اگر اصلاً بابلینگ ندارد یا به اسم واکنش نمی‌دهد مطرح کنید.",
        "زمین خوردن‌های این سن شایع است؛ محیط را نرم‌تر کنید.",
        "تب طول‌کشیده یا بی‌حالی را جدی بگیرید.",
        "از دادن داروهای سرماخوردگی بدون نسخه مخصوص نوزاد/شیرخوار بپرهیزید مگر تجویز."
      ]
    },
    "behavior": {
      "overview": "نه گفتن شما بیشتر می‌شود چون تحرک بالاست. مرز ایمنی را با لحن آرام و جایگزین مجاز همراه کنید.",
      "situations": [
        {
          "id": "b912-no",
          "title": "مواجهه با نه",
          "guidance": [
            "کوتاه بگویید و جایگزین بدهید: این نه؛ اینو بگیر.",
            "نه زیاد پشت‌سرهم اثر را کم می‌کند؛ محیط را ایمن‌تر کنید.",
            "برای «مواجهه با نه»، تشویق رفتار درست را فراموش نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b912-sep",
          "title": "جدایی",
          "guidance": [
            "در نیمه دوم سال اول برای «جدایی» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند.",
            "در نیمه دوم سال اول برای «جدایی» شیء آشنای ایمن مثل پتوی کوچک همراهش باشد تا جدایی نرم‌تر شود.",
            "برای «جدایی»، از قایم شدن برای رفتن پرهیز کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b912-frust",
          "title": "قفقرق کوتاه",
          "guidance": [
            "برای «قفقرق کوتاه»، نزدیک بمانید و ایمنی را حفظ کنید. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «قفقرق کوتاه»، احساس را نام ببرید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "بعد از آرام شدن خواسته را دوباره با مرز توضیح دهید."
          ]
        },
        {
          "id": "b912-grab",
          "title": "قاپیدن اسباب",
          "guidance": [
            "در نیمه دوم سال اول برای «قاپیدن اسباب» روی «دو نسخه مشابه» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در نیمه دوم سال اول برای «قاپیدن اسباب» اقدام کاربردی‌تان «مدل صبر کوتاه» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «قاپیدن اسباب»، هنوز انتظار اشتراک کامل واقع‌بینانه نیست. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b912-test",
          "title": "آزمایش محدودیت",
          "guidance": [
            "برای «آزمایش محدودیت»، پاسخ یکسان مراقبان مهم است. در نیمه دوم سال اول این کار را با ثبات و آرامش تکرار کنید.",
            "برای «آزمایش محدودیت»، لحن آرام و بدن مطمئن. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «آزمایش محدودیت»، بحث طولانی لازم نیست. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "ایستادن یعنی دسترسی به ارتفاع بیشتر؛ دوباره خانه را از دید کودک ایستاده بررسی کنید.",
      "items": [
        {
          "id": "sf912-falls",
          "title": "سقوط و لبه",
          "detail": "گوشه میز و تلویزیون ناپایدار را مهار کنید."
        },
        {
          "id": "sf912-choking",
          "title": "خفگی",
          "detail": "خوراکی و اشیای ریز را روزانه جمع کنید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-burns",
          "title": "سوختگی",
          "detail": "اتو، کتری و شمع را غیرقابل دسترس کنید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-water",
          "title": "آب",
          "detail": "نظارت تمام‌وقت کنار آب. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-windows",
          "title": "پنجره و بالکن",
          "detail": "مبل را زیر پنجره نچینید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-meds",
          "title": "دارو",
          "detail": "کیف مهمان را هم از دسترس دور کنید. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-outdoor",
          "title": "بیرون",
          "detail": "دست نگه دارید؛ فرار ناگهانی شایع است. در نیمه دوم سال اول این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf912-pets",
          "title": "حیوانات",
          "detail": "غذای حیوان و ظرف Litter را جدا و غیرقابل دسترس کنید."
        }
      ]
    }
  },
  {
    "id": "12-15",
    "minMonths": 12,
    "maxMonths": 14,
    "title": "۱۲ تا ۱۵ ماهگی",
    "subtitle": "گام‌های اول، کلمات اولیه و خودم می‌خواهم",
    "monthlyFocus": [
      {
        "domain": "MOTOR",
        "title": "راه رفتن اولیه",
        "summary": "چند قدم مستقل یا با یک دست گرفتن",
        "detail": "زمان راه رفتن خیلی متفاوت است. تشویق با بازی بهتر از هل دادن است. زمین امن و پا برهنه در خانه تعادل را پشتیبانی می‌کند."
      },
      {
        "domain": "LANGUAGE",
        "title": "کلمات و اشاره",
        "summary": "۱ تا چند کلمه معنی‌دار به‌علاوه اشاره",
        "detail": "هر تلاش ارتباطی را پاسخ دهید. به‌جای اصلاح سخت، مدل درست را تکرار کنید: کودک بگوید آب و شما بگویید آره، آب می‌خوای."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "انتخاب کوچک",
        "summary": "انتخاب بین دو گزینه امن",
        "detail": "دو لباس یا دو میان‌وعده را نشان دهید تا حس کنترل پیدا کند. این کار قشقرق‌های ناشی از ناتوانی در بیان را کم می‌کند."
      },
      {
        "domain": "COGNITIVE",
        "title": "تقلید کاربردی",
        "summary": "استفاده ساده از اشیاء مثل شانه و تلفن اسباب",
        "detail": "بازی وانمودی خیلی ساده شروع می‌شود. شما مدل شوید و بعد نوبت او را بدهید؛ لازم نیست نمایش کامل باشد."
      }
    ],
    "milestones": [
      {
        "id": "m12-walk",
        "domain": "MOTOR",
        "title": "چند قدم مستقل یا نزدیک به آن",
        "description": "چند قدم برمی‌دارد یا با حمایت کم جابه‌جا می‌شود."
      },
      {
        "id": "m12-stoop",
        "domain": "MOTOR",
        "title": "خم شدن و برداشتن اسباب",
        "description": "با حفظ تعادل نسبی چیزی از زمین برمی‌دارد."
      },
      {
        "id": "m12-words",
        "domain": "LANGUAGE",
        "title": "کلمات معنی‌دار",
        "description": "حداقل یک یا چند کلمه با معنی ثابت دارد."
      },
      {
        "id": "m12-point-request",
        "domain": "LANGUAGE",
        "title": "اشاره برای درخواست",
        "description": "برای خواستن شیء یا کمک اشاره می‌کند."
      },
      {
        "id": "m12-follow",
        "domain": "LANGUAGE",
        "title": "دستور یک‌مرحله‌ای",
        "description": "درخواست ساده‌ای مثل بده توپ را انجام می‌دهد."
      },
      {
        "id": "m12-pretend",
        "domain": "COGNITIVE",
        "title": "وانمودی ساده",
        "description": "به عروسک غذا می‌دهد یا تلفن اسباب را به گوش می‌برد."
      },
      {
        "id": "m12-stack",
        "domain": "COGNITIVE",
        "title": "چیدن ۲ مکعب",
        "description": "حداقل دو قطعه را روی هم می‌گذارد."
      },
      {
        "id": "m12-self-spoon",
        "domain": "INDEPENDENCE",
        "title": "غذا با قاشق/دست",
        "description": "بخشی از وعده را خودش می‌خورد."
      },
      {
        "id": "m12-help-dress",
        "domain": "INDEPENDENCE",
        "title": "کمک در پوشیدن",
        "description": "دست در آستین یا پا در شلوار می‌کند."
      },
      {
        "id": "m12-parallel",
        "domain": "SOCIAL",
        "title": "بازی کنار دیگران",
        "description": "کنار کودک دیگر بازی می‌کند حتی اگر هنوز با هم بازی نکند."
      }
    ],
    "activities": [
      {
        "id": "a12-push-cart",
        "title": "هل دادن جعبه یا واگن سنگین ایمن",
        "shortDescription": "تمرین تعادل با هل دادن",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "تعادل و اعتماد به راه رفتن",
        "materials": "جعبه نسبتاً پایدار یا واگن ایمن",
        "instructions": [
          "وزن خیلی سبک یا خیلی سنگین نگذارید.",
          "مسیر صاف و بدون پله انتخاب کنید.",
          "جلو بایستید و تشویق کنید به سمت شما بیاید.",
          "بعد از چند دقیقه استراحت بدهید."
        ],
        "tip": "اگر هنوز راه نمی‌رود فشار نکنید؛ نشسته هل دادن هم مفید است.",
        "safety": "واکر نشیمن‌دار چرخدار کلاسیک توصیه نمی‌شود.",
        "relatedMilestones": [
          "m12-walk",
          "m12-stoop"
        ]
      },
      {
        "id": "a12-label-day",
        "title": "نام‌بردن کارهای روز",
        "shortDescription": "روایت کوتاه کارهای مشترک",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE"
        ],
        "goal": "پیوند واژه با تجربه",
        "materials": "نیازی نیست",
        "instructions": [
          "هنگام شستن دست بگویید آب، دست، خشک.",
          "مکث کنید تا او صدا یا اشاره کند.",
          "کلمه او را گسترش دهید.",
          "روزانه در ۲ موقعیت تکرار کنید."
        ],
        "tip": "کم حرف اما واضح بهتر از حرف زیاد نامفهوم است.",
        "safety": "اگر واکنش به صدا ضعیف است با پزشک مطرح کنید.",
        "relatedMilestones": [
          "m12-words",
          "m12-point-request",
          "m12-follow"
        ]
      },
      {
        "id": "a12-stack-cups",
        "title": "برج لیوان‌های سبک",
        "shortDescription": "چیدن و خراب کردن عمدی",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "هماهنگی و درک ساختن",
        "materials": "۳ تا ۴ لیوان یا مکعب بزرگ",
        "instructions": [
          "یک برج کوتاه بسازید.",
          "از او بخواهید یکی اضافه کند.",
          "اجازه خراب کردن با خنده بدهید.",
          "دوباره با هم بسازید."
        ],
        "tip": "خراب کردن بخشی از بازی است نه شیطنت.",
        "safety": "قطعات کوچک خطرناک ندهید.",
        "relatedMilestones": [
          "m12-stack"
        ]
      },
      {
        "id": "a12-pretend-feed",
        "title": "غذا دادن به عروسک",
        "shortDescription": "وانمودی ساده مراقبت",
        "duration": 7,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "SOCIAL"
        ],
        "goal": "تقلید نقش و همدلی اولیه",
        "materials": "عروسک و قاشق اسباب",
        "instructions": [
          "خودتان به عروسک غذا بدهید.",
          "قاشق را به کودک بدهید.",
          "بگویید عروسک گرسنه است.",
          "اگر خواست پتو بیندازد تشویق کنید."
        ],
        "tip": "نیازی به داستان پیچیده نیست.",
        "safety": "عروسک با اجزای جداشدنی کوچک ندهید.",
        "relatedMilestones": [
          "m12-pretend"
        ]
      },
      {
        "id": "a12-two-choices",
        "title": "انتخاب دوگزینه‌ای",
        "shortDescription": "تمرین استقلال در تصمیم کوچک",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE",
          "LANGUAGE"
        ],
        "goal": "کاهش ناتوانی بیانی و حس کنترل",
        "materials": "دو گزینه واقعی (لباس یا خوراکی)",
        "instructions": [
          "دو گزینه را نشان دهید و نام ببرید.",
          "بپرسید کدوم؟",
          "انتخابش را اجرا کنید.",
          "اگر هیچ‌کدام را نخواست گزینه سوم از قبل نداشته باشید؛ بعداً دوباره."
        ],
        "tip": "انتخاب‌ها باید هر دو برای شما قابل قبول باشند.",
        "safety": "خوراکی خطر خفگی پیشنهاد نکنید.",
        "relatedMilestones": [
          "m12-help-dress",
          "m12-self-spoon"
        ]
      }
    ],
    "sleep": {
      "overview": "بسیاری از کودکان این سن یک چرت روزانه دارند یا در حال انتقال‌اند. روال شب و ایمنی تخت ایستاده مهم است.",
      "routine": [
        {
          "title": "روال کوتاه ثابت",
          "detail": "کتاب، بوسه، جمله تکراری خداحافظ خواب."
        },
        {
          "title": "زمان خواب منظم‌تر",
          "detail": "اختلاف زیاد ساعت خواب شب را کم کنید."
        },
        {
          "title": "چرت میانه روز",
          "detail": "چرت خیلی دیر عصر را محدود کنید."
        },
        {
          "title": "اتاق ایمن برای ایستادن در تخت",
          "detail": "اسباب خطرناک و بند را از دسترس داخل تخت بردارید."
        },
        {
          "title": "کاهش صفحه",
          "detail": "نزدیک خواب صفحه نمایش نگذارید."
        }
      ],
      "guidance": [
        "کابوس واقعی معمولاً بعداً رایج‌تر است؛ بیداری اعتراض‌آمیز شایع‌تر است.",
        "اگر از تخت خاردار به تخت دیگر جابه‌جا می‌کنید ایمنی را اولویت دهید.",
        "بیماری و دندان می‌توانند خواب را موقتاً به‌هم بزنند.",
        "خروپف جدید را بررسی کنید."
      ],
      "problems": [
        {
          "id": "s1215-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، چرت عصر را کوتاه کنید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، روال را زودتر شروع کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، بازی پرهیجان شب را کم کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1215-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "حدود یک تا دو سالگی برای «بیدار شدن شب» هر بار پاسخ شبانه یکنواخت بدهید تا الگوی خواب شکل بگیرد.",
            "حدود یک تا دو سالگی برای «بیدار شدن شب» اقدام کاربردی‌تان «بررسی گرسنگی/درد دندان» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «بیدار شدن شب»، از بردن به فضای بازی شب پرهیز کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1215-climb",
          "title": "تلاش برای بیرون آمدن از تخت",
          "guidance": [
            "برای «تلاش برای بیرون آمدن از تخت»، ارتفاع و ایمنی را بازبینی کنید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "اگر جابه‌جایی لازم است محیط اتاق را کاملاً ایمن کنید.",
            "برای «تلاش برای بیرون آمدن از تخت»، پاسخ آرام بدون تبدیل به بازی. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1215-sep",
          "title": "اعتراض جدایی شب",
          "guidance": [
            "حدود یک تا دو سالگی برای «اعتراض جدایی شب» صدا و محیط را آرام کنید تا تنش سریع‌تر فروکش کند.",
            "حدود یک تا دو سالگی برای «اعتراض جدایی شب» یک جمله کوتاه تکراری برای خداحافظی یا بازگشت به تخت داشته باشید.",
            "برای «اعتراض جدایی شب»، بازگشت‌های کوتاه بدون مذاکره طولانی. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "غذای خانواده با بافت مناسب محور می‌شود. شیر مادر ادامه یا شیر مناسب سن طبق نظر پزشک جای خود دارد.",
      "priorities": [
        {
          "title": "هم‌غذایی خانواده",
          "detail": "تا حد ممکن همان غذا با کم‌نمک و بافت نرم‌تر."
        },
        {
          "title": "آهن و پروتئین",
          "detail": "منابع مناسب سن را در وعده‌ها بگنجانید."
        },
        {
          "title": "لیوان تمرینی",
          "detail": "تمرین نوشیدن از لیوان مناسب."
        },
        {
          "title": "میان‌وعده هوشمند",
          "detail": "میوه، لبنیات ساده، غلات مناسب به‌جای هله‌هوله."
        }
      ],
      "guidance": [
        "عسل زیر یک‌سالگی هنوز نه؛ بعد از یک‌سالگی هم مقدار کم.",
        "آبمیوه را عادت روزانه نکنید.",
        "اجبار و جایزه شیرین برای هر لقمه الگوی ناسالم می‌سازد.",
        "حین راه رفتن غذا ندهید؛ خطر خفگی."
      ],
      "problems": [
        {
          "id": "n1215-refuse",
          "title": "بدغذایی",
          "guidance": [
            "حدود یک تا دو سالگی برای «بدغذایی» وعده‌ها را منظم نگه دارید؛ بی‌نظمی زمانی بدغذایی را بدتر می‌کند.",
            "حدود یک تا دو سالگی برای «بدغذایی» اقدام کاربردی‌تان «غذای جدید کنار آشنا» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «بدغذایی»، بدون جنگ قدرت. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1215-veg",
          "title": "سبزیجات",
          "guidance": [
            "حدود یک تا دو سالگی برای «سبزیجات» روی «برش انگشتی نرم» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «سبزیجات» در شستن یا چیدن سبزی شریکش کنید تا کنجکاوی جایگزین اجبار شود.",
            "برای «سبزیجات»، تکرار بدون فشار. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1215-snack",
          "title": "میان‌وعده زیاد",
          "guidance": [
            "برای «میان‌وعده زیاد»، ۲ میان‌وعده کافی است. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «میان‌وعده زیاد»، شیرینی در دسترس آزاد نباشد. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «میان‌وعده زیاد»، اگر گرسنه نیست وعده را زور نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1215-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» صفحه نمایش را از وعده غذا یا روال خواب دور نگه دارید.",
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» وعده را آرام تمام کنید؛ تهدید غذایی معمولاً نتیجه معکوس دارد."
          ]
        }
      ]
    },
    "health": {
      "overview": "پس از یک‌سالگی رشد گفتار، راه رفتن، دندان و واکسن‌ها را مرور کنید.",
      "topics": [
        {
          "title": "واکسن و چکاپ",
          "detail": "نوبت‌های ۱۲ ماهگی و پس از آن را تکمیل کنید."
        },
        {
          "title": "دندان",
          "detail": "مسواک با مقدار بسیار کم خمیر مناسب سن. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "حرکت",
          "detail": "تنوع زمین خوردن طبیعی است؛ علائم آسیب جدی را بشناسید."
        },
        {
          "title": "گفتار و شنوایی",
          "detail": "نبود اشاره یا کلمه را در چکاپ مطرح کنید."
        },
        {
          "title": "ایمنی خانه مرحله ۲",
          "detail": "دسترسی ایستاده به گاز و کشوها را بازبینی کنید."
        }
      ],
      "guidance": [
        "شیر گاو کامل به‌عنوان نوشیدنی را فقط با نظر پزشک شروع/تنظیم کنید.",
        "تب همراه بی‌حالی یا بثورات غیرعادی را پیگیری کنید.",
        "از معجون‌های سنتی ناشناس برای دندان یا سرما اجتناب کنید.",
        "کودک را برای عکس یادگاری در موقعیت‌های ناایمن قرار ندهید."
      ]
    },
    "behavior": {
      "overview": "استقلال و نه شنیدن همزمان رشد می‌کنند. قشقرق‌های کوتاه از ناتوانی زبانی و خستگی رایج است.",
      "situations": [
        {
          "id": "b1215-tantrum",
          "title": "قشقرق",
          "guidance": [
            "برای «قشقرق»، ایمنی را حفظ کنید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «قشقرق»، کم حرف و حضور آرام. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "بعد از آرامش نیاز را نام ببرید و مرز را یادآوری کنید."
          ]
        },
        {
          "id": "b1215-no",
          "title": "لجبازی نه",
          "guidance": [
            "برای «لجبازی نه»، انتخاب محدود بدهید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "جنگ بی‌نتیجه را رها کنید وقتی ایمنی در خطر نیست.",
            "برای «لجبازی نه»، در ایمنی قاطع بمانید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b1215-sep",
          "title": "جدایی",
          "guidance": [
            "برای «جدایی»، روال ثابت مهد یا مراقب. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود یک تا دو سالگی برای «جدایی» اقدام کاربردی‌تان «خداحافظی کوتاه» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «جدایی» ابتدا «بازگشت به‌موقع برای اعتماد» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1215-bite",
          "title": "گاز گرفتن از فرط هیجان/ناکامی",
          "guidance": [
            "برای «گاز گرفتن از فرط هیجان/ناکامی»، فوری و آرام جدا کنید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «گاز گرفتن از فرط هیجان/ناکامی»، بگویید گاز می‌زنه درد داره. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «گاز گرفتن از فرط هیجان/ناکامی»، جایگزین: گاز زدن خوراکی یا دندان‌گیر. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b1215-help",
          "title": "خودم می‌کنم",
          "guidance": [
            "برای «خودم می‌کنم»، زمان اضافه برای خودش انجام دادن بگذارید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «خودم می‌کنم»، کار را به گام‌های کوچک بشکنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «خودم می‌کنم»، نتیجه ناقص را بپذیرید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "راه رفتن یعنی سرعت و دسترسی غیرمنتظره. نظارت فعال جایگزین ایمن‌سازی نیست؛ هر دو لازم‌اند.",
      "items": [
        {
          "id": "sf1215-choking",
          "title": "خفگی",
          "detail": "خوراکی گرد سفت، پاپ‌کورن و سکه را دور کنید."
        },
        {
          "id": "sf1215-falls",
          "title": "سقوط",
          "detail": "محافظ پله بالا و پایین. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1215-burns",
          "title": "سوختگی",
          "detail": "فنجان داغ را عقب میز بگذارید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1215-water",
          "title": "آب",
          "detail": "استخر و تشت فقط با تماس دستی نزدیک. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1215-windows",
          "title": "پنجره",
          "detail": "قفل و دور کردن اهرم صعود. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1215-meds",
          "title": "دارو و ویتامین شکری",
          "detail": "طعم‌دار بودن خطر خوردن زیاد می‌سازد؛ قفل کنید."
        },
        {
          "id": "sf1215-car",
          "title": "خودرو",
          "detail": "صندلی مناسب وزن/قد؛ هر سفر مهار کامل. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1215-outdoor",
          "title": "بیرون",
          "detail": "نزدیک خیابان دست در دست. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "15-18",
    "minMonths": 15,
    "maxMonths": 17,
    "title": "۱۵ تا ۱۸ ماهگی",
    "subtitle": "راه رفتن روان‌تر، واژه‌های بیشتر و بازی تقلیدی",
    "monthlyFocus": [
      {
        "domain": "LANGUAGE",
        "title": "انفجار واژه‌ای تدریجی",
        "summary": "کلمات جدید و ترکیب اشاره+کلمه",
        "detail": "هر هفته ممکن است واژه جدید اضافه شود. کتاب کوتاه روزانه و تکرار در بافت واقعی معجزه می‌کند. سؤال‌های انتخابی پاسخ‌دهی را آسان می‌کند."
      },
      {
        "domain": "MOTOR",
        "title": "دویدن اولیه و بالا رفتن",
        "summary": "حرکت سریع‌تر و عشق به پله",
        "detail": "بالا رفتن از مبل هیجان‌انگیز و خطرناک است. به‌جای فقط نه گفتن، مسیر ایمن بالا/پایین تمرین دهید و محیط را بازآرایی کنید."
      },
      {
        "domain": "SOCIAL",
        "title": "بازی تقلیدی اجتماعی",
        "summary": "کارهای خانه را تقلید می‌کند",
        "detail": "جارو، تلفن و آشپزی اسباب فرصت یادگیری نقش است. شما مدل آرام باشید تا او همان را کپی کند."
      },
      {
        "domain": "COGNITIVE",
        "title": "حل مسئله ساده",
        "summary": "کشیدن اسباب برای رسیدن یا استفاده از ابزار ساده",
        "detail": "اگر اسباب زیر مبل رفت صبر کنید تا خودش راهی پیدا کند؛ بعد راهنمایی جزئی بدهید. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m15-walk-well",
        "domain": "MOTOR",
        "title": "راه رفتن پایدارتر",
        "description": "بدون افتادن مکرر در سطح صاف راه می‌رود."
      },
      {
        "id": "m15-climb",
        "domain": "MOTOR",
        "title": "بالا رفتن از مبل یا پله با کمک",
        "description": "با نظارت بالا می‌رود یا تلاش پایدار دارد."
      },
      {
        "id": "m15-words-many",
        "domain": "LANGUAGE",
        "title": "چندین کلمه",
        "description": "واژه‌های بیشتری برای افراد و اشیاء آشنا دارد."
      },
      {
        "id": "m15-body",
        "domain": "LANGUAGE",
        "title": "نشان دادن بخش بدن",
        "description": "حداقل یک بخش بدن را نشان می‌دهد."
      },
      {
        "id": "m15-request",
        "domain": "LANGUAGE",
        "title": "درخواست واضح‌تر",
        "description": "با کلمه، صدا یا اشاره پایدار درخواست می‌کند."
      },
      {
        "id": "m15-imitate",
        "domain": "SOCIAL",
        "title": "تقلید کارهای خانه",
        "description": "کارهایی مثل پاک کردن یا حرف زدن با تلفن اسباب را تقلید می‌کند."
      },
      {
        "id": "m15-sort-start",
        "domain": "COGNITIVE",
        "title": "جور کردن خیلی ساده",
        "description": "اشیا را در دو گروه تقریبی جدا می‌کند."
      },
      {
        "id": "m15-problem",
        "domain": "COGNITIVE",
        "title": "حل مسئله ساده",
        "description": "برای رسیدن به اسباب از کشیدن یا ابزار ساده استفاده می‌کند."
      },
      {
        "id": "m15-cup",
        "domain": "INDEPENDENCE",
        "title": "نوشیدن از لیوان",
        "description": "با لیوان مناسب بخشی از نوشیدنی را می‌نوشد."
      },
      {
        "id": "m15-remove-hat",
        "domain": "INDEPENDENCE",
        "title": "درآوردن کلاه/جوراب",
        "description": "لباس ساده را درمی‌آورد یا تلاش می‌کند."
      }
    ],
    "activities": [
      {
        "id": "a15-body-song",
        "title": "آواز اعضای بدن",
        "shortDescription": "نشان دادن چشم و دست با آواز",
        "duration": 6,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "واژه و آگاهی بدنی",
        "materials": "نیازی نیست",
        "instructions": [
          "آواز ساده چشم کجاست بخوانید.",
          "دست او را به‌آرامی به همان بخش راهنمایی کنید.",
          "نوبت او برای نشان دادن.",
          "با خنده تکرار کنید."
        ],
        "tip": "اگر دوست ندارد لمس شود فقط روی خودتان مدل دهید.",
        "safety": "بازی خشن با صورت نکنید.",
        "relatedMilestones": [
          "m15-body",
          "m15-words-many"
        ]
      },
      {
        "id": "a15-pillow-climb",
        "title": "کوه بالش ایمن",
        "shortDescription": "بالا و پایین رفتن کنترل‌شده",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "قدرت پا و برنامه‌ریزی حرکتی",
        "materials": "بالش‌های ثابت روی فرش",
        "instructions": [
          "چند بالش محکم بچینید.",
          "مسیر بالا و پایین را نشان دهید.",
          "دستش را در صورت نیاز بگیرید.",
          "قانون آهسته را بگویید.",
          "جمع کردن بالش را با هم انجام دهید."
        ],
        "tip": "ارتفاع را کم نگه دارید.",
        "safety": "نزدیک پله یا شیشه نباشد.",
        "relatedMilestones": [
          "m15-climb",
          "m15-walk-well"
        ]
      },
      {
        "id": "a15-clean-up-song",
        "title": "آواز جمع کردن",
        "shortDescription": "تقلید مسئولیت کوتاه",
        "duration": 5,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "INDEPENDENCE"
        ],
        "goal": "مشارکت و نظم بازی",
        "materials": "سبد اسباب",
        "instructions": [
          "آواز جمع می‌کنیم بخوانید.",
          "یک اسباب را خودتان داخل سبد بگذارید.",
          "از او یک اسباب بخواهید.",
          "تشویق مشخص بدهید: توپ را گذاشتی تو سبد."
        ],
        "tip": "کل اتاق را از او نخواهید؛ ۲ تا ۳ قطعه کافی است.",
        "safety": "اسباب شکستنی وارد بازی نکنید.",
        "relatedMilestones": [
          "m15-imitate",
          "m15-remove-hat"
        ]
      },
      {
        "id": "a15-pull-string",
        "title": "اسباب نخ‌دار ایمن",
        "shortDescription": "کشیدن اسباب برای حرکت دادن",
        "duration": 7,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "حل مسئله و هماهنگی",
        "materials": "اسباب چرخدار با نخ کوتاه ایمن",
        "instructions": [
          "نشان دهید کشیدن نخ اسباب را حرکت می‌دهد.",
          "نخ را به او بدهید.",
          "در فضای باز خانگی تمرین کنید.",
          "اگر گیر کرد راهنمایی کوتاه بدهید."
        ],
        "tip": "نخ باید کوتاه باشد تا به گردن نپیچد.",
        "safety": "بدون نظارت رها نکنید.",
        "relatedMilestones": [
          "m15-problem"
        ]
      },
      {
        "id": "a15-snack-prep",
        "title": "کمک میان‌وعده",
        "shortDescription": "گذاشتن میوه در بشقاب",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE",
          "COGNITIVE"
        ],
        "goal": "مشارکت غذایی",
        "materials": "میوه‌های نرم تکه‌شده از قبل",
        "instructions": [
          "تکه‌ها را آماده کنید.",
          "از او بخواهید در بشقاب بگذارد.",
          "بشمارید یک، دو.",
          "با هم بخورید."
        ],
        "tip": "چاقو فقط دست بزرگسال باشد.",
        "safety": "اندازه تکه‌ها ضد خفگی باشد.",
        "relatedMilestones": [
          "m15-cup",
          "m15-sort-start"
        ]
      }
    ],
    "sleep": {
      "overview": "حرکت زیاد روز می‌تواند خواب را بهتر یا گاهی Overnight restless کند. روال آرام عصر کلیدی است.",
      "routine": [
        {
          "title": "تخلیه انرژی روز",
          "detail": "بازی حرکتی کافی قبل از عصر خیلی دیر."
        },
        {
          "title": "روال آرام",
          "detail": "کتاب و نور کم جایگزین دویدن آخر شب."
        },
        {
          "title": "ساعت نسبتا ثابت",
          "detail": "تعطیلات هم اختلاف ساعت را خیلی زیاد نکنید."
        },
        {
          "title": "یک چرت باکیفیت",
          "detail": "اگر یک چرت دارد از قطع شدن مکررش کم کنید."
        }
      ],
      "guidance": [
        "اعتراض خواب اغلب آزمایش مرز است؛ ثبات پاسخ کمک می‌کند.",
        "اگر خروپف با توقف تنفس دیدید مراجعه کنید.",
        "تب و گوش‌درد خواب را به‌هم می‌ریزند.",
        "اتاق را برای بیدار شدن شب ایمن نگه دارید."
      ],
      "problems": [
        {
          "id": "s1518-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، شام و روال را جلو بیاورید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، چرت دیر را کوتاه کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، مهمانی‌های پیاپی را مدیریت کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1518-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "حدود یک تا دو سالگی برای «بیدار شدن شب» روی «پاسخ خسته‌کننده و یکنواخت» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «بیدار شدن شب» اقدام کاربردی‌تان «بررسی کابوس/ناراحتی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "از دعوت به تخت والدین به‌عنوان عادت جدید ناگهانی بدون برنامه بپرهیزید اگر نمی‌خواهید ادامه یابد؛ تصمیم آگاهانه بگیرید."
          ]
        },
        {
          "id": "s1518-early",
          "title": "سحرخیزی",
          "guidance": [
            "حدود یک تا دو سالگی برای «سحرخیزی» پرده تاریک‌کننده سحرخیزی شدید را کمتر می‌کند.",
            "برای «سحرخیزی»، ساعت بیداری قابل قبول خانواده را مشخص کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «سحرخیزی»، چرت و خواب شب را بازبینی کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1518-refuse-nap",
          "title": "امتناع از چرت",
          "guidance": [
            "برای «امتناع از چرت»، روال چرت شبیه خواب شب. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "اگر واقعاً نمی‌خوابد زمان آرامش اجباری جایگزین کنید.",
            "برای «امتناع از چرت»، علائم خستگی عصر را ببینید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "اشتها روزبه‌روز فرق می‌کند. نگاه هفتگی به تنوع بهتر از جنگ سر هر وعده است.",
      "priorities": [
        {
          "title": "تنوع در هفته",
          "detail": "به‌جای کامل خوردن هر وعده."
        },
        {
          "title": "چربی‌های سالم مناسب سن",
          "detail": "طبق الگوی غذایی خانواده و نظر پزشک."
        },
        {
          "title": "کاهش نوشیدنی شیرین",
          "detail": "آب و شیر مناسب سن اولویت."
        },
        {
          "title": "مشارکت آماده کردن",
          "detail": "شستن و گذاشتن در ظرف."
        }
      ],
      "guidance": [
        "نمک اضافه غذای خانواده را برای کودک کم کنید.",
        "خوراکی به‌عنوان رشوه دائمی ندهید.",
        "در حال دویدن تغذیه نکنید.",
        "اگر کاهش وزن یا کم‌ادراری دیدید پزشکی مراجعه کنید."
      ],
      "problems": [
        {
          "id": "n1518-refuse",
          "title": "بدغذایی",
          "guidance": [
            "برای «بدغذایی»، منوی کوتاه تکراری با تنوع تدریجی. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بدغذایی»، وعده خانوادگی بدون اجبار. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بدغذایی»، میان‌وعده را خراب‌کن وعده نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1518-veg",
          "title": "سبزیجات",
          "guidance": [
            "حدود یک تا دو سالگی برای «سبزیجات» سبزی را با دیپ ساده مثل ماست همراه کنید تا امتحان آسان‌تر شود.",
            "حدود یک تا دو سالگی برای «سبزیجات» اقدام کاربردی‌تان «برش‌های انگشتی رنگی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "حدود یک تا دو سالگی برای «سبزیجات» کنار او همان غذا را با لذت بخورید؛ دیدن شما از اصرار کلامی قوی‌تر است."
          ]
        },
        {
          "id": "n1518-snack",
          "title": "میان‌وعده بسته‌بندی‌شده",
          "guidance": [
            "برای «میان‌وعده بسته‌بندی‌شده»، جایگزین خانگی آماده در کیف. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود یک تا دو سالگی برای «میان‌وعده بسته‌بندی‌شده» اقدام کاربردی‌تان «قانون آشپزخانه باز محدود» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «میان‌وعده بسته‌بندی‌شده»، برچسب شکر را ببینید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1518-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» با جمله ثابت و مهربانانه فعالیت را تمام کنید و به مرحله بعد بروید.",
            "برای «طولانی شدن غذا»، بدون تهدید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «طولانی شدن غذا»، بعداً میان‌وعده سالم طبق برنامه. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "فعالیت بدنی، دندان، شنوایی/گفتار و ایمنی بالا رفتن محور مراقبت‌اند.",
      "topics": [
        {
          "title": "دندان و مسواک",
          "detail": "روال صبح و شب حتی اگر کوتاه. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "کفش بیرون",
          "detail": "اندازه درست؛ نه سفتی زیاد. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "گفتار",
          "detail": "ترکیب اشاره و کلمه را جشن بگیرید و در چکاپ مرور کنید."
        },
        {
          "title": "بازی بیرون",
          "detail": "هوای آزاد برای خواب و خلق مفید است. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        }
      ],
      "guidance": [
        "زمین خوردن پیشانی شایع است؛ نشانه‌های ضربه جدی را بشناسید.",
        "دارو را بر اساس وزن فعلی بدهید.",
        "اگر کلمات از دست رفت یا ارتباط خیلی کم شد زودتر ارزیابی بخواهید.",
        "ضدآفتاب و کلاه در مواجهه آفتاب."
      ]
    },
    "behavior": {
      "overview": "آزمایش محدودیت شدیدتر می‌شود. پاسخ کوتاه، ایمنی قطعی و اتصال عاطفی بعد از طوفان ترکیب برنده است.",
      "situations": [
        {
          "id": "b1518-tantrum",
          "title": "قشقرق",
          "guidance": [
            "حدود یک تا دو سالگی برای «قشقرق» روی «کم کردن تماشاچی» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "برای «قشقرق»، حضور بی‌حرف اگر لازم. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «قشقرق» ابتدا «بعداً آموزش کوتاه» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1518-defiance",
          "title": "لجبازی",
          "guidance": [
            "حدود یک تا دو سالگی برای «لجبازی» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "پیشگیری با اعلام انتقال: پنج دقیقه بعد می‌ریم.",
            "حدود یک تا دو سالگی برای «لجبازی» قول یا قانون را آرام و ثابت پیگیری کنید."
          ]
        },
        {
          "id": "b1518-sep",
          "title": "جدایی",
          "guidance": [
            "حدود یک تا دو سالگی برای «جدایی» روی «کتاب درباره جدا شدن» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «جدایی» تا حد ممکن مراقب آشنا داشته باشید؛ تغییر ناگهانی اضطراب را بالا می‌برد.",
            "باج دادن طولانی با تأخیر رفتن معمولاً سخت‌ترش می‌کند."
          ]
        },
        {
          "id": "b1518-agg",
          "title": "هل دادن",
          "guidance": [
            "حدود یک تا دو سالگی برای «هل دادن» هل یا ضربه را فوراً متوقف کنید، از آسیب‌دیده مراقبت کنید، بعد آموزش دهید.",
            "برای «هل دادن»، جمله کوتاه درباره بدن دیگران. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «هل دادن» ابتدا «جایگزین: دست لطیف» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1518-indep",
          "title": "استقلال",
          "guidance": [
            "حدود یک تا دو سالگی برای «استقلال» زمان بیشتری برای خودش انجام‌دادن بگذارید؛ عجله استقلال را مختل می‌کند.",
            "حدود یک تا دو سالگی برای «استقلال» اقدام کاربردی‌تان «لباس آسان برای موفقیت» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «استقلال»، کمک فقط وقتی خواست. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b1518-coop",
          "title": "عدم همکاری لباس/خروج",
          "guidance": [
            "حدود یک تا دو سالگی برای «عدم همکاری لباس/خروج» روی «بازی مسابقه آرام» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «عدم همکاری لباس/خروج» مراحل لباس یا خروج را با آواز کوتاه تکراری همراه کنید.",
            "برای «عدم همکاری لباس/خروج»، اجتناب از عجله همیشگی صبح. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "بالا رفتن و دویدن اولیه خطر برخورد و سقوط را بالا می‌برد. تمرکز این بخش روی راهنمایی عملی و ایمن برای والدین است تا روزمره قابل‌پیش‌بینی‌تر و آرام‌تر شود.",
      "items": [
        {
          "id": "sf1518-falls",
          "title": "سقوط از ارتفاع",
          "detail": "پنجره، بالکن و میز را ایمن کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1518-choking",
          "title": "خفگی",
          "detail": "آجیل کامل و خوراکی سفت خام را مدیریت کنید."
        },
        {
          "id": "sf1518-burns",
          "title": "سوختگی",
          "detail": "اتو و موچین داغ را جمع کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1518-water",
          "title": "آب",
          "detail": "کلاس شنا جای نظارت کنار آب خانگی را نمی‌گیرد."
        },
        {
          "id": "sf1518-cleaning",
          "title": "شوینده",
          "detail": "پودر لباسشویی کپسولی بسیار جذاب و خطرناک است."
        },
        {
          "id": "sf1518-car",
          "title": "خودرو",
          "detail": "هرگز کمربند را شل نگذارید چون اعتراض می‌کند."
        },
        {
          "id": "sf1518-outdoor",
          "title": "خیابان",
          "detail": "دستگیره مچ یا دست به‌جای اعتماد به ایستادن."
        },
        {
          "id": "sf1518-pets",
          "title": "حیوان",
          "detail": "از نزدیک شدن به حیوان در حال غذا خوردن جلوگیری کنید."
        }
      ]
    }
  },
  {
    "id": "18-24",
    "minMonths": 18,
    "maxMonths": 23,
    "title": "۱۸ تا ۲۴ ماهگی",
    "subtitle": "جمله‌های کوتاه، نه قوی و کنجکاوی بی‌پایان",
    "monthlyFocus": [
      {
        "domain": "LANGUAGE",
        "title": "ترکیب دو کلمه‌ای",
        "summary": "جمله‌های کوتاه و پرسیدن با لحن",
        "detail": "ترکیب‌هایی مثل بابا رفت یا آب بیشتر را گسترش دهید. کتاب با سؤال ساده بعدش چی شد گفت‌وگو می‌سازد."
      },
      {
        "domain": "SOCIAL",
        "title": "هیجان‌های بزرگ",
        "summary": "قشقرق، خوذش و نیاز به اتصال",
        "detail": "مغز هیجانی جلوتر از مهارت آرام‌سازی است. شما تنظیم‌گر بیرونی او هستید: نزدیک، آرام، با مرز."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "خودم انجام بدم",
        "summary": "لباس، شستن دست و کمک خانه",
        "detail": "لباس راحت برای موفقیت انتخاب کنید. کار ناقص بهتر از کامل انجام‌شده توسط شماست وقتی وقت دارید."
      },
      {
        "domain": "MOTOR",
        "title": "دویدن و توپ",
        "summary": "هماهنگی درشت بهتر",
        "detail": "توپ‌بازی، راه رفتن روی مسیر خطی و پارک ایمن انرژی و مهارت را با هم می‌سازند. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m18-run",
        "domain": "MOTOR",
        "title": "دویدن اولیه",
        "description": "با کنترل نسبی می‌دود."
      },
      {
        "id": "m18-ball",
        "domain": "MOTOR",
        "title": "غلتاندن یا شوت توپ",
        "description": "توپ را به سمتی هدایت می‌کند."
      },
      {
        "id": "m18-two-words",
        "domain": "LANGUAGE",
        "title": "ترکیب دو کلمه‌ای",
        "description": "دو کلمه را برای معنی کنار هم می‌گذارد."
      },
      {
        "id": "m18-follow-2",
        "domain": "LANGUAGE",
        "title": "درک دستورهای ساده روزمره",
        "description": "درخواست‌های آشنا را انجام می‌دهد."
      },
      {
        "id": "m18-play-near",
        "domain": "SOCIAL",
        "title": "بازی موازی",
        "description": "کنار همسالان بازی می‌کند و گاهی نگاه می‌کند."
      },
      {
        "id": "m18-emotion",
        "domain": "SOCIAL",
        "title": "نشان دادن هیجان واضح",
        "description": "خوشحالی، اعتراض یا محبت را نشان می‌دهد."
      },
      {
        "id": "m18-sort",
        "domain": "COGNITIVE",
        "title": "جور کردن شکل/رنگ ساده",
        "description": "حداقل در یک ویژگی ساده جور می‌کند."
      },
      {
        "id": "m18-pretend-seq",
        "domain": "COGNITIVE",
        "title": "وانمودی چندبخشی کوتاه",
        "description": "مثلاً غذا بده و بخوابان."
      },
      {
        "id": "m18-dress",
        "domain": "INDEPENDENCE",
        "title": "کمک بیشتر در لباس",
        "description": "بخشی از لباس را خودش می‌پوشد یا درمی‌آورد."
      },
      {
        "id": "m18-wash",
        "domain": "INDEPENDENCE",
        "title": "شستن دست با کمک",
        "description": "مراحل را با راهنمایی انجام می‌دهد."
      },
      {
        "id": "m18-scribble",
        "domain": "COGNITIVE",
        "title": "خط‌خطی",
        "description": "با مدادشمعی روی کاغذ علامت می‌گذارد."
      }
    ],
    "activities": [
      {
        "id": "a18-two-word",
        "title": "گسترش جمله کوتاه",
        "shortDescription": "تکرار گسترش‌یافته حرف کودک",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE"
        ],
        "goal": "مدل‌سازی دستور زبان ساده",
        "materials": "نیازی نیست",
        "instructions": [
          "وقتی گفت ماشین بگویید ماشین قرمز رفت.",
          "مکث برای نوبت او.",
          "سؤال انتخابی بپرسید.",
          "در کتاب همان الگو را ادامه دهید."
        ],
        "tip": "اصلاح مستقیم مداوم انگیزه حرف زدن را کم می‌کند.",
        "safety": "اگر پسرفت گفتار دیدید با پزشک/گفتاردرمانگر مشورت کنید.",
        "relatedMilestones": [
          "m18-two-words",
          "m18-follow-2"
        ]
      },
      {
        "id": "a18-ball-roll",
        "title": "توپ‌بازی نوبتی",
        "shortDescription": "غلتاندن توپ بین دو نفر",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "MOTOR",
          "SOCIAL"
        ],
        "goal": "نوبت و هماهنگی",
        "materials": "توپ نرم متوسط",
        "instructions": [
          "روی زمین بنشینید و توپ را بغلتانید.",
          "بگویید نوبت تو.",
          "فاصله را کم شروع کنید.",
          "بعد از چند نوبت شوت آرام اضافه کنید."
        ],
        "tip": "مسابقه برنده‌بازنده نگذارید.",
        "safety": "فضای بدون شیشه و گوشه تیز.",
        "relatedMilestones": [
          "m18-ball",
          "m18-run"
        ]
      },
      {
        "id": "a18-color-sort",
        "title": "جور کردن دو رنگ",
        "shortDescription": "جدا کردن اسباب قرمز و آبی",
        "duration": 8,
        "difficulty": "medium",
        "domains": [
          "COGNITIVE",
          "LANGUAGE"
        ],
        "goal": "توجه و دسته‌بندی",
        "materials": "۶ اسباب در ۲ رنگ",
        "instructions": [
          "دو سبد بگذارید و رنگ را نام ببرید.",
          "یکی را مدل کنید.",
          "از او بخواهید بعدی را بگذارد.",
          "اشتباه را بدون سرزنش اصلاح کنید."
        ],
        "tip": "اگر سخت بود فقط یک رنگ هدف بگیرید.",
        "safety": "قطعات کوچک بلعیدنی حذف شوند.",
        "relatedMilestones": [
          "m18-sort"
        ]
      },
      {
        "id": "a18-dress-race",
        "title": "مسابقه آرام لباس",
        "shortDescription": "پوشیدن لباس با زمان کافی",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "INDEPENDENCE",
          "MOTOR"
        ],
        "goal": "مهارت لباس و همکاری",
        "materials": "لباس راحت",
        "instructions": [
          "لباس را آماده و رو کنید.",
          "او پا/دست را ببرد.",
          "شما فقط بخش سخت را کمک کنید.",
          "جشن پایان بدون عجله."
        ],
        "tip": "صبح‌ها وقت اضافه بگذارید تا جنگ کمتر شود.",
        "safety": "زیپ و دکمه خطرناک نزدیک صورت نباشد بدون کمک.",
        "relatedMilestones": [
          "m18-dress",
          "m18-wash"
        ]
      },
      {
        "id": "a18-scribble",
        "title": "نقاشی ایستاده کوتاه",
        "shortDescription": "خط‌خطی با مدادشمعی کلفت",
        "duration": 7,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "مهارت ظریف و بیان",
        "materials": "کاغذ بزرگ و مدادشمعی کلفت",
        "instructions": [
          "کاغذ را روی میز یا زمین بچسبانید.",
          "مدل یک خط بکشید.",
          "کاغذ را به او بدهید.",
          "درباره رنگ حرف بزنید نه قضاوت زیبا/زشت."
        ],
        "tip": "مدت کوتاه بهتر از اجبار طولانی است.",
        "safety": "فقط وسایل غیرسمی؛ نظارت برای نخوردن مدادشمعی.",
        "relatedMilestones": [
          "m18-scribble"
        ]
      }
    ],
    "sleep": {
      "overview": "نزدیک ۲ سالگی ممکن است مقاومت خواب و ترس‌های اولیه دیده شود. روال و محدودیت صفحه حیاتی است.",
      "routine": [
        {
          "title": "اعلام انتقال",
          "detail": "۱۰ دقیقه دیگر خواب را از قبل بگویید."
        },
        {
          "title": "روال ثابت",
          "detail": "مسواک، کتاب، چراغ خواب ملایم."
        },
        {
          "title": "یک چرت یا استراحت",
          "detail": "اگر چرت نمی‌ماند زمان آرام جایگزین کنید."
        },
        {
          "title": "قانون اتاق",
          "detail": "بیرون آمدن مکرر را با بازگشت آرام مدیریت کنید."
        },
        {
          "title": "کاهش صفحه عصر",
          "detail": "حداقل یک ساعت قبل خواب."
        }
      ],
      "guidance": [
        "ترس از تاریکی را مسخره نکنید؛ چراغ شب کمک می‌کند.",
        "ساعت خواب خیلی دیر خلق فردا را خراب می‌کند.",
        "بیماری و سفر الگو را موقتاً به‌هم می‌زند؛ برگرداندن روال مهم است.",
        "اگر خروپف یا تنفس دهانی شدید دارید بررسی کنید."
      ],
      "problems": [
        {
          "id": "s1824-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، زمان‌بندی را ۱۵ دقیقه جلو بیاورید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، چرت را تنظیم کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، بازی مخفیانه بعد روال را قطع کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1824-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "حدود یک تا دو سالگی برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "حدود یک تا دو سالگی برای «بیدار شدن شب» قبل از فرض بدخوابی، ترس یا نیاز واقعی مثل تشنگی را کوتاه بررسی کنید.",
            "برای «بیدار شدن شب»، از روشن کردن تلویزیون شب پرهیز. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s1824-bedhop",
          "title": "آمدن مکرر به تخت والدین",
          "guidance": [
            "حدود یک تا دو سالگی برای «آمدن مکرر به تخت والدین» روی «تصمیم خانوادگی واحد» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «آمدن مکرر به تخت والدین» او را آرام به تخت خودش برگردانید و با جمله ثابت خداحافظی کنید.",
            "اگر انتخاب هم‌خوابی است ایمنی تخت بزرگسال را رعایت کنید."
          ]
        },
        {
          "id": "s1824-fear",
          "title": "ترس شبانه",
          "guidance": [
            "برای «ترس شبانه»، گوش دهید. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "هیولا را با منطق پیچیده بحث نکنید؛ امنیت بدهید.",
            "برای «ترس شبانه»، روال جرات کوچک در روز. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "بدغذایی در این سن افسانه‌ای رایج و گاهی واقعی است. ساختار وعده و آرامش سفره از فشار مؤثرتر است.",
      "priorities": [
        {
          "title": "سفره خانوادگی",
          "detail": "تا حد ممکن با هم بخورید."
        },
        {
          "title": "پروتئین+فیبر+انرژی",
          "detail": "در هر وعده تعادل تقریبی."
        },
        {
          "title": "شیر و لبنیات مناسب",
          "detail": "طبق توصیه پزشک مقدار را تنظیم کنید تا جای غذا را نگیرد."
        },
        {
          "title": "آب به‌جای نوشابه",
          "detail": "نوشیدنی شیرین را استثنا کنید."
        }
      ],
      "guidance": [
        "جایزه خوراکی برای هر رفتار الگوی پیچیده‌ای می‌سازد.",
        "کودک را مجبور به پاک کردن بشقاب نکنید.",
        "میان‌وعده را برنامه‌دار کنید.",
        "اگر رشد روی منحنی نگران‌کننده است با پزشک مرور کنید نه با اجبار خانگی."
      ],
      "problems": [
        {
          "id": "n1824-refuse",
          "title": "بدغذایی",
          "guidance": [
            "برای «بدغذایی»، همان غذا برای همه با تطبیق بافت. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «بدغذایی»، بدون آشپزخانه سفارشی بی‌انتها. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «بدغذایی»، ارائه مکرر بدون فشار. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n1824-veg",
          "title": "سبزیجات",
          "guidance": [
            "برای «سبزیجات»، او در انتخاب دو سبزی مشارکت کند. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود یک تا دو سالگی برای «سبزیجات» اقدام کاربردی‌تان «پخت‌های مختلف» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "حدود یک تا دو سالگی برای «سبزیجات» دیپ کم‌نمک کنار سبزی بگذارید تا کنجکاوی جایگزین اجبار شود."
          ]
        },
        {
          "id": "n1824-snack",
          "title": "میان‌وعده",
          "guidance": [
            "حدود یک تا دو سالگی برای «میان‌وعده» میان‌وعده را ساعت ثابت بگذارید تا اشتهای وعده اصلی حفظ شود.",
            "حدود یک تا دو سالگی برای «میان‌وعده» با جمله ثابت و مهربانانه فعالیت را تمام کنید و به مرحله بعد بروید.",
            "برای «میان‌وعده» ابتدا «گزینه از پیش تأییدشده» را در عمل بیاورید؛ حدود یک تا دو سالگی بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n1824-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» زمان معقولی برای وعده بگذارید و بعد بدون دعوا سفره را جمع کنید.",
            "برای «طولانی شدن غذا»، برداشتن ظرف بدون سخنرانی. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "حدود یک تا دو سالگی برای «طولانی شدن غذا» وعده را آرام تمام کنید و وعده بعدی را سر ساعت همیشگی بگذارید."
          ]
        }
      ]
    },
    "health": {
      "overview": "چکاپ ۱۸ تا ۲۴ ماهگی، گفتار، واکسن و غربالگری‌های تکاملی را جدی بگیرید.",
      "topics": [
        {
          "title": "غربالگری تکامل",
          "detail": "پرسشنامه‌های غربالگری را با صداقت پر کنید."
        },
        {
          "title": "دندان",
          "detail": "مسواک منظم؛ مراجعه دندان‌پزشکی کودکان طبق توصیه."
        },
        {
          "title": "فعالیت",
          "detail": "حداقل زمان بازی فعال روزانه بیرون یا داخل."
        },
        {
          "title": "صفحه نمایش",
          "detail": "هرچه کمتر برای زیر ۲ سال بهتر؛ اگر هست همراهی مشترک."
        },
        {
          "title": "توالت",
          "detail": "آمادگی را تحمیل نکنید؛ نشانه‌ها را بشناسید."
        }
      ],
      "guidance": [
        "پسرفت مهارت‌های قبلی را سریع مطرح کنید.",
        "عفونت گوش مکرر و تأخیر گفتار را با هم ببینید.",
        "ایمنی جاده و پارک را آموزش دهید نه فقط نه بگویید.",
        "ضدآفتاب، کلاه و هیدراتاسیون در گرما."
      ]
    },
    "behavior": {
      "overview": "نه گفتن کودک اوج می‌گیرد. هدف اطاعت بی‌چون‌وچرا نیست؛ راهنمایی امن و اتصال است.",
      "situations": [
        {
          "id": "b1824-tantrum",
          "title": "قشقرق",
          "guidance": [
            "برای «قشقرق»، پیشگیری با خواب و گرسنگی. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود یک تا دو سالگی برای «قشقرق» در اوج هیجان کم حرف بزنید؛ حرف زیاد معمولاً موج را بلندتر می‌کند.",
            "برای «قشقرق» ابتدا «اتصال بعد از طوفان» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1824-defiance",
          "title": "لجبازی",
          "guidance": [
            "حدود یک تا دو سالگی برای «لجبازی» انتخاب را به دو گزینه قابل‌قبول محدود کنید.",
            "حدود یک تا دو سالگی برای «لجبازی» اقدام کاربردی‌تان «پیگیری یک دستور مهم» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «لجبازی» ابتدا «نادیده گرفتن کشمکش‌های بی‌اهمیت» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1824-sep",
          "title": "جدایی",
          "guidance": [
            "حدود یک تا دو سالگی برای «جدایی» روی «داستان اجتماعی کوتاه» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود یک تا دو سالگی برای «جدایی» تا حد ممکن مراقب آشنا داشته باشید؛ تغییر ناگهانی اضطراب را بالا می‌برد.",
            "برای «جدایی» ابتدا «خداحافظی مطمئن» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1824-agg",
          "title": "پرخاشگری",
          "guidance": [
            "حدود یک تا دو سالگی برای «پرخاشگری» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "حدود یک تا دو سالگی برای «پرخاشگری» اقدام کاربردی‌تان «حفاظت از کودک دیگر» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «پرخاشگری» ابتدا «آموزش کلمه کمک/نه» را در عمل بیاورید؛ حدود یک تا دو سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b1824-coop",
          "title": "عدم همکاری",
          "guidance": [
            "حدود یک تا دو سالگی برای «عدم همکاری» مراحل لباس یا خروج را با آواز کوتاه تکراری همراه کنید.",
            "حدود یک تا دو سالگی برای «عدم همکاری» تایمر تصویری نشان دهد چقدر تا پایان بازی یا شروع خواب مانده.",
            "برای «عدم همکاری»، انجام با هم. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b1824-indep",
          "title": "استقلال",
          "guidance": [
            "برای «استقلال»، گوشه کمک خودت در آشپزخانه. حدود یک تا دو سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود یک تا دو سالگی برای «استقلال» لباس ساده با کش و دکمه آسان بگذارید تا تمرین استقلال ممکن شود.",
            "حدود یک تا دو سالگی برای «استقلال» تلاش مشخص را تشویق کنید، نه فقط نتیجه کامل را."
          ]
        }
      ]
    },
    "safety": {
      "overview": "کنجکاوی + مهارت حرکتی = دسترسی به خطرات جدید مثل مواد شوینده و خیابان.",
      "items": [
        {
          "id": "sf1824-choking",
          "title": "خفگی",
          "detail": "هنوز کامل نجویدن؛ خوراکی‌ها را مناسب کنید."
        },
        {
          "id": "sf1824-falls",
          "title": "سقوط",
          "detail": "تخت دو طبقه و سطوح بلند ممنوع بدون حفاظت."
        },
        {
          "id": "sf1824-burns",
          "title": "سوختگی",
          "detail": "فر و شومینه را مانع کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-water",
          "title": "آب",
          "detail": "استخرهای بادی را بعد استفاده خالی کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-windows",
          "title": "پنجره",
          "detail": "قفل کودک ضروری است. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-meds",
          "title": "دارو",
          "detail": "کیف مهمان و کیف مادر را بالا بگذارید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-cleaning",
          "title": "شوینده",
          "detail": "ظرف‌های شفاف رنگی خطرناک‌اند. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-car",
          "title": "خودرو",
          "detail": "صندلی را پس از هر جابه‌جایی چک کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf1824-outdoor",
          "title": "بیرون",
          "detail": "در خروجی خانه را ایمن کنید. حدود یک تا دو سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "24-30",
    "minMonths": 24,
    "maxMonths": 29,
    "title": "۲ تا ۲.۵ سالگی",
    "subtitle": "جمله‌ها، هیجان‌های بزرگ و بازی موازی",
    "monthlyFocus": [
      {
        "domain": "LANGUAGE",
        "title": "جمله‌های ۲ تا ۳ کلمه‌ای",
        "summary": "گفتن نیاز و تعریف کوتاه",
        "detail": "از او سؤال باز بپرسید و برای پاسخ وقت بدهید. وقتی تعریف می‌کند جزئیات اضافه کنید تا واژگان غنی شود."
      },
      {
        "domain": "SOCIAL",
        "title": "نام‌گذاری احساس",
        "summary": "عصبانی، ناراحت، خوشحال را نام ببرید",
        "detail": "نام‌گذاری هیجان به تنظیم کمک می‌کند. در اوج قشقرق آموزش ندهید؛ بعد از آرامش کوتاه مرور کنید."
      },
      {
        "domain": "MOTOR",
        "title": "پریدن و تعادل",
        "summary": "پریدن با دو پا و راه رفتن روی مسیر",
        "detail": "بازی‌های پارک و مسیر خانگی با چسب کاغذی تعادل و برنامه‌ریزی حرکتی را تقویت می‌کند."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "کارهای مراقبت از خود",
        "summary": "دست شستن، کمک در لباس و جمع اسباب",
        "detail": "چک‌لیست تصویری روی دیوار حمام یا اتاق موفقیت را دیدنی می‌کند. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m24-sentences",
        "domain": "LANGUAGE",
        "title": "جمله‌های کوتاه",
        "description": "۲ تا ۳ کلمه را کنار هم می‌گذارد."
      },
      {
        "id": "m24-question",
        "domain": "LANGUAGE",
        "title": "پرسیدن با لحن یا کلمه",
        "description": "سؤال ساده می‌پرسد یا با لحن سؤال می‌گوید."
      },
      {
        "id": "m24-jump",
        "domain": "MOTOR",
        "title": "پریدن با دو پا",
        "description": "از زمین کمی جدا می‌شود یا تلاش پایدار دارد."
      },
      {
        "id": "m24-stairs",
        "domain": "MOTOR",
        "title": "پله با کمک یا تناوب اولیه",
        "description": "با نرده یا کمک بالا/پایین می‌رود."
      },
      {
        "id": "m24-play",
        "domain": "SOCIAL",
        "title": "بازی موازی/کوتاه مشترک",
        "description": "کنار یا کوتاه با همبازی بازی می‌کند."
      },
      {
        "id": "m24-emotion",
        "domain": "SOCIAL",
        "title": "بیان هیجان",
        "description": "با کلمه یا اشاره هیجان را نشان می‌دهد."
      },
      {
        "id": "m24-sort",
        "domain": "COGNITIVE",
        "title": "جور کردن رنگ یا شکل",
        "description": "چند شیء را بر اساس یک ویژگی جدا می‌کند."
      },
      {
        "id": "m24-scribble",
        "domain": "COGNITIVE",
        "title": "خط‌خطی جهت‌دارتر",
        "description": "علامت‌های متنوع‌تری می‌کشد."
      },
      {
        "id": "m24-dress",
        "domain": "INDEPENDENCE",
        "title": "پوشیدن بخشی از لباس",
        "description": "شلوار یا کفش راحت را تا حدی خودش می‌پوشد."
      },
      {
        "id": "m24-handwash",
        "domain": "INDEPENDENCE",
        "title": "شستن دست با یادآوری",
        "description": "مراحل را با راهنمایی کم انجام می‌دهد."
      }
    ],
    "activities": [
      {
        "id": "a24-feelings",
        "title": "کارت احساس",
        "shortDescription": "نام‌بردن خوشحال/ناراحت با تصویر",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "سواد هیجانی",
        "materials": "۳ تصویر احساس ساده",
        "instructions": [
          "تصویر را نشان دهید و نام ببرید.",
          "از او بپرسید تو کی این شکلی میشی؟",
          "یک موقعیت امروز را مثال بزنید.",
          "بگویید وقتی ناراحتی میتونیم نفس بکشیم."
        ],
        "tip": "در اوج عصبانیت کارت را به رخ نکشید.",
        "safety": "تصاویر خیلی کوچک بلعیدنی نباشند.",
        "relatedMilestones": [
          "m24-emotion",
          "m24-sentences"
        ]
      },
      {
        "id": "a24-jump-line",
        "title": "بازی خط و پرش",
        "shortDescription": "پریدن روی خط چسبی",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "تعادل و کنترل بدن",
        "materials": "چسب کاغذی روی فرش",
        "instructions": [
          "یک خط صاف بچسبانید.",
          "روی خط راه بروید.",
          "بپر این طرف خط را بازی کنید.",
          "نوبت او برای تعیین بازی کوتاه."
        ],
        "tip": "سطح لغزنده نباشد.",
        "safety": "دور مبل شیشه‌ای بازی نکنید.",
        "relatedMilestones": [
          "m24-jump",
          "m24-stairs"
        ]
      },
      {
        "id": "a24-color-hunt",
        "title": "شکار رنگ در خانه",
        "shortDescription": "پیدا کردن ۳ وسیله همرنگ",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "COGNITIVE",
          "LANGUAGE"
        ],
        "goal": "توجه و واژه رنگ",
        "materials": "نیازی نیست",
        "instructions": [
          "یک رنگ انتخاب کنید.",
          "با هم ۳ وسیله پیدا کنید.",
          "نام وسیله و رنگ را بگویید.",
          "رنگ را عوض کنید اگر هنوز علاقه دارد."
        ],
        "tip": "وسایل شکستنی را از بازی خارج کنید.",
        "safety": "نزدیک اجاق و پریز نروید.",
        "relatedMilestones": [
          "m24-sort",
          "m24-question"
        ]
      },
      {
        "id": "a24-story-cards",
        "title": "داستان سه‌تصویری",
        "shortDescription": "ترتیب اول-وسط-آخر",
        "duration": 8,
        "difficulty": "medium",
        "domains": [
          "LANGUAGE",
          "COGNITIVE"
        ],
        "goal": "روایت و ترتیب",
        "materials": "۳ کارت یا عکس",
        "instructions": [
          "کارت‌ها را به هم بریزید.",
          "با هم مرتب کنید.",
          "از او بپرسید بعدش چی شد؟",
          "پاسخ خیالی را هم بپذیرید."
        ],
        "tip": "کمال ترتیب مهم‌تر از حرف زدن او نیست.",
        "safety": "کارت‌ها را از دهان دور نگه دارید.",
        "relatedMilestones": [
          "m24-sentences",
          "m24-scribble"
        ]
      },
      {
        "id": "a24-dress-helper",
        "title": "ایستگاه لباس",
        "shortDescription": "تمرین پوشیدن با زمان کافی",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE"
        ],
        "goal": "مهارت روزانه",
        "materials": "لباس راحت و چهارپایه ایمن",
        "instructions": [
          "لباس را به ترتیب بچینید.",
          "او شروع کند شما کمک سخت.",
          "مسواک یا شستن دست را بعدش وصل کنید.",
          "ستاره روی جدول تصویری بزنید."
        ],
        "tip": "عکس مراحل روی دیوار کمک بزرگ است.",
        "safety": "چهارپایه پایدار و دور از لبه باشد.",
        "relatedMilestones": [
          "m24-dress",
          "m24-handwash"
        ]
      }
    ],
    "sleep": {
      "overview": "حول ۲ تا ۲.۵ سالگی مقاومت خواب و نیاز به روال خیلی روشن رایج است. خواب کافی خلق و یادگیری را پایدار می‌کند.",
      "routine": [
        {
          "title": "اعلام و تایمر",
          "detail": "از قبل بگویید کی روال خواب شروع می‌شود."
        },
        {
          "title": "مسواک و کتاب",
          "detail": "دو لنگر ثابت روال."
        },
        {
          "title": "چرت یا استراحت آرام",
          "detail": "اگر چرت حذف شد ساعت خواب شب را جلو بیاورید."
        },
        {
          "title": "قانون بیرون آمدن",
          "detail": "بازگرداندن آرام و تکراری."
        },
        {
          "title": "محیط خنک و تاریک",
          "detail": "دمای متعادل و پرده مناسب."
        }
      ],
      "guidance": [
        "یک ساعت قبل خواب بازی هیجانی و شیرینی زیاد را کم کنید.",
        "ترس‌ها را جدی و کوتاه پاسخ دهید.",
        "ثبات بین مراقبان مهم است.",
        "خروپف یا وقفه تنفسی را بررسی کنید."
      ],
      "problems": [
        {
          "id": "s2430-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "برای «دیر خوابیدن»، روال را جلو بیاورید. حدود دو تا سه سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "برای «دیر خوابیدن»، چرت دیر را حذف/کوتاه کنید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «دیر خوابیدن»، صفحه را قطع کنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s2430-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "حدود دو تا سه سالگی برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "حدود دو تا سه سالگی برای «بیدار شدن شب» اقدام کاربردی‌تان «چک ترس و کابوس» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «بیدار شدن شب»، از مذاکره طولانی بپرهیزید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s2430-fear",
          "title": "ترس از تاریکی",
          "guidance": [
            "حدود دو تا سه سالگی برای «ترس از تاریکی» چراغ‌خواب ملایم و ثابت بگذارید تا تاریکی کمتر تهدیدکننده باشد.",
            "برای «ترس از تاریکی»، چک اتاق با هم در روز. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «ترس از تاریکی» ابتدا «جمله امنیتی ثابت» را در عمل بیاورید؛ حدود دو تا سه سالگی روال خواب را ثابت و کم‌محرک نگه دارید."
          ]
        },
        {
          "id": "s2430-nap",
          "title": "درگیری سر چرت",
          "guidance": [
            "حدود دو تا سه سالگی برای «درگیری سر چرت» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "برای «درگیری سر چرت»، اگر شب خیلی دیر شد چرت را نگه دارید. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «درگیری سر چرت»، علائم خستگی را ببینید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "اشتهای متغیر طبیعی است. ساختار، تنوع هفتگی و فضای آرام سفره را حفظ کنید.",
      "priorities": [
        {
          "title": "وعده خانوادگی",
          "detail": "حرف زدن آرام کنار غذا."
        },
        {
          "title": "پروتئین و سبزی در فرم دوستانه",
          "detail": "برش انگشتی و پخت‌های ملایم."
        },
        {
          "title": "محدود کردن شیرین",
          "detail": "شیرینی را پیش‌بینی‌پذیر و کم."
        },
        {
          "title": "آب کافی",
          "detail": "بطری یا لیوان در دسترس در بازی."
        }
      ],
      "guidance": [
        "اجبار مساوی با جنگ طولانی است.",
        "میان‌وعده جایگزین شام نشود.",
        "صفحه هنگام غذا تمرکز و علائم سیری را مختل می‌کند.",
        "رشد را با منحنی پزشک ببینید نه مقایسه فامیل."
      ],
      "problems": [
        {
          "id": "n2430-refuse",
          "title": "بدغذایی",
          "guidance": [
            "حدود دو تا سه سالگی برای «بدغذایی» منوی پایه تکراری داشته باشید و تنوع را آهسته اضافه کنید.",
            "برای «بدغذایی»، غذای جدید بدون هیاهو. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "حدود دو تا سه سالگی برای «بدغذایی» وعده را آرام تمام کنید؛ تهدید غذایی معمولاً نتیجه معکوس دارد."
          ]
        },
        {
          "id": "n2430-veg",
          "title": "سبزیجات",
          "guidance": [
            "حدود دو تا سه سالگی برای «سبزیجات» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "برای «سبزیجات»، با هم شستن. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "حدود دو تا سه سالگی برای «سبزیجات» ارائه را ادامه دهید حتی اگر چند بار رد شد؛ تکرار آرام مهم است."
          ]
        },
        {
          "id": "n2430-snack",
          "title": "میان‌وعده",
          "guidance": [
            "حدود دو تا سه سالگی برای «میان‌وعده» زمان میان‌وعده و غذا را مشخص کنید تا چانه‌زنی کمتر شود.",
            "حدود دو تا سه سالگی برای «میان‌وعده» اقدام کاربردی‌تان «گزینه از پیش آماده‌شده» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «میان‌وعده» ابتدا «حذف خرده‌خوری شیرین» را در عمل بیاورید؛ حدود دو تا سه سالگی بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n2430-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "حدود دو تا سه سالگی برای «طولانی شدن غذا» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "برای «طولانی شدن غذا»، بدون تهدید بازی. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "حدود دو تا سه سالگی برای «طولانی شدن غذا» وعده را آرام تمام کنید و وعده بعدی را سر ساعت همیشگی بگذارید."
          ]
        }
      ]
    },
    "health": {
      "overview": "فعالیت بدنی، گفتار، دندان و آمادگی تدریجی برای کنترل ادرار محور توجه است.",
      "topics": [
        {
          "title": "چکاپ سالانه",
          "detail": "سؤال‌های رفتاری و گفتاری را از قبل بنویسید."
        },
        {
          "title": "دندان",
          "detail": "مسواک دو بار؛ مقدار خمیر مناسب سن. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "توالت",
          "detail": "نشانه‌های آمادگی را بشناسید؛ اجبار نکنید."
        },
        {
          "title": "بازی فعال",
          "detail": "حداقل یک ساعت بازی پرتحرک در روز هدف تقریبی."
        },
        {
          "title": "صفحه نمایش",
          "detail": "محدود، با محتوا کیفی و حضور شما. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        }
      ],
      "guidance": [
        "اگر درک زبان خیلی محدود است ارزیابی بخواهید.",
        "لنگیدن پایدار یا اجتناب از استفاده از یک دست را مطرح کنید.",
        "ایمنی خودرو را با وزن جدید چک کنید.",
        "آفتاب و هیدراتاسیون در بازی بیرون."
      ]
    },
    "behavior": {
      "overview": "قشقرق هنوز ابزار ارتباطی است. پیشگیری با خواب، گرسنگی و اعلام انتقال از واکنش بعد از بحران مهم‌تر است.",
      "situations": [
        {
          "id": "b2430-tantrum",
          "title": "قشقرق",
          "guidance": [
            "حدود دو تا سه سالگی برای «قشقرق» اول محیط و افراد را ایمن کنید؛ آموزش را بعد از آرام شدن بگذارید.",
            "حدود دو تا سه سالگی برای «قشقرق» در اوج هیجان کم حرف بزنید؛ حرف زیاد معمولاً موج را بلندتر می‌کند.",
            "حدود دو تا سه سالگی برای «قشقرق» صدا و محیط را آرام کنید تا تنش سریع‌تر فروکش کند."
          ]
        },
        {
          "id": "b2430-defiance",
          "title": "لجبازی",
          "guidance": [
            "حدود دو تا سه سالگی برای «لجبازی» انتخاب را به دو گزینه قابل‌قبول محدود کنید.",
            "حدود دو تا سه سالگی برای «لجبازی» اقدام کاربردی‌تان «پیگیری یک قانون کلیدی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "حدود دو تا سه سالگی برای «لجبازی» همکاری کوچک را فوری تشویق کنید تا تکرار شود."
          ]
        },
        {
          "id": "b2430-sep",
          "title": "جدایی",
          "guidance": [
            "حدود دو تا سه سالگی برای «جدایی» روال ثابت خداحافظی و بازگشت اضطراب جدایی را کم می‌کند.",
            "حدود دو تا سه سالگی برای «جدایی» شیء آشنای ایمن مثل پتوی کوچک همراهش باشد تا جدایی نرم‌تر شود.",
            "برای «جدایی» ابتدا «بازگشت به‌موقع» را در عمل بیاورید؛ حدود دو تا سه سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b2430-fear",
          "title": "ترس جدید",
          "guidance": [
            "حدود دو تا سه سالگی برای «ترس جدید» بدون قضاوت گوش دهید و احساس را تأیید کنید؛ بعد راه‌حل کوتاه بدهید.",
            "برای «ترس جدید»، نزدیک شدن تدریجی به موقعیت. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «ترس جدید»، اجبار ناگهانی نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b2430-agg",
          "title": "پرخاشگری",
          "guidance": [
            "حدود دو تا سه سالگی برای «پرخاشگری» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "حدود دو تا سه سالگی برای «پرخاشگری» اول دیگران را از آسیب دور کنید، بعد آرام درباره رفتار حرف بزنید.",
            "حدود دو تا سه سالگی برای «پرخاشگری» کلمه یا حرکت جایگزین خشم را یاد بدهید."
          ]
        },
        {
          "id": "b2430-coop",
          "title": "عدم همکاری",
          "guidance": [
            "حدود دو تا سه سالگی برای «عدم همکاری» روی «بازی‌سازی مراحل» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود دو تا سه سالگی برای «عدم همکاری» با تایمر تصویری یا شنی انتقال را قابل‌دیدن کنید.",
            "حدود دو تا سه سالگی برای «عدم همکاری» مراحل را مشترک انجام دهید تا مقاومت کمتر شود."
          ]
        }
      ]
    },
    "safety": {
      "overview": "مهارت باز کردن در و بالا رفتن خطر فرار و سقوط را بیشتر می‌کند.",
      "items": [
        {
          "id": "sf2430-doors",
          "title": "در خروجی",
          "detail": "زنجیر/قفل کودک روی در خیابان. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-windows",
          "title": "پنجره",
          "detail": "قفل و دور کردن اهرم صعود. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-choking",
          "title": "خفگی",
          "detail": "اسباب خواهر/برادر بزرگ‌تر را جدا کنید. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-burns",
          "title": "سوختگی",
          "detail": "کتل و سماور را غیرقابل دسترس کنید. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-water",
          "title": "آب",
          "detail": "نظارت تمام‌وقت. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-meds",
          "title": "دارو",
          "detail": "ویتامین شکری قفل. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf2430-car",
          "title": "خودرو",
          "detail": "صندلی رو به جلو فقط اگر معیار وزن/قد و قانون اجازه دهد."
        },
        {
          "id": "sf2430-outdoor",
          "title": "بیرون",
          "detail": "کلاه ایمنی برای دوچرخه تعادلی. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "30-36",
    "minMonths": 30,
    "maxMonths": 35,
    "title": "۲.۵ تا ۳ سالگی",
    "subtitle": "گفت‌وگوی بیشتر، تخیل و آمادگی برای استقلال روزانه",
    "monthlyFocus": [
      {
        "domain": "LANGUAGE",
        "title": "گفت‌وگوی کوتاه و چرا",
        "summary": "سؤال‌های پیاپی و تعریف تجربه",
        "detail": "چرا پرسیدن خسته‌کننده اما طلایی است. پاسخ کوتاه و گاهی پرسیدن نظر تو چیه گفت‌وگو را زنده نگه می‌دارد."
      },
      {
        "domain": "COGNITIVE",
        "title": "تخیل و پازل",
        "summary": "نقش‌بازی و پازل ساده",
        "detail": "جعبه لباس نقش‌بازی و پازل ۴ تا ۸ تکه تمرکز و انعطاف فکری می‌سازد. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      },
      {
        "domain": "SOCIAL",
        "title": "نوبت و همدلی اولیه",
        "summary": "صبر کوتاه و متوجه شدن ناراحتی دیگران",
        "detail": "بازی‌های نوبتی خیلی کوتاه تمرین کنید. وقتی کسی ناراحت است احساسش را نام ببرید تا مدل همدلی ببیند."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "توالت و لباس",
        "summary": "آمادگی توالت و لباس پوشیدن بیشتر",
        "detail": "نشانه‌های آمادگی مهم‌تر از سن تقویمی است. فشار زیاد مقاومت می‌سازد؛ تشویق آرام بهتر است."
      }
    ],
    "milestones": [
      {
        "id": "m30-converse",
        "domain": "LANGUAGE",
        "title": "گفت‌وگوی کوتاه رفت‌وبرگشتی",
        "description": "چند نوبت حرف می‌زند و گوش می‌دهد."
      },
      {
        "id": "m30-why",
        "domain": "LANGUAGE",
        "title": "پرسیدن چرا/چی",
        "description": "سؤال برای فهمیدن می‌پرسد."
      },
      {
        "id": "m30-balance",
        "domain": "MOTOR",
        "title": "ایستادن کوتاه روی یک پا یا پریدن بهتر",
        "description": "تعادل در حال پیشرفت است."
      },
      {
        "id": "m30-pedal-start",
        "domain": "MOTOR",
        "title": "هل دادن سه‌چرخه یا دوچرخه تعادلی",
        "description": "با پا هل می‌دهد یا تلاش می‌کند."
      },
      {
        "id": "m30-turn-take",
        "domain": "SOCIAL",
        "title": "نوبت کوتاه",
        "description": "در بازی ساده نوبت را با کمک رعایت می‌کند."
      },
      {
        "id": "m30-empathy",
        "domain": "SOCIAL",
        "title": "توجه به ناراحتی دیگری",
        "description": "گاهی نزدیک می‌شود یا می‌گوید ناراحت."
      },
      {
        "id": "m30-puzzle",
        "domain": "COGNITIVE",
        "title": "پازل ساده",
        "description": "پازل چند تکه‌ای را با کمک کامل می‌کند."
      },
      {
        "id": "m30-match",
        "domain": "COGNITIVE",
        "title": "تطبیق تصاویر",
        "description": "تصاویر مشابه را جفت می‌کند."
      },
      {
        "id": "m30-toilet-ready",
        "domain": "INDEPENDENCE",
        "title": "علاقه به توالت یا خشک ماندن طولانی‌تر",
        "description": "نشانه‌های آمادگی دیده می‌شود."
      },
      {
        "id": "m30-coat",
        "domain": "INDEPENDENCE",
        "title": "پوشیدن کاپشن/کفش ساده‌تر",
        "description": "با کمک کم لباس بیرونی را می‌پوشد."
      }
    ],
    "activities": [
      {
        "id": "a30-why-walk",
        "title": "پیاده‌روی چرا",
        "shortDescription": "پاسخ کوتاه به چراهای بیرون",
        "duration": 15,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "COGNITIVE"
        ],
        "goal": "کنجکاوی و واژه",
        "materials": "نیازی نیست",
        "instructions": [
          "بیرون بروید و به یک چیز اشاره کنید.",
          "اگر پرسید چرا پاسخ کوتاه بدهید.",
          "از او بپرسید تو چی فکر می‌کنی؟",
          "۲ تا ۳ چرا کافی است؛ بعد بازی آزاد."
        ],
        "tip": "لازم نیست پاسخ علمی کامل بدهید.",
        "safety": "دست در دست نزدیک خیابان.",
        "relatedMilestones": [
          "m30-why",
          "m30-converse"
        ]
      },
      {
        "id": "a30-role-kitchen",
        "title": "آشپزخانه نقش‌بازی",
        "shortDescription": "پخت وانمودی و پذیرایی",
        "duration": 15,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "تخیل و نوبت",
        "materials": "ظروف اسباب یا ایمن واقعی",
        "instructions": [
          "نقش سرآشپز و مهمان را تقسیم کنید.",
          "سفارش غذا بدهید.",
          "نوبت را عوض کنید.",
          "یک مشکل کوچک بسازید: نمک تموم شد."
        ],
        "tip": "اجازه دهید قوانین بازی کمی مال او باشد.",
        "safety": "وسایل شکستنی و داغ واقعی ندهید.",
        "relatedMilestones": [
          "m30-turn-take",
          "m30-empathy"
        ]
      },
      {
        "id": "a30-puzzle",
        "title": "پازل مشارکتی",
        "shortDescription": "کامل کردن پازل ساده",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "حل مسئله و پشتکار",
        "materials": "پازل ۴ تا ۸ تکه",
        "instructions": [
          "گوشه‌ها را جدا کنید.",
          "یک تکه سخت را راهنمایی کنید نه جاگذاری کامل.",
          "تشویق تلاش.",
          "عکس کامل را نشان دهید اگر گیر کرد."
        ],
        "tip": "پازل خیلی سخت ناامیدی می‌آورد.",
        "safety": "قطعه‌های خیلی کوچک برای این سن مناسب نیست.",
        "relatedMilestones": [
          "m30-puzzle",
          "m30-match"
        ]
      },
      {
        "id": "a30-toilet-book",
        "title": "کتاب توالت",
        "shortDescription": "آشنایی بدون فشار",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE",
          "LANGUAGE"
        ],
        "goal": "آمادگی توالت",
        "materials": "کتاب تصویری مرتبط",
        "instructions": [
          "کتاب را با هم بخوانید.",
          "توالت را نشان دهید و نام ببرید.",
          "اگر خواست روی لگن/توالت با لباس بنشیند اجازه دهید.",
          "موفقیت کوچک را تشویق کنید نه تنبیه حادثه."
        ],
        "tip": "اگر مقاوم است هفته‌ها صبر کردن بهتر از اجبار است.",
        "safety": "مواد شوینده سرویس را قفل کنید.",
        "relatedMilestones": [
          "m30-toilet-ready"
        ]
      },
      {
        "id": "a30-balance-bike",
        "title": "دوچرخه تعادلی/هل‌دادنی",
        "shortDescription": "تمرین تعادل در فضای باز",
        "duration": 15,
        "difficulty": "medium",
        "domains": [
          "MOTOR"
        ],
        "goal": "تعادل و اعتماد حرکتی",
        "materials": "دوچرخه تعادلی یا سه‌چرخه و کلاه",
        "instructions": [
          "کلاه بگذارید.",
          "سطح صاف انتخاب کنید.",
          "هل دادن با پا را مدل کنید.",
          "توقف و مراقبت از دیگران را بگویید."
        ],
        "tip": "هدف سرعت نیست.",
        "safety": "نزدیک خیابان بدون مانع فیزیکی نروید.",
        "relatedMilestones": [
          "m30-balance",
          "m30-pedal-start"
        ]
      }
    ],
    "sleep": {
      "overview": "بسیاری از کودکان این سن بدون چرت یا با چرت کوتاه هستند. اگر چرت حذف شد خواب شب باید جبران کند.",
      "routine": [
        {
          "title": "ساعت خواب جلوتر",
          "detail": "با حذف چرت اغلب نیاز به شب زودتر دارید."
        },
        {
          "title": "روال بدون مذاکره طولانی",
          "detail": "انتخاب محدود داخل روال: کدام کتاب؟"
        },
        {
          "title": "آرام‌سازی بدن",
          "detail": "کشش ملایم یا تنفس بازی‌وار."
        },
        {
          "title": "محیط ثابت",
          "detail": "چراغ خواب و اسباب خواب آشنا."
        }
      ],
      "guidance": [
        "کابوس ممکن است ظاهر شود؛ حضور آرام کافی است.",
        "صفحه هیجانی شب را حذف کنید.",
        "اگر خروپف شدید یا تنفس سخت دارید بررسی پزشکی کنید.",
        "ایمنی تخت و اتاق را با بالا رفتن دوباره چک کنید."
      ],
      "problems": [
        {
          "id": "s3036-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "حدود دو تا سه سالگی برای «دیر خوابیدن» چرت خیلی دیر عصر را کوتاه یا زودتر کنید.",
            "حدود دو تا سه سالگی برای «دیر خوابیدن» روال خواب را کمی زودتر شروع کنید تا قبل از خستگی شدید بخوابد.",
            "حدود دو تا سه سالگی برای «دیر خوابیدن» روال خواب را مهربان اما قاطع تمام کنید و وارد چانه‌زنی طولانی نشوید."
          ]
        },
        {
          "id": "s3036-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "حدود دو تا سه سالگی برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "حدود دو تا سه سالگی برای «بیدار شدن شب» اگر از کابوس بیدار شد با نور کم آرام بمانید و دوباره به تخت برگردانید.",
            "برای «بیدار شدن شب»، برنگرداندن عادت نوشیدنی شیرین شب. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s3036-fear",
          "title": "ترس",
          "guidance": [
            "حدود دو تا سه سالگی برای «ترس» چراغ‌خواب ملایم و ثابت بگذارید تا تاریکی کمتر تهدیدکننده باشد.",
            "حدود دو تا سه سالگی برای «ترس» گفت‌وگوی کوتاه روزانه درباره نگرانی‌ها کمک می‌کند شب‌ها کمتر انباشته شوند.",
            "برای «ترس»، اجبار به تنهایی طولانی در تاریکی نکنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s3036-stall",
          "title": "بهانه‌گیری قبل خواب",
          "guidance": [
            "برای «بهانه‌گیری قبل خواب»، یک بهانه از پیش تأییدشده. حدود دو تا سه سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود دو تا سه سالگی برای «بهانه‌گیری قبل خواب» بهانه‌های بعد از پایان روال را کوتاه پاسخ دهید و به روال برگردید.",
            "حدود دو تا سه سالگی برای «بهانه‌گیری قبل خواب» آرامش شما الگو است؛ عجله یا عصبانیت بهانه را بیشتر می‌کند."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "مشارکت در آماده‌سازی میل را بیشتر می‌کند. تنوع را حفظ و فشار را کم کنید.",
      "priorities": [
        {
          "title": "آشپزی ساده با کودک",
          "detail": "شستن، مخلوط کردن، چیدن."
        },
        {
          "title": "صبحانه پایدار",
          "detail": "انرژی شروع روز."
        },
        {
          "title": "میان‌وعده مغذی",
          "detail": "ترکیب کربوهیدرات و پروتئین."
        },
        {
          "title": "الگوی والدین",
          "detail": "همان چیزی که می‌خواهید او بخورد."
        }
      ],
      "guidance": [
        "رژیم سخت یا برچسب بدخور نزنید.",
        "آبمیوه را محدود کنید.",
        "وعده را با تهدید اسباب‌بازی گره نزنید.",
        "اگر نگران وزن/قد هستید با پزشک نه با محدودیت خودسرانه پیش بروید."
      ],
      "problems": [
        {
          "id": "n3036-refuse",
          "title": "بدغذایی",
          "guidance": [
            "حدود دو تا سه سالگی برای «بدغذایی» غذا را بدون اصرار ارائه دهید؛ فشار زیاد اشتها را کم می‌کند.",
            "حدود دو تا سه سالگی برای «بدغذایی» منوی خانواده را با بافت مناسب سن ارائه دهید.",
            "برای «بدغذایی»، بدون جنگ. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n3036-veg",
          "title": "سبزیجات",
          "guidance": [
            "برای «سبزیجات»، کاشت یا خرید با هم. حدود دو تا سه سالگی این کار را با ثبات و آرامش تکرار کنید.",
            "حدود دو تا سه سالگی برای «سبزیجات» اقدام کاربردی‌تان «فرم‌های مختلف» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "حدود دو تا سه سالگی برای «سبزیجات» سبزی را با دیپ ساده مثل ماست همراه کنید تا امتحان آسان‌تر شود."
          ]
        },
        {
          "id": "n3036-snack",
          "title": "میان‌وعده",
          "guidance": [
            "حدود دو تا سه سالگی برای «میان‌وعده» از قبل کوتاه درباره موقعیت حرف بزنید و قدم خیلی کوچک تمرین کنید.",
            "حدود دو تا سه سالگی برای «میان‌وعده» اقدام کاربردی‌تان «قانون آشپزخانه» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «میان‌وعده» ابتدا «جایگزین شیرین محدود» را در عمل بیاورید؛ حدود دو تا سه سالگی بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n3036-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "حدود دو تا سه سالگی برای «طولانی شدن غذا» زمان معقولی برای وعده بگذارید و بعد بدون دعوا سفره را جمع کنید.",
            "حدود دو تا سه سالگی برای «طولانی شدن غذا» وقتی زمان وعده تمام شد با آرامش سفره را جمع کنید.",
            "برای «طولانی شدن غذا»، گرسنگی تا وعده بعد. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "گفتار واضح‌تر، مهارت اجتماعی و آمادگی توالت موضوع‌های رایج این بازه‌اند.",
      "topics": [
        {
          "title": "گفتار قابل فهم",
          "detail": "اگر اطرافیان غیرآشنا خیلی کم می‌فهمند در چکاپ بگویید."
        },
        {
          "title": "بینایی و شنوایی",
          "detail": "نشستن نزدیک تلویزیون یا بلند کردن صدا را جدی بگیرید."
        },
        {
          "title": "توالت",
          "detail": "روال بعد از وعده و قبل خواب مفید است وقتی آماده است."
        },
        {
          "title": "حرکت",
          "detail": "پارک و بازی آزاد روزانه. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "دندان",
          "detail": "مسواک با نظارت؛ نخ دندان با راهنمایی دندان‌پزشک."
        }
      ],
      "guidance": [
        "پسرفت زبانی یا اجتماعی را سریع مطرح کنید.",
        "از داروهای سرما بدون مشورت تکراری پرهیز کنید.",
        "کلاه ایمنی دوچرخه غیرقابل مذاکره باشد.",
        "ضدآفتاب و آب در بیرون."
      ]
    },
    "behavior": {
      "overview": "تخیل قوی می‌تواند ترس و بازی قدرتی بسازد. مرز روشن + بازی قدرتی مجاز در زمان مناسب تعادل خوبی است.",
      "situations": [
        {
          "id": "b3036-tantrum",
          "title": "قشقرق",
          "guidance": [
            "حدود دو تا سه سالگی برای «قشقرق» خستگی و گرسنگی را قبل از موقعیت سخت کم کنید و انتقال را اعلام کنید.",
            "حدود دو تا سه سالگی برای «قشقرق» با حضور آرام و کم‌حرف کنارش بمانید تا موج هیجان فروکش کند.",
            "برای «قشقرق» ابتدا «بازسازی اتصال» را در عمل بیاورید؛ حدود دو تا سه سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b3036-defiance",
          "title": "لجبازی",
          "guidance": [
            "حدود دو تا سه سالگی برای «لجبازی» بین دو انتخاب قابل‌قبول بگذارید تا همکاری بیشتر و لج کمتر شود.",
            "حدود دو تا سه سالگی برای «لجبازی» بعد از آرام شدن کوتاه پیگیری کنید: چه احساسی بود و چه کار دیگری می‌شود کرد.",
            "حدود دو تا سه سالگی برای «لجبازی» همکاری کوچک را فوری و مشخص تشویق کنید."
          ]
        },
        {
          "id": "b3036-sep",
          "title": "جدایی",
          "guidance": [
            "حدود دو تا سه سالگی برای «جدایی» روی «داستان اجتماعی» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود دو تا سه سالگی برای «جدایی» جدایی‌های خیلی کوتاه و موفق تمرین کنید و با بازگشت قابل‌اعتماد تمام کنید.",
            "حدود دو تا سه سالگی برای «جدایی» تا حد ممکن مراقب آشنا داشته باشید؛ تغییر ناگهانی اضطراب را بالا می‌برد."
          ]
        },
        {
          "id": "b3036-fear",
          "title": "ترس خیالی",
          "guidance": [
            "حدود دو تا سه سالگی برای «ترس خیالی» ترس را معتبر بدانید و قدم‌های خیلی کوچک برای روبه‌رو شدن بسازید.",
            "برای «ترس خیالی»، قدرت‌بخشی با چراغ/افشانه خیالی آب. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "حدود دو تا سه سالگی برای «ترس خیالی» او را مجبور به روبه‌رو شدن ناگهانی نکنید؛ قدم‌های خیلی کوچک با همراهی شما بهتر است."
          ]
        },
        {
          "id": "b3036-agg",
          "title": "پرخاشگری",
          "guidance": [
            "حدود دو تا سه سالگی برای «پرخاشگری» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "حدود دو تا سه سالگی برای «پرخاشگری» اقدام کاربردی‌تان «جداسازی کوتاه» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «پرخاشگری» ابتدا «تمرین دست لطیف» را در عمل بیاورید؛ حدود دو تا سه سالگی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b3036-peer",
          "title": "ارتباط با کودکان",
          "guidance": [
            "حدود دو تا سه سالگی برای «ارتباط با کودکان» روی «بازی کوتاه موازی» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "حدود دو تا سه سالگی برای «ارتباط با کودکان» برای بازی مشترک اسباب کافی یا نسخه مشابه بگذارید.",
            "برای «ارتباط با کودکان»، مدل کلمات قرض بده/صبر کن. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "باز کردن قفل‌ها و تقلید کارهای بزرگسال خطرهای تازه‌ای می‌سازد.",
      "items": [
        {
          "id": "sf3036-meds",
          "title": "دارو",
          "detail": "حتی دارو در کیف مهمان. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-cleaning",
          "title": "شوینده",
          "detail": "کپسول‌های رنگی را قفل کنید. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-windows",
          "title": "پنجره",
          "detail": "مبل زیر پنجره نچینید. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-water",
          "title": "آب",
          "detail": "استخر و سطل. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-car",
          "title": "خودرو",
          "detail": "پیاده شدن سمت پیاده‌رو. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-outdoor",
          "title": "خیابان",
          "detail": "قانون دست قبل از جاده. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-burns",
          "title": "آشپزخانه",
          "detail": "منطقه قرمز نزدیک گاز. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3036-pets",
          "title": "حیوان",
          "detail": "احترام به فضای حیوان. حدود دو تا سه سالگی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "36-48",
    "minMonths": 36,
    "maxMonths": 47,
    "title": "۳ تا ۴ سالگی",
    "subtitle": "گفت‌وگوی دوطرفه، دوستی و مهارت‌های پیش‌مهد",
    "monthlyFocus": [
      {
        "domain": "LANGUAGE",
        "title": "گفت‌وگوی واقعی",
        "summary": "تعریف تجربه و پرسیدن سؤال",
        "detail": "هر روز یک زمان کوتاه بدون صفحه برای تعریف کردن روز بگذارید. سؤال‌های باز بهتر از آزمون سخت‌گیرانه است."
      },
      {
        "domain": "SOCIAL",
        "title": "دوستی و نوبت",
        "summary": "بازی با دیگران و حل اختلاف ساده",
        "detail": "قبل از پارک دو قانون بگویید: دست ملایم و صبر. بعد بازی یک موفقیت اجتماعی را نام ببرید."
      },
      {
        "domain": "COGNITIVE",
        "title": "شمارش و حل مسئله",
        "summary": "شمارش در زندگی واقعی و پازل",
        "detail": "شمارش پله‌ها، قاشق‌ها و دکمه‌ها یادگیری را طبیعی می‌کند. پازل و بازی جورکردنی تمرکز را می‌سازد."
      },
      {
        "domain": "INDEPENDENCE",
        "title": "لباس و مسئولیت کوچک",
        "summary": "پوشیدن بیشتر و کمک‌های خانگی",
        "detail": "مسئولیت‌هایی مثل گذاشتن لباس در سبد هم عزت‌نفس می‌سازد هم همکاری. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m36-conversation",
        "domain": "LANGUAGE",
        "title": "گفت‌وگوی رفت‌وبرگشتی",
        "description": "چند نوبت درباره یک موضوع حرف می‌زند."
      },
      {
        "id": "m36-question",
        "domain": "LANGUAGE",
        "title": "پرسیدن سؤال",
        "description": "چرا و چی را برای فهمیدن می‌پرسد."
      },
      {
        "id": "m36-story",
        "domain": "LANGUAGE",
        "title": "تعریف کوتاه یک اتفاق",
        "description": "رویداد ساده را با ابتدا و انتها تقریبی می‌گوید."
      },
      {
        "id": "m36-run",
        "domain": "MOTOR",
        "title": "دویدن روان",
        "description": "با کنترل بهتر می‌دود و می‌ایستد."
      },
      {
        "id": "m36-jump",
        "domain": "MOTOR",
        "title": "پریدن و تعادل کوتاه",
        "description": "می‌پرد و برای لحظاتی تعادل دارد."
      },
      {
        "id": "m36-play",
        "domain": "SOCIAL",
        "title": "بازی با دیگران",
        "description": "بازی مشترک کوتاه با همسال دارد."
      },
      {
        "id": "m36-share",
        "domain": "SOCIAL",
        "title": "تلاش برای شریک شدن",
        "description": "با کمک اسباب را شریک می‌شود یا نوبت می‌دهد."
      },
      {
        "id": "m36-problem",
        "domain": "COGNITIVE",
        "title": "حل مسئله ساده",
        "description": "برای مشکل کوچک راه‌حل امتحان می‌کند."
      },
      {
        "id": "m36-count",
        "domain": "COGNITIVE",
        "title": "شمارش ساده",
        "description": "تا چند عدد را در بافت واقعی می‌شمارد."
      },
      {
        "id": "m36-dress",
        "domain": "INDEPENDENCE",
        "title": "پوشیدن بخش زیادی از لباس",
        "description": "بیشتر لباس‌ها را با کمک کم می‌پوشد."
      },
      {
        "id": "m36-toilet",
        "domain": "INDEPENDENCE",
        "title": "پیشرفت توالت در روز",
        "description": "بسیاری در روز خشک‌تر می‌مانند؛ شب ممکن است طول بکشد."
      }
    ],
    "activities": [
      {
        "id": "a36-colors",
        "title": "بازی پیدا کردن رنگ‌ها",
        "shortDescription": "شکار رنگ با نام‌بردن",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "COGNITIVE"
        ],
        "goal": "تقویت زبان و شناخت",
        "materials": "۳ وسیله رنگی",
        "instructions": [
          "سه وسیله را مقابل کودک بگذارید.",
          "یک رنگ را نام ببرید.",
          "از او بخواهید پیدا کند.",
          "سپس از او بخواهید رنگ را بگوید.",
          "نوبت او برای دستور دادن به شما."
        ],
        "tip": "اگر علاقه نداشت کوتاه‌تر کنید.",
        "safety": "از اشیای کوچک خطر بلع استفاده نکنید.",
        "relatedMilestones": [
          "m36-count",
          "m36-problem"
        ]
      },
      {
        "id": "a36-story",
        "title": "داستان تصویری",
        "shortDescription": "تعریف احساس شخصیت داستان",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "روایت و همدلی",
        "materials": "کتاب تصویری",
        "instructions": [
          "صفحه را با هم ببینید.",
          "بپرسید چه احساسی دارد؟",
          "از او بخواهید ادامه را بگوید.",
          "کلمه درست را مدل کنید نه تمسخر تلفظ."
        ],
        "tip": "اشتباه تلفظ را با تکرار درست پاسخ دهید.",
        "safety": "جایگزین کامل کتاب با صفحه نمایش نشود.",
        "relatedMilestones": [
          "m36-conversation",
          "m36-story",
          "m36-question"
        ]
      },
      {
        "id": "a36-ball",
        "title": "توپ‌بازی با قانون نوبت",
        "shortDescription": "پرتاب و گرفتن ساده",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR",
          "SOCIAL"
        ],
        "goal": "هماهنگی و نوبت",
        "materials": "توپ سبک",
        "instructions": [
          "قانون نوبت را بگویید.",
          "پرتاب آرام کنید.",
          "بعد از چند دقیقه بازی آزاد.",
          "یک موفقیت اجتماعی را نام ببرید."
        ],
        "tip": "در فضای باز یا اتاق خلوت.",
        "safety": "توپ سفت و سنگین نه.",
        "relatedMilestones": [
          "m36-run",
          "m36-jump",
          "m36-share"
        ]
      },
      {
        "id": "a36-helper",
        "title": "کار کمک‌خانه",
        "shortDescription": "چیدن قاشق یا آبیاری گل",
        "duration": 10,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE",
          "COGNITIVE"
        ],
        "goal": "مسئولیت و شمارش",
        "materials": "قاشق یا آبپاش کوچک",
        "instructions": [
          "کار را واضح بگویید.",
          "با هم شروع کنید.",
          "او ادامه دهد.",
          "تشکر مشخص بگویید."
        ],
        "tip": "کار باید واقعاً مفید و ایمن باشد.",
        "safety": "مواد شیمیایی و آب جوش دور باشد.",
        "relatedMilestones": [
          "m36-dress",
          "m36-count"
        ]
      },
      {
        "id": "a36-board",
        "title": "بازی رومیزی خیلی ساده",
        "shortDescription": "تاس و حرکت با کمک",
        "duration": 15,
        "difficulty": "medium",
        "domains": [
          "SOCIAL",
          "COGNITIVE"
        ],
        "goal": "صبر و قانون بازی",
        "materials": "بازی رومیزی ساده سنی",
        "instructions": [
          "قانون را در یک جمله بگویید.",
          "نوبت‌ها را کوتاه نگه دارید.",
          "برد و باخت را ملایم مدل کنید.",
          "اگر ناراحت شد بازی را با احترام تمام کنید."
        ],
        "tip": "هدف بردن شما نیست؛ تمرین صبر است.",
        "safety": "قطعات ریز را بعد بازی جمع کنید.",
        "relatedMilestones": [
          "m36-play",
          "m36-share",
          "m36-problem"
        ]
      }
    ],
    "sleep": {
      "overview": "خواب شبانه منظم برای تنظیم هیجان ۳ تا ۴ ساله‌ها حیاتی است. بهانه‌گیری قبل خواب رایج است.",
      "routine": [
        {
          "title": "انتخاب داخل روال",
          "detail": "کدام پیژامه/کدام کتاب."
        },
        {
          "title": "مسواک و قصه",
          "detail": "ثابت بمانند."
        },
        {
          "title": "خاموشی صفحه",
          "detail": "حداقل یک ساعت قبل."
        },
        {
          "title": "ساعت خواب پایدار",
          "detail": "شب‌های تعطیل هم نزدیک همان ساعت."
        },
        {
          "title": "چراغ خواب در صورت نیاز",
          "detail": "ترس را جدی بگیرید."
        }
      ],
      "guidance": [
        "کابوس را با حضور آرام جواب دهید.",
        "اگر خروپف یا وقفه تنفسی هست بررسی کنید.",
        "مصرف کافئین پنهان در شکلات عصر را کم کنید.",
        "اتاق مرتب و اسباب هیجانی کمتر نزدیک تخت."
      ],
      "problems": [
        {
          "id": "s3648-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "در سن پیش‌دبستانی برای «دیر خوابیدن» تایمر تصویری نشان دهد چقدر تا پایان بازی یا شروع خواب مانده.",
            "در سن پیش‌دبستانی برای «دیر خوابیدن» چرت خیلی دیر عصر را کوتاه یا زودتر کنید.",
            "در سن پیش‌دبستانی برای «دیر خوابیدن» روال خواب را مهربان اما قاطع تمام کنید و وارد چانه‌زنی طولانی نشوید."
          ]
        },
        {
          "id": "s3648-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "در سن پیش‌دبستانی برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "در سن پیش‌دبستانی برای «بیدار شدن شب» اقدام کاربردی‌تان «برنگرداندن عادت نوشیدنی شیرین» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "در سن پیش‌دبستانی برای «بیدار شدن شب» اگر از کابوس بیدار شد با نور کم آرام بمانید و دوباره به تخت برگردانید."
          ]
        },
        {
          "id": "s3648-fear",
          "title": "ترس",
          "guidance": [
            "در سن پیش‌دبستانی برای «ترس» گفت‌وگوی کوتاه روزانه درباره نگرانی‌ها کمک می‌کند شب‌ها کمتر انباشته شوند.",
            "در سن پیش‌دبستانی برای «ترس» چراغ‌خواب ملایم و ثابت بگذارید تا تاریکی کمتر تهدیدکننده باشد.",
            "برای «ترس» ابتدا «تشریفات امنیت کوتاه» را در عمل بیاورید؛ در سن پیش‌دبستانی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "s3648-stall",
          "title": "بهانه‌گیری",
          "guidance": [
            "برای «بهانه‌گیری»، یک درخواست آخر از پیش‌تعیین‌شده. در سن پیش‌دبستانی این کار را با ثبات و آرامش تکرار کنید.",
            "در سن پیش‌دبستانی برای «بهانه‌گیری» بهانه‌های بعد از پایان روال را کوتاه پاسخ دهید و به روال برگردید.",
            "برای «بهانه‌گیری» ابتدا «ثبات بین والدین» را در عمل بیاورید؛ در سن پیش‌دبستانی با صبوری و ثبات پیش بروید."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "کودک در انتخاب مشارکت می‌کند اما والد منوی کلی را می‌سازد. سفره بدون جنگ هدف است.",
      "priorities": [
        {
          "title": "منوی خانواده",
          "detail": "یک غذا با انتخاب کوچک داخل آن."
        },
        {
          "title": "صبحانه و میان‌وعده مدرسه/مهد",
          "detail": "آماده‌سازی شب قبل."
        },
        {
          "title": "سبزی و میوه دیده‌شدنی",
          "detail": "در دسترس چشم."
        },
        {
          "title": "آب به‌جای نوشابه",
          "detail": "قانون خانه."
        }
      ],
      "guidance": [
        "برچسب بدخور نزنید.",
        "تنقلات بازاری را قانون‌مند کنید.",
        "اجبار به تمام کردن لازم نیست.",
        "الگوی شما از سخنرانی قوی‌تر است."
      ],
      "problems": [
        {
          "id": "n3648-refuse",
          "title": "بدغذایی",
          "guidance": [
            "در سن پیش‌دبستانی برای «بدغذایی» همان غذا را در روزهای مختلف دوباره ارائه دهید؛ آشنایی تدریجی پذیرش را بالا می‌برد.",
            "برای «بدغذایی»، بدون جایگزین فوری محبوب همیشه. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "در سن پیش‌دبستانی برای «بدغذایی» سفره را بدون فشار نگه دارید تا ارتباط با غذا مثبت بماند."
          ]
        },
        {
          "id": "n3648-veg",
          "title": "سبزیجات",
          "guidance": [
            "برای «سبزیجات»، انتخاب در خرید. در سن پیش‌دبستانی این کار را با ثبات و آرامش تکرار کنید.",
            "در سن پیش‌دبستانی برای «سبزیجات» سبزی را انگشتی و نرم بدهید تا خودش بتواند کشف کند.",
            "برای «سبزیجات» ابتدا «همراه سس ساده» را در عمل بیاورید؛ در سن پیش‌دبستانی بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n3648-snack",
          "title": "میان‌وعده",
          "guidance": [
            "در سن پیش‌دبستانی برای «میان‌وعده» روی «جعبه میان‌وعده از پیش» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در سن پیش‌دبستانی برای «میان‌وعده» میان‌وعده را ساعت ثابت بگذارید تا اشتهای وعده اصلی حفظ شود.",
            "برای «میان‌وعده» ابتدا «شیرینی مناسبت‌محور» را در عمل بیاورید؛ در سن پیش‌دبستانی بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n3648-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "در سن پیش‌دبستانی برای «طولانی شدن غذا» زمان معقولی برای وعده بگذارید و بعد بدون دعوا سفره را جمع کنید.",
            "در سن پیش‌دبستانی برای «طولانی شدن غذا» با جمله ثابت و مهربانانه فعالیت را تمام کنید و به مرحله بعد بروید.",
            "در سن پیش‌دبستانی برای «طولانی شدن غذا» وعده را آرام تمام کنید و وعده بعدی را سر ساعت همیشگی بگذارید."
          ]
        }
      ]
    },
    "health": {
      "overview": "آمادگی مهد، واکسن‌های یادآوری، بینایی/شنوایی و مهارت اجتماعی را مرور کنید.",
      "topics": [
        {
          "title": "چکاپ و واکسن",
          "detail": "یادآوری‌ها را عقب نیندازید. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "مهارت مهد",
          "detail": "باز کردن زیپ، دست شستن، گفتن نیاز به کمک."
        },
        {
          "title": "فعالیت بدنی",
          "detail": "بازی آزاد روزانه. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "دندان",
          "detail": "مراجعه دوره‌ای. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "خواب و خلق",
          "detail": "کم‌خوابی را در رفتار ببینید. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        }
      ],
      "guidance": [
        "اگر بازی تخیلی هیچ‌وقت دیده نمی‌شود یا ارتباط خیلی محدود است مطرح کنید.",
        "ترس شدید جدا نشدن از منزل را با صبر و در صورت نیاز متخصص پیش ببرید.",
        "ایمنی خیابان را بارها تمرین کنید.",
        "ضدآفتاب و کلاه."
      ]
    },
    "behavior": {
      "overview": "۳ ساله‌ها می‌توانند قانون را بفهمند اما هیجان هنوز پیروز می‌شود. تمرین کوتاه بهتر از سخنرانی بلند است.",
      "situations": [
        {
          "id": "b3648-tantrum",
          "title": "قشقرق",
          "guidance": [
            "در سن پیش‌دبستانی برای «قشقرق» خستگی و گرسنگی را قبل از موقعیت سخت کم کنید و انتقال را اعلام کنید.",
            "در سن پیش‌دبستانی برای «قشقرق» گوشه آرامی برای برگشت به آرامش داشته باشید؛ این تنبیه نیست.",
            "برای «قشقرق» ابتدا «بازگشت اتصال و قانون» را در عمل بیاورید؛ در سن پیش‌دبستانی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b3648-defiance",
          "title": "لجبازی",
          "guidance": [
            "در سن پیش‌دبستانی برای «لجبازی» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "در سن پیش‌دبستانی برای «لجبازی» اقدام کاربردی‌تان «پیگیری یک موضوع» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "در سن پیش‌دبستانی برای «لجبازی» همکاری کوچک را فوری تشویق کنید تا تکرار شود."
          ]
        },
        {
          "id": "b3648-sep",
          "title": "جدایی مهد",
          "guidance": [
            "در سن پیش‌دبستانی برای «جدایی مهد» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند.",
            "در سن پیش‌دبستانی برای «جدایی مهد» تا حد ممکن مراقب آشنا داشته باشید؛ تغییر ناگهانی اضطراب را بالا می‌برد.",
            "برای «جدایی مهد» ابتدا «عکس خانواده در کیف» را در عمل بیاورید؛ در سن پیش‌دبستانی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b3648-fear",
          "title": "ترس",
          "guidance": [
            "در سن پیش‌دبستانی برای «ترس» احساس او را جدی بگیرید و نام ببرید؛ اجبار به بی‌خیالی معمولاً ترس را بیشتر می‌کند.",
            "در سن پیش‌دبستانی برای «ترس» اقدام کاربردی‌تان «نزدیک شدن پلکانی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «ترس» ابتدا «کتاب درباره موضوع» را در عمل بیاورید؛ در سن پیش‌دبستانی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b3648-agg",
          "title": "پرخاشگری",
          "guidance": [
            "در سن پیش‌دبستانی برای «پرخاشگری» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "در سن پیش‌دبستانی برای «پرخاشگری» پیامد منطقی کوتاه و مرتبط بگذارید، نه شرمساری طولانی.",
            "در سن پیش‌دبستانی برای «پرخاشگری» بعد از آرام شدن، جبران ساده مثل عذرخواهی کوتاه یا کمک به جمع‌کردن را حمایت کنید."
          ]
        },
        {
          "id": "b3648-peer",
          "title": "دعوا سر اسباب",
          "guidance": [
            "در سن پیش‌دبستانی برای «دعوا سر اسباب» با تایمر کوتاه نوبت را مشخص کنید تا دعوا سر اسباب کمتر شود.",
            "در سن پیش‌دبستانی برای «دعوا سر اسباب» کلمات آماده مثل «نوبت منه» تمرین کنید تا در دعوا استفاده شود.",
            "برای «دعوا سر اسباب» ابتدا «مداخله بزرگسال به‌اندازه» را در عمل بیاورید؛ در سن پیش‌دبستانی احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "استقلال بیشتر یعنی آموزش قوانین خیابان، آب و غریبه‌ها همراه ایمن‌سازی خانه.",
      "items": [
        {
          "id": "sf3648-street",
          "title": "خیابان",
          "detail": "دست قبل از جاده؛ توقف لب پیاده‌رو. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-water",
          "title": "آب",
          "detail": "شنا بدون شناور ناظر معنا ندارد. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-car",
          "title": "خودرو",
          "detail": "خودش باز کردن کمربند را فقط وقتی ماشین خاموش و ایمن است."
        },
        {
          "id": "sf3648-meds",
          "title": "دارو",
          "detail": "هنوز کاملاً قفل. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-cleaning",
          "title": "شوینده",
          "detail": "زیرسینک قفل. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-windows",
          "title": "پنجره و بالکن",
          "detail": "قفل کودک. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-outdoor",
          "title": "پارک",
          "detail": "توافق محل بازی و زمان چک. در سن پیش‌دبستانی این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf3648-stranger",
          "title": "غریبه",
          "detail": "قانون کمک از فروشنده/مامان‌های آشنا نه رفتن با غریبه."
        }
      ]
    }
  },
  {
    "id": "48-60",
    "minMonths": 48,
    "maxMonths": 59,
    "title": "۴ تا ۵ سالگی",
    "subtitle": "داستان‌گویی، دوستی و آمادگی پیش‌دبستانی",
    "monthlyFocus": [
      {
        "domain": "COGNITIVE",
        "title": "تمرکز و آمادگی یادگیری",
        "summary": "قصه، شمارش و بازی‌های فکری کوتاه",
        "detail": "بازی‌های رومیزی کوتاه و کتاب‌های طولانی‌تر توجه را رشد می‌دهند. تشویق پشتکار مهم‌تر از نتیجه بی‌نقص است."
      },
      {
        "domain": "SOCIAL",
        "title": "دوستی و همدلی",
        "summary": "بازی گروهی و فهم احساس دیگران",
        "detail": "بعد از بازی بپرسید دوستت چه حسی داشت. نقش‌بازی مغازه یا مدرسه تمرین اجتماعی عالی است."
      },
      {
        "domain": "LANGUAGE",
        "title": "داستان با ابتدا و انتها",
        "summary": "تعریف رویداد با جزئیات بیشتر",
        "detail": "از او بخواهید سه بخش بگوید: اول، بعد، آخر. شما فقط داربست بدهید نه داستان کامل. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      },
      {
        "domain": "MOTOR",
        "title": "مهارت ظریف و درشت",
        "summary": "قیچی ایمن، نقاشی و بازی ورزشی سبک",
        "detail": "بریدن کاغذ با قیچی کودکانه تحت نظارت و پرتاب/گرفتن توپ هماهنگی را بالا می‌برد. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m48-story",
        "domain": "LANGUAGE",
        "title": "تعریف داستان با ابتدا و انتها",
        "description": "رویداد را با ترتیب تقریبی تعریف می‌کند."
      },
      {
        "id": "m48-listen",
        "domain": "LANGUAGE",
        "title": "گوش دادن به دستور چند بخشی ساده",
        "description": "دو مرحله ساده را دنبال می‌کند."
      },
      {
        "id": "m48-friend",
        "domain": "SOCIAL",
        "title": "بازی مشارکتی با دوست",
        "description": "بازی با هدف مشترک کوتاه دارد."
      },
      {
        "id": "m48-rules",
        "domain": "SOCIAL",
        "title": "رعایت قانون ساده بازی",
        "description": "قانون آشنا را با یادآوری رعایت می‌کند."
      },
      {
        "id": "m48-draw",
        "domain": "COGNITIVE",
        "title": "کشیدن شکل قابل تشخیص",
        "description": "آدم یا شکل ساده قابل فهم می‌کشد."
      },
      {
        "id": "m48-letters",
        "domain": "COGNITIVE",
        "title": "تشخیص بعضی حروف یا اعداد",
        "description": "برخی نمادهای آشنا را می‌شناسد."
      },
      {
        "id": "m48-balance",
        "domain": "MOTOR",
        "title": "ایستادن روی یک پا چند ثانیه",
        "description": "تعادل یک‌پایی کوتاه دارد."
      },
      {
        "id": "m48-scissors",
        "domain": "MOTOR",
        "title": "بریدن با قیچی کودکانه",
        "description": "تحت نظارت خط ساده را می‌برد."
      },
      {
        "id": "m48-help",
        "domain": "INDEPENDENCE",
        "title": "کمک در کارهای خانه",
        "description": "کارهای ساده را با کمترین یادآوری انجام می‌دهد."
      },
      {
        "id": "m48-hygiene",
        "domain": "INDEPENDENCE",
        "title": "بهداشت شخصی بیشتر",
        "description": "دست شستن و کمک در حمام/لباس را بهتر انجام می‌دهد."
      }
    ],
    "activities": [
      {
        "id": "a48-puzzle",
        "title": "پازل ۱۰ تا ۲۰ تکه",
        "shortDescription": "حل مشارکتی پازل",
        "duration": 15,
        "difficulty": "medium",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "حل مسئله و پشتکار",
        "materials": "پازل مناسب سن",
        "instructions": [
          "گوشه‌ها و لبه‌ها را جدا کنید.",
          "او یک تکه را امتحان کند.",
          "راهنمایی سؤال‌محور بدهید: گوشه است یا وسط؟",
          "موفقیت تلاش را تشویق کنید."
        ],
        "tip": "اگر خیلی سخت بود پازل ساده‌تر انتخاب کنید.",
        "safety": "قطعه‌ها را بعد بازی از دسترس خردسال‌ترها دور کنید.",
        "relatedMilestones": [
          "m48-draw",
          "m48-letters"
        ]
      },
      {
        "id": "a48-role-shop",
        "title": "بازی مغازه",
        "shortDescription": "نقش فروشنده و خریدار",
        "duration": 15,
        "difficulty": "easy",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "گفت‌وگو و همدلی",
        "materials": "وسایل خانگی به‌عنوان کالا",
        "instructions": [
          "نقش‌ها را عوض کنید.",
          "قیمت خیالی بگویید.",
          "یک مشکل کوچک بسازید: کالا تمام شده.",
          "با هم راه‌حل پیدا کنید."
        ],
        "tip": "اجازه قانون‌سازی جزئی به کودک بدهید.",
        "safety": "پول واقعی و شکستنی وارد نکنید.",
        "relatedMilestones": [
          "m48-friend",
          "m48-rules",
          "m48-story"
        ]
      },
      {
        "id": "a48-scissors",
        "title": "کار دستی قیچی",
        "shortDescription": "بریدن نوارهای کاغذی",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "مهارت ظریف",
        "materials": "قیچی کودکانه و کاغذ",
        "instructions": [
          "نحوه درست گرفتن را نشان دهید.",
          "خط کلفت بکشید تا ببرد.",
          "نوارها را بچسبانید و کلاژ بسازید.",
          "جمع کردن خرده‌ها را با هم انجام دهید."
        ],
        "tip": "صندلی پایدار و آرنج آزاد.",
        "safety": "فقط با نظارت؛ قیچی بزرگسال نه.",
        "relatedMilestones": [
          "m48-scissors",
          "m48-draw"
        ]
      },
      {
        "id": "a48-obstacle",
        "title": "مسیر حرکتی خانگی",
        "shortDescription": "پرش، تعادل، خزیدن",
        "duration": 12,
        "difficulty": "easy",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "دنبال کردن ترتیب حرکتی",
        "materials": "بالش و وسایل نرم",
        "instructions": [
          "۳ ایستگاه بسازید.",
          "ترتیب را با هم بگویید.",
          "او یک ایستگاه جدید اضافه کند.",
          "مسابقه سرعت نگذارید."
        ],
        "tip": "تمرکز روی انجام درست.",
        "safety": "سطح لغزنده و گوشه تیز حذف شود.",
        "relatedMilestones": [
          "m48-balance",
          "m48-listen"
        ]
      },
      {
        "id": "a48-day-review",
        "title": "مرور روز در سه جمله",
        "shortDescription": "خوب/سخت/فردا",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "بیان تجربه و احساس",
        "materials": "نیازی نیست",
        "instructions": [
          "بپرسید امروز چه چیز خوبی داشت؟",
          "چه چیز سختی داشت؟",
          "برای فردا یک کار کوچک انتخاب کنید.",
          "قضاوت نکنید؛ اول گوش دهید."
        ],
        "tip": "زمان ثابت مثل شام یا قبل خواب عالی است.",
        "safety": "اگر نگرانی جدی گفت آرام پیگیری و در صورت نیاز مشورت کنید.",
        "relatedMilestones": [
          "m48-story",
          "m48-help"
        ]
      }
    ],
    "sleep": {
      "overview": "۴ تا ۵ ساله‌ها به خواب شبانه کافی برای تمرکز و هیجان پایدار نیاز دارند. گاهی کابوس و بهانه‌گیری ادامه دارد.",
      "routine": [
        {
          "title": "ساعت ثابت",
          "detail": "حتی آخر هفته اختلاف زیاد نسازید."
        },
        {
          "title": "روال آرام",
          "detail": "مسواک، کتاب، صحبت کوتاه."
        },
        {
          "title": "کاهش صفحه",
          "detail": "اتاق خواب بدون تبلت بهتر است."
        },
        {
          "title": "ورزش روز",
          "detail": "انرژی را روز تخلیه کنید نه درست قبل خواب."
        }
      ],
      "guidance": [
        "اگر هنوز چرت دارد و شب دیر می‌خوابد چرت را کوتاه کنید.",
        "کابوس مکرر شدید را با پزشک/متخصص در میان بگذارید.",
        "اتاق را خنک و تاریک نگه دارید.",
        "نوشیدنی زیاد درست قبل خواب بیداری توالت می‌آورد."
      ],
      "problems": [
        {
          "id": "s4860-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "در این سن برای «دیر خوابیدن» با تایمر تصویری یا شنی انتقال را قابل‌دیدن کنید.",
            "در این سن برای «دیر خوابیدن» صفحه نمایش را از وعده غذا یا روال خواب دور نگه دارید.",
            "در این سن برای «دیر خوابیدن» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند."
          ]
        },
        {
          "id": "s4860-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "در این سن برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "در این سن برای «بیدار شدن شب» چراغ‌خواب ملایم و ثابت بگذارید تا تاریکی کمتر تهدیدکننده باشد.",
            "برای «بیدار شدن شب» ابتدا «بررسی استرس روز» را در عمل بیاورید؛ در این سن روال خواب را ثابت و کم‌محرک نگه دارید."
          ]
        },
        {
          "id": "s4860-fear",
          "title": "ترس و کابوس",
          "guidance": [
            "در این سن برای «ترس و کابوس» با حضور آرام کنارش بمانید و از پرسش‌های پیاپی در اوج هیجان پرهیز کنید.",
            "در این سن برای «ترس و کابوس» در روز روشن کوتاه درباره ترس حرف بزنید؛ شب زمان آموزش طولانی نیست.",
            "برای «ترس و کابوس» ابتدا «محدود کردن محتوای ترسناک» را در عمل بیاورید؛ در این سن روال خواب را ثابت و کم‌محرک نگه دارید."
          ]
        },
        {
          "id": "s4860-stall",
          "title": "بهانه",
          "guidance": [
            "در این سن برای «بهانه» روی «قانون یک بهانه» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در این سن برای «بهانه» قول یا قانون را آرام و ثابت پیگیری کنید.",
            "پاداش صبحگاهی برای همکاری شب اختیاری و غیرخوراکی."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "آمادگی یادگیری با صبحانه و میان‌وعده پایدار گره خورده است. آب و غذای واقعی اولویت دارند.",
      "priorities": [
        {
          "title": "صبحانه منظم",
          "detail": "قبل مهد/پیش‌دبستانی."
        },
        {
          "title": "میان‌وعده آماده از خانه",
          "detail": "کاهش خرید هوس‌محور."
        },
        {
          "title": "مشارکت آشپزی",
          "detail": "بریدن ایمن با ابزار کودک."
        },
        {
          "title": "الگوی خانواده",
          "detail": "همان غذا با تطبیق اندازه."
        }
      ],
      "guidance": [
        "نوشابه و آبمیوه صنعتی را استثنا کنید.",
        "تنقلات را از دید خارج کنید.",
        "اجبار و پاداش شیرین دائمی را کم کنید.",
        "درباره وزن با برچسب منفی حرف نزنید."
      ],
      "problems": [
        {
          "id": "n4860-refuse",
          "title": "بدغذایی",
          "guidance": [
            "در این سن برای «بدغذایی» روی «منوی ثابت خانواده» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در این سن برای «بدغذایی» غذا را بدون فشار دوباره ارائه دهید؛ رد کردن چندباره در این سن شایع است.",
            "در این سن برای «بدغذایی» صدا و محیط را آرام کنید تا تنش سریع‌تر فروکش کند."
          ]
        },
        {
          "id": "n4860-veg",
          "title": "سبزیجات",
          "guidance": [
            "در این سن برای «سبزیجات» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "برای «سبزیجات»، آشپزی با هم. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «سبزیجات» ابتدا «فرم‌های متنوع» را در عمل بیاورید؛ در این سن بدون جنگ قدرت غذا ارائه دهید و وعده‌ها را منظم کنید."
          ]
        },
        {
          "id": "n4860-snack",
          "title": "میان‌وعده",
          "guidance": [
            "در این سن برای «میان‌وعده» میان‌وعده را در جعبه از خانه بفرستید تا انتخاب‌ها کنترل‌شده بماند.",
            "در این سن برای «میان‌وعده» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "در این سن برای «میان‌وعده» قانون روشن و ثابت برای شیرینی بگذارید تا چانه‌زنی کمتر شود."
          ]
        },
        {
          "id": "n4860-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "در این سن برای «طولانی شدن غذا» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "در این سن برای «طولانی شدن غذا» با جمله ثابت و مهربانانه فعالیت را تمام کنید و به مرحله بعد بروید.",
            "برای «طولانی شدن غذا»، بدون صفحه. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "بینایی، شنوایی، دندان، واکسن و آمادگی پیش‌دبستانی را پوشش دهید.",
      "topics": [
        {
          "title": "غربالگری بینایی/شنوایی",
          "detail": "اگر در مهد توصیه شد جدی بگیرید. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "دندان",
          "detail": "مسواک‌زنی با نظارت و مراجعه. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "حرکت روزانه",
          "detail": "بازی بیرون و مهارت توپ. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "بهداشت دست و سرفه",
          "detail": "آموزش عملی نه فقط حرف. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "خواب و تمرکز",
          "detail": "کم‌خوابی را در بی‌قراری کلاس ببینید. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        }
      ],
      "guidance": [
        "ترس‌های شدید مخل زندگی روزمره را ارزیابی کنید.",
        "اگر گفتار برای غریبه‌ها نامفهوم است مطرح کنید.",
        "ایمنی دوچرخه و خیابان را تکرار کنید.",
        "محتوای دیجیتال را هم‌مشاهده کنید."
      ]
    },
    "behavior": {
      "overview": "دوستی‌ها عمیق‌تر و اختلاف‌ها پیچیده‌تر می‌شوند. مربیگری بعد از واقعه خیلی مؤثر است.",
      "situations": [
        {
          "id": "b4860-tantrum",
          "title": "قشقرق کمتر اما شدید",
          "guidance": [
            "برای «قشقرق کمتر اما شدید»، فضای آرام‌سازی از پیش توافق‌شده. در این سن این کار را با ثبات و آرامش تکرار کنید.",
            "در این سن برای «قشقرق کمتر اما شدید» اقدام کاربردی‌تان «نفس بازی‌وار» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "در این سن برای «قشقرق کمتر اما شدید» صدا و محیط را آرام کنید تا تنش سریع‌تر فروکش کند."
          ]
        },
        {
          "id": "b4860-defiance",
          "title": "لجبازی",
          "guidance": [
            "در این سن برای «لجبازی» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "در این سن برای «لجبازی» پیامد منطقی کوتاه و مرتبط بگذارید، نه شرمساری طولانی.",
            "در این سن برای «لجبازی» همکاری کوچک را فوری تشویق کنید تا تکرار شود."
          ]
        },
        {
          "id": "b4860-sep",
          "title": "جدایی",
          "guidance": [
            "در این سن برای «جدایی» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند.",
            "در این سن برای «جدایی» آیتم آرامش‌بخش ایمن همراهش باشد تا جدایی قابل‌تحمل‌تر شود.",
            "برای «جدایی»، هماهنگی با مربی. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b4860-fear",
          "title": "ترس خیالی/تاریکی",
          "guidance": [
            "در این سن برای «ترس خیالی/تاریکی» احساس او را جدی بگیرید و نام ببرید؛ اجبار به بی‌خیالی معمولاً ترس را بیشتر می‌کند.",
            "در این سن برای «ترس خیالی/تاریکی» اقدام کاربردی‌تان «محدود محتوای ترسناک» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «ترس خیالی/تاریکی» ابتدا «تشریفات امنیت» را در عمل بیاورید؛ در این سن روال خواب را ثابت و کم‌محرک نگه دارید."
          ]
        },
        {
          "id": "b4860-agg",
          "title": "پرخاشگری کلامی/بدنی",
          "guidance": [
            "در این سن برای «پرخاشگری کلامی/بدنی» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "در این سن برای «پرخاشگری کلامی/بدنی» بعد از آرام شدن، جبران ساده مثل عذرخواهی کوتاه یا کمک به جمع‌کردن را حمایت کنید.",
            "برای «پرخاشگری کلامی/بدنی» ابتدا «تمرین جمله جایگزین» را در عمل بیاورید؛ در این سن احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b4860-peer",
          "title": "دعوای دوستی",
          "guidance": [
            "در این سن برای «دعوای دوستی» روی «گوش به هر دو» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در این سن برای «دعوای دوستی» اقدام کاربردی‌تان «راه‌حل از خودشان» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «دعوای دوستی» ابتدا «مداخله حداقلی» را در عمل بیاورید؛ در این سن احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "دوچرخه، خیابان، آب و آنلاین شدن اولیه خانواده نیازمند قانون روشن است.",
      "items": [
        {
          "id": "sf4860-bike",
          "title": "دوچرخه",
          "detail": "کلاه همیشه. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-street",
          "title": "خیابان",
          "detail": "عبور فقط با بزرگسال در این سن. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-water",
          "title": "آب",
          "detail": "نظارت نزدیک؛ شناور جایگزین ناظر نیست. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-car",
          "title": "خودرو",
          "detail": "صندلی کودک تا معیار قد/وزن. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-meds",
          "title": "دارو",
          "detail": "هنوز قفل؛ آموزش نخوردن بدون اجازه. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-online",
          "title": "صفحه",
          "detail": "دستگاه در فضای مشترک؛ بدون چت با غریبه. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-fire",
          "title": "آتش و اجاق",
          "detail": "قانون نزدیک نشو بدون مامان/بابا. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf4860-pets",
          "title": "حیوان ناشناس",
          "detail": "دست نزدن بدون اجازه صاحب. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  },
  {
    "id": "60-72",
    "minMonths": 60,
    "maxMonths": 72,
    "title": "۵ تا ۶ سالگی",
    "subtitle": "آمادگی مدرسه، مسئولیت و مهارت هیجانی",
    "monthlyFocus": [
      {
        "domain": "COGNITIVE",
        "title": "تمرکز و مسئولیت یادگیری",
        "summary": "روال کوتاه تکلیف‌بازی و انجام کار",
        "detail": "بازه‌های تمرکز کوتاه با استراحت بهتر از نشستن طولانی اجباری است. موفقیت تلاش را تشویق کنید."
      },
      {
        "domain": "SOCIAL",
        "title": "مهارت مدرسه و دوستی",
        "summary": "همکاری، صبر و حل اختلاف",
        "detail": "نقش‌بازی مدرسه و تمرین عذرخواهی واقعی مهارت اجتماعی کاربردی می‌سازد. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      },
      {
        "domain": "LANGUAGE",
        "title": "بیان احساس و نظر",
        "summary": "صحبت درباره روز و نگرانی",
        "detail": "سؤال‌های باز بعد مدرسه بپرسید. اگر گفت نمی‌دونم گزینه‌ای کمک کنید: امروز بدنت خسته بود یا کارت سخت بود؟"
      },
      {
        "domain": "MOTOR",
        "title": "هماهنگی ورزشی و ظریف",
        "summary": "توپ، لی‌لی و نوشتن اولیه",
        "detail": "بازی‌های حیاطی و قیچی/رنگ‌آمیزی دقیق‌تر دست را برای مدرسه آماده می‌کند. تمرین را کوتاه، بازی‌گونه و متناسب با حوصله کودک تکرار کنید تا مهارت کم‌کم پایدار شود و فشار جای تشویق را نگیرد."
      }
    ],
    "milestones": [
      {
        "id": "m60-listen",
        "domain": "LANGUAGE",
        "title": "گوش دادن به دستور چندمرحله‌ای",
        "description": "۲ تا ۳ مرحله ساده را دنبال می‌کند."
      },
      {
        "id": "m60-tell",
        "domain": "LANGUAGE",
        "title": "تعریف روز با جزئیات",
        "description": "درباره اتفاق حرف می‌زند و سؤال جواب می‌دهد."
      },
      {
        "id": "m60-coop",
        "domain": "SOCIAL",
        "title": "همکاری در بازی گروهی",
        "description": "برای هدف مشترک کوتاه همکاری می‌کند."
      },
      {
        "id": "m60-emotion",
        "domain": "SOCIAL",
        "title": "نام بردن احساس و دلیل تقریبی",
        "description": "می‌گوید چرا عصبانی/ناراحت است تقریبی."
      },
      {
        "id": "m60-write",
        "domain": "COGNITIVE",
        "title": "نوشتن بعضی حروف یا اسم",
        "description": "برخی حروف یا اسم خود را تقلید/می‌نویسد."
      },
      {
        "id": "m60-count",
        "domain": "COGNITIVE",
        "title": "شمارش و مقایسه ساده",
        "description": "می‌شمارد و بیشتر/کمتر را می‌فهمد."
      },
      {
        "id": "m60-hop",
        "domain": "MOTOR",
        "title": "لی‌لی یا پرش متناوب",
        "description": "روی یک پا یا متناوب تلاش موفق دارد."
      },
      {
        "id": "m60-sport",
        "domain": "MOTOR",
        "title": "پرتاب و گرفتن دقیق‌تر",
        "description": "توپ را با دقت بیشتر پرتاب/گرفتن می‌کند."
      },
      {
        "id": "m60-routine",
        "domain": "INDEPENDENCE",
        "title": "روال صبحگاهی با یادآوری کم",
        "description": "مراحل صبح را نسبتاً مستقل انجام می‌دهد."
      },
      {
        "id": "m60-pack",
        "domain": "INDEPENDENCE",
        "title": "کمک در آماده کردن کیف",
        "description": "وسایل ساده را در کیف می‌گذارد."
      }
    ],
    "activities": [
      {
        "id": "a60-day",
        "title": "مرور روز با سه جمله",
        "shortDescription": "خوب، سخت، فردا",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "LANGUAGE",
          "SOCIAL"
        ],
        "goal": "بیان تجربه و احساس",
        "materials": "نیازی نیست",
        "instructions": [
          "بپرسید امروز چه چیزی خوب بود.",
          "بپرسید چه چیزی سخت بود.",
          "با هم یک کار کوچک برای فردا انتخاب کنید.",
          "قضاوت نکنید؛ اول گوش دهید."
        ],
        "tip": "در پیاده‌روی برگشت از مدرسه عالی است.",
        "safety": "اگر نگرانی جدی مطرح شد آرام پیگیری و در صورت نیاز مشورت کنید.",
        "relatedMilestones": [
          "m60-tell",
          "m60-emotion"
        ]
      },
      {
        "id": "a60-obstacle",
        "title": "مسیر حرکتی خانگی",
        "shortDescription": "ترتیب حرکات با ایستگاه‌ها",
        "duration": 12,
        "difficulty": "easy",
        "domains": [
          "MOTOR",
          "COGNITIVE"
        ],
        "goal": "هماهنگی و دنبال کردن ترتیب",
        "materials": "بالش و وسایل نرم",
        "instructions": [
          "مسیر بپر/راه برو/تعادل بسازید.",
          "ترتیب را بگویید.",
          "او ایستگاه جدید اضافه کند.",
          "بدون مسابقه سرعت."
        ],
        "tip": "تمرکز روی دقت.",
        "safety": "لغزندگی و گوشه تیز را حذف کنید.",
        "relatedMilestones": [
          "m60-hop",
          "m60-sport",
          "m60-listen"
        ]
      },
      {
        "id": "a60-name-write",
        "title": "نوشتن اسم با بازی",
        "shortDescription": "خمیر بازی و سپس مداد",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "COGNITIVE",
          "MOTOR"
        ],
        "goal": "آشنایی با حروف اسم",
        "materials": "خمیر بازی و کاغذ",
        "instructions": [
          "حروف اسم را با خمیر بسازید.",
          "با انگشت روی پشت او حرف را بکشید و حدس بزند.",
          "روی کاغذ با مداد کلفت تقلید کند.",
          "کوتاه و شاد تمام کنید."
        ],
        "tip": "اجبار به ورق مشق طولانی انگیزه را می‌کشد.",
        "safety": "نشست و نور مناسب باشد.",
        "relatedMilestones": [
          "m60-write",
          "m60-count"
        ]
      },
      {
        "id": "a60-pack",
        "title": "مسئول کیف",
        "shortDescription": "چک‌لیست تصویری صبح",
        "duration": 8,
        "difficulty": "easy",
        "domains": [
          "INDEPENDENCE",
          "COGNITIVE"
        ],
        "goal": "مسئولیت و حافظه کاری",
        "materials": "چک‌لیست با تصویر",
        "instructions": [
          "۳ تا ۵ وسیله را روی کارت بکشید.",
          "او تیک بزند.",
          "شما فقط بازبینی نهایی کنید.",
          "تشکر از مسئولیت‌پذیری."
        ],
        "tip": "لیست را با هم بسازید تا مال او شود.",
        "safety": "وسایل خطرناک در کیف نباشد.",
        "relatedMilestones": [
          "m60-routine",
          "m60-pack"
        ]
      },
      {
        "id": "a60-friend-solve",
        "title": "حل اختلاف با نقش‌بازی",
        "shortDescription": "تمرین عذرخواهی و راه‌حل",
        "duration": 10,
        "difficulty": "medium",
        "domains": [
          "SOCIAL",
          "LANGUAGE"
        ],
        "goal": "مهارت حل تعارض",
        "materials": "دو عروسک یا فقط نقش",
        "instructions": [
          "یک اختلاف ساده نمایش دهید.",
          "از او راه‌حل بخواهید.",
          "جمله‌های آماده تمرین کنید.",
          "نقش‌ها را عوض کنید."
        ],
        "tip": "عذرخواهی اجباری توخالی نخواهید؛ فهم آسیب مهم‌تر است.",
        "safety": "اگر خشونت واقعی مکرر دیدید از مربی/متخصص کمک بگیرید.",
        "relatedMilestones": [
          "m60-coop",
          "m60-emotion"
        ]
      }
    ],
    "sleep": {
      "overview": "خواب کافی برای تمرکز مدرسه حیاتی است. اتاق بدون صفحه و ساعت خواب ثابت بهترین سرمایه‌گذاری است.",
      "routine": [
        {
          "title": "ساعت خواب مدرسه‌ای",
          "detail": "حتی قبل از شروع رسمی مدرسه تمرین کنید."
        },
        {
          "title": "روال ثابت",
          "detail": "مسواک، لباس، کتاب، چراغ."
        },
        {
          "title": "دستگاه خارج از اتاق",
          "detail": "شارژ در فضای مشترک."
        },
        {
          "title": "آرام‌سازی",
          "detail": "صحبت کوتاه نگرانی‌های فردا."
        },
        {
          "title": "بیداری صبح پایدار",
          "detail": "همان ساعت هفته."
        }
      ],
      "guidance": [
        "کم‌خوابی اغلب خود را به شکل وول و بی‌توجهی نشان می‌دهد نه فقط خمیازه.",
        "محتوای ترسناک را مخصوصاً شب محدود کنید.",
        "اگر خروپف یا خواب‌آلودگی روزانه شدید است بررسی پزشکی کنید.",
        "آخر هفته اختلاف ساعت را کمتر از ۲ ساعت نگه دارید."
      ],
      "problems": [
        {
          "id": "s6072-late",
          "title": "دیر خوابیدن",
          "guidance": [
            "در این سن برای «دیر خوابیدن» صفحه نمایش را از وعده غذا یا روال خواب دور نگه دارید.",
            "در این سن برای «دیر خوابیدن» روال خواب را کمی زودتر شروع کنید تا قبل از خستگی شدید بخوابد.",
            "برای «دیر خوابیدن»، نور روز بیشتر صبح برای ریتم. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s6072-night",
          "title": "بیدار شدن شب",
          "guidance": [
            "در این سن برای «بیدار شدن شب» پاسخ شبانه را کوتاه، کم‌نور و یکنواخت نگه دارید.",
            "در این سن برای «بیدار شدن شب» اقدام کاربردی‌تان «دفتر نگرانی قبل خواب» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «بیدار شدن شب» ابتدا «محیط خنک تاریک» را در عمل بیاورید؛ در این سن روال خواب را ثابت و کم‌محرک نگه دارید."
          ]
        },
        {
          "id": "s6072-fear",
          "title": "ترس و اضطراب شب",
          "guidance": [
            "در این سن برای «ترس و اضطراب شب» بدون قضاوت گوش دهید و احساس را تأیید کنید؛ بعد راه‌حل کوتاه بدهید.",
            "برای «ترس و اضطراب شب»، آماده‌سازی فردا از شب قبل. محیط را ایمن نگه دارید و پاسخ‌تان را یکنواخت بگذارید.",
            "برای «ترس و اضطراب شب»، در صورت اضطراب مخل زندگی مشورت. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "s6072-early-school",
          "title": "سخت بیدار شدن",
          "guidance": [
            "در این سن برای «سخت بیدار شدن» شب قبل کمی زودتر بخوابانید تا بیدار شدن صبح آسان‌تر شود.",
            "در این سن برای «سخت بیدار شدن» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند.",
            "در این سن برای «سخت بیدار شدن» پرده را کنار بزنید تا نور طبیعی صبح بیدار شدن را نرم‌تر کند."
          ]
        }
      ]
    },
    "nutrition": {
      "overview": "صبحانه و میان‌وعده مدرسه ستون تمرکزند. آماده‌سازی مشارکتی جنگ صبح را کم می‌کند.",
      "priorities": [
        {
          "title": "صبحانه قبل خروج",
          "detail": "حذف نشدنی."
        },
        {
          "title": "میان‌وعده از خانه",
          "detail": "گزینه واقعی نه فقط شیرین."
        },
        {
          "title": "آب در کیف",
          "detail": "عادت نوشیدن."
        },
        {
          "title": "شام خانوادگی",
          "detail": "زمان گفت‌وگو."
        }
      ],
      "guidance": [
        "فست‌فود را قانون‌مند کنید نه ممنوعیت مطلق بی‌پشتوانه.",
        "درباره بدن با زبان محترم حرف بزنید.",
        "شیرینی جایزه تنها برای همه موفقیت‌ها نباشد.",
        "اگر اشتها ناگهانی خیلی کم/زیاد شد با پزشک حرف بزنید."
      ],
      "problems": [
        {
          "id": "n6072-refuse",
          "title": "بدغذایی",
          "guidance": [
            "برای «بدغذایی»، مشارکت خرید. در این سن این کار را با ثبات و آرامش تکرار کنید.",
            "در این سن برای «بدغذایی» منوی خانواده را با بافت مناسب سن ارائه دهید.",
            "برای «بدغذایی»، بدون فشار سر سفره مهمانی. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "n6072-veg",
          "title": "سبزیجات",
          "guidance": [
            "برای «سبزیجات»، درست کردن با هم. در این سن این کار را با ثبات و آرامش تکرار کنید.",
            "در این سن برای «سبزیجات» اقدام کاربردی‌تان «فرم‌های متنوع» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "در این سن برای «سبزیجات» خودتان همان رفتار مطلوب را نشان دهید؛ الگو از دستور مؤثرتر است."
          ]
        },
        {
          "id": "n6072-snack",
          "title": "میان‌وعده مدرسه",
          "guidance": [
            "در این سن برای «میان‌وعده مدرسه» روی «آماده شب قبل» تمرکز کنید و آن را چند روز با لحن آرام و ثبات ادامه دهید.",
            "در این سن برای «میان‌وعده مدرسه» دو گزینه قابل‌قبول بدهید تا حس کنترل داشته باشد بدون شکستن قانون اصلی.",
            "در این سن برای «میان‌وعده مدرسه» برچسب میان‌وعده را چک کنید و گزینه کم‌شکرتر را ترجیح دهید."
          ]
        },
        {
          "id": "n6072-long",
          "title": "طولانی شدن غذا",
          "guidance": [
            "در این سن برای «طولانی شدن غذا» زمان شروع و پایان را از قبل روشن کنید تا پیش‌بینی‌پذیر باشد.",
            "در این سن برای «طولانی شدن غذا» وقتی زمان وعده تمام شد با آرامش سفره را جمع کنید.",
            "برای «طولانی شدن غذا»، بدون صفحه. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "health": {
      "overview": "آمادگی مدرسه شامل خواب، بینایی، شنوایی، واکسن یادآوری و مهارت هیجانی است.",
      "topics": [
        {
          "title": "چکاپ پیش از مدرسه",
          "detail": "بینایی، شنوایی، رشد و واکسن. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "کوله‌پشتی و وضعیت نشستن",
          "detail": "وزن کوله و میز مناسب. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "فعالیت بدنی روزانه",
          "detail": "حداقل یک ساعت بازی فعال هدف تقریبی. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "بهداشت",
          "detail": "دست، دندان، دستشویی مستقل‌تر. این موضوع را در روال روزانه بگنجانید و پیگیری منظم داشته باشید؛ برای راهنمایی شخصی با پزشک کودکان مشورت کنید."
        },
        {
          "title": "سلامت روان",
          "detail": "دل‌درد/سردرد مکرر نزدیک مدرسه را جدی اما آرام ببینید."
        }
      ],
      "guidance": [
        "اضطراب جدایی شدید مدرسه را با معلم هماهنگ و در صورت نیاز متخصص پیگیری کنید.",
        "محتوای دیجیتال را با هم ببینید و قانون زمان بگذارید.",
        "ایمنی مسیر مدرسه را بارها تمرین کنید.",
        "هرگز دارو همکلاسی را جابه‌جا نکنید؛ آموزش بدهید."
      ]
    },
    "behavior": {
      "overview": "۵ تا ۶ ساله‌ها قانون را بهتر می‌فهمند اما هنوز به مربیگری هیجان نیاز دارند. ارتباط گرم پایه اطاعت سالم است.",
      "situations": [
        {
          "id": "b6072-tantrum",
          "title": "طغیان هیجانی",
          "guidance": [
            "در این سن برای «طغیان هیجانی» او را به فضای آرام‌تر ببرید تا محرک کمتر و آرام‌شدن آسان‌تر شود.",
            "در این سن برای «طغیان هیجانی» احساس را نام ببرید؛ نام‌گذاری به تنظیم هیجان کمک می‌کند.",
            "در این سن برای «طغیان هیجانی» آموزش و راه‌حل را بعد از فروکش هیجان بگذارید."
          ]
        },
        {
          "id": "b6072-defiance",
          "title": "لجبازی",
          "guidance": [
            "در این سن برای «لجبازی» انتخاب را به دو گزینه قابل‌قبول محدود کنید.",
            "در این سن برای «لجبازی» پیامد منطقی کوتاه و مرتبط بگذارید، نه شرمساری طولانی.",
            "برای «لجبازی» ابتدا «گفت‌وگوی کوتاه بعد» را در عمل بیاورید؛ در این سن احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b6072-sep",
          "title": "اضطراب مدرسه/جدایی",
          "guidance": [
            "در این سن برای «اضطراب مدرسه/جدایی» روال کوتاه و تکراری بسازید تا انتقال‌ها کمتر غافلگیرکننده شوند.",
            "در این سن برای «اضطراب مدرسه/جدایی» اقدام کاربردی‌تان «هماهنگی مربی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «اضطراب مدرسه/جدایی»، جشن تلاش نه فقط ماندن بی‌گریه. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        },
        {
          "id": "b6072-fear",
          "title": "ترس",
          "guidance": [
            "در این سن برای «ترس» احساس او را جدی بگیرید و نام ببرید؛ اجبار به بی‌خیالی معمولاً ترس را بیشتر می‌کند.",
            "در این سن برای «ترس» از قبل کوتاه درباره موقعیت حرف بزنید و قدم خیلی کوچک تمرین کنید.",
            "برای «ترس» ابتدا «محتوای ترسناک محدود» را در عمل بیاورید؛ در این سن احساس را تأیید کنید، حد ایمن را نگه دارید و بعد از آرامش کوتاه آموزش دهید."
          ]
        },
        {
          "id": "b6072-agg",
          "title": "پرخاشگری",
          "guidance": [
            "در این سن برای «پرخاشگری» رفتار آسیب‌زا را فوراً با آرامش متوقف کنید و از دیگران مراقبت کنید.",
            "در این سن برای «پرخاشگری» بعد از آرام شدن، جبران ساده مثل عذرخواهی کوتاه یا کمک به جمع‌کردن را حمایت کنید.",
            "در این سن برای «پرخاشگری» در زمان آرامش مهارت جایگزین مثل درخواست با کلمه را تمرین کنید."
          ]
        },
        {
          "id": "b6072-peer",
          "title": "دوستی و کنار گذاشته شدن",
          "guidance": [
            "در این سن برای «دوستی و کنار گذاشته شدن» بدون قضاوت گوش دهید و احساس را تأیید کنید؛ بعد راه‌حل کوتاه بدهید.",
            "در این سن برای «دوستی و کنار گذاشته شدن» اقدام کاربردی‌تان «تمرین پیوستن به بازی» باشد؛ اول ایمنی را حفظ کنید و بعد کوتاه آموزش دهید.",
            "برای «دوستی و کنار گذاشته شدن»، در صورت زورگویی مکرر با مدرسه حرف بزنید. از فشار زیاد بپرهیزید و به نشانه‌های کودک توجه کنید."
          ]
        }
      ]
    },
    "safety": {
      "overview": "مسیر مدرسه، غریبه، آب، آتش و فضای مجازی موضوعات کلیدی این سن هستند.",
      "items": [
        {
          "id": "sf6072-street",
          "title": "خیابان و مسیر",
          "detail": "عبور امن؛ شماره تماس حفظی. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf6072-stranger",
          "title": "غریبه",
          "detail": "قانون نرفتن با کسی بدون هماهنگی قبلی با شما."
        },
        {
          "id": "sf6072-water",
          "title": "آب",
          "detail": "شنا فقط با ناظر. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf6072-car",
          "title": "خودرو",
          "detail": "صندلی/بوستر مطابق قد و قانون. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf6072-online",
          "title": "آنلاین",
          "detail": "بدون حساب شخصی مستقل؛ دستگاه در فضای مشترک."
        },
        {
          "id": "sf6072-fire",
          "title": "آتش",
          "detail": "مسابقه با کبریت مطلقاً نه؛ تمرین خروج اضطراری خانوادگی."
        },
        {
          "id": "sf6072-meds",
          "title": "دارو",
          "detail": "فقط با دست بزرگسال. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        },
        {
          "id": "sf6072-bike",
          "title": "دوچرخه و اسکیت",
          "detail": "کلاه و محافظ. در این سن این خطر را جدی بگیرید و محیط را طوری بچینید که دسترسی کودک محدود شود؛ نظارت نزدیک بزرگسال را جایگزین وسیله ایمنی نکنید."
        }
      ]
    }
  }
];

module.exports = {
  DOMAINS,
  MILESTONE_STATUS,
  AGE_BANDS,
  getAgeInMonths,
  formatAgeLabel,
  getCorrectedAgeMonths,
  getBandForAge,
  recommendActivities,
  buildAgeGuidePayload,
  calendarDayKey,
  isCompletedOnDay,
  buildExpectSections,
  buildRedFlags,
  buildSafetyTasks,
};
