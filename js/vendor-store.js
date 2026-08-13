// ============================================================
// ZARAH'S STORE â€” SECURE CATALOG & STAFF ACCESS
// Supabase Auth handles passwords. The browser never stores staff credentials.
// ============================================================

localStorage.removeItem('vendor_credentials_registry');
localStorage.removeItem('admin_credentials');

if (!localStorage.getItem('vendors_registry')) {
  localStorage.setItem('vendors_registry', JSON.stringify(VENDORS));
}

window.VENDORS = JSON.parse(localStorage.getItem('vendors_registry')) || VENDORS;

Object.keys(window.VENDORS).forEach(vendorId => {
  const cached = localStorage.getItem('vendor_products_' + vendorId);
  if (cached) PRODUCTS[vendorId] = JSON.parse(cached);
});

// These were legacy demo rows from the original setup script. They remain
// archived in the database for safety, but are not shown in the live catalog.
const LEGACY_DEMO_PRODUCT_IDS = new Set([
  'perfume-1', 'perfume-2', 'perfume-3', 'perfume-4', 'perfume-5', 'perfume-6',
  'kitchen-1', 'kitchen-2', 'kitchen-3', 'kitchen-4', 'kitchen-5',
  'variety-1', 'variety-2', 'variety-3', 'variety-4', 'variety-5'
]);

function mapVendor(v) {
  return {
    id: v.id,
    name: v.name,
    tagline: v.tagline,
    description: v.description,
    rating: Number(v.rating || 5),
    reviewCount: Number(v.review_count || 0),
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
}

function mapProduct(p) {
  return {
    id: p.id,
    vendor: p.vendor,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    originalPrice: p.original_price == null ? null : Number(p.original_price),
    image: p.image,
    inStock: p.in_stock,
    badge: p.badge,
    category: p.category,
    size: p.size,
    material: p.material,
    origin: p.origin,
    sizes: p.sizes || [],
    notes: p.notes || null,
    rating: Number(p.rating || 5),
    reviewCount: Number(p.review_count || 0)
  };
}

async function initVendorProducts() {
  triggerNavAndUI();
  if (!window.supabaseClient) return;

  try {
    const [{ data: dbVendors, error: vendorError }, { data: dbProducts, error: productError }] =
      await Promise.all([
        window.supabaseClient.from('vendors').select('*'),
        window.supabaseClient.from('products').select('*')
      ]);

    if (vendorError) throw vendorError;
    if (productError) throw productError;

    if (dbVendors && dbVendors.length) {
      const registry = {};
      dbVendors.forEach(v => { registry[v.id] = mapVendor(v); });
      window.VENDORS = registry;
      localStorage.setItem('vendors_registry', JSON.stringify(registry));
    }

    Object.keys(window.VENDORS).forEach(id => { PRODUCTS[id] = []; });
    (dbProducts || [])
      .filter(p => !LEGACY_DEMO_PRODUCT_IDS.has(p.id))
      .forEach(p => {
        if (!PRODUCTS[p.vendor]) PRODUCTS[p.vendor] = [];
        PRODUCTS[p.vendor].push(mapProduct(p));
      });

    Object.keys(window.VENDORS).forEach(id => {
      localStorage.setItem('vendor_products_' + id, JSON.stringify(PRODUCTS[id] || []));
    });

    triggerNavAndUI();
    window.dispatchEvent(new Event('db_synced'));
  } catch (error) {
    console.error('Catalog sync failed; using the local catalog cache.', error);
  }
}

function triggerNavAndUI() {
  const path = window.location.pathname;
  const queryVendor = new URLSearchParams(window.location.search).get('vendor');
  let activeVendorId = queryVendor && window.VENDORS[queryVendor] ? queryVendor : null;
  if (!activeVendorId && path.includes('store-perfume.html')) activeVendorId = 'perfume';
  if (!activeVendorId && path.includes('store-kitchen.html')) activeVendorId = 'kitchen';
  if (!activeVendorId && path.includes('store-variety.html')) activeVendorId = 'variety';
  renderGlobalNav(activeVendorId);
}

function renderGlobalNav(activeVendorId = null) {
  const subnav = document.getElementById('navSubLinks') || document.querySelector('.nav-sub-inner');
  const mobileLinks = document.getElementById('mobileNavLinks');
  const isHomepage = window.location.pathname === '/' ||
    window.location.pathname.endsWith('/') ||
    window.location.pathname.includes('index.html');

  if (subnav) {
    let html = `<a href="index.html" class="nav-sub-link ${isHomepage ? 'active' : ''}">ðŸ  Home</a>`;
    Object.values(window.VENDORS).forEach(vendor => {
      const link = vendor.page || `store.html?vendor=${vendor.id}`;
      const active = vendor.id === activeVendorId && !isHomepage ? 'active' : '';
      html += `<a href="${link}" class="nav-sub-link ${active}">${vendor.logo} ${vendor.name}</a>`;
    });
    html += '<a href="vendor-login.html" class="nav-sub-link">ðŸª Staff Portal</a>';
    subnav.innerHTML = html;
  }

  if (mobileLinks) {
    mobileLinks.innerHTML = Object.values(window.VENDORS).map(vendor => {
      const link = vendor.page || `store.html?vendor=${vendor.id}`;
      return `<a href="${link}" class="mobile-link">${vendor.logo} ${vendor.name}</a>`;
    }).join('');
  }
}

function staffFromUser(user) {
  const role = user?.app_metadata?.role;
  if (role !== 'admin' && role !== 'vendor') return null;
  return {
    userId: user.id,
    role,
    isAdmin: role === 'admin',
    vendorId: user.app_metadata.vendor_id || null,
    name: user.user_metadata?.display_name || user.user_metadata?.name || user.email,
    email: user.email,
    loginTime: Date.now()
  };
}

const StaffAuth = {
  getCachedSession() {
    return JSON.parse(localStorage.getItem('staffSession') || 'null');
  },
  async restore() {
    if (!window.supabaseClient) return null;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const staff = staffFromUser(user);
    if (staff) localStorage.setItem('staffSession', JSON.stringify(staff));
    else localStorage.removeItem('staffSession');
    return staff;
  },
  async login(email, password) {
    if (!window.supabaseClient) return { success: false, error: 'Secure sign-in is unavailable.' };
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) return { success: false, error: error.message };
    const staff = staffFromUser(data.user);
    if (!staff) {
      await window.supabaseClient.auth.signOut();
      return { success: false, error: 'This account does not have staff access.' };
    }
    localStorage.setItem('staffSession', JSON.stringify(staff));
    return { success: true, isAdmin: staff.isAdmin, session: staff };
  },
  async loginWithGoogle() {
    if (!window.supabaseClient) return { success: false, error: 'Secure sign-in is unavailable.' };
    sessionStorage.setItem('staffOAuthPending', '1');
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/vendor-login.html' }
    });
    return error ? { success: false, error: error.message } : { success: true };
  },
  async logout() {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    localStorage.removeItem('staffSession');
    window.location.href = 'vendor-login.html';
  }
};

