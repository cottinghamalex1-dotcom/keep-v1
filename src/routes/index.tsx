import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Ellipsis, GripVertical, Images, LockKeyhole, MessageCircle, Mic, Music2, FileUp, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, memoryLabels } from "@/components/keep-player";
import { KeepRecipientExperience, type KeepExperienceMode } from "@/components/keep-recipient-experience";
import { KeepErrorBoundary } from "@/components/keep-error-boundary";
import { useRecorder } from "@/hooks/use-recorder";
import { deleteBlobs, putBlob } from "@/lib/keep-media-store";
import { playMusicSample, stopMusicSample } from "@/lib/keep-audio";
import { fetchDraft, fetchNextQuestion, fetchRevision, keepAiAvailable, transcribeAudio, transcribeTimedAudio, type TimedWord } from "@/lib/keep-ai";
import { ONBOARD_KEY, fmt, hydrateDraftMedia, loadDraft, newId, newProject, projectBlobIds, projectObjectUrls, sampleMemories, saveDraft, stageLabels, type CaptionCue, type InterviewAnswer, type KeepProject, type MediaItem } from "@/lib/keep-project";

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

type Screen = "onboarding" | "home" | "you" | "detail" | "recipient" | "occasion" | "intent" | "path" | "interview" | "summary" | "messageGenerating" | "write" | "message" | "recordPrep" | "record" | "recorded" | "memories" | "generating" | "editor" | "preview" | "recipientReveal" | "recipientPreview" | "giveReady" | "card" | "success";
type Mode = "Memories" | "Music" | "Captions" | "Style" | "Voice";
const creationScreens: Screen[] = ["recipient", "occasion", "intent", "path", "interview", "summary", "messageGenerating", "write", "message", "recordPrep", "record", "recorded", "memories", "generating", "editor", "preview", "recipientPreview", "card", "success"];
const resumeScreen = (s: Screen): Screen => (s === "messageGenerating" ? "summary" : s === "generating" ? "memories" : s === "preview" || s === "recipientPreview" ? "editor" : s);
const occasions = ["Birthday", "Anniversary", "Wedding", "New Baby", "Mother's Day", "Father's Day", "Graduation", "Thank You", "Trip / Adventure", "Milestone", "Celebration of Life", "Family Memories", "Just Because", "Other"];
const relationships = ["Spouse / Partner", "Mom", "Dad", "Child", "Grandparent", "Sibling", "Friend", "Myself", "Someone else"];
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
const styles = [
  { name: "Natural", note: "Clean and true to life" },
  { name: "Warm", note: "Soft warmth and gentle contrast" },
  { name: "Film", note: "Cinematic color and texture" },
  { name: "Modern", note: "Crisp and contemporary" },
  { name: "Black & White", note: "Timeless monochrome" },
  { name: "Vintage", note: "Faded, nostalgic warmth" },
  { name: "Soft", note: "Airy highlights and lower contrast" },
  { name: "Dreamy", note: "Glow, softness, and lifted color" },
];
const groupTimedWords = (words: TimedWord[]): CaptionCue[] => {
  const cues: CaptionCue[] = [];
  let group: TimedWord[] = [];
  const flush = () => {
    if (!group.length) return;
    const text = group.map((w) => w.word).join(" ").replace(/\s+([,.!?;:])/g, "$1").trim();
    if (text) cues.push({ text, start: Math.max(0, group[0]!.start - 0.05), end: group[group.length - 1]!.end + 0.16 });
    group = [];
  };
  for (const word of words) {
    const prev = group[group.length - 1];
    if (prev && word.start - prev.end > 0.72) flush();
    group.push(word);
    if (group.length >= 7 || /[.!?]$/.test(word.word)) flush();
  }
  flush();
  return cues;
};

const styleSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  const [askPrompt, setAskPrompt] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState("");
  const [askLastInstruction, setAskLastInstruction] = useState("");
  const [askLastScope, setAskLastScope] = useState<"section" | "message">("section");
  const [askSuggestion, setAskSuggestion] = useState<null | { paragraphs: string[]; changedIndexes: number[]; note: string }>(null);
  const [aiBusy, setAiBusy] = useState<null | "start" | "transcribe" | "next" | "draft">(null);
  const [aiError, setAiError] = useState<null | { kind: "start" | "transcribe" | "next" | "draft"; retry: () => void }>(null);
  const [generation, setGeneration] = useState(0);
  const [mode, setMode] = useState<Mode>("Memories");
  const [editorPanel, setEditorPanel] = useState<Mode | null>(null);
  const [previewChooserOpen, setPreviewChooserOpen] = useState(false);
  const [creatorPreviewMode, setCreatorPreviewMode] = useState<KeepExperienceMode | null>(null);
  const [readArrangeOpen, setReadArrangeOpen] = useState(false);
  const [readArrangeIndex, setReadArrangeIndex] = useState(0);
  const [returnToEditorAfterRecording, setReturnToEditorAfterRecording] = useState(false);
  const [frame, setFrame] = useState(0);
  const [editorPlaying, setEditorPlaying] = useState(true);
  const [cardBack, setCardBack] = useState(false);
  const [setting, setSetting] = useState("");
  const [scroll, setScroll] = useState(0);
  const [scrollPaused, setScrollPaused] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(1);
  const [rehearsing, setRehearsing] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceTime, setVoiceTime] = useState(0);
  const [captionSyncing, setCaptionSyncing] = useState(false);
  const [captionSyncError, setCaptionSyncError] = useState(false);
  const [musicSampling, setMusicSampling] = useState("");
  const musicSampleTimer = useRef<number | null>(null);
  const voicePlaybackRef = useRef<HTMLAudioElement>(null);
  const [busy, setBusy] = useState(false);
  const [otherOccasion, setOtherOccasion] = useState("");
  const [otherRelationship, setOtherRelationship] = useState("");
  const [dictating, setDictating] = useState(false);
  const [writeInputMode, setWriteInputMode] = useState<"speak" | "type" | "upload">("type");
  const [uploadedDraftName, setUploadedDraftName] = useState("");
  const dictationRef = useRef<any>(null);
  const dictationTargetRef = useRef<"write" | "intent">("write");
  const recorder = useRecorder();
  const lastElapsed = useRef(0);
  const addInput = useRef<HTMLInputElement>(null);
  const draftInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const patch = (p: Partial<KeepProject>) => setProject((o) => ({ ...o, ...p }));
  const name = project.recipientName;
  const q = project.questionIndex;

  // Load lightweight draft + onboarding flag after hydration, then restore media blobs from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    const d = loadDraft();
    if (d) setProject(d);

    let onboarded = true;
    try { onboarded = !!localStorage.getItem(ONBOARD_KEY); } catch { /* ignore */ }

    if (!onboarded) {
      setScreen("onboarding");
    } else if (d?.active) {
      const savedStage = d.stage as Screen;
      if (creationScreens.includes(savedStage)) {
        setHistory([]);
        setScreen(resumeScreen(savedStage));
      }
    }

    setHydrated(true);
    if (d) void hydrateDraftMedia(d).then((h) => { if (!cancelled) setProject((cur) => ({ ...cur, ...h })); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (hydrated) saveDraft(project); }, [project, hydrated]);
  useEffect(() => { if (project.active && !viewingDemo && creationScreens.includes(screen)) setProject((o) => (o.stage === resumeScreen(screen) ? o : { ...o, stage: resumeScreen(screen) })); }, [screen]);
  useEffect(() => { if (screen !== "interview" && screen !== "record") recorder.cancel(); }, [screen]);
  useEffect(() => {
    if (screen === "recorded") return;
    const audio = voicePlaybackRef.current;
    if (audio) audio.pause();
    setVoicePlaying(false);
    setVoiceTime(0);
  }, [screen]);
  useEffect(() => { if (screen !== "write" && screen !== "intent" && dictationRef.current) { dictationRef.current.stop(); dictationRef.current = null; setDictating(false); } }, [screen]);
  useEffect(() => { const d = recorder.elapsed - lastElapsed.current; lastElapsed.current = recorder.elapsed; if (screen === "record" && d > 0 && d < 2 && !scrollPaused) setScroll((s) => s + d * 15 * teleprompterSpeed); }, [recorder.elapsed, screen, scrollPaused, teleprompterSpeed]);
  useEffect(() => {
    if (screen !== "record" || !rehearsing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.12);
      last = now;
      if (!scrollPaused) setScroll((value) => value + delta * 15 * teleprompterSpeed);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [screen, rehearsing, scrollPaused, teleprompterSpeed]);
  useEffect(() => { if (screen !== "record") setRehearsing(false); }, [screen]);
  useEffect(() => {
    if (screen === "editor" && returnToEditorAfterRecording) setReturnToEditorAfterRecording(false);
  }, [screen, returnToEditorAfterRecording]);
  useEffect(() => {
    if (screen === "editor") return;
    stopMusicSample();
    setMusicSampling("");
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
    musicSampleTimer.current = null;
  }, [screen]);
  useEffect(() => () => {
    stopMusicSample();
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
  }, []);

  const resetPageScroll = () => window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  const go = (next: Screen) => { setHistory((h) => [...h, screen]); setScreen(next); resetPageScroll(); };
  const back = () => { const last = history[history.length - 1]; setScreen(last ?? "home"); setHistory((h) => h.slice(0, -1)); resetPageScroll(); };
  const home = () => { setHistory([]); setScreen("home"); setViewingDemo(false); resetPageScroll(); };
  const discard = (p: KeepProject) => { releaseUrls(projectObjectUrls(p)); void deleteBlobs(projectBlobIds(p)); };
  const startProject = (p: KeepProject, at: Screen) => {
    setReturnToEditorAfterRecording(false);
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
  const upsertAnswer = (a: InterviewAnswer) => setProject((o) => ({ ...o, interviewAnswers: [...o.interviewAnswers.filter((x) => x.questionIndex !== a.questionIndex), a].sort((x, y) => x.questionIndex - y.questionIndex) }));
  const setAnswer = (a: InterviewAnswer) => {
    const old = project.interviewAnswers.find((x) => x.questionIndex === a.questionIndex);
    if (old) { releaseUrls([old.audioUrl]); if (old.audioId) void deleteBlobs([old.audioId]); }
    upsertAnswer(a);
  };
  const aiReady = keepAiAvailable();
  const aiContext = (list: InterviewAnswer[] = project.interviewAnswers) => ({
    recipientName: project.recipientName, relationship: project.relationship, occasion: project.occasion, intent: project.intent,
    answers: list.filter((a) => a.transcript?.trim()).map((a) => ({ question: a.question, transcript: (a.transcript ?? "").trim() })),
  });
  const runAi = async (kind: "start" | "transcribe" | "next" | "draft", fn: () => Promise<void>) => {
    setAiBusy(kind); setAiError(null);
    try { await fn(); } catch { setAiError({ kind, retry: () => void runAi(kind, fn) }); } finally { setAiBusy(null); }
  };
  const startInterview = () => {
    go("interview");
    if (!aiReady || project.interviewQuestion) return;
    void runAi("start", async () => {
      const r = await fetchNextQuestion(aiContext([]));
      if (r.done) throw new Error("no question");
      patch({ interviewQuestion: r.question, questionIndex: 0, interviewAnswers: [], interviewSummary: "" });
    });
  };
  const setTypedAnswer = (text: string) => {
    if (!currentAnswer && !text) return;
    upsertAnswer({ ...(currentAnswer ?? { questionIndex: q, question: project.interviewQuestion }), transcript: text });
  };
  const startAnswer = async () => { const ok = await recorder.start(); if (!ok) toast.error("The microphone isn't available right now. You can type your answer instead."); };
  const stopAnswer = async () => {
    const r = await recorder.stop();
    if (!r) { toast.error("Nothing was recorded. Try again."); return; }
    const id = newId("answer");
    const stored = await putBlob(id, r.blob);
    const answer: InterviewAnswer = { questionIndex: q, question: project.interviewQuestion, audioId: stored ? id : undefined, audioUrl: URL.createObjectURL(r.blob), durationSec: r.durationSec, mimeType: r.mimeType, transcript: currentAnswer?.transcript };
    setAnswer(answer);
    if (!aiReady) return;
    void runAi("transcribe", async () => {
      const text = await transcribeAudio(r.blob, r.mimeType);
      if (!text) throw new Error("empty transcript");
      setProject((o) => ({ ...o, interviewAnswers: o.interviewAnswers.map((a) => (a.questionIndex === answer.questionIndex && a.audioUrl === answer.audioUrl ? { ...a, transcript: text } : a)) }));
    });
  };
  const nextQuestion = () => void runAi("next", async () => {
    const r = await fetchNextQuestion(aiContext());
    if (r.done) { patch({ interviewSummary: r.summary }); go("summary"); }
    else patch({ questionIndex: q + 1, interviewQuestion: r.question });
  });
  const createAiMessage = () => {
    go("messageGenerating");
    void runAi("draft", async () => {
      const paragraphs = await fetchDraft(aiContext());
      patch({ messageParagraphs: paragraphs, messageSource: "ai" });
      setActiveParagraph(0);
      setScreen("message");
      window.scrollTo(0, 0);
    });
  };

  const openAskKeep = () => {
    setAskPrompt("");
    setAskError("");
    setAskSuggestion(null);
    setAskLastInstruction("");
    setAskLastScope("section");
    setAskOpen(true);
  };

  const askKeep = async (instruction: string, scope: "section" | "message" = "section") => {
    const request = instruction.trim();
    if (!request || askBusy) return;
    setAskBusy(true);
    setAskError("");
    setAskSuggestion(null);
    setAskLastInstruction(request);
    setAskLastScope(scope);
    try {
      const suggestion = await fetchRevision(aiContext(), project.messageParagraphs, activeParagraph, request, scope);
      setAskSuggestion(suggestion);
    } catch {
      setAskError("KEEP couldn't reshape that just now. Your words haven't changed.");
    } finally {
      setAskBusy(false);
    }
  };

  const applyAskSuggestion = () => {
    if (!askSuggestion) return;
    patch({ messageParagraphs: askSuggestion.paragraphs });
    if (askSuggestion.changedIndexes.length) setActiveParagraph(askSuggestion.changedIndexes[0] ?? activeParagraph);
    setAskOpen(false);
    setAskSuggestion(null);
    setAskError("");
    toast.success("Your message has been updated");
  };
  const completedAnswers = project.interviewAnswers.filter((a) => a.questionIndex < q && a.transcript?.trim()).length;
  const aiErrorText = aiError?.kind === "transcribe" ? "We couldn't turn your recording into text. Your recording is safe — you can type what you said below, or try again." : aiError?.kind === "draft" ? "We couldn't put your message together just now." : "We couldn't reach KEEP just now.";

  // ---- Voice dictation for “I know what I want to say” ----
  const toggleDictation = (target: "write" | "intent" = "write") => {
    if (dictating && dictationRef.current) { dictationRef.current.stop(); return; }
    dictationTargetRef.current = target;
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
        setProject((o) => dictationTargetRef.current === "intent" ? ({ ...o, intent: `${o.intent}${o.intent && !o.intent.endsWith(" ") ? " " : ""}${finalText.trim()}` }) : ({ ...o, writtenText: `${o.writtenText}${o.writtenText && !o.writtenText.endsWith(" ") ? " " : ""}${finalText.trim()}` }));
      }
    };
    recognition.onerror = () => { setDictating(false); toast.error("Dictation stopped. Tap Speak to try again."); };
    recognition.onend = () => setDictating(false);
    dictationRef.current = recognition;
    recognition.start();
  };

  const extractDocxText = async (file: File) => {
    const mod: any = await import("mammoth");
    const mammoth = mod.default ?? mod;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return String(result?.value ?? "").replace(/\n{3,}/g, "\n\n").trim();
  };

  const extractPdfText = async (file: File) => {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const worker: any = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        let pageText = "";
        for (const item of content.items as any[]) {
          if (typeof item?.str !== "string") continue;
          pageText += item.str;
          pageText += item.hasEOL ? "\n" : " ";
        }
        const cleaned = pageText
          .split("\n")
          .map((line) => line.replace(/[ \t]+/g, " ").trim())
          .filter(Boolean)
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (cleaned) pages.push(cleaned);
      }
    } finally {
      await document.destroy();
    }
    return pages.join("\n\n").trim();
  };

  const importDraft = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const supported = ["txt", "md", "rtf", "docx", "pdf"];
    if (!supported.includes(ext ?? "")) {
      toast.error("Upload a .docx, .pdf, .txt, .md, or .rtf file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("That file is too large. Try a document under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      let text = "";
      if (ext === "docx") {
        text = await extractDocxText(file);
      } else if (ext === "pdf") {
        text = await extractPdfText(file);
        if (!text.trim()) {
          toast.error("KEEP couldn't find readable text in that PDF. If it's a scan or photo-based PDF, save it as a searchable PDF or paste the words instead.");
          return;
        }
      } else {
        text = await file.text();
        if (ext === "rtf") {
          text = text
            .replace(/\\par[d]?/g, "\n")
            .replace(/\\'[0-9a-fA-F]{2}/g, "")
            .replace(/\\[a-z]+-?\d* ?/g, "")
            .replace(/[{}]/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }
      }
      if (!text.trim()) {
        toast.error("KEEP couldn't find readable text in that file.");
        return;
      }
      const clean = text.slice(0, 100000);
      patch({ writtenText: clean });
      setUploadedDraftName(file.name);
      setWriteInputMode("upload");
      if (dictationRef.current && dictating) dictationRef.current.stop();
      toast.success("Your writing is ready to work with.");
    } catch {
      toast.error(ext === "pdf" ? "KEEP couldn't read that PDF. Try another PDF or paste the text instead." : ext === "docx" ? "KEEP couldn't read that Word document. Try saving it again as .docx or paste the text instead." : "KEEP couldn't read that file.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Final voice recording ----
  const rec = project.finalVoiceRecording;
  const editWordsFromEditor = () => {
    setEditorPanel(null);
    setReturnToEditorAfterRecording(true);
    setHistory((h) => [...h, "editor"]);
    setScreen("message");
    window.scrollTo(0, 0);
  };
  const rerecordFromEditor = () => {
    setEditorPanel(null);
    setReturnToEditorAfterRecording(true);
    setHistory((h) => [...h, "editor"]);
    setScreen("record");
    setScroll(0);
    setScrollPaused(false);
    setRehearsing(false);
    window.scrollTo(0, 0);
  };
  const startFinal = async () => { setRehearsing(false); setScroll(0); setScrollPaused(false); lastElapsed.current = 0; const ok = await recorder.start(); if (!ok) toast.error("The microphone isn't available right now."); };

  const syncFinalCaptions = async (blob: Blob, mimeType?: string) => {
    setCaptionSyncing(true);
    setCaptionSyncError(false);
    try {
      const prompt = project.messageParagraphs.join(" ").slice(0, 700);
      const timed = await transcribeTimedAudio(blob, mimeType, prompt);
      const cues = groupTimedWords(timed.words);
      if (!cues.length) throw new Error("No timestamped words returned");
      setProject((o) => ({ ...o, captionTranscript: timed.transcript, captionCues: cues }));
    } catch {
      setCaptionSyncError(true);
    } finally {
      setCaptionSyncing(false);
    }
  };

  const finishFinal = async () => {
    const r = await recorder.stop();
    if (!r) { toast.error("Nothing was recorded. Try again."); return; }
    const id = newId("voice");
    const stored = await putBlob(id, r.blob);
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    const audioUrl = URL.createObjectURL(r.blob);
    setProject((o) => ({
      ...o,
      finalVoiceRecording: { audioId: stored ? id : undefined, audioUrl, durationSec: r.durationSec, mimeType: r.mimeType, demo: false },
      captionTranscript: "",
      captionCues: [],
    }));
    go("recorded");
    void syncFinalCaptions(r.blob, r.mimeType);
  };

  const retryCaptionSync = async () => {
    if (!rec?.audioUrl) return;
    try {
      const response = await fetch(rec.audioUrl);
      const blob = await response.blob();
      await syncFinalCaptions(blob, rec.mimeType);
    } catch {
      setCaptionSyncError(true);
      setCaptionSyncing(false);
    }
  };

  const useDemoRecording = () => {
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    patch({ finalVoiceRecording: { durationSec: 237, demo: true }, captionTranscript: "", captionCues: [] });
    go("recorded");
  };
  const toggleVoicePlayback = () => {
    const audio = voicePlaybackRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };
  const seekVoicePlayback = (value: number) => {
    const audio = voicePlaybackRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setVoiceTime(value);
  };

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
      items.push({ id, kind, source: "upload", url: URL.createObjectURL(f), name: f.name, mimeType: f.type, persisted, displayDurationSec: 4 });
    }
    setBusy(false);
    if (!items.length) { toast.error("Those files aren't photos or videos."); return; }
    if (replaceIndex !== undefined) {
      const old = frames[replaceIndex];
      if (old?.source === "upload") { releaseUrls([old.url]); void deleteBlobs([old.id]); }
      patch({ memories: frames.length ? frames.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: m.displayDurationSec ?? 4 } : m)) : shown.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: m.displayDurationSec ?? 4 } : m)) });
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
  const cycleMemoryDuration = () => {
    const index = frame % shown.length;
    const current = shown[index]?.displayDurationSec ?? 4;
    const next = current >= 8 ? 2 : current + 1;
    const list = [...(frames.length ? frames : shown)];
    patch({ memories: list.map((m, i) => (i === index ? { ...m, displayDurationSec: next } : m)) });
  };
  const readOrderedFrames = (() => {
    const base = frames.length ? frames : shown;
    if (!project.readMemoryOrder.length) return base;
    const byId = new Map(base.map((m) => [m.id, m]));
    const ordered = project.readMemoryOrder.map((id) => byId.get(id)).filter((m): m is MediaItem => !!m);
    const used = new Set(ordered.map((m) => m.id));
    return [...ordered, ...base.filter((m) => !used.has(m.id))];
  })();
  const moveReadMemory = (from: number, to: number) => {
    const ids = readOrderedFrames.map((m) => m.id);
    if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return;
    const [id] = ids.splice(from, 1);
    if (!id) return;
    ids.splice(to, 0, id);
    patch({ readMemoryOrder: ids });
    setReadArrangeIndex(to);
  };
  const openCreatorPreview = (mode: KeepExperienceMode) => {
    setPreviewChooserOpen(false);
    setReadArrangeOpen(false);
    setCreatorPreviewMode(mode);
    setHistory((h) => [...h, "editor"]);
    setScreen("recipientPreview");
    resetPageScroll();
  };
  const toggleMusicSample = async (trackName: string) => {
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
    musicSampleTimer.current = null;
    if (musicSampling === trackName) {
      stopMusicSample();
      setMusicSampling("");
      return;
    }
    stopMusicSample();
    setMusicSampling(trackName);
    try {
      await playMusicSample(trackName, 9);
      musicSampleTimer.current = window.setTimeout(() => {
        setMusicSampling("");
        musicSampleTimer.current = null;
      }, 9000);
    } catch {
      setMusicSampling("");
      toast.error("Music preview isn't available in this browser.");
    }
  };

  useEffect(() => { if (screen !== "generating") return; if (generation >= 3) { const t = window.setTimeout(() => go("editor"), 650); return () => window.clearTimeout(t); } const t = window.setTimeout(() => setGeneration((n) => n + 1), 1250); return () => window.clearTimeout(t); }, [screen, generation]);
  useEffect(() => {
    if (screen !== "editor" || !editorPlaying || shown.length < 2) return;
    const current = shown[frame % shown.length];
    const delay = Math.max(1, current?.displayDurationSec ?? 4) * 1000;
    const t = window.setTimeout(() => setFrame((i) => (i + 1) % shown.length), delay);
    return () => window.clearTimeout(t);
  }, [screen, editorPlaying, shown.length, frame, selected?.displayDurationSec]);

  const engraving = project.cardEngraving;
  const updateEngraving = (i: number, value: string) => patch({ cardEngraving: engraving.map((v, j) => (j === i ? value.toUpperCase() : v)) });
  const toCard = () => { if (!engraving[0]) patch({ cardEngraving: [(name || "Hanna").toUpperCase(), engraving[1] || "FROM ALEX", engraving[2] || "2026"] }); go("card"); };
  const captionLines = project.messageParagraphs.map((p) => (p.split(/(?<=[.!?])\s/)[0] ?? p).trim()).filter(Boolean).slice(0, 8);
  const totalSec = rec?.durationSec ?? 237;

  const title = (_eyebrow: string, heading: string, sub?: string) => <div className="mb-8"><h1 className="display text-[clamp(48px,13vw,70px)]">{heading}</h1>{sub && <p className="mt-5 text-sm leading-6 text-muted-foreground">{sub}</p>}</div>;
  const top = (label?: string) => <header className="sticky top-0 z-30 flex h-[calc(5rem+env(safe-area-inset-top))] items-center justify-between border-b border-transparent bg-background/95 px-6 pt-[env(safe-area-inset-top)] backdrop-blur-sm"><Button variant="bare" size="icon" aria-label="Go back" onClick={back}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><span className="min-w-9 text-right text-[10px] tracking-widest text-muted-foreground">{label}</span></header>;
  const nextButton = (label: string, action: () => void, disabled = false) => <Button variant="keep" size="touch" className="w-full justify-between" onClick={action} disabled={disabled}>{label}<ArrowRight /></Button>;
  const wave = (count = 27, active = true) => <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden="true">{Array.from({ length: count }, (_, i) => <span key={i} className={`${active ? "wave-bar" : "opacity-40"} w-[2px] rounded-full bg-accent`} style={{ height: `${10 + ((i * 17) % 34)}px`, animationDelay: `${-(i % 7) * 0.13}s` }} />)}</div>;
  const note = (children: ReactNode) => <p className="text-center text-[11px] leading-5 text-muted-foreground">{children}</p>;
  const sheet = (heading: string, onClose: () => void, children: ReactNode) => <div className="keep-fixed-screen fixed left-0 right-0 top-0 z-40 flex items-end justify-center bg-background/80" onClick={onClose}><div className="keep-sheet-panel w-full max-w-[540px] overflow-y-auto rounded-t-lg bg-card px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-6" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-display text-4xl">{heading}</h2><Button variant="bare" size="icon" aria-label="Close" onClick={onClose}><X /></Button></div>{children}</div></div>;
  const micUnavailable = recorder.supported === false || recorder.status === "denied" || recorder.status === "error";
  const micMessage = recorder.supported === false ? "This browser can't record audio here." : recorder.status === "denied" ? "Microphone access was blocked. You can allow it in your browser settings." : recorder.status === "error" ? "The microphone couldn't start." : "";
  const isRecording = recorder.status === "recording" || recorder.status === "paused";
  const primaryNav = screen === "home" || screen === "you";
  const fileInputs = <><input ref={draftInput} type="file" accept=".docx,.pdf,.txt,.md,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,application/rtf" className="sr-only" aria-label="Upload something you have already written" tabIndex={-1} onChange={(e) => void importDraft(e)} /><input ref={addInput} type="file" accept="image/*,video/*" multiple className="sr-only" aria-label="Choose photos and videos" tabIndex={-1} onChange={(e) => void addFiles(e)} /><input ref={replaceInput} type="file" accept="image/*,video/*" className="sr-only" aria-label="Choose a replacement photo or video" tabIndex={-1} onChange={(e) => void addFiles(e, frame % Math.max(1, shown.length))} /></>;

  return <main className="app-shell">{fileInputs}<div key={screen} className={`page-enter ${primaryNav ? "pb-28" : ""}`}>
    {screen === "onboarding" && <div className="flex keep-min-screen flex-col justify-between px-7 pb-[max(36px,env(safe-area-inset-bottom))] pt-[max(40px,env(safe-area-inset-top))]"><span className="brand">KEEP</span><div className="py-10"><h1 className="display whitespace-nowrap text-[clamp(43px,12vw,64px)]">Say what matters.<br />Keep it forever.</h1><p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">KEEP helps you turn the words you want to say and the memories you don't want to lose into a beautiful keepsake someone can physically hold, tap, and experience forever.</p><ol className="mt-12 grid grid-cols-3 border-t border-border">{[{ l: "Create message", I: MessageCircle }, { l: "Add media", I: Images }, { l: "Enjoy memories", I: Play }].map(({ l, I }, i) => <li key={l} className="pt-5 pr-3"><span className="eyebrow">0{i + 1}</span><I className="mt-4 size-5 text-accent" /><p className="mt-3 text-xs leading-4">{l}</p></li>)}</ol></div><div className="space-y-2">{nextButton("Create something worth keeping", () => { dismissOnboarding(); begin(); })}<Button variant="bare" size="touch" className="w-full text-muted-foreground" onClick={() => { dismissOnboarding(); home(); }}>See my Keeps</Button></div></div>}
    {screen === "home" && <>
      <header className="flex items-center justify-between px-7 pb-8 pt-[max(40px,env(safe-area-inset-top))]"><span className="brand">KEEP</span><Button variant="bare" size="icon" aria-label="Profile" onClick={() => go("you")}><span className="flex size-9 items-center justify-center rounded-full border border-border text-xs">A</span></Button></header>
      <div className="px-7"><div className="mb-8"><h1 className="display text-[clamp(48px,13vw,70px)]">Say what matters. Keep it forever.</h1></div>{nextButton("Create a Keep", begin)}<div className="mt-12 mb-5 flex items-end justify-between"><h2 className="text-sm font-medium">Your Keeps</h2><span className="text-xs text-muted-foreground">{project.active ? "03" : "02"} keeps</span></div></div>
      {project.active && <Button variant="bare" className="mx-4 mb-4 flex h-24 w-[calc(100%-2rem)] items-center gap-4 rounded-sm border border-accent/40 p-2 text-left" onClick={continueDraft} aria-label="Continue your Keep">{project.memories[0] ? <MediaView item={project.memories[0]} thumb alt="First memory" className="h-full w-20 object-cover" /> : <span className="flex h-full w-20 items-center justify-center bg-card"><Sparkles className="text-accent" /></span>}<span className="flex-1"><span className="eyebrow">Continue your Keep</span><strong className="mt-2 block text-sm font-medium">{name || "Untitled Keep"}{project.occasion ? ` · ${project.occasion}` : ""}</strong><small className="mt-1 block text-muted-foreground">{stageLabels[project.stage] ?? "In progress"}</small></span><ChevronRight className="mr-3 size-4 text-muted-foreground" /></Button>}
      <Button variant="bare" className="relative mx-4 block h-[420px] w-[calc(100%-2rem)] overflow-hidden rounded-sm !p-0 text-left" onClick={() => go("detail")} aria-label="Open Hanna's Keep"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-0 left-0 right-0 p-6"><span className="eyebrow text-foreground">READY TO KEEP <span className="ml-2 inline-block size-1.5 rounded-full bg-accent" /></span><h3 className="display mt-4 text-6xl">HANNA</h3><div className="mt-3 flex justify-between text-xs text-foreground/80"><span>Anniversary · 2026</span><span>3:57 <ArrowRight className="ml-2 inline-block size-4" /></span></div></div></Button>
      <Button variant="bare" className="mx-4 mt-4 flex h-24 w-[calc(100%-2rem)] items-center gap-4 rounded-sm border border-border p-2 text-left" onClick={() => toast("Sample draft — start your own with Create a Keep")}><img src={memoryImages[3]} alt="Family memory placeholder" className="h-full w-20 object-cover" /><span className="flex-1"><strong className="block text-sm font-medium">Our Family</strong><small className="mt-1 block text-muted-foreground">Christmas 2026 · Sample draft</small></span><ChevronRight className="mr-3 size-4 text-muted-foreground" /></Button>
    </>}
    {screen === "you" && <>{top()}<div className="px-7 pt-8">{title("Your space", "Alex.", "The things worth keeping, all in one place.")}<div className="mt-12 border-t border-border">{[{ label: "What is KEEP?", Icon: Sparkles }, { label: "My cards", Icon: Radio }, { label: "Downloads & backups", Icon: Download }, { label: "Privacy", Icon: LockKeyhole }, { label: "Help", Icon: CircleHelp }].map(({ label, Icon }) => <Button key={label} variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal" onClick={() => (label === "What is KEEP?" ? go("onboarding") : setSetting(label))}><span className="flex items-center gap-4"><Icon className="size-4 text-accent" />{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}{project.active && <Button variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal text-destructive" onClick={() => { if (!window.confirm("Delete your draft Keep? Recordings and photos added to it will be removed from this device.")) return; discard(project); setProject(newProject()); toast.success("Draft deleted"); }}><span className="flex items-center gap-4"><Trash2 className="size-4" />Delete draft Keep</span></Button>}</div><p className="mt-9 text-xs leading-6 text-muted-foreground">Your Keeps are private by default. Only people you share them with can open them.</p></div>{setting && sheet(setting, () => setSetting(""), <><p className="mt-5 text-sm leading-7 text-muted-foreground">{setting === "Privacy" ? "Your Keeps are private by default. In this MVP, drafts, recordings and photos stay on this device only. Sharing a card gives its recipient access to that Keep — no account required." : setting === "My cards" ? "Card #000001 · HANNA · from Alex · 2026 (sample). Physical card ordering is coming next." : setting === "Downloads & backups" ? "Your draft is saved on this device. Cloud backups and downloads aren't available yet." : "We're here when you need us. Support isn't connected in this preview yet."}</p><Button variant="quiet" className="mt-8 w-full" onClick={() => setSetting("")}>Done</Button></>)}</>}
    {screen === "detail" && <>{top("READY")}<div className="relative mx-4 h-[min(55dvh,520px)] overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-8 left-6"><p className="eyebrow text-foreground">ANNIVERSARY · 2026</p><h1 className="display mt-3 text-7xl">HANNA</h1><p className="mt-3 text-sm">from Alex · 3:57</p></div></div><div className="space-y-3 px-6 pt-7">{nextButton("Play Keep", () => { setViewingDemo(true); go("preview"); })}<Button variant="quiet" size="touch" className="w-full" onClick={editDemoCopy}><Settings2 /> Edit a copy</Button><Button variant="bare" size="touch" className="w-full" asChild><Link to="/recipient" search={{ name: "Hanna", from: "Alex", year: "2026" }}><Radio /> View as recipient</Link></Button></div></>}
    {screen === "recipient" && <>{top("01 / 04")}<div className="px-7 pt-12">{title("Begin with someone", "Who is this Keep for?")}<div className="grid grid-cols-2 gap-2">{relationships.map((r) => <Button key={r} variant={project.relationship === r ? "selected" : "quiet"} className="h-18 justify-between px-4 text-left font-normal" onClick={() => { patch({ relationship: r, ...(r === "Myself" ? { recipientName: "Myself" } : project.relationship === "Myself" ? { recipientName: "" } : {}) }); if (r !== "Someone else") setOtherRelationship(""); }}>{r}{project.relationship === r && <Check className="size-4 text-accent" />}</Button>)}</div>{project.relationship === "Someone else" && <div className="mt-8 page-enter"><label htmlFor="other-relationship" className="eyebrow">WHO ARE THEY TO YOU?</label><input id="other-relationship" value={otherRelationship} onChange={(e) => setOtherRelationship(e.target.value.slice(0, 50))} placeholder="My coach" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground">Tell KEEP the relationship in your own words.</p></div>}{project.relationship && project.relationship !== "Myself" && <div className="mt-9 page-enter"><label htmlFor="recipient-name" className="eyebrow">NAME(S)</label><input id="recipient-name" value={name} onChange={(e) => patch({ recipientName: e.target.value.slice(0, 60) })} placeholder="Gigi & Pops" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-5xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground">One person or more than one — use the names you naturally call them.</p></div>}<div className="mt-10">{nextButton("Continue", () => { if (project.relationship === "Someone else") patch({ relationship: otherRelationship.trim() }); go("occasion"); }, !project.relationship || (project.relationship !== "Myself" && !name.trim()) || (project.relationship === "Someone else" && !otherRelationship.trim()))}</div></div></>}
    {screen === "occasion" && <>{top("02 / 04")}<div className="px-7 pt-12">{title("Give it a moment", "What are you keeping?", "Choose an occasion or moment.")}<div className="flex flex-wrap gap-2">{occasions.map((o) => <Button key={o} variant={project.occasion === o ? "selected" : "quiet"} className="h-12 rounded-full px-5 font-normal" onClick={() => { patch({ occasion: o }); if (o !== "Other") setOtherOccasion(""); }}>{o}</Button>)}</div>{project.occasion === "Other" && <div className="mt-8 page-enter"><label className="eyebrow" htmlFor="other-occasion">TELL US WHAT IT'S FOR</label><input id="other-occasion" value={otherOccasion} onChange={(e) => setOtherOccasion(e.target.value.slice(0, 80))} placeholder="Our family Disney trip with Gigi & Pops" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground">Describe the moment or memory this KEEP is for.</p></div>}<div className="mt-12">{nextButton("Continue", () => { if (project.occasion === "Other") patch({ occasion: otherOccasion.trim() }); go("intent"); }, project.occasion === "Other" && !otherOccasion.trim())}</div></div></>}
    {screen === "intent" && <>{top("03 / 04")}<div className="px-7 pt-12">{title("The reason behind it", "Why does this Keep matter to you?", "In a sentence or two, tell us what you hope this Keep captures or communicates.")}<textarea value={project.intent} onChange={(e) => patch({ intent: e.target.value.slice(0, 500) })} placeholder="I want Gigi & Pops to know how special it was watching them experience Disney through our kids' eyes, and I want our family to always remember this trip together." className="min-h-44 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-7 outline-none focus:border-accent" /><div className="mt-4 grid grid-cols-2 gap-2"><Button variant={dictating && dictationTargetRef.current === "intent" ? "selected" : "quiet"} className="h-12" onClick={() => toggleDictation("intent")}>{dictating && dictationTargetRef.current === "intent" ? <Square className="mr-2 size-4" fill="currentColor" /> : <Mic className="mr-2 size-4" />}{dictating && dictationTargetRef.current === "intent" ? "Stop" : "Speak"}</Button><Button variant="quiet" className="h-12" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()}>Type</Button></div>{dictating && dictationTargetRef.current === "intent" && <p className="mt-3 text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear above as you talk. Tap Stop when you're finished.</p>}<div className="mt-10">{nextButton("Continue", () => go("path"), !project.intent.trim())}</div></div></>}
    {screen === "path" && <>{top("04 / 04")}<div className="px-7 pt-12">{title("The heart of it", "What do you want to say?")}<div className="space-y-3"><Button variant="quiet" className="h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={startInterview}><span><Sparkles className="mb-7 size-6 text-accent" /><strong className="block font-display text-3xl font-normal">Help me find the words</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">KEEP will ask you some questions to help uncover what you really want to say</small></span><ArrowRight className="mt-1 size-4" /></Button><Button variant="quiet" className="h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={() => go("write")}><span><span className="mb-7 block font-display text-3xl text-accent">“</span><strong className="block whitespace-nowrap font-display text-[clamp(25px,7vw,30px)] font-normal">I know what I want to say</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">Speak it, type it, or bring in something you've already written.</small></span><ArrowRight className="mt-1 size-4" /></Button></div></div></>}
    {screen === "interview" && <div className="flex keep-h-screen min-h-0 flex-col px-7 pb-[max(28px,env(safe-area-inset-bottom))]">{top()}<div className="mt-4"><p className="eyebrow">GETTING TO KNOW YOUR STORY…</p><div className="mt-4 flex items-center gap-1.5" aria-label={`${completedAnswers} ${completedAnswers === 1 ? "answer" : "answers"} shared`}>{Array.from({ length: completedAnswers }, (_, i) => <span key={i} className="h-[2px] w-6 bg-accent page-enter" />)}<span className="h-[2px] w-6 animate-pulse bg-accent/50" /><span className="h-[2px] flex-1 bg-border" /></div></div>
      <div className="thin-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-6 text-center">
      {!aiReady ? <div className="page-enter"><span className="mb-8 block font-display text-6xl text-accent">“</span><h1 className="font-display text-[clamp(28px,7vw,38px)] leading-[1.15]">KEEP's guided interview is taking a short rest.</h1><p className="mx-auto mt-5 max-w-xs text-sm leading-7 text-muted-foreground">It's temporarily unavailable. You can still write your message in your own words.</p></div>
      : aiBusy === "start" || aiBusy === "next" ? <div className="page-enter">{wave(21, true)}<p className="mt-6 font-display text-2xl text-foreground/85">{aiBusy === "start" ? "Getting ready to listen…" : "Thinking…"}</p></div>
      : !project.interviewQuestion ? <div className="page-enter"><p className="font-display text-2xl text-foreground/85">{aiError ? aiErrorText : "Getting ready to listen…"}</p></div>
      : <><span className="mb-8 font-display text-6xl text-accent">“</span><h1 key={q} className="font-display text-[clamp(31px,8vw,45px)] leading-[1.09] page-enter">{project.interviewQuestion}</h1>
      {currentAnswer?.audioUrl && !isRecording && <div className="mt-8 w-full rounded-sm border border-border p-4 text-left page-enter"><div className="mb-3 flex justify-between text-[10px] tracking-widest text-muted-foreground"><span>YOUR VOICE</span><span>{fmt(currentAnswer.durationSec ?? 0)}</span></div><audio controls src={currentAnswer.audioUrl} className="w-full" preload="metadata" /></div>}
      {aiBusy === "transcribe" && <p className="mt-6 text-sm text-accent animate-pulse">Turning your words into text…</p>}
      {!isRecording && aiBusy !== "transcribe" && <textarea aria-label="Your answer" value={currentAnswer?.transcript ?? ""} onChange={(e) => setTypedAnswer(e.target.value)} placeholder={micUnavailable ? "Type your answer here…" : "Speak your answer, or type it here…"} rows={7} className="mt-6 min-h-[190px] max-h-[34dvh] w-full resize-none overflow-y-auto rounded-sm border border-border bg-transparent p-5 text-left font-display text-lg leading-[1.45] outline-none focus:border-accent" />}
      {micUnavailable && <p className="mt-3 max-w-xs text-xs leading-6 text-muted-foreground">{micMessage} You can type your answer instead.</p>}
      </>}
      {aiError && aiReady && <div className="mt-6 w-full border-l border-accent pl-4 text-left page-enter" role="alert"><p className="text-sm leading-6 text-foreground/85">{aiErrorText}</p><Button variant="bare" size="sm" className="mt-1 px-0 text-accent" onClick={aiError.retry}><RotateCcw /> Retry</Button></div>}
    </div><div className="flex flex-col items-center gap-3">{!aiReady ? <Button variant="keep" size="touch" className="w-full justify-between" onClick={() => go("write")}>Write it myself<ArrowRight /></Button>
      : isRecording ? <><div className="text-sm tabular-nums text-accent">● {fmt(recorder.elapsed)}</div>{wave(27, true)}<Button variant="keep" size="touch" className="w-full" onClick={() => void stopAnswer()}><Square fill="currentColor" /> Stop</Button></>
      : !project.interviewQuestion ? <Button variant="quiet" size="touch" className="w-full" onClick={() => go("write")}>Write it myself</Button>
      : currentAnswer?.transcript?.trim() ? <><Button variant="keep" size="touch" className="w-full justify-between" disabled={!!aiBusy} onClick={nextQuestion}>Continue<ArrowRight /></Button>{!micUnavailable && <Button variant="bare" size="sm" className="text-muted-foreground" disabled={!!aiBusy} onClick={() => void startAnswer()}><Mic /> Record again</Button>}</>
      : <>{!micUnavailable && <Button variant="keep" size="touch" className="w-full" disabled={!!aiBusy || recorder.status === "requesting" || recorder.supported === null} onClick={() => void startAnswer()}><Mic /> {recorder.status === "requesting" ? "Waiting for microphone…" : currentAnswer?.audioUrl ? "Record again" : "Tap to answer"}</Button>}<Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => go("write")}>Write it myself</Button></>}</div></div>}
    {screen === "summary" && <>{top()}<div className="flex keep-min-screen-minus-100 flex-col px-7 pb-10 pt-12"><div className="flex-1">{title("Your story", "I think we have it.")}<p className="max-w-md font-display text-[22px] leading-[1.55] text-foreground/88 page-enter sm:text-[24px]">{project.interviewSummary || "You've shared what matters. Let's put it into words."}</p></div><div className="mt-16 space-y-3">{nextButton("Create My Message", createAiMessage, !aiReady)}<Button variant="quiet" size="touch" className="w-full" onClick={() => go("write")}>Write it myself</Button></div></div></>}
    {screen === "messageGenerating" && <div className="relative flex keep-min-screen flex-col overflow-hidden px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-[max(36px,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-x-[-25%] top-[20%] h-72 rounded-full bg-accent/[0.06] blur-3xl" />
      <span className="brand relative z-10">KEEP</span>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-10 flex size-20 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.04]"><Sparkles className="size-7 animate-pulse text-accent" /></div>
        <h1 className="display max-w-sm text-[clamp(48px,13vw,68px)] leading-[0.98]">Putting your words together.</h1>
        {aiBusy === "draft" && <div className="mt-9 w-full max-w-xs">
          {wave(23, true)}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground"><span>Shaping your story into words</span><span className="inline-flex gap-1" aria-hidden="true"><span className="size-1 animate-pulse rounded-full bg-accent" /><span className="size-1 animate-pulse rounded-full bg-accent [animation-delay:180ms]" /><span className="size-1 animate-pulse rounded-full bg-accent [animation-delay:360ms]" /></span></div>
        </div>}
        {aiError?.kind === "draft" && <div className="mt-10 w-full max-w-sm border-l border-accent pl-4 text-left page-enter" role="alert"><p className="text-sm leading-6 text-foreground/85">{aiErrorText}</p><div className="mt-3 flex gap-4"><Button variant="bare" size="sm" className="px-0 text-accent" onClick={aiError.retry}><RotateCcw /> Try again</Button><Button variant="bare" size="sm" className="px-0 text-muted-foreground" onClick={back}>Back</Button></div></div>}
      </div>
    </div>}
    {screen === "write" && <>{top("04 / 04")}<div className="px-7 pb-12 pt-9">{title("In your own words", "Bring us what you want to say.", "Speak it, type it, or upload something you've already written.")}<div className="mb-5 grid grid-cols-3 gap-2"><Button variant={writeInputMode === "speak" ? "selected" : "quiet"} className="h-20 flex-col px-2" onClick={() => { setWriteInputMode("speak"); toggleDictation("write"); }}>{dictating && writeInputMode === "speak" ? <Square fill="currentColor" /> : <Mic />}{dictating && writeInputMode === "speak" ? "Stop" : "Speak"}</Button><Button variant={writeInputMode === "type" ? "selected" : "quiet"} className="h-20 flex-col px-2" onClick={() => { setWriteInputMode("type"); if (dictationRef.current && dictating) dictationRef.current.stop(); window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your message"]')?.focus(), 0); }}><MessageCircle />Type</Button><Button variant={writeInputMode === "upload" ? "selected" : "quiet"} className="h-20 flex-col px-2" disabled={busy} onClick={() => draftInput.current?.click()}><FileUp />{busy ? "Reading…" : "Upload"}</Button></div>{dictating && writeInputMode === "speak" && <div className="mb-4 rounded-sm border border-accent/40 p-4 text-center page-enter"><div className="mb-2 flex items-center justify-center gap-2 text-sm text-accent"><span className="size-2 animate-pulse rounded-full bg-accent" />Listening</div><p className="text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear below as you talk. Tap Stop when you're finished.</p></div>}{uploadedDraftName && writeInputMode === "upload" && <div className="mb-4 flex items-center justify-between rounded-sm border border-border px-4 py-3 page-enter"><span className="min-w-0"><span className="eyebrow block">IMPORTED</span><span className="mt-1 block truncate text-xs text-muted-foreground">{uploadedDraftName}</span></span><Button variant="bare" size="sm" className="shrink-0 text-muted-foreground" onClick={() => draftInput.current?.click()}>Replace</Button></div>}<textarea aria-label="Your message" value={project.writtenText} onChange={(e) => { setWriteInputMode("type"); patch({ writtenText: e.target.value }); }} placeholder="Start here…" rows={12} className="min-h-[320px] w-full resize-y rounded-sm border border-border bg-transparent p-4 font-display text-[22px] leading-[1.35] outline-none focus:border-accent" /><div className="mt-3 flex items-center justify-between"><Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => { patch({ writtenText: "" }); setUploadedDraftName(""); setWriteInputMode("type"); }}>Clear</Button><span className="text-[10px] tracking-wide text-muted-foreground">DOCX · PDF · TXT · MD · RTF</span></div><div className="mt-8">{nextButton("Continue", () => { const paras = project.writtenText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); patch({ messageParagraphs: paras, messageSource: "own" }); setActiveParagraph(0); go("message"); }, !project.writtenText.trim())}</div></div></>}
    {screen === "message" && <>{top("04 / 04")}<div className="px-7 pb-32 pt-9">{title(project.messageSource === "own" ? "In your own words" : project.messageSource === "ai" ? "Shaped from your story" : "Demo generation", project.messageSource === "own" ? "Your message." : "Your message is ready.", "Tap any paragraph to make it yours.")}<div className="space-y-1">{project.messageParagraphs.map((p, i) => <textarea key={i} aria-label={`Message paragraph ${i + 1}`} rows={Math.max(3, Math.ceil(p.length / 44))} value={p} onFocus={() => setActiveParagraph(i)} onChange={(e) => patch({ messageParagraphs: project.messageParagraphs.map((item, j) => (j === i ? e.target.value : item)) })} className={`w-full resize-none rounded-sm border bg-transparent p-3 font-display text-[23px] leading-[1.3] outline-none transition-colors ${activeParagraph === i ? "border-accent/50" : "border-transparent"}`} />)}</div><Button variant="bare" size="sm" className="mt-2 text-muted-foreground" onClick={() => { patch({ messageParagraphs: [...project.messageParagraphs, ""] }); setActiveParagraph(project.messageParagraphs.length); }}><Plus /> Add paragraph</Button><Button variant="quiet" size="touch" className="mt-5 w-full" onClick={openAskKeep}><Sparkles /> Ask KEEP</Button><div className="mt-3">{nextButton("Record Your Keep", () => { patch({ messageParagraphs: project.messageParagraphs.filter((p) => p.trim()) }); go("recordPrep"); }, !project.messageParagraphs.some((p) => p.trim()))}</div></div>
      {askOpen && sheet("Ask KEEP", () => { if (!askBusy) { setAskOpen(false); setAskSuggestion(null); setAskError(""); } }, askSuggestion ? <>
        <div className="mt-3 flex items-center justify-between text-[10px] tracking-widest text-muted-foreground"><span>{askLastScope === "message" ? "WHOLE MESSAGE" : `SECTION ${activeParagraph + 1} OF ${project.messageParagraphs.length}`}</span><span>KEEP SUGGESTS</span></div>
        <div className="mt-4 rounded-sm border border-accent/30 bg-accent/[0.03] p-5">
          <div className="space-y-4">{(askSuggestion.changedIndexes.length ? askSuggestion.changedIndexes : [activeParagraph]).map((i) => askSuggestion.paragraphs[i] ? <div key={i}><p className="mb-2 text-[10px] tracking-widest text-accent">SECTION {i + 1}</p><p className="font-display text-[21px] leading-[1.42]">{askSuggestion.paragraphs[i]}</p></div> : null)}</div>
          {askSuggestion.note && <p className="mt-5 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">{askSuggestion.note}</p>}
        </div>
        <div className="mt-6 space-y-2">
          <Button variant="keep" size="touch" className="w-full justify-between" onClick={applyAskSuggestion}>Use this version<Check /></Button>
          <Button variant="quiet" size="touch" className="w-full" disabled={askBusy} onClick={() => void askKeep(askLastInstruction, askLastScope)}><RotateCcw /> Try another version</Button>
          <Button variant="bare" size="touch" className="w-full text-muted-foreground" onClick={() => { setAskOpen(false); setAskSuggestion(null); }}>Keep my original</Button>
        </div>
      </> : <>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">Start with the whole message, or choose one section to fine-tune.</p>

        <div className="mt-6">
          <p className="eyebrow mb-2">WHOLE MESSAGE</p>
          {[
            ["Make this longer", "Build out the message using more of what you shared."],
            ["Make it more personal", "Bring more of your specific memories and language into it."],
            ["Make it more emotional", "Deepen what you mean without making it feel overdone."],
            ["Make it flow better", "Improve the structure and transitions from beginning to end."],
            ["Strengthen the ending", "Help the final part land with more meaning and connection."],
          ].map(([prompt, note]) => <Button key={prompt} variant="bare" disabled={askBusy} className="flex h-auto min-h-16 w-full items-center justify-between border-t border-border px-0 py-3 text-left font-normal whitespace-normal" onClick={() => void askKeep(prompt, "message")}><span className="pr-4"><span className="block">{prompt}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{note}</span></span><ArrowRight className="size-4 shrink-0 text-accent" /></Button>)}

          <div className="mt-5 border-t border-border pt-5">
            <label htmlFor="ask-keep-whole-custom" className="eyebrow">TELL KEEP WHAT YOU WANT</label>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Describe how you want KEEP to reshape the entire message.</p>
            <textarea id="ask-keep-whole-custom" value={askPrompt} onChange={(e) => setAskPrompt(e.target.value.slice(0, 500))} placeholder="Make this warmer and more conversational. Spend more time on what this relationship has meant to me…" rows={4} className="mt-3 min-h-28 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-6 outline-none focus:border-accent" />
            <Button variant="keep" size="touch" className="mt-3 w-full justify-between" disabled={askBusy || !askPrompt.trim()} onClick={() => void askKeep(askPrompt, "message")}>Ask KEEP<Sparkles /></Button>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-7">
          <p className="eyebrow mb-3">EDIT ONE SECTION</p>
          <p className="mb-4 text-xs leading-5 text-muted-foreground">Select the exact paragraph you want KEEP to refine.</p>
          <div className="flex flex-wrap gap-2">{project.messageParagraphs.map((p, i) => <button key={i} type="button" disabled={askBusy} onClick={() => { setActiveParagraph(i); setAskError(""); setAskSuggestion(null); }} className={`flex size-10 items-center justify-center rounded-full border text-xs transition-colors ${activeParagraph === i ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"}`} aria-label={`Select section ${i + 1}`}>{i + 1}</button>)}</div>
          <div className="mt-4 rounded-sm border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between"><span className="eyebrow">SECTION {activeParagraph + 1}</span><span className="text-[10px] text-muted-foreground">{activeParagraph + 1} / {project.messageParagraphs.length}</span></div>
            <p className="max-h-36 overflow-y-auto font-display text-[19px] leading-[1.45] text-foreground/90">{project.messageParagraphs[activeParagraph] || "This section is empty."}</p>
          </div>
          <div className="mt-5">
            {["Make this sound more like me", "Deepen this section", "Shorten this section", "Bring in a memory"].map((prompt) => <Button key={prompt} variant="bare" disabled={askBusy} className="flex min-h-14 w-full justify-between border-t border-border px-0 py-3 text-left font-normal whitespace-normal" onClick={() => void askKeep(prompt, "section")}><span>{prompt}</span><ArrowRight className="size-4 shrink-0 text-accent" /></Button>)}
          </div>
        </div>

        {askError && <div className="mt-5 border-l border-accent pl-4" role="alert"><p className="text-sm leading-6 text-foreground/85">{askError}</p>{askLastInstruction && <Button variant="bare" size="sm" className="mt-1 px-0 text-accent" disabled={askBusy} onClick={() => void askKeep(askLastInstruction, askLastScope)}><RotateCcw /> Try again</Button>}</div>}
      </>)}
      {askBusy && <div className="keep-fixed-screen fixed left-0 right-0 top-0 z-[70] flex items-center justify-center bg-background/55 px-8 backdrop-blur-[2px]" role="status" aria-live="polite"><div className="w-full max-w-[300px] rounded-lg border border-accent/25 bg-card px-6 py-7 text-center shadow-2xl page-enter"><div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.05]"><Sparkles className="size-5 animate-pulse text-accent" /></div><p className="font-display text-2xl">KEEP is working on it.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{askLastScope === "message" ? "Reading your full story and reshaping the message…" : `Refining Section ${activeParagraph + 1} in the context of your whole story…`}</p><div className="mt-5">{wave(15, true)}</div></div></div>}
    </>}
    {screen === "recordPrep" && <div className="flex keep-min-screen flex-col px-7 pb-[max(36px,env(safe-area-inset-bottom))]">
      {top()}
      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="display text-[clamp(48px,13vw,68px)]">Before you record.</h1>
        <p className="mt-5 whitespace-nowrap text-[11px] leading-5 text-muted-foreground">This doesn't need to sound perfect. It needs to sound like you.</p>
        <div className="mt-10">
          <p className="eyebrow mb-5">A FEW SUGGESTIONS</p>
          <ul className="space-y-5 pl-5 text-left">
            <li className="list-disc pl-2 marker:text-accent"><strong className="block text-sm font-medium">Find a quiet room.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Give your voice a little space from background noise.</p></li>
            <li className="list-disc pl-2 marker:text-accent"><strong className="block text-sm font-medium">Silence notifications.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Keep your phone reasonably close (about 6–12 inches away) and let this moment have your attention.</p></li>
            <li className="list-disc pl-2 marker:text-accent"><strong className="block text-sm font-medium">Speak naturally.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">A little slower than normal is great. Pauses are welcome.</p></li>
            <li className="list-disc pl-2 marker:text-accent"><strong className="block text-sm font-medium">Mistakes are okay.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Pause, restart a sentence, laugh, get emotional. It doesn't have to be polished.</p></li>
          </ul>
        </div>
        <ul className="mt-5 space-y-5 pl-5 text-left">
          <li className="list-disc pl-2 marker:text-accent"><strong className="block text-sm font-medium">Don't perform.</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Talk directly to them. Picture them listening.</p></li>
        </ul>
      </div>
      <div>{nextButton("I'm ready", () => go("record"))}</div>
    </div>}
    {screen === "record" && <div className="relative grid keep-h-screen min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden px-7 pb-[max(18px,env(safe-area-inset-bottom))]">{top()}<div className="px-1 pb-3 pt-1 text-center"><h1 className="display text-[clamp(38px,10.5vw,50px)] leading-[0.98]">Now say it in your own voice.</h1><p className="mt-3 text-xs leading-5 text-muted-foreground">These are your words. They should sound like you.</p></div><div className="script-fade min-h-0 overflow-hidden py-2"><div className="space-y-8 pt-8 text-center transition-transform duration-300 ease-linear" style={{ transform: `translateY(-${scroll}px)` }}>{project.messageParagraphs.map((p, i) => <p key={i} className={`font-display text-3xl leading-[1.35] ${isRecording || rehearsing ? "text-foreground" : i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{p}</p>)}</div></div><div className="border-t border-border/60 bg-background/95 pt-3 text-center backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <Button variant="quiet" size="sm" className="flex-1" disabled={teleprompterSpeed <= 0.2} onClick={() => setTeleprompterSpeed((v) => Math.max(0.2, Math.round((v - 0.2) * 10) / 10))}>Slower</Button>
        <div className="min-w-[96px] text-center"><span className="block text-[10px] tracking-widest text-muted-foreground">TELEPROMPTER</span><span className="mt-1 block text-sm tabular-nums text-foreground">{teleprompterSpeed.toFixed(1)}×</span></div>
        <Button variant="quiet" size="sm" className="flex-1" disabled={teleprompterSpeed >= 3} onClick={() => setTeleprompterSpeed((v) => Math.min(3, Math.round((v + 0.2) * 10) / 10))}>Faster</Button>
      </div>

      {!isRecording && <div className="mb-3">
        <Button variant="quiet" size="touch" className="w-full" onClick={() => { setScrollPaused(false); setRehearsing((value) => !value); }}>{rehearsing ? <Pause /> : <Play />}{rehearsing ? "Pause rehearsal" : scroll > 0 ? "Continue rehearsal" : "Rehearse teleprompter"}</Button>
        {scroll > 0 && <Button variant="bare" size="sm" className="mt-1 text-muted-foreground" onClick={() => { setRehearsing(false); setScroll(0); setScrollPaused(false); }}><RotateCcw /> Restart rehearsal</Button>}
      </div>}

      <div className={`mb-1 text-sm tabular-nums ${isRecording ? "text-accent" : rehearsing ? "text-foreground/80" : "text-muted-foreground"}`}>{isRecording ? `● ${fmt(recorder.elapsed)}` : rehearsing ? "REHEARSING · NOT RECORDING" : "Ready when you are"}</div>
      <div className="h-9 overflow-hidden">{wave(23, recorder.status === "recording" || rehearsing)}</div>
      {micUnavailable ? <><p className="mt-4 text-xs leading-5 text-muted-foreground">{micMessage}</p><Button variant="keep" size="touch" className="mt-4 w-full" onClick={useDemoRecording}>Use demo recording (3:57)</Button></> : <div className="mt-3 flex gap-2">{!isRecording ? <Button variant="keep" size="touch" className="w-full" disabled={recorder.status === "requesting" || recorder.supported === null} onClick={() => void startFinal()}><Mic /> {recorder.status === "requesting" ? "Waiting for microphone…" : "Start Recording"}</Button> : <>{recorder.canPause ? <Button variant="quiet" size="touch" className="flex-1" onClick={() => (recorder.status === "paused" ? recorder.resume() : recorder.pause())}>{recorder.status === "paused" ? <Play /> : <Pause />}{recorder.status === "paused" ? "Resume" : "Pause"}</Button> : <Button variant="quiet" size="touch" className="flex-1" onClick={() => setScrollPaused(!scrollPaused)}>{scrollPaused ? <Play /> : <Pause />}{scrollPaused ? "Resume script" : "Pause script"}</Button>}<Button variant="keep" size="touch" className="flex-1" onClick={() => void finishFinal()}><Check /> Finish</Button></>}</div>}
    </div></div>}
    {screen === "recorded" && <>{top()}<div className="relative flex keep-min-screen-minus-90 flex-col overflow-hidden px-7 pb-[max(36px,env(safe-area-inset-bottom))] pt-8">
      <div className="pointer-events-none absolute left-1/2 top-[31%] h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative z-10 text-center">
        <p className="eyebrow">A VOICE WORTH KEEPING</p>
        <h1 className="display mx-auto mt-5 max-w-sm text-[clamp(50px,13vw,68px)] leading-[0.96]">Your voice is ready.</h1>
        <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-muted-foreground">Not polished. Not performed. Just you — exactly how they should hear it.</p>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-7">
        {!rec ? <p className="text-sm text-muted-foreground">No recording yet.</p> : rec.demo ? <div className="w-full max-w-sm rounded-2xl border border-accent/20 bg-card/80 p-7 text-center shadow-2xl backdrop-blur">
          <div className="voice-orb mx-auto flex size-24 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.05]"><Play className="ml-1 size-8 text-accent" fill="currentColor" /></div>
          <p className="mt-6 font-display text-2xl">Demo recording</p>
          <p className="mt-2 text-xs text-muted-foreground">No audio attached · 3:57</p>
        </div> : <div className="w-full max-w-sm">
          {rec.audioUrl ? <>
            <audio ref={voicePlaybackRef} src={rec.audioUrl} preload="metadata" className="sr-only" onPlay={() => setVoicePlaying(true)} onPause={() => setVoicePlaying(false)} onEnded={() => { setVoicePlaying(false); setVoiceTime(0); }} onTimeUpdate={(e) => setVoiceTime(e.currentTarget.currentTime)} />
            <div className="relative overflow-hidden rounded-[28px] border border-accent/20 bg-card/80 px-6 pb-6 pt-8 shadow-2xl backdrop-blur">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/10 blur-3xl" />
              <button type="button" onClick={toggleVoicePlayback} aria-label={voicePlaying ? "Pause recording" : "Play recording"} className="voice-orb relative mx-auto flex size-24 items-center justify-center rounded-full border border-accent/35 bg-accent/[0.07] text-accent shadow-[0_0_60px_oklch(0.76_0.055_78/0.16)] transition-transform active:scale-95">
                {voicePlaying ? <Pause className="size-8" fill="currentColor" /> : <Play className="ml-1 size-8" fill="currentColor" />}
                {voicePlaying && <span className="pulse-ring absolute inset-0 rounded-full border border-accent/45" />}
              </button>

              <div className="mt-7 flex h-14 items-center justify-center gap-[3px]" aria-hidden="true">
                {Array.from({ length: 31 }, (_, i) => {
                  const height = 9 + ((i * 19) % 37);
                  const active = voicePlaying || (rec.durationSec > 0 && i / 31 <= voiceTime / rec.durationSec);
                  return <span key={i} className={`${voicePlaying ? "wave-bar" : ""} w-[2px] rounded-full transition-opacity ${active ? "bg-accent opacity-100" : "bg-foreground/25 opacity-60"}`} style={{ height: `${height}px`, animationDelay: `${-(i % 8) * 0.11}s` }} />;
                })}
              </div>

              <input aria-label="Recording progress" type="range" min={0} max={Math.max(1, rec.durationSec)} step={0.1} value={Math.min(voiceTime, rec.durationSec)} onChange={(e) => seekVoicePlayback(Number(e.target.value))} className="voice-progress mt-4 w-full" />
              <div className="mt-2 flex items-center justify-between text-[10px] tracking-widest text-muted-foreground"><span>{fmt(voiceTime)}</span><span>{fmt(rec.durationSec)}</span></div>

              <div className="mt-6 border-t border-border pt-5 text-center">
                <p className="font-display text-[22px] leading-snug">{voicePlaying ? "This is how they'll hear you." : "Press play and hear what you kept."}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{fmt(rec.durationSec)} of your voice, saved with this Keep.</p>
                {!rec.demo && <div className="mt-4">
                  {captionSyncing ? <p className="flex items-center justify-center gap-2 text-[11px] text-accent"><Sparkles className="size-3.5 animate-pulse" /> Syncing captions to your voice…</p> : captionSyncError ? <div><p className="text-[11px] leading-5 text-muted-foreground">Caption timing needs another pass.</p><Button variant="bare" size="sm" className="mt-1 text-accent" onClick={() => void retryCaptionSync()}><RotateCcw /> Retry sync</Button></div> : project.captionCues.length ? <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><Check className="size-3.5 text-accent" /> Captions synced to your recording</p> : null}
                </div>}
              </div>
            </div>
          </> : <div className="rounded-2xl border border-border bg-card/70 p-6 text-center"><p className="font-display text-2xl">Your recording is here.</p><p className="mt-3 text-xs leading-5 text-muted-foreground">The audio couldn't be restored on this device. Record again to hear it.</p></div>}
        </div>}
      </div>

      <div className="relative z-10 space-y-2">
        {nextButton(returnToEditorAfterRecording ? "Use updated recording" : "Keep this recording", () => {
          if (returnToEditorAfterRecording) {
            setReturnToEditorAfterRecording(false);
            setHistory([]);
            setScreen("editor");
            window.scrollTo(0, 0);
          } else {
            go("memories");
          }
        }, !rec || captionSyncing || (!!rec && !rec.demo && project.captionCues.length === 0))}
        <Button variant="bare" size="touch" className="w-full text-muted-foreground" onClick={() => go("record")}><RotateCcw /> Record again</Button>
      </div>
    </div></>}
    {screen === "memories" && <>{top()}<div className="px-7 pb-10 pt-9">{title("The moments in between", "Bring your words to life.", "Add photos & videos that belong to your Keep.")}{frames.length === 0 ? <div className="mt-10"><div className="grid h-72 grid-cols-3 gap-1 overflow-hidden opacity-60"><img className="col-span-2 h-full w-full object-cover" src={memoryImages[2]} alt="Travel memory placeholder" /><div className="flex flex-col gap-1"><img className="h-1/2 w-full object-cover" src={memoryImages[1]} alt="Wedding memory placeholder" /><img className="h-1/2 w-full object-cover" src={memoryImages[3]} alt="Family memory placeholder" /></div></div><Button variant="keep" size="touch" className="mt-8 w-full" disabled={busy} onClick={() => addInput.current?.click()}><Images /> {busy ? "Adding…" : "Choose Photos & Videos"}</Button><Button variant="bare" size="sm" className="mt-3 w-full text-muted-foreground" onClick={() => patch({ memories: sampleMemories() })}>Use sample memories</Button>{note("Your photos and videos stay on this device.")}</div> : <div className="page-enter"><div className="grid grid-cols-3 gap-1">{frames.map((m, i) => <div key={m.id} className="relative aspect-square overflow-hidden bg-card"><MediaView item={m} thumb alt={m.name ?? `Memory ${i + 1}`} className="h-full w-full object-cover" />{m.kind === "video" && <Play className="absolute bottom-1.5 left-1.5 size-3.5" fill="currentColor" />}<button type="button" aria-label={`Remove memory ${i + 1}`} onClick={() => removeMemory(i)} className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground"><X className="size-3.5" /></button></div>)}<button type="button" onClick={() => addInput.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-1 border border-border text-xs text-muted-foreground"><Plus className="size-4" />{busy ? "Adding…" : "Add more"}</button></div><p className="mt-5 text-center text-sm">{frames.length} {frames.length === 1 ? "memory" : "memories"} added <Check className="ml-1 inline size-4 text-accent" /></p><div className="mt-10">{nextButton("Create My Keep", () => { setGeneration(0); setFrame(0); go("generating"); })}</div><div className="mt-4">{note(frames.some((m) => m.source === "upload" && !m.persisted) ? "Some media couldn't be saved on this device and will be cleared on refresh." : "Saved on this device only.")}</div></div>}</div></>}
    {screen === "generating" && <div className="flex keep-h-screen flex-col items-center justify-center px-8 text-center"><div className="relative mb-14 flex size-30 items-center justify-center"><div className="pulse-ring absolute inset-0 rounded-full border border-accent" /><Sparkles className="size-8 text-accent" /></div><div className="eyebrow mb-5">MAKING SOMETHING THAT LASTS</div><h1 key={generation} className="display min-h-32 text-5xl page-enter">{["Listening to your story…", "Finding the moments that fit…", "Building your Keep…", "Almost there…"][generation]}</h1><p className="mt-8 text-xs text-muted-foreground">MVP preview · memories are arranged in the order you added them</p></div>}
    {screen === "editor" && selected && <div className="relative flex keep-h-screen min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))]">
        <Button variant="bare" size="icon" aria-label="Back" onClick={back}><ArrowLeft /></Button>
        <div className="flex items-center gap-1">
          <Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => { setViewingDemo(false); setPreviewChooserOpen(true); setReadArrangeOpen(false); }}><Play className="size-4" /> Preview</Button>
          <Button variant="keep" size="sm" onClick={toCard}>Done <Check className="size-4" /></Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-5 py-3">
        <div className="relative flex items-center justify-center">
          <div className="relative aspect-[9/16] h-[min(60dvh,500px)] max-h-[calc(100dvh-190px)] overflow-hidden rounded-[30px] border border-foreground/15 bg-card shadow-[0_24px_70px_oklch(0_0_0/0.55)]">
            <MediaView key={selected.id} item={selected} alt={`Memory preview ${frame + 1}`} className={`h-full w-full object-cover ${editorPlaying && selected.kind === "image" ? "ken-burns" : ""} editor-image-${styleSlug(project.visualStyle)}`} />
            <div className="absolute inset-0 photo-shade" />
            {project.captionStyle !== "None" && <div className="absolute bottom-16 left-5 right-5 text-center">
              <p className={`${project.captionStyle === "Film" ? "font-display text-3xl font-normal" : project.captionStyle === "Minimal" ? "text-sm" : project.captionStyle === "Story" ? "font-display text-2xl italic" : project.captionStyle === "Clean" ? "text-sm font-medium" : "text-lg font-semibold"} leading-tight drop-shadow-md`}>
                {project.captionStyle === "Reel" ? <>YOU MAKE PEOPLE FEEL <span className="text-accent">AT HOME</span></> : project.captionStyle === "Minimal" ? "Feel at home." : "You make people feel at home."}
              </p>
            </div>}

            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
              <Button variant="bare" size="icon" className="size-8 bg-black/25 backdrop-blur" aria-label={editorPlaying ? "Pause preview" : "Play preview"} onClick={() => setEditorPlaying(!editorPlaying)}>{editorPlaying ? <Pause className="size-3.5" fill="currentColor" /> : <Play className="size-3.5" fill="currentColor" />}</Button>
              <div className="h-[2px] flex-1 bg-foreground/35"><div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${((frame % shown.length) + 1) / shown.length * 100}%` }} /></div>
              <span className="text-[9px] tabular-nums">{fmt(totalSec * ((frame % shown.length) + 1) / shown.length)}</span>
            </div>
          </div>

          <div className="absolute -right-[58px] top-1/2 flex -translate-y-1/2 flex-col gap-2.5">
            {([
              ["Memories", Images],
              ["Music", Music2],
              ["Voice", Mic],
              ["Captions", MessageCircle],
              ["Style", Sparkles],
            ] as [Mode, any][]).map(([m, Icon]) => <button key={m} type="button" onClick={() => { setMode(m); if (m !== "Music") { stopMusicSample(); setMusicSampling(""); } setEditorPanel((current) => current === m ? null : m); }} className="group flex w-12 flex-col items-center gap-1 text-center">
              <span className="flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-md backdrop-blur transition-transform group-active:scale-95"><Icon className="size-4" /></span>
              <span className="text-[8px] leading-none text-muted-foreground/85">{m}</span>
            </button>)}
          </div>
        </div>
      </div>

      {(editorPanel === "Music" || editorPanel === "Captions" || editorPanel === "Style") && <div className="border-t border-border/60 bg-card/55 px-5 py-3 backdrop-blur-md page-enter">
        {editorPanel === "Music" && <>
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Music</p><p className="mt-1 text-[10px] text-muted-foreground">Sample first. Choose what feels right.</p></div><Button variant="bare" size="icon" aria-label="Close music" onClick={() => { stopMusicSample(); setMusicSampling(""); setEditorPanel(null); }}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-2">
            {tracks.map((track) => <div key={track.name} className={`w-44 shrink-0 rounded-xl border p-3 ${project.musicMood === track.name ? "border-accent/70 bg-accent/[0.04]" : "border-border bg-background/35"}`}>
              <div className="min-h-14"><p className="text-xs font-medium">{track.name}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{track.note}</p></div>
              <div className="mt-3 flex gap-1.5"><Button variant="quiet" size="sm" className="flex-1 px-2 text-[10px]" onClick={() => void toggleMusicSample(track.name)}>{musicSampling === track.name ? <Square className="size-3" fill="currentColor" /> : <Play className="size-3" fill="currentColor" />}{musicSampling === track.name ? "Stop" : "Sample"}</Button><Button variant={project.musicMood === track.name ? "selected" : "bare"} size="sm" className="flex-1 px-2 text-[10px]" onClick={() => patch({ musicMood: track.name })}>{project.musicMood === track.name ? <Check className="size-3" /> : null}{project.musicMood === track.name ? "Selected" : "Use"}</Button></div>
            </div>)}
          </div>
          <div className="mt-2 flex items-center gap-2"><span className="mr-1 text-[9px] tracking-widest text-muted-foreground">MIX</span>{["Soft", "Balanced", "Full"].map((b) => <Button key={b} variant={project.voiceMusicBalance === b ? "selected" : "quiet"} size="sm" className="flex-1 text-[10px]" onClick={() => patch({ voiceMusicBalance: b })}>{b}</Button>)}</div>
        </>}
        {editorPanel === "Captions" && <>
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Captions</p><p className="mt-1 text-[10px] text-muted-foreground">{project.captionCues.length ? "Synced to your voice." : "Choose how your words appear."}</p></div><Button variant="bare" size="icon" aria-label="Close captions" onClick={() => setEditorPanel(null)}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">{captionOptions.map((c) => <Button key={c} variant={project.captionStyle === c ? "selected" : "quiet"} className="h-16 min-w-28 shrink-0 flex-col whitespace-normal px-3" onClick={() => patch({ captionStyle: c })}><span className={c === "Film" ? "font-display text-lg" : "text-xs"}>{c}</span><small className="text-[8px] font-normal text-muted-foreground">{c === "None" ? "No words" : c === "Reel" ? "Bold" : c === "Film" ? "Elegant" : c === "Story" ? "Emotional" : c === "Minimal" ? "Quiet" : "Simple"}</small></Button>)}</div>
        </>}
        {editorPanel === "Style" && <>
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Style</p><p className="mt-1 text-[10px] text-muted-foreground">Tap a look and see it above instantly.</p></div><Button variant="bare" size="icon" aria-label="Close style" onClick={() => setEditorPanel(null)}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">{styles.map((style) => <button key={style.name} type="button" onClick={() => patch({ visualStyle: style.name })} className={`w-24 shrink-0 overflow-hidden rounded-lg border text-left ${project.visualStyle === style.name ? "border-accent ring-1 ring-accent" : "border-border"}`}><div className="relative h-14 overflow-hidden"><MediaView item={selected} thumb alt={style.name} className={`h-full w-full object-cover editor-image-${styleSlug(style.name)}`} /></div><div className="p-2"><p className="text-[10px] font-medium">{style.name}</p></div></button>)}</div>
        </>}
      </div>}

      <div className="border-t border-border/70 bg-background/96 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">
          {shown.map((m, i) => <button key={m.id} type="button" aria-label={`Select memory ${i + 1}`} onClick={() => setFrame(i)} className={`relative h-14 w-11 shrink-0 overflow-hidden rounded-md border transition-all ${i === frame % shown.length ? "border-accent ring-1 ring-accent" : "border-border opacity-55"}`}>
            <MediaView item={m} thumb alt={m.source === "sample" ? memoryLabels[i % memoryLabels.length] ?? "" : m.name ?? ""} className="h-full w-full object-cover" />
            {m.kind === "video" && <Play className="absolute bottom-1 left-1 size-2.5" fill="currentColor" />}
          </button>)}
          <button type="button" onClick={() => addInput.current?.click()} disabled={busy} className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground"><Plus className="size-4" /></button>
        </div>
      </div>

      {editorPanel === "Memories" && sheet("Moments", () => setEditorPanel(null), <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose the moments that bring your words to life. Reorder, replace, or add anything you want.</p>
        <div className="thin-scroll mt-5 flex gap-2 overflow-x-auto pb-2">{shown.map((m, i) => <div key={m.id} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragFrom.current !== null) moveMemory(dragFrom.current, i); dragFrom.current = null; }} className="shrink-0"><Button variant="bare" className={`relative h-24 w-18 overflow-hidden rounded-lg !p-0 ${i === frame % shown.length ? "ring-2 ring-accent" : "opacity-65"}`} aria-label={`Select memory ${i + 1}`} onClick={() => setFrame(i)}><MediaView item={m} thumb alt={m.source === "sample" ? memoryLabels[i % memoryLabels.length] ?? "" : m.name ?? ""} className="h-full w-full object-cover" />{m.kind === "video" && <Play className="absolute bottom-1.5 left-1.5 size-3" fill="currentColor" />}</Button></div>)}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="quiet" onClick={() => addInput.current?.click()}><Plus /> Add moments</Button>
          <Button variant="quiet" onClick={() => replaceInput.current?.click()}>Replace</Button>
          <Button variant="quiet" disabled={frame % shown.length === 0} onClick={() => moveMemory(frame % shown.length, frame % shown.length - 1)}><ChevronLeft /> Earlier</Button>
          <Button variant="quiet" disabled={frame % shown.length >= shown.length - 1} onClick={() => moveMemory(frame % shown.length, frame % shown.length + 1)}>Later <ChevronRight /></Button>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
          <Button variant="bare" size="sm" disabled={shown.length <= 1} className="text-muted-foreground" onClick={() => removeMemory(frame % shown.length)}><Trash2 className="size-4" /> Remove</Button>
          <Button variant="bare" size="sm" onClick={cycleMemoryDuration}>Duration {selected?.displayDurationSec ?? 4}s</Button>
        </div>
      </div>)}

      {editorPanel === "Voice" && sheet("Voice & words", () => setEditorPanel(null), <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Remember something you want to add? You can change the words or record your voice again without losing the rest of your Keep.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={editWordsFromEditor} className="flex w-full items-center justify-between rounded-xl border border-border bg-background/45 p-5 text-left transition-colors hover:border-accent/45">
            <span className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.05] text-accent"><MessageCircle className="size-5" /></span>
              <span>
                <strong className="block font-display text-2xl font-normal">Edit my words</strong>
                <small className="mt-1 block max-w-[250px] text-[11px] leading-5 text-muted-foreground">Add a memory, change a line, or use Ask KEEP again. Then record the updated message.</small>
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-accent" />
          </button>

          <button type="button" onClick={rerecordFromEditor} className="flex w-full items-center justify-between rounded-xl border border-border bg-background/45 p-5 text-left transition-colors hover:border-accent/45">
            <span className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.05] text-accent"><Mic className="size-5" /></span>
              <span>
                <strong className="block font-display text-2xl font-normal">Re-record my voice</strong>
                <small className="mt-1 block max-w-[250px] text-[11px] leading-5 text-muted-foreground">Keep your current words and record them again with the teleprompter.</small>
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-accent" />
          </button>
        </div>
        <div className="mt-6 rounded-lg border border-accent/15 bg-accent/[0.03] p-4">
          <p className="text-xs leading-5 text-muted-foreground">Your photos, order, music, captions, and visual style stay exactly as they are while you update the words or voice.</p>
        </div>
      </div>)}

      {previewChooserOpen && sheet("Preview your Keep", () => { setPreviewChooserOpen(false); setReadArrangeOpen(false); }, <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose how you want to check it. Previewing is optional — you can come back and make changes anytime.</p>
        <div className="mt-5 space-y-2">
          <Button variant="keep" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("watch")}><span className="flex items-center gap-3"><Images className="size-5" /><span><strong className="block font-normal">Watch</strong><small className="mt-1 block font-normal text-foreground/70">Voice, memories, music + captions</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("listen")}><span className="flex items-center gap-3"><Music2 className="size-5" /><span><strong className="block font-normal">Listen</strong><small className="mt-1 block font-normal text-muted-foreground">Hear the final voice + music mix</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("read")}><span className="flex items-center gap-3"><MessageCircle className="size-5" /><span><strong className="block font-normal">Read</strong><small className="mt-1 block font-normal text-muted-foreground">Words woven together with memories</small></span></span><ArrowRight /></Button>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <Button variant="bare" size="sm" className="w-full justify-between px-0 text-muted-foreground" onClick={() => setReadArrangeOpen((v) => !v)}><span>Arrange read-version photos</span>{readArrangeOpen ? <ChevronLeft className="size-4 -rotate-90" /> : <ChevronRight className="size-4 rotate-90" />}</Button>
          {readArrangeOpen && <div className="mt-4 page-enter">
            <div className="thin-scroll flex gap-2 overflow-x-auto pb-2">{readOrderedFrames.map((m, i) => <button key={m.id} type="button" onClick={() => setReadArrangeIndex(i)} className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-md border ${i === readArrangeIndex ? "border-accent ring-1 ring-accent" : "border-border opacity-60"}`}><MediaView item={m} thumb alt={m.name ?? `Read memory ${i + 1}`} className="h-full w-full object-cover" /></button>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="quiet" disabled={readArrangeIndex <= 0} onClick={() => moveReadMemory(readArrangeIndex, readArrangeIndex - 1)}><ChevronLeft /> Earlier</Button>
              <Button variant="quiet" disabled={readArrangeIndex >= readOrderedFrames.length - 1} onClick={() => moveReadMemory(readArrangeIndex, readArrangeIndex + 1)}>Later <ChevronRight /></Button>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">This only changes the Read version. Your Watch order stays the same.</p>
          </div>}
        </div>
      </div>)}
    </div>}
    {screen === "preview" && (viewingDemo
      ? <KeepPlayer name="HANNA" from="Alex" year="2026" onExit={back} onFinish={home} />
      : <KeepPlayer name={(name || "Your Keep").toUpperCase()} from="Alex" year="2026" subtitle={project.occasion} onExit={back} onFinish={() => go("recipientReveal")} style={project.visualStyle} captions={project.captionStyle} media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 4 })) : undefined} audioUrl={rec && !rec.demo ? rec.audioUrl : undefined} audioDuration={rec?.durationSec} lines={captionLines} captionCues={project.captionCues} musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} />)}
    {screen === "recipientPreview" && <KeepRecipientExperience
      name={(name || engraving[0] || "You").trim()}
      from={(engraving[1]?.replace(/^FROM\s+/i, "") || "Alex").trim()}
      year={(engraving[2] || "2026").trim()}
      subtitle={project.occasion}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 4 })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 4 })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs.length ? project.messageParagraphs : initialMessage.map((p) => withName(p, name))}
      style={project.visualStyle}
      captions={project.captionStyle}
      lines={captionLines}
      captionCues={project.captionCues}
      musicMood={project.musicMood}
      voiceMusicBalance={project.voiceMusicBalance}
      persistVisit={false}
      creatorPreview
      initialExperience={creatorPreviewMode ?? "watch"}
      onCreatorExit={() => { setCreatorPreviewMode(null); setHistory([]); setScreen("editor"); resetPageScroll(); }}
      onCreatorContinue={() => { setCreatorPreviewMode(null); setScreen("editor"); resetPageScroll(); }}
    />}
    {screen === "card" && <>{top()}<div className="px-7 pb-10 pt-7">{title("The final touch", "Give it somewhere to live.", "Your card opens this Keep with a tap. No app or login required.")}<div className="card-object relative mx-auto aspect-[1.586] w-full max-w-none overflow-hidden rounded-lg border border-foreground/10 p-7 text-white"><span className="brand absolute left-7 top-7 text-sm text-white">KEEP</span><div className="absolute left-7 top-[42%] flex -translate-y-1/2 flex-col items-start gap-1 text-left text-[11px] tracking-[.2em] text-white"><strong className="font-normal">{engraving[0]}</strong>{engraving[1] && <span>{engraving[1]}</span>}{engraving[2] && <span>{engraving[2]}</span>}</div></div><div className="mt-9 space-y-4">{["To / Title", "From (optional)", "Date (optional)"].map((label, i) => <label key={label} className="block"><span className="eyebrow">{label}</span><input aria-label={`Card ${label}`} maxLength={22} value={engraving[i] ?? ""} onChange={(e) => updateEngraving(i, e.target.value)} className="mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-sm tracking-widest outline-none focus:border-accent" /></label>)}</div><div className="mt-10">{nextButton("Create My Keep", () => engraving[0]?.trim() && go("success"), !engraving[0]?.trim())}</div><p className="mt-3 text-center text-[11px] text-muted-foreground">Only To / Title is required. Physical cards are coming next.</p></div></>}
    {screen === "success" && <div className="flex keep-min-screen flex-col justify-between px-7 pb-10 pt-10"><span className="brand">KEEP</span><div className="py-12"><div className="mb-10 flex size-13 items-center justify-center rounded-full border border-accent text-accent"><Check /></div>{title("", "Your Keep is ready.")}<button type="button" className="card-object relative mt-12 block aspect-[1.586] w-full overflow-hidden rounded-lg border border-foreground/10 p-7 text-left text-white" onClick={() => setCardBack(!cardBack)} aria-label={cardBack ? "View front of keepsake card" : "View back of keepsake card"}>{!cardBack ? <><span className="brand absolute left-7 top-7 text-lg text-white">KEEP</span><div className="absolute left-7 top-[42%] flex -translate-y-1/2 flex-col items-start gap-1 text-left text-[11px] tracking-[.2em] text-white"><span>{engraving[0]}</span>{engraving[1] && <span>{engraving[1]}</span>}{engraving[2] && <span>{engraving[2]}</span>}</div></> : <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 px-7 text-center text-[11px] font-normal tracking-[.2em] text-white"><span>SOME THINGS ARE WORTH KEEPING.</span><Radio className="size-4 stroke-[1.5]" aria-hidden="true" /></div>}</button><Button variant="bare" className="mx-auto mt-3 flex h-auto items-center gap-2 px-3 py-2 text-xs text-muted-foreground" onClick={() => setCardBack(!cardBack)}>{cardBack ? "View front" : "View back"} <RotateCcw className="size-3.5" /></Button><p className="mt-2 text-xs text-muted-foreground">Card #000001 · {engraving[0]}{engraving[1] ? ` · ${engraving[1].toLowerCase()}` : ""}{engraving[2] ? ` · ${engraving[2]}` : ""}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Physical card ordering is coming next. No card has been ordered or shipped.</p></div><div className="space-y-3"><Button variant="keep" size="touch" className="w-full justify-between" asChild><Link to="/recipient" search={{ name: (name || engraving[0] || "Hanna").trim(), from: engraving[1]?.replace(/^FROM\\s+/i, "") || "Alex", year: engraving[2] || "2026" }}>Preview recipient experience <ArrowRight /></Link></Button><Button variant="quiet" size="touch" className="w-full" onClick={home}>Back to Keeps</Button></div></div>}
  </div>{primaryNav && <nav aria-label="Main navigation" className="nav-bottom fixed bottom-0 left-1/2 z-20 w-full max-w-[540px] -translate-x-1/2 flex h-[82px] border-t border-border bg-background/95 backdrop-blur-xl"><Button variant="bare" className={`h-16 flex-1 flex-col gap-1 text-[11px] ${screen === "home" ? "text-accent" : "text-muted-foreground"}`} onClick={home}><Images className="size-5" />Keeps</Button><Button variant="bare" className="h-16 flex-1 flex-col gap-1 text-[11px] text-muted-foreground" onClick={() => (project.active ? continueDraft() : begin())}><Plus className="size-5" />Create</Button><Button variant="bare" className={`h-16 flex-1 flex-col gap-1 text-[11px] ${screen === "you" ? "text-accent" : "text-muted-foreground"}`} onClick={() => go("you")}><span className="flex size-5 items-center justify-center rounded-full border text-[10px]">A</span>You</Button></nav>}</main>;
}
