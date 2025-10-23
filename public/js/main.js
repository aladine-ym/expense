// ======================= App Entry Point =======================

import { store } from './state/store.js';
import { featureFlags } from './config/featureFlags.js';
import { createDateRange } from './utils/date.js';
import { formatCurrency } from './utils/currency.js';
import { renderDashboard } from './views/dashboard.js';
import { renderCategories } from './views/categories.js';
import { renderStatistics } from './views/statistics.js';
import { renderSavings } from './views/savings.js';
import { renderSettings } from './views/settings.js';
import { renderIncome } from './views/income.js';
import { registerServiceWorker } from './pwa/register-sw.js';
import { initIndexedDB } from './storage/indexeddb.js';
import { showToast } from './ui/toast.js';
import { ensureSession, fetchCategories, fetchNotes, fetchIncome } from './utils/api.js';

/**
 * Bootstrap data from the server and hydrate the store.
 * Falls back to sample data if fetching fails.
 */
async function bootstrapData() {
    try {
        await ensureSession();
        
        // Load base data and hydrate store
        const cats = await fetchCategories();
        
        // Load ALL notes and expenses, not just filtered ones
        const { notes, expenses } = await fetchNotes();
        
        // Load income sources
        const incomeSources = await fetchIncome();
        
        // Update store with loaded data
        store.setState({
            ...store.getState(),
            categories: cats,
            dayNotes: notes,
            expenses: expenses,
            income: incomeSources
        });
        
        return true;
    } catch (e) {
        // fallback: proceed with current in-memory data
        console.error('Failed to bootstrap data from server:', e);
        showToast('Using offline data. Some features may be limited.', 'warning');
        return false;
    }

}

function ensureIncomeFilter() {
    const { filters } = store.getState();
    const allowed = ['month', 'year'];
    let nextKey = filters.quick;
    if (!allowed.includes(nextKey)) {
        nextKey = 'month';
        store.updateFilters({ quick: nextKey, range: createDateRange(nextKey) });
    }
    highlightActiveFilter(nextKey);
}

/**
 * Initialize the application shell, navigation, and routing.
 */
function initApp() {
    const appEl = document.getElementById('app');
    if (!appEl) {
        return;
    }

    bindNavigation();
    bindFilters();
    initializeFilters();
    applyTheme();
    
    bootstrapData().then(() => {
        loadInitialView();
    }).catch((err) => {
        console.error('Critical initialization error:', err);
        loadInitialView(); // Load anyway with sample data
    });

    if (featureFlags.offlinePWA) {
        registerServiceWorker();
    }

    if (featureFlags.indexedDBBootstrap) {
        initIndexedDB();
    }
}

/**
 * Attach navigation button listeners for routing.
 */
function bindNavigation() {
    const mainEl = document.getElementById('main');
    const navButtons = document.querySelectorAll('[data-route]');
    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const route = button.getAttribute('data-route');
            store.updateUI({ currentRoute: route });
            renderRoute(route);
            updateFAB(route);
            button.blur();
            if (mainEl) {
                mainEl.focus();
            }
        });
    });

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
 * Bind filter controls (placeholder for future implementation).
 */
function bindFilters() {
    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) {
        return;
    }
    // TEMP: simple buttons for now
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
            renderRoute(store.getState().ui.currentRoute);
        });
        filtersContainer.appendChild(button);
    });
}

/**
 * Show or hide filters based on current route.
 * @param {string} route
 */
function toggleFilters(route) {
    const filtersContainer = document.getElementById('filters');
    if (!filtersContainer) {
        return;
    }
    
    // Hide filters for settings and categories views
    if (route === 'settings' || route === 'categories') {
        filtersContainer.style.display = 'none';
    } else {
        filtersContainer.style.display = 'block';
    }

    setFilterAvailability(route);
}

function setFilterAvailability(route) {
    const buttons = document.querySelectorAll('[data-filter]');
    const allowed = route === 'income' ? new Set(['month', 'year']) : null;
    buttons.forEach((button) => {
        const key = button.getAttribute('data-filter');
        const visible = !allowed || allowed.has(key);
        button.style.display = visible ? 'inline-flex' : 'none';
    });
}

/**
 * Ensure filters have an initial range and UI state.
 */
function initializeFilters() {
    const { filters } = store.getState();
    const quickKey = filters.quick ?? 'week';
    const range = filters.range ?? createDateRange(quickKey);
    store.updateFilters({ quick: quickKey, range });
    highlightActiveFilter(quickKey);
}

/**
 * Highlight the active quick filter chip.
 * @param {string} activeKey
 */
function highlightActiveFilter(activeKey) {
    const buttons = document.querySelectorAll('[data-filter]');
    buttons.forEach((button) => {
        button.classList.toggle('chip--active', button.getAttribute('data-filter') === activeKey);
    });
}

/**
 * Load the initial view after hydration.
 */
function loadInitialView() {
    const { ui } = store.getState();
    renderRoute(ui.currentRoute);
}

/**
 * Render route-specific content.
 * @param {string} route
 */
function renderRoute(route) {
    console.log('renderRoute called with:', route);
    const container = document.getElementById('view-container');
    if (!container) {
        return;
    }

    // Toggle filters visibility based on route
    toggleFilters(route);

    switch (route) {
        case 'dashboard': {
            renderDashboard(container, { store, formatCurrency });
            break;
        }
        case 'categories': {
            renderCategories(container, { store, formatCurrency });
            break;
        }
        case 'statistics': {
            renderStatistics(container, { store, formatCurrency });
            break;
        }
        case 'savings': {
            renderSavings(container, { store, formatCurrency });
            break;
        }
        case 'settings': {
            renderSettings(container, { store });
            break;
        }
        case 'income': {
            console.log('Rendering income view');
            ensureIncomeFilter();
            renderIncome(container, { store, formatCurrency });
            break;
        }
        default: {
            renderDashboard(container, { store, formatCurrency });
        }
    }
}

/**
 * Apply persisted or system theme.
 */
function applyTheme() {
    const { ui, user } = store.getState();
    // read persisted theme override first
    const persisted = localStorage.getItem('ek_theme');
    const pref = persisted ? persisted : user.preferences.theme;
    const theme = pref === 'system' ? detectSystemTheme() : pref;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    store.updateUI({ theme });
}

/**
 * Determine the system theme fallback.
 * @returns {'light'|'dark'}
 */
function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Update FAB visibility and action based on current route.
 * @param {string} route
 */
function updateFAB(route) {
    const fab = document.getElementById('fab');
    if (!fab) {
        return;
    }

    const routesWithFAB = ['categories', 'savings'];
    
    if (routesWithFAB.includes(route)) {
        fab.hidden = false;
        fab.setAttribute('aria-label', getFabLabel(route));
        fab.onclick = () => handleFABClick(route);
    } else {
        fab.hidden = true;
    }
}

/**
 * Handle FAB click based on current route.
 * @param {string} route
 */
function handleFABClick(route) {
    switch (route) {
        case 'dashboard':
            showToast('Add expense form coming soon');
            break;
        case 'income':
            showToast('Add income source form coming soon');
            break;
        case 'categories':
            showToast('Add category form coming soon');
            break;
        case 'savings':
            showToast('Add savings goal form coming soon');
            break;
    }
}

function getFabLabel(route) {
    switch (route) {
        case 'dashboard': return 'Add expense';
        case 'income': return 'Add income source';
        case 'categories': return 'Add category';
        case 'savings': return 'Add savings goal';
        default: return 'Add';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { user } = store.getState();
    if (user.preferences.theme === 'system') {
        applyTheme();
    }
});
