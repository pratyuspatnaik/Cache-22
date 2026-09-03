/**
 * KrishiMandi - Details Profile JavaScript (script/details.js)
 * Handles profile completion submission, communicates with FastAPI backend,
 * triggers success animation overlay, and navigates back to the home page.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    const detailsForm = document.getElementById('details-form') || document.querySelector('.auth-form') || document.querySelector('form');
    const completeBtn = document.getElementById('complete-btn');
    const overlay = document.getElementById('success-overlay');
    const errorToast = document.getElementById('details-error');

    let errorTimer = null;

    function showError(message) {
        if (!errorToast) {
            alert(message);
            return;
        }
        errorToast.textContent = message;
        errorToast.classList.add('visible');
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            errorToast.classList.remove('visible');
        }, 7000);
    }

    function clearError() {
        if (!errorToast) return;
        errorToast.classList.remove('visible');
        errorToast.textContent = '';
    }

    // Check user session
    const token = localStorage.getItem('km_access_token');
    const storedUserId = sessionStorage.getItem('km_current_user_id') || 
                         JSON.parse(localStorage.getItem('km_user') || '{}')?.id;

    if (!token && !storedUserId) {
        console.warn('No active registration session found. User should register first.');
    }

    if (detailsForm) {
        detailsForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearError();

            const address1 = detailsForm.querySelector('input[name="address1"]')?.value.trim() || '';
            const address2 = detailsForm.querySelector('input[name="address2"]')?.value.trim() || '';
            const city = detailsForm.querySelector('input[name="city"]')?.value.trim() || '';
            const pincode = detailsForm.querySelector('input[name="pincode"]')?.value.trim() || '';
            const state = detailsForm.querySelector('select[name="state"]')?.value.trim() || '';
            const aadhar = detailsForm.querySelector('input[name="aadhar"]')?.value.trim() || '';
            const upi = detailsForm.querySelector('input[name="upi"]')?.value.trim() || '';

            if (!address1 || !city || !pincode || !state || !upi) {
                showError('Please fill out all required fields (Address, City, Pincode, State, UPI ID).');
                return;
            }

            if (!/^\d{6}$/.test(pincode)) {
                showError('Pincode must be exactly 6 digits.');
                return;
            }

            const currentToken = localStorage.getItem('km_access_token');
            const currentUserId = sessionStorage.getItem('km_current_user_id') || 
                                 JSON.parse(localStorage.getItem('km_user') || '{}')?.id;

            if (!currentToken && !currentUserId) {
                showError('No user account found. Please register first on the Onboarding page.');
                setTimeout(() => {
                    window.location.href = 'onboarding.html';
                }, 2000);
                return;
            }

            const originalBtnText = completeBtn ? completeBtn.textContent : 'Complete Profile →';
            if (completeBtn) {
                completeBtn.disabled = true;
                completeBtn.textContent = 'Saving Profile...';
            }

            try {
                const headers = { 'Content-Type': 'application/json' };
                if (currentToken) {
                    headers['Authorization'] = `Bearer ${currentToken}`;
                }

                const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        user_id: currentUserId ? parseInt(currentUserId) : null,
                        address_line1: address1,
                        address_line2: address2 || null,
                        city: city,
                        pincode: pincode,
                        state: state,
                        upi_id: upi,
                        aadhar_number: aadhar || null
                    })
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    localStorage.setItem('km_user', JSON.stringify(updatedUser));
                    
                    // Trigger success animation
                    if (overlay) {
                        overlay.classList.add('active');
                    }

                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 2400);
                } else {
                    const errData = await response.json().catch(() => ({}));
                    showError(errData.detail || 'Could not save profile. Please check your inputs and try again.');
                    if (completeBtn) {
                        completeBtn.disabled = false;
                        completeBtn.textContent = originalBtnText;
                    }
                }
            } catch (err) {
                console.error('Backend connection failed:', err);
                showError('Cannot reach backend server. Please verify FastAPI backend is running at http://127.0.0.1:8000.');
                if (completeBtn) {
                    completeBtn.disabled = false;
                    completeBtn.textContent = originalBtnText;
                }
            }
        });
    }
});
