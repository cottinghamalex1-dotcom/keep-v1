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
      const {voicePath,memories,keepOrder:_checkoutPreferences,...settings}=project;
      // Only expose a completed video for the exact published revision.
      // A previous film must not be shown after the creator edits the Keep.
      const bytes=new TextEncoder().encode(JSON.stringify(keep.published_project));
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const revision=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
      const {data:film}=await admin.from('keep_render_jobs').select('render_path')
        .eq('keep_id',keep.id).eq('owner_id',keep.owner_id)
        .eq('revision_hash',revision).eq('status','ready').maybeSingle();
      let renderedVideoUrl:string|undefined;
      if(film?.render_path){
        const {data:movie,error:movieError}=await admin.storage.from('keep-media').createSignedUrl(film.render_path,86400);
        if(!movieError&&movie?.signedUrl)renderedVideoUrl=movie.signedUrl;
      }
      return reply({project:{...settings,voiceUrl:urls.get(voicePath),renderedVideoUrl,memories:memories.map(({storagePath,...m})=>({...m,url:urls.get(storagePath)}))}});
    }
    if(body.action!=='publish') return fail('Unknown action',404);
    const auth=req.headers.get('Authorization');
    if(!auth?.startsWith('Bearer ')) return fail('Sign in to publish your Keep.',401);
    const client=createClient(endpoint,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:{user},error:authError}=await client.auth.getUser(auth.slice(7));
    if(authError||!user) return fail('Sign in to publish your Keep.',401);
    if(!uuid(body.keepId)) return fail('Invalid Keep ID');
    const parsed=manifestSchema.safeParse(body.project);
    if(!parsed.success) return fail('Some Keep details are missing or invalid. Return to the editor and try again.');
    const project=parsed.data;
    let paths:string[];try {paths=ownedPaths(project,user.id,body.keepId);} catch{return fail('These memories do not belong to this Keep.',403);}
    // Paid enforcement is enabled only when the Stripe checkout rollout has passed testing.
    if (Deno.env.get('KEEP_REQUIRE_STRIPE_PAYMENT') === 'true') {
      const cart=project.keepOrder;
      if (!cart) return fail('Choose and pay for your Keep package before publishing.',402);
      const {data:purchase,error:purchaseError}=await admin.from('keep_purchases')
        .select('id,status,package_tier,voice_count,extra_logo_cards,extra_engraved_cards,basic_engraving_upgrade')
        .eq('keep_id',body.keepId).eq('owner_id',user.id).not('stripe_checkout_session_id','is',null).maybeSingle();
      if(purchaseError||!purchase||!['reserved','approved','in_production','shipped'].includes(purchase.status))
        return fail('A verified Stripe purchase is required before publishing.',402);
      const voices=project.voiceMode==='together' ? (project.contributors?.length ?? 2) : 1;
      const engravedExtras=cart.extraCardStyle==='engraved' ? cart.extraCards : 0;
      const logoExtras=cart.extraCards-engravedExtras;
      if(cart.tier!==purchase.package_tier||voices>purchase.voice_count||
         engravedExtras>purchase.extra_engraved_cards||logoExtras>purchase.extra_logo_cards||
         (cart.tier==='basic'&&cart.engravingUpgrade&&!purchase.basic_engraving_upgrade))
        return fail('Your Keep selections include upgrades that have not been purchased.',402);
    }
    // Check every file with the owner's credentials before making the snapshot visible.
    const {data:signed,error:signError}=await client.storage.from('keep-media').createSignedUrls(paths,60);
    if(signError||!signed||signed.some(s=>s.error||!s.signedUrl)) return fail('A memory has not finished uploading. Please try publishing again.',409);
    // RLS checks ownership for both insert and update. Never replace recipient_token.
    const {data,error}=await client.from('keeps').upsert({id:body.keepId,owner_id:user.id,recipient_name:project.recipientName,occasion:project.occasion,status:'ready',published_project:project,message_paragraphs:project.messageParagraphs,music_mood:project.musicMood,caption_style:project.captionStyle,visual_style:project.visualStyle,published_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'}).select('id,recipient_token').single();
    if(error) return fail('This Keep could not be published to your account. Please try again.',403);
    return reply({keepId:data.id,token:data.recipient_token});
  } catch {return fail('Unable to complete this request. Please try again.',500);}
});
