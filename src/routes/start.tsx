import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, RefreshCw } from "lucide-react";
import { claimAndListPurchases, currentKeepUser, activeOrderStatuses } from "@/lib/keep-commerce-client";
import type { KeepSession } from "@/lib/keep-cloud";

export const Route = createFileRoute("/start")({ component: StartKeep });

function StartKeep() {
  const [session,setSession]=useState<KeepSession|null>(null);
  const [state,setState]=useState<"checking"|"login"|"not_found"|"ready"|"error">("checking");
  const [error,setError]=useState("");
  const check=useCallback(async()=>{
    setState("checking");setError("");
    try{
      const current=await currentKeepUser();
      setSession(current);
      if(!current){setState("login");return;}
      const orders=await claimAndListPurchases(current);
      if(orders.some(o=>activeOrderStatuses.has(o.status))) {
        setState("ready");
        // Don't create entitlements based on redirect params. The database already verified payment.
        window.location.replace("/app");
      } else setState("not_found");
    }catch(e){setError(e instanceof Error?e.message:"Could not verify your purchase");setState("error");}
  },[]);
  useEffect(()=>{void check();},[check]);
  return <main className="flex min-h-dvh items-center justify-center bg-[#F7F5F2] px-5 text-[#28231F]"><section className="w-full max-w-md rounded-[22px] border border-[#DCD2C7] bg-white p-8 text-center">
    {state==="ready"?<CheckCircle2 className="mx-auto size-11 text-[#54755B]"/>:<LockKeyhole className="mx-auto size-11 text-[#8E7760]"/>}
    <h1 className="mt-5 font-display text-[34px]">{state==="checking"?"Checking your order…":state==="ready"?"Your Keep is ready.":state==="login"?"Welcome to Keep.":state==="not_found"?"Let's find your purchase.":"We couldn't verify yet."}</h1>
    <p className="mt-4 text-sm leading-7 text-[#726457]">{state==="login"?"Sign in or make an account using the email from your purchase.":state==="not_found"?"We don't see a verified paid order for this account. Make sure your email is confirmed and matches the checkout email.":"Keep only unlocks creation after the payment has been confirmed securely."}</p>
    {error&&<p role="alert" className="mt-4 text-xs text-red-700">{error}</p>}
    {state==="login"?<Link to="/app" className="mt-6 inline-flex w-full justify-center rounded-xl bg-[#25211D] px-5 py-3.5 text-sm text-white">Sign in or create your account</Link>:
    state!=="ready"&&<button type="button" onClick={()=>void check()} disabled={state==="checking"} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25211D] px-5 py-3.5 text-sm text-white disabled:opacity-50"><RefreshCw className="size-4"/>Check again</button>}
    <Link to="/shop" hash="packages" className="mt-4 block text-xs underline">View the three Keep packages</Link>
  </section></main>;
}
