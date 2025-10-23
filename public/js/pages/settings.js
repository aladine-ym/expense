// ======================= Settings Page Entry Point =======================

import { store } from '../state/store.js';
import { featureFlags } from '../config/featureFlags.js';
import { renderSettings } from '../views/settings.js';
import { registerServiceWorker } from '../pwa/register-sw.js';
import { initIndexedDB } from '../storage/indexeddb.js';
import { showToast } from '../ui/toast.js';
import { ensureSession, fetchCategories, fetchNotes, fetchIncome } from '../utils/api.js';

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

function renderView() {
    const container = document.getElementById('view-container');
    if (!container) return;
    renderSettings(container, { store });
}

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

async function initPage() {
    setupNavigation();
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
