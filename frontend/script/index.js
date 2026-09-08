/**
 * KrishiMandi - Index Page JavaScript (script/index.js)
 * Manages dynamic authentication state in index.html header:
 * - If logged in: replaces Login/Sign Up with user profile avatar and dropdown
 * - Allows quick access to profile.html (editing profile) and payment.html (checkout)
 * - Supports instant logout and UI reset
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', async () => {
    const headerActionsContainer = document.getElementById('header-actions');
    if (!headerActionsContainer) return;

    const token = localStorage.getItem('km_access_token');
    let user = null;

    try {
        const stored = localStorage.getItem('km_user');
        if (stored) user = JSON.parse(stored);
    } catch (e) {
        console.warn('Error reading stored user', e);
    }

    // Refresh user profile from backend if token exists
    if (token) {
        try {
            const resp = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                user = await resp.json();
                localStorage.setItem('km_user', JSON.stringify(user));
            } else if (resp.status === 401) {
                // Token expired
                localStorage.removeItem('km_access_token');
                localStorage.removeItem('km_user');
                user = null;
            }
        } catch (e) {
            console.warn('Backend currently offline, using cached credentials:', e);
        }
    }

    if (token && user) {
        renderLoggedInHeader(user);
    } else {
        renderLoggedOutHeader();
    }

    function renderLoggedInHeader(userData) {
        const displayName = userData.full_name || (userData.mobile_number ? `Farmer (${userData.mobile_number.slice(-4)})` : 'Farmer User');
        const role = userData.role || 'Farmer';
        
        // Initials
        const parts = displayName.trim().split(' ');
        const initials = parts.length > 1 
            ? (parts[0][0] + parts[1][0]).toUpperCase() 
            : displayName.slice(0, 2).toUpperCase();

        headerActionsContainer.innerHTML = `
            <a href="pages/payment.html" class="btn btn-outline" style="padding: 8px 16px; font-size: 0.9rem;" title="Go to Payment & Orders">
                🛒 Checkout
            </a>
            <div class="user-menu-wrapper" id="user-menu-wrapper">
                <button class="user-profile-btn" id="user-profile-toggle" aria-expanded="false" title="Account Menu">
                    <div class="user-avatar-small" id="header-avatar-initials">${initials}</div>
                    <div class="user-btn-info">
                        <span class="user-btn-name" id="header-user-name">${displayName}</span>
                        <span class="user-btn-role" id="header-user-role">${role}</span>
                    </div>
                    <svg class="user-menu-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                
                <div class="user-dropdown-menu" id="user-dropdown-menu">
                    <div class="dropdown-user-header">
                        <div class="dropdown-user-title">${displayName}</div>
                        <div class="dropdown-user-sub">${userData.mobile_number ? '+91-' + userData.mobile_number : 'Registered User'}</div>
                    </div>
                    <a href="pages/profile.html" class="dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Edit Profile & Addresses
                    </a>
                    <a href="pages/payment.html" class="dropdown-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Payment & Checkout
                    </a>
                    <div class="dropdown-divider"></div>
                    <button type="button" class="dropdown-item logout-item" id="header-logout-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Log Out
                    </button>
                </div>
            </div>
        `;

        // Add Cart to nav-links when logged in
        const mainNav = document.getElementById('main-nav-links');
        if (mainNav && !document.getElementById('nav-cart-link')) {
            const cartNavA = document.createElement('a');
            cartNavA.href = 'pages/payment.html';
            cartNavA.id = 'nav-cart-link';
            cartNavA.textContent = 'Cart';
            mainNav.appendChild(cartNavA);
        }

        const wrapper = document.getElementById('user-menu-wrapper');
        const toggleBtn = document.getElementById('user-profile-toggle');
        const dropdown = document.getElementById('user-dropdown-menu');
        const logoutBtn = document.getElementById('header-logout-btn');

        if (toggleBtn && dropdown && wrapper) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('show');
                if (isOpen) {
                    dropdown.classList.remove('show');
                    wrapper.classList.remove('active');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                } else {
                    dropdown.classList.add('show');
                    wrapper.classList.add('active');
                    toggleBtn.setAttribute('aria-expanded', 'true');
                }
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    dropdown.classList.remove('show');
                    wrapper.classList.remove('active');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('km_access_token');
                localStorage.removeItem('km_user');
                renderLoggedOutHeader();
            });
        }
    }

    function renderLoggedOutHeader() {
        headerActionsContainer.innerHTML = `
            <a href="pages/login.html" class="btn btn-outline">Log In</a>
            <a href="pages/onboarding.html" class="btn btn-primary">Sign Up</a>
        `;
        const navCart = document.getElementById('nav-cart-link');
        if (navCart) navCart.remove();
    }
});
