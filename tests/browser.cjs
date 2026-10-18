// Run against the local static server. Network fixtures never write to production.
let playwright;
try { playwright=require(process.env.PLAYWRIGHT_PATH || 'playwright'); }
catch { playwright=require('C:/Users/tmetr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const {chromium}=playwright;
const fs=require('node:fs');
const assert=require('node:assert/strict');
const fixture=`window.supabase={createClient:()=>({
 auth:{getUser:async()=>({data:{user:window.__role ? {id:'test-user',email:'staff@example.test'}:null}}),
 onAuthStateChange:fn=>{setTimeout(()=>fn('INITIAL_SESSION',null),0);return {data:{subscription:{unsubscribe(){}}}}},
 signOut:async()=>({error:null}),signInWithPassword:async()=>({error:{message:'Invalid login credentials'}}),
 signUp:async()=>({error:{message:'Registration unavailable'}})},
 from(table){let operation='select', match={}; const q={select(){return q},eq(k,v){match[k]=v;return q},order(){return q},insert(){operation='insert';return q},update(){operation='update';return q},delete(){operation='delete';return q},single(){return q},maybeSingle(){return q},
 then(resolve,reject){return Promise.resolve().then(()=>{
 if(operation!=='select') {if(window.__failSave) return {data:null,error:{message:'Save rejected'}}; return {data:{id:match.id || 'new'},error:null};}
 let data=[];
 if(table==='vendors') data=Object.values(VENDORS).map(v=>({id:v.id,name:v.name,tagline:v.tagline,description:v.description,rating:v.rating,review_count:v.reviewCount,logo:v.logo,primary_color:v.primaryColor,gradient:v.gradient,categories:v.categories,whatsapp:v.whatsapp,page:v.page}));
 if(table==='products') data=Object.values(PRODUCTS).flat().map(p=>({id:p.id,vendor:p.vendor,name:p.name,description:p.description,price:p.price,original_price:p.originalPrice,image:p.image,in_stock:p.inStock,badge:p.badge,category:p.category,size:p.size,sizes:p.sizes,notes:p.notes}));
 if(table==='staff_members') data=window.__role?{user_id:'test-user',role:window.__role,vendor_id:window.__role==='vendor'?'perfume':null,name:'Test staff'}:null;
 return {data,error:null};}).then(resolve,reject)}};return q;},
 functions:{invoke:async()=>({data:{accounts:[{vendorId:'perfume',email:'vendor@example.test'}]},error:null})},
 rpc:async(name,args)=>{window.__orderCalls=(window.__orderCalls || 0)+1;window.__orderPayload=args;await new Promise(r=>setTimeout(r,80));if(window.__failOrder)return {error:{message:'Connection failed'}};
 const groups=Object.groupBy(args.cart,i=>getProductById(i.id).vendor);
 return {data:Object.entries(groups).map(([vendor,items])=>({id:'test-order-'+vendor,vendor,name:VENDORS[vendor].name,whatsapp:vendor==='perfume'?'2341111111111':'2342222222222',items:items.map(i=>({...i,name:getProductById(i.id).name})),total:items.reduce((s,i)=>s+i.price*i.qty,0)*(args.promo?0.9:1)})),error:null};}
})};`;
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext();
 await context.addInitScript(()=>{window.__role=localStorage.getItem('__testRole');});
 await context.route('https://**/*',route=>{
   if(route.request().url().includes('/@supabase/')) return route.fulfill({contentType:'application/javascript',body:fixture});
   return route.abort();
 });
 const page=await context.newPage(); let errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report=[];
 async function visit(path,width=1280) {errors=[];await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:8080/'+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(180);}
 for(const width of [375,768,1280]) {
   for(const path of ['index.html','store-perfume.html','store-kitchen.html','store-variety.html','store.html','store.html?search=knife','product.html?id=p1','cart.html','auth.html','vendor-login.html']) {
     await visit(path,width);
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
     report.push({path,width,errors:[...errors],overflow});
     if(errors.length || overflow) console.log('ISSUE',JSON.stringify(report.at(-1)));
   }
 }
 await visit('store-variety.html',375);assert.ok(await page.locator('.product-card-fk').count()>0);
 await page.getByRole('button',{name:'Search & filters',exact:true}).click();assert.ok(await page.locator('.filter-panel').isVisible());
 await page.locator('#searchInput').fill('no-such-product');assert.ok(await page.locator('#emptyState').isVisible());
 await visit('store.html?search=knife');assert.ok(await page.locator('.minimal-card').count()>0);
 await visit('product.html?id=p1');
 await page.evaluate(()=>{const p=getAllProducts().find(p=>p.inStock);Cart.addItem({...p,selectedSize:'50ml'},2);Cart.addItem({...p,selectedSize:'100ml'},1);});
 assert.equal(await page.evaluate(()=>Cart.getItems().length),2);
 await visit('cart.html');await page.locator('#promoCode').fill('SAVE10');await page.getByRole('button',{name:'Apply',exact:true}).click();
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('zarah_promo_applied')),'true');
 await page.evaluate(()=>{Cart.clearCart();Cart.addItem(getAllProducts().find(p=>p.vendor==='perfume'&&p.inStock));Cart.addItem(getAllProducts().find(p=>p.vendor==='kitchen'&&p.inStock));});
 await visit('checkout.html',375);
 for(const [id,val] of Object.entries({firstName:'Test',lastName:'Buyer',phone:'08012345678',address:'123 Test Street',city:'Lagos'})) await page.locator('#'+id).fill(val);
 await page.locator('#state').selectOption({label:'Lagos'});
 await page.evaluate(()=>goToStep2());await page.evaluate(()=>window.__failOrder=true);
 await page.evaluate(()=>placeOrder());assert.equal(await page.evaluate(()=>Cart.getItems().length),2);
 assert.match(await page.locator('#orderError').textContent(),/kept/);
 await page.evaluate(()=>{window.__failOrder=false;return Promise.all([placeOrder(),placeOrder()]);});
 assert.equal(await page.locator('#vendorOrderLinks a').count(),2);
 assert.equal(await page.evaluate(()=>Cart.getItems().length),0);
 assert.equal(await page.evaluate(()=>window.__orderCalls),2);
 const links=await page.locator('#vendorOrderLinks a').evaluateAll(links=>links.map(a=>a.href));
 assert.ok(links.some(l=>l.includes('2341111111111'))&&links.some(l=>l.includes('2342222222222')));
 await page.screenshot({path:'test-results/checkout-mobile.png',fullPage:true});
 await visit('admin-dashboard.html');await page.waitForURL('**/vendor-login.html');assert.equal(errors.length,0);
 for(const role of ['vendor','admin']) {
   await page.evaluate(r=>localStorage.setItem('__testRole',r),role);
   for(const width of [375,768,1280]) {
     await visit(role+'-dashboard.html',width);await page.waitForTimeout(200);
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
     report.push({path:role+'-dashboard.html',width,errors:[...errors],overflow});
     if(errors.length || overflow) console.log('ISSUE',JSON.stringify(report.at(-1)));
     if(role==='vendor') {
       await page.evaluate(()=>showTab('products'));
       assert.ok(await page.locator('#productTableBody tr').count()>0);
       await page.evaluate(()=>showTab('settings'));
       assert.equal(await page.locator('#settingEmail').inputValue(),'staff@example.test');
       await page.evaluate(()=>showTab('products'));
       await page.evaluate(()=>openEditModal(VendorProducts.getAll('perfume')[0].id));
       assert.ok(await page.locator('#productModal').isVisible());
       await page.locator('#mPrice').fill('9999');
       await page.evaluate(()=>window.__failSave=true);
       let rejected=false;page.once('dialog',async dialog=>{rejected=dialog.message().includes('Save rejected');await dialog.accept();});
       await page.getByRole('button',{name:'Save Product'}).click();
       await page.waitForTimeout(100);assert.ok(rejected);
       assert.ok(await page.locator('#productModal').isVisible());
       await page.evaluate(()=>window.__failSave=false);
       await page.getByRole('button',{name:'Save Product'}).click();
       await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>VendorProducts.getAll('perfume')[0].price),9999);
       assert.ok(!await page.locator('#productModal').isVisible());
     }
   }
 }
 await visit('index.html',1280);await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
 await visit('index.html',375);await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 await visit('store-perfume.html',375);await page.screenshot({path:'test-results/store-mobile.png',fullPage:true});
 fs.writeFileSync('test-results/browser-report.json',JSON.stringify(report,null,2));
 await browser.close();
 assert.ok(report.every(r=>!r.errors.length&&!r.overflow),'See browser-report.json for errors');
 console.log('PASS: '+report.length+' page/viewport checks, filters, search, variants, promo, checkout failure/retry, separate vendor links, duplicate-submit guard and unauthorized dashboard redirect.');
})().catch(e=>{console.error(e);process.exit(1)});
