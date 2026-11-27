import {
  FILM_BACKGROUND, FILM_WIDTH, FILM_HEIGHT, KEEP_MUSIC_TAIL_SECONDS,
  captionDisplayIntervals, captionLayout, cameraGeometry, coverCrop,
  keepOpeningLeadSeconds, sceneBoundary, transitionSeconds, visualFilters,
  musicEnvelope, musicBalanceLevel, musicUnderLevel, filmCardLayout, musicLoopPlan,
  type FilmMoment, type FilmCaptionCue, type CaptionPosition,
} from "./composition.ts";
import type { MediaDimensions } from "./media-metadata.ts";

export type RenderProject = {
  recipientName: string; openingMessage?: string; closingLine?: string; cardEngraving?: string[];
  contributors?: Array<{name:string}>;
  voicePath: string; voiceDuration: number; voiceVolume?: number; musicVolume?: number;
  voiceMusicBalance?: string; audioMix?: {voiceMuted?:boolean;musicMuted?:boolean;ducking?:boolean;fadeIn?:number;fadeOut?:number};
  captionStyle: string; captionPosition?: CaptionPosition; captionLines?:number; captionSize?:number;
  captionCues: FilmCaptionCue[]; visualStyle: string;
  memories: Array<FilmMoment & {storagePath:string;kind:"image"|"video";videoStartSec?:number;videoDurationSec?:number;isSelfie?:boolean}>;
};
export type ShotstackSources = {
  voiceUrl: string; musicUrl?: string; musicDurationSec?: number;
  memoryUrls: Record<string,string>; mediaDimensions: Record<string,MediaDimensions>;
};
type Tween = {from:number;to:number;start:number;length:number;interpolation?:"linear";easing?:string};
type Clip = {
  asset: Record<string,unknown>; start:number;length:number;fit?:string;position?:string;
  width?:number;height?:number;scale?:number|Tween[];offset?:{x:number|Tween[];y:number|Tween[]};
  opacity?:number|Tween[];filters?:Array<Record<string,unknown>>;
};
export type ShotstackEdit = {
  timeline: {background:string;fonts:Array<{src:string}>;tracks:Array<{clips:Clip[]}>};
  output:{format:"mp4";size:{width:1080;height:1920};fps:30;quality:"high";destinations:[{provider:"shotstack";exclude:true}]};
};
const origin="https://keep-v1.vercel.app";
const round=(v:number)=>Math.round(v*1000)/1000;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const source=(value:string|undefined,kind:string)=>{
  if(!value || !/^https:\/\//i.test(value))throw new Error("Missing secure "+kind+" URL.");
  return value;
};
const tween=(from:number,to:number,start:number,length:number):Tween=>({
  from:round(from),to:round(to),start:round(start),length:round(length),interpolation:"linear",
});
const fontFiles={sans:"DM-Sans",display:"Playfair-Display",italic:"Playfair-Display-Italic"};
const fonts=Object.values(fontFiles).map(name=>({src:origin+"/fonts/"+name+".ttf"}));
const image=(src:string,start:number,length:number,width:number,height:number,position="center",offset?:Clip["offset"]):Clip=>({
  asset:{type:"image",src},start:round(start),length:round(length),width,height,fit:"cover",position,...(offset?{offset}:{}),
});
const rectangle=(color:string,start:number,length:number,width=FILM_WIDTH,height=FILM_HEIGHT,y=0):Clip=>({
  asset:{type:"shape",shape:"rectangle",rectangle:{width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height))},fill:{color,opacity:1}},
  width,height,fit:"none",position:"center",offset:{x:0,y:round(y)},start:round(start),length:round(length),
});
const richText=(text:string,start:number,length:number,options:{
  font:string;size:number;weight?:number|undefined;italic?:boolean|undefined;color?:string|undefined;letterSpacing?:number|undefined;lineHeight?:number|undefined;textTransform?:"uppercase"|"none"|undefined;
  width:number;height:number;position?:string;align?:"top"|"middle"|"bottom";offsetY?:number;shadow?:boolean;
}):Clip=>({
  asset:{type:"rich-text",text,font:{family:options.font,size:Math.max(1,Math.min(500,Math.round(options.size))),color:options.color??"#F5EDE5",
    weight:String(options.weight??400),...(options.italic?{style:"italic"}:{})},
    style:{lineHeight:options.lineHeight??1.25,...(options.letterSpacing!==undefined?{letterSpacing:options.letterSpacing}:{}),...(options.textTransform&&options.textTransform!=="none"?{textTransform:options.textTransform}:{})},
    align:{horizontal:"center",vertical:options.align??"middle"},
    ...(options.shadow?{shadow:{offsetX:0,offsetY:3,blur:12,color:"#000000",opacity:0.98}}:{})},
  start:round(start),length:round(length),width:options.width,height:options.height,fit:"none",
  position:options.position??"center",offset:{x:0,y:round(options.offsetY??0)},
});
export const filmDuration=(p:Pick<RenderProject,"voiceDuration"|"openingMessage">)=>
  round(keepOpeningLeadSeconds(p.openingMessage,true)+p.voiceDuration+KEEP_MUSIC_TAIL_SECONDS);

