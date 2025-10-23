// ======================= Categories View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { formatCurrency } from '../utils/currency.js';
import { showToast } from '../ui/toast.js';
import { createModal } from '../ui/modal.js';

/**
 * Render the categories and budget overview.
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store, formatCurrency: typeof formatCurrency }} context
 */
export function renderCategories(container, context) {
    clearElement(container);
    const { store } = context;
    const { categories, user } = store.getState();
    const currency = user.preferences.currency;

    const header = createElement('div', { classes: ['section-header'] });
    header.innerHTML = `
        <h2>Budgets</h2>
        <p class="section-header__meta">Manage your category allocations and track spending.</p>
    `;
    container.appendChild(header);

    const list = createElement('div', { classes: ['category-list'] });

    categories.forEach((category) => {
        const baseClasses = ['category-card'];
        if (category.status === 'overdrawn') {
            baseClasses.push('category-card--overdrawn');
        }
        const card = createElement('article', { classes: baseClasses, attrs: { 'data-category-id': category.id } });
        const titleRow = createElement('header', { classes: ['category-card__header'] });
        
        // Add color indicator
        const colorIndicator = createElement('span', { 
            classes: ['category-color-indicator'],
            attrs: { 'aria-hidden': 'true' }
        });
        colorIndicator.style.backgroundColor = category.color;
        titleRow.appendChild(colorIndicator);
        
        const name = createElement('h3', { classes: ['category-card__title'] });
        name.textContent = category.name;
        titleRow.appendChild(name);

        if (category.status === 'overdrawn') {
            const badge = createElement('span', { classes: ['badge', 'badge--danger'] });
            badge.textContent = `Overdrawn by ${formatCurrency(category.overdrawnAmount ?? 0, currency)}`;
            titleRow.appendChild(badge);
        } else if (category.status === 'adjusted') {
            const badge = createElement('span', { classes: ['badge', 'badge--warning'] });
            badge.textContent = 'Auto-adjusted';
            titleRow.appendChild(badge);
        }

        card.appendChild(titleRow);

        const meter = createProgressMeter({
            spent: category.spentTotal ?? 0,
            allocated: category.allocatedAmount,
            currency
        });
        card.appendChild(meter);

        const stats = createElement('dl', { classes: ['category-card__stats'] });
        stats.innerHTML = `
            <div>
                <dt>Spent</dt>
                <dd>${formatCurrency(category.spentTotal ?? 0, currency)}</dd>
            </div>
            <div>
                <dt>Allocated</dt>
                <dd>${formatCurrency(category.allocatedAmount, currency)}</dd>
            </div>
        `;
        card.appendChild(stats);

        const actions = createElement('div', { classes: ['category-card__actions'] });
        const adjustButton = createElement('button', {
            classes: ['button', 'button--ghost'],
            attrs: { type: 'button', 'data-action': 'adjust', 'data-id': category.id }
        });
        adjustButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" class="icon"><use href="#icon-edit" /></svg>
            Adjust budget
        `;
        actions.appendChild(adjustButton);

        const historyButton = createElement('button', {
            classes: ['button', 'button--ghost'],
            attrs: { type: 'button', 'data-action': 'history', 'data-id': category.id }
        });
        historyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" class="icon"><use href="#icon-history" /></svg>
            View history
        `;
        actions.appendChild(historyButton);

        card.appendChild(actions);
        list.appendChild(card);
    });

    container.appendChild(list);
    bindCategoryActions(container, context);
}

function bindCategoryActions(container, context) {
    container.querySelectorAll('[data-action="adjust"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            handleAdjustBudget(id, context);
        });
    });

    container.querySelectorAll('[data-action="history"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            handleViewHistory(id, context);
        });
    });
}

