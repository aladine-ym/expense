// ======================= Settings View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { showToast } from '../ui/toast.js';
import { createCategory, deleteCategory } from '../utils/api.js';
import { createModal, createConfirmModal } from '../ui/modal.js';

/**
 * Render the settings page.
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store }} context
 */
export function renderSettings(container, context) {
    clearElement(container);
    const { store } = context;
    const { user, categories } = store.getState();

    const header = createElement('div', { classes: ['section-header', 'section-header--with-action'] });
    const headerContent = createElement('div');
    headerContent.innerHTML = `
        <h2>Settings</h2>
        <p class="section-header__meta">Customize preferences, theme, and automation options.</p>
    `;
    header.appendChild(headerContent);

    // Add logout button
    const logoutButton = createElement('button', {
        classes: ['logout-button'],
        attrs: { type: 'button', 'aria-label': 'Logout', title: 'Logout' }
    });
    logoutButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
    `;
    logoutButton.addEventListener('click', handleLogout);
    header.appendChild(logoutButton);

    container.appendChild(header);

    const form = createElement('form', { classes: ['settings-form'] });

    const themeField = renderThemePicker(user.preferences.theme, (value) => {
        store.updateUserPreferences({ theme: value });
        // persist user's explicit choice
        try {
            localStorage.setItem('ek_theme', value);
        } catch {}
        document.documentElement.setAttribute('data-theme', value === 'system' ? detectSystemTheme() : value);
    });
    form.appendChild(themeField);

    const autoAdjustField = renderToggleField({
        id: 'auto-adjust',
        label: 'Auto-adjust budgets',
        description: 'Automatically increase allocations when spending exceeds the current budget.',
        checked: user.preferences.autoAdjustBudgets,
        onToggle: (checked) => {
            store.updateUserPreferences({ autoAdjustBudgets: checked });
            showToast(checked ? 'Auto-adjust enabled' : 'Auto-adjust disabled');
        }
    });
    form.appendChild(autoAdjustField);

    // Add reset day field
    const resetDayField = renderResetDayField(user.preferences.resetDay ?? 1, (value) => {
        store.updateUserPreferences({ resetDay: value });
        showToast(`Monthly reset set to day ${value}`);
    });
    form.appendChild(resetDayField);

    // Add reset data field
    const resetDataField = renderResetDataField(store);
    form.appendChild(resetDataField);

    // Add category management section
    const categorySection = renderCategoryManagement(categories, store);
    form.appendChild(categorySection);

    container.appendChild(form);
}

/**
 * Render a theme picker fieldset.
 * @param {'light'|'dark'|'system'} current
 * @param {(theme: 'light'|'dark'|'system') => void} onChange
 * @returns {HTMLElement}
 */
function renderThemePicker(current, onChange) {
    const fieldset = createElement('fieldset', { classes: ['settings-field'] });
    const legend = createElement('legend');
    legend.textContent = 'Theme';
    fieldset.appendChild(legend);

    ['light', 'dark', 'system'].forEach((themeKey) => {
        const option = createElement('label', { classes: ['settings-option'] });
        const input = createElement('input', {
            attrs: { type: 'radio', name: 'theme', value: themeKey, checked: themeKey === current ? '' : undefined }
        });
        input.addEventListener('change', () => onChange(themeKey));

        const text = createElement('span');
        text.textContent = themeKey.charAt(0).toUpperCase() + themeKey.slice(1);

        option.append(input, text);
        fieldset.appendChild(option);
    });

    return fieldset;
}

/**
 * Render a toggle switch style field.
 * @param {{ id: string, label: string, description: string, checked: boolean, onToggle: (checked: boolean) => void }} config
 * @returns {HTMLElement}
 */
function renderToggleField(config) {
    const wrapper = createElement('div', { classes: ['settings-field'] });
    const labelRow = createElement('div', { classes: ['settings-field__header'] });

    const label = createElement('label', { attrs: { for: config.id } });
    label.textContent = config.label;
    labelRow.appendChild(label);

    const toggle = createElement('input', {
        attrs: {
            id: config.id,
            type: 'checkbox',
            role: 'switch',
            checked: config.checked ? '' : undefined
        }
    });
    toggle.addEventListener('change', (event) => {
        config.onToggle(event.target.checked);
    });
    labelRow.appendChild(toggle);

    wrapper.appendChild(labelRow);

    const description = createElement('p', { classes: ['settings-field__description'] });
    description.textContent = config.description;
    wrapper.appendChild(description);

    return wrapper;
}

/**
 * Render a number input field for reset day selection.
 * @param {number} current - Current reset day (1-29)
 * @param {(value: number) => void} onChange - Callback when value changes
 * @returns {HTMLElement}
 */
function renderResetDayField(current, onChange) {
    const wrapper = createElement('div', { classes: ['settings-field'] });
    
    const labelRow = createElement('div', { classes: ['settings-field__header'] });
    const label = createElement('label', { attrs: { for: 'reset-day' } });
    label.textContent = 'Starting date';
    labelRow.appendChild(label);
    wrapper.appendChild(labelRow);

    const inputWrapper = createElement('div', { classes: ['settings-field__input-wrapper'] });
    const input = createElement('input', {
        attrs: {
            id: 'reset-day',
            type: 'number',
            min: '1',
            max: '29',
            value: String(current),
            placeholder: '1'
        }
    });
    
    input.addEventListener('change', (event) => {
        let value = parseInt(event.target.value, 10);
        
        // Validate and clamp value
        if (isNaN(value) || value < 1) {
            value = 1;
            event.target.value = '1';
        } else if (value > 29) {
            value = 29;
            event.target.value = '29';
        }
        
        onChange(value);
    });
    
    input.addEventListener('blur', (event) => {
        // Set to 1 if empty
        if (!event.target.value) {
            event.target.value = '1';
            onChange(1);
        }
    });
    
    inputWrapper.appendChild(input);
    wrapper.appendChild(inputWrapper);

    const description = createElement('p', { classes: ['settings-field__description'] });
    description.textContent = 'Day of the month when category budgets reset (1-29). February uses day 28 maximum.';
    wrapper.appendChild(description);

    return wrapper;
}

/**
 * Render reset data field with danger button.
 * @param {import('../state/store.js').store} store
 * @returns {HTMLElement}
 */
function renderResetDataField(store) {
    const wrapper = createElement('div', { classes: ['settings-field', 'settings-field--danger'] });
    
    const labelRow = createElement('div', { classes: ['settings-field__header'] });
    const label = createElement('label');
    label.textContent = 'Reset Data';
    labelRow.appendChild(label);
    wrapper.appendChild(labelRow);

    const description = createElement('p', { classes: ['settings-field__description'] });
    description.textContent = 'Permanently delete all expenses, notes, savings, and income data. This action cannot be undone.';
    wrapper.appendChild(description);

    const resetButton = createElement('button', {
        classes: ['button', 'button--danger'],
        attrs: { type: 'button' }
    });
    resetButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <polyline points="23 20 23 14 17 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
        </svg>
        Reset All Data
    `;
    resetButton.addEventListener('click', () => handleResetData(store));
    wrapper.appendChild(resetButton);

    return wrapper;
}

