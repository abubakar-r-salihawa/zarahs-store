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
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }

    const user = { 
      id: Date.now().toString(), 
      name, 
      email, 
      password: btoa(password), 
      avatar: name[0].toUpperCase(), 
      joinDate: new Date().toISOString() 
    };

    // 1. Direct write to Supabase shoppers table if client is initialized
    if (window.supabaseClient) {
      try {
        // Check if email already registered in Supabase
        const { data: existing } = await window.supabaseClient
          .from('shoppers')
          .select('email')
          .eq('email', email.trim())
          .maybeSingle();

        if (existing) {
          return { success: false, error: 'Email already registered' };
        }

        const { error } = await window.supabaseClient.from('shoppers').insert({
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          avatar: user.avatar,
          join_date: user.joinDate
        });
        if (error) throw error;
        console.log("Shopper account registered in Supabase.");
      } catch (err) {
        console.error("Failed to register shopper in Supabase:", err);
      }
    }

    // 2. Local fallback
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
    const { password: _, ...safeUser } = user;
    localStorage.setItem('user', JSON.stringify(safeUser));
    Auth.updateUI();
    return { success: true, user: safeUser };
  },
  async login(email, password) {
    const encodedPass = btoa(password);

    // 1. Direct check against Supabase shoppers table if client is initialized
    if (window.supabaseClient) {
      try {
        const { data: dbUser, error } = await window.supabaseClient
          .from('shoppers')
          .select('*')
          .eq('email', email.trim())
          .eq('password', encodedPass)
          .maybeSingle();

        if (dbUser) {
          const safeUser = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            avatar: dbUser.avatar,
            joinDate: dbUser.join_date
          };
          localStorage.setItem('user', JSON.stringify(safeUser));
          Auth.updateUI();
          return { success: true, user: safeUser };
        }
      } catch (err) {
        console.error("Failed to verify shopper login from Supabase:", err);
      }
    }

    // 2. Local fallback
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === encodedPass);
    if (!user) return { success: false, error: 'Invalid email or password' };
    const { password: _, ...safeUser } = user;
    localStorage.setItem('user', JSON.stringify(safeUser));
    Auth.updateUI();
    return { success: true, user: safeUser };
  },
  logout() {
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
