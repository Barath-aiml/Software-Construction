// =============================================
// APP.JS - Main Application Logic
// =============================================

// ---- State ----
const AppState = {
  currentView: 'dashboard',
  products: [],
  filteredProducts: [],
  currentPage: 1,
  perPage: 10,
  searchQuery: '',
  searchPriceMin: '',
  searchPriceMax: '',
  searchCategory: '',
  editingProductId: null,
  deleteProductId: null,
  viewProductId: null,
};

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', async () => {
  await DB.initDB();
  await refreshProducts();
  setupNavigation();
  setupSearchListeners();
  updateDashboard();
  showToast('Platform loaded successfully', 'success');
});

// =============================================
// NAVIGATION
// =============================================
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });
}

function switchView(view) {
  AppState.currentView = view;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navItem) navItem.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');
  const titles = { dashboard: 'Dashboard', products: 'Product List', add: 'Add Product', upload: 'Bulk Upload' };
  document.getElementById('topbar-title').textContent = titles[view] || view;
}

// =============================================
// PRODUCT REFRESH & RENDER
// =============================================
async function refreshProducts() {
  AppState.products = await DB.getAllProducts();
  applyFilters();
  updateSidebarStats();
  if (AppState.currentView === 'dashboard') updateDashboard();
}

function applyFilters() {
  const { searchQuery, searchPriceMin, searchPriceMax, searchCategory } = AppState;
  AppState.filteredProducts = AppState.products.filter(p => {
    const matchName = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPriceMin = !searchPriceMin || p.price >= parseFloat(searchPriceMin);
    const matchPriceMax = !searchPriceMax || p.price <= parseFloat(searchPriceMax);
    const matchCat = !searchCategory || p.category === searchCategory;
    return matchName && matchPriceMin && matchPriceMax && matchCat;
  });
  AppState.currentPage = 1;
  renderProductTable();
}

function renderProductTable() {
  const { filteredProducts, currentPage, perPage } = AppState;
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageProducts = filteredProducts.slice(start, end);
  const total = filteredProducts.length;
  const totalPages = Math.ceil(total / perPage);

  const tbody = document.getElementById('product-tbody');
  
  if (pageProducts.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-title">No products found</div>
          <div class="empty-sub">Try adjusting your search filters or add a new product</div>
        </div>
      </td></tr>`;
  } else {
    tbody.innerHTML = pageProducts.map(p => {
      const stockLevel = p.stock > 50 ? 'high' : p.stock > 10 ? 'mid' : 'low';
      return `
        <tr>
          <td>
            <div class="product-name-cell">${escHtml(p.name)}</div>
            <div class="product-sku">${escHtml(p.sku)}</div>
          </td>
          <td><span class="badge badge-cat">${escHtml(p.category)}</span></td>
          <td class="price-cell">₹${p.price.toLocaleString('en-IN')}</td>
          <td>
            <div class="stock-indicator">
              <span class="stock-dot ${stockLevel}"></span>
              ${p.stock}
            </div>
          </td>
          <td><span class="badge badge-${p.status === 'Active' ? 'active' : 'inactive'}">${p.status}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${formatDate(p.createdAt)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm btn-secondary btn-icon" onclick="openViewModal(${p.id})" title="View">👁</button>
              <button class="btn btn-sm btn-warning btn-icon" onclick="openEditModal(${p.id})" title="Edit">✏️</button>
              <button class="btn btn-sm btn-danger btn-icon" onclick="openDeleteConfirm(${p.id})" title="Delete">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // Pagination info
  document.getElementById('pagination-info').innerHTML =
    `Showing <span>${total === 0 ? 0 : start + 1}–${Math.min(end, total)}</span> of <span>${total}</span> products`;

  // Pagination controls
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const { currentPage } = AppState;
  const container = document.getElementById('pagination-controls');
  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  if (startPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) html += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
  }
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
    html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(AppState.filteredProducts.length / AppState.perPage);
  if (page < 1 || page > totalPages) return;
  AppState.currentPage = page;
  renderProductTable();
}

// =============================================
// SEARCH
// =============================================
function setupSearchListeners() {
  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  document.getElementById('search-name').addEventListener('input', debounce(e => {
    AppState.searchQuery = e.target.value; applyFilters();
  }, 300));
  document.getElementById('search-price-min').addEventListener('input', debounce(e => {
    AppState.searchPriceMin = e.target.value; applyFilters();
  }, 300));
  document.getElementById('search-price-max').addEventListener('input', debounce(e => {
    AppState.searchPriceMax = e.target.value; applyFilters();
  }, 300));
  document.getElementById('search-category').addEventListener('change', e => {
    AppState.searchCategory = e.target.value; applyFilters();
  });
}

function clearSearch() {
  document.getElementById('search-name').value = '';
  document.getElementById('search-price-min').value = '';
  document.getElementById('search-price-max').value = '';
  document.getElementById('search-category').value = '';
  AppState.searchQuery = ''; AppState.searchPriceMin = '';
  AppState.searchPriceMax = ''; AppState.searchCategory = '';
  applyFilters();
}

// =============================================
// DASHBOARD
// =============================================
function updateDashboard() {
  const products = AppState.products;
  const active = products.filter(p => p.status === 'Active').length;
  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const categories = [...new Set(products.map(p => p.category))].length;

  document.getElementById('dash-total').textContent = products.length;
  document.getElementById('dash-active').textContent = active;
  document.getElementById('dash-value').textContent = '₹' + (totalValue / 1000).toFixed(0) + 'K';
  document.getElementById('dash-categories').textContent = categories;

  // Recent products
  const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentEl = document.getElementById('recent-products');
  recentEl.innerHTML = recent.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);">
      <div>
        <div style="font-weight:600;font-size:13px">${escHtml(p.name)}</div>
        <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${p.sku}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--accent-primary)">₹${p.price.toLocaleString('en-IN')}</div>
        <span class="badge badge-${p.status === 'Active' ? 'active' : 'inactive'}" style="font-size:10px">${p.status}</span>
      </div>
    </div>
  `).join('');

  // Category breakdown
  const catCounts = {};
  products.forEach(p => catCounts[p.category] = (catCounts[p.category] || 0) + 1);
  const catEl = document.getElementById('category-breakdown');
  catEl.innerHTML = Object.entries(catCounts).map(([cat, count]) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
      <span style="font-size:13px">${cat}</span>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:80px;height:4px;background:var(--bg-elevated);border-radius:2px;">
          <div style="width:${Math.round(count/products.length*100)}%;height:100%;background:var(--accent-primary);border-radius:2px;"></div>
        </div>
        <span style="font-size:12px;font-family:var(--font-mono);color:var(--accent-primary);min-width:24px;text-align:right">${count}</span>
      </div>
    </div>
  `).join('');
}

