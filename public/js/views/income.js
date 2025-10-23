// ======================= Income View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';

/**
 * Render the income sources overview.
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store, formatCurrency: Function }} context
 */
export function renderIncome(container, context) {
    clearElement(container);
    const { store, formatCurrency } = context;
    const { filters } = store.getState();

    const header = createElement('div', { classes: ['section-header'] });
    header.innerHTML = `
        <h2>Income Sources</h2>
        <p class="section-header__meta">Manage your income and track earnings.</p>
    `;
    container.appendChild(header);

    const refresh = () => renderIncome(container, context);

    if (filters.quick === 'year') {
        renderYearlyIncome(container, context);
    } else {
        renderMonthlyIncome(container, context, refresh);
    }
}

function renderMonthlyIncome(container, context, onRefresh) {
    const { store, formatCurrency } = context;
    const { income = [], user } = store.getState();

    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentMonth = currentDate.toISOString().slice(0, 7);

    const monthlyIncome = income
        .filter((item) => item?.createdAt?.slice(0, 7) === currentMonth)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const total = monthlyIncome.reduce((sum, item) => sum + (item.amount || 0), 0);

    const card = createElement('div', { classes: ['note-card'] });

    const cardHeader = createElement('div', { classes: ['note-card__header'] });
    cardHeader.innerHTML = `
        <h3 class="note-card__title">${monthName}</h3>
        <span class="note-card__total">${formatCurrency(total, user.preferences.currency)}</span>
    `;
    card.appendChild(cardHeader);

    const list = createElement('div', { classes: ['note-card__list'] });

    monthlyIncome.forEach((item) => {
        const row = createElement('div', { classes: ['income-row'] });
        row.innerHTML = `
            <span class="income-row__name">${item.name || 'Unnamed'}</span>
            <span class="income-row__amount">${formatCurrency(item.amount, user.preferences.currency)}</span>
            <div class="income-row__actions">
                <button class="button button--icon income-row__edit" data-action="edit-income" data-id="${item.id}" aria-label="Edit income">
                    <svg width="18" height="18" viewBox="0 0 24 24" class="icon" role="img" aria-hidden="true">
                        <use href="#icon-edit"></use>
                    </svg>
                </button>
                <button class="button button--icon income-row__delete" data-action="delete-income" data-id="${item.id}" aria-label="Delete income">
                    <svg width="18" height="18" viewBox="0 0 24 24" class="icon" role="img" aria-hidden="true">
                        <use href="#icon-trash"></use>
                    </svg>
                </button>
            </div>
        `;
        list.appendChild(row);
    });

    card.appendChild(list);

    const actions = createElement('div', { classes: ['note-card__footer'] });
    const addButton = createElement('button', {
        classes: ['note-card__add-fab', 'button', 'button--primary'],
        attrs: { type: 'button', 'aria-label': 'Add income' }
    });
    addButton.innerHTML = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" class="icon"><use href="#icon-plus" /></svg>`;
    addButton.addEventListener('click', () => showAddIncomeModal(store, user.preferences.currency, onRefresh));
    actions.appendChild(addButton);
    card.appendChild(actions);

    container.appendChild(card);
    bindIncomeActions(container, context, onRefresh);
}

function renderYearlyIncome(container, context) {
    const { store, formatCurrency } = context;
    const { income = [], user } = store.getState();
    const currentYear = new Date().getFullYear();
    const monthlyGroups = {};
    income.forEach((item) => {
        if (!item?.createdAt) {
            return;
        }
        const itemDate = new Date(item.createdAt);
        if (itemDate.getFullYear() !== currentYear) {
            return;
        }
        const monthKey = item.createdAt.slice(0, 7);
        if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = [];
        }
        monthlyGroups[monthKey].push(item);
    });

    const sortedMonths = Object.keys(monthlyGroups).sort().reverse();
    if (sortedMonths.length === 0) {
        const empty = createElement('p', { classes: ['empty-state'] });
        empty.textContent = 'No income recorded this year.';
        container.appendChild(empty);
        return;
    }
    sortedMonths.forEach((monthKey) => {
        const monthDate = new Date(`${monthKey}-01`);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const monthItems = monthlyGroups[monthKey].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const total = monthItems.reduce((sum, item) => sum + (item.amount || 0), 0);

        const card = createElement('div', { classes: ['note-card', 'note-card--readonly'] });

        const cardHeader = createElement('div', { classes: ['note-card__header'] });
        cardHeader.innerHTML = `
            <h3 class="note-card__title">${monthName}</h3>
            <span class="note-card__total">${formatCurrency(total, user.preferences.currency)}</span>
        `;
        card.appendChild(cardHeader);

        const list = createElement('div', { classes: ['note-card__list'] });
        monthItems.forEach((item) => {
            const row = createElement('div', { classes: ['income-row', 'income-row--readonly'] });
            row.innerHTML = `
                <span class="income-row__name">${item.name || 'Unnamed'}</span>
                <span class="income-row__amount">${formatCurrency(item.amount, user.preferences.currency)}</span>
            `;
            list.appendChild(row);
        });

        card.appendChild(list);
        container.appendChild(card);
    });
}

function bindIncomeActions(container, context, onRefresh) {
    const { store } = context;
    container.querySelectorAll('[data-action="edit-income"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openEditIncomeModal(store, id, onRefresh);
        });
    });

    container.querySelectorAll('[data-action="delete-income"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openDeleteIncomeModal(store, id, onRefresh);
        });
    });
}

