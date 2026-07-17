// ---- SEED & INITIALIZE REGISTRIES ----
// Seed defaults if not present
if (!localStorage.getItem('vendors_registry')) {
  localStorage.setItem('vendors_registry', JSON.stringify(VENDORS));
}
if (!localStorage.getItem('vendor_credentials_registry')) {
  const DEFAULT_VENDOR_CREDENTIALS = {
    perfume: { email: 'vendor@aura.com',   password: 'Aura2026!',   name: "Zarah's Perfume" },
    kitchen: { email: 'vendor@hearth.com', password: 'Hearth2026!', name: "Zarah's Kitchen" },
    variety: { email: 'vendor@globe.com',  password: 'Globe2026!',  name: 'Teemerh Collection' }
  };
  localStorage.setItem('vendor_credentials_registry', JSON.stringify(DEFAULT_VENDOR_CREDENTIALS));
}
if (!localStorage.getItem('admin_credentials')) {
  localStorage.setItem('admin_credentials', JSON.stringify({
    email: 'admin@zarahsstore.com',
    password: 'AdminPassword2026!'
  }));
}

// Sync global VENDORS registry
window.VENDORS = JSON.parse(localStorage.getItem('vendors_registry'));

// ---- SEED: init localStorage from default data on first run ----
function initVendorProducts() {
  // Sync in-memory VENDORS with any localStorage info overrides
  Object.keys(VENDORS).forEach(vendorId => {
    const key = 'vendor_info_' + vendorId;
    let saved = localStorage.getItem(key);
    if (saved) {
      let info = JSON.parse(saved);
      localStorage.setItem(key, JSON.stringify(info));
      Object.assign(VENDORS[vendorId], info);
    }
  });

  // Load products dynamically based on current VENDORS list
  Object.keys(VENDORS).forEach(vendorId => {
    const key = 'vendor_products_' + vendorId;
    if (!localStorage.getItem(key)) {
      const defaultProducts = PRODUCTS[vendorId] || [];
      localStorage.setItem(key, JSON.stringify(defaultProducts));
    }
    PRODUCTS[vendorId] = JSON.parse(localStorage.getItem(key));
  });

  // Run dynamic navigation rendering across all pages on load
  setTimeout(() => {
    let currentActiveVendorId = null;
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const queryVendor = urlParams.get('vendor');
    
    if (queryVendor && VENDORS[queryVendor]) {
      currentActiveVendorId = queryVendor;
    } else if (path.includes('store-perfume.html')) {
      currentActiveVendorId = 'perfume';
    } else if (path.includes('store-kitchen.html')) {
      currentActiveVendorId = 'kitchen';
    } else if (path.includes('store-variety.html')) {
      currentActiveVendorId = 'variety';
    }
    
    renderGlobalNav(currentActiveVendorId);
  }, 50);
}

// Render subnav and mobile menu links dynamically across all pages
function renderGlobalNav(activeVendorId = null) {
  const subnav = document.getElementById('navSubLinks') || document.querySelector('.nav-sub-inner');
  const mobileLinks = document.getElementById('mobileNavLinks') || document.querySelector('.mobile-menu');
  
  if (subnav) {
    const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    let subnavHtml = `<a href="index.html" class="nav-sub-link ${isHomepage ? 'active' : ''}">🏠 Home</a>`;
    
    Object.keys(VENDORS).forEach(id => {
      const vendor = VENDORS[id];
      const pageLink = vendor.page || `store.html?vendor=${id}`;
      const isActive = (id === activeVendorId) && !isHomepage;
      subnavHtml += `<a href="${pageLink}" class="nav-sub-link ${isActive ? 'active' : ''}">${vendor.logo} ${vendor.name}</a>`;
    });
    
    subnavHtml += '<a href="vendor-login.html" class="nav-sub-link">🏪 Vendor Portal</a>';
    subnav.innerHTML = subnavHtml;
  }
  
  if (mobileLinks) {
    const isMobileMenuContainer = mobileLinks.id === 'mobileMenu' || mobileLinks.classList.contains('mobile-menu');
    if (isMobileMenuContainer) {
      let mobileHtml = `<a href="index.html" class="mobile-link">🏠 Home</a>`;
      
      Object.keys(VENDORS).forEach(id => {
        const vendor = VENDORS[id];
        const pageLink = vendor.page || `store.html?vendor=${id}`;
        mobileHtml += `<a href="${pageLink}" class="mobile-link">${vendor.logo} ${vendor.name}</a>`;
      });
      
      mobileHtml += `<a href="cart.html" class="mobile-link">🛒 Cart</a>`;
      mobileHtml += `<a href="vendor-login.html" class="mobile-link">🏪 Vendor Portal</a>`;
      
      // If mobile links element is a simple div inside, replace inner. If it is the menu container, keep children structure or replace.
      const navLinksDiv = document.getElementById('mobileNavLinks');
      if (navLinksDiv) {
        let linksInner = '';
        Object.keys(VENDORS).forEach(id => {
          const vendor = VENDORS[id];
          const pageLink = vendor.page || `store.html?vendor=${id}`;
          linksInner += `<a href="${pageLink}" class="mobile-link">${vendor.logo} ${vendor.name}</a>`;
        });
        navLinksDiv.innerHTML = linksInner;
      } else {
        mobileLinks.innerHTML = mobileHtml;
      }
    }
  }
}

