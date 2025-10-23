// ======================= API Utilities =======================

/**
 * Ensure we have a session with the single local user.
 * Auto-creates the user if it doesn't exist.
 */
export async function ensureSession() {
    console.log('Ensuring session...');
    
    try {
        const resp = await fetch('/api/user', { credentials: 'include' });
        if (resp.ok) {
            const user = await resp.json();
            console.log('Existing session found for user:', user.id);
            hydrateUserPreferences(user);
            return user;
        }
        console.log('No existing session, auto-logging in...');
    } catch (error) {
        console.error('Error checking existing session:', error);
    }
    
    try {
        const resp = await fetch('/api/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!resp.ok) {
            const errorText = await resp.text();
            console.error('Failed to auto-login:', resp.status, errorText);
            return null;
        }
        const data = await resp.json();
        const user = data?.user ?? null;
        console.log('Auto-login successful for user:', user?.id);
        hydrateUserPreferences(user);
        return user;
    } catch (error) {
        console.error('Error during auto-login:', error);
        return null;
    }
}

/**
 * Hydrate store with user preferences from server.
 * @param {any} user
 */
function hydrateUserPreferences(user) {
    if (!user?.preferences) return;
    
    // Import store dynamically to avoid circular dependency
    import('../state/store.js').then(({ store }) => {
        const currentState = store.getState();
        store.setState({
            user: {
                ...currentState.user,
                ...user,
                preferences: {
                    ...currentState.user.preferences,
                    ...user.preferences
                }
            }
        });
        console.log('User preferences hydrated:', user.preferences);
    }).catch(err => {
        console.error('Failed to hydrate user preferences:', err);
    });
}

/** Fetch categories and history. */
export async function fetchCategories() {
    try {
        const r = await fetch('/api/categories', { credentials: 'include' });
        if (!r.ok) {
            const errorText = await r.text();
            console.error('Failed to fetch categories:', r.status, errorText);
            throw new Error(`Failed to load categories: ${r.status} ${r.statusText}`);
        }
        const data = await r.json();
        console.log('Categories fetched:', data.categories?.length ?? 0);
        return data.categories || [];
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
}

/** Fetch notes within optional range; returns { notes, expenses }. */
export async function fetchNotes(range) {
    try {
        const params = new URLSearchParams();
        if (range?.from && range?.to) {
            params.set('from', range.from);
            params.set('to', range.to);
        }
        const r = await fetch(`/api/notes?${params.toString()}`, { credentials: 'include' });
        if (!r.ok) {
            const errorText = await r.text();
            console.error('Failed to fetch notes:', r.status, errorText);
            throw new Error(`Failed to load notes: ${r.status} ${r.statusText}`);
        }
        /** @type {Array<{ id:string, date:string, items:Array<any>, total:number, createdAt:string, pinned:boolean }>} */
        const rows = await r.json();
        const expenses = [];
        const notes = rows.map((n) => ({ ...n, items: (n.items || []).map((it) => it.id) }));
        rows.forEach((n) => (n.items || []).forEach((e) => expenses.push(e)));
        console.log('Notes fetched:', notes.length, 'Expenses:', expenses.length);
        return { notes, expenses };
    } catch (error) {
        console.error('Error fetching notes:', error);
        throw error;
    }
}

/** Create a day note for a date. */
export async function createNote(date, pinned = false) {
    const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'note', date, pinned })
    });
    if (!r.ok) throw new Error('Failed to create note');
    return await r.json();
}

/** Create an expense on a note. */
export async function createExpense({ noteId, amount, categoryId, currency, type, tags = [] }) {
    const r = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ noteId, amount, categoryId, currency, type, tags })
    });
    if (!r.ok) throw new Error('Failed to create expense');
    return await r.json();
}

/** Create a new category. */
export async function createCategory({ name, color, icon, allocatedAmount = 0 }) {
    const r = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, color, icon, allocatedAmount })
    });
    if (!r.ok) throw new Error('Failed to create category');
    return await r.json();
}

/** Delete a category. */
export async function deleteCategory(categoryId) {
    const r = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    if (!r.ok) throw new Error('Failed to delete category');
    return true;
}

/** Fetch income sources. */
export async function fetchIncome() {
    const response = await fetch('/api/income', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch income sources');
    return response.json();
}

/** Fetch savings goals with contributions. */
export async function fetchSavings() {
    const response = await fetch('/api/savings', { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch savings');
    return response.json();
}

