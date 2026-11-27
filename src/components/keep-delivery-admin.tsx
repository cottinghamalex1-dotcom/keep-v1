import { useEffect, useState } from "react";
import { PackageCheck, RefreshCcw } from "lucide-react";
import { confirmGiftDelivery, giftDate, GiftRequestError, listOperatorShipments, retryGiftDeliveryEmail, type OperatorShipment } from "@/lib/keep-gift-activity";

const currentLocalTime=()=>{
  const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60_000).toISOString().slice(0,16);
};
export function KeepDeliveryAdmin({accountId}:{accountId:string}) {
  const [shipments,setShipments]=useState<OperatorShipment[]|null>(null);
  const [emailConfigured,setEmailConfigured]=useState(false);
  const [dates,setDates]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setShipments(null);setError("");
    void listOperatorShipments().then(result=>{
      if(!cancelled){setShipments(result.shipments);setEmailConfigured(result.emailConfigured);}
    }).catch(err=>{
      // Ordinary customers never see operator controls or access errors.
      if(!cancelled&&!(err instanceof GiftRequestError&&[401,403].includes(err.status)))setError("Couldn't load delivery updates.");
    });
    return()=>{cancelled=true;};
  },[accountId,reload]);
  const confirm=async(s:OperatorShipment)=>{
    const date=dates[s.purchaseId];
    if(!date){setError("Enter the delivery date and time shown by the carrier.");return;}
    if(!window.confirm("Confirm this shipment was delivered? Only continue if the carrier tracking shows it was delivered. Keep will send the creator one delivery notification."))return;
    setBusy(s.purchaseId);setError("");
    try{await confirmGiftDelivery(s.purchaseId,new Date(date).toISOString());setReload(n=>n+1);}
    catch(e){setError(e instanceof Error?e.message:"Delivery could not be confirmed.");}
    finally{setBusy("");}
  };
  const retry=async(s:OperatorShipment)=>{
    setBusy(s.purchaseId);setError("");
    try{await retryGiftDeliveryEmail(s.purchaseId);setReload(n=>n+1);}
    catch(e){setError(e instanceof Error?e.message:"Email could not be retried.");}
    finally{setBusy("");}
  };
  if(shipments===null)return null;
  return <section className="mb-8 rounded-[20px] border border-[#D9C9B8] bg-[#FFFDF9] p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-[26px] text-[#34291F]"><PackageCheck className="mr-2 inline size-5"/>Delivery updates</h2><button type="button" onClick={()=>setReload(n=>n+1)} aria-label="Refresh shipments"><RefreshCcw className="size-4 text-[#806D59]"/></button></div>
    <p className="mt-2 text-xs leading-6 text-[#806D59]">Operator only. Check the carrier's tracking before confirming delivery. Keep sends a one-time email to the creator.</p>
    {!emailConfigured&&<p className="mt-3 rounded-lg border border-[#CEB7A2] p-3 text-xs text-[#815943]">Delivery emails are not configured yet. Delivery status will still be saved; retry the email after the sender is connected.</p>}
    {error&&<p role="alert" className="mt-3 text-xs text-[#9B4E42]">{error}</p>}
    {!shipments.length&&<p className="mt-4 text-sm text-[#8A7966]">No shipped orders to update yet.</p>}
    {shipments.map(s=><div key={s.purchaseId} className="mt-4 space-y-2 border-t border-[#E8DDD0] pt-4">
      <p className="text-sm font-medium">For {s.recipientName||"someone special"}</p><p className="text-xs text-[#806D59]">{s.orderReference} · {s.carrier||"No carrier"} · {s.tracking||"No tracking number"}</p>
      {s.delivery?<><p className="text-xs text-[#58715C]">Delivered · {giftDate(s.delivery.delivered_at)}</p><p className="text-xs text-[#806D59]">{s.delivery.email_state==="sent"?"Creator notified":s.delivery.email_state==="unknown"||s.delivery.email_state==="sending"?"Email outcome needs review — do not resend without checking":"Creator email pending"}</p>
        {["pending","failed","unconfigured"].includes(s.delivery.email_state)&&emailConfigured&&<button type="button" className="min-h-10 rounded-lg border px-3 text-xs" disabled={!!busy} onClick={()=>void retry(s)}>Retry delivery email</button>}</>:s.canConfirm?<><label className="block text-xs text-[#806D59]">Carrier-confirmed date and time<input type="datetime-local" max={currentLocalTime()} value={dates[s.purchaseId]??""} onChange={e=>setDates(d=>({...d,[s.purchaseId]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-[#D9C9B8] p-2 text-sm"/></label><button type="button" disabled={!!busy||!dates[s.purchaseId]} onClick={()=>void confirm(s)} className="keep-premium-action min-h-11 w-full px-3 text-xs disabled:opacity-50">{busy===s.purchaseId?"Confirming…":"Confirm delivery"}</button></>:<p className="text-xs text-[#9B6754]">A shipped, linked order with carrier and tracking is required.</p>}
    </div>)}
  </section>;
}
