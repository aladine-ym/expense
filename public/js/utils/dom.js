// ======================= DOM Utilities =======================

/**
 * Create an element with optional classes and attributes.
 * @param {string} tagName - HTML tag name.
 * @param {Object} [options] - Additional options.
 * @param {string[]} [options.classes] - CSS classes to apply.
 * @param {Record<string, string>} [options.attrs] - Attributes to set.
 * @returns {HTMLElement}
 */
export function createElement(tagName, { classes = [], attrs = {} } = {}) {
    const el = document.createElement(tagName);
    if (classes.length) {
        el.classList.add(...classes);
    }
    Object.entries(attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
        }
    });
    return el;
}

/**
 * Remove all child nodes from a parent element.
 * @param {HTMLElement} target
 */
export function clearElement(target) {
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }
}
