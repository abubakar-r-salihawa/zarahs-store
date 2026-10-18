const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const assert=require('node:assert/strict');
let handler,role='admin',failInsert=false,created=0,deleted=0,writes=0;
const db={
 auth:{getUser:async token=>({data:{user:token==='valid'?{id:'admin-id'}:null},error:token==='valid'?null:{message:'Invalid token'}}),
 admin:{createUser:async()=>{created++;return {data:{user:{id:'new-id'}}}},deleteUser:async()=>{deleted++;return{}},getUserById:async()=>({data:{user:{email:'vendor@example.test'}}})}},
 from(table){let operation='select';const filters={};const query={select(){return query},eq(key,value){filters[key]=value;return query},maybeSingle(){return query},single(){return query},
 insert(){operation='insert';return query},update(){operation='update';return query},delete(){operation='delete';return query},
 then(resolve,reject){return Promise.resolve().then(()=>{
  if(operation!=='select'){writes++;return {error:failInsert&&operation==='insert'?{message:'Database rejected insert'}:null};}
  if(table==='staff_members'&&filters.user_id)return {data:{role}};
  if(table==='staff_members'&&filters.role)return {data:[]};
  return {data:null};
 }).then(resolve,reject)}};return query;}
};
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/manage-vendor/index.ts','utf8').replace(/^import .*\n/,''));
vm.runInNewContext(source,{createClient:()=>db,Deno:{serve:fn=>handler=fn,env:{get:key=>key==='ALLOWED_ORIGINS'?'http://localhost:8080':'test'}},Response});
const invoke=(body,token='valid',origin='http://localhost:8080',method='POST')=>handler(new Request('http://test.local/manage-vendor',{method,headers:{origin,authorization:'Bearer '+token,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
(async()=>{
 assert.equal((await invoke({},'invalid')).status,401);
 role='vendor';assert.equal((await invoke({})).status,403);assert.equal(writes,0);
 role='admin';assert.equal((await invoke({},'valid','https://untrusted.test')).status,403);
 assert.equal((await invoke({},'valid','http://localhost:8080','OPTIONS')).status,204);
 const vendor={action:'create',vendorId:'new-store',info:{name:'New Store',primaryColor:'#8B5A2B',logo:'S'},email:'vendor@example.test',password:'Strong-test-password'};
 assert.equal((await invoke({...vendor,vendorId:'bad/id'})).status,400);
 assert.equal((await invoke({...vendor,password:'short'})).status,400);
 assert.equal((await invoke({...vendor,info:{...vendor.info,whatsapp:'javascript:1'}})).status,400);
 assert.equal(created,0);
 failInsert=true;assert.equal((await invoke(vendor)).status,400);assert.equal(created,1);assert.equal(deleted,1);
 failInsert=false;assert.equal((await invoke(vendor)).status,200);assert.equal(created,2);
 assert.equal((await invoke({action:'delete',vendorId:'perfume'})).status,400);
 assert.equal((await invoke({action:'list'})).status,200);
 console.log('PASS: actual Edge Function TypeScript parses; authentication, admin-only access, CORS, validation, create cleanup, protected core vendors and account listing exercised with isolated SDK fixtures.');
})().catch(e=>{console.error(e);process.exitCode=1});