function updateSidebarStats() {
  const total = AppState.products.length;
  const active = AppState.products.filter(p => p.status === 'Active').length;
  document.getElementById('sb-total').textContent = total;
  document.getElementById('sb-active').textContent = active;
}

// =============================================
// ADD PRODUCT FORM
// =============================================
function setupAddProductForm() {
  document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
  setupImageUpload('add-image-input', 'add-image-preview', 'add-image-placeholder');
}

async function handleAddProduct(e) {
  e.preventDefault();
  const form = e.target;
  if (!validateProductForm(form)) return;

  const imageData = getImageData('add-image-input');
  const imageHash = imageData ? DB.simpleHash(imageData) : null;

  if (imageHash) {
    const isDup = await DB.checkDuplicateImageHash(imageHash);
    if (isDup) { showToast('This image is already used for another product!', 'error'); return; }
  }

  const sku = form.querySelector('[name="sku"]').value.trim();
  const isDupSKU = await DB.checkDuplicateSKU(sku);
  if (isDupSKU) {
    showFieldError('sku-error', 'This SKU already exists');
    return;
  }

  const product = {
    name: form.querySelector('[name="name"]').value.trim(),
    sku,
    category: form.querySelector('[name="category"]').value,
    price: parseFloat(form.querySelector('[name="price"]').value),
    stock: parseInt(form.querySelector('[name="stock"]').value),
    status: form.querySelector('[name="status"]').value,
    description: form.querySelector('[name="description"]').value.trim(),
    imageData: imageData || null,
    imageHash: imageHash || `nohash_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  try {
    await DB.addProduct(product);
    await refreshProducts();
    form.reset();
    clearImagePreview('add-image-preview', 'add-image-placeholder');
    showToast(`"${product.name}" added successfully!`, 'success');
    switchView('products');
  } catch (err) {
    showToast('Failed to add product: ' + err.message, 'error');
  }
}

// =============================================
// VIEW MODAL
// =============================================
async function openViewModal(id) {
  const p = await DB.getProductById(id);
  if (!p) return;
  AppState.viewProductId = id;

  const imageHtml = p.imageData
    ? `<img src="${p.imageData}" class="image-preview" style="max-width:180px;max-height:180px">`
    : `<span style="font-size:60px">📦</span>`;

  document.getElementById('view-modal-body').innerHTML = `
    <div class="product-detail-grid">
      <div class="product-image-thumb">${imageHtml}</div>
      <div>
        <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">${escHtml(p.name)}</h2>
        <span class="badge badge-${p.status === 'Active' ? 'active' : 'inactive'}" style="margin-bottom:16px;display:inline-flex">${p.status}</span>
        <div class="detail-row"><span class="detail-key">SKU</span><span class="detail-val" style="font-family:var(--font-mono)">${escHtml(p.sku)}</span></div>
        <div class="detail-row"><span class="detail-key">Category</span><span class="badge badge-cat">${escHtml(p.category)}</span></div>
        <div class="detail-row"><span class="detail-key">Price</span><span class="detail-val" style="color:var(--accent-primary);font-weight:700;font-size:18px">₹${p.price.toLocaleString('en-IN')}</span></div>
        <div class="detail-row"><span class="detail-key">Stock</span><span class="detail-val">${p.stock} units</span></div>
        <div class="detail-row"><span class="detail-key">Added</span><span class="detail-val">${formatDate(p.createdAt)}</span></div>
        ${p.description ? `<div class="detail-row" style="flex-direction:column;gap:4px"><span class="detail-key">Description</span><span class="detail-val" style="color:var(--text-secondary)">${escHtml(p.description)}</span></div>` : ''}
      </div>
    </div>
  `;

  openModal('view-modal');
}

// =============================================
// EDIT MODAL
// =============================================
async function openEditModal(id) {
  const p = await DB.getProductById(id);
  if (!p) return;
  AppState.editingProductId = id;

  // Populate form
  const f = document.getElementById('edit-product-form');
  f.querySelector('[name="name"]').value = p.name;
  f.querySelector('[name="sku"]').value = p.sku;
  f.querySelector('[name="category"]').value = p.category;
  f.querySelector('[name="price"]').value = p.price;
  f.querySelector('[name="stock"]').value = p.stock;
  f.querySelector('[name="status"]').value = p.status;
  f.querySelector('[name="description"]').value = p.description || '';
  document.getElementById('edit-stored-image').value = p.imageData || '';
  document.getElementById('edit-stored-hash').value = p.imageHash || '';

  const preview = document.getElementById('edit-image-preview');
  const placeholder = document.getElementById('edit-image-placeholder');
  if (p.imageData) {
    preview.innerHTML = `<div class="image-preview-wrap"><img src="${p.imageData}" class="image-preview"><button type="button" class="image-remove-btn" onclick="clearImagePreview('edit-image-preview','edit-image-placeholder')">×</button></div>`;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    clearImagePreview('edit-image-preview', 'edit-image-placeholder');
  }

  openModal('edit-modal');
}

async function handleEditProduct(e) {
  e.preventDefault();
  const form = e.target;
  if (!validateProductForm(form)) return;

  const id = AppState.editingProductId;
  const sku = form.querySelector('[name="sku"]').value.trim();
  const isDupSKU = await DB.checkDuplicateSKU(sku, id);
  if (isDupSKU) { showFieldError('edit-sku-error', 'This SKU already exists'); return; }

  const newImageInput = document.getElementById('edit-image-input');
  let imageData = document.getElementById('edit-stored-image').value || null;
  let imageHash = document.getElementById('edit-stored-hash').value || null;

  if (newImageInput.files && newImageInput.files[0]) {
    const newImg = await readFileAsDataURL(newImageInput.files[0]);
    const newHash = DB.simpleHash(newImg);
    const isDupImg = await DB.checkDuplicateImageHash(newHash, id);
    if (isDupImg) { showToast('This image is already used for another product!', 'error'); return; }
    imageData = newImg;
    imageHash = newHash;
  }

  const existing = await DB.getProductById(id);
  const product = {
    ...existing,
    name: form.querySelector('[name="name"]').value.trim(),
    sku,
    category: form.querySelector('[name="category"]').value,
    price: parseFloat(form.querySelector('[name="price"]').value),
    stock: parseInt(form.querySelector('[name="stock"]').value),
    status: form.querySelector('[name="status"]').value,
    description: form.querySelector('[name="description"]').value.trim(),
    imageData,
    imageHash,
  };

  try {
    await DB.updateProduct(product);
    await refreshProducts();
    closeModal('edit-modal');
    showToast(`"${product.name}" updated successfully!`, 'success');
  } catch (err) {
    showToast('Failed to update: ' + err.message, 'error');
  }
}

// =============================================
// DELETE
// =============================================
function openDeleteConfirm(id) {
  AppState.deleteProductId = id;
  const p = AppState.products.find(x => x.id === id);
  document.getElementById('delete-product-name').textContent = p ? p.name : 'this product';
  openModal('delete-modal');
}

async function confirmDelete() {
  const id = AppState.deleteProductId;
  if (!id) return;
  try {
    await DB.deleteProduct(id);
    await refreshProducts();
    closeModal('delete-modal');
    showToast('Product deleted successfully', 'success');
    AppState.deleteProductId = null;
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

// =============================================
// MODALS
// =============================================
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}
// Close on overlay click
document.querySelectorAll && window.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});

// =============================================
// FORM VALIDATION
// =============================================
function validateProductForm(form) {
  let valid = true;
  clearAllFieldErrors();

  const name = form.querySelector('[name="name"]').value.trim();
  if (!name) { showFieldError(form.querySelector('[name="name"]').id ? form.id + '-name-err' : 'name-error', 'Product name is required'); valid = false; }

  const sku = form.querySelector('[name="sku"]').value.trim();
  if (!sku) { showFieldError(form.id.includes('edit') ? 'edit-sku-error' : 'sku-error', 'SKU is required'); valid = false; }

  const price = parseFloat(form.querySelector('[name="price"]').value);
  if (isNaN(price) || price < 0) { showFieldError(form.id.includes('edit') ? 'edit-price-error' : 'price-error', 'Valid price required'); valid = false; }

  const stock = parseInt(form.querySelector('[name="stock"]').value);
  if (isNaN(stock) || stock < 0) { showFieldError(form.id.includes('edit') ? 'edit-stock-error' : 'stock-error', 'Valid stock required'); valid = false; }

  if (!form.querySelector('[name="category"]').value) { valid = false; }

  return valid;
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function clearAllFieldErrors() {
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
}

// =============================================
// IMAGE HANDLING
// =============================================
function setupImageUpload(inputId, previewId, placeholderId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Only image files allowed', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const data = await readFileAsDataURL(file);
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);
    preview.innerHTML = `<div class="image-preview-wrap"><img src="${data}" class="image-preview"><button type="button" class="image-remove-btn" onclick="clearImagePreview('${previewId}','${placeholderId}')">×</button></div>`;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  });
}

function getImageData(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files[0]) return null;
  // Already read via event, return from preview img src
  const previewImg = document.querySelector(`#${inputId.replace('input','preview')} img`);
  return previewImg ? previewImg.src : null;
}

function clearImagePreview(previewId, placeholderId) {
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);
  if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'flex';
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

// =============================================
// BULK UPLOAD
// =============================================
function setupBulkUpload() {
  const zone = document.getElementById('bulk-upload-zone');
  const input = document.getElementById('bulk-file-input');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processBulkFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', e => {
    if (e.target.files[0]) processBulkFile(e.target.files[0]);
  });
}

