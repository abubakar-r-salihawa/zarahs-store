-- ============================================================
-- ZARAH'S STORE — SUPABASE DATABASE SETUP
-- Copy and paste this into the Supabase SQL Editor
-- (https://supabase.com/dashboard/project/hlodwqvkvudhfzbophwg/sql/new)
-- ============================================================

-- 1. CLEANUP (If running multiple times)
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS shoppers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendor_credentials CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS admin_credentials CASCADE;

-- 2. CREATE TABLES
-- Admin Credentials Table
CREATE TABLE admin_credentials (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
);

-- Vendors Table
CREATE TABLE vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    rating NUMERIC DEFAULT 5.0,
    review_count INT DEFAULT 0,
    logo TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    gradient TEXT,
    card_gradient TEXT,
    accent_color TEXT,
    categories TEXT[],
    banner_image TEXT,
    whatsapp TEXT,
    page TEXT
);

-- Vendor Credentials Table
CREATE TABLE vendor_credentials (
    vendor_id TEXT PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
);

-- Products Table
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    vendor TEXT REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    image TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    badge TEXT,
    category TEXT,
    size TEXT,
    material TEXT,
    origin TEXT,
    sizes TEXT[],
    notes JSONB
);

-- Shoppers Table (Global Shopper Registration)
CREATE TABLE shoppers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table (Global Order Tracking)
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    items JSONB,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DISABLE RLS (For simple frontend client-side database access)
ALTER TABLE admin_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE shoppers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- 4. INSERT SEED DATA
-- Default Admin
INSERT INTO admin_credentials (email, password)
VALUES ('admin@zarahsstore.com', 'AdminPassword2026!');

-- Default Vendors
INSERT INTO vendors (id, name, tagline, description, rating, review_count, logo, primary_color, secondary_color, gradient, card_gradient, accent_color, categories, banner_image, whatsapp, page)
VALUES 
(
  'perfume', 
  'Zarah''s Perfume', 
  'Signature scents for every occasion', 
  'Nigeria''s most-loved fragrance boutique. From oriental oudh to fresh florals — discover your signature scent from our handpicked collection of luxury perfumes.', 
  4.8, 
  1247, 
  '🌸', 
  '#8B5A2B', 
  '#C4952A', 
  'linear-gradient(135deg, #3D1C00, #8B5A2B, #C4952A)', 
  'linear-gradient(135deg, rgba(139,90,43,0.12), rgba(196,149,42,0.12))', 
  '#C4952A', 
  ARRAY['Eau de Parfum', 'Cologne', 'Oriental', 'Fresh', 'Floral', 'Woody'], 
  'https://picsum.photos/seed/zarah-perfume/1400/500', 
  '2348147923724', 
  'store-perfume.html'
),
(
  'kitchen', 
  'Zarah''s Kitchen', 
  'Cook with passion, dress with confidence', 
  'Premium kitchen essentials and fashion-forward clothing. Elevate your cooking experience and your wardrobe with Zarah''s curated selection.', 
  4.6, 
  893, 
  '🍳', 
  '#1A5C3A', 
  '#27AE60', 
  'linear-gradient(135deg, #0A3320, #1A5C3A, #27AE60)', 
  'linear-gradient(135deg, rgba(26,92,58,0.12), rgba(39,174,96,0.12))', 
  '#27AE60', 
  ARRAY['Cookware', 'Knives', 'Bakeware', 'Dresses', 'Tops', 'Accessories'], 
  'https://picsum.photos/seed/kitchen-ng/1400/500', 
  '2348147923724', 
  'store-kitchen.html'
),
(
  'variety', 
  'Teemerh Collection', 
  'Spices, jewels & everyday essentials', 
  'A treasure trove of exotic spices, handcrafted jewelry, and quality plastic organizers. Handpicked for your everyday lifestyle.', 
  4.7, 
  1056, 
  '💎', 
  '#1A3A6B', 
  '#2563EB', 
  'linear-gradient(135deg, #0A1F45, #1A3A6B, #2563EB)', 
  'linear-gradient(135deg, rgba(26,58,107,0.12), rgba(37,99,235,0.12))', 
  '#2563EB', 
  ARRAY['Spices', 'Jewelry', 'Plastics', 'Organizers', 'Necklaces', 'Rings'], 
  'https://picsum.photos/seed/globe-ng/1400/500', 
  '2348147923724', 
  'store-variety.html'
);

