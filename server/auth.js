const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const TOKEN_TTL = process.env.JWT_TTL || '7d';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

function jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret && String(secret).trim()) return String(secret);
    if (process.env.NODE_ENV === 'production') {
        console.warn('JWT_SECRET is not set; using a weak fallback. Set a long random secret in server/.env');
    }
    return 'tatkids-dev-jwt-secret-change-me';
}

function isHashedPassword(value) {
    return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}

async function hashPassword(plain) {
    if (plain == null || plain === '') return null;
    const value = String(plain);
    if (isHashedPassword(value)) return value;
    return bcrypt.hash(value, BCRYPT_ROUNDS);
}

async function verifyPassword(stored, plain) {
    if (stored == null || stored === '' || plain == null) return false;
    const password = String(plain);
    if (isHashedPassword(stored)) {
        return bcrypt.compare(password, stored);
    }
    return stored === password;
}

function signToken(user) {
    return jwt.sign(
        { id: Number(user.id), isAdmin: !!user.isAdmin },
        jwtSecret(),
        { expiresIn: TOKEN_TTL }
    );
}

function verifyToken(token) {
    if (!token) return null;
    try {
        return jwt.verify(String(token), jwtSecret());
    } catch (_) {
        return null;
    }
}

function readBearerToken(req) {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

function allowLegacyUserHeader() {
    if (process.env.AUTH_ALLOW_LEGACY_HEADER === '1') return true;
    if (process.env.AUTH_ALLOW_LEGACY_HEADER === '0') return false;
    return process.env.NODE_ENV !== 'production';
}

module.exports = {
    hashPassword,
    verifyPassword,
    isHashedPassword,
    signToken,
    verifyToken,
    readBearerToken,
    allowLegacyUserHeader
};