// ---- VENDOR AUTH ----
const VendorAuth = {
  getSession() {
    return JSON.parse(localStorage.getItem('vendorSession') || 'null');
  },
  login(email, password) {
    const credsMap = JSON.parse(localStorage.getItem('vendor_credentials_registry') || '{}');
    
    // Check Admin Credentials
    const adminCreds = JSON.parse(localStorage.getItem('admin_credentials') || JSON.stringify({
      email: 'admin@zarahsstore.com',
      password: 'AdminPassword2026!'
    }));
    if (email.trim() === adminCreds.email && password === adminCreds.password) {
      const session = { isAdmin: true, name: 'Store Admin', email: email.trim(), loginTime: Date.now() };
      localStorage.setItem('adminSession', JSON.stringify(session));
      return { success: true, isAdmin: true, session };
    }

    // Check Vendor Credentials
    for (const [vendorId, creds] of Object.entries(credsMap)) {
      if (creds.email === email.trim() && creds.password === password) {
        const session = { vendorId, name: creds.name, email: creds.email, loginTime: Date.now() };
        localStorage.setItem('vendorSession', JSON.stringify(session));
        return { success: true, isAdmin: false, session };
      }
    }
    return { success: false, error: 'Invalid email or password.' };
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

// ---- ADMIN AUTH ----
const AdminAuth = {
  getSession() {
    return JSON.parse(localStorage.getItem('adminSession') || 'null');
  },
  isLoggedIn() {
    return !!AdminAuth.getSession();
  },
  logout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'vendor-login.html';
  },
  requireAuth() {
    if (!AdminAuth.isLoggedIn()) {
      window.location.href = 'vendor-login.html';
    }
  }
};

// ---- ADMIN VENDORS CRUD ----
const AdminVendors = {
  create(vendorId, info, email, password) {
    const vendors = JSON.parse(localStorage.getItem('vendors_registry') || '{}');
    const creds = JSON.parse(localStorage.getItem('vendor_credentials_registry') || '{}');
    
    if (vendors[vendorId]) return { success: false, error: 'Vendor ID already exists.' };
    
    // Add to VENDORS
    vendors[vendorId] = {
      id: vendorId,
      name: info.name,
      tagline: info.tagline || '',
      description: info.description || '',
      rating: 5.0,
      reviewCount: 0,
      logo: info.logo || '🏪',
      primaryColor: info.primaryColor || '#8B5A2B',
      gradient: info.gradient || 'linear-gradient(135deg, #3D1C00, #8B5A2B)',
      categories: info.categories || [],
      page: `store.html?vendor=${vendorId}`
    };
    
    // Add to CREDENTIALS
    creds[vendorId] = {
      email: email,
      password: password,
      name: info.name
    };
    
    localStorage.setItem('vendors_registry', JSON.stringify(vendors));
    localStorage.setItem('vendor_credentials_registry', JSON.stringify(creds));
    
    // Initialize empty products array in localStorage
    localStorage.setItem('vendor_products_' + vendorId, JSON.stringify([]));
    
    // Sync globals
    window.VENDORS = vendors;
    PRODUCTS[vendorId] = [];
    return { success: true };
  },
  update(vendorId, info, email, password) {
    const vendors = JSON.parse(localStorage.getItem('vendors_registry') || '{}');
    const creds = JSON.parse(localStorage.getItem('vendor_credentials_registry') || '{}');
    
    if (!vendors[vendorId]) return { success: false, error: 'Vendor does not exist.' };
    
    // Update VENDORS
    Object.assign(vendors[vendorId], info);
    if (vendorId !== 'perfume' && vendorId !== 'kitchen' && vendorId !== 'variety') {
      vendors[vendorId].page = `store.html?vendor=${vendorId}`;
    }
    
    // Update CREDENTIALS
    if (email) creds[vendorId].email = email;
    if (password) creds[vendorId].password = password;
    creds[vendorId].name = vendors[vendorId].name;
    
    localStorage.setItem('vendors_registry', JSON.stringify(vendors));
    localStorage.setItem('vendor_credentials_registry', JSON.stringify(creds));
    
    // Sync globals
    window.VENDORS = vendors;
    return { success: true };
  },
  delete(vendorId) {
    const vendors = JSON.parse(localStorage.getItem('vendors_registry') || '{}');
    const creds = JSON.parse(localStorage.getItem('vendor_credentials_registry') || '{}');
    
    if (!vendors[vendorId]) return { success: false, error: 'Vendor does not exist.' };
    
    delete vendors[vendorId];
    delete creds[vendorId];
    
    localStorage.setItem('vendors_registry', JSON.stringify(vendors));
    localStorage.setItem('vendor_credentials_registry', JSON.stringify(creds));
    
    // Remove related localStorage items
    localStorage.removeItem('vendor_products_' + vendorId);
    localStorage.removeItem('vendor_info_' + vendorId);
    
    // Sync globals
    window.VENDORS = vendors;
    delete PRODUCTS[vendorId];
    return { success: true };
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
