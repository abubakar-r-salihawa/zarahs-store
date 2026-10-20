const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('mobile/entry.js','utf8').replace(/^import .*;$/gm,'');
const local=new Map(),session=new Map(),listeners={};let opened,exchanged,redirected,options;
const storage=map=>({getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
const context={
 Capacitor:{isNativePlatform:()=>true},
 App:{addListener:async(name,fn)=>{listeners[name]=fn;},getLaunchUrl:async()=>null,minimizeApp:async()=>{}},
 Browser:{open:async({url})=>{opened=url;},close:async()=>{}},
 window:{supabaseClient:{auth:{
  signInWithOAuth:async value=>{options=value;return{data:{url:'https://accounts.google.com/test'}};},
  exchangeCodeForSession:async code=>{exchanged=code;return{error:null};}
 }}},
 document:{documentElement:{classList:{add(){}}},addEventListener:(name,fn)=>{listeners[name]=fn;}},
 localStorage:storage(local),sessionStorage:storage(session),URL,
 location:{pathname:'/index.html',replace:value=>{redirected=value;}},
 history:{back(){}},console,alert:()=>{}
};
(async()=>{
 vm.runInNewContext(source,context);
 await context.window.StoreMobile.signInWithGoogle('vendor-login.html');
 assert.equal(opened,'https://accounts.google.com/test');
 assert.equal(options.options.redirectTo,'app.zarahs.store://auth/callback');
 assert.equal(options.options.skipBrowserRedirect,true);
 await assert.rejects(context.window.StoreMobile.signInWithGoogle('https://evil.test'));
 await listeners.DOMContentLoaded();
 await vm.runInNewContext("finishLogin('app.zarahs.store://evil/callback?code=bad')",context);
 assert.equal(exchanged,undefined);
 await vm.runInNewContext("finishLogin('app.zarahs.store://auth/callback?code=good')",context);
 assert.equal(exchanged,'good');assert.equal(redirected,'vendor-login.html');
 const helpers=fs.readFileSync('js/common.js','utf8');
 const nativeLinks={window:{StoreMobile:{native:true}},location:{href:'capacitor://localhost/index.html'},URL,
  localStorage:{removeItem(){}},document:{addEventListener(){}}};
 vm.createContext(nativeLinks);vm.runInContext(helpers,nativeLinks);
 assert.equal(vm.runInContext("safeURL('store.html?vendor=perfume')",nativeLinks),'capacitor://localhost/store.html?vendor=perfume');
 assert.equal(vm.runInContext("safeURL('javascript:alert(1)')",nativeLinks),'index.html');
 assert.equal(vm.runInContext("safeURL('capacitor://evil/store.html')",nativeLinks),'index.html');
 const files=fs.readdirSync('dist-mobile');
 assert.ok(!files.includes('supabase_setup.sql')&&!files.includes('tests'));
 for(const file of files.filter(name=>name.endsWith('.html'))){
  const html=fs.readFileSync('dist-mobile/'+file,'utf8');
  assert.ok(!html.includes('cdn.jsdelivr.net/npm/@supabase/'));
  assert.ok(!html.includes('fonts.googleapis.com'));
  assert.ok(html.includes('js/mobile.bundle.js'));
 }
 console.log('PASS: native OAuth external-browser flow, strict callback/destination checks, local SDK bundling and public-asset allowlist.');
})().catch(error=>{console.error(error);process.exitCode=1;});
