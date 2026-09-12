// KisanSetu Full-Stack Application Controller
let state = {
  currentRole: 'farmer',
  buyerMode: 'retail', // 'retail' or 'bulk'
  activeCategory: 'All',
  listings: [],
  orders: [],
  fpoPools: [],
  docaStats: null,
  activeOrderListing: null,
  routeMap: null,
  mapLayers: null,
  demandChart: null,
  isVoicePlaying: false
};

// Crop icons & images mapping
const CROP_ICONS = {
  "Tomato": "🍅",
  "Onion": "🧅",
  "Potato": "🥔",
  "Apple (Shimla/Kashmir)": "🍎",
  "Wheat": "🌾",
  "Orange (Nagpur)": "🍊",
  "Green Chilli (Guntur)": "🌶️",
  "Basmati Rice": "🍚"
};

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  lucide.createIcons();
  await loadListings();
  await loadFpoPools();
  await loadDocaStats();
  initMap();
  initChart();
  runFairPriceCalc();
  runQualityPreview();
}

// ----------------- ROLE SWITCHER -----------------
function switchRole(role) {
  state.currentRole = role;
  
  // Update nav tabs
  document.querySelectorAll('.role-pill').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${role}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Hide all sections
  ['farmer', 'consumer', 'logistics', 'doca'].forEach(r => {
    const el = document.getElementById(`role-${r}`);
    if (el) el.classList.add('hidden');
  });

  // Show target section
  const targetEl = document.getElementById(`role-${role}`);
  if (targetEl) targetEl.classList.remove('hidden');

  lucide.createIcons();

  if (role === 'logistics' && state.routeMap) {
    setTimeout(() => {
      state.routeMap.invalidateSize();
    }, 200);
  } else if (role === 'doca') {
    fetchDemandForecast();
  }
}

// ----------------- PRODUCE LISTINGS & CATALOG -----------------
async function loadListings() {
  try {
    const res = await fetch('/api/listings');
    state.listings = await res.json();
    renderFarmerListingsTable();
    renderProduceCatalog();
  } catch (err) {
    console.error("Error loading listings:", err);
  }
}

