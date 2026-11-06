import { getBlob } from "./keep-media-store";
import { activeKeepSession } from "./keep-cloud";
import type { KeepProject, MediaItem } from "./keep-project";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
const serviceUrl = endpoint + "/functions/v1/keep-card-service";
export type RecipientDesign = { greeting: string; note: string; closing: string; from: string; year: string };
export type PublishedKeep = { keepId: string; code?: string };
export function defaultRecipientDesign(p: KeepProject): RecipientDesign {
 return { greeting: "Made just for you.", note: "A memory worth keeping.", closing: "Some things are worth keeping.", from: p.cardEngraving[1]?.replace(/^FROM\s+/i,"") || "Someone who loves you", year: p.cardEngraving[2] || String(new Date().getFullYear()) };
}
export async function keepCardRequest(action:string, data:Record<string, unknown>, authenticated=false) {
 const session=authenticated ? await activeKeepSession() : null;
 if(authenticated && !session) throw new Error("Sign in to your Keep account to continue.");
 const response=await fetch(serviceUrl, {method:"POST",headers:{"Content-Type":"application/json",apikey:publicKey,...(session?{Authorization:"Bearer "+session.access_token}:{})},body:JSON.stringify({action,...data})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(result.error || "The card service is unavailable.");
 return result;
}
export async function publishKeep(p:KeepProject, existingId?:string, design?:RecipientDesign) {
 const session=await activeKeepSession();
 if(!session) throw new Error("Please sign in to your Keep account first.");
 const memories=[];
 for(const memory of p.memories) {
  if(memory.source==="text") continue;
  if(memory.source==="sample") {memories.push({...memory,storagePath:null});continue;}
  const blob=await getBlob(memory.id);
  if(!blob) throw new Error("A photo or video is missing from this device. Open your saved draft and try again.");
  const storagePath=session.user.id+"/"+memory.id;
  await upload(session.access_token,storagePath,blob);
  memories.push({...memory,url:undefined,storagePath});
 }
 let voicePath:string|undefined;
 if(p.finalVoiceRecording?.audioId && !p.finalVoiceRecording.demo) {
  const blob=await getBlob(p.finalVoiceRecording.audioId);
  if(!blob) throw new Error("The final voice recording is missing from this device.");
  voicePath=session.user.id+"/"+p.finalVoiceRecording.audioId;
  await upload(session.access_token,voicePath,blob);
 }
 const project={memories,voicePath,audioDuration:p.finalVoiceRecording?.durationSec,captionCues:p.captionCues,captionStyle:p.captionStyle,captionPosition:p.captionPosition,captionLines:p.captionLines,visualStyle:p.visualStyle,musicMood:p.musicMood,voiceMusicBalance:p.voiceMusicBalance,voiceVolume:p.voiceVolume,musicVolume:p.musicVolume,audioMix:p.audioMix,messageParagraphs:p.messageParagraphs,readMemoryOrder:p.readMemoryOrder,cardEngraving:p.cardEngraving};
 const result=await keepCardRequest("publish",{keepId:existingId,recipientName:p.recipientName||p.cardEngraving[0],relationship:p.relationship,occasion:p.occasion,project,experience:design??defaultRecipientDesign(p)},true);
 return result as {keepId:string};
}
async function upload(token:string,path:string,blob:Blob){
 const response=await fetch(endpoint+"/storage/v1/object/keep-media/"+path.split("/").map(encodeURIComponent).join("/"),{method:"POST",headers:{apikey:publicKey,Authorization:"Bearer "+token,"x-upsert":"true","Content-Type":blob.type||"application/octet-stream"},body:blob});
 if(!response.ok) throw new Error("Unable to publish a media file ("+response.status+").");
}
export function cardUrl(code:string) {return window.location.origin+"/card/"+encodeURIComponent(code);}
export async function registerCard(keepId:string,code:string,label:string){return keepCardRequest("register",{keepId,code,label},true) as Promise<{code:string}>;}
export type ResolvedKeep = {status:string;name:string;occasion:string;experience:RecipientDesign;project:{memories:(MediaItem&{storagePath?:string})[];voiceUrl?:string;audioDuration?:number;captionCues?:{text:string;start:number;end:number}[];captionStyle?:string;captionPosition?:"top"|"middle"|"bottom";captionLines?:number;visualStyle?:string;musicMood?:string;voiceMusicBalance?:string;voiceVolume?:number;musicVolume?:number;audioMix?:any;messageParagraphs?:string[];readMemoryOrder?:string[];cardEngraving?:string[]}};
