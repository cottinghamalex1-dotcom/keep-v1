import type { MediaItem, KeepProject } from "./keep-project";
import { filmTotal } from "./keep-film-timing";

export type SelfiePresentation = NonNullable<KeepProject["selfiePresentation"]>;
export type SelfieSettings = Pick<KeepProject,
  "selfiePresentation" | "selfieBookendSeconds" | "selfieIntroId" | "selfieOutroId">;

const secondsOf=(item:MediaItem)=>Math.max(1,Number(item.videoDurationSec??item.displayDurationSec??8));
const validDuration=(seconds:number)=>Number.isFinite(seconds)&&seconds>0?seconds:150;
export const selfieAssets=(items:readonly MediaItem[])=>[...items]
  .filter(item=>item.isSelfie&&item.kind==="video"&&item.url)
  .sort((a,b)=>(a.selfiePartIndex??0)-(b.selfiePartIndex??0));

/** Build scenes without duplicating video blobs. Visual selfie takes are always
 * muted; narration remains the separate original audio recording.
 */
export function composeSelfieStory(
  ordinary:readonly MediaItem[],selfies:readonly MediaItem[],totalSeconds:number,settings:SelfieSettings={}
):MediaItem[]{
  const media=ordinary.filter(item=>!item.isSelfie);
  const available=selfieAssets(selfies);
  if(!available.length||settings.selfiePresentation==="off")return [...media];
  const presentation=settings.selfiePresentation==="auto"||!settings.selfiePresentation
    ?media.length?"bookends":"full":settings.selfiePresentation;
  const total=validDuration(totalSeconds);
  if(presentation==="full"){
    const sum=available.reduce((count,item)=>count+secondsOf(item),0);
    return available.map((item,index)=>({
      ...item,id:item.id,blobId:item.blobId??item.id,
      selfieRole:"full",videoStartSec:0,
      displayDurationSec:Math.max(.6,total*secondsOf(item)/sum),
      transition:index===0?"fade":"dissolve"
    }));
  }
  if(!media.length)return composeSelfieStory([],available,total,{...settings,selfiePresentation:"full"});
  const opening=available.find(item=>item.id===settings.selfieIntroId)??available[0]!;
  const closing=available.find(item=>item.id===settings.selfieOutroId)??available[available.length-1]!;
  const requested=Math.max(2,Math.min(12,settings.selfieBookendSeconds??4));
  const introSec=Math.min(requested,secondsOf(opening),total*.25);
  const outroSec=Math.min(requested,secondsOf(closing),total*.25);
  const bodySec=Math.max(.6,total-introSec-outroSec);
  const bodyTotal=filmTotal(media);
  const body=media.map(item=>({...item,displayDurationSec:bodySec*Math.max(.6,item.displayDurationSec??7)/Math.max(.6,bodyTotal)}));
  const intro:MediaItem={
    ...opening,id:opening.id+":selfie-intro",blobId:opening.blobId??opening.id,
    videoStartSec:0,selfieRole:"intro",displayDurationSec:introSec,transition:"dissolve",
  };
  const outro:MediaItem={
    ...closing,id:closing.id+":selfie-outro",blobId:closing.blobId??closing.id,
    videoStartSec:Math.max(0,secondsOf(closing)-outroSec),
    selfieRole:"outro",displayDurationSec:outroSec,transition:"dissolve",
  };
  return [intro,...body,outro];
}
export const withoutSelfieScenes=(media:readonly MediaItem[])=>media.filter(item=>!item.isSelfie);
