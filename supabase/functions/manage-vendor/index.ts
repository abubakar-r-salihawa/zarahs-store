import { createClient } from 'npm:@supabase/supabase-js@2';

// Service credentials are supplied by Supabase and never reach the browser.
Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim());
  const headers = {'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
  const reply = (body: unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
  if(request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if(request.method !== 'POST') return reply({error:'Method not allowed'},405);
  if(!allowed.includes(origin)) return reply({error:'Origin not allowed'},403);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const token=(request.headers.get('authorization') || '').replace(/^Bearer /i,'');
    const {data:{user},error:authError}=await db.auth.getUser(token);
    if(authError || !user) return reply({error:'Sign in required'},401);
    const {data:staff,error:staffError}=await db.from('staff_members').select('role').eq('user_id',user.id).single();
    if(staffError || staff?.role!=='admin') return reply({error:'Administrator access required'},403);
    const {action,vendorId,info,email,password}=await request.json();
    if(action==='list') {
      const {data:members,error}=await db.from('staff_members').select('user_id,vendor_id').eq('role','vendor');
      if(error) throw error;
      const accounts=await Promise.all((members || []).map(async m=>{
        const {data,error}=await db.auth.admin.getUserById(m.user_id); if(error) throw error;
        return {vendorId:m.vendor_id,email:data.user.email};
      }));
      return reply({accounts});
    }
    if(!/^[a-z0-9-]{1,64}$/.test(vendorId) || !['create','update','delete'].includes(action)) throw new Error('Invalid vendor request');
    const {data:member}=await db.from('staff_members').select('user_id').eq('vendor_id',vendorId).maybeSingle();
    if(action==='delete') {
      if(['perfume','kitchen','variety'].includes(vendorId)) throw new Error('Core boutiques cannot be deleted');
      const {error}=await db.from('vendors').delete().eq('id',vendorId); if(error) throw error;
      // Cascading membership removal revokes access; the person keeps their shopper account.
      return reply({success:true});
    }
    if(!info?.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A store name and valid email are required');
    if(!/^#[0-9a-f]{6}$/i.test(info.primaryColor || '')) throw new Error('Use a six-digit hex color');
    if(info.whatsapp && !/^[0-9]{7,15}$/.test(info.whatsapp)) throw new Error('Use an international WhatsApp number with digits only');
    if((action==='create' || password) && (!password || password.length<8)) throw new Error('Use a password of at least 8 characters');
    const row={name:info.name.trim(),tagline:info.tagline || '',logo:info.logo || '🏪',primary_color:info.primaryColor,
      gradient:`linear-gradient(135deg, #090909, ${info.primaryColor})`,...(info.whatsapp!==undefined ? {whatsapp:info.whatsapp || null}: {})};
    if(action==='create') {
      const {data:created,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:info.name}});
      if(error) throw error;
      try {
        const {error:vError}=await db.from('vendors').insert({...row,id:vendorId,page:`store.html?vendor=${vendorId}`,categories:[]}); if(vError) throw vError;
        const {error:rError}=await db.from('staff_members').insert({user_id:created.user.id,role:'vendor',vendor_id:vendorId,name:info.name});
        if(rError) {await db.from('vendors').delete().eq('id',vendorId);throw rError;}
      } catch(e) {await db.auth.admin.deleteUser(created.user.id);throw e;}
    } else {
      if(!member) throw new Error('Migrate this vendor account to Supabase Auth before editing its login.');
      const {data:old,error:readError}=await db.from('vendors').select('*').eq('id',vendorId).single(); if(readError) throw readError;
      const {error:vError}=await db.from('vendors').update(row).eq('id',vendorId); if(vError) throw vError;
      const {error:aError}=await db.auth.admin.updateUserById(member.user_id,{email,...(password?{password}:{}),user_metadata:{display_name:info.name}});
      if(aError) {await db.from('vendors').update(old).eq('id',vendorId);throw aError;}
      const {error:rError}=await db.from('staff_members').update({name:info.name}).eq('user_id',member.user_id); if(rError) throw rError;
    }
    return reply({success:true});
  } catch(error) { return reply({error:error instanceof Error ? error.message : 'Unable to save vendor'},400); }
});
