/**
 * KrishiMandi - Onboarding JavaScript (script/onboarding.js)
 * Step 1: Collects basic credentials (name, mobile, password, role, language),
 * calls POST /api/auth/register, and immediately redirects to Step 2 (details.html).
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : '/api';

document.addEventListener('DOMContentLoaded', () => {
    const onboardForm = document.getElementById('onboard-form');
    const mobileInput = document.getElementById('mobile-field');
    const regError = document.getElementById('reg-error');
    const passwordField = document.getElementById('password-field');
    const eyeBtn = document.getElementById('eye-btn');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    const otpToggle = document.getElementById('otp-toggle');
    const getOtpLabel = document.querySelector('.get-otp-btn');
    const otpInput = document.getElementById('otp-field');
    const resendLink = document.querySelector('.resend-link');

    // Role switcher elements
    const roleTabs = document.querySelectorAll('.role-tab');
    const roleInput = document.getElementById('role-input');
    const activeRoleTag = document.getElementById('active-role-tag');
    const nameLabel = document.getElementById('name-label');
    const nameInput = document.getElementById('name-field');

    let currentRole = 'farmer';
    let errorTimer = null;

    function showError(message) {
        if (!regError) {
            alert(message);
            return;
        }
        regError.textContent = message;
        regError.classList.add('visible');
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            regError.classList.remove('visible');
        }, 8000);
        regError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearError() {
        if (!regError) return;
        regError.classList.remove('visible');
        regError.textContent = '';
    }

    // 1. Mobile number live sanitation
    if (mobileInput) {
        mobileInput.addEventListener('input', function () {
            const cleaned = this.value.replace(/\D/g, '');
            if (cleaned !== this.value) {
                showError('Only numbers are allowed in mobile number.');
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

    // 3. Role Switcher Logic
    const roleConfigs = {
        farmer: {
            tag: '🌱 Farmer Account',
            nameLabel: 'Full Name / किसान का नाम *',
            namePlaceholder: 'e.g. Ramesh Patil'
        },
        buyer: {
            tag: '🛒 Buyer / Trader Account',
            nameLabel: 'Buyer / Business Name / खरीदार का नाम *',
            namePlaceholder: 'e.g. Metro Food Corp / Priya Sharma'
        },
        partner: {
            tag: '🚛 Logistics Partner Account',
            nameLabel: 'Fleet / Partner Name / लॉजिस्टिक्स पार्टनर *',
            namePlaceholder: 'e.g. Kisan Logistics / Anil Deshmukh'
        }
    };

    function setRole(role) {
        currentRole = role;
        if (roleInput) roleInput.value = role;

        roleTabs.forEach(tab => {
            const match = tab.dataset.role === role;
            tab.classList.toggle('active', match);
            tab.setAttribute('aria-selected', match ? 'true' : 'false');
        });

        const cfg = roleConfigs[role] || roleConfigs.farmer;
        if (activeRoleTag) activeRoleTag.textContent = cfg.tag;
        if (nameLabel) nameLabel.innerHTML = cfg.nameLabel;
        if (nameInput) nameInput.placeholder = cfg.namePlaceholder;
    }

    roleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setRole(tab.dataset.role || 'farmer');
        });
    });

    // Check URL search params for ?role=
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const paramRole = urlParams.get('role');
        if (paramRole && ['farmer', 'buyer', 'partner'].includes(paramRole.toLowerCase())) {
            setRole(paramRole.toLowerCase());
        } else {
            setRole('farmer');
        }
    } catch (e) {
        setRole('farmer');
    }

    // 4. OTP Request integration
    async function requestOtp() {
        const mobile = mobileInput ? mobileInput.value.trim() : '';
        if (!mobile || mobile.length !== 10) {
            showError('Please enter a valid 10-digit mobile number before requesting an OTP.');
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
                console.log('OTP dispatched successfully:', data);
                if (data.data && data.data.otp_code && otpInput) {
                    otpInput.value = data.data.otp_code;
                }
                showError('OTP sent successfully to +91-' + mobile);
                setTimeout(clearError, 4000);
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

    // 5. Step 1 Form Submission
    if (onboardForm) {
        onboardForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearError();

            const fullName = nameInput ? nameInput.value.trim() : '';
            const mobile = mobileInput ? mobileInput.value.trim() : '';
            const password = passwordField ? passwordField.value : '';
            const selectedLang = document.querySelector('input[name="language"]:checked');
            const language = selectedLang ? selectedLang.value : 'english';
            const role = roleInput ? roleInput.value : currentRole;
            const otp = otpInput ? otpInput.value.trim() : '';

            // Validations
            if (!fullName || fullName.length < 2) {
                showError('Please enter your full name (at least 2 characters).');
                if (nameInput) nameInput.focus();
                return;
            }

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

            const submitBtn = document.getElementById('submit-reg-btn');
            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating Account (Step 1 of 2)...';
            }

            const payload = {
                full_name: fullName,
                mobile: mobile,
                password: password,
                language: language,
                role: role,
                otp: otp || null
            };

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok) {
                    // Save JWT token, user info and role in browser storage
                    localStorage.setItem('km_access_token', result.access_token);
                    localStorage.setItem('km_user', JSON.stringify(result.user));
                    localStorage.setItem('km_role', result.user.role || role);
                    sessionStorage.setItem('km_current_user_id', result.user.id);

                    // Step 2 redirect: immediately redirect to details.html
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
                showError('Cannot connect to backend server. Please verify FastAPI backend is running at http://127.0.0.1:8000.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }
});
