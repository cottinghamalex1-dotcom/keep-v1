import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Images, Mic, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages } from "@/components/keep-player";

export const Route = createFileRoute("/recipient")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search["name"] === "string" ? search["name"].slice(0, 50) : "Hanna",
    from: typeof search["from"] === "string" ? search["from"].slice(0, 50) : "Alex",
    year: typeof search["year"] === "string" ? search["year"].slice(0, 4) : "2026",
  }),
  head: () => ({ meta: [
    { title: "A private Keep — KEEP" },
    { name: "description", content: "Something meaningful was kept for you." },
    { property: "og:title", content: "A private Keep — KEEP" },
    { property: "og:description", content: "Something meaningful was kept for you." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Recipient,
});

type Experience = "watch" | "listen" | "read";
const demoMessage = [
  "Hanna, I wanted to make this because there are so many things that I think about you and appreciate about you that I probably don't say enough.",
  "You're my best friend. You're my sounding board. You're my encourager. You're the person who believes in me when I don't believe in myself.",
  "One of the things I notice most is the way you make people feel. You have this ability to make people feel seen and known and heard and loved. You make people feel at home.",
  "And then I got to watch you become a mom. In the smallest, most ordinary moments, I see the life we've made together and I can't believe I get to share it with you.",
  "Twenty years from now, I hope you know this: through every version of us, I'd choose this life with you again. Always.",
];

function Recipient() {
  const { name, from, year } = Route.useSearch();
  const visitKey = useMemo(() => `keep.recipient.opened.${name}.${from}.${year}`, [name, from, year]);
  const [visited, setVisited] = useState(false);
  const [stage, setStage] = useState<"reveal" | "choose" | "experience" | "ending">("reveal");
  const [experience, setExperience] = useState<Experience>("watch");
  const [listening, setListening] = useState(false);
  const [listenProgress, setListenProgress] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try { setVisited(localStorage.getItem(visitKey) === "1"); } catch { /* private browsing */ }
  }, [visitKey]);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const enter = () => {
    try { localStorage.setItem(visitKey, "1"); } catch { /* private browsing */ }
    setVisited(true);
    setStage("choose");
  };
  const choose = (next: Experience) => {
    setExperience(next);
    setListening(false);
    setListenProgress(0);
    setStage("experience");
  };
  const backToChoose = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setListening(false);
    setStage("choose");
  };
  const toggleListen = () => {
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
          window.setTimeout(() => setStage("ending"), 400);
          return 100;
        }
        return p + 1;
      });
    }, 180);
  };

  if (stage === "experience" && experience === "watch") {
    return <main className="app-shell"><KeepPlayer name={name.toUpperCase()} from={from} year={year} recipient onExit={backToChoose} onFinish={() => setStage("ending")} /></main>;
  }

  if (stage === "experience" && experience === "listen") {
    return <main className="app-shell"><div className="flex min-h-dvh flex-col px-7 pb-[max(38px,env(safe-area-inset-bottom))] pt-[max(32px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between"><Button variant="bare" size="icon" aria-label="Back" onClick={backToChoose}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><span className="size-10" /></div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-10 flex size-16 items-center justify-center rounded-full border border-border"><Headphones className="size-6 text-accent" /></div>
        <p className="eyebrow mb-5">A KEEP FOR</p><h1 className="display text-6xl uppercase">{name}</h1><p className="mt-5 text-sm text-muted-foreground">from {from} · {year}</p>
        <div className="mt-14 w-full"><div className="h-px w-full bg-border"><div className="h-px bg-foreground transition-[width]" style={{ width: `${listenProgress}%` }} /></div><div className="mt-3 flex justify-between text-[10px] tracking-widest text-muted-foreground"><span>{Math.floor(listenProgress * 2.37 / 60)}:{String(Math.floor(listenProgress * 2.37 % 60)).padStart(2,"0")}</span><span>3:57</span></div></div>
        <Button variant="keep" className="mt-10 size-16 rounded-full p-0" aria-label={listening ? "Pause" : "Play"} onClick={toggleListen}>{listening ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button>
        <p className="mt-8 max-w-64 text-xs leading-5 text-muted-foreground">Just {from}'s voice and the music behind it. Nothing else competing for your attention.</p>
      </div>
    </div></main>;
  }

  if (stage === "experience" && experience === "read") {
    return <main className="app-shell"><div className="min-h-dvh pb-20">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur-xl"><Button variant="bare" size="icon" aria-label="Back" onClick={backToChoose}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><span className="size-10" /></div>
      <article className="px-7 pb-10 pt-14">
        <p className="eyebrow">A KEEP FOR</p><h1 className="display mt-4 text-6xl uppercase">{name}</h1><p className="mt-4 text-sm text-muted-foreground">from {from} · {year}</p>
        <div className="mt-14 space-y-10">{demoMessage.map((paragraph, i) => <div key={paragraph}><p className="font-display text-[25px] leading-[1.55]">{paragraph}</p>{(i === 0 || i === 2 || i === 3) && <figure className="mt-9 overflow-hidden rounded-sm"><img src={memoryImages[i === 0 ? 1 : i === 2 ? 2 : 3]} alt="A memory from this Keep" className="aspect-[4/3] w-full object-cover" /></figure>}</div>)}</div>
        <div className="mt-16 border-t border-border pt-10 text-center"><p className="display text-4xl">SOME THINGS ARE<br />WORTH KEEPING.</p><Button variant="quiet" size="touch" className="mt-10 w-full" onClick={() => setStage("ending")}>Finish reading</Button></div>
      </article>
    </div></main>;
  }

  if (stage === "ending") {
    return <main className="app-shell"><div className="flex min-h-dvh flex-col items-center justify-center px-7 text-center">
      <span className="brand mb-20">KEEP</span><h1 className="display text-5xl">SOME THINGS ARE<br />WORTH KEEPING.</h1><p className="mt-7 max-w-64 text-sm leading-6 text-muted-foreground">This one is yours. Come back whenever you want to experience it again.</p>
      <div className="mt-14 w-full space-y-3"><Button variant="keep" size="touch" className="w-full" onClick={() => setStage("choose")}><RotateCcw /> Experience it again</Button><Button variant="quiet" size="touch" className="w-full" onClick={() => setStage("choose")}><Mic /> Send {from} a response</Button></div>
      <p className="mt-5 max-w-64 text-[11px] leading-5 text-muted-foreground">Voice responses are coming next. Your Keep stays private.</p>
    </div></main>;
  }

  if (stage === "choose") {
    return <main className="app-shell"><div className="flex min-h-dvh flex-col px-7 pb-[max(38px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))]">
      <span className="brand">KEEP</span><div className="flex flex-1 flex-col justify-center py-12">
        <p className="eyebrow">{visited ? "WELCOME BACK" : "A KEEP FOR"}</p><h1 className="display mt-5 text-6xl uppercase">{name}</h1><p className="mt-4 text-sm text-muted-foreground">from {from} · {year}</p>
        <p className="mt-12 max-w-sm font-display text-3xl leading-tight">{visited ? "How would you like to experience it?" : "Choose how you want to experience what was kept for you."}</p>
        <div className="mt-8 space-y-3">
          <Button variant="keep" className="h-auto w-full justify-between p-5 text-left" onClick={() => choose("watch")}><span className="flex items-center gap-4"><Images className="size-5" /><span><strong className="block font-normal">Watch</strong><small className="mt-1 block font-normal text-foreground/70">Voice, memories, music + captions</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-5 text-left" onClick={() => choose("listen")}><span className="flex items-center gap-4"><Headphones className="size-5" /><span><strong className="block font-normal">Listen</strong><small className="mt-1 block font-normal text-muted-foreground">Voice + music, without the screen</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-5 text-left" onClick={() => choose("read")}><span className="flex items-center gap-4"><BookOpen className="size-5" /><span><strong className="block font-normal">Read</strong><small className="mt-1 block font-normal text-muted-foreground">Their words, woven together with memories</small></span></span><ArrowRight /></Button>
        </div>
      </div>
    </div></main>;
  }

  return <main className="app-shell"><div className="relative flex h-dvh min-h-[600px] flex-col overflow-hidden"><img src={memoryImages[0]} alt="A memory from this Keep" className="absolute inset-0 h-full w-full object-cover opacity-35" /><div className="absolute inset-0 photo-shade" /><div className="relative z-10 flex h-full flex-col items-center justify-between px-7 pb-[max(45px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))] text-center"><span className="brand">KEEP</span><div><p className="eyebrow mb-7 text-foreground">A KEEP FOR</p><h1 className="display text-7xl uppercase">{name}</h1><p className="mt-7 font-display text-3xl">Something was kept for you.</p><p className="mt-5 text-sm text-foreground/75">from {from} · {year}</p></div><div className="w-full"><Volume2 className="mx-auto mb-6 size-5 text-accent" /><Button variant="keep" size="touch" className="w-full justify-between" onClick={enter}>Experience your Keep <ArrowRight /></Button></div></div></div></main>;
}
