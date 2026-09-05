const USER_KEY = 'loggedInUser';
const TOKEN_KEY = 'authToken';

export function getAuthToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (_) {
        return null;
    }
}

export function getLoggedInUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

export function isLoggedIn() {
    const user = getLoggedInUser();
    return !!(user && user.id);
}

export function safeNextPath(value, fallback = '/') {
    const next = String(value || '').trim();
    return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export function loginUrl(next) {
    const path = safeNextPath(next);
    if (!path || path === '/dashboard' || path === '/') return '/register';
    return `/register?next=${encodeURIComponent(path)}`;
}

export function setAuthSession(user, token) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthSession() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

export function installAuthFetch() {
    if (typeof window === 'undefined' || window.__tatkidsAuthFetch) return;
    window.__tatkidsAuthFetch = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers || undefined);
        const token = getAuthToken();
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
    };
}
