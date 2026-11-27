import { useEffect, useState } from "react";
import { Check, Heart, PackageCheck, Truck } from "lucide-react";
import { giftDate, loadGiftActivities, type GiftActivities, type GiftActivity } from "@/lib/keep-gift-activity";

export function useKeepGiftActivities(keepIds:readonly string[]) {
  const key=[...new Set(keepIds)].sort().join(",");
  const [state,setState]=useState<{key:string;activities:GiftActivities;failed:boolean}>({key:"",activities:{},failed:false});
  useEffect(()=>{
    let cancelled=false;let running=false;
    if(!key){setState({key,activities:{},failed:false});return;}
    const refresh=async()=>{
      if(running)return;running=true;
      try {
        const activities=await loadGiftActivities(key.split(","));
        if(!cancelled)setState({key,activities,failed:false});
      }catch{
        if(!cancelled)setState(prev=>({key,activities:prev.key===key?prev.activities:{},failed:true}));
      }finally{running=false;}
    };
    void refresh();
    const focus=()=>void refresh();
    window.addEventListener("focus",focus);
    const timer=window.setInterval(()=>{if(!document.hidden)void refresh();},60_000);
    return()=>{cancelled=true;window.removeEventListener("focus",focus);window.clearInterval(timer);};
  },[key]);
  return state.key===key?state:{key,activities:{},failed:false};
}
export function FirstExperienceBadge({activity}:{activity?: GiftActivity}) {
  const date=giftDate(activity?.firstExperiencedAt);
  return date?<span className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-4 text-[#58715C]"><Heart className="mt-0.5 size-3 shrink-0" aria-hidden="true" /> <span>First experienced · {date}</span></span>:null;
}
/** Compact, honest status; details are available separately when requested. */
export function KeepGiftSummary({activity,failed=false}:{activity?:GiftActivity;failed?:boolean}) {
  if(!activity) return failed?<p className="pb-1 text-xs text-[#796957]">Gift status temporarily unavailable</p>:null;
  const first=giftDate(activity.firstExperiencedAt);
  const shipments=activity.shipments;
  const delivered=shipments.filter(s=>!!s.deliveredAt).length;
  const shipped=shipments.filter(s=>s.shipped||!!s.deliveredAt).length;
  const single=shipments.length===1;
  const shippingLabel=delivered===shipments.length?"Delivered":delivered?"Partially delivered":shipped===shipments.length?"Shipped":shipped?"Partially shipped":single?"Preparing your gift":"Preparing your gifts";
  return <div aria-label="Gift status" className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E6DCD2] pb-3 text-[11px] leading-5 text-[#6E6052]">
    <span className="flex min-w-0 items-start gap-1.5">
      <Heart className={`mt-0.5 size-3.5 shrink-0 ${first?"fill-[#DDE7DE] text-[#56705A]":"text-[#9B8977]"}`} aria-hidden="true" />
      <span>{first?`First viewed · ${first}`:"Not yet viewed"}</span>
    </span>
    {shipments.length>0 && <span className="flex min-w-0 items-start gap-1.5">
      {delivered===shipments.length?<PackageCheck className="mt-0.5 size-3.5 shrink-0 text-[#56705A]" aria-hidden="true"/>:<Truck className="mt-0.5 size-3.5 shrink-0 text-[#9B8977]" aria-hidden="true"/>}
      <span>{shippingLabel}{single&&delivered>0?` · ${giftDate(shipments[0].deliveredAt)}`:""}</span>
    </span>}
    {failed&&<span className="basis-full text-[#796957]">Last known status · updates unavailable</span>}
  </div>;
}
export function KeepGiftTimeline({activity,failed=false}:{activity?:GiftActivity;failed?:boolean}) {
  if(!activity) return failed?<p className="mb-4 rounded-xl border border-[#DED2C6] p-3 text-xs text-[#796957]">Gift updates are temporarily unavailable. Refresh to check again.</p>:null;
  const first=giftDate(activity.firstExperiencedAt);
  return <section aria-label="Gift journey" className="px-1 pb-3">
    <div className="space-y-3">
      {activity.shipments.map((shipment,index)=><div className="space-y-3" key={shipment.purchaseId}>
        {activity.shipments.length>1&&<p className="text-[10px] font-medium uppercase tracking-wider text-[#887663]">Shipment {index+1}</p>}
        <div className="flex items-start gap-3"><Truck className={`mt-0.5 size-4 shrink-0 ${shipment.shipped?"text-[#617961]":"text-[#BBAD9E]"}`}/><div className="min-w-0"><p className="text-xs font-medium text-[#403328]">{shipment.shipped?"Shipped":"Preparing your gift"}</p>{shipment.shipped&&<p className="mt-1 text-[11px] leading-5 text-[#806D59]">{[shipment.carrier,giftDate(shipment.shippedAt)].filter(Boolean).join(" · ")}{shipment.tracking&&<span className="block break-all">Tracking: {shipment.tracking}</span>}</p>}</div></div>
        <div className="flex items-start gap-3"><PackageCheck className={`mt-0.5 size-4 shrink-0 ${shipment.deliveredAt?"text-[#617961]":"text-[#BBAD9E]"}`}/><div><p className="text-xs font-medium text-[#403328]">{shipment.deliveredAt?"Delivered":"Awaiting delivery"}</p><p className="mt-1 text-[11px] leading-5 text-[#806D59]">{shipment.deliveredAt?giftDate(shipment.deliveredAt):"Delivery not confirmed yet."}</p>{shipment.emailSent&&<p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#617961]"><Check className="size-3"/> Delivery email sent</p>}</div></div>
      </div>)}
      {activity.shipments.length===0&&<p className="text-[11px] leading-5 text-[#887663]">No card shipment yet.</p>}
      <div className="flex items-start gap-3 border-t border-[#EAE1D7] pt-3"><Heart className={`mt-0.5 size-4 shrink-0 ${first?"fill-[#DDE7DE] text-[#617961]":"text-[#BBAD9E]"}`}/><div><p className="text-xs font-medium text-[#403328]">{first?"First experienced":"Not yet recorded"}</p><p className="mt-1 text-[11px] leading-5 text-[#806D59]">{first||"No viewing activity yet."}</p></div></div>
    </div>
    <p className="mt-3 text-[10px] leading-4 text-[#938474]">First viewing does not verify the viewer’s identity. Your signed-in previews are excluded.</p>
  </section>;
}
