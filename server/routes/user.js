import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbGet, dbRun } from '../utils/db.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(formatUser(user));
    })
);

router.put(
    '/preferences',
    validateRequest({
        body: {
            preferences: {
                type: 'object',
                required: true,
                validator: (prefs) => {
                    if (!prefs.currency || !prefs.theme) return false;
                    if (typeof prefs.autoAdjustBudgets !== 'boolean') return false;
                    if (prefs.resetDay !== undefined && (typeof prefs.resetDay !== 'number' || prefs.resetDay < 1 || prefs.resetDay > 29)) return false;
                    return true;
                },
                message: 'preferences must include currency, theme, autoAdjustBudgets, and optional resetDay (1-29)'
            }
        }
    }),
    asyncHandler(async (req, res) => {
        const { currency, theme, autoAdjustBudgets, resetDay } = req.body?.preferences ?? {};
        await dbRun(
            `UPDATE users SET currency = ?, theme = ?, autoAdjustBudgets = ?, resetDay = ? WHERE id = ?`,
            [currency, theme, autoAdjustBudgets ? 1 : 0, resetDay ?? 1, req.user.id]
        );
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        res.json(formatUser(user));
    })
);

function formatUser(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        preferences: {
            currency: user.currency,
            theme: user.theme,
            autoAdjustBudgets: Boolean(user.autoAdjustBudgets),
            resetDay: Number(user.resetDay ?? 1)
        }
    };
}

export default router;
