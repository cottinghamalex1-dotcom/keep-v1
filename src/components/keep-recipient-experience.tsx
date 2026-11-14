import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Images, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeepPlayer, type PlayerMedia } from "@/components/keep-player";
import { KeepFirstPlayReveal } from "@/components/keep-first-play-reveal";
import { KeepReadingMusic } from "@/components/keep-reading-music";
import { frameAtTime, makeReadingFrames } from "@/lib/keep-immersive-reading";
import type { AudioMix, CaptionCue } from "@/lib/keep-project";
import { createKeepVoiceMix, KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, type MusicBalance } from "@/lib/keep-audio";

export type KeepExperienceMode = "watch" | "listen" | "read";

type Props = {
  name: string;
  from: string;
  year: string;
  subtitle?: string | undefined;
  openingMessage?: string | undefined;
  media?: PlayerMedia[] | undefined;
  readMedia?: PlayerMedia[] | undefined;
  audioUrl?: string | undefined;
  audioDuration?: number | undefined;
  messageParagraphs?: string[] | undefined;
  speakerNames?: string[] | undefined;
  style?: string | undefined;
  captions?: string | undefined;
  lines?: string[] | undefined;
  captionCues?: CaptionCue[] | undefined;
  musicMood?: string | undefined;
  voiceMusicBalance?: string | undefined;
  voiceVolume?: number | undefined;
  musicVolume?: number | undefined;
  captionPosition?: "top" | "middle" | "bottom" | undefined;
  captionLines?: number | undefined;
  audioMix?: AudioMix | undefined;
  persistVisit?: boolean;
  creatorPreview?: boolean;
  initialExperience?: KeepExperienceMode | undefined;
  onCreatorExit?: () => void;
  onCreatorContinue?: () => void;
};

const demoMessage = [
  "Hanna, I wanted to make this because there are so many things that I think about you and appreciate about you that I probably don't say enough.",
  "You're my best friend. You're my sounding board. You're my encourager. You're the person who believes in me when I don't believe in myself.",
  "One of the things I notice most is the way you make people feel. You have this ability to make people feel seen and known and heard and loved. You make people feel at home.",
  "And then I got to watch you become a mom. In the smallest, most ordinary moments, I see the life we've made together and I can't believe I get to share it with you.",
  "Twenty years from now, I hope you know this: through every version of us, I'd choose this life with you again. Always.",
];

