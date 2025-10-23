import { Router } from 'express';
import { dbGet, dbRun } from '../utils/db.js';
import { createSessionToken, setSessionCookie, clearSessionCookie } from '../utils/sessions.js';
import crypto from 'crypto';

const router = Router();

// TEMP: Single user ID for local-only app
const SINGLE_USER_ID = 'local-user';

// Brute force protection
const loginAttempts = new Map(); // username -> { count, lockoutEnd }
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60 * 1000; // 60 seconds

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Auto-login endpoint - creates or retrieves the single local user
 */
router.post('/auto-login', async (req, res, next) => {
    try {
        let user = await dbGet('SELECT * FROM users WHERE id = ?', [SINGLE_USER_ID]);

        if (!user) {
            // Create the single user if it doesn't exist
            const now = new Date().toISOString();
            await dbRun(
                `INSERT INTO users (id, email, displayName, authProvider, createdAt, currency, theme, autoAdjustBudgets, resetDay)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [SINGLE_USER_ID, null, 'Local User', 'local', now, 'USD', 'system', 1, 1]
            );
            user = await dbGet('SELECT * FROM users WHERE id = ?', [SINGLE_USER_ID]);
        }

        const token = createSessionToken(SINGLE_USER_ID);
        setSessionCookie(res, token);
        req.session.token = token;
        
        res.json({ user: serializeUser(user) });
    } catch (error) {
        next(error);
    }
});

/**
 * Login endpoint with username/password
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Sanitize username to prevent SQL injection
        const sanitizedUsername = String(username).trim().toLowerCase();

        // Check for lockout
        const attemptData = loginAttempts.get(sanitizedUsername);
        if (attemptData && attemptData.lockoutEnd > Date.now()) {
            return res.status(429).json({ 
                message: 'Too many failed attempts. Please try again later.',
                lockoutEnd: attemptData.lockoutEnd
            });
        }

        // Get user from database
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [sanitizedUsername]);

        if (!user || user.passwordHash !== hashPassword(password)) {
            // Record failed attempt
            const currentAttempts = attemptData ? attemptData.count + 1 : 1;
            
            if (currentAttempts >= MAX_ATTEMPTS) {
                const lockoutEnd = Date.now() + LOCKOUT_DURATION;
                loginAttempts.set(sanitizedUsername, { count: currentAttempts, lockoutEnd });
                return res.status(429).json({ 
                    message: 'Too many failed attempts. Account locked for 60 seconds.',
                    lockoutEnd
                });
            } else {
                loginAttempts.set(sanitizedUsername, { count: currentAttempts, lockoutEnd: 0 });
                return res.status(401).json({ 
                    message: `Invalid username or password. ${MAX_ATTEMPTS - currentAttempts} attempts remaining.`
                });
            }
        }

        // Successful login - clear attempts
        loginAttempts.delete(sanitizedUsername);

        // Create session
        const token = createSessionToken(user.id);
        setSessionCookie(res, token);
        req.session.userId = user.id;
        req.session.token = token;

        res.json({ 
            success: true,
            user: serializeUser(user) 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * Logout endpoint
 */
router.post('/logout', (req, res) => {
    clearSessionCookie(res);
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.json({ success: true });
    });
});

/**
 * Check authentication status
 */
router.get('/status', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ authenticated: false });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        
        if (!user) {
            return res.json({ authenticated: false });
        }

        res.json({ 
            authenticated: true,
            user: serializeUser(user)
        });
    } catch (error) {
        console.error('Auth status error:', error);
        res.json({ authenticated: false });
    }
});

/**
 * @param {import('../types.js').DBUser} user
 */
function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        preferences: {
            currency: user.currency ?? 'USD',
            theme: user.theme ?? 'system',
            autoAdjustBudgets: Boolean(user.autoAdjustBudgets),
            resetDay: Number(user.resetDay ?? 1)
        }
    };
}

export default router;
