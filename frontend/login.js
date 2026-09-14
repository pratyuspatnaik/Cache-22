document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    const phoneInput = document.getElementById("phoneInput");
    const passwordInput = document.getElementById("passwordInput");
    const submitBtn = document.getElementById("submitBtn");
    const loginForm = document.getElementById("loginForm");
    const togglePasswordBtn = document.getElementById("togglePasswordBtn");

    // Toggle password visibility
    togglePasswordBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            togglePasswordBtn.innerHTML = '<i data-lucide="eye-off"></i>';
        } else {
            passwordInput.type = "password";
            togglePasswordBtn.innerHTML = '<i data-lucide="eye"></i>';
        }
        lucide.createIcons();
    });

    // Only allow numbers in phone input and limit to 10
    phoneInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
        checkFormValidity();
    });

    passwordInput.addEventListener("input", () => {
        checkFormValidity();
    });

    function checkFormValidity() {
        if (phoneInput.value.length === 10 && passwordInput.value.length >= 6) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // Redirect to index (homepage) on successful login
        window.location.href = "index.html";
    });
});
