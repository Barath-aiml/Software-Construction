# 🛍 ShopFlow — E-Commerce Product Management Platform

## 📁 Project Structure

```
ecommerce/
├── index.html          → Main application HTML
├── css/
│   └── style.css       → All styles (dark theme, responsive)
├── js/
│   └── app.js          → Main application logic (CRUD, search, pagination, upload)
├── db/
│   └── database.js     → IndexedDB database setup & operations
└── README.md           → This file
```

## 🚀 How to Run

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
2. No server required — runs 100% in the browser using IndexedDB
3. Data persists between browser sessions automatically

## ✅ Features Implemented

### 📊 Dashboard
- Total products, active count, inventory value, category count
- Recently added products list
- Category breakdown with visual bar indicators

### 🔍 Product Search & Pagination
- Search by product name or SKU (real-time debounced)
- Filter by minimum price
- Filter by maximum price
- Filter by category
- Clear all filters button
- 10 products per page with smart pagination controls
- Pagination works with active search filters

### ➕ Add Product (CRUD)
- Full product form with validation
- Required fields: Name, SKU, Category, Price, Stock
- Image upload (files only — no URLs allowed)
- Duplicate SKU detection
- Duplicate image detection (hash-based)
- Status: Active / Inactive

### ✏️ Edit Product
- Pre-filled modal form with current product data
- Image update with duplicate detection
- SKU uniqueness check (excludes self)
- Save changes with full validation

### 👁 View Product
- Detailed product view modal
- Shows image, all fields, status badge
- Quick Edit button from view modal

### 🗑 Delete Product
- Confirmation dialog before deletion
- Shows product name in confirm prompt
- Safe, prevents accidental deletion

### 📤 Bulk Upload (CSV / Excel)
- Drag & drop or file browse
- Supports .CSV, .XLSX, .XLS formats
- **Validations:**
  - Missing required fields (name, sku, category, price, stock)
  - Blocks image URLs (http/https) — only uploaded images accepted
  - Duplicate SKU detection within batch
  - Duplicate SKU check against existing DB products
  - Invalid price/stock values
- Valid rows auto-saved to database
- Detailed results: ✅ Success / ⚠️ Skipped / ❌ Failed
- Download CSV template button

### 🗄 Database (IndexedDB)
- Persistent browser-based database
- Indexed fields: name, price, category, sku, imageHash
- Auto-seeded with 12 sample products on first run
- Full CRUD operations

## 📋 CSV Template Format

```csv
name,sku,category,price,stock,status,description
Product Name,SKU-001,Electronics,999,50,Active,Product description here
```

**Required columns:** name, sku, category, price, stock
**Optional columns:** status (default: Active), description

## 🔒 Validation Rules

| Rule | Description |
|------|-------------|
| Required Fields | name, sku, category, price, stock must not be empty |
| Unique SKU | Each product must have a unique SKU |
| Image URLs Blocked | Only file uploads accepted for images |
| No Duplicate Images | Same image cannot be used for different products |
| Price Validation | Must be a non-negative number |
| Stock Validation | Must be a non-negative integer |
| Ethical Content | Platform only accepts uploaded images (no external URLs) |

## 🎨 Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, Grid, Flexbox, Animations
- **Vanilla JavaScript** — No frameworks
- **IndexedDB** — Browser-native persistent database
- **SheetJS (XLSX)** — Excel file parsing (CDN)
- **Google Fonts** — Space Grotesk + JetBrains Mono

## 🌐 Browser Support

- Chrome 80+ ✅
- Firefox 75+ ✅
- Edge 80+ ✅
- Safari 14+ ✅
