/**
 * KrishiMandi - Onboarding JavaScript (script/onboarding.js)
 * Handles mobile number digit validation, live error alerts, password visibility toggle,
 * and integration with FastAPI backend for registration and OTP sending.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    const onboardForm = document.getElementById('onboard-form') || document.querySelector('.onboard-form') || document.querySelector('form');
    const mobileInput = document.getElementById('mobile-field');
    const mobileError = document.getElementById('mobile-error');
    const passwordField = document.getElementById('password-field');
    const eyeBtn = document.getElementById('eye-btn');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    const otpToggle = document.getElementById('otp-toggle');
    const getOtpLabel = document.querySelector('.get-otp-btn');
    const otpInput = document.querySelector('input[name="otp"]');
    const resendLink = document.querySelector('.resend-link');

    let errorTimer = null;

    function showError(message) {
        if (!mobileError) {
            alert(message);
            return;
        }
        mobileError.textContent = message;
        mobileError.classList.add('visible');
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            mobileError.classList.remove('visible');
        }, 7000);
    }

    function clearError() {
        if (!mobileError) return;
        mobileError.classList.remove('visible');
        mobileError.textContent = '';
    }

    // 1. Mobile number live sanitation
    if (mobileInput) {
        mobileInput.addEventListener('input', function () {
            const cleaned = this.value.replace(/\D/g, '');
            if (cleaned !== this.value) {
                showError('Only numbers are allowed.');
            }
            this.value = cleaned.slice(0, 10);
            if (this.value.length === 10) {
                clearError();
            }
        });

        mobileInput.addEventListener('blur', function () {
            if (this.value.length > 0 && this.value.length < 10) {
                showError('Mobile number must be exactly 10 digits.');
            }
        });
    }

    // 2. Password visibility toggle
    if (eyeBtn && passwordField && eyeIcon && eyeOffIcon) {
        eyeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const isHidden = passwordField.type === 'password';
            passwordField.type = isHidden ? 'text' : 'password';
            eyeIcon.style.display = isHidden ? 'none' : 'block';
            eyeOffIcon.style.display = isHidden ? 'block' : 'none';
        });
    }

    // 3. OTP Request integration
    async function requestOtp() {
        const mobile = mobileInput ? mobileInput.value.trim() : '';
        if (!mobile || mobile.length !== 10) {
            showError('Please enter a valid 10-digit mobile number to get OTP.');
            if (mobileInput) mobileInput.focus();
            if (otpToggle) otpToggle.checked = false;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: mobile })
            });

            const data = await response.json();
            if (response.ok) {
                console.log('OTP dispatched:', data);
                // Pre-fill demo OTP code if in local development mode
                if (data.data && data.data.otp_code && otpInput) {
                    otpInput.value = data.data.otp_code;
                }
            } else {
                showError(data.detail || 'Failed to send OTP. Please try again.');
            }
        } catch (err) {
            console.warn('Backend server not reachable for OTP:', err);
            showError('Unable to reach backend server. Please verify backend is running at ' + API_BASE_URL);
        }
    }

    if (getOtpLabel) {
        getOtpLabel.addEventListener('click', () => {
            setTimeout(requestOtp, 50);
        });
    }

    if (resendLink) {
        resendLink.addEventListener('click', (e) => {
            e.preventDefault();
            requestOtp();
        });
    }

    // 4. Form Submission & Registration API call
    if (onboardForm) {
        onboardForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const mobile = mobileInput ? mobileInput.value.trim() : '';
            const password = passwordField ? passwordField.value : '';
            const selectedLang = document.querySelector('input[name="language"]:checked');
            const language = selectedLang ? selectedLang.value : 'english';
            const otp = otpInput ? otpInput.value.trim() : null;

            if (!mobile || mobile.length !== 10) {
                showError('Mobile number must be exactly 10 digits.');
                if (mobileInput) mobileInput.focus();
                return;
            }

            if (!password || password.length < 4) {
                showError('Password must be at least 4 characters.');
                if (passwordField) passwordField.focus();
                return;
            }

            const submitBtn = onboardForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating Account...';
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: mobile,
                        password: password,
                        language: language,
                        role: 'farmer',
                        otp: otp || null
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    // Save JWT token and user info in browser storage
                    localStorage.setItem('km_access_token', result.access_token);
                    localStorage.setItem('km_user', JSON.stringify(result.user));
                    sessionStorage.setItem('km_current_user_id', result.user.id);
                    
                    // Navigate to Step 2: Address & Payment Details
                    window.location.href = 'details.html';
                } else {
                    showError(result.detail || 'Registration failed. Please check your details.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                }
            } catch (err) {
                console.error('Backend API connection failed:', err);
                showError('Cannot connect to backend server. Please make sure the FastAPI backend is running at http://127.0.0.1:8000.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }
});
