// ======================= Dashboard Page Entry Point =======================

import { store } from '../state/store.js';
import { featureFlags } from '../config/featureFlags.js';
import { createDateRange } from '../utils/date.js';
import { formatCurrency } from '../utils/currency.js';
import { renderDashboard } from '../views/dashboard.js';
import { registerServiceWorker } from '../pwa/register-sw.js';
import { initIndexedDB } from '../storage/indexeddb.js';
import { showToast } from '../ui/toast.js';
import { ensureSession, fetchCategories, fetchNotes, fetchIncome } from '../utils/api.js';

/**
 * Bootstrap data from the server and hydrate the store.
 */
async function bootstrapData() {
    try {
        await ensureSession();
        
        const cats = await fetchCategories();
        const { notes, expenses } = await fetchNotes();
        const incomeSources = await fetchIncome();
        
        store.setState({
            ...store.getState(),
            categories: cats,
            dayNotes: notes,
            expenses: expenses,
            income: incomeSources
        });
        
        return true;
    } catch (e) {
        console.error('Failed to bootstrap data from server:', e);
        showToast('Using offline data. Some features may be limited.', 'warning');
        return false;
    }
}

/**
 * Initialize filters for dashboard view.
 */
function initializeFilters() {
    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) return;
    
    const quickFilters = [
        { key: 'today', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' },
        { key: 'year', label: 'This Year' }
    ];

    quickFilters.forEach((filter) => {
        const button = document.createElement('button');
        button.className = 'chip';
        button.type = 'button';
        button.textContent = filter.label;
        button.setAttribute('data-filter', filter.key);
        button.addEventListener('click', () => {
            store.updateFilters({ quick: filter.key, range: createDateRange(filter.key) });
            highlightActiveFilter(filter.key);
            renderView();
        });
        filtersContainer.appendChild(button);
    });
    
    const { filters } = store.getState();
    const quickKey = filters.quick ?? 'week';
    const range = filters.range ?? createDateRange(quickKey);
    store.updateFilters({ quick: quickKey, range });
    highlightActiveFilter(quickKey);
}

/**
 * Highlight the active filter chip.
 */
function highlightActiveFilter(activeKey) {
    const buttons = document.querySelectorAll('[data-filter]');
    buttons.forEach((button) => {
        button.classList.toggle('chip--active', button.getAttribute('data-filter') === activeKey);
    });
}

/**
 * Render the dashboard view.
 */
function renderView() {
    const container = document.getElementById('view-container');
    if (!container) return;
    renderDashboard(container, { store, formatCurrency });
}

/**
 * Setup navigation toggle.
 */
function setupNavigation() {
    const toggle = document.querySelector('[data-action="toggle-nav"]');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = store.getState().ui.navOpen;
            store.updateUI({ navOpen: !current });
            document.body.classList.toggle('nav-open', !current);
        });
    }
}

/**
 * Apply theme.
 */
function applyTheme() {
    const persisted = localStorage.getItem('ek_theme');
    const { user } = store.getState();
    const pref = persisted ? persisted : user.preferences.theme;
    const theme = pref === 'system' ? detectSystemTheme() : pref;
    document.documentElement.setAttribute('data-theme', theme);
    store.updateUI({ theme });
}

function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize the page.
 */
async function initPage() {
    setupNavigation();
    initializeFilters();
    applyTheme();
    
    await bootstrapData();
    renderView();
    
    if (featureFlags.offlinePWA) {
        registerServiceWorker();
    }
    
    if (featureFlags.indexedDBBootstrap) {
        initIndexedDB();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initPage();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { user } = store.getState();
    if (user.preferences.theme === 'system') {
        applyTheme();
    }
});
