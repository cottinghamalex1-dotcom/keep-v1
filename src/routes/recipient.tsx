import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { KeepRecipientExperience } from '@/components/keep-recipient-experience';
import { KeepLoadingScreen } from '@/components/keep-loading-screen';
import { recordFirstExperience } from '@/lib/keep-gift-activity';
import { readKeepSession } from '@/lib/keep-cloud';
import { publicationRequest, type PublishedProject } from '@/lib/keep-publish';

export const Route = createFileRoute('/recipient')({
  validateSearch: (search: Record<string, unknown>) => ({keep: typeof search['keep']==='string'?search['keep']:''}),
  head: () => ({meta:[{title:'A Keep for you — Keep'},{name:'description',content:'Something meaningful was kept for you.'},{name:'robots',content:'noindex, nofollow'},{name:'referrer',content:'no-referrer'}]}),
  pendingComponent: () => <KeepLoadingScreen context="keep" />,
  component: Recipient,
});
function Recipient() {
  const {keep}=Route.useSearch();
  const [project,setProject]=useState<PublishedProject|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const experienceRequest = useRef<{token:string;inFlight:boolean;done:boolean;attempts:number;requireSession:boolean;timer?:number;cancelled?:boolean}>({token:"",inFlight:false,done:false,attempts:0,requireSession:false});
  const reportFirstExperience = () => {
    if(experienceRequest.current.token!==keep)experienceRequest.current={token:keep,inFlight:false,done:false,attempts:0,requireSession:!!readKeepSession()};
    const event=experienceRequest.current;
    const send=()=>{
      if(event.inFlight||event.done||event.cancelled||event.attempts>=3)return;
      event.inFlight=true;event.attempts++;
      void recordFirstExperience(keep,event.requireSession).then(recorded=>{event.done=recorded;if(!recorded)event.cancelled=true;}).catch(()=>{ /* Never interrupt the gift. */ }).finally(()=>{
        event.inFlight=false;
        if(!event.done&&!event.cancelled&&event.attempts<3)event.timer=window.setTimeout(send,event.attempts*2000);
      });
    };
    send();
  };
  useEffect(()=>()=>{const event=experienceRequest.current;if(event.token===keep){event.cancelled=true;if(event.timer)window.clearTimeout(event.timer);}},[keep]);
  useEffect(()=>{
    let cancelled=false;setProject(null);setError('');
    if(!keep){setError('Open the viewing link from your Keep card or ask its creator for the link.');return;}
    void publicationRequest({action:'resolve',token:keep}).then(data=>{if(!cancelled)setProject(data.project);}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Your Keep could not load.');});
    return ()=>{cancelled=true;};
  },[keep,attempt]);
  if(!project && !error) return <KeepLoadingScreen context="keep" />;
  if(!project) return <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-7 text-center text-foreground"><span className="brand mb-10">Keep</span><h1 className="font-display text-3xl">{error?'Your Keep couldn’t open':'Opening your Keep…'}</h1>{error && <><p role="alert" className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">{error}</p>{keep&&<button className="mt-6 rounded-xl border border-border px-6 py-3" onClick={()=>setAttempt(x=>x+1)}>Try again</button>}</>}</main>;
  const readMedia=project.readMemoryOrder.map(id=>project.memories.find(m=>m.id===id)).filter((m):m is PublishedProject['memories'][number]=>!!m);
  for(const m of project.memories) if(!readMedia.some(x=>x.id===m.id))readMedia.push(m);
  const speakers = project.voiceMode === 'together' ? (project.contributors ?? []).map(c=>c.name.trim()).filter(Boolean) : [];
  return <KeepRecipientExperience key={keep} name={project.recipientName} from={speakers.length ? speakers.join(' & ') : (project.cardEngraving[1]||'').replace(/^FROM\s+/i,'')} year={project.cardEngraving[2]||''} speakerNames={project.voiceMode === 'together' ? (project.paragraphSpeakers ?? []).map(id => (project.contributors ?? []).find(c => c.id === id)?.name || '') : undefined}
    subtitle={project.occasion} openingMessage={project.openingMessage} closingLine={project.closingLine} media={project.memories} readMedia={readMedia} audioUrl={project.voiceUrl} renderedVideoUrl={project.renderedVideoUrl} audioDuration={project.voiceDuration}
    messageParagraphs={project.messageParagraphs} style={project.visualStyle} captions={project.captionStyle} lines={project.captionCues.map(c=>c.text)} captionCues={project.captionCues}
    musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume}
    captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={project.audioMix} persistVisit={false} onFirstExperience={reportFirstExperience} />;
}
