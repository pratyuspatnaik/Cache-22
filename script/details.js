/**
 * KrishiMandi - Details Profile JavaScript (script/details.js)
 * Handles profile completion submission, triggers success animation overlay,
 * and navigates back to the home page.
 */
document.addEventListener('DOMContentLoaded', () => {
    const completeBtn = document.getElementById('complete-btn');
    const overlay = document.getElementById('success-overlay');

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
