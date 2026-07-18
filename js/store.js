// ============================================================
// MULTI-VENDOR SHOP — State Management (Cart, Auth, UI)
// ============================================================

// ---- CART STORE ----
const Cart = {
  getItems() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  },
  saveItems(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    Cart.updateUI();
  },
  addItem(product, qty = 1) {
    const items = Cart.getItems();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ ...product, qty });
    }
    Cart.saveItems(items);
    Cart.showNotification(product.name);
  },
  removeItem(productId) {
    const items = Cart.getItems().filter(i => i.id !== productId);
    Cart.saveItems(items);
  },
  updateQty(productId, qty) {
    if (qty <= 0) { Cart.removeItem(productId); return; }
    const items = Cart.getItems();
    const item = items.find(i => i.id === productId);
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
    toast.innerHTML = `<span class="toast-icon">🛒</span><span>Added to cart: <strong>${name}</strong></span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
  }
};

// ---- AUTH STORE ----
const Auth = {
  getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
  },
  async register(name, email, password) {
    if (!window.supabaseClient) return { success: false, error: 'Supabase not initialized.' };
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: name.trim()
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
  async verifyOTP(email, token, type = 'signup') {
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
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
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
    document.querySelectorAll('.auth-logged-in').forEach(el => el.style.display = user ? 'flex' : 'none');
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
      const user = {
        id: session.user.id,
        name: metadata.display_name || metadata.name || session.user.email.split('@')[0],
        email: session.user.email,
        avatar: (metadata.display_name || metadata.name || session.user.email)[0].toUpperCase(),
        joinDate: session.user.created_at
      };
      localStorage.setItem('user', JSON.stringify(user));
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('user');
    }
    Auth.updateUI();
  });
}

// ---- WISHLIST ----
const Wishlist = {
  getItems() { return JSON.parse(localStorage.getItem('wishlist') || '[]'); },
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
  const badgeHtml = product.badge ? `<span class="product-badge badge-${product.badge.toLowerCase().replace(' ','-')}">${product.badge}</span>` : '';
  const stockHtml = !product.inStock ? '<div class="out-of-stock-overlay"><span>Out of Stock</span></div>' : '';
  return `
  <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'" style="--vendor-color:${vendorInfo.primaryColor}">
    ${stockHtml}
    <div class="product-img-wrap">
      <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://picsum.photos/400/400'">
      ${badgeHtml}
      <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wish-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}', this)" title="Add to Wishlist">
        ${inWishlist ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="product-info">
      <div class="product-category">${product.category}</div>
      <h3 class="product-name">${product.name}</h3>
      <div class="product-rating">
        ${renderStars(product.rating)}
        <span class="rating-count">(${product.reviewCount})</span>
      </div>
      <div class="product-price-row">
        <span class="product-price">${formatNaira(product.price)}</span>
        ${product.originalPrice ? `<span class="product-original-price">${formatNaira(product.originalPrice)}</span>` : ''}
      </div>
      <button class="btn-add-cart ${!product.inStock ? 'disabled' : ''}" onclick="event.stopPropagation(); ${product.inStock ? `addToCart('${product.id}')` : ''}" ${!product.inStock ? 'disabled' : ''}>
        ${product.inStock ? '🛒 Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  </div>`;
}

function renderReviewCard(review) {
  return `
  <div class="review-card">
    <div class="review-header">
      <div class="reviewer-avatar">${review.avatar}</div>
      <div class="reviewer-info">
        <strong>${review.user}</strong>
        <span class="review-date">${new Date(review.date).toLocaleDateString('en-NG', {year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <div class="review-stars">${renderStars(review.rating, 14)}</div>
    </div>
    <p class="review-comment">${review.comment}</p>
  </div>`;
}

// ---- GLOBAL ACTIONS ----
function addToCart(productId) {
  const product = getProductById(productId);
  if (product) Cart.addItem(product);
}

function toggleWishlist(productId, btn) {
  const isNowWishlisted = Wishlist.toggle(productId);
  btn.textContent = isNowWishlisted ? '❤️' : '🤍';
  btn.classList.toggle('active', isNowWishlisted);
}

// ---- INIT ON PAGE LOAD ----
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateUI();
  Auth.updateUI();
  Wishlist.updateUI();
});
