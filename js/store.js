// ============================================================
// MULTI-VENDOR SHOP — State Management (Cart, Auth, UI)
// ============================================================

// ---- CART STORE ----
const Cart = {
  getItems() {
    const items = StoreStorage.read('cart', []);
    return Array.isArray(items) ? items.filter(i => i && typeof i.id === 'string' && Number.isFinite(i.price) && i.price >= 0 && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 99).map(i => {
      const selectedSize=i.selectedSize || i.sizes?.[0] || i.size || null;
      return {...i,selectedSize,cartKey:i.cartKey || i.id+(selectedSize ? ':'+encodeURIComponent(selectedSize) : '')};
    }) : [];
  },
  saveItems(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    Cart.updateUI();
  },
  addItem(product, qty = 1) {
    const items = Cart.getItems();
    if (!product?.inStock || !Number.isInteger(qty) || qty < 1 || qty > 99) return false;
    const selectedSize = product.selectedSize || product.sizes?.[0] || product.size || null;
    const cartKey = product.id + (selectedSize ? ':' + encodeURIComponent(selectedSize) : '');
    const existing = items.find(i => i.cartKey === cartKey);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      items.push({ ...product, selectedSize, cartKey, qty });
    }
    Cart.saveItems(items);
    Cart.showNotification(product.name);
  },
  removeItem(productId) {
    const items = Cart.getItems().filter(i => i.cartKey !== productId);
    Cart.saveItems(items);
  },
  updateQty(productId, qty) {
    if (!Number.isInteger(qty) || qty > 99) return;
    if (qty <= 0) { Cart.removeItem(productId); return; }
    const items = Cart.getItems();
    const item = items.find(i => i.cartKey === productId);
    if (item) item.qty = qty;
    Cart.saveItems(items);
  },
  clearCart() {
    localStorage.removeItem('cart');
    Cart.updateUI();
  },
  getCount() {
    return Cart.getItems().reduce((sum, i) => sum + i.qty, 0);
  },
  getTotal() {
    return Cart.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },
  updateUI() {
    const count = Cart.getCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },
  showNotification(name) {
    const existing = document.getElementById('cart-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    toast.innerHTML = `<span class="toast-icon">🛒</span><span>Added to cart: <strong>${escapeHTML(name)}</strong></span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
  }
};

localStorage.removeItem('user');
localStorage.removeItem('users');
// ---- AUTH STORE ----
const Auth = {
  getUser() {
    return StoreStorage.read('user', null);
  },
  normalizePhone(value) {
    const input = String(value || '').trim();
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) digits = '234' + digits.slice(1);
    if (digits.startsWith('234') && digits.length === 13) return '+' + digits;
    if (input.startsWith('+') && digits.length >= 8 && digits.length <= 15) return '+' + digits;
    return null;
  },
  async register(name, email, password, phone) {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      const normalizedPhone = Auth.normalizePhone(phone);
      if (!normalizedPhone) return { success: false, error: 'Enter a valid phone number.' };
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: name.trim(),
            phone_number: normalizedPhone
          }
        }
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async login(email, password) {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async loginWithOTP(email) {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      const { error } = await window.supabaseClient.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async verifyOTP(email, token, type = 'email') {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      const { data, error } = await window.supabaseClient.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: type
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async loginWithGoogle() {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      if (window.StoreMobile?.native) {
        await window.StoreMobile.signInWithGoogle('auth.html');
        return { success: true };
      }
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth.html'
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  async logout() {
    if (window.supabaseClient) {
      await window.supabaseClient.auth.signOut();
    }
    localStorage.removeItem('user');
    Auth.updateUI();
    window.location.href = 'index.html';
  },
  isLoggedIn() {
    return !!Auth.getUser();
  },
  updateUI() {
    const user = Auth.getUser();
    document.querySelectorAll('.auth-logged-in').forEach(el => {
      el.style.display = user ? 'flex' : 'none';
      if (user && !el.querySelector('[data-my-orders-link]')) {
        const ordersLink = document.createElement('a');
        ordersLink.href = 'my-orders.html';
        ordersLink.className = 'nav-btn';
        ordersLink.dataset.myOrdersLink = 'true';
        ordersLink.textContent = 'My Orders';
        ordersLink.style.fontSize = '0.75rem';
        const logoutButton = el.querySelector('button');
        el.insertBefore(ordersLink, logoutButton || null);
      }
    });
    document.querySelectorAll('.mobile-menu').forEach(menu => {
      if (user && !menu.querySelector('[data-my-orders-link]')) {
        const ordersLink = document.createElement('a');
        ordersLink.href = 'my-orders.html';
        ordersLink.className = 'mobile-link';
        ordersLink.dataset.myOrdersLink = 'true';
        ordersLink.textContent = '📦 My Orders';
        menu.appendChild(ordersLink);
      }
    });
    document.querySelectorAll('.auth-logged-out').forEach(el => el.style.display = user ? 'none' : 'flex');
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user ? user.name.split(' ')[0] : '');
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = user ? user.avatar : '');
  }
};

// Listen to Supabase Auth state changes to keep local shopper cache synced
if (window.supabaseClient) {
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Supabase Auth Event:", event);
    if (session && session.user) {
      const metadata = session.user.user_metadata || {};
      const accountIdentifier = session.user.email || session.user.phone || 'Shopper';
      const displayName = metadata.display_name || metadata.name || accountIdentifier.split('@')[0];
      const user = {
        id: session.user.id,
        name: displayName,
        email: session.user.email || '',
        phone: metadata.phone_number || session.user.phone || '',
        avatar: displayName[0].toUpperCase(),
        joinDate: session.user.created_at
      };
      localStorage.setItem('user', JSON.stringify(user));
    } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
      localStorage.removeItem('user');
    }
    Auth.updateUI();
  });
}

