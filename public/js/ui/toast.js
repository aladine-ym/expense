// ======================= Toast Notifications =======================

/**
 * Display a transient toast message.
 * @param {string} message
 * @param {'info'|'warning'|'error'|'success'|number} [typeOrDuration='info'] - Type or duration in ms
 * @param {number} [duration=5000] - Duration in ms (only used if typeOrDuration is a string)
 */
export function showToast(message, typeOrDuration = 'info', duration = 5000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        return;
    }
    
    // Handle backward compatibility: if second param is a number, treat it as duration
    let type = 'info';
    let finalDuration = duration;
    if (typeof typeOrDuration === 'number') {
        finalDuration = typeOrDuration;
    } else {
        type = typeOrDuration;
    }
    
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('toast--visible');
    
    // Remove existing type classes
    toast.classList.remove('toast--info', 'toast--warning', 'toast--error', 'toast--success');
    // Add type-specific class
    toast.classList.add(`toast--${type}`);

    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.hidden = true;
        toast.textContent = '';
    }, finalDuration);
}
