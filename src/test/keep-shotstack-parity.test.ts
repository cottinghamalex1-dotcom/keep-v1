import { describe, expect, it } from "vitest";
import {
  captionAtTime, captionDisplayIntervals, captionLayout, photoCameraGeometry,
  coverCrop, FILM_BACKGROUND, sceneBoundary, filmCardLayout, keepOpeningLeadSeconds, transitionSeconds,
} from "../../supabase/functions/keep-render/composition";
import { buildShotstackEdit, filmDuration, type RenderProject, type ShotstackSources } from "../../supabase/functions/keep-render/shotstack";
import { imageDimensions, probeDimensions } from "../../supabase/functions/keep-render/media-metadata";
import { renderRevisionHash } from "../../supabase/functions/keep-render/revision";
import { renderRevisionHash as recipientHash } from "../../supabase/functions/keep-publish/revision";

const p=():RenderProject=>({
  recipientName:"Dad",openingMessage:"The words I never want you to forget.",closingLine:"I love you, always.",
  cardEngraving:["DAD","FROM ALEX"],voicePath:"voice",voiceDuration:30,voiceVolume:65,musicVolume:40,
  captionStyle:"Story",captionPosition:"bottom",captionLines:3,visualStyle:"Warm",
  captionCues:[{text:"Dad, I just want you to know.",start:0.4,end:2},{text:"I still remember.",start:2.3,end:4},{text:"And you were there.",start:3.95,end:5}],
  memories:[
    {storagePath:"one",kind:"image",displayDurationSec:4,focusX:75,focusY:20,zoom:1.3,motion:"out",transition:"dissolve"},
    {storagePath:"two",kind:"image",displayDurationSec:4,focusX:25,focusY:50,zoom:1.12,motion:"left",transition:"cut"},
    {storagePath:"three",kind:"video",displayDurationSec:4,videoDurationSec:4,videoStartSec:1,zoom:1.2},
  ],
});
const s=():ShotstackSources=>({voiceUrl:"https://example.com/voice",musicUrl:"https://example.com/music",musicDurationSec:180,
  memoryUrls:{one:"https://example.com/one",two:"https://example.com/two",three:"https://example.com/three"},
  mediaDimensions:{one:{width:1600,height:900},two:{width:900,height:1600},three:{width:1080,height:1920,duration:4}},
});
describe("editor to MP4 composition parity",()=>{
  it("uses the same caption selection clock, keeping breaths and replacing overlaps",()=>{
    const project=p(),intervals=captionDisplayIntervals(project.captionCues,30);
    for(let i=0;i<30;i+=0.037){
      const interval=intervals.find(c=>i>=c.start&&i<c.end);
      expect(interval?.text).toBe(captionAtTime(project.captionCues,i,30)?.text);
    }
    expect(intervals).toHaveLength(3);
    const intro=keepOpeningLeadSeconds(project.openingMessage,true);
    const clips=buildShotstackEdit(project,s()).timeline.tracks.flatMap(t=>t.clips).filter(c=>project.captionCues.some(cue=>cue.text===c.asset.text));
    expect(clips.map(c=>c.asset.text)).toEqual(project.captionCues.map(c=>c.text));
    expect(clips[0]!.start).toBeCloseTo(intro+intervals[0]!.start,3);
    expect(clips[1]!.start).toBeCloseTo(clips[0]!.start+clips[0]!.length,3);
  });
  it.each(["top","middle","bottom"] as const)("explicitly uses the chosen %s position and caption line width",position=>{
    const project={...p(),captionPosition:position};
    const clip=buildShotstackEdit(project,s()).timeline.tracks.flatMap(t=>t.clips).find(c=>c.asset.text===project.captionCues[0]!.text)!;
    const layout=captionLayout("Story",position,3);
    expect(clip.position).toBe(position==="middle"?"center":position);
    expect(clip.offset?.y).toBeCloseTo(position==="top"?-layout.top:position==="bottom"?1-layout.top:0,3);
    expect(clip.width).toBe(Math.round(1080*layout.width));
    expect(clip.asset.font).toMatchObject({family:"Playfair-Display-Italic",color:"#FFFFFF",size:90,style:"italic"});
    expect(clip.length).toBeGreaterThan(0);
  });
  it.each([50, 75, 100, 125, 150])("preserves caption font and position at %i%% size in the MP4", captionSize => {
    const project={...p(),captionSize};
    const layout=captionLayout(project.captionStyle,project.captionPosition,project.captionLines,captionSize);
    const base=captionLayout(project.captionStyle,project.captionPosition,project.captionLines);
    expect(layout).toEqual({...base,fontSize:Math.round(base.fontSize*captionSize/100)});
    const clip=buildShotstackEdit(project,s()).timeline.tracks.flatMap(t=>t.clips).find(c=>c.asset.text===project.captionCues[0]!.text)!;
    expect(clip.asset.font).toMatchObject({family:"Playfair-Display-Italic",size:layout.fontSize,style:"italic"});
    expect(clip.position).toBe("bottom");
    expect(clip.width).toBe(Math.round(1080*base.width));
  });
  it("preserves the entire source image with the same subtle camera motion as Watch",()=>{
    const project=p(),edit=buildShotstackEdit(project,s());
    const clips=edit.timeline.tracks.flatMap(t=>t.clips);
    for (const index of [0,1]) {
      const photo=project.memories[index]!;
      const track=edit.timeline.tracks.findIndex(t=>t.clips.some(c=>c.asset.src===s().memoryUrls[photo.storagePath]));
      const clip=edit.timeline.tracks[track]!.clips.find(c=>c.asset.src===s().memoryUrls[photo.storagePath])!;
      expect(clip.fit).toBe("contain");
      expect(clip.asset.crop).toBeUndefined();
      const cam=photoCameraGeometry(photo,index);
      const scale=clip.scale as Array<{from:number;to:number}>;
      expect(scale[0]!.from).toBeCloseTo(cam.from.scale,3);
      expect(scale.at(-1)!.to).toBeCloseTo(cam.to.scale,3);
      expect((clip.offset?.x as Array<{from:number}>)[0]!.from).toBeCloseTo(cam.from.x,3);
      expect((clip.offset?.y as Array<{from:number}>)[0]!.from).toBeCloseTo(cam.from.y,3);
      expect(clip.filters).toContainEqual({type:"saturation",value:1.22});
      expect(clip.filters).toContainEqual({type:"contrast",value:1.06});
      const matte=edit.timeline.tracks[track+1]!.clips.find(c=>c.start===clip.start&&c.length===clip.length)!;
      expect(matte.asset).toMatchObject({type:"shape",fill:{color:FILM_BACKGROUND,opacity:1}});
      expect(matte.opacity).toEqual(clip.opacity);
    }
    // Video framing and filters are intentionally unchanged.
    const video=clips.find(c=>c.asset.type==="video")!;
    expect(video.fit).toBe("crop");
    expect(video.asset.crop).toEqual(coverCrop(1080,1920));
    expect(clips.some(c=>String(c.asset.src).endsWith("keep-film-shade.png"))).toBe(true);
  });
  it.each(["in","out","left","right"] as const)("keeps every corner visible throughout %s motion, even with old zoom and extreme focus values",motion=>{
    for (const [width,height] of [[1600,900],[900,1600],[1000,1000],[3500,700],[700,3500]]) {
      const fitted=Math.min(1080/width!,1920/height!);
      for (const focusX of [0,50,100]) for(const focusY of [0,50,100]) {
        const cam=photoCameraGeometry({motion,focusX,focusY,zoom:4},0);
        for (let t=0;t<=1;t+=0.05) {
          const scale=cam.from.scale+(cam.to.scale-cam.from.scale)*t;
          const x=cam.from.x+(cam.to.x-cam.from.x)*t;
          const y=cam.from.y+(cam.to.y-cam.from.y)*t;
          expect(Math.abs(x)*1080+width!*fitted*scale/2).toBeLessThanOrEqual(540.001);
          expect(Math.abs(y)*1920+height!*fitted*scale/2).toBeLessThanOrEqual(960.001);
        }
      }
    }
  });
  it("holds the outgoing scene over the actual dissolve then cuts on the next boundary",()=>{
    const project=p(),edit=buildShotstackEdit(project,s()),clips=edit.timeline.tracks.flatMap(t=>t.clips);
    const first=clips.find(c=>c.asset.src===s().memoryUrls.one)!;
    const second=clips.find(c=>c.asset.src===s().memoryUrls.two)!;
    const third=clips.filter(c=>c.asset.src===s().memoryUrls.three);
    const intro=keepOpeningLeadSeconds(project.openingMessage,true);
    const boundary=intro+sceneBoundary(project.memories,0,30);
    expect(second.start).toBeCloseTo(boundary,3);
    expect(first.start+first.length).toBeCloseTo(boundary+transitionSeconds("dissolve"),3);
    expect((second.opacity as Array<{from:number;to:number;length:number}>)[0]).toMatchObject({from:0,to:1,length:0.83});
    expect(third[0]!.start).toBeCloseTo(second.start+second.length,3);
    expect(third.every(c=>c.asset.volume===0)).toBe(true);
    expect(third.some(c=>c.asset.trim===0)).toBe(true);
  });
  it("uses the existing personalized opening and closing layout, logo, fonts and 1080p duration",()=>{
    const project=p(),edit=buildShotstackEdit(project,s()),clips=edit.timeline.tracks.flatMap(t=>t.clips);
    for(const mode of ["opening","closing"]as const){
      const layout=filmCardLayout(mode,project.recipientName,mode==="opening"?project.openingMessage!:project.closingLine!,"ALEX");
      for(const e of layout.filter(e=>e.type==="text")){
        const c=clips.find(c=>c.asset.text===e.text)!;
        expect(c.width).toBeCloseTo(e.width,3);expect(c.height).toBeCloseTo(e.height,3);
        expect(c.offset?.y).toBeCloseTo(0.5-(e.top+e.height/2)/1920,3);
      }
    }
    expect(edit.timeline.fonts).toHaveLength(3);
    expect(edit.output).toMatchObject({format:"mp4",size:{width:1080,height:1920},fps:30,quality:"high"});
    expect(Math.max(...clips.map(c=>c.start+c.length))).toBeCloseTo(filmDuration(project),3);
  });
  it("escapes legacy render reuse without changing the published Keep or deleting the old MP4",async()=>{
    const project=p();
    const old=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(project)))),n=>n.toString(16).padStart(2,"0")).join("");
    const current=await renderRevisionHash(project);
    expect(current).not.toBe(old);expect(current).toBe(await recipientHash(project));
    expect(current).not.toBe(await renderRevisionHash({...project,captionPosition:"top"}));
    expect(current).not.toBe(await renderRevisionHash({...project,captionSize:125}));
  });
  it("extracts dimensions from saved photo headers and respects rotated video metadata",()=>{
    const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);
    view.setUint32(16,1600);view.setUint32(20,900);
    expect(imageDimensions(bytes)).toEqual({width:1600,height:900});
    expect(probeDimensions({response:{streams:[{codec_type:"video",width:1920,height:1080,side_data_list:[{rotation:-90}]}],format:{duration:"12.4"}}})).toEqual({width:1080,height:1920,duration:12.4});
  });
  it("reads real Shotstack probe metadata for videos, including iPhone rotation and duration fallback",()=>{
    expect(probeDimensions({success:true,response:{metadata:{
      streams:[{codec_type:"audio"},{codec_type:"video",width:1920,height:1080,duration:"N/A",side_data_list:[{rotation:-90}]}],
      format:{duration:"12.4"}
    }}})).toEqual({width:1080,height:1920,duration:12.4});
    expect(probeDimensions({response:{metadata:{streams:[{codec_type:"video",width:1080,height:1920,duration:"4.5"}]}}}))
      .toEqual({width:1080,height:1920,duration:4.5});
    expect(probeDimensions({success:false,response:{metadata:{streams:[{codec_type:"video",width:1920,height:1080}]}}})).toBeUndefined();
    expect(probeDimensions({response:{metadata:{streams:[{codec_type:"audio"}]}}})).toBeUndefined();
  });

});
