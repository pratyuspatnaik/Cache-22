/**
 * KrishiMandi - Discovery Marketplace Script (script/discovery.js)
 * Implements:
 * 1. Dynamic crop listing retrieval from /api/listings with multi-faceted filtering & sorting.
 * 2. Multilingual Voice Assistant integration (English, Hindi, Odia) via VoiceSearchAssistant.
 * 3. Farmer post listing creation modal (farmer-only with authentication token).
 * 4. Direct Buy & Contact Farmer workflows.
 * 5. Authentication state in navigation header.
 */

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000/api'
    : '/api';

// Crop Emoji Dictionary (supports English, Hindi, and Odia variants)
const CROP_ICONS = {
    'wheat': '🌾',
    'gehun': '🌾',
    'gohama': '🌾',
    'rice': '🍚',
    'paddy': '🌾',
    'chawal': '🍚',
    'chaula': '🍚',
    'dhan': '🌾',
    'tomato': '🍅',
    'tamatar': '🍅',
    'bilati': '🍅',
    'onion': '🧅',
    'pyaz': '🧅',
    'piaja': '🧅',
    'potato': '🥔',
    'aloo': '🥔',
    'alu': '🥔',
    'cotton': '☁️',
    'kapas': '☁️',
    'mustard': '🌼',
    'sarson': '🌼',
    'sorisa': '🌼',
    'chili': '🌶️',
    'chilli': '🌶️',
    'mirchi': '🌶️',
    'lanka': '🌶️',
    'corn': '🌽',
    'maize': '🌽',
    'makka': '🌽',
    'makai': '🌽',
    'ginger': '🫚',
    'adrak': '🫚',
    'ada': '🫚',
    'garlic': '🧄',
    'lahsun': '🧄',
    'rasuna': '🧄',
    'soybean': '🌱',
    'turmeric': '🌿',
    'haldi': '🌿',
    'dal': '🫘',
    'pulse': '🫘',
    'harada': '🫘'
};

function getCropEmoji(cropName) {
    if (!cropName) return '🌿';
    const clean = cropName.toLowerCase().trim();
    for (const [key, emoji] of Object.entries(CROP_ICONS)) {
        if (clean.includes(key)) return emoji;
    }
    return '🌿';
}

