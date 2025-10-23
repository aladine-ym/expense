// ======================= Dashboard View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { formatReadableDate, isDateWithinRange } from '../utils/date.js';
import { showToast } from '../ui/toast.js';
import { showConfirm } from '../ui/confirm.js';
import { nanoid } from '../vendor/nanoid.js';
import { createExpense, createNote } from '../utils/api.js';

/**
 * Render the dashboard (notes grid) into the provided container.
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store, formatCurrency: (amount: number, currency: string) => string }} context
 */
export function renderDashboard(container, context) {
    clearElement(container);
    
    // Remove "Add Previous Day" button if it exists (cleanup when switching filters)
    const existingFab = document.getElementById('fab-prev');
    if (existingFab) {
        existingFab.remove();
    }

    const { store: appStore, formatCurrency } = context;
    const { dayNotes, expenses, categories, filters, user } = appStore.getState();
    const range = filters.range;
    const currency = user.preferences.currency;
    const categoriesMap = new Map(categories.map((category) => [category.id, category]));
    const expensesMap = new Map(expenses.map((expense) => [expense.id, expense]));

    // Ensure today's empty note exists (auto-create if missing) BEFORE filtering
    const todayIso = new Date().toISOString().slice(0, 10);
    if (!dayNotes.some((n) => n.id === todayIso)) {
        appStore.addExpense({
            noteId: todayIso,
            expense: {
                id: 'seed-' + todayIso,
                type: 'seed',
                amount: 0,
                currency: user.preferences.currency,
                categoryId: categories[0]?.id ?? '',
                noteId: todayIso,
                createdAt: new Date().toISOString(),
                tags: []
            }
        });
        // Remove the seed expense so note remains empty with total 0
        const created = appStore.getState().expenses.find((e) => e.id === 'seed-' + todayIso);
        if (created) {
            appStore.removeExpense(created);
        }
    }

    // After potential mutation, re-read notes for filtering
    const currentNotes = appStore.getState().dayNotes;
    const filteredNotes = filters.quick === 'year'
        ? currentNotes
        : (range ? currentNotes.filter((note) => isDateWithinRange(note.date, range)) : currentNotes);

    if (filters.quick !== 'year' && !filteredNotes.length) {
        const emptyState = createElement('div', { classes: ['empty-state'] });
        emptyState.innerHTML = `
            <p>No expenses found in this range.</p>
            <p class="empty-state__hint">Use the quick add on today's note or add a previous day from the Year section.</p>
        `;
        container.appendChild(emptyState);
        // continue to render year summary below
    }

    const sortedNotes = [...filteredNotes].sort((a, b) => (a.date < b.date ? 1 : -1));

    if (filters.quick !== 'year') {
        // ensure previous-year FAB is removed when not in year view
        const staleFab = document.getElementById('fab-prev');
        if (staleFab) {
            staleFab.remove();
        }
        sortedNotes.forEach((note) => {
        const card = createElement('article', { classes: ['note-card'], attrs: { 'data-note-id': note.id } });

        const header = createElement('header', { classes: ['note-card__header'] });
        const title = createElement('h2', { classes: ['note-card__title'] });
        title.textContent = formatReadableDate(note.date);
        header.appendChild(title);

        const totalBadge = createElement('div', { classes: ['note-card__total'] });
        totalBadge.textContent = formatCurrency(note.total, currency);
        header.appendChild(totalBadge);

        card.appendChild(header);

        const list = createElement('div', { classes: ['note-card__expenses'] });
        // Reverse the items array so most recent expenses appear first
        [...note.items].reverse().forEach((expenseId) => {
            const expense = expensesMap.get(expenseId);
            if (!expense) {
                return;
            }
            const row = createElement('div', { classes: ['expense-row'], attrs: { 'data-expense-id': expense.id } });
            const category = categoriesMap.get(expense.categoryId);

            const categoryTag = createElement('span', { classes: ['expense-row__category'] });
            
            // Add color indicator to category tag
            if (category && category.color) {
                const colorDot = createElement('span', { 
                    classes: ['category-color-dot'],
                    attrs: { 'aria-hidden': 'true' }
                });
                colorDot.style.backgroundColor = category.color;
                categoryTag.appendChild(colorDot);
            }
            
            const categoryText = createElement('span');
            categoryText.textContent = category ? category.name : 'Unknown';
            categoryTag.appendChild(categoryText);

            const amount = createElement('span', { classes: ['expense-row__amount'] });
            amount.textContent = formatCurrency(expense.amount, expense.currency ?? currency);

            const controls = createElement('div', { classes: ['expense-row__controls'] });
            
            // Delete button with red icon
            const deleteBtn = createElement('button', {
                classes: ['icon-button', 'icon-button--danger'],
                attrs: { type: 'button', 'aria-label': 'Delete expense' }
            });
            deleteBtn.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-trash" /></svg>';
            deleteBtn.addEventListener('click', async () => {
                const confirmed = await showConfirm('Are you sure you want to delete this expense?', 'Delete', 'Cancel');
                if (confirmed) {
                    try {
                        appStore.removeExpense(expense);
                        showToast('Expense deleted', 'success');
                        const container = document.getElementById('view-container');
                        if (container) {
                            renderDashboard(container, { store: appStore, formatCurrency });
                        }
                    } catch (error) {
                        console.error('Error deleting expense:', error);
                        showToast('Failed to delete expense', 'error');
                    }
                }
            });
            controls.appendChild(deleteBtn);

            row.append(categoryTag, amount, controls);
            list.appendChild(row);
        });
        card.appendChild(list);

        const quickAdd = createElement('form', {
            classes: ['note-card__quick-add'],
            attrs: { 'data-note-add': note.id }
        });
        quickAdd.innerHTML = `
            <label class="sr-only" for="combo-${note.id}">Category and description</label>
            <select id="combo-${note.id}" name="combo" aria-label="Category and description">
                ${categories.map((cat) => `<option value="${cat.id}">● ${cat.name}</option>`).join('')}
            </select>
            <label class="sr-only" for="amount-${note.id}">Amount</label>
            <input id="amount-${note.id}" name="amount" type="text" placeholder="0.00" aria-label="Amount" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" />
            <button type="submit" class="button button--primary">Add</button>
        `;
        quickAdd.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(quickAdd);
            const categoryId = formData.get('combo');
            const selected = categories.find((c) => c.id === categoryId);
            const type = selected ? selected.name : '';
            const amount = Number(formData.get('amount'));
            if (!categoryId || Number.isNaN(amount) || amount <= 0) {
                showToast('Select category and enter amount');
                return;
            }
            
            try {
                // Ensure note exists in database (might only be in client store)
                const noteExists = await fetch(`/api/notes/${note.id}`, { credentials: 'include' });
                if (!noteExists.ok) {
                    await createNote(note.id, note.pinned);
                }
                
                // Create the expense
                const payload = await createExpense({ noteId: note.id, amount, categoryId, currency, type });
                
                // Add to store for instant UI update
                const exp = {
                    id: payload.id ?? nanoid(),
                    type,
                    amount,
                    currency,
                    categoryId,
                    noteId: note.id,
                    createdAt: payload.createdAt ?? new Date().toISOString(),
                    tags: []
                };
                appStore.addExpense({ noteId: note.id, expense: exp });
                showToast('Expense added', 'success');
                
                // Clear the form
                quickAdd.reset();
                
                // Trigger re-render
                const container = document.getElementById('view-container');
                if (container) {
                    renderDashboard(container, { store: appStore, formatCurrency });
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                showToast('Failed to add expense', 'error');
            }
        });

        card.appendChild(quickAdd);

        applySwipeHandlers(card, note);

            container.appendChild(card);
        });
    }

    // Append year summary when Year filter is active
    if (filters.quick === 'year') {
        renderYearSummary(container, context);
    }
    
    const isDashboard = appStore.getState().ui.currentRoute === 'dashboard';

    // Show "Add Previous Day" button only when This Month filter is active on dashboard route
    if (isDashboard && filters.quick === 'month') {
        renderAddPreviousDayButton(container, context);
    }
}

