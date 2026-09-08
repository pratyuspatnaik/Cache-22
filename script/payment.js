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
        const checkedRadio = document.querySelector('input[name="payment_method"]:checked');
        if (!checkedRadio) return; // Exit if no payment radios exist (they were removed)

        const selectedValue = checkedRadio.value;
        
        const boxes = ['upi', 'netbanking', 'card', 'cash'];
        
        boxes.forEach(method => {
            const box = document.getElementById(method + '-details-box');
            if(!box) return;
            
            if (method === selectedValue) {
                box.style.display = 'block';
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
                    removeError(i.id);
                });
            }
        });
    }

    if (paymentRadios.length > 0) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', updatePaymentBoxes);
        });
        updatePaymentBoxes();
    }

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

    // --- Form Submission & Razorpay Integration ---
    document.getElementById('pay-btn').addEventListener('click', async function (e) {
        e.preventDefault();
        
        const messageContainer = document.getElementById('payment-message-container');
        messageContainer.style.display = 'none';

        let isValid = true;
        const currentRequiredInputs = form.querySelectorAll('input[required], select[required]');

        currentRequiredInputs.forEach(input => {
            let val = input.value.trim();
            if (!val) {
                showError(input.id, 'This field is required');
                isValid = false;
            }
        });

        if (!isValid) return;

        try {
            // Step 1: Create Order by calling Backend
            const response = await fetch('http://localhost:8000/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1250 })
            });

            if (!response.ok) throw new Error('Failed to create order');

            const order = await response.json();

            // Step 2: Open Razorpay checkout
            const options = {
                key: "rzp_test_TZcFs1Xf3UjUzo", // Will be replaced by user
                amount: order.amount,
                currency: order.currency,
                name: "KrishiMandi",
                description: "Crop Payment",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // Step 3: Verify Payment
                        const verifyRes = await fetch('http://localhost:8000/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        
                        if (verifyRes.ok) {
                            messageContainer.style.display = 'block';
                            messageContainer.style.color = '#4C7A3B'; // Success color
                            messageContainer.innerHTML = 'Payment successful! <br><a href="#" id="download-receipt" style="text-decoration: underline; color: #4C7A3B;">Download Fee Receipt</a>';
                            
                            // Setup receipt download
                            document.getElementById('download-receipt').addEventListener('click', function(e) {
                                e.preventDefault();
                                const receiptContent = `KrishiMandi Payment Receipt\n\nOrder ID: ${order.id}\nPayment ID: ${response.razorpay_payment_id}\nAmount Paid: Rs. 1250\nDate: ${new Date().toLocaleString()}\n\nThank you for choosing KrishiMandi!`;
                                const blob = new Blob([receiptContent], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'KrishiMandi_Receipt.txt';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            });
                            
                            // Show success overlay optionally
                            const overlay = document.getElementById('success-overlay');
                            overlay.classList.add('active');
                            setTimeout(() => overlay.classList.remove('active'), 2000);
                        } else {
                            throw new Error('Verification failed');
                        }
                    } catch (err) {
                        messageContainer.style.display = 'block';
                        messageContainer.style.color = 'red';
                        messageContainer.textContent = 'Payment failed, Please try again.';
                    }
                },
                theme: {
                    color: "#4C7A3B"
                }
            };
            
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response){
                messageContainer.style.display = 'block';
                messageContainer.style.color = 'red';
                messageContainer.textContent = 'Payment failed, Please try again.';
            });
            
            rzp.open();
            
        } catch (error) {
            console.error(error);
            messageContainer.style.display = 'block';
            messageContainer.style.color = 'red';
            messageContainer.textContent = 'Failed to initiate payment. Ensure backend is running.';
        }
    });
});