async function processBulkFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Only CSV or Excel files allowed', 'error'); return;
  }

  document.getElementById('bulk-processing').style.display = 'flex';
  document.getElementById('bulk-results').style.display = 'none';

  let rows = [];
  try {
    if (ext === 'csv') {
      const text = await readFileAsText(file);
      rows = parseCSV(text);
    } else {
      rows = await parseExcel(file);
    }
  } catch (err) {
    document.getElementById('bulk-processing').style.display = 'none';
    showToast('Failed to parse file: ' + err.message, 'error');
    return;
  }

  await processBulkRows(rows);
  document.getElementById('bulk-processing').style.display = 'none';
}

async function processBulkRows(rows) {
  const results = { success: [], errors: [], warnings: [] };
  const requiredFields = ['name', 'sku', 'category', 'price', 'stock'];
  const seenSKUs = new Set();
  const seenImages = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const errors = [];

    // Validate required fields
    for (const field of requiredFields) {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Block image URLs
    if (row.image && (row.image.startsWith('http://') || row.image.startsWith('https://'))) {
      errors.push('Image URLs are not allowed. Only uploaded images accepted.');
    }

    // Check for duplicate images in this upload
    if (row.image && seenImages.has(row.image)) {
      errors.push('Duplicate image detected within upload batch');
    } else if (row.image) {
      seenImages.add(row.image);
    }

    // Check duplicate SKU in batch
    if (row.sku && seenSKUs.has(row.sku)) {
      errors.push(`Duplicate SKU "${row.sku}" in upload file`);
    } else if (row.sku) {
      seenSKUs.add(row.sku);
    }

    // Validate price
    const price = parseFloat(row.price);
    if (row.price && (isNaN(price) || price < 0)) errors.push('Invalid price value');

    // Validate stock
    const stock = parseInt(row.stock);
    if (row.stock && (isNaN(stock) || stock < 0)) errors.push('Invalid stock value');

    if (errors.length > 0) {
      results.errors.push({ row: rowNum, name: row.name || `Row ${rowNum}`, errors });
      continue;
    }

    // Check DB for duplicate SKU
    const isDupSKU = await DB.checkDuplicateSKU(row.sku.trim());
    if (isDupSKU) {
      results.warnings.push({ row: rowNum, name: row.name, msg: `SKU "${row.sku}" already exists — skipped` });
      continue;
    }

    // Save to DB
    try {
      await DB.addProduct({
        name: String(row.name).trim(),
        sku: String(row.sku).trim(),
        category: String(row.category).trim(),
        price: parseFloat(row.price),
        stock: parseInt(row.stock),
        status: row.status || 'Active',
        description: row.description || '',
        imageData: null,
        imageHash: `bulk_${DB.simpleHash(row.sku + Date.now())}`,
        createdAt: new Date().toISOString(),
      });
      results.success.push({ row: rowNum, name: row.name });
    } catch (err) {
      results.errors.push({ row: rowNum, name: row.name, errors: [err.message] });
    }
  }

  await refreshProducts();
  showBulkResults(results);
}

