/** A single narration clock controls both creator previews and recipient films. */
export type FilmMoment = {
  displayDurationSec?: number | undefined;
  motion?: "in" | "out" | "left" | "right" | undefined;
  focusX?: number | undefined; focusY?: number | undefined; zoom?: number | undefined; transition?: "fade" | "dissolve" | "cut" | undefined;
};

const clipSeconds = (item: FilmMoment) => {
  const seconds = item.displayDurationSec;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? Math.max(0.6, seconds) : 7;
};

export function filmTotal(media: readonly FilmMoment[]): number {
  return media.reduce((total, item) => total + clipSeconds(item), 0);
}

/** Rescale authored scene lengths to the true voice duration, when available. */
const ratio = (media: readonly FilmMoment[], duration?: number) => {
  const total = filmTotal(media);
  return total > 0 && duration && Number.isFinite(duration) && duration > 0 ? duration / total : 1;
};

export function sceneDuration(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  return clipSeconds(media[Math.max(0, Math.min(index, media.length - 1))]!) * ratio(media, duration);
}

export function sceneBoundary(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  const count = Math.max(0, Math.min(index + 1, media.length));
  return media.slice(0, count).reduce((sum, item) => sum + clipSeconds(item), 0) * ratio(media, duration);
}

/** Begin at the exact narration-scaled boundary, not the raw photo duration.
 * A tiny inset protects floating-point rounding at the boundary on Safari. */
export function sceneSeekTime(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  const safeIndex = Math.max(0, Math.min(media.length - 1, Math.trunc(index)));
  if (safeIndex === 0) return 0;
  const start = sceneBoundary(media, safeIndex - 1, duration);
  const length = sceneDuration(media, safeIndex, duration);
  return start + Math.min(0.04, length * 0.2);
}

/** Elapsed time within the selected scene, in the narration clock. */
export function sceneElapsed(media: readonly FilmMoment[], index: number, time: number, duration?: number): number {
  const start = index > 0 ? sceneBoundary(media, index - 1, duration) : 0;
  const maxDuration = sceneDuration(media, index, duration);
  return Math.max(0, Math.min(maxDuration, time - start));
}

export function sceneIndexAt(media: readonly FilmMoment[], time: number, duration?: number): number {
  if (!media.length) return 0;
  const effectiveTime = Math.max(0, Number.isFinite(time) ? time : 0);
  const total = filmTotal(media);
  const scale = total > 0 && duration && Number.isFinite(duration) && duration > 0 ? duration / total : 1;
  // Run once through the media, not a full prefix sum for *every* scene at
  // every animation frame. Fifty photos previously meant thousands of repeated
  // array operations per second on iPhones.
  let boundary = 0;
  for (let index = 0; index < media.length; index++) {
    boundary += clipSeconds(media[index]!);
    if (effectiveTime < boundary * scale) return index;
  }
  return media.length - 1;
}

/** Deterministic, quiet variety — never randomize a film between replays. */
const defaultMotions = ["in", "left", "out", "right", "in", "right", "out", "left"] as const;
export function defaultMotionAt(index: number): (typeof defaultMotions)[number] {
  return defaultMotions[Math.abs(Math.floor(index)) % defaultMotions.length]!;
}

export function motionFor(item: FilmMoment, index: number) {
  return item.motion ?? defaultMotionAt(index);
}

export const KEEP_MUSIC_LEAD_SECONDS = 2.8;
export const KEEP_MUSIC_TAIL_SECONDS = 4.5;

export function musicEnvelope(introSeconds: number, voiceDuration: number, fadeInSeconds = 2.5, fadeOutSeconds = 3) {
  const intro = Math.max(0, introSeconds);
  const voiceEnd = intro + Math.max(1, voiceDuration);
  return {
    introPeak: Math.min(Math.max(0.25, intro - 0.55), Math.max(0.25, Math.min(1.35, fadeInSeconds * 0.4))),
    duckStart: Math.max(Math.min(Math.max(0.25, intro - 0.55), Math.max(0.25, Math.min(1.35, fadeInSeconds * 0.4))) + 0.05, intro - 0.45),
    duckEnd: Math.max(intro + 0.38, Math.max(0.25, intro - 0.55) + 0.35),
    voiceStart: intro,
    voiceEnd,
    outroRise: voiceEnd + 0.72,
    outroFadeStart: voiceEnd + Math.max(0.8, KEEP_MUSIC_TAIL_SECONDS - Math.max(1.1, Math.min(3.7, fadeOutSeconds))),
    outroEnd: voiceEnd + KEEP_MUSIC_TAIL_SECONDS,
  };
}


