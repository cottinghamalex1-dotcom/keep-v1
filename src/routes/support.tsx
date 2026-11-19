import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, HelpCircle } from "lucide-react";
import { currentKeepUser, keepCommerceRequest, type SupportTicket } from "@/lib/keep-commerce-client";
import type { KeepSession } from "@/lib/keep-cloud";
export const Route = createFileRoute("/support")({ component: KeepSupport });

function KeepSupport() {
  const [session,setSession]=useState<KeepSession|null>(null);
  const [ready,setReady]=useState(false);
  const [subject,setSubject]=useState("");
  const [description,setDescription]=useState("");
  const [tickets,setTickets]=useState<SupportTicket[]>([]);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    let cancelled=false;
    void (async()=>{
      try{
        const current=await currentKeepUser();
        if(cancelled)return;
        setSession(current);
        if(current){
          const rows=await keepCommerceRequest<SupportTicket[]>("/rest/v1/keep_support_tickets?select=*&order=created_at.desc&limit=50",current);
          if(!cancelled)setTickets(rows);
        }
      }catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Could not load support");}
      finally{if(!cancelled)setReady(true);}
    })();
    return()=>{cancelled=true;};
  },[]);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    if(!session)return;
    setWorking(true);setMessage("");
    try{
      const newTickets=await keepCommerceRequest<SupportTicket[]>("/rest/v1/keep_support_tickets?select=*",session,{
        method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({owner_id:session.user.id,subject:subject.trim(),description:description.trim()})
      });
      setTickets(old=>[...newTickets,...old]);
      setSubject("");setDescription("");setMessage("Your report has been sent to the Keep support queue.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not send your report");}
    finally{setWorking(false);}
  };
  return <main className="min-h-dvh bg-[#F7F5F2] px-5 pb-16 pt-8 text-[#28231F]"><div className="mx-auto max-w-xl">
    <header className="flex items-center justify-between border-b border-[#D9D0C6] pb-6"><Link to="/app" aria-label="Keep home" className="font-display text-4xl">Keep</Link><Link to="/app" className="inline-flex items-center gap-2 text-xs"><ArrowLeft className="size-4"/> Back to account</Link></header>
    <div className="mt-12"><HelpCircle className="size-8 text-[#89735D]"/><h1 className="mt-4 font-display text-4xl">How can we help?</h1><p className="mt-3 text-sm leading-7 text-[#706357]">Tell us what happened, what you expected, and the screen or order affected. Your report is private to you and Keep support.</p></div>
    {!ready?<p className="mt-8 text-sm">Checking your account…</p>:!session?<div className="mt-8 rounded-2xl border border-[#DFD5C9] bg-white p-6"><p className="text-sm">Sign in to submit a report and track its progress.</p><Link to="/app" className="mt-5 inline-flex rounded-xl bg-[#25211D] px-5 py-3 text-sm text-white">Sign in or create an account</Link><p className="mt-4 text-xs text-[#746657]">Can't sign in? <a className="underline" href="mailto:support@keep.com">Email support</a>.</p></div>:
    <><form onSubmit={e=>void submit(e)} className="mt-8 space-y-4 rounded-2xl border border-[#DFD5C9] bg-white p-6">
      <label className="block text-xs font-semibold">What do you need help with?
        <input required minLength={5} maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="For example: My Keep won't load" className="mt-2 w-full rounded-xl border border-[#DDD3C9] p-3 text-base font-normal"/>
      </label>
      <label className="block text-xs font-semibold">Tell us more
        <textarea required minLength={10} maxLength={5000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the issue and any steps to reproduce it…" className="mt-2 w-full rounded-xl border border-[#DDD3C9] p-3 text-base font-normal"/>
      </label>
      <button disabled={working} className="min-h-12 w-full rounded-xl bg-[#25211D] text-sm font-semibold text-white disabled:opacity-50">{working?"Sending…":"Send report to Keep"}</button>
    </form>
    <section className="mt-10"><h2 className="font-display text-2xl">Your support requests</h2>
      {tickets.length===0?<p className="mt-3 text-sm text-[#7B6D5E]">No requests submitted.</p>:
      <div className="mt-4 space-y-3">{tickets.map(t=><div key={t.id} className="rounded-xl border border-[#DFD5C9] bg-white p-4"><p className="font-semibold text-sm">{t.subject}</p><p className="mt-2 text-xs text-[#736757]">{t.status.replace("_"," ")} · {new Date(t.created_at).toLocaleDateString()}</p>{t.status==="resolved"&&<p className="mt-3 flex items-center gap-2 text-xs text-[#4D7357]"><CheckCircle2 className="size-4"/>Marked resolved</p>}</div>)}</div>}
    </section></>}
    {message&&<p role="status" className="mt-5 text-sm text-[#6B5846]">{message}</p>}
  </div></main>;
}
