// ============================================================
// MARKETHUB NIGERIA — Product & Vendor Data (₦ Naira Edition)
// ============================================================

// ---- WHATSAPP ORDER CONFIG ----
// Global fallback number (used if a vendor has no specific WhatsApp set)
const WHATSAPP_NUMBER = '2348147923724';

function buildWhatsAppOrderMessage(items, total, customerInfo) {
  const itemLines = items.map(i =>
    `  • ${i.name} (×${i.qty}) — ${formatNaira(i.price * i.qty)}`
  ).join('\n');
  const msg =
`🛍️ *NEW ORDER — Zarah's Store*

*Customer Details:*
👤 Name: ${customerInfo.name}
📍 Address: ${customerInfo.address}
📞 Phone: ${customerInfo.phone}
✉️ Email: ${customerInfo.email}

*Items Ordered:*
${itemLines}

💰 *Items Total: ${formatNaira(total)}*
🚚 *Delivery: To be discussed with seller*

Please reply with the delivery cost and bank account details to complete the order.
Thank you! 🙏`;
  return encodeURIComponent(msg);
}

// Route WhatsApp orders to the correct vendor's number
function redirectToWhatsApp(items, total, customerInfo, vendorId) {
  const msg = buildWhatsAppOrderMessage(items, total, customerInfo);
  let number = WHATSAPP_NUMBER; // fallback
  if (vendorId) {
    const registry = JSON.parse(localStorage.getItem('vendors_registry') || '{}');
    const vendor = registry[vendorId];
    if (vendor && vendor.whatsapp) number = vendor.whatsapp;
  }
  const url = `https://wa.me/${number}?text=${msg}`;
  window.open(url, '_blank');
}

// Per-product WhatsApp order (reads vendor from product object)
function orderProductViaWhatsApp(productId) {
  const product = getProductById(productId);
  if (!product) return;
  const vendor = VENDORS[product.vendor];
  const registry = JSON.parse(localStorage.getItem('vendors_registry') || '{}');
  const v = registry[product.vendor] || vendor;
  const number = (v && v.whatsapp) ? v.whatsapp : WHATSAPP_NUMBER;
  const msg = encodeURIComponent(
`🛍️ *Product Inquiry — Zarah's Store*

*Product:* ${product.name}
*Price:* ${formatNaira(product.price)}
*Vendor:* ${vendor ? vendor.name : ''}

I would like to place an order. Please share delivery cost and payment details. Thank you!`);
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank');
}

const VENDORS = {
  perfume: {
    id: 'perfume',
    name: "Zarah's Perfume",
    tagline: 'Signature scents for every occasion',
    description: "Nigeria's most-loved fragrance boutique. From oriental oudh to fresh florals — discover your signature scent from our handpicked collection of luxury perfumes.",
    rating: 4.8,
    reviewCount: 1247,
    logo: '🌸',
    primaryColor: '#8B5A2B',
    secondaryColor: '#C4952A',
    gradient: 'linear-gradient(135deg, #3D1C00, #8B5A2B, #C4952A)',
    cardGradient: 'linear-gradient(135deg, rgba(139,90,43,0.12), rgba(196,149,42,0.12))',
    accentColor: '#C4952A',
    categories: ['Eau de Parfum', 'Cologne', 'Oriental', 'Fresh', 'Floral', 'Woody'],
    bannerImage: 'https://picsum.photos/seed/zarah-perfume/1400/500',
    whatsapp: '2348147923724',
    page: 'store-perfume.html'
  },
  kitchen: {
    id: 'kitchen',
    name: "Zarah's Kitchen",
    tagline: 'Cook with passion, dress with confidence',
    description: "Premium kitchen essentials and fashion-forward clothing. Elevate your cooking experience and your wardrobe with Zarah's curated selection.",
    rating: 4.6,
    reviewCount: 893,
    logo: '🍳',
    primaryColor: '#1A5C3A',
    secondaryColor: '#27AE60',
    gradient: 'linear-gradient(135deg, #0A3320, #1A5C3A, #27AE60)',
    cardGradient: 'linear-gradient(135deg, rgba(26,92,58,0.12), rgba(39,174,96,0.12))',
    accentColor: '#27AE60',
    categories: ['Cookware', 'Knives', 'Bakeware', 'Dresses', 'Tops', 'Accessories'],
    bannerImage: 'https://picsum.photos/seed/kitchen-ng/1400/500',
    whatsapp: '2348147923724',
    page: 'store-kitchen.html'
  },
  variety: {
    id: 'variety',
    name: 'Teemerh Collection',
    tagline: 'Spices, jewels & everyday essentials',
    description: 'A treasure trove of exotic spices, handcrafted jewelry, and quality plastic organizers. Handpicked for your everyday lifestyle.',
    rating: 4.7,
    reviewCount: 1056,
    logo: '💎',
    primaryColor: '#1A3A6B',
    secondaryColor: '#2563EB',
    gradient: 'linear-gradient(135deg, #0A1F45, #1A3A6B, #2563EB)',
    cardGradient: 'linear-gradient(135deg, rgba(26,58,107,0.12), rgba(37,99,235,0.12))',
    accentColor: '#2563EB',
    categories: ['Spices', 'Jewelry', 'Plastics', 'Organizers', 'Necklaces', 'Rings'],
    bannerImage: 'https://picsum.photos/seed/globe-ng/1400/500',
    whatsapp: '2348147923724',
    page: 'store-variety.html'
  }
};

