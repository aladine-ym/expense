// ======================= Service Worker Registration =======================

/**
 * Register the service worker when supported.
 */
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .catch((error) => {
                // TEMP: replace with structured logging channel
                console.warn('Service worker registration failed', error);
            });
    });
}