function showBulkResults(results) {
  const el = document.getElementById('bulk-results');
  el.style.display = 'block';

  document.getElementById('bulk-success-count').textContent = results.success.length;
  document.getElementById('bulk-error-count').textContent = results.errors.length;
  document.getElementById('bulk-warning-count').textContent = results.warnings.length;

  const list = document.getElementById('bulk-result-list');
  let html = '';
  results.success.forEach(r => {
    html += `<div class="result-item success"><span class="result-icon">✅</span><div class="result-text"><strong>${escHtml(r.name)}</strong> added successfully<div class="result-row">Row ${r.row}</div></div></div>`;
  });
  results.warnings.forEach(r => {
    html += `<div class="result-item warning"><span class="result-icon">⚠️</span><div class="result-text"><strong>${escHtml(r.name)}</strong> — ${escHtml(r.msg)}<div class="result-row">Row ${r.row}</div></div></div>`;
  });
  results.errors.forEach(r => {
    html += `<div class="result-item error"><span class="result-icon">❌</span><div class="result-text"><strong>${escHtml(r.name || 'Unknown')}</strong>: ${r.errors.map(escHtml).join('; ')}<div class="result-row">Row ${r.row}</div></div></div>`;
  });
  list.innerHTML = html || '<div class="result-item"><span>No rows processed</span></div>';

  if (results.success.length > 0) {
    showToast(`${results.success.length} product(s) uploaded successfully!`, 'success');
  }
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
    return obj;
  });
}

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX === 'undefined') { reject(new Error('Excel parser not loaded. Please use CSV format.')); return; }
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const normalized = json.map(row => {
          const obj = {};
          Object.keys(row).forEach(k => obj[k.toLowerCase().replace(/[^a-z]/g, '')] = row[k]);
          return obj;
        });
        resolve(normalized);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsBinaryString(file);
  });
}

function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsText(file);
  });
}

function downloadCSVTemplate() {
  const headers = 'name,sku,category,price,stock,status,description';
  const sample = 'Sample Product,PRD-001,Electronics,999,50,Active,Sample description';
  const csv = `${headers}\n${sample}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'product_template.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('Template downloaded!', 'info');
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${escHtml(msg)}</span>
    <span class="toast-close" onclick="removeToast(this.parentElement)">✕</span>
  `;
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

// =============================================
// UTILITIES
// =============================================
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Init after DB
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('edit-product-form')?.addEventListener('submit', handleEditProduct);
  setupImageUpload('add-image-input', 'add-image-preview', 'add-image-placeholder');
  setupImageUpload('edit-image-input', 'edit-image-preview', 'edit-image-placeholder');
  setupBulkUpload();
  setupAddProductForm();
});
