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
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    // 1. Try Supabase Auth if client is available
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: { display_name: trimmedName }
          }
        });
        if (error) throw error;
        return { success: true, data };
      } catch (e) {
        console.warn("Supabase auth signUp unavailable or failed, checking local fallback:", e.message);
        // If it's a genuine validation error like already registered, return it
        if (e.message && e.message.toLowerCase().includes('already registered')) {
          return { success: false, error: e.message };
        }
      }
    }

    // 2. Resilient local fallback (works offline or when Supabase project is paused)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      return { success: false, error: 'Email already registered' };
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      password: btoa(password),
      avatar: trimmedName[0].toUpperCase(),
      joinDate: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem('user', JSON.stringify(safeUser));
    Auth.updateUI();
    return { success: true, localOnly: true, user: safeUser };
  },
  async login(email, password) {
    const trimmedEmail = email.trim();

    // 1. Try Supabase Auth if client is available
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email: trimmedEmail,
          password: password
        });
        if (error) throw error;
        return { success: true, data };
      } catch (e) {
        console.warn("Supabase signInWithPassword unavailable or failed, checking local fallback:", e.message);
        if (e.message && (e.message.toLowerCase().includes('invalid login') || e.message.toLowerCase().includes('invalid credentials'))) {
          // Check local users before failing completely
        }
      }
    }

    // 2. Resilient local fallback (checks locally registered users)
    const encodedPass = btoa(password);
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase() && u.password === encodedPass);
    if (user) {
      const { password: _, ...safeUser } = user;
      localStorage.setItem('user', JSON.stringify(safeUser));
      Auth.updateUI();
      return { success: true, localOnly: true, user: safeUser };
    }

    return { success: false, error: 'Invalid email or password. Please verify your credentials.' };
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
  toast.innerHTML = message;
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
    showToast(`🛒 <strong>${product.name}</strong> added to cart!`);
  }
}

function buyNowDirect(productId, qty = 1) {
  const product = typeof getProductById === 'function' ? getProductById(productId) : null;
  if (product) {
    Cart.addItem(product, qty);
    window.location.href = 'checkout.html';
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
