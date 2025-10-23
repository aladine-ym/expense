// ======================= Confirmation Dialog =======================

/**
 * Show a custom confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} [confirmText='Delete'] - Text for confirm button
 * @param {string} [cancelText='Cancel'] - Text for cancel button
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(message, confirmText = 'Delete', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'confirm-title');
        
        // Create content
        dialog.innerHTML = `
            <div class="confirm-dialog__content">
                <h3 id="confirm-title" class="confirm-dialog__title">Confirm Action</h3>
                <p class="confirm-dialog__message">${message}</p>
            </div>
            <div class="confirm-dialog__actions">
                <button type="button" class="button button--ghost" data-action="cancel">
                    ${cancelText}
                </button>
                <button type="button" class="button button--danger" data-action="confirm">
                    ${confirmText}
                </button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Focus the confirm button
        setTimeout(() => {
            const confirmBtn = dialog.querySelector('[data-action="confirm"]');
            if (confirmBtn) confirmBtn.focus();
        }, 100);
        
        // Handle button clicks
        const handleClick = (confirmed) => {
            overlay.classList.add('confirm-overlay--closing');
            setTimeout(() => {
                document.body.removeChild(overlay);
                resolve(confirmed);
            }, 200);
        };
        
        dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => handleClick(true));
        dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => handleClick(false));
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClick(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Handle overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleClick(false);
            }
        });
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('confirm-overlay--visible');
        });
    });
}
