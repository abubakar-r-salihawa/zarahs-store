// ============================================================
// VENDOR STORE — Vendor Auth, Product CRUD, Data Init
// ============================================================

// ---- VENDOR CREDENTIALS ----
const VENDOR_CREDENTIALS = {
  perfume: { email: 'vendor@aura.com',   password: 'Aura2026!',   name: "Zarah's Perfume" },
  kitchen: { email: 'vendor@hearth.com', password: 'Hearth2026!', name: "Zarah's Kitchen" },
  variety: { email: 'vendor@globe.com',  password: 'Globe2026!',  name: 'Teemerh Collection' }
};

// ---- SEED: init localStorage from default data on first run ----
function initVendorProducts() {
  Object.keys(PRODUCTS).forEach(vendorId => {
    const key = 'vendor_products_' + vendorId;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(PRODUCTS[vendorId]));
    }
    // Override in-memory PRODUCTS with localStorage (vendor-editable) data
    PRODUCTS[vendorId] = JSON.parse(localStorage.getItem(key));
  });
  // Also load vendor store info overrides
  Object.keys(VENDORS).forEach(vendorId => {
    const key = 'vendor_info_' + vendorId;
    let saved = localStorage.getItem(key);
    if (saved) {
      let info = JSON.parse(saved);
      if (info.name === 'Hearth & Style') info.name = "Zarah's Kitchen";
      if (info.name === 'Globe Bazaar') info.name = "Teemerh Collection";
      localStorage.setItem(key, JSON.stringify(info));
      Object.assign(VENDORS[vendorId], info);
    }
  });
}

// ---- VENDOR AUTH ----
const VendorAuth = {
  getSession() {
    return JSON.parse(localStorage.getItem('vendorSession') || 'null');
  },
  login(email, password) {
    for (const [vendorId, creds] of Object.entries(VENDOR_CREDENTIALS)) {
      if (creds.email === email.trim() && creds.password === password) {
        const session = { vendorId, name: creds.name, email: creds.email, loginTime: Date.now() };
        localStorage.setItem('vendorSession', JSON.stringify(session));
        return { success: true, session };
      }
    }
    return { success: false, error: 'Invalid vendor email or password.' };
  },
  logout() {
    localStorage.removeItem('vendorSession');
    window.location.href = 'vendor-login.html';
  },
  isLoggedIn() {
    return !!VendorAuth.getSession();
  },
  requireAuth() {
    if (!VendorAuth.isLoggedIn()) {
      window.location.href = 'vendor-login.html';
    }
  }
};

// ---- VENDOR PRODUCTS CRUD ----
const VendorProducts = {
  getAll(vendorId) {
    const key = 'vendor_products_' + vendorId;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
  save(vendorId, products) {
    const key = 'vendor_products_' + vendorId;
    localStorage.setItem(key, JSON.stringify(products));
    PRODUCTS[vendorId] = products; // update in-memory too
  },
  add(vendorId, product) {
    const products = VendorProducts.getAll(vendorId);
    const newProduct = {
      id: vendorId[0] + Date.now(),
      vendor: vendorId,
      badge: product.badge || null,
      inStock: true,
      reviewCount: 0,
      rating: 5.0,
      ...product,
      price: parseFloat(product.price),
      originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
    };
    products.push(newProduct);
    VendorProducts.save(vendorId, products);
    return newProduct;
  },
  update(vendorId, productId, updates) {
    const products = VendorProducts.getAll(vendorId);
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return false;
    products[idx] = {
      ...products[idx],
      ...updates,
      price: parseFloat(updates.price || products[idx].price),
      originalPrice: updates.originalPrice ? parseFloat(updates.originalPrice) : null,
    };
    VendorProducts.save(vendorId, products);
    return true;
  },
  delete(vendorId, productId) {
    const products = VendorProducts.getAll(vendorId).filter(p => p.id !== productId);
    VendorProducts.save(vendorId, products);
  },
  resetToDefault(vendorId) {
    const key = 'vendor_products_' + vendorId;
    const defaultData = {
      perfume: [...PRODUCTS.perfume],
      kitchen: [...PRODUCTS.kitchen],
      variety: [...PRODUCTS.variety]
    };
    localStorage.removeItem(key);
    localStorage.removeItem('vendor_products_' + vendorId);
    window.location.reload();
  }
};

// ---- VENDOR STORE INFO CRUD ----
const VendorInfo = {
  get(vendorId) {
    const key = 'vendor_info_' + vendorId;
    return JSON.parse(localStorage.getItem(key) || 'null');
  },
  save(vendorId, info) {
    const key = 'vendor_info_' + vendorId;
    localStorage.setItem(key, JSON.stringify(info));
    Object.assign(VENDORS[vendorId], info);
  }
};
