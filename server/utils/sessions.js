import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'TEMP: development secret';
const COOKIE_NAME = 'ek_session';

/**
 * Create a signed JWT session token.
 * @param {string} userId
 * @returns {string}
 */
export function createSessionToken(userId) {
    return jwt.sign({ sub: userId }, SESSION_SECRET, { expiresIn: '10d' });
}

/**
 * Attach the session cookie to the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setSessionCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 10 // 10 days
    });
}

/**
 * Remove the session cookie from the response.
 * @param {import('express').Response} res
 */
export function clearSessionCookie(res) {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
}
