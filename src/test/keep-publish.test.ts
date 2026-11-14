import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newProject } from '@/lib/keep-project';
import { publishKeep, publicationSettings, viewingLink } from '@/lib/keep-publish';
import { activeKeepSession } from '@/lib/keep-cloud';
import { getBlob } from '@/lib/keep-media-store';
import { manifestSchema, ownedPaths } from '../../supabase/functions/keep-publish/schema';
vi.mock('@/lib/keep-cloud',()=>({activeKeepSession:vi.fn()}));
vi.mock('@/lib/keep-media-store',()=>({getBlob:vi.fn()}));
const owner='00000000-0000-4000-8000-000000000001';
const id='00000000-0000-4000-8000-000000000002';
const project=()=>({...newProject(),active:true,recipientName:'Test recipient',messageParagraphs:['A real message'],finalVoiceRecording:{audioId:'voice',durationSec:10,demo:false},memories:[{id:'photo',kind:'image' as const,source:'upload' as const,url:'blob:local-only',persisted:true}],interviewAnswers:[{questionIndex:0,question:'Private question',transcript:'Private answer'}]});
beforeEach(()=>{vi.resetAllMocks();vi.stubGlobal('fetch',vi.fn());vi.mocked(activeKeepSession).mockResolvedValue({access_token:'test-token',refresh_token:'refresh',user:{id:owner}});vi.mocked(getBlob).mockResolvedValue(new Blob(['test'],{type:'audio/wav'}));vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({keepId:id,token:'permanent'}),{status:200}));});
describe('Publishing a Keep',()=>{
 it('uploads all media before publishing and excludes private interview and local URLs',async()=>{
   const requests: {url:string;options:RequestInit}[]=[];
   vi.mocked(fetch).mockImplementation(async(url,options)=>{requests.push({url:String(url),options:options!});return new Response(JSON.stringify({keepId:id,token:'permanent'}));});
   const result=await publishKeep(project(),id,()=>{});
   expect(result.token).toBe('permanent');expect(requests).toHaveLength(3);
   expect(requests[0]!.url).toContain(`/keep-media/${owner}/publications/${id}/`);
   expect(requests[1]!.url).toMatch(/\/voice$/);
   const body=JSON.parse(requests[2]!.options.body as string);
   expect(body.keepId).toBe(id);expect(body.project.memories[0].url).toBeUndefined();
   expect(JSON.stringify(body)).not.toContain('Private answer');expect(JSON.stringify(body)).not.toContain('blob:');
   expect(manifestSchema.safeParse(body.project).success).toBe(true);
 });
 it('preserves the chosen voice treatment through server validation and recipient serialization',()=>{
   for(const voiceTone of ['natural','warm','clear'] as const){
     const edited={...project(),audioMix:{voiceMuted:false,musicMuted:false,fadeIn:2.5,fadeOut:3,ducking:true,voiceTone}};
     const payload={...publicationSettings(edited),voicePath:`${owner}/publications/${id}/version/voice`,
       memories:[{id:'photo',kind:'image',source:'upload',storagePath:`${owner}/publications/${id}/version/photo`}]};
     const published=manifestSchema.parse(payload);
     expect(published.audioMix?.voiceTone).toBe(voiceTone);
     const delivered=manifestSchema.parse(JSON.parse(JSON.stringify(published)));
     expect(delivered.audioMix?.voiceTone).toBe(voiceTone);
   }
 });
 it('does not publish metadata after a failed upload',async()=>{
   vi.mocked(fetch).mockResolvedValue(new Response('',{status:500}));
   await expect(publishKeep(project(),id,()=>{})).rejects.toThrow('could not upload');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not publish with a missing recording',async()=>{
   vi.mocked(getBlob).mockImplementation(async key=>key==='voice'?null:new Blob(['image']));
   await expect(publishKeep(project(),id,()=>{})).rejects.toThrow('recording is missing');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('requires creator login before uploading',async()=>{
   vi.mocked(activeKeepSession).mockResolvedValue(null);
   await expect(publishKeep(project(),id,()=>{})).rejects.toThrow('Sign in');expect(fetch).not.toHaveBeenCalled();
 });
 it('uses a stable production URL rather than a preview hostname',()=>{expect(viewingLink('abc')).toBe('https://keep-v1.vercel.app/recipient?keep=abc');});
 it('rejects cross-owner, cross-Keep and traversal storage paths',()=>{
   const valid=manifestSchema.parse({...publicationSettings(project()),voicePath:`${owner}/publications/${id}/version/voice`,memories:[{id:'photo',kind:'image',source:'upload',storagePath:`${owner}/publications/${id}/version/photo`}]});
   expect(ownedPaths(valid,owner,id)).toHaveLength(2);
   expect(()=>ownedPaths(valid,'other-owner',id)).toThrow();expect(()=>ownedPaths(valid,owner,'other-keep')).toThrow();
   expect(()=>ownedPaths({...valid,voicePath:`${owner}/publications/${id}/../voice`},owner,id)).toThrow();
 });
});
