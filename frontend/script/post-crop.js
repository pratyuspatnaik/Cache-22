/**
 * KrishiMandi - Farmer Crop Portal Script (script/post-crop.js)
 * Dedicated portal strictly for Farmers to put up, manage, and monitor their crop listings.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api'
    : '/api';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('km_access_token');
    let userRole = (localStorage.getItem('km_role') || '').toLowerCase();
    if (!userRole) {
        try {
            const parsedUser = JSON.parse(localStorage.getItem('km_user') || '{}');
            if (parsedUser && parsedUser.role) userRole = parsedUser.role.toLowerCase();
        } catch (e) {}
    }

    // 1. Role Guard: ONLY Farmers can access this portal
    if (!token) {
        alert('Please log in with your Farmer account to put up crops.');
        window.location.href = 'login.html?role=farmer';
        return;
    }

    if (userRole === 'buyer') {
        alert('Access Restricted: Only farmers can put up crops for sale. Buyers can explore and purchase produce in the Marketplace.');
        window.location.href = 'discovery.html';
        return;
    }

    // Elements
    const farmerNameEl = document.getElementById('farmer-display-name');
    const postForm = document.getElementById('farmer-post-form');
    const statusAlert = document.getElementById('post-status-alert');
    const myListingsContainer = document.getElementById('my-listings-container');
    const listingsCountBadge = document.getElementById('farmer-listings-count');
    const logoutBtn = document.getElementById('farmer-logout-btn');

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('km_user') || '{}');
        if (currentUser && farmerNameEl) {
            farmerNameEl.textContent = currentUser.full_name || 'Verified Farmer';
        }
    } catch (e) {}

    // Pre-fill location if available
    if (currentUser) {
        if (currentUser.city && document.getElementById('location_city')) {
            document.getElementById('location_city').value = currentUser.city;
        }
        if (currentUser.state && document.getElementById('location_state')) {
            document.getElementById('location_state').value = currentUser.state;
        }
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('km_access_token');
            localStorage.removeItem('km_user');
            localStorage.removeItem('km_role');
            window.location.href = '../index.html';
        });
    }

    // 2. Load Farmer's Active Listings
    loadFarmerListings();

    // 3. Handle Crop Post Form Submit
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const publishBtn = document.getElementById('publish-crop-btn');
            const originalBtnText = publishBtn ? publishBtn.textContent : 'Put Up Crop for Sale →';
            if (publishBtn) {
                publishBtn.disabled = true;
                publishBtn.textContent = 'Publishing to Marketplace...';
            }

            const formData = new FormData(postForm);
            const payload = {
                crop_name: formData.get('crop_name')?.trim(),
                variety: formData.get('variety')?.trim() || null,
                quality_grade: formData.get('quality_grade'),
                quantity: parseFloat(formData.get('quantity')),
                unit: formData.get('unit'),
                price_per_unit: parseFloat(formData.get('price_per_unit')),
                location_city: formData.get('location_city')?.trim() || currentUser?.city || null,
                location_state: formData.get('location_state')?.trim() || currentUser?.state || null
            };

            try {
                const res = await fetch(`${API_BASE_URL}/listings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (res.ok) {
                    showAlert('success', `Produce "${payload.crop_name}" published successfully! Wholesale buyers can now view and purchase your harvest.`);
                    postForm.reset();
                    // Restore default city/state
                    if (currentUser?.city) document.getElementById('location_city').value = currentUser.city;
                    if (currentUser?.state) document.getElementById('location_state').value = currentUser.state;
                    loadFarmerListings();
                } else {
                    showAlert('error', data.detail || 'Could not publish crop listing. Please verify the input values.');
                }
            } catch (err) {
                console.error('Failed to post crop:', err);
                showAlert('error', 'Network error while connecting to KrishiMandi backend.');
            } finally {
                if (publishBtn) {
                    publishBtn.disabled = false;
                    publishBtn.textContent = originalBtnText;
                }
            }
        });
    }

    async function loadFarmerListings() {
        if (!myListingsContainer) return;

        try {
            // Fetch all active listings
            const res = await fetch(`${API_BASE_URL}/listings?limit=100`);
            if (!res.ok) throw new Error('Failed to load listings');

            const data = await res.json();
            const myListings = data.items.filter(item => item.farmer_id === currentUser?.id);

            if (listingsCountBadge) {
                listingsCountBadge.textContent = `${myListings.length} Active Listing${myListings.length === 1 ? '' : 's'}`;
            }

            if (myListings.length === 0) {
                myListingsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px 10px; color: #6b7280;">
                        <div style="font-size: 2.2rem; margin-bottom: 8px;">🧺</div>
                        <p style="font-weight: 600; margin-bottom: 4px;">No crops put up yet</p>
                        <p style="font-size: 0.84rem; color: #9ca3af;">Use the form on the left to publish your harvest and attract wholesale buyers.</p>
                    </div>
                `;
                return;
            }

            myListingsContainer.innerHTML = myListings.map(item => {
                const price = Number(item.price_per_unit).toLocaleString('en-IN');
                return `
                    <div class="farmer-listing-item" id="listing-row-${item.id}">
                        <div>
                            <div style="font-weight: 800; color: #1f2937; font-size: 1.05rem;">
                                ${escapeHtml(item.crop_name)}
                                <span style="font-size: 0.76rem; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 12px; margin-left: 6px; font-weight: 700;">
                                    ${escapeHtml(item.quality_grade || 'Grade A')}
                                </span>
                            </div>
                            <div style="font-size: 0.84rem; color: #6b7280; margin-top: 3px;">
                                ${escapeHtml(item.variety || 'Desi')} • ${item.quantity} ${escapeHtml(item.unit)}s available
                            </div>
                            <div style="font-weight: 800; color: #1b6b3e; font-size: 0.98rem; margin-top: 4px;">
                                ₹${price} / ${escapeHtml(item.unit)}
                            </div>
                        </div>
                        <div>
                            <button type="button" class="btn-delete-listing" data-id="${item.id}">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');

            // Attach delete handlers
            myListingsContainer.querySelectorAll('.btn-delete-listing').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Are you sure you want to remove this crop listing from the marketplace?')) {
                        return;
                    }

                    try {
                        const delRes = await fetch(`${API_BASE_URL}/listings/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (delRes.ok) {
                            loadFarmerListings();
                        } else {
                            const errData = await delRes.json();
                            alert(errData.detail || 'Could not remove listing.');
                        }
                    } catch (e) {
                        alert('Error connecting to backend server.');
                    }
                });
            });

        } catch (e) {
            console.warn('Could not load farmer listings:', e);
            myListingsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #ef4444;">
                    Unable to load listings right now.
                </div>
            `;
        }
    }

    function showAlert(type, msg) {
        if (!statusAlert) return;
        statusAlert.textContent = msg;
        statusAlert.style.display = 'block';
        if (type === 'success') {
            statusAlert.style.background = '#dcfce7';
            statusAlert.style.color = '#166534';
            statusAlert.style.border = '1px solid #bbf7d0';
        } else {
            statusAlert.style.background = '#fee2e2';
            statusAlert.style.color = '#991b1b';
            statusAlert.style.border = '1px solid #fecaca';
        }
    }

    function hideAlert() {
        if (!statusAlert) return;
        statusAlert.style.display = 'none';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
