const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let handler,role='admin',rpcCalls=0,failRpc=false;
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/manage-vendor-access/index.ts','utf8'));
vm.runInNewContext(source,{Deno:{serve:fn=>handler=fn,env:{get:()=> 'fixture'}},Response,console,
 fetch:async(url,options)=>{
  if(url.endsWith('/auth/v1/user')) return Response.json({id:'admin',app_metadata:{role}},{status:options.headers.authorization==='Bearer valid'?200:401});
  rpcCalls++;return Response.json(failRpc?{message:'Database rejected change'}:{success:true},{status:failRpc?400:200});
 }});
const invoke=(body,token='valid',method='POST')=>handler(new Request('https://fixture.test',{method,headers:{authorization:'Bearer '+token,origin:'https://zarahs-store.vercel.app'},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
(async()=>{
 assert.equal((await invoke({},'invalid')).status,401);
 role='vendor';assert.equal((await invoke({action:'list'})).status,403);assert.equal(rpcCalls,0);
 role='admin';assert.equal((await invoke({action:'unknown'})).status,400);
 assert.equal((await invoke({action:'list'})).status,200);assert.equal(rpcCalls,1);
 failRpc=true;assert.equal((await invoke({action:'upsert',payload:{id:'test'}})).status,400);
 assert.equal((await invoke({},'valid','GET')).status,405);
 console.log('PASS: deployed-contract Edge Function authentication, admin role, action validation and database failure propagation.');
})().catch(e=>{console.error(e);process.exitCode=1});
