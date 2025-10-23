import { Router } from 'express';
import authRouter from './auth.js';
import userRouter from './user.js';
import notesRouter from './notes.js';
import categoriesRouter from './categories.js';
import incomeRouter from './income.js';
import savingsRouter from './savings.js';
import exportRouter from './export.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/user', requireAuth, userRouter);
router.use('/notes', requireAuth, notesRouter);
router.use('/categories', requireAuth, categoriesRouter);
router.use('/income', requireAuth, incomeRouter);
router.use('/savings', requireAuth, savingsRouter);
router.use('/export', requireAuth, exportRouter);

router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reset all data endpoint (keeps user and categories)
router.post('/reset-data', requireAuth, async (req, res) => {
    try {
        const { dbRun } = await import('../utils/db.js');
        const userId = req.session.userId;
        
        console.log('Resetting data for user:', userId);
        
        // Delete all user data except user account, categories, and savings goals
        await dbRun('DELETE FROM expenses WHERE userId = ?', [userId]);
        await dbRun('DELETE FROM day_notes WHERE userId = ?', [userId]);
        await dbRun('DELETE FROM savings_contributions WHERE userId = ?', [userId]);
        await dbRun('DELETE FROM income_sources WHERE userId = ?', [userId]);
        await dbRun('DELETE FROM category_history WHERE userId = ?', [userId]);
        
        // Reset category spent totals
        await dbRun('UPDATE categories SET spentTotal = 0, overdrawnAmount = 0 WHERE userId = ?', [userId]);
        
        // Reset savings goals to 0 target (keep the goals but reset them)
        await dbRun('UPDATE savings_goals SET targetAmount = 0 WHERE userId = ?', [userId]);
        
        console.log('Data reset successful for user:', userId);
        
        res.json({ 
            success: true, 
            message: 'All data has been reset successfully' 
        });
    } catch (error) {
        console.error('Reset data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reset data: ' + error.message 
        });
    }
});

// Debug endpoint to check database connectivity
router.get('/debug/db', async (_req, res) => {
    try {
        const { dbAll } = await import('../utils/db.js');
        const users = await dbAll('SELECT COUNT(*) as count FROM users', []);
        const categories = await dbAll('SELECT COUNT(*) as count FROM categories', []);
        const notes = await dbAll('SELECT COUNT(*) as count FROM day_notes', []);
        const expenses = await dbAll('SELECT COUNT(*) as count FROM expenses', []);
        
        res.json({
            status: 'connected',
            tables: {
                users: users[0]?.count ?? 0,
                categories: categories[0]?.count ?? 0,
                notes: notes[0]?.count ?? 0,
                expenses: expenses[0]?.count ?? 0
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message,
            stack: error.stack 
        });
    }
});

export default router;
