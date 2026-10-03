import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Ellipsis, GripVertical, Images, LockKeyhole, MessageCircle, Mic, Music2, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, memoryLabels } from "@/components/keep-player";
import { KeepErrorBoundary } from "@/components/keep-error-boundary";
import { useRecorder } from "@/hooks/use-recorder";
import { deleteBlobs, putBlob } from "@/lib/keep-media-store";
import { ONBOARD_KEY, fmt, hydrateDraftMedia, loadDraft, newId, newProject, projectBlobIds, projectObjectUrls, sampleMemories, saveDraft, stageLabels, type InterviewAnswer, type KeepProject, type MediaItem } from "@/lib/keep-project";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "KEEP — Say what matters. Keep it forever." },
    { name: "description", content: "Create a personal memory-film from your words, your voice, and the moments worth keeping." },
    { property: "og:title", content: "KEEP — Say what matters. Keep it forever." },
    { property: "og:description", content: "Create a personal memory-film from your words, your voice, and the moments worth keeping." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: KeepRoute,
});

type Screen = "onboarding" | "home" | "you" | "detail" | "recipient" | "occasion" | "path" | "interview" | "summary" | "write" | "message" | "record" | "recorded" | "memories" | "generating" | "editor" | "preview" | "card" | "success";
type Mode = "Memories" | "Music" | "Captions" | "Style";
const creationScreens: Screen[] = ["recipient", "occasion", "path", "interview", "summary", "write", "message", "record", "recorded", "memories", "generating", "editor", "preview", "card", "success"];
const resumeScreen = (s: Screen): Screen => (s === "generating" ? "memories" : s === "preview" ? "editor" : s);
const occasions = ["Birthday", "Anniversary", "Wedding", "New Baby", "Mother's Day", "Father's Day", "Graduation", "Thank You", "Just Because", "Other"];
const relationships = ["Spouse", "Mom", "Dad", "Child", "Grandparent", "Friend", "Someone else"];
const questions = [
  "Tell me about Hanna. Who is she to you beyond just being your wife?",
  "You said she makes people feel at home. Can you remember a specific moment when you really noticed that?",
  "What are the little ordinary things about her that you never want to forget?",
  "How has your life changed watching her become a mom?",
  "When you picture the two of you twenty years from now, what do you hope she knows?",
];
const answers = [
  "She's my best friend. She's my sounding board, my encourager, and the person who believes in me when I don't believe in myself.",
  "At our first dinner with friends, she noticed someone was quiet and made room for them. By the end of the night, they felt like family.",
  "The way she hums while she makes coffee. How she reaches for my hand without thinking. How she remembers what everyone needs.",
  "Then I got to watch her become a mom, and somehow my love for her found a whole new shape.",
  "I hope she knows that through all the changes, I would choose this life with her again. Every time.",
];
const initialMessage = [
  "Hanna, I wanted to make this because there are so many things that I think about you and appreciate about you that I probably don't say enough.",
  "You're my best friend. You're my sounding board. You're my encourager. You're the person who believes in me when I don't believe in myself.",
  "One of the things I notice most is the way you make people feel. You have this ability to make people feel seen and known and heard and loved. You make people feel at home.",
  "And then I got to watch you become a mom. In the smallest, most ordinary moments, I see the life we've made together and I can't believe I get to share it with you.",
  "Twenty years from now, I hope you know this: through every version of us, I'd choose this life with you again. Always.",
];
const tracks = [
  { name: "Warm + Nostalgic", note: "Soft piano, golden-hour feeling", group: "For You" },
  { name: "Joyful", note: "Lighthearted and full of life", group: "For You" },
  { name: "Cinematic", note: "A story that stays with you", group: "For You" },
  { name: "Romantic", note: "Tender, close, timeless", group: "More feelings" },
  { name: "Hopeful", note: "A little light ahead", group: "More feelings" },
  { name: "Playful", note: "For the memories that make you smile", group: "More feelings" },
  { name: "Reflective", note: "Quiet and thoughtful", group: "More feelings" },
  { name: "Acoustic", note: "Warm strings and open air", group: "More feelings" },
  { name: "Piano", note: "Just the keys and your words", group: "More feelings" },
];
const captionOptions = ["Clean", "Reel", "Film", "Story", "Minimal", "None"];
const styles = [{ name: "Natural", note: "Clean, subtle movement" }, { name: "Warm", note: "Gentle warmth, soft dissolves" }, { name: "Film", note: "Cinematic grain, slower movement" }, { name: "Modern", note: "Crisp movement, contemporary type" }];
const withName = (t: string, name: string) => t.split("Hanna").join(name || "them");
const releaseUrls = (urls: (string | undefined)[]) => urls.forEach((u) => { if (u && u.startsWith("blob:")) URL.revokeObjectURL(u); });

function KeepRoute() {
  const [key, setKey] = useState(0);
  return <KeepErrorBoundary onReset={() => setKey((k) => k + 1)}><KeepApp key={key} /></KeepErrorBoundary>;
}

function MediaView({ item, className, alt, thumb = false }: { item: MediaItem; className: string; alt: string; thumb?: boolean }) {
  if (!item.url) return <div className={`${className} bg-card`} aria-label="Media unavailable" />;
  if (item.kind === "video") return thumb ? <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" className={className} aria-label={alt} /> : <video src={item.url} autoPlay muted loop playsInline className={className} aria-label={alt} />;
  return <img src={item.url} alt={alt} className={className} />;
}

function KeepApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [history, setHistory] = useState<Screen[]>([]);
  const [project, setProject] = useState<KeepProject>(newProject);
  const [hydrated, setHydrated] = useState(false);
  const [viewingDemo, setViewingDemo] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [mode, setMode] = useState<Mode>("Memories");
  const [frame, setFrame] = useState(0);
  const [duration, setDuration] = useState(4);
  const [editorPlaying, setEditorPlaying] = useState(true);
  const [cardBack, setCardBack] = useState(false);
  const [setting, setSetting] = useState("");
  const [scroll, setScroll] = useState(0);
  const [scrollPaused, setScrollPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [otherOccasion, setOtherOccasion] = useState("");
  const [dictating, setDictating] = useState(false);
  const dictationRef = useRef<any>(null);
  const recorder = useRecorder();
  const lastElapsed = useRef(0);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const patch = (p: Partial<KeepProject>) => setProject((o) => ({ ...o, ...p }));
  const name = project.recipientName;
  const q = project.questionIndex;
  const qs = questions.map((t) => withName(t, name));

  // Load lightweight draft + onboarding flag after hydration, then restore media blobs from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    const d = loadDraft();
    if (d) setProject(d);
    try { if (!localStorage.getItem(ONBOARD_KEY)) setScreen("onboarding"); } catch { /* ignore */ }
    setHydrated(true);
    if (d) void hydrateDraftMedia(d).then((h) => { if (!cancelled) setProject((cur) => ({ ...cur, ...h })); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (hydrated) saveDraft(project); }, [project, hydrated]);
  useEffect(() => { if (project.active && !viewingDemo && creationScreens.includes(screen)) setProject((o) => (o.stage === resumeScreen(screen) ? o : { ...o, stage: resumeScreen(screen) })); }, [screen]);
  useEffect(() => { if (screen !== "interview" && screen !== "record") recorder.cancel(); }, [screen]);
  useEffect(() => { const d = recorder.elapsed - lastElapsed.current; lastElapsed.current = recorder.elapsed; if (screen === "record" && d > 0 && d < 2 && !scrollPaused) setScroll((s) => s + d * 15); }, [recorder.elapsed]);

  const go = (next: Screen) => { setHistory((h) => [...h, screen]); setScreen(next); window.scrollTo(0, 0); };
  const back = () => { const last = history[history.length - 1]; setScreen(last ?? "home"); setHistory((h) => h.slice(0, -1)); window.scrollTo(0, 0); };
  const home = () => { setHistory([]); setScreen("home"); setViewingDemo(false); window.scrollTo(0, 0); };
  const discard = (p: KeepProject) => { releaseUrls(projectObjectUrls(p)); void deleteBlobs(projectBlobIds(p)); };
  const startProject = (p: KeepProject, at: Screen) => {
    if (project.active && !window.confirm("Start a new Keep? Your current draft will be replaced.")) return;
    discard(project);
    setProject({ ...p, active: true, stage: at });
    setViewingDemo(false); setFrame(0); setMode("Memories");
    setHistory(["home"]); setScreen(at); window.scrollTo(0, 0);
  };
  const begin = () => startProject(newProject(), "recipient");
  const editDemoCopy = () => startProject({ ...newProject(), recipientName: "Hanna", relationship: "Spouse", messageSource: "demo", messageParagraphs: initialMessage, memories: sampleMemories(), finalVoiceRecording: { durationSec: 237, demo: true }, cardEngraving: ["HANNA", "FROM ALEX", "2026"] }, "editor");
  const continueDraft = () => { setViewingDemo(false); setHistory(["home"]); setScreen((project.stage as Screen) || "recipient"); };
  const dismissOnboarding = () => { try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ } };

  // ---- Interview ----
  const currentAnswer = project.interviewAnswers.find((a) => a.questionIndex === q);
  const setAnswer = (a: InterviewAnswer) => {
    const old = project.interviewAnswers.find((x) => x.questionIndex === a.questionIndex);
    if (old) { releaseUrls([old.audioUrl]); if (old.audioId) void deleteBlobs([old.audioId]); }
    patch({ interviewAnswers: [...project.interviewAnswers.filter((x) => x.questionIndex !== a.questionIndex), a].sort((x, y) => x.questionIndex - y.questionIndex) });
  };
  const startAnswer = async () => { const ok = await recorder.start(); if (!ok) toast.error("The microphone isn't available right now."); };
  const stopAnswer = async () => {
    const r = await recorder.stop();
    if (!r) { toast.error("Nothing was recorded. Try again."); return; }
    const id = newId("answer");
    const stored = await putBlob(id, r.blob);
    setAnswer({ questionIndex: q, question: qs[q] ?? "", audioId: stored ? id : undefined, audioUrl: URL.createObjectURL(r.blob), durationSec: r.durationSec, mimeType: r.mimeType });
  };
  const useDemoAnswer = () => setAnswer({ questionIndex: q, question: qs[q] ?? "", demoText: withName(answers[q] ?? "", name) });
  const nextQuestion = () => { if (q < questions.length - 1) patch({ questionIndex: q + 1 }); else go("summary"); };
  const realAnswers = project.interviewAnswers.filter((a) => a.audioId || a.audioUrl);
  const demoMessage = () => { patch({ messageParagraphs: initialMessage.map((p) => withName(p, name)), messageSource: "demo" }); setActiveParagraph(0); go("message"); };

  // ---- Voice dictation for “I know what I want to say” ----
  const toggleDictation = () => {
    if (dictating && dictationRef.current) { dictationRef.current.stop(); return; }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("Voice dictation isn’t supported in this browser. Try Safari or Chrome, or type your message instead."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setDictating(true);
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += (event.results[i][0]?.transcript ?? "") + " ";
      }
      if (finalText.trim()) {
        setProject((o) => ({ ...o, writtenText: `${o.writtenText}${o.writtenText && !o.writtenText.endsWith(" ") ? " " : ""}${finalText.trim()}` }));
      }
    };
    recognition.onerror = () => { setDictating(false); toast.error("Dictation stopped. Tap Speak to try again."); };
    recognition.onend = () => setDictating(false);
    dictationRef.current = recognition;
    recognition.start();
  };

  // ---- Final voice recording ----
  const rec = project.finalVoiceRecording;
  const startFinal = async () => { setScroll(0); setScrollPaused(false); lastElapsed.current = 0; const ok = await recorder.start(); if (!ok) toast.error("The microphone isn't available right now."); };
  const finishFinal = async () => {
    const r = await recorder.stop();
    if (!r) { toast.error("Nothing was recorded. Try again."); return; }
    const id = newId("voice");
    const stored = await putBlob(id, r.blob);
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    patch({ finalVoiceRecording: { audioId: stored ? id : undefined, audioUrl: URL.createObjectURL(r.blob), durationSec: r.durationSec, mimeType: r.mimeType, demo: false } });
    go("recorded");
  };
  const useDemoRecording = () => { if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); } patch({ finalVoiceRecording: { durationSec: 237, demo: true } }); go("recorded"); };

  // ---- Memories ----
  const frames = project.memories;
  const shown = frames.length ? frames : sampleMemories();
  const selected = shown[frame % shown.length];
  const addFiles = async (e: ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    const items: MediaItem[] = [];
    for (const f of files) {
      const kind = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(f.name) ? "image" : null;
      if (!kind) continue;
      const id = newId("media");
      const persisted = await putBlob(id, f);
      items.push({ id, kind, source: "upload", url: URL.createObjectURL(f), name: f.name, mimeType: f.type, persisted });
    }
    setBusy(false);
    if (!items.length) { toast.error("Those files aren't photos or videos."); return; }
    if (replaceIndex !== undefined) {
      const old = frames[replaceIndex];
      if (old?.source === "upload") { releaseUrls([old.url]); void deleteBlobs([old.id]); }
      patch({ memories: frames.length ? frames.map((m, i) => (i === replaceIndex ? items[0]! : m)) : shown.map((m, i) => (i === replaceIndex ? items[0]! : m)) });
      toast.success("Memory replaced");
    } else {
      patch({ memories: [...frames, ...items] });
      toast.success(`${items.length} ${items.length === 1 ? "memory" : "memories"} added`);
    }
  };
  const removeMemory = (i: number) => {
    const list = frames.length ? frames : shown;
    const old = list[i];
    if (old?.source === "upload") { releaseUrls([old.url]); void deleteBlobs([old.id]); }
    patch({ memories: list.filter((_, j) => j !== i) });
    setFrame((f) => Math.max(0, Math.min(f, list.length - 2)));
  };
  const moveMemory = (from: number, to: number) => {
    const list = [...(frames.length ? frames : shown)];
    if (to < 0 || to >= list.length || from === to) return;
    const [m] = list.splice(from, 1);
    if (!m) return;
    list.splice(to, 0, m);
    patch({ memories: list });
    setFrame(to);
  };

  useEffect(() => { if (screen !== "generating") return; if (generation >= 3) { const t = window.setTimeout(() => go("editor"), 650); return () => window.clearTimeout(t); } const t = window.setTimeout(() => setGeneration((n) => n + 1), 1250); return () => window.clearTimeout(t); }, [screen, generation]);
  useEffect(() => { if (screen !== "editor" || !editorPlaying || shown.length < 2) return; const t = window.setInterval(() => setFrame((i) => (i + 1) % shown.length), 4200); return () => window.clearInterval(t); }, [screen, editorPlaying, shown.length]);

  const engraving = project.cardEngraving;
  const updateEngraving = (i: number, value: string) => patch({ cardEngraving: engraving.map((v, j) => (j === i ? value.toUpperCase() : v)) });
  const toCard = () => { if (!engraving[0]) patch({ cardEngraving: [(name || "Hanna").toUpperCase(), engraving[1] || "FROM ALEX", engraving[2] || "2026"] }); go("card"); };
  const captionLines = project.messageParagraphs.map((p) => (p.split(/(?<=[.!?])\s/)[0] ?? p).trim()).filter(Boolean).slice(0, 8);
  const totalSec = rec?.durationSec ?? 237;

  const title = (_eyebrow: string, heading: string, sub?: string) => <div className="mb-8"><h1 className="display text-[clamp(48px,13vw,70px)]">{heading}</h1>{sub && <p className="mt-5 text-sm leading-6 text-muted-foreground">{sub}</p>}</div>;
  const top = (label?: string) => <header className="flex h-20 items-center justify-between px-6 pt-3"><Button variant="bare" size="icon" aria-label="Go back" onClick={back}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><span className="min-w-9 text-right text-[10px] tracking-widest text-muted-foreground">{label}</span></header>;
  const nextButton = (label: string, action: () => void, disabled = false) => <Button variant="keep" size="touch" className="w-full justify-between" onClick={action} disabled={disabled}>{label}<ArrowRight /></Button>;
  const wave = (count = 27, active = true) => <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden="true">{Array.from({ length: count }, (_, i) => <span key={i} className={`${active ? "wave-bar" : "opacity-40"} w-[2px] rounded-full bg-accent`} style={{ height: `${10 + ((i * 17) % 34)}px`, animationDelay: `${-(i % 7) * 0.13}s` }} />)}</div>;
  const note = (children: ReactNode) => <p className="text-center text-[11px] leading-5 text-muted-foreground">{children}</p>;
  const sheet = (heading: string, onClose: () => void, children: ReactNode) => <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80" onClick={onClose}><div className="w-full max-w-[540px] rounded-t-lg bg-card px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-6" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-display text-4xl">{heading}</h2><Button variant="bare" size="icon" aria-label="Close" onClick={onClose}><X /></Button></div>{children}</div></div>;
  const micUnavailable = recorder.supported === false || recorder.status === "denied" || recorder.status === "error";
  const micMessage = recorder.supported === false ? "This browser can't record audio here." : recorder.status === "denied" ? "Microphone access was blocked. You can allow it in your browser settings." : recorder.status === "error" ? "The microphone couldn't start." : "";
  const isRecording = recorder.status === "recording" || recorder.status === "paused";
  const primaryNav = screen === "home" || screen === "you";
  const fileInputs = <><input ref={addInput} type="file" accept="image/*,video/*" multiple className="sr-only" aria-label="Choose photos and videos" tabIndex={-1} onChange={(e) => void addFiles(e)} /><input ref={replaceInput} type="file" accept="image/*,video/*" className="sr-only" aria-label="Choose a replacement photo or video" tabIndex={-1} onChange={(e) => void addFiles(e, frame % Math.max(1, shown.length))} /></>;

  return <main className="app-shell">{fileInputs}<div key={screen} className={`page-enter ${primaryNav ? "pb-28" : ""}`}>
    {screen === "onboarding" && <div className="flex min-h-dvh flex-col justify-between px-7 pb-[max(36px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))]"><span className="brand">KEEP</span><div className="py-10"><h1 className="display whitespace-nowrap text-[clamp(43px,12vw,64px)]">Say what matters.<br />Keep it forever.</h1><p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">KEEP helps you find the words, record them in your own voice, and turn your memories into something they can keep forever.</p><ol className="mt-12 grid grid-cols-3 border-t border-border">{[{ l: "Create message", I: MessageCircle }, { l: "Add media", I: Images }, { l: "Enjoy memories", I: Play }].map(({ l, I }, i) => <li key={l} className="pt-5 pr-3"><span className="eyebrow">0{i + 1}</span><I className="mt-4 size-5 text-accent" /><p className="mt-3 text-xs leading-4">{l}</p></li>)}</ol></div><div className="space-y-2">{nextButton("Create something worth keeping", () => { dismissOnboarding(); begin(); })}<Button variant="bare" size="touch" className="w-full text-muted-foreground" onClick={() => { dismissOnboarding(); home(); }}>See my Keeps</Button></div></div>}
    {screen === "home" && <>
      <header className="flex items-center justify-between px-7 pb-8 pt-[max(40px,env(safe-area-inset-top))]"><span className="brand">KEEP</span><Button variant="bare" size="icon" aria-label="Profile" onClick={() => go("you")}><span className="flex size-9 items-center justify-center rounded-full border border-border text-xs">A</span></Button></header>
      <div className="px-7"><div className="mb-8"><h1 className="display text-[clamp(48px,13vw,70px)]">Say what matters. Keep it forever.</h1></div>{nextButton("Create a Keep", begin)}<div className="mt-12 mb-5 flex items-end justify-between"><h2 className="text-sm font-medium">Your Keeps</h2><span className="text-xs text-muted-foreground">{project.active ? "03" : "02"} keeps</span></div></div>
      {project.active && <Button variant="bare" className="mx-4 mb-4 flex h-24 w-[calc(100%-2rem)] items-center gap-4 rounded-sm border border-accent/40 p-2 text-left" onClick={continueDraft} aria-label="Continue your Keep">{project.memories[0] ? <MediaView item={project.memories[0]} thumb alt="First memory" className="h-full w-20 object-cover" /> : <span className="flex h-full w-20 items-center justify-center bg-card"><Sparkles className="text-accent" /></span>}<span className="flex-1"><span className="eyebrow">Continue your Keep</span><strong className="mt-2 block text-sm font-medium">{name || "Untitled Keep"}{project.occasion ? ` · ${project.occasion}` : ""}</strong><small className="mt-1 block text-muted-foreground">{stageLabels[project.stage] ?? "In progress"}</small></span><ChevronRight className="mr-3 size-4 text-muted-foreground" /></Button>}
      <Button variant="bare" className="relative mx-4 block h-[420px] w-[calc(100%-2rem)] overflow-hidden rounded-sm !p-0 text-left" onClick={() => go("detail")} aria-label="Open Hanna's Keep"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-0 left-0 right-0 p-6"><span className="eyebrow text-foreground">READY TO KEEP <span className="ml-2 inline-block size-1.5 rounded-full bg-accent" /></span><h3 className="display mt-4 text-6xl">HANNA</h3><div className="mt-3 flex justify-between text-xs text-foreground/80"><span>Anniversary · 2026</span><span>3:57 <ArrowRight className="ml-2 inline-block size-4" /></span></div></div></Button>
      <Button variant="bare" className="mx-4 mt-4 flex h-24 w-[calc(100%-2rem)] items-center gap-4 rounded-sm border border-border p-2 text-left" onClick={() => toast("Sample draft — start your own with Create a Keep")}><img src={memoryImages[3]} alt="Family memory placeholder" className="h-full w-20 object-cover" /><span className="flex-1"><strong className="block text-sm font-medium">Our Family</strong><small className="mt-1 block text-muted-foreground">Christmas 2026 · Sample draft</small></span><ChevronRight className="mr-3 size-4 text-muted-foreground" /></Button>
    </>}
    {screen === "you" && <>{top()}<div className="px-7 pt-8">{title("Your space", "Alex.", "The things worth keeping, all in one place.")}<div className="mt-12 border-t border-border">{[{ label: "What is KEEP?", Icon: Sparkles }, { label: "My cards", Icon: Radio }, { label: "Downloads & backups", Icon: Download }, { label: "Privacy", Icon: LockKeyhole }, { label: "Help", Icon: CircleHelp }].map(({ label, Icon }) => <Button key={label} variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal" onClick={() => (label === "What is KEEP?" ? go("onboarding") : setSetting(label))}><span className="flex items-center gap-4"><Icon className="size-4 text-accent" />{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}{project.active && <Button variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal text-destructive" onClick={() => { if (!window.confirm("Delete your draft Keep? Recordings and photos added to it will be removed from this device.")) return; discard(project); setProject(newProject()); toast.success("Draft deleted"); }}><span className="flex items-center gap-4"><Trash2 className="size-4" />Delete draft Keep</span></Button>}</div><p className="mt-9 text-xs leading-6 text-muted-foreground">Your Keeps are private by default. Only people you share them with can open them.</p></div>{setting && sheet(setting, () => setSetting(""), <><p className="mt-5 text-sm leading-7 text-muted-foreground">{setting === "Privacy" ? "Your Keeps are private by default. In this MVP, drafts, recordings and photos stay on this device only. Sharing a card gives its recipient access to that Keep — no account required." : setting === "My cards" ? "Card #000001 · HANNA · from Alex · 2026 (sample). Physical card ordering is coming next." : setting === "Downloads & backups" ? "Your draft is saved on this device. Cloud backups and downloads aren't available yet." : "We're here when you need us. Support isn't connected in this preview yet."}</p><Button variant="quiet" className="mt-8 w-full" onClick={() => setSetting("")}>Done</Button></>)}</>}
    {screen === "detail" && <>{top("READY")}<div className="relative mx-4 h-[55dvh] min-h-[390px] overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-8 left-6"><p className="eyebrow text-foreground">ANNIVERSARY · 2026</p><h1 className="display mt-3 text-7xl">HANNA</h1><p className="mt-3 text-sm">from Alex · 3:57</p></div></div><div className="space-y-3 px-6 pt-7">{nextButton("Play Keep", () => { setViewingDemo(true); go("preview"); })}<Button variant="quiet" size="touch" className="w-full" onClick={editDemoCopy}><Settings2 /> Edit a copy</Button><Button variant="bare" size="touch" className="w-full" asChild><Link to="/recipient" search={{ name: "Hanna", from: "Alex", year: "2026" }}><Radio /> View as recipient</Link></Button></div></>}
    {screen === "recipient" && <>{top("01 / 04")}<div className="px-7 pt-12">{title("Begin with someone", "Who are you making this for?")}<div className="grid grid-cols-2 gap-2">{relationships.map((r) => <Button key={r} variant={project.relationship === r ? "selected" : "quiet"} className="h-18 justify-between px-4 text-left font-normal" onClick={() => patch({ relationship: r })}>{r}{project.relationship === r && <Check className="size-4 text-accent" />}</Button>)}</div>{project.relationship && <div className="mt-9 page-enter"><label htmlFor="recipient-name" className="eyebrow">THEIR NAME</label><input id="recipient-name" value={name} onChange={(e) => patch({ recipientName: e.target.value.slice(0, 40) })} placeholder="Hanna" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-5xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground">A name only you could say this way.</p></div>}<div className="mt-10">{nextButton("Continue", () => go("occasion"), !project.relationship || !name.trim())}</div></div></>}
    {screen === "occasion" && <>{top("02 / 04")}<div className="px-7 pt-12">{title("Give it a moment", "What's this Keep for?")}<div className="flex flex-wrap gap-2">{occasions.map((o) => <Button key={o} variant={project.occasion === o ? "selected" : "quiet"} className="h-12 rounded-full px-5 font-normal" onClick={() => { patch({ occasion: o }); if (o !== "Other") setOtherOccasion(""); }}>{o}</Button>)}</div>{project.occasion === "Other" && <div className="mt-8 page-enter"><label className="eyebrow" htmlFor="other-occasion">TELL US WHAT IT'S FOR</label><input id="other-occasion" value={otherOccasion} onChange={(e) => setOtherOccasion(e.target.value.slice(0, 80))} placeholder="Our family Disney trip with Gigi & Pops" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground">Describe the moment or memory this KEEP is for.</p></div>}<div className="mt-12">{nextButton("Continue", () => { if (project.occasion === "Other") patch({ occasion: otherOccasion.trim() }); go("path"); }, project.occasion === "Other" && !otherOccasion.trim())}</div></div></>}
    {screen === "path" && <>{top("03 / 04")}<div className="px-7 pt-12">{title("The heart of it", "What do you want to say?")}<div className="space-y-3"><Button variant="quiet" className="h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={() => go("interview")}><span><Sparkles className="mb-7 size-6 text-accent" /><strong className="block font-display text-3xl font-normal">Help me find the words</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">KEEP will talk with you and help uncover what you really want to say.</small></span><ArrowRight className="mt-1 size-4" /></Button><Button variant="quiet" className="h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={() => go("write")}><span><span className="mb-7 block font-display text-3xl text-accent">“</span><strong className="block font-display text-3xl font-normal">I know what I want to say</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">Speak it, type it, or bring in something you've already written.</small></span><ArrowRight className="mt-1 size-4" /></Button></div></div></>}
    {screen === "interview" && <div className="flex h-dvh min-h-[650px] flex-col px-7 pb-[max(28px,env(safe-area-inset-bottom))]">{top()}<div className="mt-4"><p className="eyebrow">GETTING TO KNOW YOUR STORY…</p><div className="mt-4 flex gap-1">{questions.map((_, i) => <div key={i} className={`h-[2px] flex-1 ${i <= q ? "bg-accent" : "bg-border"}`} />)}</div></div><div className="thin-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-6 text-center"><span className="mb-8 font-display text-6xl text-accent">“</span><h1 key={q} className="font-display text-[clamp(31px,8vw,45px)] leading-[1.09] page-enter">{qs[q]}</h1>
      {currentAnswer?.audioUrl && !isRecording && <div className="mt-8 w-full rounded-sm border border-border p-4 text-left page-enter"><div className="mb-3 flex justify-between text-[10px] tracking-widest text-muted-foreground"><span>YOUR ANSWER</span><span>{fmt(currentAnswer.durationSec ?? 0)}</span></div><audio controls src={currentAnswer.audioUrl} className="w-full" preload="metadata" /><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Saved to this Keep. Transcription isn't connected yet, so KEEP hasn't read this answer.</p></div>}
      {currentAnswer?.audioId && !currentAnswer.audioUrl && <p className="mt-8 text-xs text-muted-foreground">Your recorded answer is saved.</p>}
      {currentAnswer?.demoText && !isRecording && <div className="mt-8 border-l border-accent pl-5 text-left page-enter"><p className="eyebrow mb-2 text-muted-foreground">Demo response</p><p className="text-sm leading-7 text-muted-foreground">{currentAnswer.demoText}</p></div>}
      {!currentAnswer && !isRecording && !micUnavailable && project.interviewAnswers.length === 0 && <p className="mt-8 max-w-xs text-xs leading-6 text-muted-foreground">KEEP will ask to use your microphone. Speak naturally — your answers stay on this device.</p>}
      {micUnavailable && !currentAnswer && <p className="mt-8 max-w-xs text-xs leading-6 text-muted-foreground">{micMessage} You can use a demo response to keep going.</p>}
    </div><div className="flex flex-col items-center gap-3">{isRecording ? <><div className="text-sm tabular-nums text-accent">● {fmt(recorder.elapsed)}</div>{wave(27, true)}<Button variant="keep" size="touch" className="w-full" onClick={() => void stopAnswer()}><Square fill="currentColor" /> Stop</Button></> : currentAnswer ? <><Button variant="keep" size="touch" className="w-full justify-between" onClick={nextQuestion}>{q === questions.length - 1 ? "That's everything" : "Next question"}<ArrowRight /></Button><Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => (micUnavailable ? useDemoAnswer() : void startAnswer())}><RotateCcw /> Answer again</Button></> : <>{wave(27, false)}{!micUnavailable && <Button variant="keep" size="touch" className="w-full" disabled={recorder.status === "requesting" || recorder.supported === null} onClick={() => void startAnswer()}><Mic /> {recorder.status === "requesting" ? "Waiting for microphone…" : "Tap to answer"}</Button>}<Button variant={micUnavailable ? "keep" : "bare"} size={micUnavailable ? "touch" : "sm"} className={micUnavailable ? "w-full" : "text-muted-foreground"} onClick={useDemoAnswer}>Use demo response</Button></>}</div></div>}
    {screen === "summary" && <>{top()}<div className="flex min-h-[calc(100dvh-100px)] flex-col justify-between px-7 pb-10 pt-15">{realAnswers.length === 0 ? <div>{title("Demo summary", "I think we have it.")}<p className="font-display text-3xl leading-snug text-foreground/90">{withName("Hanna is your closest friend, the person who believes in you, and the one who makes everyone around her feel at home.", name)}</p><p className="mt-7 text-sm leading-7 text-muted-foreground">From the quiet rituals of your everyday life to watching her become a mother, this is a story about choosing each other through every version of life.</p></div> : <div>{title("Your story, in your voice", "Your answers are saved.")}<p className="font-display text-3xl leading-snug text-foreground/90">You recorded {realAnswers.length} {realAnswers.length === 1 ? "answer" : "answers"} · {fmt(realAnswers.reduce((s, a) => s + (a.durationSec ?? 0), 0))}</p><p className="mt-7 text-sm leading-7 text-muted-foreground">Turning recordings into a written message needs KEEP's writing assistant, which isn't connected in this MVP yet. For now, start from the demo message or write your own.</p></div>}<div className="space-y-3">{nextButton(realAnswers.length ? "Use demo message" : "Create My Message", demoMessage)}<Button variant="quiet" size="touch" className="w-full" onClick={() => go("write")}>Write it myself</Button>{note("Demo generation — no AI service is connected yet.")}</div></div></>}
    {screen === "write" && <>{top("04 / 04")}<div className="px-7 pb-12 pt-9">{title("In your own words", "Bring us what you want to say.", "Speak it or type it — whichever feels more natural.")}<div className="mb-5 grid grid-cols-2 gap-2"><Button variant={dictating ? "selected" : "quiet"} className="h-20 flex-col" onClick={toggleDictation}><Mic />{dictating ? "Listening…" : "Speak"}</Button><Button variant={!dictating ? "selected" : "quiet"} className="h-20 flex-col" onClick={() => { if (dictationRef.current && dictating) dictationRef.current.stop(); }}><MessageCircle />Type</Button></div>{dictating && <div className="mb-4 rounded-sm border border-accent/40 p-4 text-center page-enter"><div className="mb-2 flex items-center justify-center gap-2 text-sm text-accent"><span className="size-2 animate-pulse rounded-full bg-accent" />Listening</div><p className="text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear below as you talk. Tap Speak again when you're finished.</p></div>}<textarea aria-label="Your message" value={project.writtenText} onChange={(e) => patch({ writtenText: e.target.value })} placeholder="Start here…" rows={12} className="min-h-[320px] w-full resize-y rounded-sm border border-border bg-transparent p-4 font-display text-[22px] leading-[1.35] outline-none focus:border-accent" /><div className="mt-3"><Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => patch({ writtenText: "" })}>Clear</Button></div><div className="mt-8">{nextButton("Continue", () => { const paras = project.writtenText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); patch({ messageParagraphs: paras, messageSource: "own" }); setActiveParagraph(0); go("message"); }, !project.writtenText.trim())}</div></div></>}
    {screen === "message" && <>{top("04 / 04")}<div className="px-7 pb-32 pt-9">{title(project.messageSource === "own" ? "In your own words" : "Demo generation", project.messageSource === "own" ? "Your message." : "Your message is ready.", "Tap any paragraph to make it yours.")}<div className="space-y-1">{project.messageParagraphs.map((p, i) => <textarea key={i} aria-label={`Message paragraph ${i + 1}`} rows={Math.max(3, Math.ceil(p.length / 44))} value={p} onFocus={() => setActiveParagraph(i)} onChange={(e) => patch({ messageParagraphs: project.messageParagraphs.map((item, j) => (j === i ? e.target.value : item)) })} className={`w-full resize-none rounded-sm border bg-transparent p-3 font-display text-[23px] leading-[1.3] outline-none transition-colors ${activeParagraph === i ? "border-accent/50" : "border-transparent"}`} />)}</div><Button variant="bare" size="sm" className="mt-2 text-muted-foreground" onClick={() => { patch({ messageParagraphs: [...project.messageParagraphs, ""] }); setActiveParagraph(project.messageParagraphs.length); }}><Plus /> Add paragraph</Button><Button variant="quiet" size="touch" className="mt-5 w-full" onClick={() => setAskOpen(true)}><Sparkles /> Ask KEEP</Button><div className="mt-3">{nextButton("Record Your Keep", () => { patch({ messageParagraphs: project.messageParagraphs.filter((p) => p.trim()) }); go("record"); }, !project.messageParagraphs.some((p) => p.trim()))}</div></div>{askOpen && sheet("Ask KEEP", () => setAskOpen(false), <><p className="mt-2 mb-6 text-xs text-muted-foreground">For the paragraph you've selected · demo edits</p>{["Make this sound more like me", "Shorten this section", "Make the ending stronger", "Add a memory"].map((prompt) => <Button key={prompt} variant="bare" className="flex h-14 w-full justify-between border-t border-border px-0 font-normal" onClick={() => { patch({ messageParagraphs: project.messageParagraphs.map((p, i) => (i !== activeParagraph ? p : prompt === "Shorten this section" ? p.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".") : prompt === "Add a memory" ? `${p} I still think of the way we laughed on that trip by the sea.` : prompt === "Make the ending stronger" ? `${p} I love you, and I always will.` : p.replace("I wanted to make this because", "I've been meaning to tell you this because"))) }); setAskOpen(false); toast.success("This paragraph has been updated"); }}>{prompt}<ArrowRight className="size-4 text-accent" /></Button>)}<p className="mt-4 text-[11px] text-muted-foreground">These are simple demo edits until KEEP's writing assistant is connected.</p></>)}</>}
    {screen === "record" && <div className="relative flex h-dvh min-h-[650px] flex-col overflow-hidden px-7 pb-[max(28px,env(safe-area-inset-bottom))]">{top()}<div className="pt-4 text-center"><p className="eyebrow">YOUR VOICE, YOUR KEEP</p><h1 className="display mt-5 text-5xl">Now say it in your own voice.</h1><p className="mt-4 text-sm text-muted-foreground">These are your words. They should sound like you.</p></div><div className="script-fade my-8 min-h-0 flex-1 overflow-hidden"><div className="space-y-9 pt-16 text-center transition-transform duration-1000 ease-linear" style={{ transform: `translateY(-${scroll}px)` }}>{project.messageParagraphs.map((p, i) => <p key={i} className={`font-display text-3xl leading-[1.35] ${isRecording ? "text-foreground" : i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{p}</p>)}</div></div><div className="text-center"><div className={`mb-1 text-sm tabular-nums ${isRecording ? "text-accent" : ""}`}>{isRecording && "● "}{fmt(recorder.elapsed)}</div>{wave(33, recorder.status === "recording")}{micUnavailable ? <><p className="mt-4 text-xs leading-5 text-muted-foreground">{micMessage}</p><Button variant="keep" size="touch" className="mt-4 w-full" onClick={useDemoRecording}>Use demo recording (3:57)</Button></> : <div className="mt-5 flex gap-2">{!isRecording ? <Button variant="keep" size="touch" className="w-full" disabled={recorder.status === "requesting" || recorder.supported === null} onClick={() => void startFinal()}><Mic /> {recorder.status === "requesting" ? "Waiting for microphone…" : "Start Recording"}</Button> : <>{recorder.canPause ? <Button variant="quiet" size="touch" className="flex-1" onClick={() => (recorder.status === "paused" ? recorder.resume() : recorder.pause())}>{recorder.status === "paused" ? <Play /> : <Pause />}{recorder.status === "paused" ? "Resume" : "Pause"}</Button> : <Button variant="quiet" size="touch" className="flex-1" onClick={() => setScrollPaused(!scrollPaused)}>{scrollPaused ? <Play /> : <Pause />}{scrollPaused ? "Resume script" : "Pause script"}</Button>}<Button variant="keep" size="touch" className="flex-1" onClick={() => void finishFinal()}><Check /> Finish</Button></>}</div>}<p className="mx-auto mt-4 max-w-xs text-[11px] leading-5 text-muted-foreground">{isRecording && !recorder.canPause ? "This browser keeps recording while the script is paused. " : ""}KEEP will clean background noise and balance levels. Your voice stays your voice.</p></div></div>}
    {screen === "recorded" && <>{top()}<div className="flex min-h-[calc(100dvh-90px)] flex-col justify-between px-7 pb-10 pt-14"><div>{title("A voice worth keeping", "Your voice is ready.", "Every word sounds more like you when it's said by you.")}{!rec ? <p className="text-sm text-muted-foreground">No recording yet.</p> : rec.demo ? <div className="mt-10 rounded-sm border border-border p-6">{wave(42, false)}<div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span>DEMO RECORDING · NO AUDIO</span><span>3:57</span></div></div> : <div className="mt-10 rounded-sm border border-border p-6">{wave(42, false)}<div className="mt-5 mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>YOUR RECORDING</span><span>{fmt(rec.durationSec)}</span></div>{rec.audioUrl ? <audio controls src={rec.audioUrl} className="w-full" preload="metadata" /> : <p className="text-xs text-muted-foreground">This recording couldn't be restored on this device. Record again to hear it.</p>}</div>}<Button variant="bare" size="touch" className="mt-5 w-full text-muted-foreground" onClick={() => go("record")}><RotateCcw /> Record again</Button></div>{nextButton("Use Recording", () => go("memories"), !rec)}</div></>}
    {screen === "memories" && <>{top()}<div className="px-7 pb-10 pt-9">{title("The moments in between", "Bring your words to life.", "Add photos & videos that belong to this story.")}{frames.length === 0 ? <div className="mt-10"><div className="grid h-72 grid-cols-3 gap-1 overflow-hidden opacity-60"><img className="col-span-2 h-full w-full object-cover" src={memoryImages[2]} alt="Travel memory placeholder" /><div className="flex flex-col gap-1"><img className="h-1/2 w-full object-cover" src={memoryImages[1]} alt="Wedding memory placeholder" /><img className="h-1/2 w-full object-cover" src={memoryImages[3]} alt="Family memory placeholder" /></div></div><Button variant="keep" size="touch" className="mt-8 w-full" disabled={busy} onClick={() => addInput.current?.click()}><Images /> {busy ? "Adding…" : "Choose Photos & Videos"}</Button><Button variant="bare" size="sm" className="mt-3 w-full text-muted-foreground" onClick={() => patch({ memories: sampleMemories() })}>Use sample memories</Button>{note("Your photos and videos stay on this device.")}</div> : <div className="page-enter"><div className="grid grid-cols-3 gap-1">{frames.map((m, i) => <div key={m.id} className="relative aspect-square overflow-hidden bg-card"><MediaView item={m} thumb alt={m.name ?? `Memory ${i + 1}`} className="h-full w-full object-cover" />{m.kind === "video" && <Play className="absolute bottom-1.5 left-1.5 size-3.5" fill="currentColor" />}<button type="button" aria-label={`Remove memory ${i + 1}`} onClick={() => removeMemory(i)} className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground"><X className="size-3.5" /></button></div>)}<button type="button" onClick={() => addInput.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-1 border border-border text-xs text-muted-foreground"><Plus className="size-4" />{busy ? "Adding…" : "Add more"}</button></div><p className="mt-5 text-center text-sm">{frames.length} {frames.length === 1 ? "memory" : "memories"} added <Check className="ml-1 inline size-4 text-accent" /></p><div className="mt-10">{nextButton("Create My Keep", () => { setGeneration(0); setFrame(0); go("generating"); })}</div><div className="mt-4">{note(frames.some((m) => m.source === "upload" && !m.persisted) ? "Some media couldn't be saved on this device and will be cleared on refresh." : "Saved on this device only.")}</div></div>}</div></>}
    {screen === "generating" && <div className="flex h-dvh flex-col items-center justify-center px-8 text-center"><div className="relative mb-14 flex size-30 items-center justify-center"><div className="pulse-ring absolute inset-0 rounded-full border border-accent" /><Sparkles className="size-8 text-accent" /></div><div className="eyebrow mb-5">MAKING SOMETHING THAT LASTS</div><h1 key={generation} className="display min-h-32 text-5xl page-enter">{["Listening to your story…", "Finding the moments that fit…", "Building your Keep…", "Almost there…"][generation]}</h1><p className="mt-8 text-xs text-muted-foreground">MVP preview · memories are arranged in the order you added them</p></div>}
    {screen === "editor" && selected && <div className="flex h-dvh min-h-[680px] flex-col"><div className="relative min-h-0 flex-1 overflow-hidden bg-card"><MediaView key={selected.id} item={selected} alt={`Memory preview ${frame + 1}`} className={`h-full w-full object-cover ${editorPlaying && selected.kind === "image" ? "ken-burns" : ""} editor-image-${project.visualStyle.toLowerCase()}`} /><div className="absolute inset-0 photo-shade" /><div className="absolute top-0 left-0 right-0 flex items-start justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]"><Button variant="bare" size="icon" aria-label="Back" onClick={back}><ArrowLeft /></Button><div className="text-center"><strong className="block text-sm font-medium tracking-[.16em]">{(name || "Your Keep").toUpperCase()}</strong><small className="text-[10px] text-foreground/80">{project.occasion} · 2026</small></div><Button variant="bare" size="icon" aria-label="Preview Keep" onClick={() => { setViewingDemo(false); go("preview"); }}><Play /></Button></div>{project.captionStyle !== "None" && <div className="absolute bottom-18 left-6 right-6 text-center"><p className={`${project.captionStyle === "Film" ? "font-display text-4xl font-normal" : project.captionStyle === "Minimal" ? "text-lg" : project.captionStyle === "Story" ? "font-display text-[34px] italic" : project.captionStyle === "Clean" ? "text-lg font-medium" : "text-[23px] font-semibold"} leading-tight drop-shadow-md`}>{project.captionStyle === "Reel" ? <>YOU MAKE PEOPLE FEEL <span className="text-accent">AT HOME</span></> : project.captionStyle === "Minimal" ? "Feel at home." : "You make people feel at home."}</p></div>}<div className="absolute bottom-5 left-5 right-5 flex items-center gap-4"><Button variant="bare" size="icon" aria-label={editorPlaying ? "Pause preview" : "Play preview"} onClick={() => setEditorPlaying(!editorPlaying)}>{editorPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button><div className="h-[2px] flex-1 bg-foreground/40"><div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${((frame % shown.length) + 1) / shown.length * 100}%` }} /></div><span className="text-[11px] tabular-nums">{fmt(totalSec * ((frame % shown.length) + 1) / shown.length)} / {fmt(totalSec)}</span></div></div><div className="flex max-h-[46dvh] min-h-[315px] flex-col bg-background"><div className="flex border-b border-border">{(["Memories", "Music", "Captions", "Style"] as Mode[]).map((m, i) => { const Icon = [Images, Music2, Ellipsis, Sparkles][i] ?? Images; return <Button key={m} variant="bare" className={`flex h-15 flex-1 flex-col gap-1 rounded-none border-b-2 px-0 text-[11px] font-normal ${mode === m ? "border-accent text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setMode(m)}><Icon className="size-4" />{m}</Button>; })}</div><div className="thin-scroll flex-1 overflow-y-auto px-5 py-5">
      {mode === "Memories" && <><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">Your moments</h2><Button variant="bare" className="text-xs text-accent" onClick={() => { setFrame(Math.min(3, shown.length - 1)); toast("Demo match — matching photos to your words comes later"); }}><Sparkles /> Demo match</Button></div><div className="thin-scroll flex gap-2 overflow-x-auto pb-2">{shown.map((m, i) => <div key={m.id} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragFrom.current !== null) moveMemory(dragFrom.current, i); dragFrom.current = null; }} className="shrink-0"><Button variant="bare" className={`relative h-20 w-16 overflow-hidden rounded-sm !p-0 ${i === frame % shown.length ? "ring-2 ring-accent" : "opacity-65"}`} aria-label={`Select memory ${i + 1}`} onClick={() => setFrame(i)}><MediaView item={m} thumb alt={m.source === "sample" ? memoryLabels[i % memoryLabels.length] ?? "" : m.name ?? ""} className="h-full w-full object-cover" />{m.kind === "video" && <Play className="absolute bottom-1 left-1 size-3" fill="currentColor" />}</Button></div>)}<Button variant="quiet" className="h-20 w-16 shrink-0 flex-col text-[10px]" disabled={busy} onClick={() => addInput.current?.click()}><Plus />Add</Button></div><p className="mt-3 text-[11px] text-muted-foreground">Demo match: “{frame % shown.length === 3 || frame % shown.length === 6 ? "Then I got to watch you become a mom…" : "You make people feel at home…"}”</p><div className="mt-3 flex flex-wrap items-center gap-1"><Button variant="quiet" size="sm" aria-label="Move memory earlier" disabled={frame % shown.length === 0} onClick={() => moveMemory(frame % shown.length, frame % shown.length - 1)}><ChevronLeft /> Earlier</Button><Button variant="quiet" size="sm" aria-label="Move memory later" disabled={frame % shown.length >= shown.length - 1} onClick={() => moveMemory(frame % shown.length, frame % shown.length + 1)}>Later <ChevronRight /></Button><Button variant="bare" size="sm" onClick={() => replaceInput.current?.click()}>Replace</Button><Button variant="bare" size="sm" disabled={shown.length <= 1} onClick={() => removeMemory(frame % shown.length)}>Remove</Button><Button variant="bare" size="sm" onClick={() => setDuration((d) => (d >= 8 ? 2 : d + 1))}>Duration {duration}s</Button></div><p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><GripVertical className="size-3" />Drag a moment to reorder, or use Earlier / Later.</p></>}
      {mode === "Music" && <><h2 className="font-display text-3xl">Choose a feeling.</h2>{["For You", "More feelings"].map((group) => <div key={group} className="mt-5"><p className="eyebrow mb-2">{group}</p>{tracks.filter((t) => t.group === group).map((track) => <Button key={track.name} variant="bare" className="flex h-15 w-full justify-between border-b border-border px-0 text-left" onClick={() => { patch({ musicMood: track.name }); toast(`${track.name} selected · preview mood`); }}><span className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full border border-border">{project.musicMood === track.name ? <span className="flex h-3 items-end gap-[2px]">{[0, 1, 2].map((b) => <span key={b} className="wave-bar w-[2px] rounded-full bg-accent" style={{ height: "12px", animationDelay: `${-b * 0.3}s` }} />)}</span> : <Play className="size-3" />}</span><span><strong className="block text-xs font-medium">{track.name} {track.name === "Warm + Nostalgic" && <span className="text-accent"> · recommended</span>}</strong><small className="text-[10px] text-muted-foreground">{track.note}</small></span></span>{project.musicMood === track.name && <Check className="size-4 text-accent" />}</Button>)}</div>)}<p className="eyebrow mt-7 mb-3">VOICE / MUSIC</p><div className="flex gap-1">{["Soft", "Balanced", "Full"].map((b) => <Button key={b} variant={project.voiceMusicBalance === b ? "selected" : "quiet"} className="flex-1" onClick={() => patch({ voiceMusicBalance: b })}>{b}</Button>)}</div><p className="mt-4 text-xs leading-5 text-muted-foreground">KEEP automatically lowers music while you speak and lets it rise between moments.</p><p className="mt-2 text-[10px] text-muted-foreground">MVP preview · moods are placeholders; licensed tracks aren't included yet.</p></>}
      {mode === "Captions" && <><h2 className="font-display text-3xl">How should your words appear?</h2><p className="mt-2 mb-5 text-xs text-muted-foreground">Captions are timed directly to your recording.</p><div className="grid grid-cols-2 gap-2">{captionOptions.map((c) => <Button key={c} variant={project.captionStyle === c ? "selected" : "quiet"} className="h-20 flex-col whitespace-normal" onClick={() => patch({ captionStyle: c })}><span className={c === "Film" ? "font-display text-xl" : "text-sm"}>{c}</span><small className="text-[10px] font-normal text-muted-foreground">{c === "None" ? "Just the image" : c === "Reel" ? "Bold, word by word" : c === "Film" ? "Elegant serif" : c === "Story" ? "Emotional phrases" : c === "Minimal" ? "Key lines only" : "Simple subtitles"}</small></Button>)}</div></>}
      {mode === "Style" && <><h2 className="font-display text-3xl">Choose the feel.</h2><div className="mt-5 grid grid-cols-2 gap-2">{styles.map((s) => <Button key={s.name} variant={project.visualStyle === s.name ? "selected" : "quiet"} className="h-27 flex-col items-start whitespace-normal p-4 text-left" onClick={() => patch({ visualStyle: s.name })}><span className="font-display text-2xl">{s.name}</span><small className="text-[11px] font-normal leading-4 text-muted-foreground">{s.note}</small></Button>)}</div></>}
    </div><div className="border-t border-border px-5 py-3 safe-bottom">{nextButton("Preview Keep", () => { setViewingDemo(false); go("preview"); })}</div></div></div>}
    {screen === "preview" && (viewingDemo
      ? <KeepPlayer name="HANNA" from="Alex" year="2026" onExit={back} onFinish={home} />
      : <KeepPlayer name={(name || "Your Keep").toUpperCase()} from="Alex" year="2026" subtitle={project.occasion} onExit={back} onFinish={toCard} style={project.visualStyle} captions={project.captionStyle} media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind })) : undefined} audioUrl={rec && !rec.demo ? rec.audioUrl : undefined} audioDuration={rec?.durationSec} lines={captionLines} />)}
    {screen === "card" && <>{top()}<div className="px-7 pb-10 pt-7">{title("The final touch", "Give it somewhere to live.", "Your card opens this Keep with a tap. No app or login required.")}<Button variant="bare" className="card-object mx-auto flex aspect-[1.586] w-full max-w-[400px] flex-col items-start justify-between rounded-lg border border-foreground/10 p-7 text-left" onClick={() => setCardBack(!cardBack)} aria-label="Flip keepsake card">{!cardBack ? <><span className="brand text-xl">KEEP</span><span className="self-end text-xs tracking-widest text-accent">◉</span></> : <><span className="brand text-sm">KEEP</span><span className="engraved flex flex-col gap-1 text-xs tracking-[.2em]"><strong className="text-xl font-normal">{engraving[0]}</strong><span>{engraving[1]}</span><span>{engraving[2]}</span></span></>}</Button><p className="mt-4 text-center text-xs text-muted-foreground">Tap card to see {cardBack ? "front" : "engraving"}</p><div className="mt-9 space-y-4">{["Name", "From", "Year"].map((label, i) => <label key={label} className="block"><span className="eyebrow">{label}</span><input aria-label={`Card ${label}`} maxLength={22} value={engraving[i] ?? ""} onChange={(e) => updateEngraving(i, e.target.value)} onFocus={() => setCardBack(true)} className="mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-sm tracking-widest outline-none focus:border-accent" /></label>)}</div><div className="mt-10">{nextButton("Create My Keep", () => go("success"))}</div><p className="mt-3 text-center text-[11px] text-muted-foreground">No card will be ordered — physical cards are coming next.</p></div></>}
    {screen === "success" && <div className="flex min-h-dvh flex-col justify-between px-7 pb-10 pt-10"><span className="brand">KEEP</span><div className="py-12"><div className="mb-10 flex size-13 items-center justify-center rounded-full border border-accent text-accent"><Check /></div>{title("Keep this version of them", "Your Keep project is ready.")}<div className="card-object mt-12 aspect-[1.586] w-full rounded-lg border border-foreground/10 p-7"><span className="brand text-lg">KEEP</span><div className="mt-14 text-xs tracking-[.2em] text-accent">{engraving[0]}<br />{engraving[1]} · {engraving[2]}</div></div><p className="mt-5 text-xs text-muted-foreground">Card #000001 · {engraving[0]} · {(engraving[1] ?? "").toLowerCase()} · {engraving[2]}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Physical card ordering is coming next. No card has been ordered or shipped.</p></div><div className="space-y-3"><Button variant="keep" size="touch" className="w-full justify-between" asChild><Link to="/recipient" search={{ name: (name || engraving[0] || "Hanna").trim(), from: "Alex", year: engraving[2] || "2026" }}>Preview recipient experience <ArrowRight /></Link></Button><Button variant="quiet" size="touch" className="w-full" onClick={home}>Back to Keeps</Button></div></div>}
  </div>{primaryNav && <nav aria-label="Main navigation" className="nav-bottom fixed bottom-0 left-1/2 z-20 w-full max-w-[540px] -translate-x-1/2 flex h-[82px] border-t border-border bg-background/95 backdrop-blur-xl"><Button variant="bare" className={`h-16 flex-1 flex-col gap-1 text-[11px] ${screen === "home" ? "text-accent" : "text-muted-foreground"}`} onClick={home}><Images className="size-5" />Keeps</Button><Button variant="bare" className="h-16 flex-1 flex-col gap-1 text-[11px] text-muted-foreground" onClick={() => (project.active ? continueDraft() : begin())}><Plus className="size-5" />Create</Button><Button variant="bare" className={`h-16 flex-1 flex-col gap-1 text-[11px] ${screen === "you" ? "text-accent" : "text-muted-foreground"}`} onClick={() => go("you")}><span className="flex size-5 items-center justify-center rounded-full border text-[10px]">A</span>You</Button></nav>}</main>;
}