export function KeepRecipientExperience({
  name,
  from,
  year,
  subtitle,
  openingMessage,
  media,
  audioUrl,
  audioDuration = 150,
  messageParagraphs,
  speakerNames,
  style = "Natural",
  captions = "Reel",
  lines,
  captionCues = [],
  musicMood = "Warm + Nostalgic",
  voiceMusicBalance = "Balanced",
  voiceVolume = 60,
  musicVolume = 60,
  captionPosition = "bottom",
  captionLines = 2,
  audioMix,
  persistVisit = true,
  creatorPreview = false,
  initialExperience,
  onCreatorExit,
  onCreatorContinue,
}: Props) {
  const visitKey = useMemo(() => `keep.recipient.opened.${name}.${from}.${year}`, [name, from, year]);
  const [visited, setVisited] = useState(false);
  const [stage, setStage] = useState<"reveal" | "choose" | "experience" | "ending">(creatorPreview && initialExperience ? "experience" : "reveal");
  const [experience, setExperience] = useState<KeepExperienceMode>(initialExperience ?? "watch");
  const [listening, setListening] = useState(false);
  const [listenProgress, setListenProgress] = useState(0);
  const [listenDuration, setListenDuration] = useState(audioDuration);
  const audio = useRef<HTMLAudioElement>(null);
  const timer = useRef<number | null>(null);
  const listenMix = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const listenIntroTimer = useRef<number | null>(null);
  const listenHasStarted = useRef(false);
  const listenIntroRemaining = useRef(KEEP_MUSIC_LEAD_SECONDS * 1000);
  const listenIntroStartedAt = useRef(0);
  const listenAttempt = useRef(0);
  const cancelPendingListen = () => {
    listenAttempt.current++;
    if(listenIntroTimer.current!==null){
      window.clearTimeout(listenIntroTimer.current);
      listenIntroTimer.current=null;
      listenIntroRemaining.current=Math.max(0,listenIntroRemaining.current-(performance.now()-listenIntroStartedAt.current));
    }
  };
  const paragraphs = messageParagraphs?.length ? messageParagraphs : demoMessage;

  useEffect(() => {
    if (!persistVisit) return;
    try { setVisited(localStorage.getItem(visitKey) === "1"); } catch { /* private browsing */ }
  }, [persistVisit, visitKey]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);
  useEffect(()=>{
    if(stage!=="experience"||experience!=="listen")return;
    const onHide=()=>{
      if(!document.hidden)return;
      cancelPendingListen();
      audio.current?.pause();
      void listenMix.current?.pause();
      setListening(false);
    };
    document.addEventListener("visibilitychange",onHide);
    return ()=>document.removeEventListener("visibilitychange",onHide);
  },[stage,experience]);
  useEffect(() => {
    if (stage !== "experience" || experience !== "listen" || listenProgress < 99.8 || !audioUrl) return;
    const tail = window.setTimeout(() => { void listenMix.current?.pause(); }, KEEP_MUSIC_TAIL_SECONDS * 1000);
    return () => window.clearTimeout(tail);
  }, [stage, experience, listenProgress >= 99.8, audioUrl]);

  useEffect(() => {
    if (stage !== "experience" || experience !== "listen" || !audioUrl || !audio.current) return;
    const balance = (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance;
    const controller = createKeepVoiceMix(audio.current, musicMood, balance, audioDuration, KEEP_MUSIC_LEAD_SECONDS, audioMix);
    listenMix.current = controller;
    controller?.setLevels(voiceVolume, musicVolume);
    listenHasStarted.current = false;
    return () => {
      cancelPendingListen();
      void controller?.stop();
      listenMix.current = null;
      listenHasStarted.current = false;
      listenIntroRemaining.current = KEEP_MUSIC_LEAD_SECONDS * 1000;
    };
  }, [stage, experience, audioUrl, audioDuration]);
  useEffect(()=>{
    listenMix.current?.setLevels(voiceVolume,musicVolume);
  },[stage,experience,voiceVolume,musicVolume]);
  useEffect(()=>{
    listenMix.current?.setTrackMutes(!!audioMix?.voiceMuted,!!audioMix?.musicMuted);
    listenMix.current?.setVoiceTone(audioMix?.voiceTone??"natural");
  },[stage,experience,audioMix?.voiceMuted,audioMix?.musicMuted,audioMix?.voiceTone]);
  useEffect(()=>{
    if(stage==="experience"&&experience==="listen")
      listenMix.current?.restartMusic(musicMood,
        (["Soft","Balanced","Full"].includes(voiceMusicBalance)?voiceMusicBalance:"Balanced") as MusicBalance,audioMix);
  },[stage,experience,musicMood,voiceMusicBalance,audioMix?.fadeIn,audioMix?.fadeOut,audioMix?.ducking]);

  const enter = () => {
    if (persistVisit) {
      try { localStorage.setItem(visitKey, "1"); } catch { /* private browsing */ }
    }
    setVisited(true);
    setExperience("watch");
    setListening(false);
    setListenProgress(0);
    setStage("experience");
  };

  const choose = (next: KeepExperienceMode) => {
    setExperience(next);
    setListening(false);
    setListenProgress(0);
    setStage("experience");
  };

  const backToChoose = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    cancelPendingListen();
    if (audio.current) audio.current.pause();
    void listenMix.current?.pause();
    setListening(false);
    if (creatorPreview && onCreatorExit) {
      onCreatorExit();
      return;
    }
    setStage("choose");
  };

  const finishExperience = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    cancelPendingListen();
    void listenMix.current?.pause();
    setListening(false);
    setStage("ending");
  };

  const toggleListen = () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (audioUrl && audio.current) {
      const element=audio.current;
      if(listening){
        cancelPendingListen();
        element.pause();
        void listenMix.current?.pause();
        setListening(false);
        return;
      }
      const wasFinished=Number.isFinite(element.duration)&&element.currentTime>=element.duration-.1;
      if(wasFinished){
        element.currentTime=0;
        setListenProgress(0);
        listenHasStarted.current=false;
        listenIntroRemaining.current=KEEP_MUSIC_LEAD_SECONDS*1000;
        listenMix.current?.restartMusic(musicMood,
          (["Soft","Balanced","Full"].includes(voiceMusicBalance)?voiceMusicBalance:"Balanced") as MusicBalance,audioMix);
      }
      const attempt=++listenAttempt.current;
      setListening(true);
      const controller=listenMix.current;
      // Browsers without Web Audio still get the spoken message rather than a
      // dead Play button. On supported devices the full soundtrack plays first.
      if(!controller){
        listenHasStarted.current=true;
        void element.play().catch(()=>{if(attempt===listenAttempt.current)setListening(false);});
        return;
      }
      void controller.play().then(()=>{
        if(attempt!==listenAttempt.current)return;
        const beginVoice=()=>{
          if(attempt!==listenAttempt.current)return;
          listenIntroTimer.current=null;
          listenIntroRemaining.current=0;
          listenHasStarted.current=true;
          void element.play().catch(()=>{
            if(attempt!==listenAttempt.current)return;
            void controller.pause();
            setListening(false);
          });
        };
        if(!listenHasStarted.current&&element.currentTime<0.05){
          listenIntroStartedAt.current=performance.now();
          listenIntroTimer.current=window.setTimeout(beginVoice,listenIntroRemaining.current);
        }else beginVoice();
      }).catch(()=>{
        if(attempt===listenAttempt.current)setListening(false);
      });
      return;
    }
    if (listening) {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      setListening(false);
      return;
    }
    setListening(true);
    timer.current = window.setInterval(() => {
      setListenProgress((p) => {
        if (p >= 99) {
          if (timer.current) window.clearInterval(timer.current);
          timer.current = null;
          setListening(false);
          window.setTimeout(() => setStage("ending"), 350);
          return 100;
        }
        return p + 1;
      });
    }, Math.max(80, Math.round((audioDuration * 1000) / 100)));
  };

  if (stage === "experience" && experience === "watch") {
    return <main className="app-shell"><KeepPlayer name={name.toUpperCase()} from={from} year={year} subtitle={subtitle} recipient onExit={backToChoose} onFinish={finishExperience} style={style} captions={captions} media={media} audioUrl={audioUrl} audioDuration={audioDuration} lines={lines} captionCues={captionCues} musicMood={musicMood} voiceMusicBalance={voiceMusicBalance} voiceVolume={voiceVolume} musicVolume={musicVolume} captionPosition={captionPosition} captionLines={captionLines} audioMix={audioMix} /></main>;
  }

  if (stage === "experience" && experience === "listen") {
    return <KeepListenAndRead
      name={name} from={from} year={year} paragraphs={paragraphs}
      captionCues={captionCues} audioUrl={audioUrl} audioDuration={audioDuration}
      audioRef={audio} listening={listening} progress={listenProgress}
      knownDuration={listenDuration} onToggle={toggleListen}
      onProgress={setListenProgress} onDuration={setListenDuration}
      onListening={setListening} onBack={backToChoose}
      onBuffering={()=>{if(listening)void listenMix.current?.pause();}}
      onBufferEnded={()=>{if(listening)void listenMix.current?.play().catch(()=>setListening(false));}}
    />;
  }

  if (stage === "experience" && experience === "read") {
    return <main className="app-shell">
      <section className="keep-read min-h-dvh bg-[#F7F5F2] text-[#201D1A]">
        <header className="keep-read__header">
          <button type="button" aria-label="Back to experiences" onClick={backToChoose} className="keep-read__back"><ArrowLeft className="size-5" /></button>
          <img src="/brand/keep-wordmark.svg" alt="Keep" className="h-9 w-24 object-contain" />
          <span className="size-11" aria-hidden="true" />
        </header>
        <article className="keep-read__article">
          <div className="keep-read__opening">
            <span className="keep-read__eyebrow">A PERSONAL KEEP</span>
            <h1 className="keep-read__name">{name}</h1>
            <p className="keep-read__byline">{[from ? `from ${from}` : "", year].filter(Boolean).join(" · ")}</p>
            <KeepReadingMusic musicMood={musicMood} />
            <div className="keep-read__rule" aria-hidden="true" />
          </div>
          <div className="keep-read__story">{paragraphs.map((paragraph, i) => (
            <section key={i} className="keep-read__passage">
              {speakerNames?.[i] && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{speakerNames[i]}</p>}
              <p className={i === 0 ? "keep-read__paragraph keep-read__paragraph--opening" : "keep-read__paragraph"}>{paragraph}</p>
              
            </section>
          ))}</div>
          <footer className="keep-read__closing">
            <span className="keep-read__hairline" />
            <p className="keep-read__closing-words">Some things are worth keeping.</p>
            <p className="keep-read__closing-byline">{[from ? `with love, ${from}` : "", year].filter(Boolean).join(" · ")}</p>
            <button type="button" className="keep-read__finish" onClick={finishExperience}>Finish reading <ArrowRight className="size-4" /></button>
          </footer>
        </article>
      </section>
    </main>;
  }

  if (stage === "ending") {
    return <main className="app-shell">
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F7F5F2] text-[#25201D]">
        <header className="mx-auto flex w-full max-w-[640px] items-center justify-center px-7 pt-[max(40px,env(safe-area-inset-top))]">
          <span className="keep-wordmark !text-[32px]">Keep</span>
        </header>
        <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center justify-center px-7 py-14 text-center">
          <div className="mb-9 flex items-center gap-4" aria-hidden="true"><span className="h-px w-8 bg-[#B79F88]" /><span className="font-display text-lg text-[#9E8166]">✦</span><span className="h-px w-8 bg-[#B79F88]" /></div>
          <p className="mb-6 text-[10px] font-semibold uppercase tracking-[.23em] text-[#907762]">MADE TO BE REMEMBERED</p>
          <h1 className="max-w-[530px] font-display text-[clamp(43px,10.5vw,67px)] leading-[1.12] tracking-[-.055em]">
            Some things are<br /><span className="italic font-normal">worth keeping.</span>
          </h1>
          <div className="my-9 h-px w-16 bg-[#C9B9A8]" aria-hidden="true" />
          <p className="max-w-[305px] text-[13px] leading-7 text-[#796E63]">A little piece of someone's heart, made especially for {name}. Here whenever you want to experience it again.</p>
          <p className="mt-6 font-display text-[17px] italic text-[#8D7763]">{from ? `With love, ${from}` : "With love"}{year ? ` · ${year}` : ""}</p>
        </div>
        <footer className="mx-auto w-full max-w-[540px] space-y-3 px-7 pb-[max(46px,env(safe-area-inset-bottom))]">
          <Button variant="keep" size="touch" className="w-full justify-between" onClick={() => setStage("choose")}><RotateCcw className="size-4" /> Experience it again <ArrowRight className="size-4" /></Button>
          {creatorPreview && <Button variant="quiet" size="touch" className="w-full justify-between border border-[#DED4CA]" onClick={onCreatorExit ?? onCreatorContinue}>Back to editor <ArrowRight className="size-4" /></Button>}
        </footer>
      </section>
    </main>;
  }

  if (stage === "choose") {
    return <main className="app-shell"><div className="flex keep-min-screen flex-col px-7 pb-[max(38px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))]">
      <span className="keep-wordmark">Keep</span><div className="flex flex-1 flex-col justify-center py-12">
        <p className="eyebrow">{visited && !creatorPreview ? "WELCOME BACK" : "A KEEP FOR"}</p><h1 className="keep-editorial-title mt-5">{name}</h1><p className="mt-4 text-sm text-muted-foreground">from {from} · {year}</p>
        <p className="mt-10 max-w-sm font-display text-[32px] leading-[1.12] tracking-tight">{visited && !creatorPreview ? "How would you like to experience it?" : "How would you like to experience it?"}</p>
        <div className="mt-8 space-y-3">
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("watch")}><span className="flex items-center gap-4"><Images className="size-5" /><span><strong className="block font-normal">Watch, Listen &amp; Read</strong><small className="mt-1 block font-normal text-muted-foreground">Voice, photos, videos, music &amp; captions</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("listen")}><span className="flex items-center gap-4"><Headphones className="size-5" /><span><strong className="block font-normal">Listen &amp; Read</strong><small className="mt-1 block font-normal text-muted-foreground">Listen to their voice while reading every word</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("read")}><span className="flex items-center gap-4"><BookOpen className="size-5" /><span><strong className="block font-normal">Read</strong><small className="mt-1 block font-normal text-muted-foreground">Just the written message, no media</small></span></span><ArrowRight /></Button>
        </div>
      </div>
    </div></main>;
  }

  return <main className="app-shell">
    <KeepFirstPlayReveal
      name={name}
      occasion={subtitle}
      introduction={openingMessage}
      from={from}
      year={year}
      onOpen={enter}
      onOtherFormats={() => { setVisited(true); setStage("choose"); }}
      onCreatorExit={creatorPreview ? onCreatorExit : undefined}
    />
  </main>;
}

