import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "countdown" | "recording" | "paused" | "denied" | "error";
export type RecordingResult = {
  blob: Blob; durationSec: number; mimeType: string;
  /** A simultaneous, muted-on-playback front-camera take, when requested and supported. */
  selfieBlob?: Blob; selfieMimeType?: string;
};

function preferredMime(types:string[]) {
  if(typeof MediaRecorder==="undefined" || !MediaRecorder.isTypeSupported)return "";
  for(const mime of types) {
    try{if(MediaRecorder.isTypeSupported(mime))return mime;}catch{/* ignore */}
  }
  return "";
}
const audioMime=()=>preferredMime(["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg"]);
const videoMime=()=>preferredMime(["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp8,opus","video/webm"]);
const audioConstraints:MediaTrackConstraints={echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1};
const videoConstraints:MediaTrackConstraints={facingMode:"user",width:{ideal:540,max:720},height:{ideal:960,max:1280},frameRate:{ideal:24,max:30}};
const MAX_SELFIE_BYTES=40*1024*1024;

/** Records real audio with optional synchronized front-camera video.
 * Audio remains a separate, original narration track (no doubled video audio).
 * Camera permission is requested only after someone chooses a selfie.
 */
export function useRecorder() {
  const [supported,setSupported]=useState<boolean|null>(null);
  const [canPause,setCanPause]=useState(false);
  const [status,setStatus]=useState<RecorderStatus>("idle");
  const [elapsed,setElapsed]=useState(0);
  const [countdown,setCountdown]=useState<number|null>(null);
  const [previewStream,setPreviewStream]=useState<MediaStream|null>(null);
  const [cameraError,setCameraError]=useState("");
  const rec=useRef<MediaRecorder|null>(null);
  const videoRec=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const cameraPrepared=useRef(false);
  const chunks=useRef<Blob[]>([]);
  const videoChunks=useRef<Blob[]>([]);
  const acc=useRef(0);
  const since=useRef<number|null>(null);
  const timer=useRef<number|null>(null);
  const requestGeneration=useRef(0);
  const pendingStart=useRef(false);
  const cancelCountdown=useRef<(()=>void)|null>(null);

  useEffect(()=>{
    const ok=typeof navigator!=="undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder!=="undefined";
    setSupported(ok);
    setCanPause(ok && typeof MediaRecorder.prototype.pause==="function" && typeof MediaRecorder.prototype.resume==="function");
  },[]);

  const now=()=>typeof performance!=="undefined"?performance.now():Date.now();
  const current=()=>(acc.current+(since.current!==null?now()-since.current:0))/1000;
  const teardown=useCallback(()=>{
    if(timer.current!==null)window.clearInterval(timer.current);
    timer.current=null;
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;
    cameraPrepared.current=false;
    setPreviewStream(null);
    rec.current=null;
    videoRec.current=null;
  },[]);
  const cancel=useCallback(()=>{
    requestGeneration.current++;
    pendingStart.current=false;
    cancelCountdown.current?.();
    for(const r of [rec.current,videoRec.current]){
      if(r){r.onstop=null;try{if(r.state!=="inactive")r.stop();}catch{/* ignore */}}
    }
    since.current=null;
    setCountdown(null);
    teardown();
    setStatus(previous=>(previous==="recording"||previous==="paused"||previous==="requesting"||previous==="countdown")?"idle":previous);
  },[teardown]);
  useEffect(()=>()=>{
    requestGeneration.current++;
    pendingStart.current=false;
    cancelCountdown.current?.();
    for(const r of [rec.current,videoRec.current])try{if(r?.state!=="inactive")r?.stop();}catch{/* ignore */}
    if(timer.current!==null)window.clearInterval(timer.current);
    stream.current?.getTracks().forEach(track=>track.stop());
  },[]);

  const disableSelfie=useCallback(()=>{
    if(pendingStart.current||rec.current?.state==="recording"||rec.current?.state==="paused")return;
    requestGeneration.current++;
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;cameraPrepared.current=false;
    setPreviewStream(null);setCameraError("");
    setStatus(previous => previous === "denied" || previous === "error" || previous === "requesting" ? "idle" : previous);
  },[]);

  const prepareSelfie=useCallback(async()=>{
    if(pendingStart.current)return false;
    if(!supported){setCameraError("Camera recording isn't supported on this device.");return false;}
    if(cameraPrepared.current && stream.current?.getVideoTracks().some(track=>track.readyState==="live"))return true;
    const request=++requestGeneration.current;
    setStatus("requesting");setCameraError("");
    try{
      const captured=await navigator.mediaDevices.getUserMedia({audio:audioConstraints,video:videoConstraints});
      if(request!==requestGeneration.current){captured.getTracks().forEach(track=>track.stop());return false;}
      stream.current?.getTracks().forEach(track=>track.stop());
      stream.current=captured;cameraPrepared.current=true;
      setPreviewStream(captured);
      setStatus("idle");
      return true;
    }catch(error){
      if(request!==requestGeneration.current)return false;
      const message=(error as {name?:string})?.name==="NotAllowedError"
        ?"Allow camera and microphone access in your browser settings, or choose voice only."
        :"Your front camera isn't available. You can still record your voice.";
      setCameraError(message);setStatus("idle");return false;
    }
  },[supported]);

  const start=useCallback(async(options?:{selfie?:boolean;countdown?:boolean})=>{
    if(!supported)return false;
    if(pendingStart.current||rec.current)return null;
    const request=++requestGeneration.current;
    pendingStart.current=true;
    const wantsSelfie=!!options?.selfie;
    setStatus("requesting");setCameraError("");setElapsed(0);setCountdown(null);
    try{
      const reuse=wantsSelfie&&stream.current?.getVideoTracks().some(track=>track.readyState==="live")&&stream.current?.getAudioTracks().some(track=>track.readyState==="live");
      if(!reuse){
        stream.current?.getTracks().forEach(track=>track.stop());
        stream.current=null;
        const captured=await navigator.mediaDevices.getUserMedia(wantsSelfie?{audio:audioConstraints,video:videoConstraints}:{audio:audioConstraints});
        if(request!==requestGeneration.current){captured.getTracks().forEach(track=>track.stop());return null;}
        stream.current=captured;
      }
      cameraPrepared.current=wantsSelfie;
      setPreviewStream(wantsSelfie?stream.current:null);
    }catch(error){
      if(request!==requestGeneration.current)return null;
      pendingStart.current=false;
      teardown();
      const name=(error as {name?:string})?.name;
      setStatus(name==="NotAllowedError"||name==="SecurityError"?"denied":"error");
      setCameraError(wantsSelfie?"Camera unavailable. Choose voice only to continue.":"");
      return false;
    }
    // Permissions first, then three full seconds to settle. No media encoder
    // or recording timer starts until the countdown completes.
    if(options?.countdown){
      setCountdown(3);setStatus("countdown");
      const completed=await new Promise<boolean>(resolve=>{
        let remaining=3;
        const finish=(completed:boolean)=>{
          window.clearInterval(interval);
          cancelCountdown.current=null;
          resolve(completed);
        };
        const interval=window.setInterval(()=>{
          remaining--;
          if(remaining===0)finish(true);
          else setCountdown(remaining);
        },1000);
        cancelCountdown.current=()=>finish(false);
      });
      if(!completed||request!==requestGeneration.current)return null;
    }
    pendingStart.current=false;
    setCountdown(null);
    try{
      const captured=stream.current!;
      // Separate audio recorder guarantees a clean narration, independent of
      // whether iOS can simultaneously encode a front-camera video.
      const audioStream=new MediaStream(captured.getAudioTracks());
      const mime=audioMime();
      const audio=mime?new MediaRecorder(audioStream,{mimeType:mime}):new MediaRecorder(audioStream);
      chunks.current=[];videoChunks.current=[];
      audio.ondataavailable=event=>{if(event.data?.size)chunks.current.push(event.data);};
      audio.start(1000);
      rec.current=audio;
      if(wantsSelfie){
        try{
          const videoType=videoMime();
          const v=videoType?new MediaRecorder(new MediaStream(captured.getVideoTracks()),{mimeType:videoType,videoBitsPerSecond:850000})
            :new MediaRecorder(new MediaStream(captured.getVideoTracks()),{videoBitsPerSecond:850000});
          v.ondataavailable=event=>{if(event.data?.size)videoChunks.current.push(event.data);};
          v.start(1000);
          videoRec.current=v;
        }catch{
          // Keep the already-recording narration even if this Safari revision
          // doesn't allow two encoders to use the same microphone at once.
          videoRec.current=null;
          setCameraError("This browser couldn't capture selfie video. Your voice is still recording normally.");
        }
      } else videoRec.current=null;
      acc.current=0;since.current=now();setElapsed(0);
      timer.current=window.setInterval(()=>setElapsed(current()),250);
      setStatus("recording");
      return true;
    }catch{
      teardown();setStatus("error");return false;
    }
  },[supported,teardown]);

  const pause=useCallback(()=>{
    const r=rec.current;
    if(!r||r.state!=="recording"||!canPause)return;
    r.pause();
    try{if(videoRec.current?.state==="recording")videoRec.current.pause();}catch{/* keep narration alive */}
    acc.current+=since.current!==null?now()-since.current:0;since.current=null;setStatus("paused");
  },[canPause]);
  const resume=useCallback(()=>{
    const r=rec.current;
    if(!r||r.state!=="paused")return;
    r.resume();
    try{if(videoRec.current?.state==="paused")videoRec.current.resume();}catch{/* keep narration alive */}
    since.current=now();setStatus("recording");
  },[]);

  const stop=useCallback(async():Promise<RecordingResult|null>=>{
    const audio=rec.current;
    if(!audio)return null;
    const durationSec=current();
    since.current=null;
    if(timer.current!==null){window.clearInterval(timer.current);timer.current=null;}
    const finish=(r:MediaRecorder,chunksRef:typeof chunks)=>new Promise<Blob|null>(resolve=>{
      let settled=false;
      const done=(value:Blob|null)=>{
        if(settled)return;settled=true;window.clearTimeout(timeout);resolve(value);
      };
      const timeout=window.setTimeout(()=>done(null),5500);
      r.onstop=()=>done(new Blob(chunksRef.current,{type:r.mimeType||"application/octet-stream"}));
      r.onerror=()=>done(null);
      try{if(r.state==="inactive")done(new Blob(chunksRef.current,{type:r.mimeType||"application/octet-stream"}));else r.stop();}
      catch{done(null);}
    });
    // Stop both encoders before releasing camera tracks, to preserve final chunks.
    const audioResult=finish(audio,chunks);
    const videoResult=videoRec.current?finish(videoRec.current,videoChunks):Promise.resolve(null);
    const [voice,selfie]=await Promise.all([audioResult,videoResult]);
    const voiceType=audio.mimeType||audioMime()||"audio/webm";
    const selfieType=videoRec.current?.mimeType||videoMime();
    teardown();setStatus("idle");
    if(!voice?.size)return null;
    return {
      blob:voice,durationSec,mimeType:voiceType,
      ...(selfie?.size && selfie.size<=MAX_SELFIE_BYTES
        ? {selfieBlob:selfie,selfieMimeType:selfieType||selfie.type}
        : {})
    };
  },[teardown]);

  return {supported,canPause,status,elapsed,countdown,start,pause,resume,stop,cancel,
    previewStream,cameraError,prepareSelfie,disableSelfie};
}
