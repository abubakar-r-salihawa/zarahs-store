// ============================================================
// ZARAH'S STORE — VENDOR & PRODUCT REGISTRY (SUPABASE + LOCAL STORAGE)
// ============================================================

// Seeding local defaults if localStorage is empty
if (!localStorage.getItem('vendors_registry')) {
  localStorage.setItem('vendors_registry', JSON.stringify(VENDORS));
}

// Seed vendor credentials fallback
if (!localStorage.getItem('vendor_credentials_registry')) {
  const DEFAULT_VENDOR_CREDENTIALS = {
    perfume: { email: 'vendor@aura.com',   password: 'Aura2026!',   name: "Zarah's Perfume" },
    kitchen: { email: 'vendor@hearth.com', password: 'Hearth2026!', name: "Zarah's Kitchen" },
    variety: { email: 'vendor@globe.com',  password: 'Globe2026!',  name: 'Teemerh Collection' }
  };
  localStorage.setItem('vendor_credentials_registry', JSON.stringify(DEFAULT_VENDOR_CREDENTIALS));
}

// Seed admin credentials fallback
if (!localStorage.getItem('admin_credentials')) {
  localStorage.setItem('admin_credentials', JSON.stringify({
    email: 'admin@zarahsstore.com',
    password: 'AdminPassword2026!'
  }));
}

// Initialize from local cache first for instant page load
window.VENDORS = JSON.parse(localStorage.getItem('vendors_registry')) || VENDORS;

// Synchronously map products from cache on initial script execution
Object.keys(window.VENDORS).forEach(vendorId => {
  const key = 'vendor_products_' + vendorId;
  if (localStorage.getItem(key)) {
    PRODUCTS[vendorId] = JSON.parse(localStorage.getItem(key));
  }
});

// Sync data from Supabase backend asynchronously on page load
async function initVendorProducts() {
  // 1. Initial local render of menu/nav for zero-latency load
  triggerNavAndUI();

  if (!window.supabaseClient) {
    console.warn("Supabase client not loaded. Running in local fallback mode.");
    return;
  }

  try {
    console.log("Syncing database tables from Supabase...");

    // Fetch vendors
    const { data: dbVendors, error: errV } = await window.supabaseClient.from('vendors').select('*');
    if (errV) throw errV;

    // Fetch vendor credentials
    const { data: dbCreds, error: errC } = await window.supabaseClient.from('vendor_credentials').select('*');
    if (errC) throw errC;

    // Fetch admin credentials
    const { data: dbAdmin, error: errA } = await window.supabaseClient.from('admin_credentials').select('*');
    if (errA) throw errA;

    // Fetch products
    const { data: dbProducts, error: errP } = await window.supabaseClient.from('products').select('*');
    if (errP) throw errP;

    // --- Process and Sync Vendors ---
    if (dbVendors && dbVendors.length > 0) {
      const newVendorsRegistry = {};
      dbVendors.forEach(v => {
        newVendorsRegistry[v.id] = {
          id: v.id,
          name: v.name,
          tagline: v.tagline,
          description: v.description,
          rating: parseFloat(v.rating),
          reviewCount: parseInt(v.review_count),
          logo: v.logo,
          primaryColor: v.primary_color,
          secondaryColor: v.secondary_color,
          gradient: v.gradient,
          cardGradient: v.card_gradient,
          accentColor: v.accent_color,
          categories: v.categories || [],
          bannerImage: v.banner_image,
          whatsapp: v.whatsapp,
          page: v.page
        };
      });
      localStorage.setItem('vendors_registry', JSON.stringify(newVendorsRegistry));
      window.VENDORS = newVendorsRegistry;
    }

    // --- Process and Sync Vendor Credentials ---
    if (dbCreds && dbCreds.length > 0) {
      const newCredsRegistry = {};
      dbCreds.forEach(c => {
        newCredsRegistry[c.vendor_id] = {
          email: c.email,
          password: c.password,
          name: c.name
        };
      });
      localStorage.setItem('vendor_credentials_registry', JSON.stringify(newCredsRegistry));
    }

    // --- Process and Sync Admin Credentials ---
    if (dbAdmin && dbAdmin.length > 0) {
      // Use the first record as the primary admin
      localStorage.setItem('admin_credentials', JSON.stringify({
        email: dbAdmin[0].email,
        password: dbAdmin[0].password
      }));
    }

    // --- Process and Sync Products ---
    if (dbProducts) {
      // Clear out current local PRODUCTS object mappings
      Object.keys(window.VENDORS).forEach(vId => {
        PRODUCTS[vId] = [];
      });

      dbProducts.forEach(p => {
        if (!PRODUCTS[p.vendor]) {
          PRODUCTS[p.vendor] = [];
        }
        PRODUCTS[p.vendor].push({
          id: p.id,
          vendor: p.vendor,
          name: p.name,
          description: p.description,
          price: parseFloat(p.price),
          originalPrice: p.original_price ? parseFloat(p.original_price) : null,
          image: p.image,
          inStock: p.in_stock,
          badge: p.badge,
          category: p.category,
          size: p.size,
          material: p.material,
          origin: p.origin,
          sizes: p.sizes || [],
          notes: p.notes || null
        });
      });

      // Save each vendor's products to localStorage cache
      Object.keys(window.VENDORS).forEach(vId => {
        localStorage.setItem('vendor_products_' + vId, JSON.stringify(PRODUCTS[vId]));
      });
    }

    console.log("Supabase sync completed successfully.");
    
    // 2. Re-trigger nav rendering and fire db_synced event for page re-renderers
    triggerNavAndUI();
    window.dispatchEvent(new Event('db_synced'));

  } catch (e) {
    console.error("Failed to sync database from Supabase, using local cache fallback:", e);
  }
}

