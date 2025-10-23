// ======================= Auth Guard =======================
// This script runs on every page to check authentication status
// and redirect to login if not authenticated

(async function() {
    // Skip auth check if we're already on the login page
    if (window.location.pathname === '/pages/login.html') {
        return;
    }

    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.authenticated) {
            // Not authenticated - redirect to login
            window.location.replace('/pages/login.html');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to login to be safe
        window.location.replace('/pages/login.html');
    }
})();
