import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbAll, dbGet, dbRun } from '../utils/db.js';
import { validateRequest } from '../middleware/validate.js';
import { nanoid } from 'nanoid';
import { checkAndResetBudgets } from '../utils/budgetReset.js';

const router = Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        // Check and perform budget reset if needed
        await checkAndResetBudgets(req.user.id);
        
        const categories = await dbAll('SELECT * FROM categories WHERE userId = ?', [req.user.id]);
        const history = await dbAll(
            'SELECT * FROM category_history WHERE userId = ? ORDER BY at DESC',
            [req.user.id]
        );
        res.json({ categories: categories.map(mapCategoryRow), history: history.map(mapHistoryRow) });
    })
);

router.post(
    '/',
    validateRequest({
        body: {
            name: { type: 'string', required: true, min: 1 },
            color: { type: 'string', required: true, min: 1 },
            icon: { type: 'string', required: true, min: 1 },
            allocatedAmount: { type: 'number', required: false, min: 0 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { name, color, icon, allocatedAmount } = req.body;
        if (!name || !color || !icon) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const id = nanoid();
        await dbRun(
            `INSERT INTO categories (id, userId, name, color, icon, allocatedAmount, spentTotal, status, overdrawnAmount, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 0, 'healthy', 0, ?)`,
            [id, req.user.id, name, color, icon, allocatedAmount ?? 0, new Date().toISOString()]
        );
        const category = await dbGet('SELECT * FROM categories WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.status(201).json(mapCategoryRow(category));
    })
);

router.put(
    '/:id',
    validateRequest({
        body: {
            name: { type: 'string', required: true, min: 1 },
            color: { type: 'string', required: true, min: 1 },
            icon: { type: 'string', required: true, min: 1 },
            allocatedAmount: { type: 'number', required: true, min: 0 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, color, icon, allocatedAmount } = req.body;
        const existing = await dbGet('SELECT * FROM categories WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }
        await dbRun(
            `UPDATE categories SET name = ?, color = ?, icon = ?, allocatedAmount = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
            [name, color, icon, allocatedAmount, new Date().toISOString(), id, req.user.id]
        );
        if (Number(existing.allocatedAmount) !== Number(allocatedAmount)) {
            await dbRun(
                `INSERT INTO category_history (categoryId, userId, at, oldAmount, newAmount, reason) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, req.user.id, new Date().toISOString(), Number(existing.allocatedAmount ?? 0), Number(allocatedAmount), 'manual-adjust']
            );
        }
        const category = await dbGet('SELECT * FROM categories WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.json(mapCategoryRow(category));
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
        await dbRun('DELETE FROM categories WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.status(204).end();
    })
);

router.post(
    '/:id/history/undo',
    validateRequest({
        params: {
            id: { type: 'string', required: true, min: 1 }
        }
    }),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const lastEntry = await dbAll(
            `SELECT * FROM category_history WHERE categoryId = ? AND userId = ? ORDER BY at DESC LIMIT 1`,
            [id, req.user.id]
        );
        if (!lastEntry.length) {
            return res.status(404).json({ error: 'No history entries to undo' });
        }
        const entry = lastEntry[0];
        await dbRun(`DELETE FROM category_history WHERE id = ?`, [entry.id]);
        await dbRun(
            `UPDATE categories SET allocatedAmount = ?, spentTotal = ?, status = 'healthy', overdrawnAmount = 0, updatedAt = ? WHERE id = ?`,
            [entry.oldAmount, entry.oldAmount, new Date().toISOString(), id]
        );
        const category = await dbGet('SELECT * FROM categories WHERE id = ? AND userId = ?', [id, req.user.id]);
        res.json(mapCategoryRow(category));
    })
);

function mapCategoryRow(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        allocatedAmount: Number(row.allocatedAmount),
        spentTotal: Number(row.spentTotal ?? 0),
        status: row.status,
        overdrawnAmount: Number(row.overdrawnAmount ?? 0),
        updatedAt: row.updatedAt
    };
}

function mapHistoryRow(row) {
    return {
        id: row.id,
        categoryId: row.categoryId,
        userId: row.userId,
        at: row.at,
        oldAmount: Number(row.oldAmount),
        newAmount: Number(row.newAmount),
        reason: row.reason
    };
}

export default router;
