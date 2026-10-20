// ============================================================
// ZARAH'S STORE â€” SECURE CATALOG & STAFF ACCESS
// Supabase Auth handles passwords. The browser never stores staff credentials.
// ============================================================

const cachedVendors = StoreStorage.read('vendors_registry', {});
Object.entries(cachedVendors || {}).forEach(([id,vendor]) => {
  if (/^[a-zA-Z0-9_-]+$/.test(id) && vendor && typeof vendor.name === 'string') VENDORS[id]=vendor;
});
window.VENDORS = VENDORS;

// Synchronously map products from cache on initial script execution
Object.keys(window.VENDORS).forEach(vendorId => {
  const key = 'vendor_products_' + vendorId;
  if (localStorage.getItem(key)) {
    const cachedProducts = StoreStorage.read(key, null);
    if (Array.isArray(cachedProducts)) PRODUCTS[vendorId] = cachedProducts.filter(p => p && /^[a-zA-Z0-9_-]+$/.test(p.id) && typeof p.name === 'string' && Number.isFinite(p.price));
  }
});

// These were legacy demo rows from the original setup script. They remain
// archived in the database for safety, but are not shown in the live catalog.
window.PROMOTIONS = [];

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
    primaryColor: /^#[0-9a-f]{6}$/i.test(v.primary_color || '') ? v.primary_color : '#8B5A2B',
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
    const [
      { data: dbVendors, error: vendorError },
      { data: dbProducts, error: productError },
      { data: dbPromotions, error: promotionError }
    ] = await Promise.all([
      window.supabaseClient.from('vendors').select('*'),
      window.supabaseClient.from('products').select('*'),
      window.supabaseClient.from('promotions').select('*')
        .order('placement_level', { ascending: false })
        .order('created_at', { ascending: false })
    ]);

    if (vendorError) throw vendorError;
    if (productError) throw productError;
    if (promotionError) console.error('Promotions could not be loaded.', promotionError);
    window.PROMOTIONS = promotionError ? [] : (dbPromotions || []);

    if (Array.isArray(dbVendors)) {
      const registry = {};
      dbVendors.forEach(v => { registry[v.id] = mapVendor(v); });
      Object.keys(VENDORS).forEach(id => delete VENDORS[id]);
      Object.keys(PRODUCTS).forEach(id => delete PRODUCTS[id]);
      Object.assign(VENDORS, registry);
      StoreStorage.write('vendors_registry', registry);
    }

    Object.keys(window.VENDORS).forEach(id => { PRODUCTS[id] = []; });
    (dbProducts || [])
      .filter(p => !LEGACY_DEMO_PRODUCT_IDS.has(p.id))
      .forEach(p => {
        if (!PRODUCTS[p.vendor]) PRODUCTS[p.vendor] = [];
        PRODUCTS[p.vendor].push(mapProduct(p));
      });

    Object.keys(window.VENDORS).forEach(id => {
      StoreStorage.write('vendor_products_' + id, PRODUCTS[id] || []);
    });

    triggerNavAndUI();
    window.dispatchEvent(new Event('db_synced'));
  } catch (error) {
    console.error('Catalog sync failed; using the local catalog cache.', error);
  }
}

function triggerNavAndUI() {
  let currentActiveVendorId = null;
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const queryVendor = urlParams.get('vendor');

  if (queryVendor && window.VENDORS[queryVendor]) {
    currentActiveVendorId = queryVendor;
  } else if (path.includes('store-perfume')) {
    currentActiveVendorId = 'perfume';
  } else if (path.includes('store-kitchen')) {
    currentActiveVendorId = 'kitchen';
  } else if (path.includes('store-variety')) {
    currentActiveVendorId = 'variety';
  }

  renderGlobalNav(currentActiveVendorId);
}