-- Default Vendor Credentials
INSERT INTO vendor_credentials (vendor_id, email, password, name)
VALUES
('perfume', 'vendor@aura.com', 'Aura2026!', 'Zarah''s Perfume'),
('kitchen', 'vendor@hearth.com', 'Hearth2026!', 'Zarah''s Kitchen'),
('variety', 'vendor@globe.com', 'Globe2026!', 'Teemerh Collection');

-- Default Products
INSERT INTO products (id, vendor, name, description, price, original_price, image, in_stock, badge, category, size, material, origin, sizes, notes)
VALUES
('perfume-1', 'perfume', 'Zahra Signature — Gold Crown Bottle', 'Our signature vanilla and musk oil fragrance. Extremely long lasting, premium oil concentrate.', 22000, 28000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074695329.jpg', true, 'Top Rated', 'Eau de Parfum', '100ml', 'Oil Concentrate', 'France', ARRAY['50ml', '100ml'], '{"top": "Warm Vanilla", "heart": "Amber Wood", "base": "White Musk"}'),
('perfume-2', 'perfume', 'Apy Collection — Red Frosted Bottle', 'Spicy wood notes blended with rose petals. Sophisticated unisex wear.', 15000, 19000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074708153.jpg', true, 'New', 'Cologne', '100ml', 'Oil Blend', 'UAE', ARRAY['100ml'], '{"top": "Damask Rose", "heart": "Agarwood", "base": "Praline"}'),
('perfume-3', 'perfume', 'Royal Oudh Dark Oil — Zahra''s Collection', 'Strong, rich, and grounding. Premium Cambodian oudh extract.', 18000, 24000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074717696.jpg', true, 'Sale', 'Oriental', '50ml', 'Oudh Extract', 'Cambodia', ARRAY['50ml', '100ml'], '{"top": "Saffron", "heart": "Nutmeg", "base": "Cambodian Oudh"}'),
('perfume-4', 'perfume', 'Zahra''s Signature Oil — White Cream Bottle', 'Soft white floral scent with hints of coconut oil base.', 12500, 16000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074727817.jpg', true, 'Popular', 'Fresh', '100ml', 'Whipped Cream Base', 'France', ARRAY['100ml'], '{"top": "Coconut", "heart": "Jasmine", "base": "Sandalwood"}'),
('perfume-5', 'perfume', 'White Oil Gift Set — 3 Bottles', 'Elegant gift package containing 3 distinct floral oils in gold-trimmed frosted glass.', 28000, 38000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074734422.jpg', true, 'Sale', 'Floral', '3x30ml', 'Mixed Oils', 'France', ARRAY['Gift Set'], '{"top": "Magnolia", "heart": "Lilac & Rose", "base": "Light Musk"}'),
('perfume-6', 'perfume', 'Zahra''s Complete Oil Collection', 'The ultimate connoisseur bundle featuring all 4 signature bottles and gift set in a luxury velvet display case.', 45000, 58000, 'C:/Users/tmetr/.gemini/antigravity/brain/6de2f738-be68-4fab-a20f-0335c2f04a36/media__1783074734422.jpg', true, 'Popular', 'Woody', 'Assorted', 'Oil Bundle', 'France & UAE', ARRAY['Full Set'], '{"top": "Bergamot", "heart": "Amber & Oudh", "base": "Premium Musk"}'),

('kitchen-1', 'kitchen', 'Stainless Steel Cookware Set — 12 Pcs', 'Professional-grade heavy-duty multi-ply stainless steel cookware with tempered glass lids.', 68000, 85000, 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=600&auto=format&fit=crop', true, 'Popular', 'Cookware', '12-Piece', 'Stainless Steel', 'Germany', ARRAY['12-Piece Set'], null),
('kitchen-2', 'kitchen', 'Professional Damascus Chef Knife', '8-inch chef knife forged from 67 layers of Japanese VG-10 Damascus steel. Extremely sharp.', 24500, 32000, 'https://images.unsplash.com/photo-1593113598332-cd59c5bc3f90?q=80&w=600&auto=format&fit=crop', true, 'New', 'Knives', '8-Inch', 'Damascus Steel', 'Japan', ARRAY['8-Inch'], null),
('kitchen-3', 'kitchen', 'Chiffon Maxi Dinner Dress', 'Elegant long-sleeve chiffon dress with gold belt. Perfect for parties and formal dinners.', 18500, 22000, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop', true, 'Popular', 'Dresses', 'Free Size', 'Chiffon / Silk', 'Nigeria', ARRAY['M', 'L', 'XL'], null),
('kitchen-4', 'kitchen', 'Non-Stick Cast Iron Skillet', 'Pre-seasoned heavy-duty 10-inch skillet. Dual pour spouts. Lifetime durability.', 14000, 18500, 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?q=80&w=600&auto=format&fit=crop', true, 'Bestseller', 'Cookware', '10-Inch', 'Cast Iron', 'China', ARRAY['10-Inch', '12-Inch'], null),
('kitchen-5', 'kitchen', 'Adire Rich Auntie Boubou', 'Hand-dyed adire silk boubou with intricate stone embroidery.', 28000, 35000, 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?q=80&w=600&auto=format&fit=crop', true, 'New', 'Dresses', 'Free Size', 'Silk Adire', 'Nigeria', ARRAY['Free Size'], null),

('variety-1', 'variety', 'Organizing Plastic Baskets — Set of 6', 'Durable, stackable storage baskets with easy-carry handles. Perfect for pantry, vanity, or spices.', 8500, 11000, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=600&auto=format&fit=crop', true, 'Bestseller', 'Plastics', 'Medium', 'Recycled Plastic', 'Nigeria', ARRAY['Set of 6'], null),
('variety-2', 'variety', 'Exotic Spice Trio Gift Box', 'Premium glass jars containing pure Cameroon Pepper, Sweet Paprika, and Nigerian Ginger powder.', 7200, 9500, 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop', true, 'Popular', 'Spices', '3x150g', 'Organic Spice', 'Cameroon/Nigeria', ARRAY['Standard Box'], null),
('variety-3', 'variety', 'Zirconia Gold Layered Necklace Set', 'Hypoallergenic 18k gold-plated layered chain with AAA zirconia crystal pendants.', 12500, 16000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600&auto=format&fit=crop', true, 'New', 'Jewelry', 'Adjustable', '18k Gold Plated', 'Italy', ARRAY['One Size'], null),
('variety-4', 'variety', 'Plastic Airtight Food Containers — 10 Pcs', 'BPA-free plastic storage containers with leak-proof locking lids.', 14500, 19000, 'https://images.unsplash.com/photo-1606168094336-48f205276929?q=80&w=600&auto=format&fit=crop', true, 'Popular', 'Plastics', 'Assorted Sizes', 'BPA-free Plastic', 'Nigeria', ARRAY['10-Piece Set'], null),
('variety-5', 'variety', 'Handcrafted Statement Beads', 'Traditional coral bead necklace set with brass accents.', 32000, 42000, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=600&auto=format&fit=crop', true, 'Popular', 'Jewelry', 'Custom Fit', 'Coral & Brass', 'Nigeria', ARRAY['One Size'], null);