function renderFarmerListingsTable() {
  const tbody = document.getElementById('farmerTableBody');
  const countEl = document.getElementById('farmerListingsCount');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${state.listings.length} Active Direct Harvests`;

  tbody.innerHTML = state.listings.map((item, idx) => {
    const icon = CROP_ICONS[item.crop_name] || "🌱";
    const extraPerKg = (item.base_price_per_kg - item.mandi_benchmark_price).toFixed(1);
    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4">
          <input type="checkbox" value="${item.id}" class="fpo-pool-checkbox w-4 h-4 accent-amber-600 rounded" ${idx < 2 ? 'checked' : ''}>
        </td>
        <td class="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
          <span class="text-xl">${icon}</span>
          <div>
            <p class="font-bold">${item.crop_name}</p>
            <p class="text-[10px] text-slate-400 font-normal">ID: ${item.id}</p>
          </div>
        </td>
        <td class="py-3 px-4">
          <p class="font-medium text-slate-800">${item.farmer_name}</p>
          <p class="text-[11px] text-slate-500">${item.location_name}, ${item.state}</p>
        </td>
        <td class="py-3 px-4">
          <span class="font-bold text-slate-800">${item.available_kg.toLocaleString()} kg</span>
          <span class="text-[10px] text-slate-400 block">Total: ${item.quantity_kg.toLocaleString()} kg</span>
        </td>
        <td class="py-3 px-4">
          <span class="font-extrabold text-emerald-700 text-sm">₹${item.base_price_per_kg.toFixed(2)}/kg</span>
          <span class="text-[10px] text-emerald-600 block font-semibold">+₹${extraPerKg}/kg vs Mandi</span>
        </td>
        <td class="py-3 px-4 text-slate-500">
          ₹${item.mandi_benchmark_price.toFixed(2)}/kg
        </td>
        <td class="py-3 px-4">
          <span class="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            ${item.quality_grade}
          </span>
          ${item.cold_storage_required ? '<span class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-semibold">Cold Chain</span>' : ''}
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}">
            ${item.status === 'active' ? '● Ready for Order' : item.status}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function setBuyerMode(mode) {
  state.buyerMode = mode;
  document.getElementById('mode-retail').className = mode === 'retail' 
    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 shadow-sm transition' 
    : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
  document.getElementById('mode-bulk').className = mode === 'bulk' 
    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 shadow-sm transition' 
    : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
  renderProduceCatalog();
}

function filterCatalog(category) {
  state.activeCategory = category;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.textContent.includes(category)) {
      btn.className = 'filter-pill px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold';
    } else {
      btn.className = 'filter-pill px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold';
    }
  });
  renderProduceCatalog();
}

function renderProduceCatalog() {
  const container = document.getElementById('catalogGrid');
  const searchInput = document.getElementById('catalogSearch');
  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  let filtered = state.listings.filter(item => {
    const matchCat = (state.activeCategory === 'All') || (item.category === state.activeCategory);
    const matchSearch = item.crop_name.toLowerCase().includes(query) || 
                        item.farmer_name.toLowerCase().includes(query) || 
                        item.location_name.toLowerCase().includes(query);
    return matchCat && matchSearch && item.status === 'active';
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i data-lucide="package-search" class="w-10 h-10 mx-auto text-slate-300 mb-2"></i>
        <p class="font-medium text-slate-600">No produce listings found matching criteria.</p>
        <p class="text-xs text-slate-400 mt-1">Try selecting 'All Categories' or clear search query.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(item => {
    const icon = CROP_ICONS[item.crop_name] || "🌱";
    // Traditional retail benchmark is ~20% above direct price
    const tradRetailEstimate = (item.recommended_direct_price * 1.22).toFixed(1);
    const savingsPerKg = (tradRetailEstimate - item.recommended_direct_price).toFixed(1);
    const minQty = state.buyerMode === 'retail' ? 5 : 100;

    return `
      <div class="agri-card bg-white rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <!-- Header -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl p-2 rounded-xl bg-slate-50 border border-slate-100">${icon}</span>
              <div>
                <h4 class="font-bold text-base text-slate-900">${item.crop_name}</h4>
                <p class="text-xs text-slate-500 flex items-center gap-1">
                  <i data-lucide="map-pin" class="w-3 h-3 text-emerald-700"></i>
                  <span>${item.location_name}, ${item.state}</span>
                </p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold whitespace-nowrap">
              ${item.quality_grade}
            </span>
          </div>

          <!-- Farmer Card -->
          <div class="p-2.5 rounded-xl bg-slate-50 text-xs mb-3 text-slate-600">
            <p class="flex justify-between">
              <span>Farmer: <strong class="text-slate-800">${item.farmer_name}</strong></span>
              <span class="text-emerald-700 font-semibold">DoCA Verified</span>
            </p>
            <p class="flex justify-between mt-1 text-[11px] text-slate-500">
              <span>Available: <strong>${item.available_kg.toLocaleString()} kg</strong></span>
              <span>Shelf Life: ${item.shelf_life_days} days</span>
            </p>
          </div>

          <!-- Price Highlight -->
          <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 mb-4">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="text-xs text-emerald-800 font-medium">Direct Price:</span>
                <p class="text-2xl font-black text-emerald-950">₹${item.recommended_direct_price.toFixed(2)} <span class="text-xs font-normal text-slate-500">/ kg</span></p>
              </div>
              <div class="text-right">
                <span class="text-[11px] text-slate-400 line-through">Retail: ₹${tradRetailEstimate}/kg</span>
                <p class="text-xs font-bold text-emerald-700">Save ₹${savingsPerKg}/kg</p>
              </div>
            </div>
            <div class="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-900">
              <span>Farmer Receives: <strong>₹${item.base_price_per_kg.toFixed(2)}/kg</strong> (74%)</span>
              <span>Intermediaries: <strong>0</strong></span>
            </div>
          </div>
        </div>

        <!-- Buy Button -->
        <button onclick="openOrderModal('${item.id}')" class="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition flex items-center justify-center gap-2">
          <i data-lucide="shopping-cart" class="w-4 h-4"></i>
          <span>Order Direct from Farm (${state.buyerMode === 'retail' ? 'Min 5 kg' : 'Bulk B2B'})</span>
        </button>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ----------------- FAIR PRICE CALCULATOR -----------------
async function runFairPriceCalc() {
  const crop = document.getElementById('calcCrop').value;
  const qty = parseFloat(document.getElementById('calcQty').value) || 1000.0;

  try {
    const res = await fetch(`/api/ai/fair-price?crop_name=${encodeURIComponent(crop)}&quantity_kg=${qty}`);
    const data = await res.json();

    document.getElementById('calcTradRate').textContent = `₹${data.traditional_model.farmer_payout_per_kg.toFixed(2)} / kg`;
    document.getElementById('calcTradTotal').textContent = `₹${data.traditional_model.farmer_total.toLocaleString()}`;
    
    document.getElementById('calcDirectRate').textContent = `₹${data.kisansetu_model.farmer_payout_per_kg.toFixed(2)} / kg`;
    document.getElementById('calcDirectTotal').textContent = `₹${data.kisansetu_model.farmer_total.toLocaleString()}`;

    document.getElementById('calcExtraFarmer').textContent = `+₹${data.impact_metrics.farmer_income_increase_inr.toLocaleString()} (+${data.impact_metrics.farmer_income_increase_pct}%)`;
    document.getElementById('calcSpoilagePrevented').textContent = `${data.impact_metrics.spoilage_prevented_kg} kg`;
  } catch (err) {
    console.error("Error in fair price calc:", err);
  }
}

// ----------------- QUALITY PREVIEW -----------------
async function runQualityPreview() {
  const crop = document.getElementById('calcCrop') ? document.getElementById('calcCrop').value : "Tomato";
  const uniformity = parseFloat(document.getElementById('inputUniformity').value);
  const blemish = parseFloat(document.getElementById('inputBlemish').value);
  const age = parseInt(document.getElementById('inputAge').value);

  document.getElementById('labelUniformity').textContent = `${uniformity}%`;
  document.getElementById('labelBlemish').textContent = `${blemish}%`;
  document.getElementById('labelAge').textContent = `${age} ${age === 1 ? 'day' : 'days'} ago`;

  try {
    const res = await fetch(`/api/ai/quality-grade?crop_name=${encodeURIComponent(crop)}&size_uniformity_pct=${uniformity}&blemish_free_pct=${blemish}&harvest_age_days=${age}`);
    const data = await res.json();

    const badge = document.getElementById('previewGradeBadge');
    badge.textContent = `${data.grade} (Score: ${data.quality_score}/100)`;
    badge.className = data.quality_score >= 80 
      ? 'inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs mb-1'
      : 'inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs mb-1';

    document.getElementById('previewGradeCert').textContent = data.certification;
    document.getElementById('previewShelfLife').textContent = `Shelf Life: ${data.remaining_shelf_life_days.cold_chain_reefer} days (Cold Chain) / ${data.remaining_shelf_life_days.ambient_storage} days (Ambient)`;
  } catch (err) {
    console.error("Error in quality preview:", err);
  }
}

// ----------------- FPO CONSOLIDATION POOLING -----------------
async function loadFpoPools() {
  try {
    const res = await fetch('/api/fpo/pools');
    state.fpoPools = await res.json();
    renderFpoPools();
  } catch (err) {
    console.error("Error loading pools:", err);
  }
}

function renderFpoPools() {
  const container = document.getElementById('fpoPoolsList');
  if (!container) return;

  if (state.fpoPools.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
        No active FPO pools created yet. Select produce items above to form a consolidated 3.5T truckload.
      </div>
    `;
    return;
  }

  container.innerHTML = state.fpoPools.map(pool => `
    <div class="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-amber-900">${pool.pool_name}</span>
        <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Active Pool</span>
      </div>
      <p class="text-xs text-slate-700">Destination: <strong>${pool.target_destination}</strong></p>
      <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <span class="text-[11px] text-slate-500">Consolidated Qty:</span>
          <p class="font-bold text-slate-800">${pool.total_quantity_kg.toLocaleString()} kg</p>
        </div>
        <div>
          <span class="text-[11px] text-slate-500">Logistics Freight Savings:</span>
          <p class="font-bold text-emerald-700">-${pool.logistics_savings_pct}%</p>
        </div>
      </div>
    </div>
  `).join('');
}

async function createFpoConsolidationPool() {
  const checkboxes = document.querySelectorAll('.fpo-pool-checkbox:checked');
  const selectedIds = Array.from(checkboxes).map(c => c.value);

  if (selectedIds.length === 0) {
    alert("Please check at least 1 or 2 produce listings in the table above to pool.");
    return;
  }

  const payload = {
    crop_name: "Consolidated Farm Harvest",
    listing_ids: selectedIds,
    target_destination: "Azadpur APMC Gateway, Delhi NCR",
    target_lat: 28.7118,
    target_lng: 77.1788
  };

  try {
    const res = await fetch('/api/fpo/create-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const pool = await res.json();
    alert(`Success! Created ${pool.pool_name} with ${pool.total_quantity_kg} kg payload. Freight cost slashed by ${pool.logistics_savings_pct}%.`);
    await loadFpoPools();
  } catch (err) {
    alert("Failed to create FPO pool.");
    console.error(err);
  }
}

// ----------------- MODAL HANDLERS: LIST PRODUCE -----------------
function openListingModal() {
  document.getElementById('modalListing').classList.remove('hidden');
  lucide.createIcons();
}

function closeListingModal() {
  document.getElementById('modalListing').classList.add('hidden');
}

function updateListingCategory() {
  const crop = document.getElementById('fCrop').value;
  const info = {
    "Onion": 37.5,
    "Tomato": 32.0,
    "Potato": 24.5,
    "Apple (Shimla/Kashmir)": 105.0,
    "Wheat": 34.0,
    "Orange (Nagpur)": 52.0,
    "Green Chilli (Guntur)": 58.0
  };
  if (info[crop]) {
    document.getElementById('fRate').value = info[crop];
  }
}

async function handleListingSubmit(e) {
  e.preventDefault();
  const crop = document.getElementById('fCrop').value;
  let category = "Vegetables";
  if (crop.includes("Apple") || crop.includes("Orange")) category = "Fruits";
  if (crop.includes("Wheat")) category = "Grains";
  if (crop.includes("Chilli")) category = "Spices";

  const payload = {
    farmer_name: document.getElementById('fName').value,
    phone: document.getElementById('fPhone').value,
    location_name: document.getElementById('fLoc').value,
    state: document.getElementById('fState').value,
    latitude: 19.9975 + (Math.random() * 0.2),
    longitude: 73.7898 + (Math.random() * 0.2),
    crop_name: crop,
    category: category,
    quantity_kg: parseFloat(document.getElementById('fQty').value),
    expected_harvest_date: new Date().toISOString().split('T')[0],
    base_price_per_kg: parseFloat(document.getElementById('fRate').value),
    quality_grade: document.getElementById('fGrade').value,
    cold_storage_required: document.getElementById('fCold').checked,
    description: document.getElementById('fDesc').value,
    fpo_id: "FPO-NEW-01"
  };

  try {
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to save");
    alert("Produce listed successfully on KisanSetu with DoCA Agmark verification!");
    closeListingModal();
    await loadListings();
  } catch (err) {
    alert("Error creating listing.");
    console.error(err);
  }
}

// ----------------- MODAL HANDLERS: ORDER & ESCROW -----------------
function openOrderModal(listingId) {
  const listing = state.listings.find(item => item.id === listingId);
  if (!listing) return;

  state.activeOrderListing = listing;
  document.getElementById('orderListingId').value = listing.id;
  document.getElementById('orderModalTitle').textContent = `Order Direct: ${listing.crop_name} (${listing.quality_grade})`;
  document.getElementById('orderModalSubtitle').textContent = `Farmer: ${listing.farmer_name} • ${listing.location_name}`;
  document.getElementById('orderUnitPrice').textContent = `₹${listing.recommended_direct_price.toFixed(2)} / kg`;
  
  const retailEst = (listing.recommended_direct_price * 1.22).toFixed(1);
  document.getElementById('orderRetailPrice').textContent = `₹${retailEst}`;
  
  const minQty = state.buyerMode === 'retail' ? 25 : 200;
  document.getElementById('bQty').value = minQty;

  updateOrderCalculations();
  document.getElementById('modalOrder').classList.remove('hidden');
  lucide.createIcons();
}

function closeOrderModal() {
  document.getElementById('modalOrder').classList.add('hidden');
}

function updateOrderCalculations() {
  if (!state.activeOrderListing) return;
  const listing = state.activeOrderListing;
  const qty = parseFloat(document.getElementById('bQty').value) || 1;

  const unitPrice = listing.recommended_direct_price;
  const totalAmount = unitPrice * qty;
  const farmerPayout = listing.base_price_per_kg * qty;
  const logisticsFee = totalAmount * 0.09;
  const platformFee = totalAmount * 0.03;

  document.getElementById('orderFarmerPayout').textContent = `₹${farmerPayout.toFixed(2)}`;
  document.getElementById('orderLogisticsFee').textContent = `₹${logisticsFee.toFixed(2)}`;
  document.getElementById('orderPlatformFee').textContent = `₹${platformFee.toFixed(2)}`;
  document.getElementById('orderTotalPayable').textContent = `₹${totalAmount.toFixed(2)}`;
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  if (!state.activeOrderListing) return;

  const payload = {
    listing_id: state.activeOrderListing.id,
    buyer_name: document.getElementById('bName').value,
    buyer_type: state.buyerMode === 'retail' ? 'consumer' : 'bulk_buyer',
    buyer_phone: document.getElementById('bPhone').value,
    delivery_address: document.getElementById('bAddress').value,
    delivery_latitude: 19.0760,
    delivery_longitude: 72.9982,
    quantity_kg: parseFloat(document.getElementById('bQty').value),
    payment_method: 'escrow'
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Order failed");
    }
    const order = await res.json();
    alert(`Order Confirmed!\nOrder ID: ${order.id}\nDigital Escrow Locked: ₹${order.total_amount}\nDirect Farmer Payout Guaranteed: ₹${order.farmer_earnings}`);
    closeOrderModal();
    await loadListings();
    await loadDocaStats();
  } catch (err) {
    alert(`Failed to place order: ${err.message}`);
  }
}

// ----------------- GIS ROUTE MAP & AI LOGISTICS -----------------
function initMap() {
  const mapEl = document.getElementById('routeMap');
  if (!mapEl) return;

  // Center on Central/West India
  state.routeMap = L.map('routeMap').setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors | DoCA KisanSetu'
  }).addTo(state.routeMap);

  state.mapLayers = L.layerGroup().addTo(state.routeMap);

  // Load and plot initial cold storage hubs
  fetchColdStorages();
}

async function fetchColdStorages() {
  try {
    const res = await fetch('/api/logistics/cold-storages');
    const hubs = await res.json();

    const coldIcon = L.divIcon({
      className: 'custom-cold-icon',
      html: `<div style="background:#0284c7;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;box-shadow:0 4px 8px rgba(0,0,0,0.2);display:flex;align-items:center;gap:4px;">❄️ ${hubs[0].temp_c}°C</div>`
    });

    hubs.forEach(h => {
      L.marker([h.lat, h.lng], { icon: coldIcon })
        .bindPopup(`<strong>${h.name}</strong><br>Capacity: ${h.capacity_mt} MT<br>Temp: ${h.temp_c}°C<br>DoCA Cold-Chain Buffer`)
        .addTo(state.mapLayers);
    });
  } catch (err) {
    console.error("Error fetching cold storages:", err);
  }
}

async function runAiRouteOptimization() {
  const cluster = document.getElementById('routeClusterSelect').value;
  const destType = document.getElementById('routeDestSelect').value;
  const vehicle = document.getElementById('routeVehicleSelect').value;

  // Filter listings by cluster
  let selectedIds = [];
  if (cluster === 'nashik') {
    selectedIds = state.listings.filter(i => i.location_name.includes("Nashik")).map(i => i.id);
  } else if (cluster === 'kolar') {
    selectedIds = state.listings.filter(i => i.location_name.includes("Kolar")).map(i => i.id);
  } else {
    selectedIds = state.listings.slice(0, 3).map(i => i.id);
  }

  if (selectedIds.length === 0) {
    selectedIds = state.listings.slice(0, 2).map(i => i.id);
  }

  // Destination coords
  const destCoords = {
    delhi: { name: "Azadpur National Agri Hub, Delhi", lat: 28.7118, lng: 77.1788 },
    mumbai: { name: "Vashi APMC Central Terminal, Mumbai", lat: 19.0760, lng: 72.9982 },
    bengaluru: { name: "Bengaluru Urban Wholesale Hub", lat: 12.9716, lng: 77.5946 }
  }[destType];

  const payload = {
    pickup_listing_ids: selectedIds,
    destination_name: destCoords.name,
    destination_lat: destCoords.lat,
    destination_lng: destCoords.lng,
    vehicle_type: vehicle
  };

  try {
    const res = await fetch('/api/logistics/optimize-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    renderOptimizedRouteOnMap(result);
  } catch (err) {
    alert("Failed to compute route optimization.");
    console.error(err);
  }
}

function renderOptimizedRouteOnMap(result) {
  state.mapLayers.clearLayers();
  fetchColdStorages(); // re-add cold hubs

  // Metric box
  const resBox = document.getElementById('routeResultBox');
  resBox.classList.remove('hidden');

  document.getElementById('resDist').textContent = `${result.total_distance_km} km`;
  document.getElementById('resTime').textContent = `${result.transit_time_hours} hrs`;
  document.getElementById('resFreight').textContent = `₹${result.freight_cost_per_kg_inr} / kg`;
  document.getElementById('resSaved').textContent = `${result.environmental_impact.distance_saved_km} km (-${result.environmental_impact.efficiency_gain_pct}%)`;
  document.getElementById('resCo2').textContent = `-${result.environmental_impact.co2_saved_kg} kg CO2`;

  // Draw Route Polyline
  const latlngs = result.route_stops.map(s => [s.lat, s.lng]);
  const polyline = L.polyline(latlngs, {
    color: '#0284c7',
    weight: 4,
    opacity: 0.85,
    dashArray: '8, 8',
    lineJoin: 'round'
  }).addTo(state.mapLayers);

  // Add stop markers
  result.route_stops.forEach((stop, idx) => {
    let color = stop.type === 'farm_pickup' ? '#15803d' : (stop.type === 'cold_storage_hub' ? '#0284c7' : '#e11d48');
    let label = stop.type === 'farm_pickup' ? `Stop ${stop.stop_sequence}: Farm` : (stop.type === 'cold_storage_hub' ? `❄️ Hub` : `🏁 Dest`);

    const icon = L.divIcon({
      html: `<div style="background:${color};color:white;padding:3px 7px;border-radius:6px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${label}</div>`
    });

    L.marker([stop.lat, stop.lng], { icon: icon })
      .bindPopup(`<strong>${stop.name}</strong><br>${stop.location}<br>Cumulative: ${stop.cumulative_distance_km} km`)
      .addTo(state.mapLayers);
  });

  state.routeMap.fitBounds(polyline.getBounds(), { padding: [40, 40] });

  // Render Waypoint Cards
  const itinCard = document.getElementById('waypointItineraryCard');
  const itinList = document.getElementById('waypointList');
  itinCard.classList.remove('hidden');

  itinList.innerHTML = result.route_stops.map(stop => `
    <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
      <div class="flex items-center justify-between mb-1.5">
        <span class="font-bold text-slate-800">Sequence #${stop.stop_sequence}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${stop.type === 'farm_pickup' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}">
          ${stop.type.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <p class="font-semibold text-slate-900">${stop.name}</p>
      <p class="text-[11px] text-slate-500">${stop.location}</p>
      <div class="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-600">
        <span>Leg: <strong>${stop.leg_distance_km} km</strong></span>
        <span>Cumul: <strong>${stop.cumulative_distance_km} km</strong></span>
      </div>
    </div>
  `).join('');
}