type ListenReadProps = {
  name: string; from: string; year: string; paragraphs: string[]; captionCues: CaptionCue[];
  audioUrl?: string | undefined; audioDuration: number; knownDuration: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  listening: boolean; progress: number;
  onToggle: () => void; onProgress: (value: number) => void; onDuration: (value: number) => void;
  onListening: (value: boolean) => void; onBack: () => void;
  onBuffering: () => void; onBufferEnded: () => void;
};

function KeepListenAndRead({ name, from, year, paragraphs, captionCues, audioUrl, audioDuration, knownDuration, audioRef,
  listening, progress, onToggle, onProgress, onDuration, onListening, onBack, onBuffering, onBufferEnded }: ListenReadProps) {
  const seconds = Math.max(1, knownDuration || audioDuration);
  const frames = useMemo(() => makeReadingFrames(captionCues, paragraphs, seconds), [captionCues, paragraphs, seconds]);
  const elapsed = Math.min(seconds, progress * seconds / 100);
  const frameIndex = frameAtTime(frames, elapsed);
  const finished = progress >= 99.8;
  const started = progress > 0.1;
  const shown = started && !finished && frameIndex >= 0 ? frames[frameIndex] : null;
  const stamp = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  return <main className="app-shell">
    <section className="relative flex h-[100dvh] min-h-[500px] flex-col overflow-hidden bg-[#F7F5F2] text-[#28221E]" aria-label={`Listen and read the Keep for ${name}`}>
      <header className="flex shrink-0 items-center justify-between px-6 pt-[max(20px,env(safe-area-inset-top))] sm:px-10">
        <button type="button" onClick={onBack} aria-label="Back to experiences" className="flex size-11 items-center justify-center rounded-full border border-[#D9CDC0]"><ArrowLeft className="size-5" /></button>
        <span className="keep-wordmark !text-[29px]">Keep</span>
        <span className="size-11" aria-hidden="true" />
      </header>
      <div className="shrink-0 px-6 pt-8 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#917C68]">LISTEN &amp; READ</p>
        <h1 className="mt-3 truncate font-display text-[clamp(39px,9vw,56px)] leading-none tracking-[-.055em]">{name}</h1>
        <p className="mt-2 text-xs text-[#8B7D70]">{[from ? `from ${from}` : "", year].filter(Boolean).join(" · ")}</p>
      </div>
      {audioUrl && <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" preload="metadata"
        onLoadedMetadata={e => {const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>0)onDuration(d);}}
        onPlay={() => onListening(true)}
        onWaiting={onBuffering}
        onStalled={onBuffering}
        onPlaying={onBufferEnded}
        onPause={() => onListening(false)}
        onEnded={() => {onListening(false);onProgress(100);}}
        onTimeUpdate={e => {const el=e.currentTarget;const d=Number.isFinite(el.duration)&&el.duration>0?el.duration:seconds;onProgress(Math.min(100,el.currentTime/d*100));}}
      />}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-7 py-9 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-[12%] mx-auto h-px w-12 bg-[#D9C9B7]" aria-hidden="true" />
        {shown ? <div key={frameIndex} className="keep-immersive-caption max-w-[540px]">
          <p className="line-clamp-4 whitespace-normal font-display text-[clamp(30px,8.2vw,47px)] leading-[1.24] tracking-[-.028em] text-[#29231E]">{shown.text}</p>
        </div> : <div className="max-w-[360px]">
          <p className="font-display text-[clamp(30px,7vw,43px)] leading-[1.24] italic tracking-[-.03em] text-[#5D4A3C]">{finished ? "Every word was meant for you." : "Some words deserve to be heard."}</p>
          {!started && <p className="mt-6 text-xs leading-6 text-[#8C7E70]">Press play and let their message unfold.</p>}
        </div>}
        <div className="pointer-events-none absolute inset-x-0 bottom-[12%] mx-auto h-px w-12 bg-[#D9C9B7]" aria-hidden="true" />
      </div>
      <footer className="shrink-0 px-8 pb-[max(32px,env(safe-area-inset-bottom))] text-center">
        <button type="button" onClick={onToggle} aria-label={listening ? "Pause narration" : finished ? "Replay narration" : "Play narration"}
          className="mx-auto flex size-[76px] items-center justify-center rounded-full bg-[#28221D] text-[#FAF6F0] shadow-[0_14px_35px_rgba(50,36,22,.20)] transition-transform active:scale-95">
          {listening ? <Pause className="size-7" fill="currentColor" /> : <Play className="ml-1 size-7" fill="currentColor" />}
        </button>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#847260]">{listening ? "NOW PLAYING" : finished ? "EXPERIENCE IT AGAIN" : "LISTEN TO THE MESSAGE"}</p>
        <div className="mx-auto mt-5 flex max-w-[400px] items-center gap-3 text-[10px] tabular-nums text-[#877869]">
          <span>{stamp(elapsed)}</span>
          <input type="range" min="0" max="100" step=".2" value={progress} aria-label="Narration position" onChange={e=>{const pct=Number(e.target.value);onProgress(pct);if(audioRef.current&&Number.isFinite(audioRef.current.duration)&&audioRef.current.duration>0)audioRef.current.currentTime=pct/100*audioRef.current.duration;}}
            className="h-1 flex-1 cursor-pointer accent-[#79634E]" />
          <span>{stamp(seconds)}</span>
        </div>
      </footer>
    </section>
  </main>;
}

