// ======================= Login Page =======================

const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');
const lockoutTimer = document.getElementById('lockout-timer');

let lockoutEndTime = null;
let timerInterval = null;

// Check if user is already logged in
checkAuthStatus();

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                // User is already logged in, redirect to dashboard
                window.location.href = '/';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Check for active lockout on page load
checkLockout();

function checkLockout() {
    const lockoutEnd = localStorage.getItem('lockoutEnd');
    if (lockoutEnd) {
        const endTime = parseInt(lockoutEnd, 10);
        if (Date.now() < endTime) {
            lockoutEndTime = endTime;
            startLockoutTimer();
        } else {
            localStorage.removeItem('lockoutEnd');
        }
    }
}

function startLockoutTimer() {
    loginButton.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    errorMessage.classList.remove('show');
    lockoutTimer.classList.add('show');

    updateTimerDisplay();
    timerInterval = setInterval(() => {
        const remaining = lockoutEndTime - Date.now();
        if (remaining <= 0) {
            endLockout();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const remaining = Math.ceil((lockoutEndTime - Date.now()) / 1000);
    lockoutTimer.textContent = `Too many failed attempts. Please wait ${remaining} seconds before trying again.`;
}

function endLockout() {
    clearInterval(timerInterval);
    localStorage.removeItem('lockoutEnd');
    lockoutEndTime = null;
    loginButton.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    lockoutTimer.classList.remove('show');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if locked out
    if (lockoutEndTime && Date.now() < lockoutEndTime) {
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful
            localStorage.removeItem('lockoutEnd');
            window.location.href = '/';
        } else {
            // Login failed
            if (data.lockoutEnd) {
                // Account locked out
                lockoutEndTime = data.lockoutEnd;
                localStorage.setItem('lockoutEnd', lockoutEndTime.toString());
                startLockoutTimer();
            } else {
                showError(data.message || 'Invalid username or password');
            }
            loginButton.disabled = false;
            loginButton.textContent = 'Sign In';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }
});

// Clear error on input
usernameInput.addEventListener('input', () => {
    errorMessage.classList.remove('show');
});

passwordInput.addEventListener('input', () => {
    errorMessage.classList.remove('show');
});
