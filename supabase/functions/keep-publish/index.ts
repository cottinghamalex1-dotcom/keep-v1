import { createClient } from '@supabase/supabase-js';
import { manifestSchema, ownedPaths } from './schema.ts';
const endpoint=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(endpoint,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(message:string,status=400)=>reply({error:message},status);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return fail('Method not allowed',405);
  try {
    const raw=await req.text();
    if(raw.length>2_000_000) return fail('This Keep is too large to publish.',413);
    let body;try {body=JSON.parse(raw);} catch{return fail('Invalid request');}
    if(body.action==='resolve') {
      if(!uuid(body.token)) return fail('This viewing link is invalid.',404);
      const {data:keep,error}=await admin.from('keeps').select('id,owner_id,published_project').eq('recipient_token',body.token).eq('status','ready').not('published_at','is',null).maybeSingle();
      if(error||!keep) return fail('This Keep is unavailable. Ask its creator for the viewing link.',404);
      const parsed=manifestSchema.safeParse(keep.published_project);
      if(!parsed.success) return fail('This Keep needs to be published again by its creator.',409);
      const project=parsed.data;
      const paths=ownedPaths(project,keep.owner_id,keep.id);
      const {data:signed,error:signError}=await admin.storage.from('keep-media').createSignedUrls(paths,86400);
      if(signError||!signed||signed.some(s=>s.error||!s.signedUrl)) return fail('A memory could not load. Please try again.',503);
      const urls=new Map(signed.map(s=>[s.path,s.signedUrl]));
      const {voicePath,memories,...settings}=project;
      return reply({project:{...settings,voiceUrl:urls.get(voicePath),memories:memories.map(({storagePath,...m})=>({...m,url:urls.get(storagePath)}))}});
    }
    if(body.action!=='publish') return fail('Unknown action',404);
    const auth=req.headers.get('Authorization');
    if(!auth?.startsWith('Bearer ')) return fail('Sign in to publish your Keep.',401);
    const client=createClient(endpoint,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:{user},error:authError}=await client.auth.getUser(auth.slice(7));
    if(authError||!user) return fail('Sign in to publish your Keep.',401);
    if(!uuid(body.keepId)) return fail('Invalid Keep ID');
    const {data:entitlement,error:entitlementError}=await admin.from('keep_purchases')
      .select('id,status').eq('owner_id',user.id).eq('keep_id',body.keepId)
      .in('status',['reserved','approved']).maybeSingle();
    if(entitlementError) return fail('We could not verify your paid Keep. Please try again.',503);
    if(!entitlement) return fail('Purchase a Keep before approving it for production.',402);
    const parsed=manifestSchema.safeParse(body.project);
    if(!parsed.success) return fail('Some Keep details are missing or invalid. Return to the editor and try again.');
    const project=parsed.data;
    let paths:string[];try {paths=ownedPaths(project,user.id,body.keepId);} catch{return fail('These memories do not belong to this Keep.',403);}
    // Check every file with the owner's credentials before making the snapshot visible.
    const {data:signed,error:signError}=await client.storage.from('keep-media').createSignedUrls(paths,60);
    if(signError||!signed||signed.some(s=>s.error||!s.signedUrl)) return fail('A memory has not finished uploading. Please try publishing again.',409);
    // RLS checks ownership for both insert and update. Never replace recipient_token.
    const {data,error}=await client.from('keeps').upsert({id:body.keepId,owner_id:user.id,recipient_name:project.recipientName,occasion:project.occasion,status:'ready',published_project:project,message_paragraphs:project.messageParagraphs,music_mood:project.musicMood,caption_style:project.captionStyle,visual_style:project.visualStyle,published_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'}).select('id,recipient_token').single();
    if(error) return fail('This Keep could not be published to your account. Please try again.',403);
    if(entitlement.status==='reserved') {
      const {error:approvalError}=await admin.from('keep_purchases')
        .update({status:'approved',approved_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq('id',entitlement.id).eq('status','reserved');
      if(approvalError) return fail('Your Keep was saved, but production approval could not be confirmed. Please retry.',503);
    }
    return reply({keepId:data.id,token:data.recipient_token});
  } catch {return fail('Unable to complete this request. Please try again.',500);}
});
