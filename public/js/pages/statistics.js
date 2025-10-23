// ======================= Statistics Page Entry Point =======================

import { store } from '../state/store.js';
import { formatCurrency } from '../utils/currency.js';
import { renderStatistics } from '../views/statistics.js';
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

async function init() {
    const container = document.getElementById('view-container');
    if (!container) {
        console.error('View container not found');
        return;
    }

    // Initialize PWA features
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
    await initIndexedDB();

    // Bootstrap data
    await bootstrapData();

    // Initial render
    const context = { store, formatCurrency };
    renderStatistics(container, context);

    // Re-render on state changes
    store.subscribe(() => {
        renderStatistics(container, context);
    });
}

// Start the app
init().catch((err) => {
    console.error('Failed to initialize statistics page:', err);
});
