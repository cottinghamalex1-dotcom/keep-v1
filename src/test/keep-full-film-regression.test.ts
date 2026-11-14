import { describe,expect,it } from "vitest";
import { sceneBoundary,sceneDuration,sceneIndexAt,filmTotal,sceneElapsed } from "@/lib/keep-film-timing";
import { composeSelfieStory } from "@/lib/keep-selfie-story";
import { captionAtTime } from "@/lib/keep-caption-timing";
import { KEEP_MUSIC_LEAD_SECONDS,KEEP_MUSIC_TAIL_SECONDS,musicEnvelope } from "@/lib/keep-audio";
import type { MediaItem,CaptionCue } from "@/lib/keep-project";

const image=(index:number):MediaItem=>({
  id:`moment-${index}`,kind:"image",source:"upload",
  url:`blob:moment-${index}`,displayDurationSec:5
});
const selfie:MediaItem={
  id:"camera-voice",blobId:"camera-voice",source:"upload",kind:"video",
  isSelfie:true,url:"blob:camera-voice",videoDurationSec:150,displayDurationSec:150
};

describe("full 2:30 narrated film timing",()=>{
  it("keeps 42 photos and two selfie bookends on one monotonic narration clock",()=>{
    const scenes=composeSelfieStory(Array.from({length:42},(_,i)=>image(i)),[selfie],150,{
      selfiePresentation:"auto",selfieBookendSeconds:4
    });
    expect(scenes).toHaveLength(44);
    expect(filmTotal(scenes)).toBeCloseTo(150,3);
    expect(scenes[0]?.videoStartSec).toBe(0);
    expect(scenes.at(-1)?.videoStartSec).toBe(146);
    expect(scenes[0]?.blobId).toBe(scenes.at(-1)?.blobId);
    let previous=0;
    for(let t=0;t<=150;t+=0.05){
      const index=sceneIndexAt(scenes,t,150);
      expect(index).toBeGreaterThanOrEqual(previous);
      expect(index).toBeLessThan(scenes.length);
      expect(sceneDuration(scenes,index,150)).toBeGreaterThan(0);
      const elapsed=sceneElapsed(scenes,index,t,150);
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThanOrEqual(sceneDuration(scenes,index,150)+1e-7);
      previous=index;
    }
    expect(sceneBoundary(scenes,scenes.length-1,150)).toBeCloseTo(150,3);
  });
  it("does not display a caption before its first real spoken word or through long silence",()=>{
    const cues:CaptionCue[]=Array.from({length:50},(_,i)=>({
      text:`An important memory number ${i+1}`,
      start:1+i*2.9,end:3.3+i*2.9
    }));
    expect(captionAtTime(cues,0,150)).toBeUndefined();
    expect(captionAtTime(cues,1.5,150)?.text).toBe(cues[0]?.text);
    expect(captionAtTime(cues,3.5,150)?.text).toBe(cues[0]?.text);
    expect(captionAtTime(cues,3.75,150)).toBeUndefined();
    expect(captionAtTime(cues,4,150)?.text).toBe(cues[1]?.text);
    expect(captionAtTime(cues,150.5,150)).toBeUndefined();
  });
  it("always reserves the same musical introduction and ending after narration",()=>{
    const e=musicEnvelope(KEEP_MUSIC_LEAD_SECONDS,150);
    expect(e.voiceStart).toBe(KEEP_MUSIC_LEAD_SECONDS);
    expect(e.voiceEnd).toBe(KEEP_MUSIC_LEAD_SECONDS+150);
    expect(e.duckEnd).toBeGreaterThan(e.voiceStart);
    expect(e.outroEnd).toBe(KEEP_MUSIC_LEAD_SECONDS+150+KEEP_MUSIC_TAIL_SECONDS);
    expect(e.outroFadeStart).toBeLessThan(e.outroEnd);
  });
  it("uses the entire single selfie as the visual without silently adding demo images",()=>{
    const scenes=composeSelfieStory([],[selfie],150,{selfiePresentation:"auto"});
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.id).toBe("camera-voice");
    expect(sceneIndexAt(scenes,149.8,150)).toBe(0);
  });
});
