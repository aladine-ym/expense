// ======================= IndexedDB Storage =======================

const DB_NAME = 'expensekeeper';
const DB_VERSION = 1;
const STORE = {
    metadata: 'metadata',
    notes: 'day_notes',
    expenses: 'expenses',
    categories: 'categories',
    pending: 'pending_changes'
};

let dbPromise = null;

/**
 * Open the ExpenseKeeper IndexedDB database, creating object stores if needed.
 * @returns {Promise<IDBDatabase|null>}
 */
function openDatabase() {
    if (!('indexedDB' in window)) {
        return Promise.resolve(null);
    }

    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = /** @type {IDBDatabase} */ (event.target.result);
            if (!database.objectStoreNames.contains(STORE.metadata)) {
                database.createObjectStore(STORE.metadata, { keyPath: 'key' });
            }
            if (!database.objectStoreNames.contains(STORE.notes)) {
                database.createObjectStore(STORE.notes, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(STORE.expenses)) {
                const expenseStore = database.createObjectStore(STORE.expenses, { keyPath: 'id' });
                expenseStore.createIndex('noteId', 'noteId', { unique: false });
            }
            if (!database.objectStoreNames.contains(STORE.categories)) {
                database.createObjectStore(STORE.categories, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(STORE.pending)) {
                database.createObjectStore(STORE.pending, { keyPath: 'clientId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

/**
 * Initialize IndexedDB and seed default metadata.
 * @returns {Promise<boolean>}
 */
export async function initIndexedDB() {
    try {
        const database = await openDatabase();
        if (!database) {
            return false;
        }
        await putValue(STORE.metadata, { key: 'version', value: DB_VERSION });
        return true;
    } catch (error) {
        // TEMP: route errors to logging service
        console.warn('IndexedDB initialization failed', error);
        return false;
    }
}

/**
 * Persist a day note and its linked expenses to IndexedDB.
 * @param {import('../types.js').DayNote} note
 * @param {import('../types.js').ExpenseItem[]} expenses
 * @returns {Promise<void>}
 */
export async function saveNoteWithExpenses(note, expenses) {
    const database = await openDatabase();
    if (!database) {
        return;
    }
    await runTransaction(database, [STORE.notes, STORE.expenses], 'readwrite', (stores) => {
        stores[STORE.notes].put(note);
        expenses.forEach((expense) => {
            stores[STORE.expenses].put(expense);
        });
    });
}

/**
 * Retrieve notes and expenses for the active user.
 * @returns {Promise<{ notes: import('../types.js').DayNote[], expenses: import('../types.js').ExpenseItem[] }>}
 */
export async function loadNotesSnapshot() {
    const database = await openDatabase();
    if (!database) {
        return { notes: [], expenses: [] };
    }
    const notes = await getAll(STORE.notes);
    const expenses = await getAll(STORE.expenses);
    return { notes, expenses };
}

/**
 * Queue a pending change for future sync.
 * @param {{ clientId: string, payload: unknown, type: string, createdAt: string }} change
 * @returns {Promise<void>}
 */
export async function enqueuePendingChange(change) {
    const database = await openDatabase();
    if (!database) {
        return;
    }
    await runTransaction(database, [STORE.pending], 'readwrite', (stores) => {
        stores[STORE.pending].put(change);
    });
}

/**
 * Retrieve and clear pending changes atomically.
 * @returns {Promise<any[]>}
 */
export async function flushPendingChanges() {
    const database = await openDatabase();
    if (!database) {
        return [];
    }
    const pending = await getAll(STORE.pending);
    await runTransaction(database, [STORE.pending], 'readwrite', (stores) => {
        pending.forEach((item) => stores[STORE.pending].delete(item.clientId));
    });
    return pending;
}

/**
 * Store arbitrary metadata such as sync timestamps.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function setMetadata(key, value) {
    await putValue(STORE.metadata, { key, value });
}

/**
 * Fetch metadata value.
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getMetadata(key) {
    const database = await openDatabase();
    if (!database) {
        return null;
    }
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE.metadata, 'readonly');
        const store = transaction.objectStore(STORE.metadata);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error);
    });
}

// ======================= Internal Helpers =======================

/**
 * Execute a transaction across one or more object stores.
 * @param {IDBDatabase} database
 * @param {string[]} storeNames
 * @param {'readonly'|'readwrite'} mode
 * @param {(stores: Record<string, IDBObjectStore>) => void} executor
 * @returns {Promise<void>}
 */
function runTransaction(database, storeNames, mode, executor) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeNames, mode);
        const stores = storeNames.reduce((acc, name) => {
            acc[name] = transaction.objectStore(name);
            return acc;
        }, /** @type {Record<string, IDBObjectStore>} */ ({}));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);

        executor(stores);
    });
}

/**
 * Put a value into the specified object store.
 * @param {string} storeName
 * @param {any} value
 * @returns {Promise<void>}
 */
async function putValue(storeName, value) {
    const database = await openDatabase();
    if (!database) {
        return;
    }
    await runTransaction(database, [storeName], 'readwrite', (stores) => {
        stores[storeName].put(value);
    });
}

/**
 * Retrieve all entries from an object store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
async function getAll(storeName) {
    const database = await openDatabase();
    if (!database) {
        return [];
    }
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
    });
}
