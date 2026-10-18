// Supabase Auth identifies people; staff_members and database policies authorize them.
['admin_credentials','vendor_credentials_registry','adminSession','vendorSession','users'].forEach(key => localStorage.removeItem(key));
let staffSession = null;
async function loadStaffSession() {
  staffSession = null;
  if (!window.supabaseClient) return null;
  const { data: { user }, error } = await window.supabaseClient.auth.getUser();
  if (error || !user) return null;
  const {data, error: roleError} = await window.supabaseClient.from('staff_members').select('*').eq('user_id',user.id).maybeSingle();
  if (roleError || !data) return null;
  staffSession = {vendorId:data.vendor_id, isAdmin:data.role === 'admin', name:data.name, email:user.email};
  return staffSession;
}
const staffReady = loadStaffSession().catch(() => null);
const VendorAuth = {
  getSession: () => staffSession?.vendorId ? staffSession : null,
  isLoggedIn: () => !!VendorAuth.getSession(),
  async login(email,password) {
    try {
      if (!window.supabaseClient) throw new Error('Sign-in is unavailable. Check your connection and try again.');
      const {error} = await window.supabaseClient.auth.signInWithPassword({email:email.trim(),password});
      if (error) throw error;
      const session = await loadStaffSession();
      if (!session) { await window.supabaseClient.auth.signOut(); throw new Error('This account does not have access to the vendor portal. Contact the administrator.'); }
      return {success:true,isAdmin:session.isAdmin,session};
    } catch(e) { return {success:false,error:e.message}; }
  },
  async logout() { await window.supabaseClient?.auth.signOut(); staffSession=null; location.href='vendor-login.html'; },
  async requireAuth() { await staffReady; if(!VendorAuth.isLoggedIn()) {location.replace('vendor-login.html');return false;} return true; }
};
const AdminAuth = {
  getSession: () => staffSession?.isAdmin ? staffSession : null,
  isLoggedIn: () => !!AdminAuth.getSession(),
  logout: VendorAuth.logout,
  async requireAuth() { await staffReady; if(!AdminAuth.isLoggedIn()) {location.replace('vendor-login.html');return false;} return true; },
  async updateCredentials(email,password) {
    if (!AdminAuth.isLoggedIn()) throw new Error('Please sign in again.');
    const {error} = await window.supabaseClient.auth.updateUser({email,password});
    if(error) throw error;
  }
};
async function databaseWrite(query) {
  if (!window.supabaseClient) throw new Error('Connect to the internet before saving changes.');
  const {data,error} = await query;
  if(error) throw new Error(error.message);
  return data;
}
async function manageVendor(action,vendorId,info,email,password) {
  try {
    if(!AdminAuth.isLoggedIn()) throw new Error('Administrator sign-in required.');
    const {data,error} = await window.supabaseClient.functions.invoke('manage-vendor',{body:{action,vendorId,info,email,password}});
    if(error || data?.error) throw new Error(data?.error || error.message);
    await initVendorProducts();
    return {success:true};
  } catch(e) { return {success:false,error:e.message}; }
}
const AdminVendors = {
  create:(id,info,email,password)=>manageVendor('create',id,info,email,password),
  update:(id,info,email,password)=>manageVendor('update',id,info,email,password),
  delete:id=>manageVendor('delete',id)
};
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
