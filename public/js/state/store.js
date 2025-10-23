// ======================= Application Store =======================

import { sampleData } from '../data/sampleData.js';
import { featureFlags } from '../config/featureFlags.js';

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function clone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

/**
 * Simple pub/sub store for managing global application state.
 * @typedef {ReturnType<typeof createStore>} ExpenseStore
 */

/**
 * @returns {ExpenseStore}
 */
export function createStore() {
    const state = {
        user: clone(sampleData.user),
        categories: clone(sampleData.categories),
        dayNotes: clone(sampleData.dayNotes),
        expenses: clone(sampleData.expenses),
        income: clone(sampleData.income),
        savings: clone(sampleData.savings),
        filters: {
            range: null,
            quick: 'today'
        },
        ui: {
            currentRoute: 'dashboard',
            navOpen: false,
            theme: 'system'
        }
    };

    /** @type {Record<string, Set<Function>>} */
    const listeners = {};

    /**
     * Subscribe to a slice of state changes.
     * @param {string} key
     * @param {(value: unknown) => void} handler
     * @returns {() => void}
     */
    function subscribe(key, handler) {
        if (!listeners[key]) {
            listeners[key] = new Set();
        }
        listeners[key].add(handler);
        return () => listeners[key].delete(handler);
    }

    /**
     * Emit changes to subscribed handlers.
     * @param {string} key
     */
    function emit(key) {
        if (!listeners[key]) {
            return;
        }
        listeners[key].forEach((handler) => handler(state[key]));
    }

    /**
     * Update the state immutably and emit change events.
     * @param {Partial<typeof state>} patch
     */
    function setState(patch) {
        const changedKeys = [];
        Object.entries(patch).forEach(([key, value]) => {
            if (value !== undefined) {
                state[key] = value;
                changedKeys.push(key);
            }
        });
        changedKeys.forEach(emit);
    }

    /**
     * Update UI slice.
     * @param {Partial<typeof state.ui>} patch
     */
    function updateUI(patch) {
        state.ui = { ...state.ui, ...patch };
        emit('ui');
    }

    /**
     * Update filters slice.
     * @param {Partial<typeof state.filters>} patch
     */
    function updateFilters(patch) {
        state.filters = { ...state.filters, ...patch };
        emit('filters');
    }

    /**
     * @returns {typeof state}
     */
    function getState() {
        return state;
    }

    async function persistPreferences(preferences) {
        const payload = {
            currency: preferences.currency,
            theme: preferences.theme,
            autoAdjustBudgets: Boolean(preferences.autoAdjustBudgets),
            resetDay: Number(preferences.resetDay ?? 1)
        };

        const response = await fetch('/api/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ preferences: payload })
        });

        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Preferences update failed: ${response.status} ${message}`);
        }

        const updatedUser = await response.json();
        if (updatedUser?.preferences) {
            state.user = {
                ...state.user,
                preferences: {
                    ...state.user.preferences,
                    ...updatedUser.preferences
                }
            };
            emit('user');
        }
    }

    /**
     * Update user preferences and emit change events.
     * @param {Partial<typeof state.user.preferences>} preferences
     */
    function updateUserPreferences(preferences) {
        state.user = {
            ...state.user,
            preferences: {
                ...state.user.preferences,
                ...preferences
            }
        };
        emit('user');

        persistPreferences(state.user.preferences).catch((error) => {
            console.error('Failed to persist user preferences', error);
        });
    }

    /**
     * @template T
     * @param {(state: typeof state) => T} selector
     * @returns {T}
     */
    function select(selector) {
        return selector(state);
    }

    /**
     * Add a new expense item and update linked aggregates.
     * @param {{ noteId: string, expense: import('../types.js').ExpenseItem }} payload
     */
    function addExpense({ noteId, expense }) {
        state.expenses.push(expense);
        let note = state.dayNotes.find((entry) => entry.id === noteId);
        if (!note) {
            note = {
                id: noteId,
                date: noteId,
                items: [],
                total: 0,
                createdAt: new Date().toISOString(),
                pinned: false
            };
            state.dayNotes.push(note);
        }
        note.items.push(expense.id);
        note.total = parseFloat((note.total + expense.amount).toFixed(2));

        const category = state.categories.find((cat) => cat.id === expense.categoryId);
        if (category && featureFlags.autoAdjustBudgets) {
            if (!category.spentTotal) {
                category.spentTotal = 0;
            }
            category.spentTotal = parseFloat((category.spentTotal + expense.amount).toFixed(2));
            const overBudget = category.spentTotal > category.allocatedAmount;
            const autoAdjustEnabled = state.user.preferences.autoAdjustBudgets;
            if (overBudget && autoAdjustEnabled) {
                // Initialize history array if it doesn't exist
                if (!category.history) {
                    category.history = [];
                }
                category.history.push({
                    at: new Date().toISOString(),
                    old: category.allocatedAmount,
                    new: category.spentTotal,
                    reason: 'auto-adjust'
                });
                category.allocatedAmount = category.spentTotal;
                category.overdrawnAmount = 0;
                category.status = 'adjusted';
            } else if (overBudget) {
                category.overdrawnAmount = parseFloat((category.spentTotal - category.allocatedAmount).toFixed(2));
                category.status = 'overdrawn';
            } else {
                category.overdrawnAmount = 0;
                category.status = 'healthy';
            }
        }
        emit('expenses');
        emit('dayNotes');
        emit('categories');
    }

    /**
     * Remove an expense from state and update aggregates.
     * @param {import('../types.js').ExpenseItem} expense
     */
    function removeExpense(expense) {
        const expenseIndex = state.expenses.findIndex((item) => item.id === expense.id);
        if (expenseIndex === -1) {
            return;
        }
        state.expenses.splice(expenseIndex, 1);
        const note = state.dayNotes.find((entry) => entry.id === expense.noteId);
        if (note) {
            note.items = note.items.filter((id) => id !== expense.id);
            note.total = parseFloat((note.total - expense.amount).toFixed(2));
        }
        const category = state.categories.find((cat) => cat.id === expense.categoryId);
        if (category) {
            category.spentTotal = parseFloat(((category.spentTotal ?? 0) - expense.amount).toFixed(2));
            if (category.spentTotal <= category.allocatedAmount) {
                category.status = 'healthy';
                category.overdrawnAmount = 0;
            }
        }
        emit('expenses');
        emit('dayNotes');
        emit('categories');
    }

    return {
        state,
        subscribe,
        setState,
        addExpense,
        updateUI,
        updateFilters,
        getState,
        updateUserPreferences,
        select,
        removeExpense
    };
}

export const store = createStore();