document.addEventListener('DOMContentLoaded', () => {
    // Role Guard: Marketplace is strictly for Buyers
    let userRole = (localStorage.getItem('km_role') || '').toLowerCase();
    if (!userRole) {
        try {
            const parsedUser = JSON.parse(localStorage.getItem('km_user') || '{}');
            if (parsedUser && parsedUser.role) userRole = parsedUser.role.toLowerCase();
        } catch (e) {}
    }
    if (userRole === 'farmer') {
        alert('The Marketplace is reserved for buyers. As a farmer, you can put up and manage your crops in the Farmer Portal.');
        window.location.href = 'post-crop.html';
        return;
    }

    // Current Filter & Pagination State
    const filterState = {
        crop: '',
        quality_grade: '',
        min_price: '',
        max_price: '',
        sort: 'newest',
        page: 1,
        limit: 30,
        voiceMeta: null // { text: '', lang: '' }
    };

    // DOM Elements
    const searchInput = document.getElementById('search-crop-input');
    const gradeSelect = document.getElementById('filter-grade');
    const minPriceInput = document.getElementById('filter-min-price');
    const maxPriceInput = document.getElementById('filter-max-price');
    const sortSelect = document.getElementById('filter-sort');
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    const startVoiceBtn = document.getElementById('start-voice-btn');
    const activeFiltersBar = document.getElementById('active-filters-bar');
    const listingsGrid = document.getElementById('listings-grid');
    const resultsCountText = document.getElementById('results-count-text');

    // Modals
    const postModalBackdrop = document.getElementById('post-listing-modal');
    const openPostModalBtn = document.getElementById('open-post-modal-btn');
    const closePostModalBtn = document.getElementById('close-post-modal-btn');
    const postForm = document.getElementById('post-listing-form');
    const postModalError = document.getElementById('post-modal-error');
    const farmerPostBtnContainer = document.getElementById('farmer-post-btn-container');

    const contactModal = document.getElementById('contact-farmer-modal');
    const closeContactBtn = document.getElementById('close-contact-modal-btn');
    const contactFarmerName = document.getElementById('contact-farmer-name');
    const contactFarmerLoc = document.getElementById('contact-farmer-loc');
    const contactFarmerPhone = document.getElementById('contact-farmer-phone');
    const btnCallFarmer = document.getElementById('btn-call-farmer');

    // 1. Check User Auth & Role for Navigation and Farmer Features
    setupUserAuthUI();

    // 2. Initialize Voice Assistant
    setupVoiceAssistant();

    // 3. Initial Load of Listings
    fetchListings();

    // 4. Attach Filter Event Listeners
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            syncInputToState();
            filterState.page = 1;
            fetchListings();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetFilters();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            filterState.sort = sortSelect.value;
            filterState.page = 1;
            fetchListings();
        });
    }

    if (gradeSelect) {
        gradeSelect.addEventListener('change', () => {
            filterState.quality_grade = gradeSelect.value;
            filterState.page = 1;
            fetchListings();
        });
    }

    // Debounced search on enter key or typing
    let searchDebounce = null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                filterState.crop = searchInput.value.trim();
                filterState.page = 1;
                fetchListings();
            }, 500);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchDebounce);
                filterState.crop = searchInput.value.trim();
                filterState.page = 1;
                fetchListings();
            }
        });
    }

    // 5. Farmer Post Modal Handlers
    setupPostListingModal();

    // 6. Contact Modal Handlers
    if (closeContactBtn) {
        closeContactBtn.addEventListener('click', () => {
            if (contactModal) contactModal.classList.remove('active');
        });
    }
    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) {
                contactModal.classList.remove('active');
            }
        });
    }

    // --- Helper Functions ---

    function syncInputToState() {
        if (searchInput) filterState.crop = searchInput.value.trim();
        if (gradeSelect) filterState.quality_grade = gradeSelect.value;
        if (minPriceInput) filterState.min_price = minPriceInput.value ? parseFloat(minPriceInput.value) : '';
        if (maxPriceInput) filterState.max_price = maxPriceInput.value ? parseFloat(maxPriceInput.value) : '';
        if (sortSelect) filterState.sort = sortSelect.value;
        renderActiveFilterPills();
    }

    function resetFilters() {
        if (searchInput) searchInput.value = '';
        if (gradeSelect) gradeSelect.value = '';
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';
        if (sortSelect) sortSelect.value = 'newest';

        filterState.crop = '';
        filterState.quality_grade = '';
        filterState.min_price = '';
        filterState.max_price = '';
        filterState.sort = 'newest';
        filterState.page = 1;
        filterState.voiceMeta = null;

        renderActiveFilterPills();
        fetchListings();
    }

    function renderActiveFilterPills() {
        if (!activeFiltersBar) return;
        const pills = [];

        if (filterState.voiceMeta) {
            pills.push(`
                <span class="active-filter-pill" style="background: #fef3c7; border-color: #fde68a; color: #92400e;">
                    🎙️ Spoken: "${escapeHtml(filterState.voiceMeta.text)}" (${filterState.voiceMeta.lang})
                    <button type="button" onclick="window.clearVoicePill()">&times;</button>
                </span>
            `);
        }

        if (filterState.crop) {
            pills.push(`
                <span class="active-filter-pill">
                    Crop / Mandi: <strong>${escapeHtml(filterState.crop)}</strong>
                    <button type="button" onclick="window.clearFilter('crop')">&times;</button>
                </span>
            `);
        }

        if (filterState.quality_grade) {
            pills.push(`
                <span class="active-filter-pill">
                    Grade: <strong>${escapeHtml(filterState.quality_grade)}</strong>
                    <button type="button" onclick="window.clearFilter('quality_grade')">&times;</button>
                </span>
            `);
        }

        if (filterState.min_price || filterState.max_price) {
            const min = filterState.min_price ? `₹${filterState.min_price}` : '₹0';
            const max = filterState.max_price ? `₹${filterState.max_price}` : 'Any';
            pills.push(`
                <span class="active-filter-pill">
                    Price: <strong>${min} – ${max}</strong>
                    <button type="button" onclick="window.clearFilter('price')">&times;</button>
                </span>
            `);
        }

        if (pills.length > 0) {
            activeFiltersBar.innerHTML = pills.join('');
            activeFiltersBar.style.display = 'flex';
        } else {
            activeFiltersBar.innerHTML = '';
            activeFiltersBar.style.display = 'none';
        }
    }

    // Expose pill clearing to window
    window.clearFilter = function(filterKey) {
        if (filterKey === 'crop') {
            filterState.crop = '';
            if (searchInput) searchInput.value = '';
        } else if (filterKey === 'quality_grade') {
            filterState.quality_grade = '';
            if (gradeSelect) gradeSelect.value = '';
        } else if (filterKey === 'price') {
            filterState.min_price = '';
            filterState.max_price = '';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
        }
        renderActiveFilterPills();
        fetchListings();
    };

    window.clearVoicePill = function() {
        filterState.voiceMeta = null;
        renderActiveFilterPills();
    };

    // --- Fetch and Render Listings ---

    async function fetchListings() {
        if (!listingsGrid) return;

        if (resultsCountText) {
            resultsCountText.textContent = 'Searching fresh mandi listings...';
        }

        // Show loading skeleton / spinner
        listingsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: #6b7280;">
                <div style="font-size: 2rem; margin-bottom: 8px;">🌾</div>
                <p>Fetching verified farmer produce...</p>
            </div>
        `;

        try {
            const params = new URLSearchParams();
            if (filterState.crop) params.append('crop', filterState.crop);
            if (filterState.quality_grade) params.append('quality_grade', filterState.quality_grade);
            if (filterState.min_price) params.append('min_price', filterState.min_price);
            if (filterState.max_price) params.append('max_price', filterState.max_price);
            if (filterState.sort) params.append('sort', filterState.sort);
            params.append('page', filterState.page);
            params.append('limit', filterState.limit);

            const res = await fetch(`${API_BASE_URL}/listings?${params.toString()}`);
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }

            const data = await res.json();
            renderListings(data.items, data.total_count);
        } catch (err) {
            console.error('Failed to load listings:', err);
            listingsGrid.innerHTML = `
                <div class="empty-listings">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
                    <h3>Unable to load crop listings</h3>
                    <p style="color: #6b7280; max-width: 420px; margin: 0 auto 16px auto;">
                        Please check that the KrishiMandi backend server is running and accessible.
                    </p>
                    <button type="button" class="btn btn-primary" onclick="location.reload()">Retry Connection</button>
                </div>
            `;
            if (resultsCountText) {
                resultsCountText.textContent = 'Failed to connect to marketplace service.';
            }
        }
    }

    function renderListings(items, totalCount) {
        renderActiveFilterPills();

        if (resultsCountText) {
            const count = totalCount !== undefined ? totalCount : items.length;
            resultsCountText.textContent = `Showing ${count} fresh crop listing${count === 1 ? '' : 's'} across Indian mandis`;
        }

        if (!items || items.length === 0) {
            listingsGrid.innerHTML = `
                <div class="empty-listings">
                    <div class="empty-icon" style="font-size: 3rem; margin-bottom: 14px;">🧺</div>
                    <h3 style="font-size: 1.3rem; color: #1f2937; margin-bottom: 6px;">No crops found</h3>
                    <p style="color: #6b7280; max-width: 440px; margin: 0 auto 18px auto; font-size: 0.94rem;">
                        No listings match your current filters. Try relaxing your price bounds, searching for broader crops like "Wheat" or "Tomato", or speak with the Voice Search assistant.
                    </p>
                    <button type="button" class="btn btn-outline" id="empty-reset-btn">Clear All Filters</button>
                </div>
            `;
            const emptyReset = document.getElementById('empty-reset-btn');
            if (emptyReset) {
                emptyReset.addEventListener('click', resetFilters);
            }
            return;
        }

        const currentUserRole = localStorage.getItem('km_role');
        let currentUserId = null;
        try {
            const u = JSON.parse(localStorage.getItem('km_user') || '{}');
            currentUserId = u?.id;
        } catch (e) {}

        listingsGrid.innerHTML = items.map(item => {
            const emoji = getCropEmoji(item.crop_name);
            const gradeClass = (item.quality_grade || '').toLowerCase().includes('grade a') ? 'grade-a' : '';
            const location = [item.location_city, item.location_state].filter(Boolean).join(', ') || 'Direct Mandi';
            const farmerName = item.farmer?.full_name || 'Verified Farmer';
            const farmerInitials = farmerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'FR';
            const farmerMobile = item.farmer?.mobile_number || '9876543210';
            const price = Number(item.price_per_unit).toLocaleString('en-IN');
            const unit = item.unit || 'quintal';

            // Direct checkout link with pre-filled query parameters
            const paymentUrl = `payment.html?crop=${encodeURIComponent(item.crop_name)}&price=${item.price_per_unit}&quantity=1&unit=${encodeURIComponent(unit)}&listing_id=${item.id}&farmer_name=${encodeURIComponent(farmerName)}`;

            // Role-Conditional Buy Action: Farmers cannot buy produce
            let buyButtonHtml = '';
            if (currentUserRole === 'farmer') {
                if (currentUserId && currentUserId === item.farmer_id) {
                    buyButtonHtml = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.82rem; padding: 10px 10px; border-radius: 8px; text-align: center; border: 1px solid #bae6fd;">Your Listing 🌱</span>`;
                } else {
                    buyButtonHtml = `<span style="background: #f3f4f6; color: #6b7280; font-weight: 600; font-size: 0.78rem; padding: 10px 8px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;" title="Farmer accounts can sell produce, not buy crops.">Seller View</span>`;
                }
            } else {
                buyButtonHtml = `<a href="${paymentUrl}" class="btn-buy-crop" data-listing-id="${item.id}">Buy Produce</a>`;
            }

            return `
                <div class="crop-card" data-id="${item.id}">
                    <div class="crop-card-top">
                        <div class="crop-icon-badge">${emoji}</div>
                        <span class="grade-pill ${gradeClass}">${escapeHtml(item.quality_grade || 'Standard')}</span>
                    </div>
                    <div class="crop-card-body">
                        <h3 class="crop-title">${escapeHtml(item.crop_name)}</h3>
                        <div class="crop-variety">${escapeHtml(item.variety || 'Desi High-Yield')}</div>
                        
                        <div class="crop-price-row">
                            <span class="price-val">₹${price}</span>
                            <span class="price-unit">/ ${escapeHtml(unit)}</span>
                        </div>

                        <div class="crop-meta-row">
                            <span>📦 <strong>${item.quantity} ${escapeHtml(unit)}s</strong> avail.</span>
                            <span>📍 <strong>${escapeHtml(location)}</strong></span>
                        </div>

                        <div class="farmer-tag">
                            <div class="farmer-avatar">${farmerInitials}</div>
                            <span>${escapeHtml(farmerName)}</span>
                        </div>

                        <div class="crop-card-actions">
                            ${buyButtonHtml}
                            <button type="button" class="btn-contact-farmer" 
                                data-listing-id="${item.id}"
                                data-farmer-name="${escapeHtml(farmerName)}"
                                data-farmer-location="${escapeHtml(location)}"
                                data-farmer-mobile="${escapeHtml(farmerMobile)}">
                                Contact
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Intercept Buy Button Clicks for Unauthenticated or Non-Buyer Users
        listingsGrid.querySelectorAll('.btn-buy-crop').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const token = localStorage.getItem('km_access_token');
                const role = localStorage.getItem('km_role');
                if (!token) {
                    e.preventDefault();
                    alert('Please log in with a Buyer account to purchase produce directly from farmers.');
                    window.location.href = 'login.html?role=buyer';
                    return;
                }
                if (role === 'farmer') {
                    e.preventDefault();
                    alert('Access Restricted: Farmer accounts cannot purchase crops from the marketplace. Please use a Buyer account.');
                    return;
                }
            });
        });

        // Attach Contact Modal Openers
        listingsGrid.querySelectorAll('.btn-contact-farmer').forEach(btn => {
            btn.addEventListener('click', async () => {
                const listingId = btn.getAttribute('data-listing-id');
                const name = btn.getAttribute('data-farmer-name');
                const loc = btn.getAttribute('data-farmer-location');
                const maskedMob = btn.getAttribute('data-farmer-mobile');

                if (contactFarmerName) contactFarmerName.textContent = name;
                if (contactFarmerLoc) contactFarmerLoc.textContent = `📍 ${loc}`;

                const token = localStorage.getItem('km_access_token');
                const authNotice = document.getElementById('contact-auth-notice');

                if (token && listingId) {
                    // User is authenticated: request full unmasked phone number
                    try {
                        const detailRes = await fetch(`${API_BASE_URL}/listings/${listingId}?full=true`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (detailRes.ok) {
                            const detailData = await detailRes.json();
                            const fullPhone = detailData.farmer?.mobile_number || maskedMob;
                            if (contactFarmerPhone) contactFarmerPhone.textContent = `+91 ${fullPhone}`;
                            if (btnCallFarmer) {
                                btnCallFarmer.textContent = 'Call Now';
                                btnCallFarmer.href = `tel:+91${fullPhone}`;
                            }
                            if (authNotice) authNotice.style.display = 'none';
                        } else {
                            displayMaskedContact(maskedMob, authNotice);
                        }
                    } catch (e) {
                        displayMaskedContact(maskedMob, authNotice);
                    }
                } else {
                    // Unauthenticated: show masked phone and login CTA
                    displayMaskedContact(maskedMob, authNotice);
                }

                if (contactModal) contactModal.classList.add('active');
            });
        });
    }

    function displayMaskedContact(maskedMob, authNotice) {
        if (contactFarmerPhone) contactFarmerPhone.textContent = `+91 ${maskedMob}`;
        if (authNotice) authNotice.style.display = 'block';
        if (btnCallFarmer) {
            btnCallFarmer.textContent = 'Log In to Call';
            btnCallFarmer.href = 'login.html';
        }
    }

    // --- Multilingual Voice Assistant Integration ---

    function setupVoiceAssistant() {
        if (!startVoiceBtn) return;

        if (typeof VoiceSearchAssistant === 'undefined') {
            console.warn('VoiceSearchAssistant script not loaded.');
            startVoiceBtn.style.display = 'none';
            return;
        }

        const voiceAssistant = new VoiceSearchAssistant({
            onFilterExtracted: (extracted) => {
                console.log('Voice extracted filters:', extracted);

                if (extracted.crop) {
                    filterState.crop = extracted.crop;
                    if (searchInput) searchInput.value = extracted.crop;
                }

                if (extracted.maxPrice) {
                    filterState.max_price = extracted.maxPrice;
                    if (maxPriceInput) maxPriceInput.value = extracted.maxPrice;
                }

                if (extracted.minPrice) {
                    filterState.min_price = extracted.minPrice;
                    if (minPriceInput) minPriceInput.value = extracted.minPrice;
                }

                if (extracted.grade) {
                    filterState.quality_grade = extracted.grade;
                    if (gradeSelect) gradeSelect.value = extracted.grade;
                }

                if (extracted.location && !filterState.crop) {
                    filterState.crop = extracted.location;
                    if (searchInput) searchInput.value = extracted.location;
                }

                filterState.voiceMeta = {
                    text: extracted.rawText,
                    lang: extracted.language
                };

                filterState.page = 1;
                fetchListings();
            }
        });

        startVoiceBtn.addEventListener('click', () => {
            voiceAssistant.startListening();
        });
    }

    // --- Farmer Listing Post Modal ---

    function setupPostListingModal() {
        const role = localStorage.getItem('km_role');
        const token = localStorage.getItem('km_access_token');

        // Show Post Crop Listing button only for authenticated Farmers
        if (role === 'farmer' && token && farmerPostBtnContainer) {
            farmerPostBtnContainer.style.display = 'block';
        }

        if (openPostModalBtn && postModalBackdrop) {
            openPostModalBtn.addEventListener('click', () => {
                postModalBackdrop.classList.add('active');
                if (postModalError) postModalError.style.display = 'none';
            });
        }

        if (closePostModalBtn && postModalBackdrop) {
            closePostModalBtn.addEventListener('click', () => {
                postModalBackdrop.classList.remove('active');
            });
        }

        if (postModalBackdrop) {
            postModalBackdrop.addEventListener('click', (e) => {
                if (e.target === postModalBackdrop) {
                    postModalBackdrop.classList.remove('active');
                }
            });
        }

        if (postForm) {
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (postModalError) postModalError.style.display = 'none';

                const currentToken = localStorage.getItem('km_access_token');
                if (!currentToken) {
                    showPostError('Please log in with your farmer account to publish produce.');
                    return;
                }

                const submitBtn = document.getElementById('submit-listing-btn');
                const originalText = submitBtn ? submitBtn.textContent : 'Publish Listing →';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Publishing...';
                }

                const formData = new FormData(postForm);
                const payload = {
                    crop_name: formData.get('crop_name')?.trim(),
                    variety: formData.get('variety')?.trim() || null,
                    quality_grade: formData.get('quality_grade'),
                    quantity: parseFloat(formData.get('quantity')),
                    unit: formData.get('unit'),
                    price_per_unit: parseFloat(formData.get('price_per_unit')),
                    location_city: formData.get('location_city')?.trim() || null,
                    location_state: formData.get('location_state')?.trim() || null
                };

                try {
                    const res = await fetch(`${API_BASE_URL}/listings`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify(payload)
                    });

                    const resData = await res.json();

                    if (res.ok) {
                        // Reset form & close modal
                        postForm.reset();
                        postModalBackdrop.classList.remove('active');
                        // Show quick success feedback & reload listings
                        alert('Produce listed successfully! Buyers across India can now discover your harvest.');
                        filterState.crop = '';
                        filterState.page = 1;
                        fetchListings();
                    } else {
                        showPostError(resData.detail || 'Could not publish listing. Please check all fields.');
                    }
                } catch (err) {
                    console.error('Post listing error:', err);
                    showPostError('Network error while connecting to KrishiMandi backend server.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }
    }

    function showPostError(msg) {
        if (!postModalError) return;
        postModalError.textContent = msg;
        postModalError.style.display = 'block';
    }

    // --- Header Navigation & User Profile ---

    function setupUserAuthUI() {
        const headerActions = document.getElementById('header-actions');
        if (!headerActions) return;

        const token = localStorage.getItem('km_access_token');
        let user = null;
        try {
            const rawUser = localStorage.getItem('km_user');
            if (rawUser) user = JSON.parse(rawUser);
        } catch (e) {
            console.warn('Could not parse user', e);
        }

        if (token && user) {
            const role = (user.role || 'farmer').toUpperCase();
            const displayName = user.full_name || (user.mobile_number ? `User (${user.mobile_number.slice(-4)})` : 'User');
            const initials = displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'KM';

            headerActions.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <a href="profile.html" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1f2937; font-weight: 600; font-size: 0.9rem;">
                        <span style="width: 32px; height: 32px; border-radius: 50%; background: #1b6b3e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 700;">${initials}</span>
                        <span>${escapeHtml(displayName)}</span>
                        <span style="font-size: 0.72rem; background: #e0f2fe; color: #0369a1; padding: 2px 7px; border-radius: 12px; font-weight: 700;">${role}</span>
                    </a>
                    <button type="button" id="header-logout-btn" class="btn btn-outline" style="padding: 6px 14px; font-size: 0.82rem;">Logout</button>
                </div>
            `;

            const logoutBtn = document.getElementById('header-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('km_access_token');
                    localStorage.removeItem('km_user');
                    localStorage.removeItem('km_role');
                    window.location.reload();
                });
            }
        }
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