// ----------------- DoCA RADAR & DEMAND FORECAST -----------------
async function loadDocaStats() {
  try {
    const res = await fetch('/api/doca/dashboard-stats');
    state.docaStats = await res.json();
    
    document.getElementById('statFarmersBenefited').textContent = `${state.docaStats.total_farmers_benefited} Farmers`;
    document.getElementById('statConsumerSavings').textContent = `₹${state.docaStats.consumer_intermediary_savings_inr.toLocaleString()}`;
    document.getElementById('statFoodWastage').textContent = `${state.docaStats.spoilage_prevented_mt} MT`;

    // Render Alerts
    const alertsContainer = document.getElementById('marketAlertsContainer');
    if (alertsContainer && state.docaStats.active_market_alerts) {
      alertsContainer.innerHTML = state.docaStats.active_market_alerts.map(a => `
        <div class="p-4 rounded-xl border ${a.severity === 'Medium' ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'}">
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full ${a.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
              <span class="font-bold text-slate-900 text-xs">${a.crop_name} (${a.region}) - ${a.alert_type}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">${a.timestamp}</span>
          </div>
          <p class="text-xs text-slate-700 mb-2">${a.message}</p>
          <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800">
            <strong>DoCA Recommended Policy Action:</strong> ${a.recommended_action}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Error loading DoCA stats:", err);
  }
}

function initChart() {
  const ctx = document.getElementById('demandForecastChart');
  if (!ctx) return;

  state.demandChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      datasets: [
        {
          label: 'AI Projected Consumption (MT)',
          data: [1850, 1920, 2150, 2480, 2100, 1950],
          borderColor: '#15803d',
          backgroundColor: 'rgba(21, 128, 61, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35
        },
        {
          label: 'Upper Scarcity Threshold (MT)',
          data: [2200, 2200, 2200, 2200, 2200, 2200],
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            footer: function(tooltipItems) {
              return 'DoCA AI Forward Demand Model';
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: 'Metric Tonnes (MT)', font: { size: 11 } },
          grid: { color: '#f1f5f9' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

async function fetchDemandForecast() {
  const crop = document.getElementById('forecastCropSelect').value;
  const region = document.getElementById('forecastRegionSelect').value;

  try {
    const res = await fetch(`/api/ai/forecast?crop_name=${encodeURIComponent(crop)}&region=${encodeURIComponent(region)}&weeks_ahead=6`);
    const data = await res.json();

    document.getElementById('docaAdvisoryText').textContent = data.doca_market_advisory;
    document.getElementById('baseDemandMt').textContent = `${data.base_weekly_demand_mt.toLocaleString()} MT/week`;
    
    const peak = Math.max(...data.timeline.map(t => t.forecast_demand_mt));
    document.getElementById('peakDemandMt').textContent = `${peak.toLocaleString()} MT`;

    const badge = document.getElementById('scarcityBadge');
    badge.textContent = data.scarcity_risk_flag ? "High Scarcity Alert" : "Stable Supply";
    badge.className = data.scarcity_risk_flag ? "font-bold text-rose-600" : "font-bold text-emerald-700";

    // Update Chart
    if (state.demandChart) {
      state.demandChart.data.labels = data.timeline.map(t => t.week);
      state.demandChart.data.datasets[0].data = data.timeline.map(t => t.forecast_demand_mt);
      state.demandChart.data.datasets[1].data = data.timeline.map(t => Math.round(data.base_weekly_demand_mt * 1.25));
      state.demandChart.update();
    }
  } catch (err) {
    console.error("Error fetching demand forecast:", err);
  }
}

function triggerBufferStockRelease() {
  alert("Strategic Buffer Release Order Approved!\nAllocated 500 MT of commodity from DoCA cold storage buffers to consumer cooperatives at stabilized benchmark rates.");
}

// ----------------- VERNACULAR VOICE ASSISTANCE -----------------
function playVoiceAdvisory() {
  if (!('speechSynthesis' in window)) {
    alert("Audio speech synthesis is not supported on this browser.");
    return;
  }

  if (state.isVoicePlaying) {
    window.speechSynthesis.cancel();
    state.isVoicePlaying = false;
    document.getElementById('voiceAssistBtnText').textContent = "Audio Assist (हिन्दी/EN)";
    return;
  }

  const lang = document.getElementById('langSelector').value;
  let text = "";

  if (lang === 'hi') {
    text = "नमस्ते किसान भाई! किसान सेतु में आपका स्वागत है। यहाँ आप अपनी फसल सीधे उपभोक्ताओं और थोक खरीदारों को बेच सकते हैं। आढ़तियों को बिचौलिया कमीशन देने की कोई जरूरत नहीं है। आपको अपनी उपज का अड़तीस प्रतिशत अधिक दाम मिलेगा और उपभोक्ता को भी सस्ता मिलेगा।";
  } else {
    text = "Welcome to KisanSetu, powered by the Department of Consumer Affairs. Connect directly with buyers, eliminate five tiers of middlemen, and earn up to forty-two percent more per kilogram on every harvest.";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  if (lang === 'hi') utterance.lang = 'hi-IN';

  utterance.onend = () => {
    state.isVoicePlaying = false;
    document.getElementById('voiceAssistBtnText').textContent = "Audio Assist (हिन्दी/EN)";
  };

  window.speechSynthesis.speak(utterance);
  state.isVoicePlaying = true;
  document.getElementById('voiceAssistBtnText').textContent = "Playing Audio...";
}