// Year summary and add-previous-day helper
export function renderYearSummary(container, context) {
    const { store: appStore, formatCurrency } = context;
    const { dayNotes, expenses, user } = appStore.getState();
    const currency = user.preferences.currency;
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, () => 0);
    for (const note of dayNotes) {
        if (note.date.startsWith(String(year))) {
            const monthIndex = Number(note.date.slice(5, 7)) - 1;
            months[monthIndex] = parseFloat((months[monthIndex] + note.total).toFixed(2));
        }
    }
    const section = createElement('section', { classes: ['section-header'] });
    section.innerHTML = `
        <h2>This Year</h2>
        <p class="section-header__meta">Totals per month (read-only)</p>
    `;
    container.appendChild(section);

    const grid = createElement('div', { classes: ['category-list'] });
    months.forEach((total, idx) => {
        const m = createElement('div', { classes: ['note-card'] });
        m.innerHTML = `<div class="note-card__header"><h3>${new Date(year, idx, 1).toLocaleString(undefined, { month: 'long' })}</h3><div class="note-card__total">${formatCurrency(total, currency)}</div></div>`;
        grid.appendChild(m);
    });
    container.appendChild(grid);
}

// Render "Add Previous Day" floating button
function renderAddPreviousDayButton(container, context) {
    const { store: appStore } = context;
    const { user, categories } = appStore.getState();
    const currency = user.preferences.currency;
    
    // Remove any existing instance to avoid duplicates
    const existing = document.getElementById('fab-prev');
    if (existing) {
        existing.remove();
    }
    
    // Floating Add Previous Day (round button bottom-right)
    const addPrev = createElement('button', { classes: ['fab'], attrs: { type: 'button', id: 'fab-prev' } });
    addPrev.innerHTML = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" class="icon icon--fab"><use href="#icon-plus" /></svg>';
    addPrev.style.position = 'fixed';
    addPrev.style.bottom = '24px';
    addPrev.style.right = '24px';
    document.body.appendChild(addPrev);

    addPrev.addEventListener('click', () => {
        openAddPreviousModal({ appStore, currency, categories, onDone: () => {
            renderDashboard(container, context);
        }});
    });
}