// Render subnav and mobile menu links dynamically across all pages
function renderGlobalNav(activeVendorId = null) {
  const subnav = document.getElementById('navSubLinks') || document.querySelector('.nav-sub-inner');
  const mobileLinks = document.querySelector('.mobile-menu');

  if (subnav) {
    const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    let subnavHtml = `<a href="index.html" class="nav-sub-link ${isHomepage ? 'active' : ''}">🏠 Home</a>`;

    Object.keys(window.VENDORS).forEach(id => {
      const vendor = window.VENDORS[id];
      const pageLink = vendor.page || `store.html?vendor=${id}`;
      const isActive = (id === activeVendorId) && !isHomepage;
      subnavHtml += `<a href="${escapeHTML(safeURL(pageLink))}" class="nav-sub-link ${isActive ? 'active' : ''}">${escapeHTML(vendor.logo)} ${escapeHTML(vendor.name)}</a>`;
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
        mobileHtml += `<a href="${escapeHTML(safeURL(pageLink))}" class="mobile-link">${escapeHTML(vendor.logo)} ${escapeHTML(vendor.name)}</a>`;
      });

      mobileHtml += `<a href="cart.html" class="mobile-link">🛒 Cart</a>`;
      mobileHtml += `<a href="vendor-login.html" class="mobile-link">🏪 Vendor Portal</a>`;

      const navLinksDiv = document.getElementById('mobileNavLinks');
      if (navLinksDiv) {
        let linksInner = '';
        Object.keys(window.VENDORS).forEach(id => {
          const vendor = window.VENDORS[id];
          const pageLink = vendor.page || `store.html?vendor=${id}`;
          linksInner += `<a href="${escapeHTML(safeURL(pageLink))}" class="mobile-link">${escapeHTML(vendor.logo)} ${escapeHTML(vendor.name)}</a>`;
        });
        navLinksDiv.innerHTML = linksInner;
      } else {
        mobileLinks.innerHTML = mobileHtml;
      }
    }
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

let verifiedStaff = null;
const StaffAuth = {
  getCachedSession() {
    return verifiedStaff;
  },
  async restore() {
    if (!window.supabaseClient) return null;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const staff = staffFromUser(user);
    verifiedStaff = staff;
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
    verifiedStaff = staff;
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
  async requireAuth() {
    await StaffAuth.restore();
    if (!VendorAuth.isLoggedIn()) { window.location.replace('vendor-login.html'); return false; }
    return true;
  }
};

const AdminAuth = {
  getSession() {
    const session = StaffAuth.getCachedSession();
    return session?.role === 'admin' ? session : null;
  },
  isLoggedIn() { return !!AdminAuth.getSession(); },
  logout: () => StaffAuth.logout(),
  async requireAuth() {
    await StaffAuth.restore();
    if (!AdminAuth.isLoggedIn()) { window.location.replace('vendor-login.html'); return false; }
    return true;
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

async function databaseWrite(query) {
  if (!window.supabaseClient) throw new Error('Connect to the internet before saving changes.');
  const {data,error} = await query;
  if(error) throw new Error(error.message);
  return data;
}
function productRow(p) {
  if (!p.name?.trim() || !p.category?.trim() || !Number.isFinite(Number(p.price)) || Number(p.price)<=0) throw new Error('Enter a name, category, and a price greater than zero.');
  if (p.originalPrice != null && Number(p.originalPrice)<Number(p.price)) throw new Error('Original price cannot be less than the selling price.');
  return {id:p.id,vendor:p.vendor,name:p.name.trim(),description:p.description || '',price:Number(p.price),original_price:p.originalPrice == null ? null : Number(p.originalPrice),image:p.image,in_stock:p.inStock,badge:p.badge || null,category:p.category,size:p.size || null,material:p.material || null,origin:p.origin || null,sizes:p.sizes || [],notes:p.notes || null};
}
const VendorProducts = {
  getAll:id=>[...(PRODUCTS[id] || [])],
  save(id,products) { PRODUCTS[id]=products; StoreStorage.write('vendor_products_'+id,products); },
  async add(id,product) {
    const p={...product,id:crypto.randomUUID(),vendor:id};
    await databaseWrite(window.supabaseClient.from('products').insert(productRow(p)).select('id').single());
    VendorProducts.save(id,[...VendorProducts.getAll(id),p]); return p;
  },
  async update(id,productId,updates) {
    const products=VendorProducts.getAll(id); const index=products.findIndex(p=>p.id===productId);
    if(index<0) throw new Error('Product no longer exists. Refresh the page.');
    const p={...products[index],...updates};
    await databaseWrite(window.supabaseClient.from('products').update(productRow(p)).eq('id',productId).eq('vendor',id).select('id').single());
    products[index]=p; VendorProducts.save(id,products); return true;
  },
  async delete(id,productId) {
    await databaseWrite(window.supabaseClient.from('products').delete().eq('id',productId).eq('vendor',id).select('id').single());
    VendorProducts.save(id,VendorProducts.getAll(id).filter(p=>p.id!==productId));
  },
  async resetToDefault() { await initVendorProducts(); }
};
const VendorInfo = {
  get:id=>VENDORS[id],
  async save(id,info) {
    if(!info.name?.trim()) throw new Error('Store name is required.');
    await databaseWrite(window.supabaseClient.from('vendors').update({name:info.name,tagline:info.tagline,description:info.description,logo:info.logo}).eq('id',id).select('id').single());
    Object.assign(VENDORS[id],info); StoreStorage.write('vendors_registry',VENDORS);
  }
};

const catalogReady = initVendorProducts();
