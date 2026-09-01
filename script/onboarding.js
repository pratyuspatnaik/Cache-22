/**
 * KrishiMandi - Onboarding JavaScript (script/onboarding.js)
 * Handles mobile number digit validation, live error alerts, and password visibility toggle.
 */
document.addEventListener('DOMContentLoaded', () => {
    const mobileInput = document.getElementById('mobile-field');
    const mobileError = document.getElementById('mobile-error');
    let errorTimer = null;

    function showError(message) {
        if (!mobileError) return;
        mobileError.textContent = message;
        mobileError.classList.add('visible');
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            mobileError.classList.remove('visible');
        }, 5000);
    }

    if (mobileInput) {
        mobileInput.addEventListener('input', function () {
            const cleaned = this.value.replace(/\D/g, '');
            if (cleaned !== this.value) {
                showError('Only numbers are allowed.');
            }
            this.value = cleaned.slice(0, 10);
        });

        mobileInput.addEventListener('blur', function () {
            if (this.value.length > 0 && this.value.length < 10) {
                showError('Mobile number must be exactly 10 digits.');
            }
        });
    }

    const eyeBtn = document.getElementById('eye-btn');
    const passwordField = document.getElementById('password-field');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');

    if (eyeBtn && passwordField && eyeIcon && eyeOffIcon) {
        eyeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const isHidden = passwordField.type === 'password';
            passwordField.type = isHidden ? 'text' : 'password';
            eyeIcon.style.display = isHidden ? 'none' : 'block';
            eyeOffIcon.style.display = isHidden ? 'block' : 'none';
        });
    }
});