/**
 * Handle reset data action with confirmation.
 * @param {import('../state/store.js').store} store
 */
function handleResetData(store) {
    const modal = createModal({
        title: '⚠️ Reset All Data',
        content: `
            <div style="padding: var(--space-4) 0;">
                <p style="margin: 0 0 var(--space-3) 0; font-weight: 600; color: #eb5757;">
                    This will permanently delete:
                </p>
                <ul style="margin: 0 0 var(--space-4) 0; padding-left: var(--space-5); color: var(--color-text);">
                    <li>All expense records</li>
                    <li>All day notes</li>
                    <li>All savings goals and contributions</li>
                    <li>All income sources and records</li>
                </ul>
                <p style="margin: 0; font-weight: 600; color: #eb5757;">
                    This action cannot be undone. Are you sure?
                </p>
            </div>
        `,
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary'
            },
            {
                text: 'Reset All Data',
                type: 'danger',
                action: () => confirmResetData(store)
            }
        ]
    });
}

/**
 * Confirm and execute data reset.
 * @param {import('../state/store.js').store} store
 */
async function confirmResetData(store) {
    try {
        // Call API to reset all data
        const response = await fetch('/api/reset-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to reset data');
        }

        // Clear store state
        store.setState({
            ...store.getState(),
            expenses: [],
            dayNotes: [],
            goals: [],
            income: []
        });

        showToast('All data has been reset', 'success');
        
        // Reload the page to refresh everything
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        showToast('Failed to reset data: ' + error.message, 'error');
    }
}

