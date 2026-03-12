// Configuration
const BACKEND_URL = window.location.origin;
const AUTH_URL = 'https://auth.emergentagent.com';

// Load impact stats on page load
document.addEventListener('DOMContentLoaded', () => {
    loadImpactStats();
});

// Load impact statistics
async function loadImpactStats() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/impact-stats`);
        const data = await response.json();
        
        // Update stats on page
        document.getElementById('statWaste').textContent = data.total_waste_kg.toFixed(0);
        document.getElementById('statMoney').textContent = `R$ ${data.total_money_saved.toFixed(0)}`;
        document.getElementById('statCO2').textContent = data.total_co2_saved.toFixed(0);
        document.getElementById('statRepairs').textContent = data.total_repairs;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Handle login
function handleLogin() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth-callback.html';
    const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
}

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Get current user
function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

// Logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
}

// Show loading state
function showLoading(element) {
    if (element) {
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    }
}

// Show error message
function showError(message) {
    alert(message);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Format time
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}