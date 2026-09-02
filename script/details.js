/**
 * KrishiMandi - Details Profile JavaScript (script/details.js)
 * Handles profile completion submission, Aadhaar auto-formatting,
 * and triggers success animation overlay.
 */
document.addEventListener('DOMContentLoaded', () => {
    const aadharInput = document.getElementById('aadhar');
    const pincodeInput = document.getElementById('pincode');
    const completeBtn = document.getElementById('complete-btn');
    const overlay = document.getElementById('success-overlay');

    // Auto-format Aadhaar Number into XXXX XXXX XXXX chunks
    if (aadharInput) {
        aadharInput.addEventListener('input', function () {
            // Strip all non-digits
            let digits = this.value.replace(/\D/g, '').slice(0, 12);
            // Format into 4-digit blocks
            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formatted += ' ';
                }
                formatted += digits[i];
            }
            this.value = formatted;
        });
    }

    // Sanitize Pincode to 6 digits
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    if (completeBtn && overlay) {
        completeBtn.addEventListener('click', function (e) {
            e.preventDefault();

            overlay.classList.add('active');

            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2800);
        });
    }
});
