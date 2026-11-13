import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Images, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, type PlayerMedia } from "@/components/keep-player";
import { KeepFirstPlayReveal } from "@/components/keep-first-play-reveal";
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
  readMedia,
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
  const items = media?.length ? media : memoryImages.map((url) => ({ url, kind: "image" as const }));
  const readItems = readMedia?.length ? readMedia : items;
  const paragraphs = messageParagraphs?.length ? messageParagraphs : demoMessage;

  useEffect(() => {
    if (!persistVisit) return;
    try { setVisited(localStorage.getItem(visitKey) === "1"); } catch { /* private browsing */ }
  }, [persistVisit, visitKey]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (stage !== "experience" || experience !== "listen" || !audioUrl || !audio.current) return;
    const balance = (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance;
    const controller = createKeepVoiceMix(audio.current, musicMood, balance, audioDuration, KEEP_MUSIC_LEAD_SECONDS, audioMix);
    listenMix.current = controller;
    controller?.setLevels(voiceVolume, musicVolume);
    listenHasStarted.current = false;
    return () => {
      if (listenIntroTimer.current) window.clearTimeout(listenIntroTimer.current);
      listenIntroTimer.current = null;
      void controller?.stop();
      listenMix.current = null;
      listenHasStarted.current = false;
    };
  }, [stage, experience, audioUrl, audioDuration, musicMood, voiceMusicBalance, voiceVolume, musicVolume]);

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
    if (audio.current) audio.current.pause();
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
    setListening(false);
    setStage("ending");
  };

  const toggleListen = () => {
    if (audioUrl && audio.current) {
      const element = audio.current;
      if (listening) {
        if (listenIntroTimer.current) window.clearTimeout(listenIntroTimer.current);
        listenIntroTimer.current = null;
        element.pause();
        void listenMix.current?.pause();
        setListening(false);
      } else {
        setListening(true);
        // Do not start the voice clock until the selected music has genuinely
        // started playing (a large MP3 may need to buffer on cellular).
        const controller = listenMix.current;
        void (controller?.play() ?? Promise.reject(new Error("Music unavailable"))).then(() => {
          if (!listenHasStarted.current && element.currentTime < 0.05) {
            listenIntroTimer.current = window.setTimeout(() => {
              listenIntroTimer.current = null;
              listenHasStarted.current = true;
              void element.play().catch(() => setListening(false));
            }, KEEP_MUSIC_LEAD_SECONDS * 1000);
          } else {
            void element.play().catch(() => setListening(false));
          }
        }).catch(() => setListening(false));
      }
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
    const total = Math.max(1, listenDuration || audioDuration);
    const elapsed = Math.min(total, (listenProgress / 100) * total);
    const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
    return <main className="app-shell">
      <section className="keep-listen min-h-dvh text-[#F7F5F2]" aria-label={`Listen to the Keep for ${name}`}>
        <header className="keep-listen__header">
          <button type="button" onClick={backToChoose} aria-label="Back to experiences" className="keep-listen__back"><ArrowLeft className="size-5" /></button>
          <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="h-9 w-24 object-contain" />
          <span className="size-11" aria-hidden="true" />
        </header>
        <div className="keep-listen__inner">
          <div className="keep-listen__details">
            <p className="keep-listen__eyebrow">A KEEP FOR</p>
            <h1 className="keep-listen__name">{name}</h1>
            <p className="keep-listen__signature">{[from ? `from ${from}` : "", year].filter(Boolean).join(" · ")}</p>
          </div>
          {audioUrl && <audio ref={audio} crossOrigin="anonymous" src={audioUrl} preload="metadata"
            onLoadedMetadata={(event) => { const d = event.currentTarget.duration; if (Number.isFinite(d) && d > 0) setListenDuration(d); }}
            onPlay={() => { listenHasStarted.current = true; setListening(true); }}
            onPause={() => { if (!listenIntroTimer.current) setListening(false); }}
            onEnded={() => { setListening(false); timer.current = window.setTimeout(finishExperience, KEEP_MUSIC_TAIL_SECONDS * 1000); }}
            onTimeUpdate={(event) => { const a = event.currentTarget; const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : audioDuration; setListenProgress(Math.min(100, (a.currentTime / d) * 100)); }}
          />}
          <div className="keep-listen__controls">
            <div className="keep-listen__progress">
              <input type="range" min="0" max="100" step=".1" value={listenProgress}
                aria-label="Audio playback position"
                onChange={(event) => {
                  const pct = Number(event.target.value);
                  setListenProgress(pct);
                  if (audio.current && Number.isFinite(audio.current.duration) && audio.current.duration > 0) audio.current.currentTime = pct / 100 * audio.current.duration;
                }}
                className="keep-listen__range"
                style={{ background: `linear-gradient(to right, #DDCAB5 ${listenProgress}%, rgba(247,245,242,.20) ${listenProgress}%)` }}
              />
              <div className="keep-listen__times"><span>{stamp(elapsed)}</span><span>{stamp(total)}</span></div>
            </div>
            <button type="button" className="keep-listen__play" aria-label={listening ? "Pause narration" : "Play narration"} onClick={toggleListen}>
              {listening ? <Pause className="size-7" fill="currentColor" /> : <Play className="ml-1 size-7" fill="currentColor" />}
            </button>
            <p className="keep-listen__hint">{listening ? "Playing your Keep" : "Press play when you're ready"}</p>
          </div>
          <div className="keep-listen__footer"><div className="mx-auto mb-5 h-px w-12 bg-[#C4AD91]/50" /><p>Some things are worth listening to.</p></div>
        </div>
      </section>
    </main>;
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
            <div className="keep-read__rule" aria-hidden="true" />
          </div>
          <div className="keep-read__story">{paragraphs.map((paragraph, i) => (
            <section key={i} className="keep-read__passage">
              {speakerNames?.[i] && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{speakerNames[i]}</p>}
              <p className={i === 0 ? "keep-read__paragraph keep-read__paragraph--opening" : "keep-read__paragraph"}>{paragraph}</p>
              {i < 4 && readItems[i] && <figure className="keep-read__figure">
                {readItems[i]!.kind === "video"
                  ? <video src={readItems[i]!.url} controls playsInline preload="metadata" className="keep-read__photo" />
                  : <img src={readItems[i]!.url} alt={`Memory ${i + 1} in this Keep`} loading="lazy" className="keep-read__photo" />}
              </figure>}
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
    return <main className="app-shell"><div className="flex keep-min-screen flex-col items-center justify-center px-7 text-center">
      <span className="keep-wordmark mb-20">Keep</span><h1 className="keep-editorial-title">SOME THINGS ARE<br />WORTH KEEPING.</h1><p className="mt-7 max-w-64 text-sm leading-6 text-muted-foreground">This one is yours. Come back whenever you want to experience it again.</p>
      <div className="mt-14 w-full space-y-3"><Button variant="keep" size="touch" className="w-full" onClick={() => setStage("choose")}><RotateCcw /> Experience it again</Button>{creatorPreview ? <Button variant="quiet" size="touch" className="w-full" onClick={onCreatorExit ?? onCreatorContinue}>Back to editor <ArrowRight /></Button> : null}</div>
    </div></main>;
  }

  if (stage === "choose") {
    return <main className="app-shell"><div className="flex keep-min-screen flex-col px-7 pb-[max(38px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))]">
      <span className="keep-wordmark">Keep</span><div className="flex flex-1 flex-col justify-center py-12">
        <p className="eyebrow">{visited && !creatorPreview ? "WELCOME BACK" : "A KEEP FOR"}</p><h1 className="keep-editorial-title mt-5">{name}</h1><p className="mt-4 text-sm text-muted-foreground">from {from} · {year}</p>
        <p className="mt-10 max-w-sm font-display text-[32px] leading-[1.12] tracking-tight">{visited && !creatorPreview ? "How would you like to experience it?" : "How would you like to experience it?"}</p>
        <div className="mt-8 space-y-3">
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("watch")}><span className="flex items-center gap-4"><Images className="size-5" /><span><strong className="block font-normal">Watch</strong><small className="mt-1 block font-normal text-muted-foreground">Voice, memories, music + captions</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("listen")}><span className="flex items-center gap-4"><Headphones className="size-5" /><span><strong className="block font-normal">Listen</strong><small className="mt-1 block font-normal text-muted-foreground">Voice + music, without the screen</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="keep-editorial-surface h-auto w-full justify-between p-5 text-left" onClick={() => choose("read")}><span className="flex items-center gap-4"><BookOpen className="size-5" /><span><strong className="block font-normal">Read</strong><small className="mt-1 block font-normal text-muted-foreground">Their words, woven together with memories</small></span></span><ArrowRight /></Button>
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
