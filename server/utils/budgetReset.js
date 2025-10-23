import { dbAll, dbRun, dbGet } from './db.js';

/**
 * Check if budget reset is needed and perform it if necessary.
 * This should be called on every page load or API request.
 * @param {string} userId - User ID to check reset for
 */
export async function checkAndResetBudgets(userId) {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return;
        }

        const resetDay = Number(user.resetDay ?? 1);
        const lastResetDate = user.lastResetDate;
        const now = new Date();
        
        // Calculate the expected reset date for current month
        const currentResetDate = calculateResetDate(now, resetDay);
        
        // Check if we need to reset
        if (shouldReset(lastResetDate, currentResetDate, now)) {
            await performBudgetReset(userId, currentResetDate.toISOString());
            console.log(`Budget reset performed for user ${userId} on ${currentResetDate.toISOString()}`);
        }
    } catch (error) {
        console.error('Error checking budget reset:', error);
    }
}

/**
 * Calculate the reset date for a given month and reset day.
 * @param {Date} referenceDate - Reference date (usually current date)
 * @param {number} resetDay - Day of month to reset (1-29)
 * @returns {Date} - The reset date
 */
function calculateResetDate(referenceDate, resetDay) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    // Handle February special case (max day 28)
    let effectiveResetDay = resetDay;
    if (month === 1 && resetDay > 28) {
        effectiveResetDay = 28;
    }
    
    // Create reset date for current month
    const resetDate = new Date(year, month, effectiveResetDay, 0, 0, 0, 0);
    
    return resetDate;
}

/**
 * Determine if a budget reset should occur.
 * @param {string|null} lastResetDate - ISO string of last reset date
 * @param {Date} currentResetDate - Calculated reset date for current period
 * @param {Date} now - Current date/time
 * @returns {boolean} - True if reset should occur
 */
function shouldReset(lastResetDate, currentResetDate, now) {
    // If never reset before, DON'T reset automatically
    // User needs to have spending data first
    if (!lastResetDate) {
        return false;
    }
    
    const lastReset = new Date(lastResetDate);
    
    // Reset if:
    // 1. Current date is past or equal to the reset date for this month
    // 2. Last reset was before the current reset date (different month/period)
    return now >= currentResetDate && lastReset < currentResetDate;
}

/**
 * Perform the actual budget reset.
 * @param {string} userId - User ID
 * @param {string} resetDate - ISO string of reset date
 */
async function performBudgetReset(userId, resetDate) {
    // Get all categories for this user
    const categories = await dbAll('SELECT * FROM categories WHERE userId = ?', [userId]);
    
    // Reset each category's spentTotal to 0
    for (const category of categories) {
        if (category.spentTotal > 0) {
            // Log the reset in history
            await dbRun(
                `INSERT INTO category_history (categoryId, userId, at, oldAmount, newAmount, reason) VALUES (?, ?, ?, ?, ?, ?)`,
                [category.id, userId, resetDate, category.spentTotal, 0, 'monthly-reset']
            );
        }
        
        // Reset spending and status
        await dbRun(
            `UPDATE categories SET spentTotal = 0, status = 'healthy', overdrawnAmount = 0, updatedAt = ? WHERE id = ?`,
            [resetDate, category.id]
        );
    }
    
    // Update user's lastResetDate
    await dbRun(
        `UPDATE users SET lastResetDate = ? WHERE id = ?`,
        [resetDate, userId]
    );
}
