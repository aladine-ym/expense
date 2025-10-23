import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dbAll, dbGet } from '../utils/db.js';
import { deriveKeyFromPassphrase, encryptPayload } from '../utils/encryption.js';
import { validateRequest } from '../middleware/validate.js';
import { Parser } from 'json2csv';

const router = Router();

router.post(
    '/json',
    validateRequest({
        body: {
            passphrase: { type: 'string', required: true, min: 8 }
        }
    }),
    asyncHandler(async (req, res) => {
        const dataset = await buildDataset(req.user.id);
        const { key, salt } = deriveKeyFromPassphrase(req.body.passphrase);
        const encrypted = encryptPayload(dataset, key);
        res.json({ ...encrypted, salt: salt.toString('base64') });
    })
);

router.post(
    '/csv',
    validateRequest({
        body: {
            passphrase: { type: 'string', required: true, min: 8 }
        }
    }),
    asyncHandler(async (req, res) => {
        const dataset = await buildDataset(req.user.id);
        const parser = new Parser({ fields: ['table', 'record'] });
        const flatRows = flattenDataset(dataset);
        const csv = parser.parse(flatRows);
        const { key, salt } = deriveKeyFromPassphrase(req.body.passphrase);
        const encrypted = encryptPayload({ csv }, key);
        res.json({ ...encrypted, salt: salt.toString('base64') });
    })
);

async function buildDataset(userId) {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const categories = await dbAll('SELECT * FROM categories WHERE userId = ?', [userId]);
    const notes = await dbAll('SELECT * FROM day_notes WHERE userId = ?', [userId]);
    const expenses = await dbAll('SELECT * FROM expenses WHERE userId = ?', [userId]);
    const income = await dbAll('SELECT * FROM income_sources WHERE userId = ?', [userId]);
    const savings = await dbAll('SELECT * FROM savings_goals WHERE userId = ?', [userId]);
    return {
        exportedAt: new Date().toISOString(),
        user,
        categories,
        notes,
        expenses,
        income,
        savings
    };
}

function flattenDataset(dataset) {
    const rows = [];
    const pushRows = (table, records) => {
        records.forEach((record) => {
            rows.push({ table, record: JSON.stringify(record) });
        });
    };
    pushRows('categories', dataset.categories ?? []);
    pushRows('day_notes', dataset.notes ?? []);
    pushRows('expenses', dataset.expenses ?? []);
    pushRows('income_sources', dataset.income ?? []);
    pushRows('savings_goals', dataset.savings ?? []);
    return rows;
}

export default router;
