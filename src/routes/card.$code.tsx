import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {KeepRecipientExperience} from "@/components/keep-recipient-experience";
import {keepCardRequest,type ResolvedKeep} from "@/lib/keep-publishing";
import {memoryImages} from "@/components/keep-player";
export const Route=createFileRoute("/card/$code")({component:CardLanding,head:()=>({meta:[{title:"Your private Keep"},{name:"robots",content:"noindex,nofollow"},{name:"referrer",content:"no-referrer"}]})});
function CardLanding(){
 const {code}=Route.useParams();
 const [result,setResult]=useState<ResolvedKeep|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{let mounted=true;keepCardRequest("resolve",{code}).then(data=>{if(mounted)setResult(data as ResolvedKeep);}).catch((e)=>{if(mounted)setError(e instanceof Error?e.message:"Something went wrong.");});return()=>{mounted=false;};},[code]);
 if(error||result?.status==="unactivated")return <main className="flex min-h-dvh flex-col items-center justify-center bg-[#111] px-7 text-center text-[#F6F3ED]"><span className="font-display text-4xl">keep</span><h1 className="mt-14 font-display text-4xl">{error?"This Keep couldn't open.":"A memory is on its way."}</h1><p className="mt-5 max-w-xs text-sm leading-7 text-white/60">{error?"Check the card or try again later.":"This card has not been activated yet. Ask the person who gave it to you to finish setting it up."}</p></main>;
 if(!result)return <main className="flex min-h-dvh items-center justify-center bg-[#111] text-[#F6F3ED]"><span className="font-display text-4xl">keep</span></main>;
 const p=result.project;
 const media=(p.memories??[]).map((m:any)=>({...m,url:m.url || (m.source==="sample"?memoryImages[m.sampleIndex??0]:"")})).filter((m:any)=>!!m.url);
 const ordered=p.readMemoryOrder?.length?[...media].sort((a:any,b:any)=>p.readMemoryOrder!.indexOf(a.id)-p.readMemoryOrder!.indexOf(b.id)):media;
 return <KeepRecipientExperience key={code} name={result.name||"You"} from={result.experience?.from||"Someone special"} year={result.experience?.year||String(new Date().getFullYear())} subtitle={result.occasion} greeting={result.experience?.greeting} endingMessage={result.experience?.closing} media={media} readMedia={ordered} audioUrl={p.voiceUrl} audioDuration={p.audioDuration} messageParagraphs={p.messageParagraphs} style={p.visualStyle} captions={p.captionStyle} captionCues={p.captionCues} musicMood={p.musicMood} voiceMusicBalance={p.voiceMusicBalance} voiceVolume={p.voiceVolume} musicVolume={p.musicVolume} captionPosition={p.captionPosition} captionLines={p.captionLines} audioMix={p.audioMix} />;
}
