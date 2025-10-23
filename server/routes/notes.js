import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbAll, dbGet, dbRun } from '../utils/db.js';
import { nanoid } from 'nanoid';
import { assertCondition } from '../utils/errors.js';
import { validateRequest } from '../middleware/validate.js';
import { checkAndResetBudgets } from '../utils/budgetReset.js';

/**
 * @typedef {Object} DBExpense
 * @property {string} id
 * @property {string} userId
 * @property {string} noteId
 * @property {string} categoryId
 * @property {string} type
 * @property {number} amount
 * @property {string} currency
 * @property {string} createdAt
 * @property {string} tags
 */

/**
 * @typedef {Object} DBDayNote
 * @property {string} id
 * @property {string} userId
 * @property {string} date
 * @property {number} total
 * @property {string} createdAt
 * @property {number} pinned
 */

const router = Router();

router.get(
    '/',
    validateRequest({
        query: {
            from: { type: 'string', required: false },
            to: { type: 'string', required: false }
        }
    }),
    asyncHandler(async (req, res) => {
        // Check and perform budget reset if needed
        await checkAndResetBudgets(req.user.id);
        
        const { from, to } = req.query;
        const hasRange = Boolean(from && to);
        const params = [req.user.id];
        let notesQuery = 'SELECT * FROM day_notes WHERE userId = ?';
        if (hasRange) {
            notesQuery += ' AND date BETWEEN ? AND ?';
            params.push(from, to);
        }
        notesQuery += ' ORDER BY date DESC';

        const notes = await dbAll(notesQuery, params);
        if (!notes.length) {
            return res.json([]);
        }

        const noteIds = notes.map((note) => note.id);
        const placeholders = noteIds.map(() => '?').join(',');
        const expenses = await dbAll(
            `SELECT * FROM expenses WHERE userId = ? AND noteId IN (${placeholders}) ORDER BY createdAt ASC`,
            [req.user.id, ...noteIds]
        );

        const expensesByNote = expenses.reduce((acc, expense) => {
            if (!acc[expense.noteId]) {
                acc[expense.noteId] = [];
            }
            acc[expense.noteId].push(expense);
            return acc;
        }, {});

        const payload = notes.map((note) => ({
            ...note,
            items: (expensesByNote[note.id] ?? []).map(mapExpenseRow)
        }));

        res.json(payload.map(mapNoteRow));
    })
);

router.post(
    '/',
    asyncHandler(async (req, res) => {
        if (req.body?.type === 'note' || req.body?.items) {
            const response = await createDayNote(req);
            return res.status(201).json(response);
        }

        const response = await createExpense(req);
        res.status(201).json(response);
    })
);

router.put(
    '/:noteId',
    validateRequest({
        body: {
            expense: { type: 'object', required: false },
            pinned: { type: 'boolean', required: false }
        }
    }),
    asyncHandler(async (req, res) => {
        const { noteId } = req.params;
        if (req.body?.expense) {
            const updated = await updateExpense(req, noteId);
            return res.json(updated);
        }

        const updated = await updateDayNote(req, noteId);
        res.json(updated);
    })
);

router.delete(
    '/:noteId',
    validateRequest({
        query: {
            expenseId: { type: 'string', required: false }
        }
    }),
    asyncHandler(async (req, res) => {
        const { noteId } = req.params;
        const { expenseId } = req.query;

        if (expenseId) {
            await deleteExpense(req, noteId, expenseId);
            return res.status(204).end();
        }

        await deleteDayNote(req, noteId);
        res.status(204).end();
    })
);

/**
 * Map a raw note row to API shape.
 * @param {import('../types.js').DBDayNote & { items?: any[] }} note
 * @returns {import('../types.js').DayNotePayload}
 */
function mapNoteRow(note) {
    return {
        id: note.id,
        date: note.date,
        items: note.items ?? [],
        total: Number(note.total),
        createdAt: note.createdAt,
        pinned: Boolean(note.pinned)
    };
}

/**
 * Map a raw expense row into API payload shape.
 * @param {import('../types.js').DBExpense} expense
 * @returns {import('../types.js').ExpensePayload}
 */
function mapExpenseRow(expense) {
    return {
        id: expense.id,
        type: expense.type,
        amount: Number(expense.amount),
        currency: expense.currency,
        categoryId: expense.categoryId,
        noteId: expense.noteId,
        createdAt: expense.createdAt,
        tags: JSON.parse(expense.tags ?? '[]')
    };
}

