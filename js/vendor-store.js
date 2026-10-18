// ============================================================
// ZARAH'S STORE — VENDOR & PRODUCT REGISTRY (SUPABASE + LOCAL STORAGE)
// ============================================================

// Seeding local defaults if localStorage is empty
if (!localStorage.getItem('vendors_registry')) {
  StoreStorage.write('vendors_registry', VENDORS);
}

// Initialize from local cache first for instant page load
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

    const [vendorResult, productResult] = await Promise.all([
      window.supabaseClient.from('vendors').select('*'),
      window.supabaseClient.from('products').select('*')
    ]);
    const { data: dbVendors, error: errV } = vendorResult;
    if (errV) throw errV;

    // Fetch products
    const { data: dbProducts, error: errP } = productResult;
    if (errP) throw errP;

    // --- Process and Sync Vendors ---
    if (dbVendors) {
      const newVendorsRegistry = {};
      dbVendors.filter(v => /^[a-zA-Z0-9_-]+$/.test(v.id)).forEach(v => {
        newVendorsRegistry[v.id] = {
          id: v.id,
          name: v.name,
          tagline: v.tagline,
          description: v.description,
          rating: parseFloat(v.rating),
          reviewCount: parseInt(v.review_count),
          logo: v.logo,
          primaryColor: /^#[0-9a-f]{6}$/i.test(v.primary_color || '') ? v.primary_color : '#8B5A2B',
          secondaryColor: v.secondary_color,
          gradient: /^#[0-9a-f]{6}$/i.test(v.primary_color || '') ? `linear-gradient(135deg, #1A120B, ${v.primary_color})` : 'linear-gradient(135deg, #1A120B, #8B5A2B)',
          cardGradient: v.card_gradient,
          accentColor: v.accent_color,
          categories: v.categories || [],
          bannerImage: v.banner_image,
          whatsapp: v.whatsapp,
          page: v.page
        };
      });
      StoreStorage.write('vendors_registry', newVendorsRegistry);
      Object.keys(VENDORS).forEach(id => delete VENDORS[id]);
      Object.assign(VENDORS, newVendorsRegistry);
      window.VENDORS = VENDORS;
    }

    // --- Process and Sync Products ---
    if (dbProducts) {
      // Clear out current local PRODUCTS object mappings
      Object.keys(PRODUCTS).forEach(id => delete PRODUCTS[id]);
      Object.keys(VENDORS).forEach(id => PRODUCTS[id] = []);

      dbProducts.filter(p => /^[a-zA-Z0-9_-]+$/.test(p.id) && VENDORS[p.vendor]).forEach(p => {
        if (!PRODUCTS[p.vendor]) {
          PRODUCTS[p.vendor] = [];
        }
        PRODUCTS[p.vendor].push({
          id: p.id,
          vendor: p.vendor,
          name: p.name,
          description: p.description || '',
          price: parseFloat(p.price),
          originalPrice: p.original_price ? parseFloat(p.original_price) : null,
          image: p.image,
          inStock: p.in_stock,
          badge: p.badge,
          category: p.category || '',
          rating: Number(p.rating || 0), reviewCount: Number(p.review_count || 0),
          size: p.size,
          material: p.material,
          origin: p.origin,
          sizes: p.sizes || [],
          notes: p.notes || null
        });
      });

      // Save each vendor's products to localStorage cache
      Object.keys(window.VENDORS).forEach(vId => {
        StoreStorage.write('vendor_products_' + vId, PRODUCTS[vId]);
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
