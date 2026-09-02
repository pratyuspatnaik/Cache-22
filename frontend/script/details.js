/**
 * KrishiMandi - Details Profile JavaScript (script/details.js)
 * Handles profile completion submission, communicates with FastAPI backend,
 * triggers success animation overlay, and navigates back to the home page.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    const detailsForm = document.querySelector('form');
    const completeBtn = document.getElementById('complete-btn');
    const overlay = document.getElementById('success-overlay');

    if (detailsForm) {
        detailsForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const address1 = detailsForm.querySelector('input[name="address1"]')?.value.trim() || '';
            const address2 = detailsForm.querySelector('input[name="address2"]')?.value.trim() || '';
            const city = detailsForm.querySelector('input[name="city"]')?.value.trim() || '';
            const pincode = detailsForm.querySelector('input[name="pincode"]')?.value.trim() || '';
            const state = detailsForm.querySelector('select[name="state"]')?.value.trim() || '';
            const upi = detailsForm.querySelector('input[name="upi"]')?.value.trim() || '';

            if (!address1 || !city || !pincode || !state || !upi) {
                alert('Please fill out all required fields.');
                return;
            }

            const token = localStorage.getItem('km_access_token');
            const storedUserId = sessionStorage.getItem('km_current_user_id') || 
                                 JSON.parse(localStorage.getItem('km_user') || '{}')?.id;

            if (completeBtn) {
                completeBtn.disabled = true;
                completeBtn.textContent = 'Saving Profile...';
            }

            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        user_id: storedUserId ? parseInt(storedUserId) : null,
                        address_line1: address1,
                        address_line2: address2 || null,
                        city: city,
                        pincode: pincode,
                        state: state,
                        upi_id: upi
                    })
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    localStorage.setItem('km_user', JSON.stringify(updatedUser));
                } else {
                    const errData = await response.json().catch(() => ({}));
                    console.warn('API error completing profile:', errData);
                }
            } catch (err) {
                console.warn('Backend server unavailable, continuing with UI confirmation:', err);
            }

            // Trigger success animation
            if (overlay) {
                overlay.classList.add('active');
            }

            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2600);
        });
    }
});