async function handleAdjustBudget(categoryId, context) {
    // fetch existing category to preserve required fields
    try {
        const categoriesResp = await fetch('/api/categories', { credentials: 'include' });
        if (!categoriesResp.ok) throw new Error('Failed to load categories');
        const payload = await categoriesResp.json();
        const existing = payload.categories.find(c => c.id === categoryId);
        if (!existing) {
            showToast('Category not found');
            return;
        }
        const overlay = createModal({
            title: 'Adjust Budget',
            content: `
                <form id="adjust-budget-form" class="modal-form modal-form--vertical">
                    <div class="modal-form__group">
                        <label class="modal-form__label" for="adjust-budget-input">
                            Allocated Amount
                        </label>
                        <div class="modal-form__field">
                            <span class="modal-form__prefix">${escapeHtml(context?.store?.getState()?.user?.preferences?.currency ?? '$')}</span>
                            <input
                                type="number"
                                id="adjust-budget-input"
                                class="modal-form__input"
                                step="0.01"
                                min="0"
                                required
                                value="${existing.allocatedAmount ?? 0}"
                                aria-describedby="adjust-budget-hint"
                            />
                        </div>
                        <p id="adjust-budget-hint" class="modal-form__hint">
                            Enter the total budget allocated to this category.
                        </p>
                    </div>
                    <div class="modal-summary">
                        <div class="modal-summary__card">
                            <div class="modal-summary__label">Currently allocated</div>
                            <div class="modal-summary__value">${formatCurrency(existing.allocatedAmount ?? 0, context?.store?.getState()?.user?.preferences?.currency ?? 'USD')}</div>
                        </div>
                        <div class="modal-summary__card modal-summary__card--accent">
                            <div class="modal-summary__label">Spent this period</div>
                            <div class="modal-summary__value">${formatCurrency(existing.spentTotal ?? 0, context?.store?.getState()?.user?.preferences?.currency ?? 'USD')}</div>
                        </div>
                    </div>
                </form>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary'
                },
                {
                    text: 'Save',
                    type: 'primary',
                    action: async () => {
                        const input = overlay.querySelector('#adjust-budget-input');
                        const raw = input?.value ?? '';
                        const nextAmount = Number.parseFloat(raw);

                        if (!Number.isFinite(nextAmount)) {
                            showToast('Enter a valid amount');
                            return false;
                        }

                        const response = await fetch(`/api/categories/${categoryId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                name: existing.name,
                                color: existing.color,
                                icon: existing.icon,
                                allocatedAmount: nextAmount
                            })
                        });

                        if (response.ok) {
                            showToast('Budget updated');
                            window.location.reload();
                        } else {
                            showToast('Error updating budget');
                            return false;
                        }
                    }
                }
            ]
        });
    } catch (_e) {
        showToast('Error updating budget');
    }
}

async function handleViewHistory(categoryId, context) {
    try {
        const response = await fetch('/api/categories', { credentials: 'include' });

        if (response.ok) {
            const data = await response.json();
            const history = data.history.filter(h => h.categoryId === categoryId);

            if (history.length === 0) {
                showToast('No history available');
                return;
            }
            const currency = context?.store?.getState()?.user?.preferences?.currency ?? 'USD';
            const entries = history.map((h) => {
                const when = new Date(h.at).toLocaleString();
                const oldAmount = typeof h.oldAmount === 'number' ? h.oldAmount : 0;
                const newAmount = typeof h.newAmount === 'number' ? h.newAmount : 0;
                const delta = newAmount - oldAmount;
                const reason = (h.reason ?? '').toLowerCase();
                const isManual = reason === 'manual-adjust';
                const isAuto = reason === 'auto-adjust';
                const reasonLabel = isManual ? 'Manual adjustment' : isAuto ? 'Auto-adjust' : 'Update';
                const reasonClass = isManual
                    ? 'history-entry__badge--manual'
                    : isAuto
                        ? 'history-entry__badge--auto'
                        : 'history-entry__badge--generic';
                return `
                    <li class="history-entry">
                        <div class="history-entry__meta">
                            <span class="history-entry__time">${escapeHtml(when)}</span>
                            <span class="history-entry__badge ${reasonClass}">${escapeHtml(reasonLabel)}</span>
                        </div>
                        <div class="history-entry__amounts">
                            <span class="history-entry__from">${escapeHtml(formatCurrency(oldAmount, currency))}</span>
                            <span class="history-entry__arrow" aria-hidden="true">→</span>
                            <span class="history-entry__to">${escapeHtml(formatCurrency(newAmount, currency))}</span>
                        </div>
                        <div class="history-entry__delta ${delta >= 0 ? 'history-entry__delta--increase' : 'history-entry__delta--decrease'}">
                            ${delta >= 0 ? '+' : ''}${escapeHtml(formatCurrency(delta, currency))}
                        </div>
                    </li>
                `;
            }).join('');

            createModal({
                title: 'Budget History',
                content: `
                    <div class="history-dialog">
                        <ul class="history-dialog__list">${entries}</ul>
                    </div>
                `,
                buttons: [
                    {
                        text: 'Close',
                        type: 'primary'
                    }
                ]
            });
        } else {
            throw new Error('Failed to fetch history');
        }
    } catch (error) {
        showToast('Error loading history');
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Create a progress meter component.
 * @param {{ spent: number, allocated: number, currency: string }} params
 * @returns {HTMLElement}
 */
function createProgressMeter({ spent, allocated, currency }) {
    const progress = Math.min(1, allocated === 0 ? 0 : spent / allocated);
    const wrapper = createElement('div', { classes: ['progress-meter'] });
    const bar = createElement('div', { classes: ['progress-meter__bar'] });
    const fill = createElement('div', { classes: ['progress-meter__fill'] });
    fill.style.setProperty('--progress', `${progress * 100}%`);
    bar.appendChild(fill);

    // Labels removed - stats are shown below the progress bar
    wrapper.appendChild(bar);
    return wrapper;
}
