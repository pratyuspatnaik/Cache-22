// cart.js

document.addEventListener('DOMContentLoaded', () => {
    // Address selection logic
    const addressCards = document.querySelectorAll('.address-card');
    addressCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all
            addressCards.forEach(c => c.classList.remove('selected'));
            // Add to clicked
            card.classList.add('selected');
        });
    });

    // Quantity logic and price calculation
    const cartItems = document.querySelectorAll('.cart-item-card');
    const subtotalEl = document.getElementById('subtotal-val');
    const taxEl = document.getElementById('tax-val');
    const totalEl = document.getElementById('total-val');
    const deliveryFee = 5.00;
    const taxRate = 0.05; // 5%

    function calculateTotal() {
        let subtotal = 0;
        let activeItems = 0;

        document.querySelectorAll('.cart-item-card').forEach(item => {
            // Check if item is not removed
            if (item.style.display !== 'none') {
                const price = parseFloat(item.getAttribute('data-price'));
                const qty = parseInt(item.querySelector('.qty-value').textContent);
                subtotal += (price * qty);
                activeItems += qty;
            }
        });

        // Update top badge if exists
        const badge = document.querySelector('.cart-badge');
        if (badge) {
            badge.textContent = activeItems;
        }

        const tax = subtotal * taxRate;
        const total = subtotal + tax + deliveryFee;

        // Update DOM
        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    // Attach event listeners to buttons
    cartItems.forEach(item => {
        const minusBtn = item.querySelector('.minus-btn');
        const plusBtn = item.querySelector('.plus-btn');
        const qtyVal = item.querySelector('.qty-value');
        const removeBtn = item.querySelector('.remove-btn');

        // Minus button
        minusBtn.addEventListener('click', () => {
            let qty = parseInt(qtyVal.textContent);
            if (qty > 1) {
                qty--;
                qtyVal.textContent = qty;
                calculateTotal();
            }
            if (qty === 1) {
                minusBtn.disabled = true;
            }
        });

        // Plus button
        plusBtn.addEventListener('click', () => {
            let qty = parseInt(qtyVal.textContent);
            qty++;
            qtyVal.textContent = qty;
            minusBtn.disabled = false;
            calculateTotal();
        });

        // Remove button
        removeBtn.addEventListener('click', () => {
            // Simple fade out and remove
            item.style.opacity = '0';
            setTimeout(() => {
                item.style.display = 'none';
                calculateTotal();
            }, 300);
        });
    });

    // Initialize totals on load
    calculateTotal();
});
