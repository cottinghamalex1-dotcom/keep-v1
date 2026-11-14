import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, PenLine, ShieldCheck } from "lucide-react";
import { claimAndListPurchases, currentKeepUser, keepCommerceRequest, type Fulfillment, type Purchase } from "@/lib/keep-commerce-client";
import type { KeepSession } from "@/lib/keep-cloud";

export const Route = createFileRoute("/personalize")({ component: PersonalizeCards });

function CardDetails({order,fulfillment,session}: {order:Purchase;fulfillment:Fulfillment;session:KeepSession}) {
  const [first,setFirst]=useState(fulfillment.engraving_1);
  const [second,setSecond]=useState(fulfillment.engraving_2);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const editable= !fulfillment.engraved && ["paid","reserved","approved"].includes(order.status);
  const basic=fulfillment.package_tier==="basic";
  const deluxe=fulfillment.package_tier==="deluxe"&&fulfillment.card_count>1;
  const save=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setMessage("");
    try{
      await keepCommerceRequest<void>("/rest/v1/rpc/keep_submit_engravings",session,{
        method:"POST",body:JSON.stringify({p_purchase_id:order.id,p_first:first,p_second:deluxe?second:""})
      });
      setMessage("Your personalization has been saved for fulfillment.");
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to save engraving");}
    finally{setBusy(false);}
  };
  return <article className="rounded-[22px] border border-[#DDD3C9] bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-widest text-[#856F5B]">{fulfillment.package_tier} · {fulfillment.card_count} card(s)</p><h2 className="mt-2 font-display text-[28px]">Order {fulfillment.order_reference}</h2></div><ShieldCheck className="size-6 text-[#89735F]"/></div>
    {basic?<p className="mt-5 text-sm leading-7 text-[#746455]">Your Basic card comes with the Keep logo. There is no personalized engraving to submit.</p>:
    <form onSubmit={e=>void save(e)} className="mt-6 space-y-4">
      <p className="text-sm leading-7 text-[#716254]">Your words will be laser engraved on the front of {deluxe?"each metal card":"your metal card"}. Keep each message short and meaningful.</p>
      <label className="block text-xs font-semibold">Card 1 engraving
        <textarea rows={2} maxLength={80} required disabled={!editable} value={first} onChange={e=>setFirst(e.target.value)} placeholder="For Mom, with all my love" className="mt-2 w-full rounded-xl border border-[#DBD0C5] p-4 text-base font-normal disabled:bg-[#F5F2EC]"/>
        <span className="mt-1 block text-right text-[10px] text-[#897565]">{first.length} / 80 characters</span>
      </label>
      {deluxe&&<label className="block text-xs font-semibold">Card 2 engraving
        <textarea rows={2} maxLength={80} required disabled={!editable} value={second} onChange={e=>setSecond(e.target.value)} placeholder="Always worth keeping" className="mt-2 w-full rounded-xl border border-[#DBD0C5] p-4 text-base font-normal disabled:bg-[#F5F2EC]"/>
        <span className="mt-1 block text-right text-[10px] text-[#897565]">{second.length} / 80 characters</span>
      </label>}
      <button disabled={busy||!editable||!first.trim()||(deluxe&&!second.trim())} className="min-h-12 w-full rounded-xl bg-[#25211D] text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save engraving details"}</button>
      {!editable&&<p className="text-xs text-[#8C6C57]">Engraving changes are locked once production starts.</p>}
    </form>}
    {message&&<p role="status" className="mt-4 flex items-center gap-2 text-xs text-[#527053]"><CheckCircle2 className="size-4"/>{message}</p>}
  </article>;
}
function PersonalizeCards() {
  const [session,setSession]=useState<KeepSession|null>(null);
  const [purchases,setPurchases]=useState<Purchase[]>([]);
  const [details,setDetails]=useState<Fulfillment[]>([]);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      try {
        const user=await currentKeepUser();
        if(cancelled)return;
        setSession(user);
        if(user){
          const purchases=await claimAndListPurchases(user);
          const details=await keepCommerceRequest<Fulfillment[]>("/rest/v1/keep_fulfillment?select=*&order=created_at.desc",user);
          if(!cancelled){setPurchases(purchases);setDetails(details);}
        }
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load order details");}
      finally{if(!cancelled)setReady(true);}
    })();
    return()=>{cancelled=true;};
  },[]);
  const eligible=purchases.filter(p=>!["cancelled","refunded"].includes(p.status));
  return <main className="min-h-dvh bg-[#F7F5F2] px-5 pb-16 pt-8 text-[#28231F]"><div className="mx-auto max-w-[710px]">
    <header className="flex items-center justify-between border-b border-[#D9D0C6] pb-6"><Link to="/app" className="font-display text-4xl">Keep</Link><Link to="/app" className="inline-flex items-center gap-2 text-xs"><ArrowLeft className="size-4"/> Back to home</Link></header>
    <div className="mt-12"><PenLine className="size-7 text-[#8F765E]"/><h1 className="mt-4 font-display text-4xl">Make it yours.</h1><p className="mt-3 text-sm leading-7 text-[#716457]">Personalize the words engraved onto your Keep cards. Each order stays connected to your account.</p></div>
    {!ready?<p className="mt-8 text-sm">Loading your purchased cards…</p>:!session?<Link to="/app" className="mt-8 inline-flex rounded-xl bg-[#25211D] px-6 py-3 text-sm text-white">Sign in to Keep</Link>:
    eligible.length===0?<div className="mt-8 rounded-2xl border border-[#DDD3C9] bg-white p-6"><p className="text-sm">You don't have a verified card purchase on this account yet.</p><Link to="/shop#packages" className="mt-4 inline-flex rounded-xl bg-[#25211D] px-6 py-3 text-sm text-white">Explore the three packages</Link></div>:
    <div className="mt-8 space-y-5">{eligible.map(p=>{const row=details.find(f=>f.purchase_id===p.id);return row?<CardDetails key={p.id} order={p} fulfillment={row} session={session}/>:<p key={p.id} className="text-sm">Order details for {p.shopify_order_id} are being prepared.</p>;})}</div>}
    {error&&<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
  </div></main>;
}