const VendorAuth = {
  getSession() {
    const session = StaffAuth.getCachedSession();
    return session?.role === 'vendor' ? session : null;
  },
  login: (email, password) => StaffAuth.login(email, password),
  logout: () => StaffAuth.logout(),
  isLoggedIn() { return !!VendorAuth.getSession(); },
  requireAuth() {
    if (!VendorAuth.isLoggedIn()) window.location.href = 'vendor-login.html';
  }
};

const AdminAuth = {
  getSession() {
    const session = StaffAuth.getCachedSession();
    return session?.role === 'admin' ? session : null;
  },
  isLoggedIn() { return !!AdminAuth.getSession(); },
  logout: () => StaffAuth.logout(),
  requireAuth() {
    if (!AdminAuth.isLoggedIn()) window.location.href = 'vendor-login.html';
  }
};

function vendorPayload(vendorId, info) {
  return {
    id: vendorId,
    name: info.name,
    tagline: info.tagline || '',
    description: info.description || '',
    rating: Number(info.rating || 5),
    review_count: Number(info.reviewCount || 0),
    logo: info.logo || 'ðŸª',
    primary_color: info.primaryColor || '#8B5A2B',
    secondary_color: info.secondaryColor || null,
    gradient: info.gradient || `linear-gradient(135deg, #090909, ${info.primaryColor || '#8B5A2B'})`,
    card_gradient: info.cardGradient || null,
    accent_color: info.accentColor || null,
    categories: info.categories || [],
    banner_image: info.bannerImage || 'https://picsum.photos/seed/zarah-store/1400/500',
    whatsapp: info.whatsapp || null,
    page: info.page || `store.html?vendor=${vendorId}`
  };
}