const PRODUCTS = {
  perfume: [
    {
      id: 'p1', vendor: 'perfume',
      name: "Zahra's Signature Oil — White Cream (50ml)",
      price: 12500, originalPrice: 16000,
      category: 'Floral', rating: 4.9, reviewCount: 312,
      image: 'images/perfume/zahra-white-square-bottles.jpg',
      badge: 'Bestseller',
      description: "Zahra's iconic white cream oil in a square dropper bottle with gold cap. A clean, powdery floral scent with soft musk base — perfect for daily wear. Long-lasting and gentle on skin.",
      notes: { top: 'White Floral, Bergamot', heart: 'Jasmine, Lily', base: 'Soft Musk, Vanilla' },
      size: '50ml', inStock: true
    },
    {
      id: 'p2', vendor: 'perfume',
      name: "Zahra's Cream Oil — Premium Dropper (30ml)",
      price: 8500, originalPrice: null,
      category: 'Fresh', rating: 4.7, reviewCount: 189,
      image: 'images/perfume/zahra-white-dropper-cone.jpg',
      badge: null,
      description: "A luxurious white cream oil in a cone-shaped dropper bottle with gold ring cap. Smooth and silky on the skin with a fresh floral heart. Ideal as a body oil or behind-the-ear perfume oil.",
      notes: { top: 'Fresh Citrus, Rose', heart: 'Lily, White Tea', base: 'White Musk, Sandalwood' },
      size: '30ml', inStock: true
    },
    {
      id: 'p3', vendor: 'perfume',
      name: "Royal Oudh Dark Oil — Zahra's Collection",
      price: 18000, originalPrice: 24000,
      category: 'Oriental', rating: 4.8, reviewCount: 245,
      image: 'images/perfume/zahra-collection-oils.jpg',
      badge: 'Limited',
      description: "The dark brown/amber oil from Zahra's signature dropper collection. A rich oriental blend of oud, amber and dark wood oils. Deeply masculine, long-lasting and captivating — one drop lasts all day.",
      notes: { top: 'Saffron, Cardamom', heart: 'Rose, Oud Wood', base: 'Vetiver, Amber, Musk' },
      size: '50ml', inStock: true
    },
    {
      id: 'p4', vendor: 'perfume',
      name: "Apy Collection — Red Frosted Bottle",
      price: 15000, originalPrice: null,
      category: 'Floral', rating: 4.5, reviewCount: 167,
      image: 'images/perfume/zahra-apy-collection.jpg',
      badge: 'New',
      description: "The popular 'Apy' fragrance from Zahra's Perfume in a stunning red frosted bottle with gold crown cap. A sweet, fruity floral scent that's feminine, cheerful, and long-lasting. Great for parties and special occasions.",
      notes: { top: 'Cherry, Raspberry', heart: 'Rose, Peony', base: 'Vanilla, Musk' },
      size: '60ml', inStock: true
    },
    {
      id: 'p5', vendor: 'perfume',
      name: "Zahra Signature — Gold Crown Bottle",
      price: 22000, originalPrice: 28000,
      category: 'Woody', rating: 4.9, reviewCount: 298,
      image: 'images/perfume/zahra-apy-collection.jpg',
      badge: 'Top Rated',
      description: "The 'Zahra' branded fragrance in the signature frosted bottle with gold crown. A bold, sophisticated scent with warm woody depth and a floral heart. The signature scent of Zahra's Perfume house.",
      notes: { top: 'Bergamot, Black Pepper', heart: 'Jasmine, Rose', base: 'Oud, Sandalwood, Amber' },
      size: '60ml', inStock: true
    },
    {
      id: 'p6', vendor: 'perfume',
      name: "Amber Spray — Dark Luxury Bottle",
      price: 25000, originalPrice: null,
      category: 'Oriental', rating: 4.6, reviewCount: 203,
      image: 'images/perfume/zahra-amber-spray.jpg',
      badge: null,
      description: "A luxurious amber spray perfume in a dark gradient bottle with black cap. Rich, warm and deeply sensual — this fragrance deepens on the skin over hours. An unmissable statement scent for evenings and events.",
      notes: { top: 'Cinnamon, Saffron', heart: 'Amber, Rose', base: 'Oud, Patchouli, Musk' },
      size: '50ml', inStock: true
    },
    {
      id: 'p7', vendor: 'perfume',
      name: "White Oil Gift Set — 3 Bottles",
      price: 28000, originalPrice: 38000,
      category: 'Floral', rating: 4.7, reviewCount: 156,
      image: 'images/perfume/zahra-white-dropper-cone.jpg',
      badge: 'Sale',
      description: "A beautiful gift set of 3 white cream oil bottles from Zahra's Perfume. Perfect for gifting — each bottle contains a different floral-musk blend. Comes in Zahra's signature branded packaging.",
      notes: { top: 'Rose, Bergamot', heart: 'Jasmine, Lily, Ylang Ylang', base: 'Sandalwood, Tonka Bean, Musk' },
      size: '3 × 30ml', inStock: true
    },
    {
      id: 'p8', vendor: 'perfume',
      name: "Zahra's Complete Oil Collection",
      price: 45000, originalPrice: null,
      category: 'Oriental', rating: 4.8, reviewCount: 178,
      image: 'images/perfume/zahra-collection-oils.jpg',
      badge: 'Popular',
      description: "The complete Zahra's Oil Collection — includes the white cream oil, the golden oudh mini, and the dark oriental oil all in one set. From Katsina to Lagos, these are Nigeria's favourite oil perfumes.",
      notes: { top: 'Mixed Florals, Citrus', heart: 'Rose, Oud, Jasmine', base: 'Amber, Musk, Sandalwood' },
      size: '3-piece set', inStock: true
    }
  ],
  kitchen: [
    {
      id: 'k1', vendor: 'kitchen',
      name: "Chef's Pro Knife Set (7-Piece)",
      price: 42000, originalPrice: 65000,
      category: 'Knives', rating: 4.8, reviewCount: 234,
      image: 'https://picsum.photos/seed/knife-set/400/400',
      badge: 'Bestseller',
      description: 'Professional-grade stainless steel knife set including chef knife, bread knife, carving knife, utility knife, paring knife, kitchen shears, and a beautiful acacia wood block.',
      material: 'High-Carbon Stainless Steel', inStock: true
    },
    {
      id: 'k2', vendor: 'kitchen',
      name: 'Ceramic Non-Stick Fry Pan',
      price: 18500, originalPrice: null,
      category: 'Cookware', rating: 4.6, reviewCount: 189,
      image: 'https://picsum.photos/seed/ceramic-pan/400/400',
      badge: 'New',
      description: 'Eco-friendly ceramic non-stick pan with a PFOA-free coating. Heats evenly, easy to clean, and safe for all stovetops including gas cookers. Available in 28cm size.',
      material: 'Ceramic Coated Aluminum', inStock: true
    },
    {
      id: 'k3', vendor: 'kitchen',
      name: 'Silk Evening Gown — Ruby Red',
      price: 75000, originalPrice: 98000,
      category: 'Dresses', rating: 4.9, reviewCount: 145,
      image: 'https://picsum.photos/seed/evening-gown/400/400',
      badge: 'Sale',
      description: 'An exquisite floor-length evening gown in rich ruby red silk. Features a V-neckline, elegant side slit, and delicate back draping. Perfect for weddings, dinners, and special occasions.',
      material: '100% Pure Silk', sizes: ['XS', 'S', 'M', 'L', 'XL'], inStock: true
    },
    {
      id: 'k4', vendor: 'kitchen',
      name: 'Cast Iron Dutch Oven (5.5L)',
      price: 38000, originalPrice: null,
      category: 'Cookware', rating: 4.7, reviewCount: 167,
      image: 'https://picsum.photos/seed/dutch-oven/400/400',
      badge: null,
      description: 'A kitchen workhorse. This enameled cast iron Dutch oven is perfect for slow-cooked stews, egusi, ofe onugbu, and everything in between. Oven safe and gas-stove compatible.',
      material: 'Enameled Cast Iron', inStock: true
    },
    {
      id: 'k5', vendor: 'kitchen',
      name: 'Floral Wrap Midi Dress',
      price: 28000, originalPrice: 38000,
      category: 'Dresses', rating: 4.5, reviewCount: 198,
      image: 'https://picsum.photos/seed/floral-dress/400/400',
      badge: 'Popular',
      description: 'A breezy floral wrap dress with a flattering A-line silhouette. Made from lightweight chiffon, this versatile piece transitions seamlessly from brunch to owambe.',
      material: 'Chiffon Polyester', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], inStock: true
    },
    {
      id: 'k6', vendor: 'kitchen',
      name: 'Stainless Steel Pot Set (5-Piece)',
      price: 52000, originalPrice: 72000,
      category: 'Cookware', rating: 4.7, reviewCount: 212,
      image: 'https://picsum.photos/seed/pot-set/400/400',
      badge: 'Sale',
      description: 'Complete your kitchen with this 5-piece stainless steel pot set including a saucepan, stockpot, sauté pan, and two fry pans. All with ergonomic handles and glass lids.',
      material: '18/10 Stainless Steel', inStock: true
    },
    {
      id: 'k7', vendor: 'kitchen',
      name: 'Ankara Print Maxi Dress',
      price: 22000, originalPrice: null,
      category: 'Dresses', rating: 4.6, reviewCount: 134,
      image: 'https://picsum.photos/seed/ankara-dress/400/400',
      badge: 'New',
      description: 'A vibrant Ankara print maxi dress with a fitted bodice and flared skirt. 100% African wax cotton. Ideal for owambe parties, church, or casual outings.',
      material: '100% African Wax Cotton', sizes: ['XS', 'S', 'M', 'L', 'XL'], inStock: true
    },
    {
      id: 'k8', vendor: 'kitchen',
      name: 'Bamboo Cutting Board Set (3-Pack)',
      price: 12500, originalPrice: null,
      category: 'Accessories', rating: 4.5, reviewCount: 289,
      image: 'https://picsum.photos/seed/bamboo-board/400/400',
      badge: null,
      description: 'Eco-friendly bamboo cutting boards in 3 sizes. Naturally antibacterial, gentle on knife edges, and juice-groove designed. Hand wash recommended.',
      material: 'Natural Bamboo', inStock: true
    }
  ],
  variety: [
    {
      id: 'v1', vendor: 'variety',
      name: 'Premium Saffron Threads (5g)',
      price: 8500, originalPrice: 12000,
      category: 'Spices', rating: 4.9, reviewCount: 423,
      image: 'https://picsum.photos/seed/saffron/400/400',
      badge: 'Bestseller',
      description: 'The finest Grade A saffron threads sourced directly from Kashmir. Rich golden color, intoxicating aroma, and potent flavor. Perfect for jollof rice, biryanis, and teas.',
      origin: 'Kashmir, India', inStock: true
    },
    {
      id: 'v2', vendor: 'variety',
      name: 'Crystal Quartz Necklace Set',
      price: 18500, originalPrice: 25000,
      category: 'Jewelry', rating: 4.7, reviewCount: 234,
      image: 'https://picsum.photos/seed/crystal-necklace/400/400',
      badge: 'Sale',
      description: 'A stunning set of three layered necklaces featuring genuine crystal quartz pendants on 18K gold-plated chains. Perfect for layering or wearing individually.',
      material: 'Crystal Quartz, 18K Gold Plated', inStock: true
    },
    {
      id: 'v3', vendor: 'variety',
      name: 'Suya Spice Blend (250g)',
      price: 2800, originalPrice: null,
      category: 'Spices', rating: 4.8, reviewCount: 312,
      image: 'https://picsum.photos/seed/suya-spice/400/400',
      badge: 'New',
      description: 'Authentic Hausa suya spice blend (yaji) made from ground peanuts, ginger, paprika, and secret spices. Perfect for grilling beef, chicken, and fish suya at home.',
      origin: 'Northern Nigeria', inStock: true
    },
    {
      id: 'v4', vendor: 'variety',
      name: 'Modular Storage Container Set (10pc)',
      price: 9500, originalPrice: null,
      category: 'Plastics', rating: 4.5, reviewCount: 189,
      image: 'https://picsum.photos/seed/storage-containers/400/400',
      badge: null,
      description: 'A versatile 10-piece set of BPA-free plastic storage containers with air-tight, snap-lock lids. Stackable, microwave-safe (lids off), dishwasher-safe, and freezer-friendly.',
      material: 'BPA-Free Polypropylene', inStock: true
    },
    {
      id: 'v5', vendor: 'variety',
      name: 'Gold-Plated Charm Bracelet',
      price: 28000, originalPrice: 38000,
      category: 'Jewelry', rating: 4.8, reviewCount: 178,
      image: 'https://picsum.photos/seed/charm-bracelet/400/400',
      badge: 'Top Rated',
      description: 'An exquisite 18K gold-plated charm bracelet featuring 7 handcrafted charms: star, moon, heart, key, flower, butterfly, and infinity symbol. Adjustable chain length.',
      material: '18K Gold Plated Brass', inStock: true
    },
    {
      id: 'v6', vendor: 'variety',
      name: 'Nigerian Spice Collection (12 Jars)',
      price: 15500, originalPrice: 22000,
      category: 'Spices', rating: 4.9, reviewCount: 567,
      image: 'https://picsum.photos/seed/spice-collection/400/400',
      badge: 'Bestseller',
      description: 'The ultimate Nigerian kitchen starter kit: Uziza, Crayfish, Ogiri, Ehuru, Uziza Leaf, Turmeric, Cinnamon, Cardamom, Suya Spice, Egusi Powder, Ogbono, and Dawadawa — all in beautiful glass jars.',
      origin: 'Nigeria & Global Select', inStock: true
    },
    {
      id: 'v7', vendor: 'variety',
      name: 'Sterling Silver Drop Earrings',
      price: 14500, originalPrice: null,
      category: 'Jewelry', rating: 4.6, reviewCount: 145,
      image: 'https://picsum.photos/seed/silver-earrings/400/400',
      badge: 'New',
      description: 'Elegant sterling silver drop earrings with a teardrop moonstone center. Lightweight, hypoallergenic, and perfect for both casual and formal occasions.',
      material: '925 Sterling Silver, Moonstone', inStock: true
    },
    {
      id: 'v8', vendor: 'variety',
      name: 'Desktop Organizer Set (6-Piece)',
      price: 7500, originalPrice: 10500,
      category: 'Plastics', rating: 4.4, reviewCount: 234,
      image: 'https://picsum.photos/seed/desk-organizer/400/400',
      badge: 'Sale',
      description: 'Keep your workspace tidy with this modular 6-piece desk organizer set. Includes pen holder, paper tray, drawer, file holder, sticky note tray, and small parts box.',
      material: 'Recycled ABS Plastic', inStock: true
    }
  ]
};