// Render dynamic subnav and mobile menu links
function triggerNavAndUI() {
  let currentActiveVendorId = null;
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const queryVendor = urlParams.get('vendor');
  
  if (queryVendor && window.VENDORS[queryVendor]) {
    currentActiveVendorId = queryVendor;
  } else if (path.includes('store-perfume.html')) {
    currentActiveVendorId = 'perfume';
  } else if (path.includes('store-kitchen.html')) {
    currentActiveVendorId = 'kitchen';
  } else if (path.includes('store-variety.html')) {
    currentActiveVendorId = 'variety';
  }
  
  renderGlobalNav(currentActiveVendorId);
}

// Render subnav and mobile menu links dynamically across all pages
function renderGlobalNav(activeVendorId = null) {
  const subnav = document.getElementById('navSubLinks') || document.querySelector('.nav-sub-inner');
  const mobileLinks = document.getElementById('mobileNavLinks') || document.querySelector('.mobile-menu');
  
  if (subnav) {
    const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    let subnavHtml = `<a href="index.html" class="nav-sub-link ${isHomepage ? 'active' : ''}">🏠 Home</a>`;
    
    Object.keys(window.VENDORS).forEach(id => {
      const vendor = window.VENDORS[id];
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
      
      Object.keys(window.VENDORS).forEach(id => {
        const vendor = window.VENDORS[id];
        const pageLink = vendor.page || `store.html?vendor=${id}`;
        mobileHtml += `<a href="${pageLink}" class="mobile-link">${vendor.logo} ${vendor.name}</a>`;
      });
      
      mobileHtml += `<a href="cart.html" class="mobile-link">🛒 Cart</a>`;
      mobileHtml += `<a href="vendor-login.html" class="mobile-link">🏪 Vendor Portal</a>`;
      
      const navLinksDiv = document.getElementById('mobileNavLinks');
      if (navLinksDiv) {
        let linksInner = '';
        Object.keys(window.VENDORS).forEach(id => {
          const vendor = window.VENDORS[id];
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
  },
  async updateCredentials(email, password) {
    // 1. Write to LocalStorage first
    localStorage.setItem('admin_credentials', JSON.stringify({ email, password }));

    // 2. Write to Supabase backend asynchronously
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from('admin_credentials')
          .upsert({ email, password });
        if (error) throw error;
        console.log("Admin credentials updated in Supabase.");
      } catch (err) {
        console.error("Failed to update admin credentials in Supabase:", err);
      }
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
    const newVendor = {
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
      bannerImage: info.bannerImage || 'https://picsum.photos/seed/zarah-perfume/1400/500',
      whatsapp: info.whatsapp || null,
      page: `store.html?vendor=${vendorId}`
    };
    
    vendors[vendorId] = newVendor;
    
    // Add to CREDENTIALS
    creds[vendorId] = {
      email: email,
      password: password,
      name: info.name
    };
    
    localStorage.setItem('vendors_registry', JSON.stringify(vendors));
    localStorage.setItem('vendor_credentials_registry', JSON.stringify(creds));
    localStorage.setItem('vendor_products_' + vendorId, JSON.stringify([]));
    
    // Sync globals
    window.VENDORS = vendors;
    PRODUCTS[vendorId] = [];

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          // Insert vendor info
          const { error: errV } = await window.supabaseClient.from('vendors').insert({
            id: vendorId,
            name: newVendor.name,
            tagline: newVendor.tagline,
            description: newVendor.description,
            rating: newVendor.rating,
            review_count: newVendor.reviewCount,
            logo: newVendor.logo,
            primary_color: newVendor.primaryColor,
            gradient: newVendor.gradient,
            categories: newVendor.categories,
            banner_image: newVendor.bannerImage,
            whatsapp: newVendor.whatsapp,
            page: newVendor.page
          });
          if (errV) throw errV;

          // Insert credentials info
          const { error: errC } = await window.supabaseClient.from('vendor_credentials').insert({
            vendor_id: vendorId,
            email: email,
            password: password,
            name: newVendor.name
          });
          if (errC) throw errC;

          console.log("Created vendor in Supabase:", vendorId);
        } catch (e) {
          console.error("Error creating vendor in Supabase:", e);
        }
      })();
    }
    
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

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const v = vendors[vendorId];
          const { error: errV } = await window.supabaseClient.from('vendors').update({
            name: v.name,
            tagline: v.tagline,
            description: v.description,
            logo: v.logo,
            primary_color: v.primaryColor,
            gradient: v.gradient,
            whatsapp: v.whatsapp
          }).eq('id', vendorId);
          if (errV) throw errV;

          const credUpdate = { name: v.name };
          if (email) credUpdate.email = email;
          if (password) credUpdate.password = password;

          const { error: errC } = await window.supabaseClient.from('vendor_credentials').update(credUpdate).eq('vendor_id', vendorId);
          if (errC) throw errC;

          console.log("Updated vendor in Supabase:", vendorId);
        } catch (e) {
          console.error("Error updating vendor in Supabase:", e);
        }
      })();
    }
    
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

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const { error } = await window.supabaseClient.from('vendors').delete().eq('id', vendorId);
          if (error) throw error;
          console.log("Deleted vendor from Supabase:", vendorId);
        } catch (e) {
          console.error("Error deleting vendor from Supabase:", e);
        }
      })();
    }
    
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

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const { error } = await window.supabaseClient.from('products').insert({
            id: newProduct.id,
            vendor: vendorId,
            name: newProduct.name,
            description: newProduct.description,
            price: newProduct.price,
            original_price: newProduct.originalPrice,
            image: newProduct.image,
            in_stock: newProduct.inStock,
            badge: newProduct.badge,
            category: newProduct.category,
            size: newProduct.size,
            material: newProduct.material,
            origin: newProduct.origin,
            sizes: newProduct.sizes,
            notes: newProduct.notes
          });
          if (error) throw error;
          console.log("Added product to Supabase:", newProduct.id);
        } catch (e) {
          console.error("Error adding product to Supabase:", e);
        }
      })();
    }

    return newProduct;
  },
  update(vendorId, productId, updates) {
    const products = VendorProducts.getAll(vendorId);
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return false;
    
    const updatedProduct = {
      ...products[idx],
      ...updates,
      price: parseFloat(updates.price || products[idx].price),
      originalPrice: updates.originalPrice ? parseFloat(updates.originalPrice) : null,
    };
    
    products[idx] = updatedProduct;
    VendorProducts.save(vendorId, products);

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const { error } = await window.supabaseClient.from('products').update({
            name: updatedProduct.name,
            description: updatedProduct.description,
            price: updatedProduct.price,
            original_price: updatedProduct.originalPrice,
            image: updatedProduct.image,
            in_stock: updatedProduct.inStock,
            badge: updatedProduct.badge,
            category: updatedProduct.category,
            size: updatedProduct.size,
            material: updatedProduct.material,
            origin: updatedProduct.origin,
            sizes: updatedProduct.sizes,
            notes: updatedProduct.notes
          }).eq('id', productId);
          if (error) throw error;
          console.log("Updated product in Supabase:", productId);
        } catch (e) {
          console.error("Error updating product in Supabase:", e);
        }
      })();
    }

    return true;
  },
  delete(vendorId, productId) {
    const products = VendorProducts.getAll(vendorId).filter(p => p.id !== productId);
    VendorProducts.save(vendorId, products);

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const { error } = await window.supabaseClient.from('products').delete().eq('id', productId);
          if (error) throw error;
          console.log("Deleted product from Supabase:", productId);
        } catch (e) {
          console.error("Error deleting product from Supabase:", e);
        }
      })();
    }
  },
  resetToDefault(vendorId) {
    // Resetting DB back to defaults requires a full reload or db seed execution
    if (confirm("Resetting products will reload default entries from local configuration. Confirm reset?")) {
      const key = 'vendor_products_' + vendorId;
      localStorage.removeItem(key);
      window.location.reload();
    }
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
    Object.assign(window.VENDORS[vendorId], info);

    // Async write to Supabase
    if (window.supabaseClient) {
      (async () => {
        try {
          const { error } = await window.supabaseClient.from('vendors').update({
            name: info.name,
            tagline: info.tagline,
            description: info.description,
            logo: info.logo,
            primary_color: info.primaryColor,
            gradient: info.gradient,
            whatsapp: info.whatsapp
          }).eq('id', vendorId);
          if (error) throw error;
          console.log("Updated vendor info in Supabase:", vendorId);
        } catch (e) {
          console.error("Error updating vendor info in Supabase:", e);
        }
      })();
    }
  }
};
