/**
 * Client helpers for «رشد کودک من».
 * Content & recommendations come from the API.
 */

export const MILESTONE_STATUS = {
    NOT_CHECKED: 'NOT_CHECKED',
    OBSERVED: 'OBSERVED',
    NOT_YET_OBSERVED: 'NOT_YET_OBSERVED',
    UNSURE: 'UNSURE',
};

export const DOMAINS = {
    LANGUAGE: { id: 'LANGUAGE', label: 'زبان', labelFull: 'زبان و ارتباط', tone: 'lang' },
    SOCIAL: { id: 'SOCIAL', label: 'اجتماعی', labelFull: 'اجتماعی و عاطفی', tone: 'social' },
    COGNITIVE: { id: 'COGNITIVE', label: 'شناخت', labelFull: 'شناخت و یادگیری', tone: 'cog' },
    MOTOR: { id: 'MOTOR', label: 'حرکتی', labelFull: 'حرکتی', tone: 'motor' },
    INDEPENDENCE: { id: 'INDEPENDENCE', label: 'استقلال', labelFull: 'استقلال روزمره', tone: 'indep' },
};

export const STATUS_LABELS = {
    [MILESTONE_STATUS.NOT_CHECKED]: 'هنوز بررسی نکرده‌ام',
    [MILESTONE_STATUS.OBSERVED]: 'مشاهده کرده‌ام',
    [MILESTONE_STATUS.NOT_YET_OBSERVED]: 'هنوز مشاهده نکرده‌ام',
    [MILESTONE_STATUS.UNSURE]: 'مطمئن نیستم',
};

export const TREND_LABELS = {
    STABLE: 'پایدار',
    INCREASING: 'رو به رشد',
    DECREASING: 'نیاز به پیگیری',
    UNKNOWN: 'نامشخص',
};

export const formatRelativeMeasurementDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(String(dateStr).replace(/\//g, '-'));
    if (Number.isNaN(date.getTime())) return String(dateStr);
    const diffDays = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'امروز';
    if (diffDays === 1) return 'دیروز';
    if (diffDays < 7) return `${diffDays} روز پیش`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} هفته پیش`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ماه پیش`;
    return `${Math.floor(diffDays / 365)} سال پیش`;
};

export async function fetchAgeGuide(childId, concern = null) {
    const qs = concern ? `?concern=${encodeURIComponent(concern)}` : '';
    const res = await fetch(`/api/children/${childId}/age-guide${qs}`);
    if (!res.ok) throw new Error('خطا در دریافت راهنمای رشد');
    return res.json();
}

export async function updateMilestoneStatus(childId, milestoneId, status) {
    const res = await fetch(`/api/children/${childId}/milestones/${milestoneId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status,
            observedAt: status === MILESTONE_STATUS.OBSERVED ? new Date().toISOString().slice(0, 10) : null,
        }),
    });
    if (!res.ok) throw new Error('خطا در ذخیره مهارت');
    return res.json();
}

export async function completeActivity(childId, activityId, duration = null) {
    const res = await fetch(`/api/children/${childId}/activities/${activityId}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, duration }),
    });
    if (!res.ok) throw new Error('خطا در ثبت فعالیت');
    return res.json();
}

export async function toggleSafetyTask(childId, itemId, done = true) {
    const res = await fetch(`/api/children/${childId}/safety/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
    });
    if (!res.ok) throw new Error('خطا در ثبت ایمنی');
    return res.json();
}

export async function analyzeConcern(childId, concern, topic = 'متن آزاد') {
    const res = await fetch(`/api/children/${childId}/concerns/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concern, topic }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'خطا در تحلیل نگرانی');
    return data;
}

export async function submitConcern(childId, payload) {
    const res = await fetch(`/api/children/${childId}/concerns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('خطا در ثبت نگرانی');
    return res.json();
}
