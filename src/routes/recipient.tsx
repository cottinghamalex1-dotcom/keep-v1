import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { KeepRecipientExperience } from '@/components/keep-recipient-experience';
import { publicationRequest, type PublishedProject } from '@/lib/keep-publish';

export const Route = createFileRoute('/recipient')({
  validateSearch: (search: Record<string, unknown>) => ({keep: typeof search['keep']==='string'?search['keep']:''}),
  head: () => ({meta:[{title:'A Keep for you — KEEP'},{name:'description',content:'Something meaningful was kept for you.'},{name:'robots',content:'noindex, nofollow'},{name:'referrer',content:'no-referrer'}]}),
  component: Recipient,
});
function Recipient() {
  const {keep}=Route.useSearch();
  const [project,setProject]=useState<PublishedProject|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let cancelled=false;setProject(null);setError('');
    if(!keep){setError('Open the viewing link from your Keep card or ask its creator for the link.');return;}
    void publicationRequest({action:'resolve',token:keep}).then(data=>{if(!cancelled)setProject(data.project);}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Your Keep could not load.');});
    return ()=>{cancelled=true;};
  },[keep,attempt]);
  if(!project) return <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-7 text-center text-foreground"><span className="brand mb-10">keep</span><h1 className="font-display text-3xl">{error?'Your Keep couldn’t open':'Opening your Keep…'}</h1>{error && <><p role="alert" className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">{error}</p>{keep&&<button className="mt-6 rounded-xl border border-border px-6 py-3" onClick={()=>setAttempt(x=>x+1)}>Try again</button>}</>}</main>;
  const readMedia=project.readMemoryOrder.map(id=>project.memories.find(m=>m.id===id)).filter((m):m is PublishedProject['memories'][number]=>!!m);
  for(const m of project.memories) if(!readMedia.some(x=>x.id===m.id))readMedia.push(m);
  return <KeepRecipientExperience key={keep} name={project.recipientName} from={(project.cardEngraving[1]||'').replace(/^FROM\s+/i,'')} year={project.cardEngraving[2]||''}
    subtitle={project.occasion} openingMessage={project.openingMessage} media={project.memories} readMedia={readMedia} audioUrl={project.voiceUrl} audioDuration={project.voiceDuration}
    messageParagraphs={project.messageParagraphs} style={project.visualStyle} captions={project.captionStyle} lines={project.captionCues.map(c=>c.text)} captionCues={project.captionCues}
    musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume}
    captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={project.audioMix} persistVisit={false} />;
}
