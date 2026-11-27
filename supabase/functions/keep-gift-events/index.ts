import { createClient } from "@supabase/supabase-js";
import { canConfirmDelivery, deliveryEmail, emailRetryable, uuid, validDeliveryDate, type DeliveryEvent, type EmailState } from "./policy.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false}});
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const reply = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const fail = (error:string,status=400) => reply({error},status);
const ensure = <T>(res:{data:T;error:unknown}): T => { if(res.error) throw new Error("Database request failed"); return res.data; };

async function identity(req:Request) {
  const header=req.headers.get("Authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  const client=createClient(url,anonKey,{global:{headers:{Authorization:header}},auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser(header.slice(7));
  return error || !data.user ? null : {user:data.user,client};
}
async function ownerStatus(userId:string,ids:string[]) {
  if (!ids.length) return {activities:{}};
  const keeps=ensure(await admin.from("keeps").select("id").eq("owner_id",userId).eq("status","ready").not("published_at","is",null).in("id",ids)) ?? [];
  const owned=keeps.map(k=>k.id);
  if(!owned.length) return {activities:{}};
  const [firstRes,purchaseRes,deliveryRes] = await Promise.all([
    admin.from("keep_first_experiences").select("keep_id,first_experienced_at").in("keep_id",owned),
    admin.from("keep_purchases").select("id,keep_id,status,shipped_at").eq("owner_id",userId).in("keep_id",owned).not("status","in","(refunded,cancelled)"),
    admin.from("keep_delivery_events").select("purchase_id,keep_id,delivered_at,email_state,email_sent_at").in("keep_id",owned),
  ]);
  const first=ensure(firstRes)??[], purchases=ensure(purchaseRes)??[], delivery=ensure(deliveryRes)??[];
  const purchaseIds=purchases.map(p=>p.id);
  const shipped=purchaseIds.length ? ensure(await admin.from("keep_fulfillment").select("purchase_id,shipped,shipping_carrier,tracking_number").in("purchase_id",purchaseIds))??[] : [];
  const activities=Object.fromEntries(owned.map(id=>[id,{
    firstExperiencedAt:first.find(x=>x.keep_id===id)?.first_experienced_at??null,
    shipments:purchases.filter(x=>x.keep_id===id).map(p=>{
      const f=shipped.find(x=>x.purchase_id===p.id);
      const d=delivery.find(x=>x.purchase_id===p.id);
      return {purchaseId:p.id,shipped:!!f?.shipped,shippedAt:p.shipped_at??null,carrier:f?.shipping_carrier??null,tracking:f?.tracking_number??null,deliveredAt:d?.delivered_at??null,emailSent:!!d?.email_sent_at};
    }),
  }]));
  return {activities};
}
// Only a confirmed delivery event may send an email. A transactional state
// claim prevents two operators or repeated requests from sending twice.
async function sendDeliveryEmail(event:DeliveryEvent, ownerId:string, recipientName:string|null) {
  if(!emailRetryable(event.email_state)) return event.email_state;
  const claim=ensure(await admin.from("keep_delivery_events").update({email_state:"sending",email_attempted_at:new Date().toISOString()})
    .eq("purchase_id",event.purchase_id).in("email_state",["pending","failed","unconfigured"]).select("purchase_id").maybeSingle());
  if(!claim) return (ensure(await admin.from("keep_delivery_events").select("email_state").eq("purchase_id",event.purchase_id).single())).email_state as EmailState;
  let state:EmailState="failed";
  let accepted=false;
  try {
    const key=Deno.env.get("RESEND_API_KEY"), from=Deno.env.get("KEEP_EMAIL_FROM");
    if(!key||!from) state="unconfigured";
    else {
      const {data:{user},error}=await admin.auth.admin.getUserById(ownerId);
      if(error||!user?.email||!user.email_confirmed_at) state="failed";
      else {
        try {
          const response=await fetch("https://api.resend.com/emails",{
            method:"POST",signal:AbortSignal.timeout(15_000),
            headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"keep-delivery/"+event.purchase_id},
            body:JSON.stringify({from,to:[user.email],...deliveryEmail(recipientName)}),
          });
          if(response.ok){accepted=true;state="sent";}
          // An uncertain network/provider response must not lead to blind resends.
          else state=response.status>=500||response.status===409?"unknown":"failed";
        }catch{state="unknown";}
      }
    }
  }catch{state="failed";}
  ensure(await admin.from("keep_delivery_events").update({email_state:state,email_sent_at:accepted?new Date().toISOString():null}).eq("purchase_id",event.purchase_id).eq("email_state","sending"));
  return state;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(req.method!=="POST") return fail("Method not allowed",405);
  try{
    const raw=await req.text();
    if(raw.length>32_000) return fail("Request too large",413);
    let body;try{body=JSON.parse(raw);}catch{return fail("Invalid request");}
    if(body?.action==="first-experience"){
      if(!uuid(body.token)) return fail("Invalid viewing link",404);
      // A signed-in creator's views must not count. An invalid/expired supplied
      // login fails closed rather than misclassifying the creator as a recipient.
      const viewer=await identity(req);
      if(req.headers.has("Authorization")&&!viewer) return fail("Session could not be verified",401);
      const keep=ensure(await admin.from("keeps").select("id,owner_id").eq("recipient_token",body.token).eq("status","ready").not("published_at","is",null).maybeSingle());
      if(!keep) return fail("Keep unavailable",404);
      if(viewer?.user.id!==keep.owner_id) {
        ensure(await admin.from("keep_first_experiences").upsert({keep_id:keep.id},{onConflict:"keep_id",ignoreDuplicates:true}));
      }
      // Never return a timestamp, owner, viewer identity or tracking data publicly.
      return reply({ok:true});
    }
    const actor=await identity(req);
    if(!actor) return fail("Sign in to Keep",401);
    if(body?.action==="owner-status"){
      if(!Array.isArray(body.keepIds)||body.keepIds.length>100||!body.keepIds.every(uuid)) return fail("Invalid Keeps");
      return reply(await ownerStatus(actor.user.id,[...new Set<string>(body.keepIds)]));
    }
    if(!["admin-list","confirm-delivery","retry-delivery-email"].includes(body?.action)) return fail("Unknown action",404);
    const permitted=ensure(await actor.client.rpc("keep_is_admin"));
    if(permitted!==true) return fail("Operator access required",403);
    if(body.action==="admin-list"){
      const list=ensure(await admin.from("keep_fulfillment").select("purchase_id,order_reference,recipient_name,shipping_carrier,tracking_number,shipped,keep_purchases!inner(id,keep_id,owner_id,status,shipped_at)").eq("shipped",true).not("keep_purchases.status","in","(refunded,cancelled)").order("updated_at",{ascending:false}).limit(100))??[];
      const ids=list.map(f=>f.purchase_id);
      const events=ids.length ? ensure(await admin.from("keep_delivery_events").select("purchase_id,delivered_at,email_state,email_sent_at").in("purchase_id",ids))??[] : [];
      return reply({emailConfigured:!!(Deno.env.get("RESEND_API_KEY")&&Deno.env.get("KEEP_EMAIL_FROM")),shipments:list.map(f=>{
        const purchase=Array.isArray(f.keep_purchases)?f.keep_purchases[0]:f.keep_purchases;
        return {purchaseId:f.purchase_id,orderReference:f.order_reference,recipientName:f.recipient_name,carrier:f.shipping_carrier,tracking:f.tracking_number,shippedAt:purchase?.shipped_at??null,canConfirm:canConfirmDelivery(f,purchase),delivery:events.find(e=>e.purchase_id===f.purchase_id)??null};
      })});
    }
    if(!uuid(body.purchaseId)) return fail("Invalid order");
    const [shipmentResult,purchaseResult]=await Promise.all([
      admin.from("keep_fulfillment").select("purchase_id,shipped,shipping_carrier,tracking_number").eq("purchase_id",body.purchaseId).maybeSingle(),
      admin.from("keep_purchases").select("id,keep_id,owner_id,status,shipped_at,paid_at").eq("id",body.purchaseId).maybeSingle(),
    ]);
    const shipment=ensure(shipmentResult),purchase=ensure(purchaseResult);
    if(!canConfirmDelivery(shipment,purchase)||!purchase?.keep_id||!purchase.owner_id) return fail("Order must be shipped with confirmed tracking before delivery can be recorded",409);
    const keep=ensure(await admin.from("keeps").select("id,owner_id,recipient_name").eq("id",purchase.keep_id).eq("owner_id",purchase.owner_id).eq("status","ready").not("published_at","is",null).maybeSingle());
    if(!keep) return fail("This order is not linked to its creator's published Keep",409);
    let event=ensure(await admin.from("keep_delivery_events").select("*").eq("purchase_id",purchase.id).maybeSingle()) as DeliveryEvent|null;
    if(body.action==="confirm-delivery"){
      if(!event){
        const deliveredAt=validDeliveryDate(body.deliveredAt,purchase.shipped_at??purchase.paid_at);
        if(!deliveredAt) return fail("Use the delivery date and time shown by the carrier");
        ensure(await admin.from("keep_delivery_events").upsert({purchase_id:purchase.id,keep_id:keep.id,delivered_at:deliveredAt,confirmation_source:"carrier_verified_operator"},{onConflict:"purchase_id",ignoreDuplicates:true}));
        event=ensure(await admin.from("keep_delivery_events").select("*").eq("purchase_id",purchase.id).single()) as DeliveryEvent;
      } else return reply({delivery:event}); // confirmation is immutable and cannot resend email
    }else if(!event) return fail("Delivery has not been confirmed",409);
    if(event.keep_id!==keep.id) return fail("Order association changed",409);
    await sendDeliveryEmail(event,purchase.owner_id,keep.recipient_name);
    return reply({delivery:ensure(await admin.from("keep_delivery_events").select("*").eq("purchase_id",purchase.id).single())});
  }catch{
    return fail("Gift updates could not be completed. Please retry or check the order status.",503);
  }
});
