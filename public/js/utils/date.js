// ======================= Date Utilities =======================

/**
 * Format an ISO date string into a readable form such as "Mon, Oct 6, 2025".
 * @param {string} isoDate - Date in ISO format (YYYY-MM-DD).
 * @param {Intl.DateTimeFormat} [formatter]
 * @returns {string}
 */
export function formatReadableDate(isoDate, formatter) {
    const date = new Date(`${isoDate}T00:00:00`);
    const intlFormatter = formatter ?? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    return intlFormatter.format(date);
}

/**
 * Generate a date range object based on a quick filter key.
 * @param {"today"|"week"|"month"|"range"} key
 * @param {{from?: string, to?: string}} [custom]
 * @returns {{from: string, to: string}}
 */
export function createDateRange(key, custom = {}) {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);

    if (key === 'today') {
        return { from: todayISO, to: todayISO };
    }

    if (key === 'week') {
        const day = today.getDay();
        const diffToMonday = (day + 6) % 7; // Monday as start of week
        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            from: monday.toISOString().slice(0, 10),
            to: sunday.toISOString().slice(0, 10)
        };
    }

    if (key === 'month') {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            from: firstOfMonth.toISOString().slice(0, 10),
            to: lastOfMonth.toISOString().slice(0, 10)
        };
    }

    const { from = todayISO, to = todayISO } = custom;
    return { from, to };
}

/**
 * Determine whether a target date falls within a given range (inclusive).
 * @param {string} dateISO
 * @param {{from: string, to: string}} range
 * @returns {boolean}
 */
export function isDateWithinRange(dateISO, range) {
    return dateISO >= range.from && dateISO <= range.to;
}
