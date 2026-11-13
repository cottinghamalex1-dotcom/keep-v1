import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Images, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeepPlayer, type PlayerMedia } from "@/components/keep-player";
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
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (audioUrl && audio.current) {
      const element = audio.current;
      if (listening) {
        if (listenIntroTimer.current) window.clearTimeout(listenIntroTimer.current);
        listenIntroTimer.current = null;
        element.pause();
        void listenMix.current?.pause();
        setListening(false);
      } else {
        if (Number.isFinite(element.duration) && element.currentTime >= element.duration - 0.1) {
          element.currentTime = 0;
          setListenProgress(0);
        }
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
      <section className="min-h-dvh bg-[#F7F5F2] text-[#25201D]" aria-label={`Listen and read the Keep for ${name}`}>
        <header className="mx-auto flex h-[82px] max-w-3xl items-center justify-between border-b border-[#DFD7CF] px-6">
          <button type="button" onClick={backToChoose} aria-label="Back to experiences" className="flex size-11 items-center justify-center rounded-full border border-[#DCCFC0]"><ArrowLeft className="size-5" /></button>
          <span className="font-display text-[29px] tracking-[-.055em]">Keep</span><span className="size-11" />
        </header>
        <div className="mx-auto max-w-[650px] px-6 pb-[max(100px,env(safe-area-inset-bottom))]">
          <div className="pb-9 pt-12 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#937D68]">LISTEN &amp; READ · A PERSONAL KEEP</p>
            <h1 className="mt-5 font-display text-[clamp(54px,12vw,82px)] leading-none tracking-[-.055em]">{name}</h1>
            <p className="mt-4 text-xs tracking-[.05em] text-[#807367]">{[from ? `from ${from}` : "", year].filter(Boolean).join(" · ")}</p>
          </div>
          {audioUrl && <audio ref={audio} crossOrigin="anonymous" src={audioUrl} preload="metadata"
            onLoadedMetadata={e => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setListenDuration(d); }}
            onPlay={() => { listenHasStarted.current = true; setListening(true); }}
            onPause={() => { if (!listenIntroTimer.current) setListening(false); }}
            onEnded={() => { setListening(false); timer.current = window.setTimeout(() => { void listenMix.current?.pause(); }, KEEP_MUSIC_TAIL_SECONDS * 1000); }}
            onTimeUpdate={e => { const el = e.currentTarget; const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : audioDuration; setListenProgress(Math.min(100, (el.currentTime / d) * 100)); }}
          />}
          <div className="sticky top-3 z-20 rounded-[22px] border border-[#D6C7B8] bg-[#FFFCF7]/95 p-5 shadow-[0_14px_40px_rgba(43,30,18,.10)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#907B68]">THE ORIGINAL VOICES</p>
                <p className="mt-1 font-display text-[clamp(19px,5vw,24px)] text-[#302922]">{listening ? "Listen to their words." : listenProgress >= 99 ? "Their message is yours." : "Read along, at your pace."}</p>
              </div>
              <button type="button" aria-label={listening ? "Pause narration" : "Play narration"} onClick={toggleListen} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#25201D] text-[#F7F5F2] shadow-sm active:scale-95">
                {listening ? <Pause className="size-6" fill="currentColor" /> : <Play className="ml-1 size-6" fill="currentColor" />}
              </button>
            </div>
            <input type="range" min="0" max="100" step=".1" value={listenProgress} aria-label="Audio playback position"
              onChange={e => {const pct = Number(e.target.value);setListenProgress(pct);if(audio.current && Number.isFinite(audio.current.duration) && audio.current.duration > 0)audio.current.currentTime=pct/100*audio.current.duration;}}
              className="mt-5 h-1.5 w-full cursor-pointer accent-[#7D6753]" />
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-[#817365]"><span>{stamp(elapsed)}</span><span>{stamp(total)}</span></div>
          </div>
          <div className="mx-auto mt-12 h-10 w-px bg-gradient-to-b from-transparent via-[#B7A58F] to-transparent" aria-hidden="true" />
          <article className="mx-auto max-w-[580px]">
            <p className="mb-8 text-center text-[10px] font-semibold uppercase tracking-[.18em] text-[#9A8775]">THE WORDS THEY WANTED YOU TO HEAR</p>
            <div className="space-y-10">{paragraphs.map((paragraph, i) => <section key={i}>
              {speakerNames?.[i] && <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#8C7660]">{speakerNames[i]}</p>}
              <p className="whitespace-pre-wrap font-display text-[clamp(22px,5.6vw,30px)] leading-[1.58] tracking-[-.012em] text-[#302922]">{paragraph}</p>
            </section>)}</div>
          </article>
          <footer className="mt-16 border-t border-[#D8CBBE] pt-9 text-center">
            <p className="font-display text-[29px] italic text-[#544535]">Some things are worth keeping.</p>
            <button type="button" onClick={finishExperience} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full border border-[#BBA994] px-6 text-xs font-semibold text-[#5C4938]">Finish this experience <ArrowRight className="size-4" /></button>
          </footer>
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
          <span className="font-display text-[32px] tracking-[-.055em]">Keep</span>
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
