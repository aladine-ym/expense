// ======================= Savings View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { formatCurrency } from '../utils/currency.js';
import { showToast } from '../ui/toast.js';
import { createModal } from '../ui/modal.js';

/**
 * Render savings goals overview.
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store, formatCurrency: typeof formatCurrency }} context
 */
export function renderSavings(container, context) {
    clearElement(container);
    const { store } = context;
    const { savings, user } = store.getState();
    const currency = user.preferences.currency;
    
    // Store context for event handlers
    window.__savingsContext = { store, currency };

    const header = createElement('div', { classes: ['section-header'] });
    header.innerHTML = `
        <h2>Savings Goals</h2>
        <p class="section-header__meta">Track progress toward savings milestones and manage auto-contributions.</p>
    `;
    container.appendChild(header);

    const list = createElement('div', { classes: ['goal-list'] });

    savings.forEach((goal) => {
        const card = createElement('article', { classes: ['goal-card'], attrs: { 'data-goal-id': goal.id } });
        const titleRow = createElement('header', { classes: ['goal-card__header'] });
        const name = createElement('h3', { classes: ['goal-card__title'] });
        name.textContent = 'Savings Funds';
        titleRow.appendChild(name);

        card.appendChild(titleRow);

        // Get contributions from goal data
        const contributions = goal.contributions || [];
        
        // Calculate total saved from contributions
        const totalSaved = goal.currentSaved || 0;

        const meter = createGoalMeter({
            current: totalSaved,
            target: goal.targetAmount
        });
        card.appendChild(meter);

        const stats = createElement('dl', { classes: ['goal-card__stats'] });
        const statsDiv1 = createElement('div');
        const dt1 = createElement('dt');
        dt1.textContent = 'Saved';
        const dd1 = createElement('dd');
        dd1.textContent = formatCurrency(totalSaved, currency);
        statsDiv1.append(dt1, dd1);
        
        const statsDiv2 = createElement('div');
        const dt2 = createElement('dt');
        dt2.textContent = 'Target';
        const dd2 = createElement('dd');
        dd2.textContent = formatCurrency(goal.targetAmount, currency);
        
        const editTargetBtn = createElement('button', {
            classes: ['goal-card__edit-target'],
            attrs: { type: 'button', 'data-action': 'edit-target', 'data-id': goal.id, 'aria-label': 'Edit target' }
        });
        editTargetBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" class="icon"><use href="#icon-edit" /></svg>';
        
        statsDiv2.append(dt2, dd2, editTargetBtn);
        stats.append(statsDiv1, statsDiv2);
        card.appendChild(stats);

        // Funds history section
        const fundsSection = createElement('div', { classes: ['goal-card__funds'] });
        const fundsTitle = createElement('h4', { classes: ['goal-card__funds-title'] });
        fundsTitle.textContent = 'Recent Contributions';
        fundsSection.appendChild(fundsTitle);

        const fundsList = createElement('ul', { classes: ['funds-list'] });
        
        contributions.forEach(fund => {
            const fundItem = createElement('li', { classes: ['funds-list__item'] });
            fundItem.innerHTML = `
                <div class="funds-list__info">
                    <span class="funds-list__date">${new Date(fund.date).toLocaleDateString()}</span>
                    <span class="funds-list__amount">${formatCurrency(fund.amount, currency)}</span>
                </div>
                <button class="funds-list__delete" data-action="delete-fund" data-fund-id="${fund.id}" aria-label="Delete fund">
                    <svg width="16" height="16" viewBox="0 0 24 24" class="icon"><use href="#icon-trash" /></svg>
                </button>
            `;
            fundsList.appendChild(fundItem);
        });
        
        fundsSection.appendChild(fundsList);
        card.appendChild(fundsSection);

        const actions = createElement('div', { classes: ['goal-card__actions'] });
        
        const cashOutButton = createElement('button', {
            classes: ['button-round', 'button-round--success'],
            attrs: { type: 'button', 'data-action': 'cash-out', 'data-id': goal.id, 'aria-label': 'Cash-out', 'title': 'Cash-out' }
        });
        cashOutButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
            </svg>
        `;
        actions.appendChild(cashOutButton);
        
        const addSavingsButton = createElement('button', {
            classes: ['button-round', 'button-round--primary'],
            attrs: { type: 'button', 'data-action': 'add-savings', 'data-id': goal.id, 'aria-label': 'Add Savings', 'title': 'Add Savings' }
        });
        addSavingsButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        actions.appendChild(addSavingsButton);

        card.appendChild(actions);
        list.appendChild(card);
    });

    container.appendChild(list);
    bindSavingsActions(container);
}

function bindSavingsActions(container) {
    container.querySelectorAll('[data-action="add-savings"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            handleAddSavings(id);
        });
    });
    
    container.querySelectorAll('[data-action="cash-out"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            handleCashOut(id);
        });
    });
    
    container.querySelectorAll('[data-action="edit-target"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            handleEditTarget(id);
        });
    });
    
    container.querySelectorAll('[data-action="delete-fund"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const fundId = btn.getAttribute('data-fund-id');
            handleDeleteFund(fundId);
        });
    });
}

async function handleAddSavings(goalId) {
    console.log('handleAddSavings called with goalId:', goalId);
    createModal({
        title: 'Add Savings',
        content: `
            <div class="modal-form">
                <label for="savings-amount" class="modal-form__label">Amount</label>
                <input 
                    type="number" 
                    id="savings-amount" 
                    class="modal-form__input" 
                    placeholder="Enter amount" 
                    min="0" 
                    step="0.01"
                    autofocus
                />
            </div>
        `,
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary'
            },
            {
                text: 'Confirm',
                type: 'primary',
                onClick: async () => {
                    const input = document.getElementById('savings-amount');
                    const amount = parseFloat(input.value);
                    
                    if (isNaN(amount) || amount <= 0) {
                        showToast('Please enter a valid amount');
                        return false; // Keep modal open
                    }
                    
                    try {
                        const response = await fetch(`/api/savings/${goalId}/contributions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                amount: amount
                            })
                        });

                        if (response.ok) {
                            showToast('Savings added successfully');
                            window.location.reload();
                            return true;
                        } else {
                            const errorData = await response.json();
                            showToast(errorData.error || 'Failed to add savings');
                            return true;
                        }
                    } catch (_e) {
                        showToast('Error adding savings');
                        return true;
                    }
                }
            }
        ]
    });
}