/** Layout for the same centered dedication and farewell as Watch, retaining
 * distinct eyebrow, name, italic dedication, hairline, and sender. */
function cards(project:RenderProject,intro:number,voiceEnd:number,filmEnd:number) {
  const name=project.recipientName.trim()||"You";
  const dedication=project.openingMessage?.trim()||"";
  const sender=project.contributors?.length?project.contributors.map(x=>x.name).join(" & "):
    (project.cardEngraving?.[1]??"").replace(/^FROM\s+/i,"").trim();
  const closing=project.closingLine?.trim()||"You are so loved.";
  const openingBackground=rectangle(FILM_BACKGROUND,0,intro);
  openingBackground.opacity=[tween(1,1,0,intro-1.5),tween(1,0,intro-1.5,1.5)];
  const opening:Clip[]=[];
  const opener=(clip:Clip)=>{
    const visible=clip.length;
    clip.opacity=[tween(0,1,0,Math.min(1.2,visible)),tween(1,1,Math.min(1.2,visible),Math.max(0.001,visible-1.2))];
    opening.push(clip);
  };
  const openLength=intro-1.5;
  const makeCardClip=(e:ReturnType<typeof filmCardLayout>[number],start:number,length:number)=>{
    const offsetY=0.5-(e.top+e.height/2)/FILM_HEIGHT;
    if(e.type==="line")return rectangle(e.color,start,length,e.width,e.height,offsetY);
    return richText(e.text??"",start,length,{font:e.font==="sans"?fontFiles.sans:e.font==="italic"?fontFiles.italic:fontFiles.display,
      size:e.size??72,weight:e.weight,italic:e.font==="italic",color:e.color,letterSpacing:e.letterSpacing,lineHeight:e.lineHeight,
      width:e.width,height:e.height,offsetY});
  };
  for(const e of filmCardLayout("opening",name,dedication))opener(makeCardClip(e,0,openLength));
  const tail=filmEnd-voiceEnd;
  const closingBackground=rectangle(FILM_BACKGROUND,voiceEnd,tail);
  closingBackground.opacity=[tween(0,1,0,Math.min(1.6,tail)),tween(1,1,1.6,Math.max(0.001,tail-1.6))];
  const closingClips:Clip[]=[];
  const start=voiceEnd+1, length=tail-1;
  const outro=(clip:Clip)=>{
    clip.opacity=[tween(0,1,0,Math.min(1.35,length)),tween(1,1,1.35,Math.max(0.001,length-1.35))];
    closingClips.push(clip);
  };
  for(const e of filmCardLayout("closing",name,closing,sender))outro(makeCardClip(e,start,length));
  return {opening,openingBackground,closing:closingClips,closingBackground};
}

/** Explicit edit decisions derived from the same narration clock and camera
 * geometry as the editor/Watch. Shotstack only composites and encodes. */