/**
 * Gives recipients enough uninterrupted music to read their dedication,
 * instead of rushing narration after the old 2.8-second generic intro.
 * Unpersonalized editor previews retain the original shorter lead-in.
 */
export function keepOpeningLeadSeconds(openingMessage: string | undefined, cinematicOpening: boolean): number {
  if (!cinematicOpening) return KEEP_MUSIC_LEAD_SECONDS;
  const characters = (openingMessage ?? "").trim().length;
  return Math.min(14, Math.max(7.5, 5.5 + characters / 26));
}

export type FilmCaptionCue = { text: string; start: number; end: number };
/** Follow the true narration clock. Brief breaths between consecutive cues
 * should not repeatedly flash the caption off and back on. Longer silence and
 * the end of the narration still clear captions promptly. */
export function captionAtTime(cues: FilmCaptionCue[], time: number, narrationDuration?: number): FilmCaptionCue | undefined {
  if(!cues.length||!Number.isFinite(time)||time<0)return undefined;
  if(narrationDuration && Number.isFinite(narrationDuration) && time>narrationDuration+0.05)return undefined;
  const first=cues[0]!;
  if(time+0.015<first.start)return undefined;
  for(let i=cues.length-1;i>=0;i--){
    const cue=cues[i]!;
    if(time+0.015<cue.start)continue;
    // Prefer the newest phrase when the timestamp provider overlaps words.
    if(time<=cue.end+0.08)return cue;
    // If the next phrase begins within a typical breath, hold the current
    // caption until that phrase starts instead of flashing blank for 100ms.
    // This never shifts the start of the next spoken phrase or survives a long pause.
    const next = cues[i + 1];
    if (next && next.start >= cue.end && next.start - cue.end <= 1.05 && time < next.start) return cue;
    return time <= cue.end + 0.4 ? cue : undefined;
  }
  return undefined;
}

/** Portrait design coordinates. The editor scales these percentages to its
 * preview; the renderer uses the same coordinates at 1080 × 1920. */
export const FILM_WIDTH = 1080;
export const FILM_HEIGHT = 1920;
export const FILM_BACKGROUND = "#171311";
export const PHOTO_SHADE_STOPS = [[0, 0.36], [0.28, 0], [0.53, 0], [1, 0.76]] as const;
export const FILM_FONTS = {
  sans: "DM Sans", display: "Playfair Display",
} as const;
export type CaptionPosition = "top" | "middle" | "bottom";
export function captionLayout(style: string, position: CaptionPosition = "bottom", lines = 2) {
  const size = style === "Film" ? 108 : style === "Story" ? 90 : style === "Minimal" ? 60 : 72;
  return {
    font: style === "Film" || style === "Story" ? FILM_FONTS.display : FILM_FONTS.sans,
    fontSize: size, weight: style === "Clean" ? 500 : style === "Reel" ? 600 : 400,
    italic: style === "Story", lineHeight: 1.25,
    width: 0.86 * (lines === 1 ? 0.95 : lines === 3 ? 0.65 : 0.8),
    top: position === "top" ? 0.175 : position === "middle" ? 0.5 : 0.775,
    align: position === "top" ? "top" : position === "middle" ? "middle" : "bottom",
    color: "#FFFFFF",
  } as const;
}
const finite = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export function cameraMotion(moment: FilmMoment, index: number) {
  const x = clamp(finite(moment.focusX, 50), 0, 100);
  const y = clamp(finite(moment.focusY, 50), 0, 100);
  const zoom = clamp(finite(moment.zoom, 1.08), 1.03, 1.35);
  const motion = motionFor(moment, index);
  const from=motion==="out"?zoom*1.065:zoom, to=motion==="out"?zoom:zoom*1.065;
  const desired=motion==="left"?[2.4,-2.4]:motion==="right"?[-2.4,2.4]:[0,0];
  const safeShift=(scale:number,shift:number)=>{
    const margin=(scale-1)/2;
    const base=(0.5-x/100)*(scale-1);
    return 100*clamp(shift/100,-margin-base,margin-base);
  };
  return {focusX:x,focusY:y,from,to,shift:[safeShift(from,desired[0]!),safeShift(to,desired[1]!)] as const};
}
export const transitionSeconds = (transition: FilmMoment["transition"]) =>
  transition === "cut" ? 0 : transition === "fade" ? 0.57 : 0.83;

/** Convert the same object-fit:cover + object-position + CSS transform-origin
 * geometry to a center-positioned render surface without replacing the crop. */