function openAddPreviousModal({ appStore, currency, categories, onDone }) {
    // overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.35)';
    overlay.style.zIndex = '1000';

    // modal card
    const card = document.createElement('div');
    card.style.position = 'fixed';
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    card.style.background = 'var(--color-surface)';
    card.style.border = '1px solid var(--color-border)';
    card.style.borderRadius = '16px';
    card.style.boxShadow = 'var(--shadow-card)';
    card.style.padding = '20px';
    card.style.width = 'min(520px, 92vw)';

    card.innerHTML = `
        <div class="note-card__header" style="margin-bottom: 12px;">
            <h3 style="margin:0;">Add Previous Day</h3>
        </div>
        <form id="prev-form">
            <div id="prev-rows" style="display:flex; flex-direction:column; gap:12px;"></div>
            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top: 12px;">
                <button type="button" id="prev-cancel" class="button">Cancel</button>
                <button type="button" id="prev-add" class="button">Add</button>
                <button type="submit" class="button button--primary">Confirm</button>
            </div>
        </form>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const form = card.querySelector('#prev-form');
    const cancelBtn = card.querySelector('#prev-cancel');
    const addBtn = card.querySelector('#prev-add');
    const rowsContainer = card.querySelector('#prev-rows');
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    function addRow(defaults = {}) {
        const row = document.createElement('div');
        row.className = 'note-card__quick-add prev-day-row';
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.name = 'date';
        dateInput.required = true;
        dateInput.className = 'prev-day-date';
        if (defaults.date) dateInput.value = defaults.date;

        const select = document.createElement('select');
        select.name = 'combo';
        select.ariaLabel = 'Category';
        select.className = 'prev-day-category';
        select.innerHTML = categories.map((c) => `<option value="${c.id}">● ${c.name}</option>`).join('');
        if (defaults.categoryId) select.value = defaults.categoryId;

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.name = 'amount';
        amountInput.step = '0.01';
        amountInput.min = '0';
        amountInput.placeholder = '0.00';
        amountInput.inputMode = 'decimal';
        amountInput.required = true;
        amountInput.className = 'prev-day-amount';
        if (defaults.amount) amountInput.value = String(defaults.amount);

        row.append(dateInput, select, amountInput);
        rowsContainer.appendChild(row);
    }

    // seed first row with today and first category
    addRow({ date: new Date().toISOString().slice(0, 10), categoryId: categories[0]?.id });

    addBtn.addEventListener('click', () => {
        const last = rowsContainer.lastElementChild;
        const date = last ? (last.querySelector('input[name="date"]').value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
        addRow({ date, categoryId: categories[0]?.id });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entries = [];
        rowsContainer.querySelectorAll('.note-card__quick-add').forEach((row) => {
            const date = String(row.querySelector('input[name="date"]').value);
            const categoryId = String(row.querySelector('select[name="combo"]').value);
            const amount = Number(row.querySelector('input[name="amount"]').value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && categoryId && !Number.isNaN(amount) && amount > 0) {
                entries.push({ date, categoryId, amount });
            }
        });
        const grouped = entries.reduce((acc, it) => {
            (acc[it.date] ||= []).push(it);
            return acc;
        }, {});

        for (const [date, entries] of Object.entries(grouped)) {
            const exists = appStore.getState().dayNotes.some((n) => n.id === date);
            if (!exists) {
                try { await createNote(date, false); } catch {}
                // create empty client note (no expense) for instant UI
                appStore.addExpense({
                    noteId: date,
                    expense: {
                        id: 'seed-' + date,
                        type: 'seed',
                        amount: 0,
                        currency,
                        categoryId: entries[0].categoryId,
                        noteId: date,
                        createdAt: new Date().toISOString(),
                        tags: []
                    }
                });
                const created = appStore.getState().expenses.find((e) => e.id === 'seed-' + date);
                if (created) appStore.removeExpense(created);
            }
            for (const item of entries) {
                const selected = appStore.getState().categories.find((c) => c.id === item.categoryId);
                try {
                    const payload = await createExpense({ noteId: date, amount: item.amount, categoryId: item.categoryId, currency, type: selected ? selected.name : 'Expense' });
                    appStore.addExpense({
                        noteId: date,
                        expense: {
                            id: payload.id ?? 'prev-' + Date.now() + Math.random().toString(16).slice(2),
                            type: selected ? selected.name : 'Expense',
                            amount: item.amount,
                            currency,
                            categoryId: item.categoryId,
                            noteId: date,
                            createdAt: payload.createdAt ?? new Date().toISOString(),
                            tags: []
                        }
                    });
                } catch {}
            }
        }
        document.body.removeChild(overlay);
        if (typeof onDone === 'function') onDone();
    });
}

/**
 * Handle expense edit placeholder.
 * @param {import('../types.js').ExpenseItem} expense
 */
function onEditExpense(expense) {
    showToast(`Edit flow pending for ${expense.type}`);
}

/**
 * Handle deleting an expense via store and show undo toast.
 * @param {import('../types.js').ExpenseItem} expense
 */
function onDeleteExpense(appStore, expense) {
    const snapshot = structuredClone(appStore.getState());
    appStore.removeExpense(expense);
    showToast('Expense deleted (tap to undo)');
    // TEMP: undo implementation pending persistence layer
    window.__lastDeletedExpense = { expense, snapshot };
}

/**
 * Apply swipe gesture placeholder classes for mobile interactions.
 * @param {HTMLElement} card
 * @param {import('../types.js').DayNote} note
 */
function applySwipeHandlers(card, note) {
    if (!('ontouchstart' in window)) {
        return;
    }
    let startX = 0;
    let currentX = 0;
    let swiping = false;
    const threshold = 80;

    const onTouchStart = (event) => {
        startX = event.touches[0].clientX;
        swiping = true;
        card.classList.add('note-card--swiping');
    };

    const onTouchMove = (event) => {
        if (!swiping) {
            return;
        }
        currentX = event.touches[0].clientX - startX;
        card.style.transform = `translateX(${currentX}px)`;
    };

    const onTouchEnd = () => {
        card.classList.remove('note-card--swiping');
        card.style.transform = '';
        if (Math.abs(currentX) > threshold) {
            showToast(`Swipe action coming soon for ${note.date}`);
        }
        swiping = false;
        currentX = 0;
    };

    card.addEventListener('touchstart', onTouchStart);
    card.addEventListener('touchmove', onTouchMove);
    card.addEventListener('touchend', onTouchEnd);
}
