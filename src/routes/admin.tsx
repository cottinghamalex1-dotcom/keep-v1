import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, LockKeyhole, Package, RefreshCw, Shield, Truck, AlertCircle } from "lucide-react";
import { currentKeepUser, isKeepAdmin, keepCommerceRequest, type Fulfillment, type Purchase, type SupportTicket } from "@/lib/keep-commerce-client";
import { viewingLink } from "@/lib/keep-publish";
import type { KeepSession } from "@/lib/keep-cloud";

export const Route = createFileRoute("/admin")({ component: KeepAdmin });

type Step = "engraving_approved" | "engraved" | "nfc_written" | "nfc_tested" | "packed" | "shipped";
const steps: { key: Step; label: string }[] = [
  { key: "engraving_approved", label: "Artwork" },
  { key: "engraved", label: "Engraved" },
  { key: "nfc_written", label: "NFC" },
  { key: "nfc_tested", label: "Tested" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
];

const encodeCsv = (value: unknown) => {
  const raw = String(value ?? "");
  // Protect spreadsheet users from formula injection in customer-provided fields.
  const safe = /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};
const label = "text-[11px] font-semibold uppercase tracking-[.13em] text-[#7B695A]";
const control = "w-full rounded-lg border border-[#DDD3C9] bg-white px-3 py-2.5 text-sm text-[#2C2722]";

function OrderCard({ row, purchase, keepToken, onPatch, saving }: {
  row: Fulfillment; purchase?: Purchase; keepToken?: string;
  onPatch: (id:string, changes: Partial<Fulfillment>) => Promise<void>;
  saving: boolean;
}) {
  const [fields, setFields] = useState({
    engraving_1:row.engraving_1, engraving_2:row.engraving_2,
    recipient_name:row.recipient_name ?? "", shipping_name:row.shipping_name ?? "",
    shipping_address1:row.shipping_address1 ?? "",
    shipping_address2:row.shipping_address2 ?? "",
    shipping_city:row.shipping_city ?? "",
    shipping_region:row.shipping_region ?? "",
    shipping_postal_code:row.shipping_postal_code ?? "",
    shipping_country:row.shipping_country ?? "",
    shipping_carrier:row.shipping_carrier ?? "", tracking_number:row.tracking_number ?? "",
    card_url:row.card_url ?? "", admin_notes:row.admin_notes,
  });
  const set = (key: keyof typeof fields, value:string) => setFields(current => ({ ...current, [key]: value }));
  const finishedUrl = keepToken ? viewingLink(keepToken) : fields.card_url;
  const orderStatus = purchase?.status ?? "Unknown";
  return <article className="rounded-[20px] border border-[#DED5CB] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className={label}>Verified purchase · {orderStatus}</p>
        <h3 className="mt-1 font-display text-2xl">Order {row.order_reference}</h3>
        <p className="mt-1 text-xs text-[#796B5D]">{row.package_tier.toUpperCase()} · {row.card_count} card(s) · {purchase?.purchaser_email ?? row.shipping_email ?? "Email pending"}</p>
      </div>
      <span className={"rounded-full px-3 py-1 text-xs " + (row.shipped ? "bg-[#E3EFE4] text-[#34643D]" : row.issue_flag ? "bg-[#F8E1DA] text-[#A14F37]" : "bg-[#F2EAE0] text-[#6F5A44]")}>{row.shipped ? "Shipped" : row.issue_flag ? "Needs attention" : "In queue"}</span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {steps.map(({key,label:stepLabel}) => <label key={key} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-[#E7DED4] bg-[#FCF9F5] px-1 py-3 text-center text-[11px]">
        <input type="checkbox" className="size-5 accent-[#4A624D]" checked={row[key]} disabled={saving} onChange={e => void onPatch(row.purchase_id, {[key]:e.target.checked})} />
        <span>{stepLabel}</span>
      </label>)}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className={label}>Engraving — card 1
        <textarea rows={2} maxLength={80} className={control + " mt-2 normal-case tracking-normal"} value={fields.engraving_1} disabled={row.package_tier==="basic"} onChange={e=>set("engraving_1",e.target.value)} placeholder={row.package_tier==="basic"?"Keep logo only":"Engraved message"}/>
      </label>
      <label className={label}>Engraving — card 2
        <textarea rows={2} maxLength={80} className={control + " mt-2 normal-case tracking-normal"} value={fields.engraving_2} disabled={row.card_count<2 || row.package_tier!=="deluxe"} onChange={e=>set("engraving_2",e.target.value)} placeholder="Deluxe second card"/>
      </label>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {([
        ["recipient_name","Recipient"],["shipping_name","Ship to"],
        ["shipping_address1","Address"],["shipping_address2","Address line 2"],
        ["shipping_city","City"],["shipping_region","State / region"],
        ["shipping_postal_code","ZIP / postal code"],["shipping_country","Country"],
        ["shipping_carrier","Carrier"],["tracking_number","Tracking number"]
      ] as const).map(([key,title])=><label key={key} className={label}>{title}
        <input className={control+" mt-2 normal-case tracking-normal"} value={fields[key]} onChange={e=>set(key,e.target.value)} />
      </label>)}
    </div>
    <label className={label+" mt-4 block"}>Permanent NFC viewing URL
      <input className={control+" mt-2 normal-case tracking-normal"} value={finishedUrl} readOnly={!!keepToken} onChange={e=>set("card_url",e.target.value)} placeholder="Created after the Keep is published"/>
    </label>
    {finishedUrl && <button type="button" className="mt-2 text-xs underline" onClick={() => void navigator.clipboard.writeText(finishedUrl)}>Copy link for NFC writer</button>}
    <label className={label+" mt-4 block"}>Fulfillment notes
      <textarea rows={2} className={control+" mt-2 normal-case tracking-normal"} value={fields.admin_notes} onChange={e=>set("admin_notes",e.target.value)} placeholder="Quality checks, shipping problems, special instructions"/>
    </label>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button disabled={saving} className="rounded-xl bg-[#25211D] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50" onClick={()=>void onPatch(row.purchase_id,fields)}>{saving ? "Saving…" : "Save order details"}</button>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={row.issue_flag} disabled={saving} onChange={e=>void onPatch(row.purchase_id,{issue_flag:e.target.checked})}/> Flag problem</label>
    </div>
  </article>;
}

function KeepAdmin() {
  const [session, setSession] = useState<KeepSession|null>(null);
  const [gate, setGate] = useState<"checking"|"login"|"denied"|"ready">("checking");
  const [queue, setQueue] = useState<Fulfillment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [tokens, setTokens] = useState<Record<string,string>>({});
  const [working, setWorking] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [section,setSection] = useState<"orders"|"support">("orders");

  const load = async (current:KeepSession) => {
    const [orders, paid, inbox, keeps] = await Promise.all([
      keepCommerceRequest<Fulfillment[]>("/rest/v1/keep_fulfillment?select=*&order=created_at.desc&limit=500",current),
      keepCommerceRequest<Purchase[]>("/rest/v1/keep_purchases?select=id,shopify_order_id,purchaser_email,keep_id,status,paid_at,created_at&order=created_at.desc&limit=500",current),
      keepCommerceRequest<SupportTicket[]>("/rest/v1/keep_support_tickets?select=*&order=created_at.desc&limit=500",current),
      keepCommerceRequest<{id:string;recipient_token:string}[]>("/rest/v1/keeps?select=id,recipient_token&limit=500",current),
    ]);
    setQueue(orders);setPurchases(paid);setTickets(inbox);
    setTokens(Object.fromEntries(keeps.map(k=>[k.id,k.recipient_token])));
  };
  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      try {
        const current=await currentKeepUser();
        if(cancelled)return;
        if(!current){setGate("login");return;}
        setSession(current);
        if(!await isKeepAdmin(current)){setGate("denied");return;}
        await load(current);
        if(!cancelled)setGate("ready");
      }catch(e){if(!cancelled){setError(e instanceof Error?e.message:"Could not load the admin dashboard");setGate("denied");}}
    })();
    return ()=>{cancelled=true;};
  },[]);
  const refresh = async()=>{
    if(!session)return;
    try{setWorking("refresh");await load(session);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Refresh failed");}
    finally{setWorking(null);}
  };
  const patchOrder = async(id:string,changes:Partial<Fulfillment>)=>{
    if(!session)return;setWorking(id);setError("");
    try{
      const [updated]=await keepCommerceRequest<Fulfillment[]>("/rest/v1/keep_fulfillment?purchase_id=eq."+encodeURIComponent(id)+"&select=*",session,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(changes)});
      if(!updated)throw new Error("The order was not updated.");
      setQueue(old=>old.map(o=>o.purchase_id===id?updated:o));
    }catch(e){setError(e instanceof Error?e.message:"Could not update order");}
    finally{setWorking(null);}
  };
  const patchTicket = async(id:string,changes:Partial<SupportTicket>)=>{
    if(!session)return;setWorking(id);setError("");
    try{
      const [updated]=await keepCommerceRequest<SupportTicket[]>("/rest/v1/keep_support_tickets?id=eq."+encodeURIComponent(id)+"&select=*",session,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(changes)});
      if(!updated)throw new Error("Could not save the support case.");
      setTickets(old=>old.map(t=>t.id===id?updated:t));
    }catch(e){setError(e instanceof Error?e.message:"Could not update ticket");}
    finally{setWorking(null);}
  };
  const exportCsv=()=>{
    const headings=["Order ID","Purchase status","Package","Cards","Customer email","Recipient","Ship to","Address 1","Address 2","City","State","Postal code","Country","Engraving card 1","Engraving card 2","Approved","Engraved","NFC written","NFC tested","Packed","Shipped","NFC URL","Carrier","Tracking","Issue flagged","Notes"];
    const data=queue.map(o=>{
      const p=purchases.find(x=>x.id===o.purchase_id);
      return [o.order_reference,p?.status??"",o.package_tier,o.card_count,p?.purchaser_email??o.shipping_email,o.recipient_name,o.shipping_name,o.shipping_address1,o.shipping_address2,o.shipping_city,o.shipping_region,o.shipping_postal_code,o.shipping_country,o.engraving_1,o.engraving_2,o.engraving_approved,o.engraved,o.nfc_written,o.nfc_tested,o.packed,o.shipped,p?.keep_id&&tokens[p.keep_id]?viewingLink(tokens[p.keep_id]):o.card_url,o.shipping_carrier,o.tracking_number,o.issue_flag,o.admin_notes].map(encodeCsv).join(",");
    });
    const blob=new Blob(["\uFEFF",headings.map(encodeCsv).join(","),"\r\n",data.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="keep-fulfillment-orders.csv";a.click();URL.revokeObjectURL(url);
  };
  const openTickets=tickets.filter(t=>t.status!=="resolved").length;
  return <main className="min-h-dvh bg-[#F7F5F2] px-5 pb-16 pt-8 text-[#27221E]">
    <div className="mx-auto max-w-[1120px]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8CFC5] pb-6">
        <Link to="/app" className="font-display text-4xl">Keep</Link>
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#6A5849]"><Shield className="size-4"/> Private admin</span>
      </header>
      {gate!=="ready" ? <section className="mx-auto mt-20 max-w-md rounded-2xl border border-[#DED5CB] bg-white p-8 text-center">
        <LockKeyhole className="mx-auto mb-4 size-9 text-[#85715C]"/>
        <h1 className="font-display text-3xl">{gate==="checking"?"Checking secure access…":gate==="login"?"Admin sign in required":"Admin access unavailable"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#716457]">{gate==="login"?"Use your Keep account to access the private dashboard.":"Only a verified, approved Keep administrator can view customer data."}</p>
        {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
        <Link to="/app" className="mt-6 inline-flex rounded-xl bg-[#24201C] px-6 py-3 text-sm text-white">Sign in to Keep</Link>
      </section> : <>
        <div className="mt-10 flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="font-display text-4xl sm:text-5xl">Fulfillment studio.</h1><p className="mt-3 text-sm text-[#716457]">Paid orders, engraving, NFC setup, shipping, and customer support.</p></div>
          <div className="flex gap-2"><button onClick={()=>void refresh()} disabled={!!working} className="inline-flex items-center gap-2 rounded-xl border border-[#D8CFC5] px-4 py-3 text-xs"><RefreshCw className="size-4"/>Refresh</button><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-[#25211D] px-4 py-3 text-xs font-semibold text-white"><Download className="size-4"/>Export spreadsheet (CSV)</button></div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Paid orders",purchases.filter(p=>!["cancelled","refunded"].includes(p.status)).length],["To fulfill",queue.filter(q=>!q.shipped).length],["Shipped",queue.filter(q=>q.shipped).length],["Open issues",openTickets]].map(([name,count])=><div className="rounded-2xl border border-[#DED5CB] bg-white p-5" key={name}><p className="text-xs text-[#796A5A]">{name}</p><strong className="mt-2 block font-display text-4xl font-normal">{count}</strong></div>)}
        </div>
        {error&&<p role="alert" className="mt-5 rounded-lg bg-[#FDE8E1] p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-8 flex gap-5 border-b border-[#D7CFC6] text-sm">
          <button onClick={()=>setSection("orders")} className={"pb-3 "+(section==="orders"?"border-b-2 border-[#27221E] font-semibold":"text-[#88786A]")}><Package className="mr-2 inline size-4"/>Orders</button>
          <button onClick={()=>setSection("support")} className={"pb-3 "+(section==="support"?"border-b-2 border-[#27221E] font-semibold":"text-[#88786A]")}><AlertCircle className="mr-2 inline size-4"/>Support ({openTickets})</button>
        </div>
        {section==="orders"?<div className="mt-6 space-y-4">
          {queue.length===0?<div className="rounded-2xl border border-[#DED5CB] bg-white p-10 text-center"><Truck className="mx-auto size-9 text-[#8B7765]"/><h2 className="mt-3 font-display text-3xl">No orders yet.</h2><p className="mt-2 text-sm text-[#716457]">Verified paid purchases will appear here once checkout and the signed order webhook go live.</p></div>:
            queue.map(row=>{const purchase=purchases.find(p=>p.id===row.purchase_id);return <OrderCard key={row.purchase_id} row={row} purchase={purchase} keepToken={purchase?.keep_id?tokens[purchase.keep_id]:undefined} saving={working===row.purchase_id} onPatch={patchOrder}/>})}
        </div>:<div className="mt-6 space-y-4">
          {tickets.length===0?<div className="rounded-2xl border border-[#DED5CB] bg-white p-10 text-center"><CheckCircle2 className="mx-auto size-9 text-[#66816D]"/><h2 className="mt-3 font-display text-3xl">No support cases.</h2><p className="mt-2 text-sm">Customer reports will appear here for review.</p></div>:
            tickets.map(t=><SupportCase key={t.id} ticket={t} saving={working===t.id} onPatch={patchTicket}/>)}
        </div>}
        <div className="mt-10 border-t border-[#D8CFC5] pt-6 text-xs text-[#78695A]">For advanced diagnostics, use the access-controlled <a className="underline" href="https://supabase.com/dashboard/project/lwkzhpwugtosbidxvdcr" target="_blank" rel="noreferrer">database console <ExternalLink className="inline size-3"/></a>. Payment verification and carrier labels are handled separately from this checklist.</div>
      </>}
    </div>
  </main>;
}
function SupportCase({ticket,saving,onPatch}: {ticket:SupportTicket;saving:boolean;onPatch:(id:string,changes:Partial<SupportTicket>)=>Promise<void>}) {
  const [notes,setNotes]=useState(ticket.admin_notes);
  return <article className="rounded-2xl border border-[#DDD3C9] bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">{ticket.subject}</h2><span className="text-xs text-[#7F705F]">{new Date(ticket.created_at).toLocaleDateString()}</span></div>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{ticket.description}</p>
    <div className="mt-4 flex flex-wrap items-end gap-4">
      <label className={label}>Status
        <select value={ticket.status} disabled={saving} onChange={e=>void onPatch(ticket.id,{status:e.target.value as SupportTicket["status"]})} className={control+" mt-2"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>
      </label>
      <label className={label}>Priority
        <select value={ticket.priority} disabled={saving} onChange={e=>void onPatch(ticket.id,{priority:e.target.value as SupportTicket["priority"]})} className={control+" mt-2"}><option value="normal">Normal</option><option value="urgent">Urgent</option></select>
      </label>
    </div>
    <label className={label+" mt-4 block"}>Internal resolution notes
      <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} className={control+" mt-2 normal-case tracking-normal"} />
    </label>
    <button className="mt-3 rounded-xl bg-[#27231F] px-5 py-3 text-xs text-white disabled:opacity-50" disabled={saving} onClick={()=>void onPatch(ticket.id,{admin_notes:notes})}>Save notes</button>
  </article>;
}
