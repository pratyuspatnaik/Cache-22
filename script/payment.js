document.addEventListener('DOMContentLoaded', function() {
    
    // --- Auto-formatting for Card Inputs ---
    const cardInput = document.getElementById('card_number');
    if(cardInput) {
        cardInput.addEventListener('input', function (e) {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(.{4})/g, '$1 ').trim();
            this.value = value;
        });
    }

    const expiryInput = document.getElementById('expiry');
    if(expiryInput) {
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
        
        if(inputField) {
            inputField.classList.add('error-border');
        }
        
        if(!errorToast) return;
        
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
        
        if(inputField) {
            inputField.classList.remove('error-border');
        }
        if(errorToast) {
            errorToast.classList.remove('visible');
            clearTimeout(errorTimers[inputId]);
        }
    }

    // --- Toggle Address Box ---
    const addressRadios = document.querySelectorAll('input[name="address_selection"]');
    
    function updateAddressBox() {
        const selectedValue = document.querySelector('input[name="address_selection"]:checked').value;
        const box = document.getElementById('new-address-box');
        
        if (selectedValue === 'new') {
            box.style.display = 'block';
            // Require fields except landmark
            ['address', 'city', 'pincode'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.setAttribute('required', 'true');
            });
        } else {
            box.style.display = 'none';
            // Remove require
            ['address', 'city', 'pincode'].forEach(id => {
                const el = document.getElementById(id);
                if(el) {
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
        const selectedValue = document.querySelector('input[name="payment_method"]:checked').value;
        
        const boxes = ['upi', 'netbanking', 'card', 'cash'];
        
        boxes.forEach(method => {
            const box = document.getElementById(method + '-details-box');
            if(!box) return;
            
            if (method === selectedValue) {
                box.style.display = 'block';
                // Add required to inputs in this box if they shouldn't be empty
                // For simplicity, we just look for inputs we care about
                const inputs = box.querySelectorAll('input, select');
                inputs.forEach(i => {
                    if(i.id !== '') {
                        i.setAttribute('required', 'true');
                    }
                });
            } else {
                box.style.display = 'none';
                const inputs = box.querySelectorAll('input, select');
                inputs.forEach(i => {
                    i.removeAttribute('required');
                    removeError(i.id); // clear errors from hidden boxes
                });
            }
        });
    }

    paymentRadios.forEach(radio => {
        radio.addEventListener('change', updatePaymentBoxes);
    });
    
    // Initialize correct box on load
    updatePaymentBoxes();

    // Validate on blur
    function attachBlurValidation() {
        const allInputs = form.querySelectorAll('input, select');
        allInputs.forEach(input => {
            input.addEventListener('blur', function() {
                if(!this.hasAttribute('required')) return;
                
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

    // --- Form Submission & Success Overlay ---
    document.getElementById('pay-btn').addEventListener('click', function (e) {
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
            overlay.classList.add('active');

            setTimeout(() => {
                // Redirect back to homepage after animation
                window.location.href = '../index.html';
            }, 3000);
        }
    });
});
