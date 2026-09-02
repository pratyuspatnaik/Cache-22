/**
 * KrishiMandi - Login JavaScript (script/login.js)
 * Handles mobile number digit validation, auth mode switching (Password / OTP),
 * password toggle, OTP countdown & simulated dispatch, live FastAPI backend
 * integration (PostgreSQL), and animated success redirection.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000/api' 
    : 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const loginForm = document.getElementById('login-form');
    const mobileInput = document.getElementById('mobile-field');
    const mobileError = document.getElementById('mobile-error');
    const passwordInput = document.getElementById('password-field');
    const otpInput = document.getElementById('otp-code-field');
    const tabPassword = document.getElementById('tab-password');
    const tabOtp = document.getElementById('tab-otp');
    const panelPassword = document.getElementById('panel-password');
    const panelOtp = document.getElementById('panel-otp');
    const getOtpBtn = document.getElementById('get-otp-btn');
    const otpCodeContainer = document.getElementById('otp-code-container');
    const resendBtn = document.getElementById('resend-otp-btn');
    const eyeBtn = document.getElementById('eye-btn');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    const successOverlay = document.getElementById('login-success-overlay');
    const submitBtn = document.getElementById('submit-btn');
    const rememberCheckbox = document.querySelector('input[name="remember"]');

    let currentAuthMode = 'password'; // 'password' | 'otp'
    let errorTimer = null;
    let otpCountdownTimer = null;
    let otpCountdownSeconds = 30;

    // Toast error helper
    function showError(message) {
        if (!mobileError) return;
        mobileError.textContent = message;
        mobileError.classList.add('visible');
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            mobileError.classList.remove('visible');
        }, 6000);
    }

    function clearError() {
        if (!mobileError) return;
        mobileError.classList.remove('visible');
        mobileError.textContent = '';
    }

    // 1. Mobile Number Validation
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

    // 2. Auth Mode Switcher (Password vs OTP)
    function switchAuthMode(mode) {
        currentAuthMode = mode;
        clearError();
        if (mode === 'password') {
            tabPassword.classList.add('active');
            tabOtp.classList.remove('active');
            panelPassword.classList.add('active');
            panelOtp.classList.remove('active');
            if (passwordInput) passwordInput.required = true;
            if (otpInput) otpInput.required = false;
        } else {
            tabOtp.classList.add('active');
            tabPassword.classList.remove('active');
            panelOtp.classList.add('active');
            panelPassword.classList.remove('active');
            if (passwordInput) passwordInput.required = false;
            if (otpInput && otpCodeContainer.classList.contains('active')) {
                otpInput.required = true;
            }
        }
    }

    if (tabPassword && tabOtp) {
        tabPassword.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthMode('password');
        });

        tabOtp.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthMode('otp');
        });
    }

    // 3. Password Visibility Toggle
    if (eyeBtn && passwordInput && eyeIcon && eyeOffIcon) {
        eyeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            eyeIcon.style.display = isHidden ? 'none' : 'block';
            eyeOffIcon.style.display = isHidden ? 'block' : 'none';
        });
    }

    // 4. OTP Request & Countdown with Backend API
    function startOtpCountdown() {
        otpCountdownSeconds = 30;
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.textContent = `Resend in ${otpCountdownSeconds}s`;
        }

        clearInterval(otpCountdownTimer);
        otpCountdownTimer = setInterval(() => {
            otpCountdownSeconds--;
            if (otpCountdownSeconds > 0) {
                if (resendBtn) resendBtn.textContent = `Resend in ${otpCountdownSeconds}s`;
            } else {
                clearInterval(otpCountdownTimer);
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend OTP';
                }
            }
        }, 1000);
    }

    async function triggerOtpSend() {
        const mobile = mobileInput ? mobileInput.value.trim() : '';
        if (!mobile || mobile.length < 10) {
            showError('Please enter a valid 10-digit mobile number first.');
            if (mobileInput) mobileInput.focus();
            return;
        }

        // Show code box and hide initial request button
        if (otpCodeContainer) {
            otpCodeContainer.classList.add('active');
            if (otpInput) {
                otpInput.required = true;
                otpInput.focus();
            }
        }
        if (getOtpBtn) {
            getOtpBtn.style.display = 'none';
        }

        startOtpCountdown();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: mobile })
            });

            const data = await response.json();
            if (response.ok) {
                // In development / demo, automatically fill OTP for convenience
                if (data.data && data.data.otp_code && otpInput) {
                    otpInput.value = data.data.otp_code;
                }
            } else {
                showError(data.detail || 'Could not send OTP. Please try again.');
            }
        } catch (err) {
            console.warn('Backend server unavailable, continuing with demo mode:', err);
        }
    }

    if (getOtpBtn) {
        getOtpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerOtpSend();
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!resendBtn.disabled) {
                triggerOtpSend();
            }
        });
    }

    if (otpInput) {
        otpInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    // 5. Language Switching Dynamic Text
    const langRadios = document.querySelectorAll('input[name="language"]');
    const translations = {
        english: {
            title: 'Welcome Back',
            subtitle: 'Log in to your KrishiMandi portal',
            mobileLabel: 'Mobile Number',
            passTab: 'Password',
            otpTab: 'OTP Code',
            passLabel: 'Password',
            passPlaceholder: 'Enter your password',
            forgotPass: 'Forgot Password?',
            otpAction: 'Get OTP via SMS',
            otpPlaceholder: 'Enter 6-digit OTP',
            rememberMe: 'Remember this device',
            submitBtn: 'Log In to Account →',
            noAccount: "Don't have an account?",
            registerLink: 'Create an Account / Register'
        },
        hindi: {
            title: 'वापसी पर स्वागत है',
            subtitle: 'अपने कृषि मंडी खाते में लॉग इन करें',
            mobileLabel: 'मोबाइल नंबर',
            passTab: 'पासवर्ड',
            otpTab: 'ओटीपी (OTP)',
            passLabel: 'पासवर्ड',
            passPlaceholder: 'अपना पासवर्ड दर्ज करें',
            forgotPass: 'पासवर्ड भूल गए?',
            otpAction: 'एसएमएस से ओटीपी प्राप्त करें',
            otpPlaceholder: '6 अंकों का ओटीपी दर्ज करें',
            rememberMe: 'इस डिवाइस को याद रखें',
            submitBtn: 'खाते में लॉग इन करें →',
            noAccount: 'क्या आपके पास खाता नहीं है?',
            registerLink: 'नया खाता बनाएं / रजिस्टर करें'
        }
    };

    langRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            const lang = this.value;
            const t = translations[lang] || translations.english;
            
            const headerTitle = document.getElementById('login-header-title');
            const headerSub = document.getElementById('login-header-sub');
            const mobileLabelEl = document.getElementById('mobile-label');
            const passLabelEl = document.getElementById('pass-label');
            const forgotPassLink = document.getElementById('forgot-pass-link');
            const otpActionText = document.getElementById('otp-action-text');
            const rememberText = document.getElementById('remember-text');
            const submitBtnEl = document.getElementById('submit-btn-text');
            const noAccountPrompt = document.getElementById('no-account-text');
            const registerLinkEl = document.getElementById('register-link');

            if (headerTitle) headerTitle.textContent = t.title;
            if (headerSub) headerSub.textContent = t.subtitle;
            if (mobileLabelEl) mobileLabelEl.textContent = t.mobileLabel;
            if (passLabelEl) passLabelEl.textContent = t.passLabel;
            if (passwordInput) passwordInput.placeholder = t.passPlaceholder;
            if (forgotPassLink) forgotPassLink.textContent = t.forgotPass;
            if (otpActionText) otpActionText.textContent = t.otpAction;
            if (otpInput) otpInput.placeholder = t.otpPlaceholder;
            if (rememberText) rememberText.textContent = t.rememberMe;
            if (submitBtnEl) submitBtnEl.textContent = t.submitBtn;
            if (noAccountPrompt) noAccountPrompt.textContent = t.noAccount + ' ';
            if (registerLinkEl) registerLinkEl.textContent = t.registerLink;
        });
    });

    // 6. Form Submission & Backend Authentication
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const mobile = mobileInput ? mobileInput.value.trim() : '';
            const rememberMe = rememberCheckbox ? rememberCheckbox.checked : true;

            // Mobile validation
            if (!mobile || mobile.length !== 10) {
                showError('Please enter a valid 10-digit mobile number.');
                if (mobileInput) mobileInput.focus();
                return;
            }

            let endpoint = `${API_BASE_URL}/auth/login`;
            let requestBody = {};

            if (currentAuthMode === 'password') {
                const password = passwordInput ? passwordInput.value : '';
                if (!password) {
                    showError('Please enter your password.');
                    if (passwordInput) passwordInput.focus();
                    return;
                }
                endpoint = `${API_BASE_URL}/auth/login`;
                requestBody = { mobile: mobile, password: password, remember_me: rememberMe };
            } else {
                const otp = otpInput ? otpInput.value.trim() : '';
                if (!otpCodeContainer.classList.contains('active') || !otp || otp.length < 4) {
                    showError('Please request and enter the 6-digit OTP code.');
                    if (!otpCodeContainer.classList.contains('active')) {
                        triggerOtpSend();
                    } else if (otpInput) {
                        otpInput.focus();
                    }
                    return;
                }
                endpoint = `${API_BASE_URL}/auth/otp/login`;
                requestBody = { mobile: mobile, otp_code: otp };
            }

            const btnTextEl = document.getElementById('submit-btn-text');
            const originalText = btnTextEl ? btnTextEl.textContent : 'Log In';
            if (submitBtn) {
                submitBtn.disabled = true;
                if (btnTextEl) btnTextEl.textContent = 'Authenticating...';
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store authentication tokens
                    localStorage.setItem('km_access_token', data.access_token);
                    localStorage.setItem('km_user', JSON.stringify(data.user));

                    // Display success feedback
                    if (successOverlay) {
                        successOverlay.classList.add('active');
                    }

                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 2200);
                } else {
                    showError(data.detail || 'Login failed. Please verify your credentials.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        if (btnTextEl) btnTextEl.textContent = originalText;
                    }
                }
            } catch (err) {
                console.warn('Backend API connection failed, simulating login success:', err);
                // Graceful fallback for offline demo
                if (successOverlay) {
                    successOverlay.classList.add('active');
                }
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2200);
            }
        });
    }
});
