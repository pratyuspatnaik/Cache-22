/**
 * KrishiMandi - Details Profile JavaScript (script/details.js)
 * Handles profile completion submission, communicates with FastAPI backend,
 * triggers success animation overlay, and navigates back to the home page.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : '/api';

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

    // Detect role
    let currentRole = 'farmer';
    try {
        const storedUser = JSON.parse(localStorage.getItem('km_user') || '{}');
        currentRole = localStorage.getItem('km_role') || storedUser.role || 'farmer';
        const nameInput = document.getElementById('fullname');
        if (nameInput && storedUser.full_name && storedUser.full_name !== 'Farmer User') {
            nameInput.value = storedUser.full_name;
        }
    } catch (e) {}

    // Configure role-specific UI visibility
    const farmerFields = document.getElementById('farmer-fields');
    const buyerFields = document.getElementById('buyer-fields');
    const partnerFields = document.getElementById('partner-fields');
    const aadharInput = document.getElementById('aadhar');

    if (currentRole === 'buyer') {
        if (farmerFields) farmerFields.style.display = 'none';
        if (buyerFields) buyerFields.style.display = 'block';
        if (partnerFields) partnerFields.style.display = 'none';
        if (aadharInput) aadharInput.removeAttribute('required');
    } else if (currentRole === 'partner') {
        if (farmerFields) farmerFields.style.display = 'none';
        if (buyerFields) buyerFields.style.display = 'none';
        if (partnerFields) partnerFields.style.display = 'block';
        if (aadharInput) aadharInput.removeAttribute('required');
    } else {
        // Farmer by default
        if (farmerFields) farmerFields.style.display = 'block';
        if (buyerFields) buyerFields.style.display = 'none';
        if (partnerFields) partnerFields.style.display = 'none';
        if (aadharInput) aadharInput.setAttribute('required', 'required');
    }

    if (aadharInput) {
        aadharInput.addEventListener('input', function () {
            let digits = this.value.replace(/\D/g, '').slice(0, 12);
            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += digits[i];
            }
            this.value = formatted;
        });
    }

    if (detailsForm) {
        detailsForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearError();

            const fullname = detailsForm.querySelector('input[name="fullname"]')?.value.trim() || '';
            const address1 = detailsForm.querySelector('input[name="address1"]')?.value.trim() || '';
            const address2 = detailsForm.querySelector('input[name="address2"]')?.value.trim() || '';
            const city = detailsForm.querySelector('input[name="city"]')?.value.trim() || '';
            const pincode = detailsForm.querySelector('input[name="pincode"]')?.value.trim() || '';
            const state = detailsForm.querySelector('select[name="state"]')?.value.trim() || '';
            const rawAadhar = aadharInput ? aadharInput.value.replace(/\D/g, '') : '';
            const upi = detailsForm.querySelector('input[name="upi"]')?.value.trim() || '';

            // Role-specific field values
            const farmLocation = detailsForm.querySelector('input[name="farm_location"]')?.value.trim() || null;
            const primaryCrops = detailsForm.querySelector('input[name="primary_crops"]')?.value.trim() || null;
            const buyerType = detailsForm.querySelector('select[name="buyer_type"]')?.value || 'individual';
            const gstin = detailsForm.querySelector('input[name="gstin"]')?.value.trim() || null;
            const vehicleDetails = detailsForm.querySelector('input[name="vehicle_details"]')?.value.trim() || null;
            const serviceArea = detailsForm.querySelector('input[name="service_area"]')?.value.trim() || null;
            const capacity = detailsForm.querySelector('input[name="capacity"]')?.value.trim() || null;

            if (!address1 || !city || !pincode || !state || !upi) {
                showError('Please fill out all required fields (Address, City, Pincode, State, UPI ID).');
                return;
            }

            if (!/^\d{6}$/.test(pincode)) {
                showError('Pincode must be exactly 6 digits.');
                return;
            }

            // Enforce Aadhaar validation for Farmer only
            if (currentRole === 'farmer') {
                if (!rawAadhar || rawAadhar.length !== 12) {
                    showError('Farmers must enter a valid 12-digit Aadhaar number for mandi verification.');
                    if (aadharInput) aadharInput.focus();
                    return;
                }
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

                const payload = {
                    user_id: currentUserId ? parseInt(currentUserId) : null,
                    full_name: fullname || undefined,
                    address_line1: address1,
                    address_line2: address2 || null,
                    city: city,
                    pincode: pincode,
                    state: state,
                    upi_id: upi,
                    aadhar_number: currentRole === 'farmer' ? rawAadhar : null,
                    farm_location: farmLocation,
                    primary_crops: primaryCrops,
                    buyer_type: buyerType,
                    gstin: gstin,
                    vehicle_details: vehicleDetails,
                    service_area: serviceArea,
                    capacity: capacity
                };

                const response = await fetch(`${API_BASE_URL}/auth/complete-profile`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    localStorage.setItem('km_user', JSON.stringify(updatedUser));
                    localStorage.setItem('km_role', updatedUser.role || currentRole);
                    
                    // Trigger success animation
                    if (overlay) {
                        overlay.classList.add('active');
                    }

                    setTimeout(() => {
                        // Role-based routing: buyers to discovery marketplace, farmers to homepage/portal
                        if (currentRole === 'buyer') {
                            window.location.href = 'discovery.html';
                        } else {
                            window.location.href = '../index.html';
                        }
                    }, 2000);
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
                showError('Cannot reach backend server. Please verify backend is running.');
                if (completeBtn) {
                    completeBtn.disabled = false;
                    completeBtn.textContent = originalBtnText;
                }
            }
        });
    }
});
