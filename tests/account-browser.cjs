let playwright;
try { playwright = require(process.env.PLAYWRIGHT_PATH || 'playwright'); }
catch { playwright = require('C:/Users/tmetr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
const assert = require('node:assert/strict');
const fixture = `window.supabase={createClient:()=>({
 auth:{getUser:async()=>({data:{user:window.__signedIn?{id:'test-user',email:'buyer@example.test',app_metadata:{role:window.__admin?'admin':'customer'}}:null}})},
 from(){const q={select(){return q},eq(){return q},order(){return q},maybeSingle:async()=>({data:null,error:null}),then(resolve){resolve({data:[],error:null})}};return q},
 rpc:async()=>{window.__requests=(window.__requests||0)+1;await new Promise(r=>setTimeout(r,100));return window.__fail?{error:{message:'network'}}:{data:{requested_at:'2026-10-20T12:00:00Z',status:'requested'}}}
})};`;
(async()=>{
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.request().url().includes('/@supabase/')?
   route.fulfill({contentType:'application/javascript',body:fixture}):route.abort());
  for(const width of [375,768,1280]){
   await page.setViewportSize({width,height:900});
   for(const file of ['account.html','privacy.html','privacy-requests.html']){
    await page.goto('http://127.0.0.1:8080/'+file);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,file);
   }
  }
  await page.goto('http://127.0.0.1:8080/account.html');
  await page.locator('#accountLogin').waitFor({state:'visible'});
  await page.locator('#accountLogin').click();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('returnAfterAuth')),'account.html');
  await page.addInitScript(()=>{window.__signedIn=true;window.__fail=true;});
  await page.goto('http://127.0.0.1:8080/account.html');
  await page.locator('#deleteConfirm').check();
  await page.locator('#requestDeletion').click();
  await page.locator('#deletionError').filter({hasText:'could not be confirmed'}).waitFor();
  await page.evaluate(()=>{window.__fail=false;document.getElementById('deletionForm').requestSubmit();document.getElementById('deletionForm').requestSubmit();});
  await page.locator('#accountStatus').filter({hasText:'has not yet been deleted'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__requests),2);
  await page.context().setOffline(true);
  await page.locator('.connection-notice').waitFor({state:'visible'});
  await page.context().setOffline(false);
  await page.locator('.connection-notice').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('PASS: nine privacy/account viewport checks, sign-in return, deletion failure/retry, duplicate-submit protection and offline feedback.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