const AdminVendors = {
  async call(action, payload = {}) {
    if (!window.supabaseClient) return { success: false, error: 'Vendor management is unavailable.' };

    const { data, error } = await window.supabaseClient.functions.invoke('manage-vendor-access', {
      body: { action, payload }
    });

    if (error) {
      let message = error.message || 'Vendor details could not be saved.';
      try {
        const responseBody = await error.context?.json();
        message = responseBody?.error || message;
      } catch (_) {
        // The Supabase client already provided the safest available message.
      }
      return { success: false, error: message };
    }

    return { success: true, data: data?.data ?? data };
  },

  async listAccess() {
    return this.call('list');
  },

  async create(vendorId, info, email, whatsapp) {
    const result = await this.call('upsert', {
      ...info,
      id: vendorId,
      email,
      whatsapp
    });
    if (!result.success) return result;
    await initVendorProducts();
    return result;
  },

  async update(vendorId, info, email, whatsapp) {
    const current = window.VENDORS[vendorId] || {};
    const result = await this.call('upsert', {
      ...current,
      ...info,
      id: vendorId,
      email,
      whatsapp
    });
    if (!result.success) return result;
    await initVendorProducts();
    return result;
  },

  async delete(vendorId) {
    const result = await this.call('delete', { id: vendorId });
    if (!result.success) return result;
    await initVendorProducts();
    localStorage.removeItem('vendor_products_' + vendorId);
    return result;
  }
};

function productPayload(vendorId, product) {
  return {
    id: product.id,
    vendor: vendorId,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    original_price: product.originalPrice == null ? null : Number(product.originalPrice),
    image: product.image,
    in_stock: product.inStock !== false,
    badge: product.badge || null,
    category: product.category,
    size: product.size || null,
    material: product.material || null,
    origin: product.origin || null,
    sizes: product.sizes || [],
    notes: product.notes || null
  };
}

const VendorProducts = {
  getAll(vendorId) {
    return JSON.parse(localStorage.getItem('vendor_products_' + vendorId) || '[]');
  },
  save(vendorId, products) {
    localStorage.setItem('vendor_products_' + vendorId, JSON.stringify(products));
    PRODUCTS[vendorId] = products;
  },
  add(vendorId, product) {
    const products = VendorProducts.getAll(vendorId);
    const item = {
      id: vendorId[0] + Date.now(),
      vendor: vendorId,
      inStock: true,
      rating: 5,
      reviewCount: 0,
      ...product
    };
    products.push(item);
    VendorProducts.save(vendorId, products);
    if (window.supabaseClient) {
      window.supabaseClient.from('products').insert(productPayload(vendorId, item))
        .then(({ error }) => {
          if (error) {
            VendorProducts.save(vendorId, products.filter(p => p.id !== item.id));
            alert('The product could not be saved: ' + error.message);
          }
        });
    }
    return item;
  },
  update(vendorId, productId, updates) {
    const products = VendorProducts.getAll(vendorId);
    const index = products.findIndex(p => p.id === productId);
    if (index < 0) return false;
    const previous = products[index];
    const updated = { ...previous, ...updates };
    products[index] = updated;
    VendorProducts.save(vendorId, products);
    if (window.supabaseClient) {
      const payload = productPayload(vendorId, updated);
      delete payload.id;
      delete payload.vendor;
      window.supabaseClient.from('products').update(payload).eq('id', productId)
        .then(({ error }) => {
          if (error) {
            products[index] = previous;
            VendorProducts.save(vendorId, products);
            alert('The product could not be updated: ' + error.message);
          }
        });
    }
    return true;
  },
  delete(vendorId, productId) {
    const previous = VendorProducts.getAll(vendorId);
    VendorProducts.save(vendorId, previous.filter(p => p.id !== productId));
    if (window.supabaseClient) {
      window.supabaseClient.from('products').delete().eq('id', productId)
        .then(({ error }) => {
          if (error) {
            VendorProducts.save(vendorId, previous);
            alert('The product could not be deleted: ' + error.message);
          }
        });
    }
  }
};

const VendorInfo = {
  get(vendorId) {
    return JSON.parse(localStorage.getItem('vendor_info_' + vendorId) || 'null');
  },
  save(vendorId, info) {
    localStorage.setItem('vendor_info_' + vendorId, JSON.stringify(info));
    Object.assign(window.VENDORS[vendorId], info);
    if (window.supabaseClient) {
      const update = {
        name: info.name,
        tagline: info.tagline,
        description: info.description,
        logo: info.logo
      };
      window.supabaseClient.from('vendors').update(update).eq('id', vendorId)
        .then(({ error }) => {
          if (error) alert('Store settings could not be saved: ' + error.message);
        });
    }
  }
};

initVendorProducts();