export function cameraGeometry(moment: FilmMoment, index: number, width: number, height: number) {
  const cam = cameraMotion(moment, index);
  const ratio = width > 0 && height > 0 ? width / height : FILM_WIDTH / FILM_HEIGHT;
  const baseWidth = Math.max(FILM_WIDTH, FILM_HEIGHT * ratio);
  const baseHeight = Math.max(FILM_HEIGHT, FILM_WIDTH / ratio);
  const point = (scale: number, shift: number) => ({
    scale,
    x: (0.5 - cam.focusX / 100) * (baseWidth * scale / FILM_WIDTH - 1) + shift / 100,
    y: (cam.focusY / 100 - 0.5) * (baseHeight * scale / FILM_HEIGHT - 1),
  });
  return { width: baseWidth, height: baseHeight, from: point(cam.from, cam.shift[0]), to: point(cam.to, cam.shift[1]) };
}

/** Render exactly the caption selected by the live playback clock. Handles
 * short breaths, overlapping cues, and intentional gaps; no re-transcription. */
export function captionDisplayIntervals(cues: FilmCaptionCue[], voiceDuration: number) {
  const valid = cues.filter(c => c.text.trim() && Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start)
    .slice().sort((a,b) => a.start-b.start);
  const points = [...new Set([0, voiceDuration, ...valid.flatMap(c => [
    clamp(c.start - 0.015, 0, voiceDuration), clamp(c.end + 0.08, 0, voiceDuration), clamp(c.end + 0.4, 0, voiceDuration),
  ])])].sort((a,b) => a-b);
  const result: Array<{text: string; start: number; end: number}> = [];
  // Each boundary can change which caption is active. Resolve once per span.
  for (let i=0; i+1<points.length; i++) {
    const start=points[i]!, end=points[i+1]!;
    if (end-start < 0.0001) continue;
    const cue = captionAtTime(valid, (start+end)/2, voiceDuration);
    if (!cue) continue;
    const previous = result[result.length-1];
    if (previous && previous.text === cue.text && Math.abs(previous.end-start)<0.0001) previous.end=end;
    else result.push({text:cue.text,start,end});
  }
  return result;
}

export const musicBalanceLevel = (balance: string) => balance === "Soft" ? 0.22 : balance === "Full" ? 0.45 : 0.32;
export const musicUnderLevel = (level: number, ducking = true) => level * (ducking ? 0.36 : 0.75);

/** Object-cover cropping relative to the original media, before applying the
 * exact editor transform. Camera focal point is not a post-crop pan. */
export function coverCrop(width: number, height: number, focusX=50, focusY=50) {
  if (!(width>0 && height>0)) return undefined;
  const frameRatio=FILM_WIDTH/FILM_HEIGHT, sourceRatio=width/height;
  const extraX=sourceRatio>frameRatio?1-frameRatio/sourceRatio:0;
  const extraY=sourceRatio<frameRatio?1-sourceRatio/frameRatio:0;
  const x=clamp(focusX,0,100)/100, y=clamp(focusY,0,100)/100;
  return {left:extraX*x,right:extraX*(1-x),top:extraY*y,bottom:extraY*(1-y)};
}

/** Render filter parameters mirror the editor's authored color treatment.
 * Sepia itself is represented by a warmth grade on providers without a
 * sepia matrix, so hue/contrast/brightness values are still carried through. */
export function visualFilters(style: string) {
  const data: Record<string, Array<Record<string,unknown>>> = {
    "Warm": [{type:"grade",temperature:0.24},{type:"saturation",value:1.22},{type:"contrast",value:1.06},{type:"brightness",value:1.025}],
    "Film": [{type:"grade",temperature:0.20},{type:"saturation",value:0.72},{type:"contrast",value:1.23},{type:"brightness",value:0.93}],
    "Modern": [{type:"contrast",value:1.16},{type:"saturation",value:1.32},{type:"brightness",value:1.035}],
    "Black & White": [{type:"saturation",value:0},{type:"contrast",value:1.22},{type:"brightness",value:1.03}],
    "Vintage": [{type:"grade",temperature:0.58},{type:"saturation",value:0.76},{type:"contrast",value:0.90},{type:"brightness",value:1.045}],
    "Soft": [{type:"saturation",value:0.78},{type:"contrast",value:0.83},{type:"brightness",value:1.13}],
    "Dreamy": [{type:"grade",temperature:0.05},{type:"saturation",value:1.15},{type:"contrast",value:0.85},{type:"brightness",value:1.13},{type:"hue",value:352}],
  };
  return data[style] ?? [];
}