async function handleCashOut(goalId) {
    console.log('handleCashOut called with goalId:', goalId);
    createModal({
        title: 'Cash-out',
        content: '<p>Are you sure you want to cash out all your savings?</p>',
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary'
            },
            {
                text: 'Confirm',
                type: 'primary',
                onClick: async () => {
                    try {
                        const response = await fetch(`/api/savings/${goalId}/contributions`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });

                        if (response.ok) {
                            showToast('Cash-out successfully');
                            window.location.reload();
                            return true;
                        } else {
                            const errorData = await response.json();
                            showToast(errorData.error || 'Failed to cash out');
                            return true;
                        }
                    } catch (_e) {
                        showToast('Error during cash-out');
                        return true;
                    }
                }
            }
        ]
    });
}

async function handleEditTarget(goalId) {
    console.log('handleEditTarget called with goalId:', goalId);
    const context = window.__savingsContext;
    if (!context) {
        showToast('Error: Context not available');
        return;
    }
    
    const { store } = context;
    const { savings } = store.getState();
    const existing = savings.find(g => g.id === goalId);
    
    if (!existing) {
        showToast('Goal not found');
        return;
    }

    createModal({
        title: 'Edit Target',
        content: `
            <div class="modal-form">
                <label for="target-amount" class="modal-form__label">Target Amount</label>
                <input 
                    type="number" 
                    id="target-amount" 
                    class="modal-form__input" 
                    placeholder="Enter target amount" 
                    min="0" 
                    step="0.01"
                    value="${existing.targetAmount}"
                    autofocus
                />
            </div>
        `,
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary'
            },
            {
                text: 'Save',
                type: 'primary',
                onClick: async () => {
                    const input = document.getElementById('target-amount');
                    const targetAmount = parseFloat(input.value);
                    
                    if (isNaN(targetAmount) || targetAmount <= 0) {
                        showToast('Please enter a valid target amount');
                        return false;
                    }
                    
                    try {
                        const response = await fetch(`/api/savings/${goalId}/target`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                targetAmount: targetAmount
                            })
                        });

                        if (response.ok) {
                            showToast('Target updated successfully');
                            window.location.reload();
                            return true;
                        } else {
                            const errorData = await response.json();
                            showToast(errorData.error || 'Failed to update target');
                            return true;
                        }
                    } catch (_e) {
                        showToast('Error updating target');
                        return true;
                    }
                }
            }
        ]
    });
}

async function handleDeleteFund(fundId) {
    console.log('handleDeleteFund called with fundId:', fundId);
    const context = window.__savingsContext;
    if (!context) {
        showToast('Error: Context not available');
        return;
    }
    
    const { store } = context;
    const { savings } = store.getState();
    
    // Find which goal this contribution belongs to
    let goalId = null;
    for (const goal of savings) {
        if (goal.contributions && goal.contributions.find(c => c.id === fundId)) {
            goalId = goal.id;
            break;
        }
    }
    
    if (!goalId) {
        showToast('Contribution not found');
        return;
    }
    
    try {
        const response = await fetch(`/api/savings/${goalId}/contributions/${fundId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Contribution deleted');
            window.location.reload();
        } else {
            const errorData = await response.json();
            showToast(errorData.error || 'Failed to delete contribution');
        }
    } catch (_e) {
        showToast('Error deleting contribution');
    }
}

/**
 * Create a goal progress meter.
 * @param {{ current: number, target: number }} params
 * @returns {HTMLElement}
 */
function createGoalMeter({ current, target }) {
    const progress = Math.min(1, target === 0 ? 0 : current / target);
    const wrapper = createElement('div', { classes: ['progress-meter', 'progress-meter--goal'] });
    const bar = createElement('div', { classes: ['progress-meter__bar'] });
    const fill = createElement('div', { classes: ['progress-meter__fill'] });
    fill.style.setProperty('--progress', `${progress * 100}%`);
    bar.appendChild(fill);

    wrapper.appendChild(bar);
    return wrapper;
}
