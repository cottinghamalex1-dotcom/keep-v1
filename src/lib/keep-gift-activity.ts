import { activeKeepSession, readKeepSession } from "@/lib/keep-cloud";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-gift-events";
const apikey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export type GiftShipment = {
  purchaseId:string; shipped:boolean; shippedAt:string|null; carrier:string|null;
  tracking:string|null; deliveredAt:string|null; emailSent:boolean;
};
export type GiftActivity = {firstExperiencedAt:string|null; shipments:GiftShipment[]};
export type GiftActivities = Record<string, GiftActivity>;
type EmailState = "pending"|"sending"|"sent"|"failed"|"unknown"|"unconfigured";
export type OperatorShipment = {
  purchaseId:string; orderReference:string; recipientName:string|null; carrier:string|null;
  tracking:string|null; shippedAt:string|null; canConfirm:boolean;
  delivery:{delivered_at:string;email_state:EmailState;email_sent_at:string|null}|null;
};
export class GiftRequestError extends Error {
  constructor(message:string,readonly status:number){super(message);}
}
async function giftRequest(body:unknown,token?:string,keepalive=false) {
  const response=await fetch(endpoint,{
    method:"POST",headers:{apikey,"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
    body:JSON.stringify(body),keepalive,cache:"no-store",referrerPolicy:"no-referrer",
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new GiftRequestError(data.error||"Gift updates are temporarily unavailable.",response.status);
  return data;
}
async function authRequest(body:unknown) {
  const session=await activeKeepSession();
  if(!session) throw new GiftRequestError("Sign in to Keep to see gift updates.",401);
  return giftRequest(body,session.access_token);
}
// No event on route navigation/resolve, thumbnails, metadata, or link previews.
// If a stored session cannot be renewed, fail closed rather than treating the
// creator as an anonymous viewer. This request may never interrupt experience.
export async function recordFirstExperience(token:string, requireSession = !!readKeepSession()) {
  const existing=readKeepSession();
  if(requireSession&&!existing)return false;
  const session=existing?await activeKeepSession():null;
  if(existing&&!session) return false;
  await giftRequest({action:"first-experience",token},session?.access_token,true);
  return true;
}
export async function loadGiftActivities(ids:readonly string[]):Promise<GiftActivities> {
  const unique=[...new Set(ids)];
  if(!unique.length) return {};
  const batches: string[][]=[];
  for(let i=0;i<unique.length;i+=100)batches.push(unique.slice(i,i+100));
  const result=await Promise.all(batches.map(keepIds=>authRequest({action:"owner-status",keepIds})));
  return Object.assign({},...result.map(x=>x.activities));
}
export async function listOperatorShipments():Promise<{emailConfigured:boolean;shipments:OperatorShipment[]}> {
  return authRequest({action:"admin-list"});
}
export async function confirmGiftDelivery(purchaseId:string,deliveredAt:string) {
  return authRequest({action:"confirm-delivery",purchaseId,deliveredAt});
}
export async function retryGiftDeliveryEmail(purchaseId:string) {
  return authRequest({action:"retry-delivery-email",purchaseId});
}
export function giftDate(value?:string|null) {
  if(!value)return "";
  const date=new Date(value);
  return Number.isFinite(date.getTime())?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(date):"";
}