function showAddIncomeModal(store, currency, onRefresh) {
    const overlay = createElement('div', { classes: ['modal-overlay'] });
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
    
    const modal = createElement('div', { classes: ['modal'] });
    modal.style.cssText = 'background:var(--color-surface);border-radius:16px;padding:24px;width:min(400px,90vw);box-shadow:var(--shadow-card);';
    
    modal.innerHTML = `
        <h3 style="margin:0 0 16px 0;">Add Income</h3>
        <form id="add-income-form">
            <div style="margin-bottom:16px;">
                <label for="income-name" style="display:block;margin-bottom:8px;font-weight:500;">Description</label>
                <input id="income-name" name="name" type="text" required style="width:100%;padding:10px;border:1px solid var(--color-border);border-radius:8px;font-size:0.875rem;" />
            </div>
            <div style="margin-bottom:20px;">
                <label for="income-amount" style="display:block;margin-bottom:8px;font-weight:500;">Amount (${currency})</label>
                <input id="income-amount" name="amount" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" required style="width:100%;padding:10px;border:1px solid var(--color-border);border-radius:8px;font-size:0.875rem;" />
            </div>
            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button type="button" id="cancel-income" class="button">Cancel</button>
                <button type="submit" class="button button--primary">Confirm</button>
            </div>
        </form>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const form = modal.querySelector('#add-income-form');
    const cancelBtn = modal.querySelector('#cancel-income');
    
    cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name');
        const amount = parseFloat(formData.get('amount'));
        
        if (!name || isNaN(amount) || amount <= 0) {
            showToast('Please enter valid description and amount');
            return;
        }
        
        try {
            const response = await fetch('/api/income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    amount,
                    frequency: 'one-time',
                    payday: null
                })
            });
            
            if (response.ok) {
                showToast('Income added successfully');
                const created = await response.json();
                const state = store.getState();
                const nextIncome = [created, ...(state.income ?? [])];
                store.setState({ income: nextIncome });
                document.body.removeChild(overlay);
                onRefresh();
            } else {
                throw new Error('Failed to add income');
            }
        } catch (error) {
            showToast('Error adding income');
        }
    });
    
    modal.querySelector('#income-name').focus();
}

function openEditIncomeModal(store, id, onRefresh) {
    const { income = [] } = store.getState();
    const target = income.find((item) => item.id === id);
    if (!target) {
        showToast('Income not found');
        return;
    }

    const overlay = createElement('div', { classes: ['modal-overlay'] });
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';

    const modal = createElement('div', { classes: ['modal'] });
    modal.style.cssText = 'background:var(--color-surface);border-radius:16px;padding:24px;width:min(400px,90vw);box-shadow:var(--shadow-card);';

    modal.innerHTML = `
        <h3 style="margin:0 0 16px 0;">Edit Income</h3>
        <form id="edit-income-form">
            <div style="margin-bottom:16px;">
                <label for="edit-income-name" style="display:block;margin-bottom:8px;font-weight:500;">Description</label>
                <input id="edit-income-name" name="name" type="text" required style="width:100%;padding:10px;border:1px solid var(--color-border);border-radius:8px;font-size:0.875rem;" value="${target.name ?? ''}" />
            </div>
            <div style="margin-bottom:20px;">
                <label for="edit-income-amount" style="display:block;margin-bottom:8px;font-weight:500;">Amount</label>
                <input id="edit-income-amount" name="amount" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" required style="width:100%;padding:10px;border:1px solid var(--color-border);border-radius:8px;font-size:0.875rem;" value="${target.amount}" />
            </div>
            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button type="button" id="edit-income-cancel" class="button">Cancel</button>
                <button type="submit" class="button button--primary">Save</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#edit-income-form');
    const cancelBtn = modal.querySelector('#edit-income-cancel');

    function close() {
        document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    modal.querySelector('#edit-income-name').focus();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = (formData.get('name') ?? '').toString().trim();
        const amountValue = (formData.get('amount') ?? '').toString().replace(',', '.');
        const amount = parseFloat(amountValue);

        if (!name || Number.isNaN(amount) || amount <= 0) {
            showToast('Enter a valid description and amount');
            return;
        }

        try {
            const response = await fetch(`/api/income/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    amount
                })
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            const updated = await response.json();
            const state = store.getState();
            const nextIncome = (state.income ?? []).map((item) => (item.id === id ? updated : item));
            store.setState({ income: nextIncome });
            showToast('Income updated');
            close();
            onRefresh();
        } catch (_error) {
            showToast('Error updating income');
        }
    });
}

function openDeleteIncomeModal(store, id, onRefresh) {
    const { income = [] } = store.getState();
    const target = income.find((item) => item.id === id);
    if (!target) {
        showToast('Income not found');
        return;
    }

    const overlay = createElement('div', { classes: ['modal-overlay'] });
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';

    const modal = createElement('div', { classes: ['modal'] });
    modal.style.cssText = 'background:var(--color-surface);border-radius:16px;padding:24px;width:min(360px,90vw);box-shadow:var(--shadow-card);';

    modal.innerHTML = `
        <h3 style="margin:0 0 12px 0;">Delete Income</h3>
        <p style="margin:0 0 20px 0;font-size:0.9rem;color:var(--color-muted);">
            Are you sure you want to delete <strong>${target.name || 'this income'}</strong>?
        </p>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button type="button" id="delete-income-cancel" class="button">Cancel</button>
            <button type="button" id="delete-income-confirm" class="button button--danger">Delete</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('#delete-income-cancel');
    const confirmBtn = modal.querySelector('#delete-income-confirm');

    function close() {
        document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    confirmBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/income/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            const state = store.getState();
            const nextIncome = (state.income ?? []).filter((item) => item.id !== id);
            store.setState({ income: nextIncome });
            showToast('Income deleted');
            close();
            onRefresh();
        } catch (_error) {
            showToast('Error removing income source');
        }
    });
}
