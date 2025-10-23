import { Router } from 'express';
import { nanoid } from 'nanoid';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbAll, dbGet, dbRun } from '../utils/db.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const rows = await dbAll('SELECT * FROM income_sources WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
        res.json(rows.map(mapIncomeRow));
    })
);

router.post(
    '/',
    validateRequest({
        body: {
            name: { type: 'string', required: true, min: 1 },
            amount: { type: 'number', required: true, min: 0 },
            frequency: { type: 'string', required: true, min: 1 },
            payday: { type: 'string', required: false }
        }
    }),
    asyncHandler(async (req, res) => {
        const { name, amount, frequency, payday } = req.body ?? {};
        if (!name || typeof amount !== 'number' || !frequency) {
            return res.status(400).json({ error: 'Missing income fields' });
        }
        const id = nanoid();
        const now = new Date().toISOString();
        await dbRun(
            `INSERT INTO income_sources (id, userId, name, amount, frequency, payday, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.id, name, amount, frequency, payday ?? null, now]
        );
        const row = await dbGet('SELECT * FROM income_sources WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.status(201).json(mapIncomeRow(row));
    })
);

router.put(
    '/:id',
    validateRequest({
        params: { id: { type: 'string', required: true, min: 1 } },
        body: {
            name: { type: 'string', required: false, min: 1 },
            amount: { type: 'number', required: false, min: 0 },
            frequency: { type: 'string', required: false, min: 1 },
            payday: { type: 'string', required: false }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const existing = await dbGet('SELECT * FROM income_sources WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Income source not found' });
        }

        const name = req.body?.name ?? existing.name;
        const amount = typeof req.body?.amount === 'number' ? req.body.amount : Number(existing.amount);
        const frequency = req.body?.frequency ?? existing.frequency;
        const payday = req.body?.payday ?? existing.payday;

        await dbRun(
            `UPDATE income_sources SET name = ?, amount = ?, frequency = ?, payday = ? WHERE id = ? AND userId = ?`,
            [name, amount, frequency, payday, id, req.user.id]
        );
        const updated = await dbGet('SELECT * FROM income_sources WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.json(mapIncomeRow(updated));
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
        await dbRun('DELETE FROM income_sources WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.status(204).end();
    })
);

function mapIncomeRow(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        name: row.name,
        amount: Number(row.amount),
        frequency: row.frequency,
        payday: row.payday,
        createdAt: row.createdAt
    };
}

export default router;
