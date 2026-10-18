const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
for(const file of fs.readdirSync('js').filter(f=>f.endsWith('.js'))) new vm.Script(fs.readFileSync('js/'+file,'utf8'),{filename:file});
let count=0;
for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
 const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if(match[1].includes('src=')) continue;
  new vm.Script(match[1].includes('module')?'(async()=>{'+match[2]+'})()':match[2],{filename:file});count++;
 }
 for(const match of source.matchAll(/(?:src|href)="([^"${}]+)"/g)) {
  const url=match[1].split(/[?#]/)[0];
  if(url && !/^(?:[a-z]+:|\/\/)/i.test(url)) assert.ok(fs.existsSync(url),file+': missing '+url);
 }
 const ids=[...source.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,file+': duplicate static IDs');
}
assert.ok(!/DISABLE ROW LEVEL SECURITY|DROP TABLE/i.test(fs.readFileSync('supabase_setup.sql','utf8')));
assert.ok(!/admin_credentials|vendor_credentials/.test(fs.readFileSync('js/vendor-store.js','utf8')));
JSON.parse(fs.readFileSync('vercel.json','utf8'));
console.log('PASS: all shared scripts and '+count+' inline scripts parse; local links/assets and static IDs checked; setup safety checks passed.');
