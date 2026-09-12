/**
 * KrishiMandi - Payment & Checkout JavaScript (script/payment.js)
 * Pre-populates shipping address & UPI ID from authenticated user profile,
 * handles payment method toggles, input formatting, client validation,
 * and order confirmation workflow.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : '/api';

document.addEventListener('DOMContentLoaded', async function() {
    
    // Auth Guard: cart / payment is only accessible after login
    const token = localStorage.getItem('km_access_token');
    if (!token) {
        alert('Please log in first to view your cart and checkout.');
        window.location.href = 'login.html';
        return;
    }

    let userData = null;
    try {
        const stored = localStorage.getItem('km_user');
        if (stored) userData = JSON.parse(stored);
    } catch (e) {
        console.warn('Error reading stored user', e);
    }

    // Try fetching latest user profile if token available
    if (token) {
        try {
            const resp = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                userData = await resp.json();
                localStorage.setItem('km_user', JSON.stringify(userData));
            }
        } catch (e) {
            console.warn('Could not refresh user for payment page:', e);
        }
    }

    const savedAddrOption = document.getElementById('saved-address-option');
    const savedAddrTitle = document.getElementById('saved-address-title');
    const savedAddrContent = document.getElementById('saved-address-content');
    const upiInput = document.getElementById('upi_id');

    if (userData && (userData.address_line1 || userData.city)) {
        if (savedAddrTitle) {
            savedAddrTitle.textContent = `${userData.full_name || 'Farmer User'} (Saved Address)`;
        }
        if (savedAddrContent) {
            const parts = [
                userData.address_line1,
                userData.address_line2,
                `${userData.city || ''}, ${userData.state || ''} ${userData.pincode ? '- ' + userData.pincode : ''}`
            ].filter(Boolean);
            savedAddrContent.innerHTML = parts.join('<br>') + `<br><small style="color: var(--primary-color);">Mobile: +91-${userData.mobile_number || ''}</small>`;
        }
    } else {
        if (savedAddrTitle) savedAddrTitle.textContent = 'Primary Address (Default)';
        if (savedAddrContent) {
            savedAddrContent.innerHTML = 'Plot 42, Green Farm Road, Near APMC Mandi<br>Pune, Maharashtra - 411001';
        }
    }

    if (userData && userData.upi_id && upiInput) {
        upiInput.value = userData.upi_id;
    }

    // --- Auto-formatting for Card Inputs ---
    const cardInput = document.getElementById('card_number');
    if (cardInput) {
        cardInput.addEventListener('input', function (e) {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(.{4})/g, '$1 ').trim();
            this.value = value;
        });
    }

    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function (e) {
            let value = this.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            this.value = value;
        });
    }

    const form = document.getElementById('payment-form');
    let errorTimers = {};

    function showError(inputId, message) {
        const errorToast = document.getElementById(inputId + '-error');
        const inputField = document.getElementById(inputId);
        
        if (inputField) {
            inputField.classList.add('error-border');
        }
        
        if (!errorToast) return;
        
        errorToast.textContent = message;
        errorToast.classList.add('visible');
        
        clearTimeout(errorTimers[inputId]);
        errorTimers[inputId] = setTimeout(() => {
            errorToast.classList.remove('visible');
        }, 5000);
    }
    
    function removeError(inputId) {
        const errorToast = document.getElementById(inputId + '-error');
        const inputField = document.getElementById(inputId);
        
        if (inputField) {
            inputField.classList.remove('error-border');
        }
        if (errorToast) {
            errorToast.classList.remove('visible');
            clearTimeout(errorTimers[inputId]);
        }
    }

    // --- Toggle Address Box ---
    const addressRadios = document.querySelectorAll('input[name="address_selection"]');
    
    function updateAddressBox() {
        const checked = document.querySelector('input[name="address_selection"]:checked');
        if (!checked) return;
        const selectedValue = checked.value;
        const box = document.getElementById('new-address-box');
        if (!box) return;
        
        if (selectedValue === 'new') {
            box.style.display = 'block';
            ['address', 'city', 'pincode'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.setAttribute('required', 'true');
            });
        } else {
            box.style.display = 'none';
            ['address', 'city', 'pincode'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.removeAttribute('required');
                    removeError(id);
                }
            });
        }
    }

    addressRadios.forEach(radio => {
        radio.addEventListener('change', updateAddressBox);
    });
    
    updateAddressBox();

    // --- Toggle Payment Details Boxes ---
    const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
    
    function updatePaymentBoxes() {
        const checked = document.querySelector('input[name="payment_method"]:checked');
        if (!checked) return;
        const selectedValue = checked.value;
        
        const boxes = ['upi', 'netbanking', 'card', 'cash'];
        
        boxes.forEach(method => {
            const box = document.getElementById(method + '-details-box');
            if (!box) return;
            
            if (method === selectedValue) {
                box.style.display = 'block';
                const inputs = box.querySelectorAll('input, select');
                inputs.forEach(i => {
                    if (i.id !== '') {
                        i.setAttribute('required', 'true');
                    }
                });
            } else {
                box.style.display = 'none';
                const inputs = box.querySelectorAll('input, select');
                inputs.forEach(i => {
                    i.removeAttribute('required');
                    removeError(i.id);
                });
            }
        });
    }

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', updatePaymentBoxes);
    });
    
    updatePaymentBoxes();

    // Validate on blur
    function attachBlurValidation() {
        if (!form) return;
        const allInputs = form.querySelectorAll('input, select');
        allInputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (!this.hasAttribute('required')) return;
                
                let val = this.value.trim();
                
                if (!val) {
                    showError(this.id, 'This field is required');
                } else if (this.id === 'pincode' && val.length < 6) {
                    showError(this.id, 'Pincode must be 6 digits');
                } else if (this.id === 'card_number' && val.replace(/\s/g, '').length < 16) {
                    showError(this.id, 'Enter a valid 16-digit card number');
                } else if (this.id === 'expiry' && val.length < 5) {
                    showError(this.id, 'Format MM/YY');
                } else {
                    removeError(this.id);
                }
            });
            
            input.addEventListener('input', function() {
                removeError(this.id);
            });
            input.addEventListener('change', function() {
                removeError(this.id);
            });
        });
    }
    
    attachBlurValidation();

    // Download Bill handler
    const billBtn = document.getElementById('download-bill-btn');
    if (billBtn) {
        billBtn.addEventListener('click', () => {
            const billText = `KRISHIMANDI DIRECT FARMER MARKETPLACE
----------------------------------------
Proforma Invoice: #KM-INV-2026-904
Customer: ${userData?.full_name || 'Farmer Customer'}
Contact: +91-${userData?.mobile_number || '9876543210'}
Item: Organic Basmati Rice (A-Grade) - 20 kg
Subtotal: ₹1,200.00
Delivery / Logistics: ₹50.00
Total: ₹1,250.00
Escrow Status: Protected by SIH 2026 Direct Payment Guarantee
----------------------------------------
Thank you for supporting Indian Farmers!`;
            
            const blob = new Blob([billText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `KrishiMandi_Invoice_KM904.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // --- Form Submission & Success Overlay ---
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        payBtn.addEventListener('click', function (e) {
            e.preventDefault();
            
            let isValid = true;
            const currentRequiredInputs = form.querySelectorAll('input[required], select[required]');

            currentRequiredInputs.forEach(input => {
                let val = input.value.trim();
                if (!val) {
                    showError(input.id, 'This field is required');
                    isValid = false;
                } else if (input.id === 'pincode' && val.length < 6) {
                    showError(input.id, 'Pincode must be 6 digits');
                    isValid = false;
                } else if (input.id === 'card_number' && val.replace(/\s/g, '').length < 16) {
                    showError(input.id, 'Enter a valid 16-digit card number');
                    isValid = false;
                } else if (input.id === 'expiry' && val.length < 5) {
                    showError(input.id, 'Format MM/YY');
                    isValid = false;
                }
            });

            if (isValid) {
                const overlay = document.getElementById('success-overlay');
                if (overlay) overlay.classList.add('active');

                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2800);
            }
        });
    }
});
