/**
 * KrishiMandi - Profile Management JavaScript (script/profile.js)
 * Connects directly with FastAPI backend to load user profile via GET /api/auth/me,
 * persists inline edits and dialog updates via PUT /api/auth/profile,
 * and maintains synchronized local storage.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : '/api';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('km_access_token');
    const toastNotice = document.getElementById('toast-notice');
    const toastText = document.getElementById('toast-text');
    let toastTimer = null;

    function showToast(message, isError = false) {
        if (!toastNotice) return;
        toastText.textContent = message;
        if (isError) {
            toastNotice.classList.add('error');
        } else {
            toastNotice.classList.remove('error');
        }
        toastNotice.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastNotice.classList.remove('visible');
        }, 4000);
    }

    // Check if user is logged in
    if (!token) {
        const storedUser = localStorage.getItem('km_user');
        if (!storedUser) {
            // Not logged in, prompt and redirect
            showToast('Please log in to view and edit your profile.', true);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
    }

    // Elements
    const nameEl = document.getElementById('user-name-index');
    const roleBadge = document.getElementById('user-role-badge');
    const avatarText = document.getElementById('profile-avatar-text');
    const logoutBtn = document.getElementById('logout-btn');

    let currentUserData = null;

    // Load current profile from Backend API
    async function loadUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                currentUserData = await response.json();
                localStorage.setItem('km_user', JSON.stringify(currentUserData));
                renderProfileData(currentUserData);
            } else if (response.status === 401) {
                localStorage.removeItem('km_access_token');
                localStorage.removeItem('km_user');
                showToast('Session expired. Please log in again.', true);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                // Fallback to localStorage if backend temporarily unreachable
                const local = localStorage.getItem('km_user');
                if (local) {
                    currentUserData = JSON.parse(local);
                    renderProfileData(currentUserData);
                }
            }
        } catch (err) {
            console.warn('Cannot contact backend, using cached profile:', err);
            const local = localStorage.getItem('km_user');
            if (local) {
                currentUserData = JSON.parse(local);
                renderProfileData(currentUserData);
            }
        }
    }

    function renderProfileData(user) {
        if (!user) return;

        const displayName = user.full_name || (user.mobile_number ? `Farmer (+91-${user.mobile_number})` : 'Farmer User');
        if (nameEl) nameEl.textContent = displayName;

        // Initials for avatar
        if (avatarText) {
            const parts = displayName.trim().split(' ');
            const initials = parts.length > 1 
                ? (parts[0][0] + parts[1][0]).toUpperCase() 
                : displayName.slice(0, 2).toUpperCase();
            avatarText.textContent = initials;
        }

        if (roleBadge) {
            roleBadge.textContent = user.role || 'Farmer';
        }

        // Populate detail fields
        setFieldText('detail-name', user.full_name || 'Farmer User');
        setFieldText('detail-language', capitalize(user.language_preference || 'English'));
        setFieldText('detail-phone', user.mobile_number ? `+91-${user.mobile_number}` : 'Not set');
        setFieldText('detail-password', '••••••••');
        setFieldText('detail-address1', user.address_line1 || 'Not configured');
        setFieldText('detail-address2', user.address_line2 || 'Not configured');
        setFieldText('detail-city', user.city || 'Not configured');
        setFieldText('detail-pincode', user.pincode || 'Not configured');
        setFieldText('detail-state', user.state || 'Not configured');
        setFieldText('detail-upi', user.upi_id || 'Not configured');
        setFieldText('detail-aadhar', user.aadhar_number ? maskAadhaar(user.aadhar_number) : '•••• •••• ••••');

        // Pre-fill dialogs
        const addr1Input = document.getElementById('new-address1');
        const addr2Input = document.getElementById('new-address2');
        const cityInput = document.getElementById('new-city');
        const pinInput = document.getElementById('new-pincode');
        const stateInput = document.getElementById('new-state');
        const upiInput = document.getElementById('new-upi');
        const aadharInput = document.getElementById('new-aadhar');

        if (addr1Input && user.address_line1) addr1Input.value = user.address_line1;
        if (addr2Input && user.address_line2) addr2Input.value = user.address_line2;
        if (cityInput && user.city) cityInput.value = user.city;
        if (pinInput && user.pincode) pinInput.value = user.pincode;
        if (stateInput && user.state) stateInput.value = user.state;
        if (upiInput && user.upi_id) upiInput.value = user.upi_id;
        if (aadharInput && user.aadhar_number) aadharInput.value = user.aadhar_number;
    }

    function setFieldText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function maskAadhaar(val) {
        if (!val) return '•••• •••• ••••';
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) {
            return `•••• •••• ${digits.slice(-4)}`;
        }
        return '•••• •••• ••••';
    }

    // Backend update helper
    async function updateBackendProfile(payload) {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to update profile');
        }

        const updated = await response.json();
        currentUserData = updated;
        localStorage.setItem('km_user', JSON.stringify(updated));
        renderProfileData(updated);
        showToast('Profile updated and saved to backend!');
        return updated;
    }

    // Inline Edit Handlers
    const editRows = document.querySelectorAll('.detail-row');
    editRows.forEach(row => {
        const btn = row.querySelector('.edit-btn');
        const key = row.dataset.key;
        if (!btn || !key) return;

        btn.addEventListener('click', () => {
            const valueSpan = row.querySelector('.detail-value');
            if (!valueSpan || row.querySelector('.edit-input')) return;

            const originalText = valueSpan.textContent.trim();
            const input = document.createElement('input');
            input.type = key === 'password' ? 'password' : 'text';
            input.className = 'edit-input';

            // Placeholder and default value
            if (key === 'password') {
                input.placeholder = 'Enter new password (min 4 chars)';
                input.value = '';
            } else if (key === 'mobile_number') {
                input.value = originalText.replace('+91-', '').trim();
                input.maxLength = 10;
                input.inputMode = 'numeric';
            } else if (key === 'aadhar_number') {
                input.placeholder = '12-digit Aadhaar number';
                input.maxLength = 12;
                input.inputMode = 'numeric';
                input.value = (currentUserData?.aadhar_number || '').replace(/\D/g, '');
            } else if (key === 'upi_id') {
                input.placeholder = 'e.g. 9876543210@ybl or farmer@upi';
                input.value = currentUserData?.upi_id || '';
            } else if (key === 'pincode') {
                input.placeholder = '6-digit PIN code';
                input.maxLength = 6;
                input.inputMode = 'numeric';
                input.value = (currentUserData?.pincode || '').replace(/\D/g, '');
            } else if (originalText === 'Not configured') {
                input.value = '';
            } else {
                input.value = originalText;
            }

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'edit-save-btn';
            saveBtn.textContent = 'Save';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'edit-cancel-btn';
            cancelBtn.textContent = '✕';

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'inline-flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.appendChild(saveBtn);
            btnContainer.appendChild(cancelBtn);

            valueSpan.replaceWith(input);
            btn.style.display = 'none';
            btn.insertAdjacentElement('afterend', btnContainer);
            input.focus();

            // Cancel action
            cancelBtn.addEventListener('click', () => {
                input.replaceWith(valueSpan);
                btnContainer.remove();
                btn.style.display = '';
            });

            // Save action
            saveBtn.addEventListener('click', async () => {
                let newVal = input.value.trim();
                if (!newVal && key !== 'password') {
                    showToast('Field cannot be empty', true);
                    return;
                }

                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                try {
                    const updatePayload = {};
                    if (key === 'password') {
                        if (newVal.length < 4) {
                            showToast('Password must be at least 4 characters', true);
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save';
                            return;
                        }
                        updatePayload.password = newVal;
                    } else if (key === 'mobile_number') {
                        const cleaned = newVal.replace(/\D/g, '');
                        if (cleaned.length !== 10) {
                            showToast('Mobile number must be exactly 10 digits', true);
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save';
                            return;
                        }
                        updatePayload.mobile_number = cleaned;
                    } else if (key === 'aadhar_number') {
                        const cleaned = newVal.replace(/\D/g, '');
                        if (cleaned.length !== 12) {
                            showToast('Aadhaar must be exactly 12 numeric digits', true);
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save';
                            return;
                        }
                        updatePayload.aadhar_number = cleaned;
                    } else if (key === 'upi_id') {
                        if (!/^[\w.-]{2,100}@[a-zA-Z]{2,64}$/.test(newVal)) {
                            showToast('Invalid UPI ID. Format must be user@bank (e.g. 9876543210@ybl)', true);
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save';
                            return;
                        }
                        updatePayload.upi_id = newVal;
                    } else if (key === 'pincode') {
                        const cleaned = newVal.replace(/\D/g, '');
                        if (cleaned.length !== 6) {
                            showToast('Pincode must be exactly 6 numeric digits', true);
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Save';
                            return;
                        }
                        updatePayload.pincode = cleaned;
                    } else {
                        updatePayload[key] = newVal;
                    }

                    await updateBackendProfile(updatePayload);

                    input.replaceWith(valueSpan);
                    btnContainer.remove();
                    btn.style.display = '';
                } catch (err) {
                    showToast(err.message, true);
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save';
                }
            });
        });
    });

    // Top Name Edit Button
    const editNameBtn = document.getElementById('edit-name-btn');
    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            const nameRow = document.querySelector('.detail-row[data-key="full_name"] .edit-btn');
            if (nameRow) nameRow.click();
        });
    }

    // Address Dialog
    const addressDialog = document.getElementById('address-dialog');
    const addAddressBtn = document.getElementById('add-address-btn');
    const closeAddressDialog = document.getElementById('close-address-dialog');
    const addAddressForm = document.getElementById('add-address-form');
    const saveAddressBtn = document.getElementById('save-address-btn');

    if (addressDialog && addAddressBtn) {
        addAddressBtn.addEventListener('click', () => {
            addressDialog.showModal();
        });
        closeAddressDialog.addEventListener('click', () => {
            addressDialog.close();
        });
        addressDialog.addEventListener('click', (e) => {
            if (e.target === addressDialog) addressDialog.close();
        });

        addAddressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalText = saveAddressBtn.textContent;
            saveAddressBtn.disabled = true;
            saveAddressBtn.textContent = 'Saving to Database...';

            try {
                const payload = {
                    address_line1: document.getElementById('new-address1').value.trim(),
                    address_line2: document.getElementById('new-address2').value.trim() || null,
                    city: document.getElementById('new-city').value.trim(),
                    pincode: document.getElementById('new-pincode').value.trim(),
                    state: document.getElementById('new-state').value.trim()
                };

                await updateBackendProfile(payload);
                addressDialog.close();
            } catch (err) {
                showToast(err.message, true);
            } finally {
                saveAddressBtn.disabled = false;
                saveAddressBtn.textContent = originalText;
            }
        });
    }

    // Payment Dialog
    const paymentDialog = document.getElementById('payment-dialog');
    const addPaymentBtn = document.getElementById('add-payment-btn');
    const closePaymentDialog = document.getElementById('close-payment-dialog');
    const addPaymentForm = document.getElementById('add-payment-form');
    const savePaymentBtn = document.getElementById('save-payment-btn');

    if (paymentDialog && addPaymentBtn) {
        addPaymentBtn.addEventListener('click', () => {
            paymentDialog.showModal();
        });
        closePaymentDialog.addEventListener('click', () => {
            paymentDialog.close();
        });
        paymentDialog.addEventListener('click', (e) => {
            if (e.target === paymentDialog) paymentDialog.close();
        });

        addPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalText = savePaymentBtn.textContent;
            savePaymentBtn.disabled = true;
            savePaymentBtn.textContent = 'Saving Payout Method...';

            try {
                const upi = document.getElementById('new-upi').value.trim();
                const aadhar = document.getElementById('new-aadhar').value.trim();

                const payload = {
                    upi_id: upi
                };
                if (aadhar) payload.aadhar_number = aadhar;

                await updateBackendProfile(payload);
                paymentDialog.close();
            } catch (err) {
                showToast(err.message, true);
            } finally {
                savePaymentBtn.disabled = false;
                savePaymentBtn.textContent = originalText;
            }
        });
    }

    // Logout Button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('km_access_token');
            localStorage.removeItem('km_user');
            showToast('Logged out successfully.');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 600);
        });
    }

    // Initial Load
    await loadUserProfile();
});