// ---- WISHLIST ----
const Wishlist = {
  getItems() { const value=StoreStorage.read('wishlist',[]); return Array.isArray(value) ? value : []; },
  toggle(productId) {
    let items = Wishlist.getItems();
    if (items.includes(productId)) {
      items = items.filter(i => i !== productId);
    } else {
      items.push(productId);
    }
    localStorage.setItem('wishlist', JSON.stringify(items));
    Wishlist.updateUI();
    return items.includes(productId);
  },
  has(productId) { return Wishlist.getItems().includes(productId); },
  updateUI() {
    document.querySelectorAll('[data-wish-id]').forEach(btn => {
      const id = btn.dataset.wishId;
      btn.classList.toggle('active', Wishlist.has(id));
      btn.setAttribute('aria-pressed',String(Wishlist.has(id)));
    });
  }
};

// ---- RENDER HELPERS ----
function renderStars(rating, size = 16) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += `<span class="star full" style="font-size:${size}px">★</span>`;
    else if (i === full && half) html += `<span class="star half" style="font-size:${size}px">⯨</span>`;
    else html += `<span class="star empty" style="font-size:${size}px">☆</span>`;
  }
  return html;
}

function renderProductCard(product, vendorInfo) {
  const inWishlist = Wishlist.has(product.id);
  const badgeHtml = product.badge ? `<span class="product-badge badge-${badgeClass(product.badge)}">${escapeHTML(product.badge)}</span>` : '';
  const stockHtml = !product.inStock ? '<div class="out-of-stock-overlay"><span>Out of Stock</span></div>' : '';
  return `
  <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'" style="--vendor-color:${vendorInfo.primaryColor}">
    ${stockHtml}
    <div class="product-img-wrap">
      <img src="${escapeHTML(safeURL(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.src='https://picsum.photos/400/400'">
      ${badgeHtml}
      <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wish-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${inlineArg(product.id)}, this)" title="Add to Wishlist">
        ${inWishlist ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="product-info">
      <div class="product-category">${escapeHTML(product.category)}</div>
      <h3 class="product-name">${escapeHTML(product.name)}</h3>
      <div class="product-rating">
        ${renderStars(product.rating)}
        <span class="rating-count">(${product.reviewCount})</span>
      </div>
      <div class="product-price-row">
        <span class="product-price">${formatNaira(product.price)}</span>
        ${product.originalPrice ? `<span class="product-original-price">${formatNaira(product.originalPrice)}</span>` : ''}
      </div>
      <button class="btn-add-cart ${!product.inStock ? 'disabled' : ''}" onclick="event.stopPropagation(); ${product.inStock ? `addToCart(${inlineArg(product.id)})` : ''}" ${!product.inStock ? 'disabled' : ''}>
        ${product.inStock ? '🛒 Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  </div>`;
}

function renderReviewCard(review) {
  return `
  <div class="review-card">
    <div class="review-header">
      <div class="reviewer-avatar">${escapeHTML(review.avatar)}</div>
      <div class="reviewer-info">
        <strong>${escapeHTML(review.user)}</strong>
        <span class="review-date">${new Date(review.date).toLocaleDateString('en-NG', {year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <div class="review-stars">${renderStars(review.rating, 14)}</div>
    </div>
    <p class="review-comment">${escapeHTML(review.comment)}</p>
  </div>`;
}

// ---- TOAST & GLOBAL ACTIONS ----
function showToast(message) {
  let toast = document.getElementById('zarahToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'zarahToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100000;
      background: #18181B;
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      max-width: 90vw;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.setAttribute('role','status');
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 2800);
}

function addToCart(productId, qty = 1) {
  const product = typeof getProductById === 'function' ? getProductById(productId) : null;
  if (product) {
    Cart.addItem(product, qty);

  }
}

function buyNowDirect(productId, qty = 1) {
  const product = typeof getProductById === 'function' ? getProductById(productId) : null;
  if (product) {
    Cart.addItem(product, qty);
    if (product.inStock) window.location.href = 'checkout.html';
  }
}

function toggleWishlist(productId, btn) {
  const isNowWishlisted = Wishlist.toggle(productId);
  if (btn) {
    btn.textContent = isNowWishlisted ? '❤️' : '🤍';
    btn.classList.toggle('active', isNowWishlisted);
  }
  showToast(isNowWishlisted ? '❤️ Added to your wishlist!' : '🤍 Removed from wishlist');
}

// ---- INIT ON PAGE LOAD ----
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateUI();
  Auth.updateUI();
  Wishlist.updateUI();
});