/**
 * Handle logout action
 */
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            // Clear any local storage
            localStorage.removeItem('lockoutEnd');
            // Redirect to login page
            window.location.href = '/pages/login.html';
        } else {
            showToast('Failed to logout', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

/**
 * Detect system theme when applying "system" preference.
 * @returns {'light'|'dark'}
 */
function detectSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Render category management section.
 * @param {Array} categories
 * @param {import('../state/store.js').store} store
 * @returns {HTMLElement}
 */
function renderCategoryManagement(categories, store) {
    const wrapper = createElement('div', { classes: ['settings-field', 'settings-field--full-width'] });
    
    const label = createElement('h3', { classes: ['settings-field__label'] });
    label.textContent = 'Categories';
    wrapper.appendChild(label);

    const description = createElement('p', { classes: ['settings-field__description'] });
    description.textContent = 'Manage your expense categories. Click the X to delete a category.';
    wrapper.appendChild(description);

    // Create category button
    const createButton = createElement('button', { 
        classes: ['chip', 'chip--create'],
        attrs: { type: 'button' }
    });
    createButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" class="icon">
            <use href="#icon-plus" />
        </svg>
        Create Category
    `;
    createButton.addEventListener('click', () => handleCreateCategory(store));
    wrapper.appendChild(createButton);

    // Categories list
    const categoriesList = createElement('div', { classes: ['category-chips'] });
    
    categories.forEach((category) => {
        const chip = createElement('div', { 
            classes: ['chip', 'chip--category'],
            attrs: { 'data-category-id': category.id }
        });
        
        chip.innerHTML = `
            <span class="chip__text">${category.name}</span>
            <button class="chip__delete" type="button" aria-label="Delete ${category.name}">
                <svg width="12" height="12" viewBox="0 0 24 24" class="icon">
                    <use href="#icon-trash" />
                </svg>
            </button>
        `;
        
        const deleteBtn = chip.querySelector('.chip__delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteCategory(category.id, store);
        });
        
        categoriesList.appendChild(chip);
    });
    
    wrapper.appendChild(categoriesList);
    return wrapper;
}

/**
 * Handle category creation.
 * @param {import('../state/store.js').store} store
 */
function handleCreateCategory(store) {
    const colors = ['#2F80ED', '#27ae60', '#f2c94c', '#eb5757', '#9b59b6', '#e67e22'];
    const icons = ['shopping-cart', 'home', 'car', 'coffee', 'gift', 'heart'];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    const modal = createModal({
        title: 'Create Category',
        content: `
            <div class="modal__form-group">
                <label class="modal__label" for="category-name">Category Name</label>
                <input 
                    type="text" 
                    id="category-name" 
                    class="modal__input" 
                    placeholder="Enter category name"
                    maxlength="50"
                    autocomplete="off"
                >
            </div>
            <div class="modal__form-group">
                <label class="modal__label">Preview</label>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                    <div class="chip chip--category" style="background-color: ${randomColor}20; border-color: ${randomColor}; color: ${randomColor};">
                        <span class="chip__text">New Category</span>
                    </div>
                </div>
            </div>
        `,
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary'
            },
            {
                text: 'Create',
                type: 'primary',
                action: () => createCategoryFromModal(store, randomColor, randomIcon)
            }
        ]
    });
    
    // Focus the input field
    setTimeout(() => {
        const input = modal.querySelector('#category-name');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

/**
 * Create category from modal form.
 * @param {import('../state/store.js').store} store
 * @param {string} color
 * @param {string} icon
 */
async function createCategoryFromModal(store, color, icon) {
    const input = document.querySelector('#category-name');
    const name = input?.value?.trim();
    
    if (!name) {
        showToast('Please enter a category name');
        return;
    }
    
    try {
        const newCategory = await createCategory({
            name,
            color,
            icon,
            allocatedAmount: 0
        });
        
        // Update store
        const currentState = store.getState();
        currentState.categories.push(newCategory);
        store.setState(currentState);
        
        showToast('Category created successfully');
        
        // Re-render settings to show new category
        const container = document.getElementById('view-container');
        if (container) {
            renderSettings(container, { store });
        }
    } catch (error) {
        showToast('Failed to create category: ' + error.message);
    }
}

/**
 * Handle category deletion.
 * @param {string} categoryId
 * @param {import('../state/store.js').store} store
 */
function handleDeleteCategory(categoryId, store) {
    const category = store.getState().categories.find(cat => cat.id === categoryId);
    const categoryName = category?.name || 'this category';
    
    createConfirmModal(
        `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
        () => confirmDeleteCategory(categoryId, store),
        () => {} // Cancel action - do nothing
    );
}

/**
 * Confirm and execute category deletion.
 * @param {string} categoryId
 * @param {import('../state/store.js').store} store
 */
async function confirmDeleteCategory(categoryId, store) {
    try {
        await deleteCategory(categoryId);
        
        // Update store
        const currentState = store.getState();
        currentState.categories = currentState.categories.filter(cat => cat.id !== categoryId);
        store.setState(currentState);
        
        showToast('Category deleted successfully');
        
        // Re-render settings to remove deleted category
        const container = document.getElementById('view-container');
        if (container) {
            renderSettings(container, { store });
        }
    } catch (error) {
        showToast('Failed to delete category: ' + error.message);
    }
}