const REVIEWS = {
  perfume: [
    { id: 'pr1', user: 'Chidinma O.', avatar: 'C', rating: 5, date: '2026-06-15', product: 'p1', comment: "Midnight Rose is now my signature scent! Long-lasting and I get compliments every time I wear it. Zarah's never disappoints 🌹" },
    { id: 'pr2', user: 'Emeka J.', avatar: 'E', rating: 5, date: '2026-06-10', product: 'p3', comment: 'Royal Oudh is worth every kobo. Rich, complex, and incredibly long-lasting. My bottle has lasted 6 months!' },
    { id: 'pr3', user: 'Amaka R.', avatar: 'A', rating: 4, date: '2026-06-05', product: 'p2', comment: 'Ocean Breeze is perfect for everyday. Light, fresh, and not overwhelming. Great for office and outings.' },
    { id: 'pr4', user: 'Tunde L.', avatar: 'T', rating: 5, date: '2026-05-28', product: 'p5', comment: 'Black Amber is a masterpiece. Powerful, seductive, and lasts all day. Got so many compliments at the owambe!' },
    { id: 'pr5', user: 'Adaeze W.', avatar: 'A', rating: 5, date: '2026-05-20', product: 'p7', comment: 'Velvet Jasmine is pure luxury. Sophisticated without being overwhelming. Packaging is also beautiful.' },
    { id: 'pr6', user: 'Ngozi T.', avatar: 'N', rating: 4, date: '2026-05-15', product: 'p4', comment: 'Cherry Blossom is adorable and very wearable. Got it as a gift and my friend loved it! Fast delivery to Lagos.' }
  ],
  kitchen: [
    { id: 'kr1', user: 'Kola P.', avatar: 'K', rating: 5, date: '2026-06-18', product: 'k1', comment: "Best knife set I've ever owned! The chef's knife is razor-sharp and perfectly balanced. Worth every naira." },
    { id: 'kr2', user: 'Bisi H.', avatar: 'B', rating: 5, date: '2026-06-12', product: 'k3', comment: 'The Ruby Red gown is stunning! Quality silk, perfect fit. Wore it to my sister\'s wedding in Abuja — wow moment!' },
    { id: 'kr3', user: 'Temi B.', avatar: 'T', rating: 4, date: '2026-06-08', product: 'k4', comment: 'Dutch oven is solid and heats beautifully. Made the most amazing egusi soup and slow-cooked oxtail.' },
    { id: 'kr4', user: 'Sade S.', avatar: 'S', rating: 5, date: '2026-05-30', product: 'k5', comment: 'Floral dress is absolutely gorgeous! So flattering and comfortable. Rocked it at an owambe in PH.' },
    { id: 'kr5', user: 'Chidi M.', avatar: 'C', rating: 4, date: '2026-05-22', product: 'k2', comment: 'Ceramic pan heats evenly, nothing sticks. Easy cleanup and looks great. My jollof rice game is on another level now.' },
    { id: 'kr6', user: 'Yemi G.', avatar: 'Y', rating: 5, date: '2026-05-16', product: 'k7', comment: 'The Ankara dress is stunning! True to size, colors vibrant, quality fabric. Will definitely order more.' }
  ],
  variety: [
    { id: 'vr1', user: 'Priya N.', avatar: 'P', rating: 5, date: '2026-06-20', product: 'v1', comment: 'Best saffron I\'ve ever bought! The aroma is exceptional. My jollof rice and biryani have never tasted better.' },
    { id: 'vr2', user: 'Fatima L.', avatar: 'F', rating: 5, date: '2026-06-14', product: 'v2', comment: 'Crystal necklace set is beautiful! Great quality for the price. Delivered in 2 days to Abuja, packaging was lovely.' },
    { id: 'vr3', user: 'Musa K.', avatar: 'M', rating: 5, date: '2026-06-09', product: 'v3', comment: 'This suya spice is authentic! Made suya at home and the family went crazy. Tastes exactly like mallam suya!' },
    { id: 'vr4', user: 'Grace T.', avatar: 'G', rating: 4, date: '2026-06-02', product: 'v5', comment: 'Gold bracelet is beautiful and well-made. The charms are delicate but sturdy. Gets lots of compliments!' },
    { id: 'vr5', user: 'Hauwa M.', avatar: 'H', rating: 5, date: '2026-05-25', product: 'v6', comment: 'The Nigerian spice collection is a game-changer! All spices are fresh and well-labeled. Perfect gift for any foodie.' },
    { id: 'vr6', user: 'Jennifer C.', avatar: 'J', rating: 4, date: '2026-05-18', product: 'v7', comment: 'Beautiful silver earrings. Very lightweight and the moonstone shimmers perfectly. Excellent quality and delivery.' }
  ]
};

// ---- DATA ACCESS FUNCTIONS ----
function getAllProducts() {
  return [...PRODUCTS.perfume, ...PRODUCTS.kitchen, ...PRODUCTS.variety];
}

function getFeaturedProducts(count = 6) {
  const all = getAllProducts().filter(p => p.badge);
  return all.slice(0, count);
}

function getProductById(id) {
  return getAllProducts().find(p => p.id === id);
}

function getVendor(id) {
  return VENDORS[id];
}

function getProductsByVendor(vendorId) {
  return PRODUCTS[vendorId] || [];
}

function getReviewsByVendor(vendorId) {
  return REVIEWS[vendorId] || [];
}

function getReviewsByProduct(productId) {
  const all = [...REVIEWS.perfume, ...REVIEWS.kitchen, ...REVIEWS.variety];
  return all.filter(r => r.product === productId);
}

// ---- NAIRA FORMATTER ----
function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}