export function buildShotstackEdit(project:RenderProject,sources:ShotstackSources):ShotstackEdit {
  if(!project.memories?.length || !(project.voiceDuration>0) || !Number.isFinite(project.voiceDuration) || project.voiceDuration>7200)
    throw new Error("No complete Keep timeline to render.");
  const intro=keepOpeningLeadSeconds(project.openingMessage,true);
  const voiceEnd=intro+project.voiceDuration;
  const filmEnd=filmDuration(project);
  const images:Clip[][]=[[],[]];
  for(const [index,moment] of project.memories.entries()){
    const activeStart=intro+(index?sceneBoundary(project.memories,index-1,project.voiceDuration):0);
    const activeEnd=intro+sceneBoundary(project.memories,index,project.voiceDuration);
    const previous=project.memories[index-1],next=project.memories[index+1];
    // Crossfade over the real next-scene boundary, matching the browser's
    // outgoing still held at its final zoom and the incoming scene in motion.
    const fadeIn=previous?Math.min(transitionSeconds(previous.transition),(activeEnd-activeStart)/2):0;
    const nextLength=next?sceneBoundary(project.memories,index+1,project.voiceDuration)-sceneBoundary(project.memories,index,project.voiceDuration):0;
    const fadeOut=next?Math.min(transitionSeconds(moment.transition),nextLength/2):0;
    const start=index===0?intro-1.5:activeStart;
    const end=next?activeEnd+fadeOut:filmEnd;
    const length=end-start;
    const dimensions=sources.mediaDimensions[moment.storagePath];
    const crop=dimensions?coverCrop(dimensions.width,dimensions.height,moment.focusX??50,moment.focusY??50):undefined;
    // Once the object-cover crop is selected, the visible portrait box has
    // exactly the same transform origin/extent as in CSS.
    const cam=cameraGeometry(moment,index,FILM_WIDTH,FILM_HEIGHT);
    const activeOffset=activeStart-start,activeLength=activeEnd-activeStart;
    const motion=(from:number,to:number,at=0,span=length):number|Tween[]=>{
      const phase=(x:number)=>clamp((x-activeOffset)/activeLength,0,1);
      const value=(x:number)=>from+(to-from)*phase(x);
      const cuts=[at,at+span,activeOffset,activeOffset+activeLength].filter(x=>x>=at && x<=at+span).sort((a,b)=>a-b);
      const pieces=[...new Set(cuts)].slice(1).map((v,i,positions)=>{const a=i===0?at:positions[i-1]!;return tween(value(a),value(v),a-at,v-a);}).filter(t=>t.length>0);
      return pieces.length?pieces:value(at);
    };
    // Alternating tracks: at each boundary only the upper of the two
    // layers fades. The lower layer stays opaque, so there are no black gaps.
    const layer=index%2;
    const opacity=(offset:number,span:number):number|Tween[]=>{
      const at=(t:number)=>{
        if(layer===1 && fadeIn>0 && t<fadeIn)return clamp(t/fadeIn,0,1);
        if(layer===1 && fadeOut>0 && t>=activeEnd-start)return clamp(1-(t-(activeEnd-start))/fadeOut,0,1);
        return 1;
      };
      const cuts=[offset,offset+span,fadeIn,activeEnd-start,activeEnd-start+fadeOut].filter(x=>x>=offset&&x<=offset+span).sort((a,b)=>a-b);
      const unique=[...new Set(cuts)];return unique.slice(1).map((v,i)=>tween(at(unique[i]!),at(v),unique[i]!-offset,v-unique[i]!)).filter(t=>t.length>0);
    };
    const uri=source(sources.memoryUrls[moment.storagePath],"memory");
    const filters=visualFilters(project.visualStyle);
    const clip=(at:number,span:number,trim?:number,hold=false):Clip=>({
      asset:moment.kind==="video"?{type:"video",src:uri,trim:trim??0,volume:0,transcode:true,...(hold?{speed:0}:{}),...(crop?{crop}:{})}:
        {type:"image",src:uri,...(crop?{crop}:{})},
      start:round(start+at),length:round(span),width:FILM_WIDTH,height:FILM_HEIGHT,fit:"crop",
      scale:motion(cam.from.scale,cam.to.scale,at,span),
      offset:{x:motion(cam.from.x,cam.to.x,at,span),y:motion(cam.from.y,cam.to.y,at,span)},
      opacity:opacity(at,span),...(filters.length?{filters}:{}),
    });
    if(moment.kind==="image")images[layer]!.push(clip(0,length));
    else{
      const duration=dimensions?.duration??moment.videoDurationSec;
      if(!duration || duration<=0){
        images[layer]!.push(clip(0,length,moment.videoStartSec??0));
        continue;
      }
      let at=0;
      // When an intro photo is actually a video, hold its selected first frame
      // behind the dedication (the live player begins at voice start).
      let trim=clamp(moment.videoStartSec??0,0,Math.max(0,duration-0.05));
      if(activeOffset>0){images[layer]!.push(clip(0,activeOffset,trim,true));at=activeOffset;}
      while(at<length-0.015){
        const remainder=duration-trim;
        const playable=Math.max(0.05,Math.min(remainder,length-at,activeOffset+activeLength-at));
        if(at>=activeOffset+activeLength-0.015 || (moment.isSelfie&&remainder<=0.05)){
          images[layer]!.push(clip(at,length-at,Math.max(0,duration-0.05),true));break;
        }
        images[layer]!.push(clip(at,playable,trim));at+=playable;trim+=playable;
        if(at>=activeOffset+activeLength-0.015 && at<length-0.015){
          images[layer]!.push(clip(at,length-at,clamp(trim-0.05,0,duration-0.05),true));break;
        }
        if(trim>=duration-0.015){
          if(moment.isSelfie){if(at<length-0.015)images[layer]!.push(clip(at,length-at,Math.max(0,duration-0.05),true));break;}
          trim=0;
        }
        if(images[layer]!.length>4000)throw new Error("Video has too many repeated frames for rendering.");
      }
    }
  }
  const layout=captionLayout(project.captionStyle,project.captionPosition??"bottom",project.captionLines??2,project.captionSize);
  const captions=project.captionStyle==="None"?[]:captionDisplayIntervals(project.captionCues??[],project.voiceDuration).map(c=>{
    const position=layout.align==="middle"?"center":layout.align;
    const offsetY=layout.align==="top"?-layout.top:layout.align==="bottom"?1-layout.top:0;
    return richText(c.text,intro+c.start,c.end-c.start,{font:layout.font==="DM Sans"?fontFiles.sans:layout.italic?fontFiles.italic:fontFiles.display,
      size:layout.fontSize,weight:layout.weight,italic:layout.italic,color:layout.color,lineHeight:layout.lineHeight,letterSpacing:layout.letterSpacing || undefined,textTransform:layout.textTransform,
      width:Math.round(FILM_WIDTH*layout.width),height:Math.round(FILM_HEIGHT*0.72),position,align:layout.align,offsetY,shadow:true});
  }).filter(c=>c.length>=0.033);
  const card=cards(project,intro,voiceEnd,filmEnd);
  const logo=image(origin+"/brand/keep-film-wordmark.png",0,voiceEnd,312,133,"top",{x:0,y:-0.035});
  const shade=image(origin+"/brand/keep-film-shade.png",intro-1.5,filmEnd-(intro-1.5),FILM_WIDTH,FILM_HEIGHT);
  // Every independent text block has its own track; never overlap two
  // captions on one track or fade text between words.
  const tracks:Array<{clips:Clip[]}>= [
    ...card.closing.map(clip=>({clips:[clip]})),{clips:[card.closingBackground]},
    {clips:[logo]}, ...card.opening.map(clip=>({clips:[clip]})),{clips:[card.openingBackground]},
    {clips:captions},{clips:[shade]},{clips:images[1]!},{clips:images[0]!},
  ];
  if(!project.audioMix?.voiceMuted)tracks.push({clips:[{asset:{type:"audio",src:source(sources.voiceUrl,"voice"),volume:clamp((project.voiceVolume??60)/100,0,1)},
    start:round(intro),length:round(project.voiceDuration)}]});
  if(!project.audioMix?.musicMuted){
    const duration=sources.musicDurationSec;
    if(!duration || duration<5)throw new Error("Measured soundtrack duration is required.");
    const file=source(sources.musicUrl,"music");
    const e=musicEnvelope(intro,project.voiceDuration,project.audioMix?.fadeIn,project.audioMix?.fadeOut);
    const level=clamp(musicBalanceLevel(project.voiceMusicBalance??"Balanced")*(project.musicVolume??60)/100*2.5,0,1);
    const under=musicUnderLevel(level,project.audioMix?.ducking!==false);
    const points=[[0,0],[e.introPeak,level],[e.duckStart,level],[e.duckEnd,under],[e.voiceEnd,under],[e.outroRise,level],[e.outroFadeStart,level],[e.outroEnd,0]];
    const value=(at:number)=>{
      for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;if(at<=b[0]!)return a[1]!+(b[1]!-a[1]!)*clamp((at-a[0]!)/Math.max(0.001,b[0]!-a[0]!),0,1);}
      return 0;
    };
    // Use the same soundtrack body, skipping its composed ending and
    // re-entering at the same established phrase as Watch.
    const loop=musicLoopPlan(duration,filmEnd);
    const clips:Clip[][]=[[],[]];
    let index=0,start=0,trim=0;
    while(start<filmEnd-0.01){
      const available=loop?loop.crossfadeEnd-trim:duration-trim;
      const length=Math.min(available,filmEnd-start);
      const isLast=start+length>=filmEnd-0.01;
      const overlap=loop?loop.crossfadeSeconds:0;
      const cuts=[...points.map(p=>p[0]!),start,start+length];
      for(let i=0;i<=8;i++){
        if(index>0)cuts.push(start+overlap*i/8);
        if(!isLast&&overlap)cuts.push(start+length-overlap+overlap*i/8);
      }
      const unique=[...new Set(cuts.filter(v=>v>=start&&v<=start+length))].sort((a,b)=>a-b);
      const gain=(at:number)=>clamp(value(at)*
        (index>0&&overlap?Math.sin(clamp((at-start)/overlap,0,1)*Math.PI/2):1)*
        (!isLast&&overlap?Math.sin(clamp((start+length-at)/overlap,0,1)*Math.PI/2):1),0,1);
      clips[index%2]!.push({asset:{type:"audio",src:file,trim,volume:unique.slice(1).map((to,i)=>tween(gain(unique[i]!),gain(to),unique[i]!-start,to-unique[i]!)).filter(t=>t.length>0)},
        start:round(start),length:round(length)});
      if(isLast)break;
      start+=length-overlap;trim=loop?.loopFrom??0;index++;
    }
    tracks.push(...clips.map(clips=>({clips})));
  }
  return {timeline:{background:FILM_BACKGROUND,fonts,tracks:tracks.filter(t=>t.clips.length)},output:{
    format:"mp4",size:{width:1080,height:1920},fps:30,quality:"high",destinations:[{provider:"shotstack",exclude:true}],
  }};
}
