export const userFullName = (user) =>
    [user && user.firstName, user && user.lastName]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ');

export const isUserProfileComplete = (user) =>
    Boolean(String(user && user.firstName || '').trim() && String(user && user.lastName || '').trim());

export const profileCompletePath = (next = '/cart') => {
    const safeNext = next && String(next).startsWith('/') && !String(next).startsWith('//')
        ? String(next)
        : '/cart';
    return `/profile?complete=1&next=${encodeURIComponent(safeNext)}`;
};

export const safeNextPath = (value, fallback = '/cart') => {
    const next = String(value || '').trim();
    if (next.startsWith('/') && !next.startsWith('//')) return next;
    return fallback;
};