/**
 * Create a new day note for the authenticated user.
 * @param {import('express').Request} req
 */
async function createDayNote(req) {
    const { date, pinned = false } = req.body;
    assertCondition(date, 400, 'Date is required');
    const id = String(req.body?.id ?? date);
    const now = new Date().toISOString();
    await dbRun(
        `INSERT INTO day_notes (id, userId, date, total, createdAt, pinned)
         VALUES (?, ?, ?, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET pinned = excluded.pinned`,
        [id, req.user.id, date, now, pinned ? 1 : 0]
    );
    const note = await dbGet('SELECT * FROM day_notes WHERE id = ? AND userId = ?', [id, req.user.id]);
    return mapNoteRow({ ...note, items: [] });
}

/**
 * Create an expense and update aggregates.
 * @param {import('express').Request} req
 */
async function createExpense(req) {
    const { noteId, amount, type, categoryId, currency, tags = [] } = req.body ?? {};
    assertCondition(noteId && typeof noteId === 'string', 400, 'Invalid noteId');
    assertCondition(typeof amount === 'number' && amount > 0, 400, 'Amount must be positive');
    assertCondition(typeof type === 'string' && type.trim().length > 0, 400, 'Type is required');
    assertCondition(typeof categoryId === 'string' && categoryId.length > 0, 400, 'categoryId required');

    const note = await dbGet('SELECT * FROM day_notes WHERE id = ? AND userId = ?', [noteId, req.user.id]);
    assertCondition(note, 404, 'Note not found');

    const id = nanoid();
    const now = new Date().toISOString();
    const finalCurrency = currency ?? req.user.currency ?? 'USD';

    await dbRun(
        `INSERT INTO expenses (id, userId, noteId, categoryId, type, amount, currency, createdAt, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, req.user.id, noteId, categoryId, type, amount, finalCurrency, now, JSON.stringify(tags)]
    );

    await dbRun('UPDATE day_notes SET total = total + ? WHERE id = ? AND userId = ?', [amount, noteId, req.user.id]);

    await adjustCategorySpending({
        userId: req.user.id,
        categoryId,
        delta: amount,
        autoAdjust: Boolean(req.user.autoAdjustBudgets)
    });

    const updatedExpense = await dbGet('SELECT * FROM expenses WHERE id = ?', [id]);
    return mapExpenseRow(updatedExpense);
}

/**
 * Update an expense and adjust aggregates accordingly.
 * @param {import('express').Request} req
 * @param {string} noteId
 */
async function updateExpense(req, noteId) {
    const payload = req.body.expense;
    const existing = await dbGet('SELECT * FROM expenses WHERE id = ? AND userId = ?', [payload.id, req.user.id]);
    assertCondition(existing, 404, 'Expense not found');

    const amountDelta = Number(payload.amount) - Number(existing.amount);
    const newCategoryId = payload.categoryId ?? existing.categoryId;

    await dbRun(
        `UPDATE expenses SET type = ?, amount = ?, currency = ?, categoryId = ?, noteId = ?, tags = ?, createdAt = ? WHERE id = ? AND userId = ?`,
        [
            payload.type ?? existing.type,
            payload.amount ?? existing.amount,
            payload.currency ?? existing.currency,
            newCategoryId,
            noteId,
            JSON.stringify(payload.tags ?? JSON.parse(existing.tags ?? '[]')),
            payload.createdAt ?? existing.createdAt,
            existing.id,
            req.user.id
        ]
    );

    if (amountDelta !== 0) {
        await dbRun('UPDATE day_notes SET total = total + ? WHERE id = ? AND userId = ?', [amountDelta, noteId, req.user.id]);
    }

    if (existing.categoryId !== newCategoryId) {
        await adjustCategorySpending({
            userId: req.user.id,
            categoryId: existing.categoryId,
            delta: -Number(existing.amount),
            autoAdjust: Boolean(req.user.autoAdjustBudgets)
        });
        await adjustCategorySpending({
            userId: req.user.id,
            categoryId: newCategoryId,
            delta: Number(payload.amount),
            autoAdjust: Boolean(req.user.autoAdjustBudgets)
        });
    } else if (amountDelta !== 0) {
        await adjustCategorySpending({
            userId: req.user.id,
            categoryId: newCategoryId,
            delta: amountDelta,
            autoAdjust: Boolean(req.user.autoAdjustBudgets)
        });
    }

    const updatedExpense = await dbGet('SELECT * FROM expenses WHERE id = ?', [existing.id]);
    return mapExpenseRow(updatedExpense);
}

/**
 * Update note metadata.
 * @param {import('express').Request} req
 * @param {string} noteId
 */
async function updateDayNote(req, noteId) {
    const { pinned } = req.body ?? {};
    await dbRun('UPDATE day_notes SET pinned = ? WHERE id = ? AND userId = ?', [pinned ? 1 : 0, noteId, req.user.id]);
    const note = await dbGet('SELECT * FROM day_notes WHERE id = ? AND userId = ?', [noteId, req.user.id]);
    assertCondition(note, 404, 'Note not found');
    const items = await dbAll('SELECT * FROM expenses WHERE noteId = ? AND userId = ?', [noteId, req.user.id]);
    return mapNoteRow({ ...note, items: items.map(mapExpenseRow) });
}

/**
 * Delete an expense and update aggregates.
 * @param {import('express').Request} req
 * @param {string} noteId
 * @param {string} expenseId
 */
async function deleteExpense(req, noteId, expenseId) {
    const expense = await dbGet('SELECT * FROM expenses WHERE id = ? AND userId = ?', [expenseId, req.user.id]);
    assertCondition(expense, 404, 'Expense not found');
    await dbRun('DELETE FROM expenses WHERE id = ? AND userId = ?', [expenseId, req.user.id]);
    await dbRun('UPDATE day_notes SET total = total - ? WHERE id = ? AND userId = ?', [expense.amount, noteId, req.user.id]);
    await adjustCategorySpending({
        userId: req.user.id,
        categoryId: expense.categoryId,
        delta: -Number(expense.amount),
        autoAdjust: Boolean(req.user.autoAdjustBudgets)
    });
}

/**
 * Delete a note and all related expenses.
 * @param {import('express').Request} req
 * @param {string} noteId
 */
async function deleteDayNote(req, noteId) {
    const expenses = await dbAll('SELECT * FROM expenses WHERE noteId = ? AND userId = ?', [noteId, req.user.id]);
    for (const expense of expenses) {
        await adjustCategorySpending({
            userId: req.user.id,
            categoryId: expense.categoryId,
            delta: -Number(expense.amount),
            autoAdjust: Boolean(req.user.autoAdjustBudgets)
        });
    }
    await dbRun('DELETE FROM expenses WHERE noteId = ? AND userId = ?', [noteId, req.user.id]);
    await dbRun('DELETE FROM day_notes WHERE id = ? AND userId = ?', [noteId, req.user.id]);
}

/**
 * Update category spending totals and handle auto-adjust logic.
 * @param {{ userId: string, categoryId: string, delta: number, autoAdjust: boolean }} params
 */
async function adjustCategorySpending({ userId, categoryId, delta, autoAdjust }) {
    const category = await dbGet('SELECT * FROM categories WHERE id = ? AND userId = ?', [categoryId, userId]);
    if (!category) {
        return;
    }
    const baseSpent = Number(category.spentTotal ?? 0);
    const newSpent = Math.max(0, baseSpent + delta);
    await dbRun('UPDATE categories SET spentTotal = ?, updatedAt = ? WHERE id = ?', [newSpent, new Date().toISOString(), categoryId]);

    if (newSpent <= category.allocatedAmount) {
        await dbRun('UPDATE categories SET status = ?, overdrawnAmount = 0 WHERE id = ?', ['healthy', categoryId]);
        return;
    }

    const overdrawn = newSpent - category.allocatedAmount;
    if (autoAdjust) {
        await dbRun(
            `INSERT INTO category_history (categoryId, userId, at, oldAmount, newAmount, reason) VALUES (?, ?, ?, ?, ?, ?)`,
            [categoryId, userId, new Date().toISOString(), category.allocatedAmount, newSpent, 'auto-adjust']
        );
        await dbRun(
            'UPDATE categories SET allocatedAmount = ?, status = ?, overdrawnAmount = 0 WHERE id = ?',
            [newSpent, 'adjusted', categoryId]
        );
    } else {
        await dbRun('UPDATE categories SET status = ?, overdrawnAmount = ? WHERE id = ?', ['overdrawn', overdrawn, categoryId]);
    }
}

export default router;
