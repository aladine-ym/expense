// ======================= Currency Utilities =======================

/**
 * Format a numeric amount with currency using Intl support.
 * @param {number} amount
 * @param {string} currency
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCurrency(amount, currency, locale = undefined) {
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    });
    return formatter.format(amount);
}
