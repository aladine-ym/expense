// ======================= Shared Types =======================

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string|null} email
 * @property {string|null} displayName
 * @property {'guest'|'google'} authProvider
 * @property {string} createdAt
 * @property {{currency: string, theme: 'light'|'dark'|'system', autoAdjustBudgets: boolean}} preferences
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {string} icon
 * @property {number} allocatedAmount
 * @property {{at: string, old: number, new: number, reason: string}[]} history
 * @property {number} [spentTotal]
 */

/**
 * @typedef {Object} ExpenseItem
 * @property {string} id
 * @property {string} type
 * @property {number} amount
 * @property {string} currency
 * @property {string} categoryId
 * @property {string} noteId
 * @property {string} createdAt
 * @property {string[]} tags
 */

/**
 * @typedef {Object} DayNote
 * @property {string} id
 * @property {string} date
 * @property {string[]} items
 * @property {number} total
 * @property {string} createdAt
 * @property {boolean} pinned
 */

/**
 * @typedef {Object} IncomeSource
 * @property {string} id
 * @property {string} name
 * @property {number} amount
 * @property {'one-time'|'monthly'} frequency
 * @property {string} [payday]
 */

/**
 * @typedef {Object} SavingsGoal
 * @property {string} id
 * @property {string} title
 * @property {number} targetAmount
 * @property {number} currentSaved
 * @property {string} targetDate
 * @property {{enabled: boolean, amount: number, frequency: string}} autoContribution
 */
