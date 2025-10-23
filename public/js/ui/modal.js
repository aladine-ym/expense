// ======================= Modal System =======================

import { createElement } from '../utils/dom.js';

/**
 * Create and show a modal dialog.
 * @param {Object} config - Modal configuration
 * @param {string} config.title - Modal title
 * @param {string} config.content - Modal content HTML
 * @param {Array} config.buttons - Array of button configurations
 * @param {Function} config.onClose - Callback when modal closes
 * @returns {HTMLElement} Modal element
 */
export function createModal(config) {
    const { title, content, buttons = [], onClose } = config;
    
    // Create modal overlay
    const overlay = createElement('div', { 
        classes: ['modal-overlay'],
        attrs: { 'aria-modal': 'true', 'role': 'dialog' }
    });
    
    // Create modal container
    const modal = createElement('div', { classes: ['modal'] });
    
    // Create modal header
    const header = createElement('div', { classes: ['modal__header'] });
    const titleEl = createElement('h2', { classes: ['modal__title'] });
    titleEl.textContent = title;
    header.appendChild(titleEl);
    
    // Create close button
    const closeBtn = createElement('button', { 
        classes: ['modal__close'],
        attrs: { 'aria-label': 'Close modal' }
    });
    closeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" class="icon">
            <use href="#icon-close" />
        </svg>
    `;
    closeBtn.addEventListener('click', () => closeModal(overlay, onClose));
    header.appendChild(closeBtn);
    
    // Create modal body
    const body = createElement('div', { classes: ['modal__body'] });
    body.innerHTML = content;
    
    // Create modal footer with buttons
    const footer = createElement('div', { classes: ['modal__footer'] });
    buttons.forEach(buttonConfig => {
        const button = createElement('button', {
            classes: ['modal__button', `modal__button--${buttonConfig.type || 'secondary'}`],
            attrs: { type: 'button' }
        });
        button.textContent = buttonConfig.text;
        button.addEventListener('click', async () => {
            // Support both action and onClick
            const handler = buttonConfig.onClick || buttonConfig.action;
            
            if (handler) {
                // If handler returns false, keep modal open
                const result = await handler();
                if (result === false) {
                    return; // Keep modal open
                }
            }
            
            closeModal(overlay, onClose);
        });
        footer.appendChild(button);
    });
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Add to DOM
    document.body.appendChild(overlay);
    
    // Focus management
    const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay, onClose);
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal(overlay, onClose);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    return overlay;
}

/**
 * Close modal and clean up.
 * @param {HTMLElement} overlay - Modal overlay element
 * @param {Function} onClose - Callback function
 */
function closeModal(overlay, onClose) {
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
    if (onClose) {
        onClose();
    }
}

/**
 * Create a simple confirmation modal.
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 */
export function createConfirmModal(message, onConfirm, onCancel) {
    return createModal({
        title: 'Confirm Action',
        content: `<p>${message}</p>`,
        buttons: [
            {
                text: 'Cancel',
                type: 'secondary',
                action: onCancel
            },
            {
                text: 'Confirm',
                type: 'primary',
                action: onConfirm
            }
        ]
    });
}