export type FilmCardElement = {
  type:"text"|"line"; text?:string; top:number; height:number; width:number;
  font?:"sans"|"display"|"italic"|undefined; size?:number; weight?:number; color:string; letterSpacing?:number; lineHeight?:number;
};
/** One fixed-portrait layout for the actual preview dedication and export.
 * Text is never changed or combined into a generic title. */
export function filmCardLayout(mode:"opening"|"closing",name:string,message:string,sender=""):FilmCardElement[] {
  const recipient=name.trim()||"You";
  const text=message.trim() || (mode==="closing"?"You are so loved.":"");
  const lines=(s:string,chars:number)=>s.split("\n").reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/chars)),0);
  const layout:FilmCardElement[]=[];
  const addText=(value:string,top:number,height:number,width:number,font:FilmCardElement["font"],size:number,
    color:string,letterSpacing:number,lineHeight=1.25,weight=400)=>{
    layout.push({type:"text",text:value,top,height,width,font,size,color,letterSpacing,lineHeight,weight});
  };
  const line=(top:number,width:number)=>layout.push({type:"line",top,height:3,width,color:"#9D8571"});
  if(mode==="opening") {
    const nameHeight=Math.max(132,lines(recipient,16)*135);
    const quoteHeight=text?Math.max(96,lines(text,24)*96):0;
    const total=34+36+nameHeight+(text?96+3+96+quoteHeight:0);
    let y=(FILM_HEIGHT-total)/2;
    addText("A KEEP FOR",y,34,840,"sans",30,"#B8A38F",8.1,1.0,600);
    y+=70;
    addText(recipient,y,nameHeight,920,"display",114,"#F5EDE5",-5.1,1.08);
    y+=nameHeight;
    if(text) {
      y+=96;line(y,144);y+=99;
      addText(text,y,quoteHeight,920,"italic",74,"#F5EDE5",-1.3,1.32);
    }
  } else {
    const closeHeight=Math.max(150,lines(text,15)*140);
    const senderHeight=sender?Math.max(70,lines("With love, "+sender,34)*45):0;
    const total=34+84+closeHeight+96+3+(sender?72+senderHeight:0);
    let y=(FILM_HEIGHT-total)/2;
    addText("FOR "+recipient,y,34,920,"sans",30,"#B8A38F",7.8,1,600);
    y+=118;
    addText(text,y,closeHeight,900,"italic",117,"#F5EDE5",-3.7,1.13);
    y+=closeHeight+96;line(y,132);y+=75;
    if(sender)addText("With love, "+sender,y,senderHeight,900,"sans",36,"#D4C4B3",4.7);
  }
  // Preserve all wording of unusually long names/dedications instead of
  // overflowing the screen. Scale the entire card around its center.
  const top=layout[0]?.top??0,last=layout.at(-1);
  const bottom=last?last.top+last.height:0;
  const factor=bottom-top>FILM_HEIGHT*0.82?FILM_HEIGHT*0.82/(bottom-top):1;
  return factor===1?layout:layout.map(e=>({...e,top:FILM_HEIGHT/2+(e.top-FILM_HEIGHT/2)*factor,
    height:e.height*factor,width:e.width*factor,...(e.size?{size:e.size*factor}:{}),...(e.letterSpacing?{letterSpacing:e.letterSpacing*factor}:{})}));
}

export const MUSIC_CROSSFADE_SECONDS = 7;
export const MUSIC_OUTRO_SKIP_SECONDS = 9;
export const MUSIC_REENTRY_SECONDS = 8;

export type MusicLoopPlan = {
  crossfadeStart: number;
  crossfadeSeconds: number;
  loopFrom: number;
  crossfadeEnd: number;
};

export function musicLoopPlan(trackSeconds: number, keepSeconds: number): MusicLoopPlan | null {
  if (!Number.isFinite(trackSeconds) || trackSeconds < 40 || !Number.isFinite(keepSeconds)) return null;
  const crossfadeEnd = trackSeconds - MUSIC_OUTRO_SKIP_SECONDS;
  if (keepSeconds <= crossfadeEnd) return null;
  const crossfadeStart = crossfadeEnd - MUSIC_CROSSFADE_SECONDS;
  return {
    crossfadeStart,
    crossfadeSeconds: MUSIC_CROSSFADE_SECONDS,
    loopFrom: MUSIC_REENTRY_SECONDS,
    crossfadeEnd,
  };
}

