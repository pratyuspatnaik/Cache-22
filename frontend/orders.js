// orders.js - Interactive logic for Orders page

document.addEventListener('DOMContentLoaded', () => {
    
    // Simulate "Live update" spin on click
    const liveUpdateBtn = document.querySelector('.live-update');
    if (liveUpdateBtn) {
        liveUpdateBtn.addEventListener('click', () => {
            const icon = liveUpdateBtn.querySelector('i');
            icon.style.animation = 'none';
            // Trigger reflow
            void icon.offsetWidth;
            icon.style.animation = 'spin 0.5s linear infinite';
            
            setTimeout(() => {
                icon.style.animation = 'spin 2s linear infinite';
            }, 1000);
        });
    }

    // Add subtle hover animations to past order images
    const imageStacks = document.querySelectorAll('.image-stack');
    imageStacks.forEach(stack => {
        stack.addEventListener('mouseenter', () => {
            const images = stack.querySelectorAll('.stack-img');
            images.forEach((img, idx) => {
                img.style.transform = `translateX(${idx * 4}px)`;
                img.style.transition = 'transform 0.3s ease';
            });
        });
        
        stack.addEventListener('mouseleave', () => {
            const images = stack.querySelectorAll('.stack-img');
            images.forEach(img => {
                img.style.transform = 'translateX(0)';
            });
        });
    });

    // Dynamic active order count
    const activeOrders = document.querySelectorAll('.order-card.active-order').length;
    const badge = document.querySelector('.orders-badge');
    if (badge) {
        badge.textContent = activeOrders + ' Active Deliver' + (activeOrders === 1 ? 'y' : 'ies');
    }

});
