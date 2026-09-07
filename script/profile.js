// profile.js – handles avatar display based on user role and inline editing of profile fields

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Avatar display based on role ----------
  const roleSpan = document.querySelector('.user-role');
  const farmerAvatar = document.getElementById('farmer-avatar');
  const buyerAvatar = document.getElementById('buyer-avatar');

  if (roleSpan && farmerAvatar && buyerAvatar) {
    const roleText = roleSpan.textContent.toLowerCase();
    if (roleText.includes('farmer')) {
      farmerAvatar.classList.remove('hidden');
      buyerAvatar.classList.add('hidden');
    } else {
      buyerAvatar.classList.remove('hidden');
      farmerAvatar.classList.add('hidden');
    }
  }

  // ---------- Inline edit handling ----------
  const editButtons = document.querySelectorAll('.edit-btn');
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.detail-row');
      const valueSpan = row.querySelector('.detail-value');

      // Prevent duplicate editors
      if (row.querySelector('.edit-input')) return;

      const currentValue = valueSpan.textContent.trim();

      // Create input field
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = currentValue;

      // Create save button
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'edit-save';
      saveBtn.textContent = 'Save';

      // Replace value span with input and insert save button after edit icon
      valueSpan.replaceWith(input);
      btn.insertAdjacentElement('afterend', saveBtn);

      // Hide edit icon while editing
      btn.style.display = 'none';

      const saveHandler = () => {
        const newVal = input.value.trim() || currentValue; // fallback to old if empty
        const newSpan = document.createElement('span');
        newSpan.className = 'detail-value';
        if (valueSpan.id) newSpan.id = valueSpan.id;
        newSpan.textContent = newVal;
        input.replaceWith(newSpan);
        saveBtn.remove();
        // Restore edit button visibility
        btn.style.display = '';
      };

      saveBtn.addEventListener('click', saveHandler);
    });
  });

  // ---------- Dialog handling ----------
  const addressDialog = document.getElementById('address-dialog');
  const addAddressBtn = document.getElementById('add-address-btn');
  const closeAddressDialog = document.getElementById('close-address-dialog');
  const addAddressForm = document.getElementById('add-address-form');

  if (addressDialog && addAddressBtn) {
    addAddressBtn.addEventListener('click', () => {
      addressDialog.showModal();
    });
    closeAddressDialog.addEventListener('click', () => {
      addressDialog.close();
    });
    addAddressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Normally we'd append the new address to the UI here
      addressDialog.close();
      addAddressForm.reset();
    });
    // Close when clicking outside
    addressDialog.addEventListener('click', (e) => {
      if (e.target === addressDialog) {
        addressDialog.close();
      }
    });
  }

  const paymentDialog = document.getElementById('payment-dialog');
  const addPaymentBtn = document.getElementById('add-payment-btn');
  const closePaymentDialog = document.getElementById('close-payment-dialog');
  const addPaymentForm = document.getElementById('add-payment-form');

  if (paymentDialog && addPaymentBtn) {
    addPaymentBtn.addEventListener('click', () => {
      paymentDialog.showModal();
    });
    closePaymentDialog.addEventListener('click', () => {
      paymentDialog.close();
    });
    addPaymentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      paymentDialog.close();
      addPaymentForm.reset();
    });
    // Close when clicking outside
    paymentDialog.addEventListener('click', (e) => {
      if (e.target === paymentDialog) {
        paymentDialog.close();
      }
    });
  }
});
