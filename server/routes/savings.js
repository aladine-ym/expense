import { Router } from 'express';
import { nanoid } from 'nanoid';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbAll, dbGet, dbRun } from '../utils/db.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        let goals = await dbAll('SELECT * FROM savings_goals WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
        
        // Ensure there's always at least one savings goal
        if (goals.length === 0) {
            const id = nanoid();
            const now = new Date().toISOString();
            await dbRun(
                `INSERT INTO savings_goals (id, userId, title, targetAmount, createdAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, req.user.id, 'Savings Funds', 0, now]
            );
            goals = await dbAll('SELECT * FROM savings_goals WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
        }
        
        const goalsWithContributions = await Promise.all(goals.map(async (goal) => {
            const contributions = await dbAll(
                'SELECT * FROM savings_contributions WHERE goalId = ? ORDER BY date DESC',
                [goal.id]
            );
            return mapGoalRow(goal, contributions);
        }));
        res.json(goalsWithContributions);
    })
);

router.post(
    '/',
    validateRequest({
        body: {
            title: { type: 'string', required: true, min: 1 },
            targetAmount: { type: 'number', required: true, min: 0 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { title, targetAmount } = req.body ?? {};
        const id = nanoid();
        const now = new Date().toISOString();
        await dbRun(
            `INSERT INTO savings_goals (id, userId, title, targetAmount, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [id, req.user.id, title, targetAmount, now]
        );
        const row = await dbGet('SELECT * FROM savings_goals WHERE id = ?', [id]);
        res.status(201).json(mapGoalRow(row, []));
    })
);

// Update target amount
router.put(
    '/:id/target',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 }
        },
        body: {
            targetAmount: { type: 'number', required: true, min: 0 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { targetAmount } = req.body;
        
        const existing = await dbGet('SELECT * FROM savings_goals WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        await dbRun(
            'UPDATE savings_goals SET targetAmount = ? WHERE id = ? AND userId = ?',
            [targetAmount, id, req.user.id]
        );
        
        const row = await dbGet('SELECT * FROM savings_goals WHERE id = ?', [id]);
        const contributions = await dbAll('SELECT * FROM savings_contributions WHERE goalId = ?', [id]);
        res.json(mapGoalRow(row, contributions));
    })
);

// Add contribution
router.post(
    '/:id/contributions',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 }
        },
        body: {
            amount: { type: 'number', required: true, min: 0 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { amount } = req.body;
        
        const existing = await dbGet('SELECT * FROM savings_goals WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        const contributionId = nanoid();
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO savings_contributions (id, goalId, userId, amount, date, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [contributionId, id, req.user.id, amount, now, now]
        );
        
        const row = await dbGet('SELECT * FROM savings_goals WHERE id = ?', [id]);
        const contributions = await dbAll('SELECT * FROM savings_contributions WHERE goalId = ?', [id]);
        res.json(mapGoalRow(row, contributions));
    })
);

// Cash out (delete all contributions)
router.delete(
    '/:id/contributions',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        
        const existing = await dbGet('SELECT * FROM savings_goals WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        await dbRun('DELETE FROM savings_contributions WHERE goalId = ? AND userId = ?', [id, req.user.id]);
        
        const row = await dbGet('SELECT * FROM savings_goals WHERE id = ?', [id]);
        res.json(mapGoalRow(row, []));
    })
);

// Delete single contribution
router.delete(
    '/:id/contributions/:contributionId',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 },
            contributionId: { type: 'string', required: true, min: 1 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id, contributionId } = req.params;
        
        await dbRun('DELETE FROM savings_contributions WHERE id = ? AND goalId = ? AND userId = ?', [contributionId, id, req.user.id]);
        
        const row = await dbGet('SELECT * FROM savings_goals WHERE id = ?', [id]);
        const contributions = await dbAll('SELECT * FROM savings_contributions WHERE goalId = ?', [id]);
        res.json(mapGoalRow(row, contributions));
    })
);

router.delete(
    '/:id',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        await dbRun('DELETE FROM savings_goals WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.status(204).end();
    })
);

function mapGoalRow(row, contributions = []) {
    if (!row) {
        return null;
    }
    
    // Calculate currentSaved from contributions
    const currentSaved = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
    
    return {
        id: row.id,
        title: row.title,
        targetAmount: Number(row.targetAmount),
        currentSaved: currentSaved,
        contributions: contributions.map(c => ({
            id: c.id,
            amount: Number(c.amount),
            date: c.date,
            createdAt: c.createdAt
        })),
        createdAt: row.createdAt
    };
}

export default router;
