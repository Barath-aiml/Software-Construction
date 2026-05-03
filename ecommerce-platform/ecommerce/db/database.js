// =============================================
// DATABASE.JS - IndexedDB Setup & Operations
// =============================================

const DB_NAME = 'EcommerceDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

let db = null;

// Initialize Database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('price', 'price', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('sku', 'sku', { unique: true });
        store.createIndex('imageHash', 'imageHash', { unique: false });
        console.log('✅ Database store created');
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('✅ Database connected');
      seedSampleData();
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('❌ Database error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Seed sample products
function seedSampleData() {
  getAllProducts().then(products => {
    if (products.length === 0) {
      const samples = [
        { name: 'Wireless Bluetooth Headphones', price: 2999, category: 'Electronics', sku: 'ELEC-001', stock: 50, description: 'Premium sound quality wireless headphones', status: 'Active', imageHash: 'hash001', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Organic Cotton T-Shirt', price: 599, category: 'Clothing', sku: 'CLTH-001', stock: 120, description: 'Comfortable 100% organic cotton tee', status: 'Active', imageHash: 'hash002', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Stainless Steel Water Bottle', price: 899, category: 'Kitchen', sku: 'KTCH-001', stock: 80, description: 'BPA-free insulated water bottle 750ml', status: 'Active', imageHash: 'hash003', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Yoga Mat Premium', price: 1499, category: 'Sports', sku: 'SPRT-001', stock: 35, description: 'Non-slip premium quality yoga mat', status: 'Active', imageHash: 'hash004', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Leather Wallet', price: 1299, category: 'Accessories', sku: 'ACCM-001', stock: 60, description: 'Genuine leather slim bifold wallet', status: 'Active', imageHash: 'hash005', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Mechanical Keyboard', price: 4999, category: 'Electronics', sku: 'ELEC-002', stock: 25, description: 'RGB mechanical gaming keyboard', status: 'Active', imageHash: 'hash006', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Running Shoes Pro', price: 3499, category: 'Sports', sku: 'SPRT-002', stock: 45, description: 'Lightweight professional running shoes', status: 'Active', imageHash: 'hash007', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Ceramic Coffee Mug', price: 349, category: 'Kitchen', sku: 'KTCH-002', stock: 200, description: 'Hand-crafted ceramic mug 300ml', status: 'Active', imageHash: 'hash008', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Denim Jacket Classic', price: 2199, category: 'Clothing', sku: 'CLTH-002', stock: 30, description: 'Classic blue denim jacket unisex', status: 'Active', imageHash: 'hash009', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Sunglasses UV400', price: 799, category: 'Accessories', sku: 'ACCM-002', stock: 90, description: 'Full UV400 protection polarized lens', status: 'Active', imageHash: 'hash010', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Portable Power Bank', price: 1899, category: 'Electronics', sku: 'ELEC-003', stock: 70, description: '20000mAh fast charging power bank', status: 'Active', imageHash: 'hash011', imageData: null, createdAt: new Date().toISOString() },
        { name: 'Bamboo Cutting Board', price: 699, category: 'Kitchen', sku: 'KTCH-003', stock: 55, description: 'Eco-friendly bamboo cutting board large', status: 'Inactive', imageHash: 'hash012', imageData: null, createdAt: new Date().toISOString() },
      ];
      samples.forEach(p => addProduct(p));
    }
  });
}

// =============================================
// CRUD OPERATIONS
// =============================================

function addProduct(product) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(product);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllProducts() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getProductById(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function updateProduct(product) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(product);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteProduct(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

function checkDuplicateSKU(sku, excludeId = null) {
  return getAllProducts().then(products => {
    return products.some(p => p.sku === sku && p.id !== excludeId);
  });
}

function checkDuplicateImageHash(hash, excludeId = null) {
  return getAllProducts().then(products => {
    return products.some(p => p.imageHash === hash && p.id !== excludeId);
  });
}

// Search & Filter
function searchProducts(query, priceMin, priceMax, category) {
  return getAllProducts().then(products => {
    return products.filter(p => {
      const matchName = !query || p.name.toLowerCase().includes(query.toLowerCase());
      const matchPrice = (!priceMin || p.price >= parseFloat(priceMin)) &&
                         (!priceMax || p.price <= parseFloat(priceMax));
      const matchCat = !category || p.category === category;
      return matchName && matchPrice && matchCat;
    });
  });
}

// Generate simple hash from string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Export for global access
window.DB = { initDB, addProduct, getAllProducts, getProductById, updateProduct, deleteProduct, searchProducts, checkDuplicateSKU, checkDuplicateImageHash, simpleHash };
