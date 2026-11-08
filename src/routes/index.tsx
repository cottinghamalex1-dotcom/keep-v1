import { KeepAccountButton } from "@/components/keep-account-button";
import { KeepPublishPanel } from "@/components/keep-publish-panel";
import { KeepTimeline } from "@/components/keep-timeline";
import { arrangeWords, spreadMemories, recommendedStyle } from "@/lib/keep-story-layout";
import { activeKeepSession, loadEditableKeep, loadCloudDraft, saveCloudDraft, removeCloudDraft } from "@/lib/keep-cloud";
import { CinematicMedia } from "@/components/cinematic-media";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Ellipsis, GripVertical, Images, LockKeyhole, MessageCircle, Mic, Music2, FileUp, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Square, Trash2, Undo2, Redo2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, memoryLabels } from "@/components/keep-player";
import { KeepRecipientExperience, type KeepExperienceMode } from "@/components/keep-recipient-experience";
import { KeepErrorBoundary } from "@/components/keep-error-boundary";
import { useRecorder } from "@/hooks/use-recorder";
import { deleteBlobs, getBlob, putBlob } from "@/lib/keep-media-store";
import { createKeepVoiceMix, playMusicSample, stopMusicSample, type MusicBalance } from "@/lib/keep-audio";
import { fetchDraft, fetchNextQuestion, fetchRevision, keepAiAvailable, transcribeAudio, transcribeTimedAudio, type TimedWord } from "@/lib/keep-ai";
import { fmt, hydrateDraftMedia, loadDraft, newId, newProject, projectBlobIds, projectObjectUrls, sampleMemories, saveDraft, stageLabels, defaultAudioMix, type AudioMix, type CaptionCue, type InterviewAnswer, type KeepProject, type MediaItem } from "@/lib/keep-project";

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

type Screen = "home" | "you" | "detail" | "recipient" | "occasion" | "intent" | "path" | "interview" | "summary" | "messageGenerating" | "write" | "message" | "recordPrep" | "record" | "recorded" | "memories" | "storyStyle" | "generating" | "editor" | "preview" | "recipientReveal" | "recipientPreview" | "giveReady" | "card" | "success";
type Mode = "Memories" | "Music" | "Captions" | "Style" | "Voice";
const creationScreens: Screen[] = ["recipient", "occasion", "intent", "path", "interview", "summary", "messageGenerating", "write", "message", "recordPrep", "record", "recorded", "memories", "storyStyle", "generating", "editor", "preview", "recipientPreview", "card", "success"];
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
  { name: "Worth Keeping", note: "Original 60-second KEEP demo · warm piano and strings", group: "For You" },
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
const groupTimedWords = (words: TimedWord[], limit = 5): CaptionCue[] => {
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
    if (group.length >= limit || (limit > 2 && /[.!?]$/.test(word.word))) flush();
  }
  flush();
  return cues;
};

const EDIT_KEYS = ["memories", "captionCues", "captionStyle", "visualStyle", "musicMood", "voiceMusicBalance", "voiceVolume", "musicVolume", "captionPosition", "captionLines", "captionWordsPerCue", "audioMix"] as const;
type EditSnapshot = Pick<KeepProject, (typeof EDIT_KEYS)[number]>;
const takeSnapshot = (p: KeepProject): EditSnapshot => Object.fromEntries(EDIT_KEYS.map((k) => [k, p[k]])) as EditSnapshot;
const sameSnapshot = (a: EditSnapshot, b: EditSnapshot) => EDIT_KEYS.every((k) => a[k] === b[k]);
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
  const [cloudSyncAllowed, setCloudSyncAllowed] = useState(true);
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
  const [resumeError, setResumeError] = useState("");
  const [editorPanel, setEditorPanel] = useState<Mode | null>(null);
  const [previewChooserOpen, setPreviewChooserOpen] = useState(false);
  const [creatorPreviewMode, setCreatorPreviewMode] = useState<KeepExperienceMode | null>(null);
  const [readArrangeOpen, setReadArrangeOpen] = useState(false);
  const [readArrangeIndex, setReadArrangeIndex] = useState(0);
  const [returnToEditorAfterRecording, setReturnToEditorAfterRecording] = useState(false);
  const [frame, setFrame] = useState(0);
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorTime, setEditorTime] = useState(0);
  const editorAudioRef = useRef<HTMLAudioElement>(null);
  const editorMixRef = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
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
  const mix: AudioMix = { ...defaultAudioMix, ...project.audioMix };
  const patchMix = (m: Partial<AudioMix>) => setProject((o) => ({ ...o, audioMix: { ...defaultAudioMix, ...o.audioMix, ...m } }));
  // Editor undo/redo: snapshots of editable fields, committed after edits settle (350ms),
  // so a slider drag becomes one undo step. Media blobs are never deleted while editing,
  // so undoing a removal always restores a working photo/video.
  const undoPast = useRef<EditSnapshot[]>([]);
  const undoFuture = useRef<EditSnapshot[]>([]);
  const undoLast = useRef<EditSnapshot | null>(null);
  const [, setUndoVersion] = useState(0);
  const name = project.recipientName;
  const q = project.questionIndex;

  // Hydrate local media first, then prefer the authenticated account's cloud draft.
  // Do not autosave until hydration is finished; that would overwrite the remote draft.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get("edit");
      const resumeRequested = params.get("resume") === "1" || !!editId;
      const local = loadDraft();
      let next = local;
      try {
        const session = await activeKeepSession();
        if (session) {
          const remote = editId ? await loadEditableKeep(editId, session) : await loadCloudDraft(session);
          if (remote) next = remote;
          else if (local?.active) {
            // Never silently attach an unclaimed device draft to a different account.
            if (true) {
              // Never block the editor behind large iPhone photo/video uploads.
              // Show the local draft immediately and import in the background.
              setCloudSyncAllowed(false);
              const hydratedLocal = { ...local, ...await hydrateDraftMedia(local) };
              next = hydratedLocal;
              const importToast = toast.loading("Importing your draft to Keep. You can keep editing while it uploads.");
              void saveCloudDraft(hydratedLocal, session).then(() => {
                if (cancelled) return;
                setCloudSyncAllowed(true);
                toast.success("Your draft was imported to your account.", { id: importToast });
              }).catch((error) => {
                if (cancelled) return;
                toast.error("Import couldn't finish: " + (error instanceof Error ? error.message : "Please try again"), { id: importToast, duration: 10000 });
                // Preserve the device draft and prevent incomplete cloud overwrites.
                setCloudSyncAllowed(false);
              });
            } else next = newProject();
          } else next = newProject();
        } else if (resumeRequested) {
          throw new Error("Please sign in to your Keep account to continue editing.");
        }
      } catch (error) {
        if (resumeRequested) { if (!cancelled) setResumeError(error instanceof Error ? error.message : "Your Keep could not be restored. Please try again."); return; }
        toast.error(error instanceof Error ? error.message : "Cloud draft unavailable; showing this device's draft.");
      }
      if (cancelled) return;
      const usingLocal = next === local;
      if (next) {
        next = { ...next, publicationId: next.publicationId || crypto.randomUUID() };
        if (usingLocal) next = { ...next, ...await hydrateDraftMedia(next) };
        if (cancelled) return;
        setProject(next);
      }
      if (resumeRequested) {
        if (!next?.active) { setResumeError("There isn't a saved draft to continue yet."); return; }
        const stage = next.memories.length ? "editor" : resumeScreen(next.stage as Screen);
        setHistory([]);
        setScreen(creationScreens.includes(stage) ? stage : "recipient");
        setHydrated(true);
        return;
      }
      const createRequested = params.get("create") === "1";
      const canCreate = createRequested && (!next?.active || window.confirm("Start a new Keep? Your current draft will be replaced."));
      if (canCreate) { setProject({ ...newProject(), publicationId: crypto.randomUUID(), active: true, stage: "recipient" }); window.history.replaceState(null, "", "/"); }
      setHistory(canCreate ? ["home"] : []);
      if (!canCreate) { window.location.replace("/app"); return; }
      setScreen("recipient");
      setHydrated(true);
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    saveDraft(project);
    if (!cloudSyncAllowed) return;
    const timer = window.setTimeout(async () => {
      try {
        const session = await activeKeepSession();
        if (!session) return;
        if (project.active) await saveCloudDraft(project,session);
        else await removeCloudDraft(session);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Cloud sync failed. This device still has your draft.");
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [project, hydrated, cloudSyncAllowed]);
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
  const back = () => { const last = history[history.length - 1]; if (!last || last === "home") { window.location.assign("/app"); return; } setScreen(last); setHistory((h) => h.slice(0, -1)); resetPageScroll(); };
  const home = () => { window.location.assign("/app"); };
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
      const cues = groupTimedWords(timed.words, project.captionWordsPerCue ?? 5);
      if (!cues.length) throw new Error("No timestamped words returned");
      setProject((o) => ({ ...o, captionTranscript: timed.transcript, captionWords: timed.words, captionCues: cues }));
    } catch {
      setCaptionSyncError(true);
      toast.error("Caption syncing failed. You can retry from the editor without recording again.");
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
      captionWords: [],
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
  useEffect(() => {
    if (screen !== "editor" && screen !== "recorded") return;
    if (!rec?.audioUrl || rec.demo || project.captionCues.length || captionSyncing || captionSyncError) return;
    void retryCaptionSync();
  }, [screen, rec?.audioUrl, rec?.demo, project.captionCues.length, captionSyncing, captionSyncError]);

  const useDemoRecording = () => {
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    patch({ finalVoiceRecording: { durationSec: 237, demo: true }, captionTranscript: "", captionCues: [], captionWords: [] });
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
  const [styleTouched, setStyleTouched] = useState(false);
  const personalMedia = project.memories.filter((m) => m.source !== "text");
  // Narration-first photo guidance: use the real voice recording when available,
  // otherwise estimate speaking time from the current message (~140 words/minute).
  const narrationWordCount = project.messageParagraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const estimatedNarrationSec = narrationWordCount ? Math.max(1, Math.round(narrationWordCount / 140 * 60)) : 0;
  const recordedNarrationSec = rec && !rec.demo && rec.durationSec > 0 ? rec.durationSec : 0;
  const guidanceSeconds = recordedNarrationSec || estimatedNarrationSec;
  const minRecommendedMoments = guidanceSeconds ? Math.ceil(guidanceSeconds / 5) : 0;
  const maxRecommendedMoments = guidanceSeconds ? Math.ceil(guidanceSeconds / 3) : 0;
  const idealRecommendedMoments = guidanceSeconds ? Math.round(guidanceSeconds / 4) : 0;
  const narrationLengthText = guidanceSeconds ? (guidanceSeconds < 60 ? `${Math.round(guidanceSeconds)} seconds` : `${Math.floor(guidanceSeconds / 60)} min${Math.round(guidanceSeconds % 60) ? ` ${Math.round(guidanceSeconds % 60)} sec` : ""}`) : "";

  const suggestedStyle = recommendedStyle(personalMedia.length, rec?.durationSec ?? 180);
  const chosenStyle = styleTouched ? (project.creationStyle ?? "memories") : suggestedStyle;
  const createStory = () => {
    const duration = rec?.durationSec ?? 180;
    const media = chosenStyle === "memories" && personalMedia.length
      ? spreadMemories(personalMedia, duration)
      : arrangeWords(personalMedia, project.messageParagraphs, duration);
    patch({ memories: media, creationStyle: chosenStyle });
    setFrame(0);
    setGeneration(0);
    go("generating");
  };
  const frames = project.memories;
  const shown = frames.length ? frames : sampleMemories();
  const selected = shown[frame % shown.length];
  const photoDrag = useRef<{ x: number; y: number; focusX: number; focusY: number; width: number; height: number } | null>(null);
  const updateSelectedMoment = (changes: Partial<MediaItem>) => setProject((prev) => {
    const moments = prev.memories.length ? prev.memories : sampleMemories();
    return { ...prev, memories: moments.map((m, i) => i === frame % moments.length ? { ...m, ...changes } : m) };
  });
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
      items.push({ id, kind, source: "upload", url: URL.createObjectURL(f), name: f.name, mimeType: f.type, persisted, displayDurationSec: 7 });
    }
    setBusy(false);
    if (!items.length) { toast.error("Those files aren't photos or videos."); return; }
    if (replaceIndex !== undefined) {
      patch({ memories: frames.length ? frames.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition } : m)) : shown.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: m.displayDurationSec ?? 4 } : m)) });
      toast.success("Memory replaced");
    } else {
      patch({ memories: [...frames, ...items] });
      toast.success(`${items.length} ${items.length === 1 ? "memory" : "memories"} added`);
    }
  };
  const removeMemory = (i: number) => {
    const list = frames.length ? frames : shown;
    // Blob and object URL are kept so Undo can bring this moment back.
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
  const duplicateMoment = async (index:number, firstDuration?:number, secondDuration?:number) => {
    const item = shown[index];
    if (!item) return;
    const id = newId("media");
    let persisted = item.persisted;
    let url = item.url;
    if (item.source === "upload") {
      const blob = await getBlob(item.id);
      if (!blob) { toast.error("The original photo is missing. Please re-add it."); return; }
      persisted = await putBlob(id,blob);
      url = URL.createObjectURL(blob);
    }
    const copy:MediaItem = {...item,id,url,persisted,displayDurationSec:secondDuration??item.displayDurationSec};
    const list = [...shown];
    if(firstDuration!==undefined) list[index]={...item,displayDurationSec:firstDuration};
    list.splice(index+1,0,copy);
    patch({memories:list});
    setFrame(index+1);
    toast.success(firstDuration!==undefined?"Moment split into two clips.":"Moment duplicated.");
  };
  const splitMoment = (index:number, at:number) => {
    const duration = shown[index]?.displayDurationSec??7;
    if(at<1||duration-at<1){toast.error("Move the playhead inside the clip to split it.");return;}
    void duplicateMoment(index,Math.round(at*2)/2,Math.round((duration-at)*2)/2);
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
      await playMusicSample(trackName, trackName === "Worth Keeping" ? 60 : 9);
      musicSampleTimer.current = window.setTimeout(() => {
        setMusicSampling("");
        musicSampleTimer.current = null;
      }, trackName === "Worth Keeping" ? 60000 : 9000);
    } catch {
      setMusicSampling("");
      toast.error("Music preview isn't available in this browser.");
    }
  };

  useEffect(() => { if (screen !== "generating") return; if (generation >= 3) { const t = window.setTimeout(() => go("editor"), 650); return () => window.clearTimeout(t); } const t = window.setTimeout(() => setGeneration((n) => n + 1), 1250); return () => window.clearTimeout(t); }, [screen, generation]);
  const captionLines = project.messageParagraphs.map((p) => (p.split(/(?<=[.!?])\s/)[0] ?? p).trim()).filter(Boolean).slice(0, 8);
  // The recorded voice is the editor's master clock. Photo timing and captions follow it.
  const editorDuration = Math.max(rec?.durationSec ?? 0, shown.reduce((sum, item) => sum + Math.max(1, item.displayDurationSec ?? 7), 0), 1);
  const editorMediaTotal = shown.reduce((sum, item) => sum + Math.max(1, item.displayDurationSec ?? 4), 0);
  const editorSceneAt = (time: number) => {
    if (!shown.length || !editorMediaTotal) return 0;
    const position = Math.min(Math.max(time, 0), editorMediaTotal - 0.000001);
    let elapsed = 0;
    for (let i = 0; i < shown.length; i++) {
      elapsed += Math.max(1, shown[i]?.displayDurationSec ?? 4);
      if (position < elapsed) return i;
    }
    return shown.length - 1;
  };
  const editorCue = project.captionCues.find((cue) => editorTime >= cue.start && editorTime <= cue.end + 0.12);
  const editorCaption = editorCue?.text ?? (rec?.demo ? captionLines[Math.min(captionLines.length - 1, Math.floor(editorTime / Math.max(1, editorDuration / Math.max(1, captionLines.length))))] ?? "" : "");
  const seekEditor = (time: number) => {
    const next = Math.max(0, Math.min(editorDuration, time));
    // Seeking should not restart the soundtrack; that causes audible jumps and drift.
    if (editorAudioRef.current) editorAudioRef.current.currentTime = next;
    setEditorTime(next);
    setFrame(editorSceneAt(next));
  };
  // The editor and recipient player use the same voice-processing and music-mixing engine.
  // Keep one AudioContext per editor audio element; changing moods updates its backing track.
  useEffect(() => {
    if (screen !== "editor" || !rec?.audioUrl || rec.demo) return;
    const audio = editorAudioRef.current;
    if (!audio) return;
    let controller: ReturnType<typeof createKeepVoiceMix> = null;
    try {
      controller = createKeepVoiceMix(audio, project.musicMood, project.voiceMusicBalance as MusicBalance, rec.durationSec, 0.8, mix);
      editorMixRef.current = controller;
      controller?.setLevels(project.voiceVolume ?? 60, project.musicVolume ?? 60);
      if (controller) void controller.pause();
    } catch {
      toast.error("Music mixing is unavailable on this device. Voice playback will still work.");
    }
    return () => {
      audio.pause();
      if (editorMixRef.current === controller) editorMixRef.current = null;
      void controller?.stop();
    };
  }, [screen, rec?.audioUrl, rec?.demo, rec?.durationSec]);

  useEffect(() => {
    if (screen !== "editor" || !editorMixRef.current) return;
    editorMixRef.current.restartMusic(project.musicMood, project.voiceMusicBalance as MusicBalance, mix);
  }, [screen, project.musicMood, project.voiceMusicBalance, mix.fadeIn, mix.fadeOut, mix.ducking]);
  useEffect(() => { editorMixRef.current?.setTrackMutes(mix.voiceMuted, mix.musicMuted); }, [screen, mix.voiceMuted, mix.musicMuted]);
  useEffect(() => { editorMixRef.current?.setLevels(project.voiceVolume ?? 60, project.musicVolume ?? 60); }, [screen, project.voiceVolume, project.musicVolume]);

  useEffect(() => {
    if (screen !== "editor") { undoLast.current = null; return; }
    const snap = takeSnapshot(project);
    if (!undoLast.current) { undoLast.current = snap; return; }
    const t = window.setTimeout(() => {
      const last = undoLast.current;
      if (last && !sameSnapshot(last, snap)) {
        undoPast.current = [...undoPast.current.slice(-59), last];
        undoFuture.current = [];
        undoLast.current = snap;
        setUndoVersion((v) => v + 1);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [screen, ...EDIT_KEYS.map((k) => project[k])]);
  const stepHistory = (dir: "undo" | "redo") => {
    const from = dir === "undo" ? undoPast : undoFuture;
    const to = dir === "undo" ? undoFuture : undoPast;
    const target = from.current[from.current.length - 1];
    if (!target) return;
    from.current = from.current.slice(0, -1);
    to.current = [...to.current, takeSnapshot(project)];
    undoLast.current = target;
    setProject((o) => ({ ...o, ...target }));
    setUndoVersion((v) => v + 1);
  };
  useEffect(() => {
    if (screen !== "editor") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); stepHistory(e.shiftKey ? "redo" : "undo"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (screen !== "editor") return;
    const audio = editorAudioRef.current;
    if (!audio || !rec?.audioUrl || rec.demo) return;
    if (editorPlaying) {
      stopMusicSample();
      setMusicSampling("");
      void editorMixRef.current?.play().catch(() => undefined);
      void audio.play().catch(() => { setEditorPlaying(false); toast.error("Tap play again to enable audio."); });
    } else {
      audio.pause();
      void editorMixRef.current?.pause();
    }
    return () => audio.pause();
  }, [screen, editorPlaying, rec?.audioUrl, rec?.demo]);
  // One playback clock: recorded narration when present; otherwise a monotonic
  // animation-frame clock. The preview, playhead and captions read the same time.
  useEffect(() => {
    if (screen !== "editor" || !editorPlaying) return;
    let raf = 0;
    const audio = editorAudioRef.current;
    const voiceClock = !!(rec?.audioUrl && !rec.demo && audio);
    const started = performance.now();
    const initialTime = editorTime;
    const audioStart = audio?.currentTime ?? 0;
    const audioLength = rec?.durationSec ?? 0;
    const tick = (now: number) => {
      const elapsed = (now - started) / 1000;
      const audioTime = audio?.currentTime ?? 0;
      const useAudio = voiceClock && audioTime < audioLength - 0.05 && audioTime > audioStart + 0.005;
      const next = Math.min(editorDuration, useAudio ? audioTime : initialTime + elapsed);
      setEditorTime(next);
      if (next >= editorDuration) { setEditorPlaying(false); return; }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [screen, editorPlaying, rec?.audioUrl, rec?.demo, editorDuration]);
  useEffect(() => {
    if (screen === "editor" && editorPlaying) setFrame(editorSceneAt(editorTime));
  }, [screen, editorTime, editorPlaying, shown.length, editorDuration, editorMediaTotal]);

  const engraving = project.cardEngraving;
  const updateEngraving = (i: number, value: string) => patch({ cardEngraving: engraving.map((v, j) => (j === i ? value.toUpperCase() : v)) });
  const toCard = () => { if (!engraving[0]) patch({ cardEngraving: [(name || "Hanna").toUpperCase(), engraving[1] || "FROM ALEX", engraving[2] || "2026"] }); go("card"); };
  const totalSec = rec?.durationSec ?? 237;

  const title = (eyebrow: string, heading: string, sub?: string) => <div className="mb-10 keep-page-heading"><h1 className="keep-editorial-title">{heading}</h1>{sub && <p className="keep-page-description mt-5">{sub}</p>}</div>;
  const top = (_label?: string) => <header className="sticky top-0 z-30 flex h-[calc(4.25rem+env(safe-area-inset-top))] w-full min-w-0 items-center justify-between border-b border-border/50 bg-background/95 px-6 pt-[env(safe-area-inset-top)] backdrop-blur-sm"><Button variant="bare" size="icon" aria-label="Go back" onClick={back}><ArrowLeft /></Button><span className="keep-wordmark !text-[26px]">Keep</span>{accountLink}</header>;
  const nextButton = (label: string, action: () => void, disabled = false) => <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" onClick={action} disabled={disabled}>{label}<ArrowRight /></Button>;
  const wave = (count = 27, active = true) => <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden="true">{Array.from({ length: count }, (_, i) => <span key={i} className={`${active ? "wave-bar" : "opacity-40"} w-[2px] rounded-full bg-accent`} style={{ height: `${10 + ((i * 17) % 34)}px`, animationDelay: `${-(i % 7) * 0.13}s` }} />)}</div>;
  const note = (children: ReactNode) => <p className="text-center text-[11px] leading-5 text-muted-foreground">{children}</p>;
  const editorToolPanel = (heading: string, onClose: () => void, children: ReactNode) => <section className="keep-studio-panel" aria-label={heading}><div className="flex items-center justify-between"><h2 className="font-display text-2xl">{heading}</h2><Button variant="bare" size="icon" aria-label={`Close ${heading}`} onClick={onClose}><X /></Button></div>{children}</section>;
  const sheet = (heading: string, onClose: () => void, children: ReactNode) => <div className={`keep-fixed-screen fixed left-0 right-0 top-0 z-40 flex items-end justify-center ${heading === "Moments" ? "pointer-events-none bg-transparent" : "bg-background/80"}`} onClick={heading === "Moments" ? undefined : onClose}><div className={`keep-sheet-panel w-full max-w-[540px] overflow-y-auto rounded-t-lg bg-card px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-6 ${heading === "Moments" ? "pointer-events-auto max-h-[43dvh] border-t border-border shadow-2xl" : ""}`} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-display text-[30px]">{heading}</h2><Button variant="bare" size="icon" aria-label="Close" onClick={onClose}><X /></Button></div>{children}</div></div>;
  const micUnavailable = recorder.supported === false || recorder.status === "denied" || recorder.status === "error";
  const micMessage = recorder.supported === false ? "This browser can't record audio here." : recorder.status === "denied" ? "Microphone access was blocked. You can allow it in your browser settings." : recorder.status === "error" ? "The microphone couldn't start." : "";
  const isRecording = recorder.status === "recording" || recorder.status === "paused";
  const accountLink = <KeepAccountButton />;
  const fileInputs = <><input ref={draftInput} type="file" accept=".docx,.pdf,.txt,.md,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,application/rtf" className="sr-only" aria-label="Upload something you have already written" tabIndex={-1} onChange={(e) => void importDraft(e)} /><input ref={addInput} type="file" accept="image/*,video/*" multiple className="sr-only" aria-label="Choose photos and videos" tabIndex={-1} onChange={(e) => void addFiles(e)} /><input ref={replaceInput} type="file" accept="image/*,video/*" className="sr-only" aria-label="Choose a replacement photo or video" tabIndex={-1} onChange={(e) => void addFiles(e, frame % Math.max(1, shown.length))} /></>;

  if (resumeError) return <main className="app-shell p-8"><h1 className="font-display text-3xl">Unable to open this Keep</h1><p role="alert" className="my-6 text-sm">{resumeError}</p><Button onClick={() => window.location.reload()}>Try again</Button><a href="/app" className="ml-5 underline">Back to your creations</a></main>;
  if (!hydrated) return <main className="app-shell p-8"><p role="status">Opening your Keep…</p></main>;
  return <main className="app-shell">{fileInputs}<div key={screen} className="page-enter">
    {screen === "you" && <>{top()}<div className="px-7 pt-8">{title("Your space", "Alex.", "The things worth keeping, all in one place.")}<div className="mt-12 border-t border-border">{[{ label: "What is Keep?", Icon: Sparkles }, { label: "My cards", Icon: Radio }, { label: "Downloads & backups", Icon: Download }, { label: "Privacy", Icon: LockKeyhole }, { label: "Help", Icon: CircleHelp }].map(({ label, Icon }) => <Button key={label} variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal" onClick={() => (label === "What is KEEP?" ? window.location.assign("/about") : setSetting(label))}><span className="flex items-center gap-4"><Icon className="size-4 text-accent" />{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}{project.active && <Button variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal text-destructive" onClick={() => { if (!window.confirm("Delete your draft Keep? Recordings and photos added to it will be removed from this device.")) return; discard(project); setProject(newProject()); toast.success("Draft deleted"); }}><span className="flex items-center gap-4"><Trash2 className="size-4" />Delete draft Keep</span></Button>}</div><p className="mt-9 text-xs leading-6 text-muted-foreground">Your Keeps are private.</p></div>{setting && sheet(setting, () => setSetting(""), <><p className="mt-5 text-sm leading-7 text-muted-foreground">{setting === "Privacy" ? "Your Keeps are private by default. In this MVP, drafts, recordings and photos stay on this device only. Sharing a card gives its recipient access to that Keep — no account required." : setting === "My cards" ? "HANNA · from Alex · 2026 (sample). Physical card ordering is coming next." : setting === "Downloads & backups" ? "Your draft is saved on this device. Cloud backups and downloads aren't available yet." : "We're here when you need us. Support isn't connected in this preview yet."}</p><Button variant="quiet" className="mt-8 w-full" onClick={() => setSetting("")}>Done</Button></>)}</>}
    {screen === "detail" && <>{top("READY")}<div className="relative mx-4 h-[min(55dvh,520px)] overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-8 left-6"><p className="eyebrow text-foreground">ANNIVERSARY · 2026</p><h1 className="display mt-3 text-5xl">HANNA</h1><p className="mt-3 text-sm">from Alex · 3:57</p></div></div><div className="space-y-3 px-6 pt-7">{nextButton("Play Keep", () => { setViewingDemo(true); go("preview"); })}<Button variant="quiet" size="touch" className="w-full" onClick={editDemoCopy}><Settings2 /> Edit a copy</Button><Button variant="bare" size="touch" className="w-full" asChild><Link to="/recipient" search={{ keep: "" }}><Radio /> View as recipient</Link></Button></div></>}
    {screen === "recipient" && <>{top("01 / 04")}<div className="px-7 pt-11">{title("Begin with someone", "Who is this Keep for?")}<div className="grid grid-cols-2 gap-3" role="group" aria-label="Who is this Keep for?">{relationships.map((r) => <Button key={r} type="button" aria-pressed={project.relationship === r} variant="quiet" className={`keep-choice-bubble ${project.relationship === r ? "keep-choice-bubble--selected" : ""}`} onClick={() => { patch({ relationship: r, ...(r === "Myself" ? { recipientName: "Myself" } : project.relationship === "Myself" ? { recipientName: "" } : {}) }); if (r !== "Someone else") setOtherRelationship(""); }}><span className="min-w-0 flex-1 text-left">{r}</span>{project.relationship === r && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}</Button>)}</div>{project.relationship === "Someone else" && <div className="mt-8 page-enter"><label htmlFor="other-relationship" className="eyebrow">WHO ARE THEY TO YOU?</label><input id="other-relationship" value={otherRelationship} onChange={(e) => setOtherRelationship(e.target.value.slice(0, 50))} placeholder="My coach" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}{project.relationship && project.relationship !== "Myself" && <div className="mt-9 page-enter"><label htmlFor="recipient-name" className="eyebrow">NAME(S)</label><input id="recipient-name" value={name} onChange={(e) => patch({ recipientName: e.target.value.slice(0, 60) })} placeholder="Gigi & Pops" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}<div className="mt-10">{nextButton("Continue", () => { if (project.relationship === "Someone else") patch({ relationship: otherRelationship.trim() }); go("occasion"); }, !project.relationship || (project.relationship !== "Myself" && !name.trim()) || (project.relationship === "Someone else" && !otherRelationship.trim()))}</div></div></>}
    {screen === "occasion" && <>{top("02 / 04")}<div className="px-7 pt-11">{title("Give it a moment", "What are you keeping?", "Choose an occasion or moment.")}<div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose an occasion or moment">{occasions.map((o) => <Button key={o} type="button" aria-pressed={project.occasion === o} variant="quiet" className={`keep-choice-bubble ${project.occasion === o ? "keep-choice-bubble--selected" : ""}`} onClick={() => { patch({ occasion: o }); if (o !== "Other") setOtherOccasion(""); }}><span className="min-w-0 flex-1 text-left">{o}</span>{project.occasion === o && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}</Button>)}</div>{project.occasion === "Other" && <div className="mt-8 page-enter"><label className="eyebrow" htmlFor="other-occasion">TELL US WHAT IT'S FOR</label><input id="other-occasion" value={otherOccasion} onChange={(e) => setOtherOccasion(e.target.value.slice(0, 80))} placeholder="Our family Disney trip with Gigi & Pops" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}<div className="mt-12">{nextButton("Continue", () => { if (project.occasion === "Other") patch({ occasion: otherOccasion.trim() }); go("intent"); }, project.occasion === "Other" && !otherOccasion.trim())}</div></div></>}
    {screen === "intent" && <>{top("03 / 04")}<div className="px-7 pt-11">{title("The reason behind it", "Why does this Keep matter to you?", "What would you like them to remember?")}<textarea value={project.intent} onChange={(e) => patch({ intent: e.target.value.slice(0, 500) })} placeholder="I want Gigi & Pops to know how special it was watching them experience Disney through our kids' eyes, and I want our family to always remember this trip together." className="min-h-44 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-7 outline-none focus:border-accent" /><div className="mt-4 grid grid-cols-2 gap-2"><Button variant={dictating && dictationTargetRef.current === "intent" ? "selected" : "quiet"} className="h-12" onClick={() => toggleDictation("intent")}>{dictating && dictationTargetRef.current === "intent" ? <Square className="mr-2 size-4" fill="currentColor" /> : <Mic className="mr-2 size-4" />}{dictating && dictationTargetRef.current === "intent" ? "Stop" : "Speak"}</Button><Button variant="quiet" className="h-12" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()}>Type</Button></div>{dictating && dictationTargetRef.current === "intent" && <p className="mt-3 text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear above as you talk. Tap Stop when you're finished.</p>}<div className="mt-10">{nextButton("Continue", () => go("path"), !project.intent.trim())}</div></div></>}
    {screen === "path" && <>{top("04 / 04")}<div className="px-7 pt-11">{title("The heart of it", "What do you want to say?")}<div className="space-y-3"><Button variant="quiet" className="keep-editorial-surface h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={startInterview}><span><Sparkles className="mb-7 size-6 text-accent" /><strong className="block font-display text-3xl font-normal">Help me find the words</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">A few thoughtful questions to guide you.</small></span><ArrowRight className="mt-1 size-4" /></Button><Button variant="quiet" className="h-auto w-full items-start justify-between gap-5 p-6 text-left whitespace-normal" onClick={() => go("write")}><span><span className="mb-7 block font-display text-3xl text-accent">“</span><strong className="block whitespace-nowrap font-display text-[clamp(25px,7vw,30px)] font-normal">I know what I want to say</strong><small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">Speak, type, or upload your words.</small></span><ArrowRight className="mt-1 size-4" /></Button></div></div></>}
    {screen === "interview" && <div className="flex keep-h-screen min-h-0 flex-col px-7 pb-[max(28px,env(safe-area-inset-bottom))]">{top()}<div className="mt-4"><p className="eyebrow">GETTING TO KNOW YOUR STORY…</p><div className="mt-4 flex items-center gap-1.5" aria-label={`${completedAnswers} ${completedAnswers === 1 ? "answer" : "answers"} shared`}>{Array.from({ length: completedAnswers }, (_, i) => <span key={i} className="h-[2px] w-6 bg-accent page-enter" />)}<span className="h-[2px] w-6 animate-pulse bg-accent/50" /><span className="h-[2px] flex-1 bg-border" /></div></div>
      <div className="thin-scroll flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-6 text-center">
      {!aiReady ? <div className="page-enter"><span className="mb-8 block font-display text-6xl text-accent">“</span><h1 className="font-display text-[clamp(27px,7vw,35px)] leading-[1.15]">KEEP's guided interview is taking a short rest.</h1><p className="mx-auto mt-5 max-w-xs text-sm leading-7 text-muted-foreground">It's temporarily unavailable. You can still write your message in your own words.</p></div>
      : aiBusy === "start" || aiBusy === "next" ? <div className="page-enter">{wave(21, true)}<p className="mt-6 font-display text-2xl text-foreground/85">{aiBusy === "start" ? "Getting ready to listen…" : "Thinking…"}</p></div>
      : !project.interviewQuestion ? <div className="page-enter"><p className="font-display text-2xl text-foreground/85">{aiError ? aiErrorText : "Getting ready to listen…"}</p></div>
      : <><span className="mb-8 font-display text-6xl text-accent">“</span><h1 key={q} className="font-display text-[clamp(29px,7vw,38px)] leading-[1.09] page-enter">{project.interviewQuestion}</h1>
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
      <span className="brand relative z-10">Keep</span>
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
    {screen === "message" && <>{top("04 / 04")}<div className="px-7 pb-32 pt-9">{title(project.messageSource === "own" ? "In your own words" : project.messageSource === "ai" ? "Shaped from your story" : "Demo generation", project.messageSource === "own" ? "Your message." : "Your message is ready.", "Tap any paragraph to make it yours.")}<div className="space-y-1">{project.messageParagraphs.map((p, i) => <textarea key={i} aria-label={`Message paragraph ${i + 1}`} rows={Math.max(3, Math.ceil(p.length / 44))} value={p} onFocus={() => setActiveParagraph(i)} onChange={(e) => patch({ messageParagraphs: project.messageParagraphs.map((item, j) => (j === i ? e.target.value : item)) })} className={`w-full resize-none rounded-sm border bg-transparent p-3 font-display text-[23px] leading-[1.3] outline-none transition-colors ${activeParagraph === i ? "border-accent/50" : "border-transparent"}`} />)}</div><Button variant="bare" size="sm" className="mt-2 text-muted-foreground" onClick={() => { patch({ messageParagraphs: [...project.messageParagraphs, ""] }); setActiveParagraph(project.messageParagraphs.length); }}><Plus /> Add paragraph</Button><Button variant="quiet" size="touch" className="mt-5 w-full" onClick={openAskKeep}><Sparkles /> Ask Keep</Button><div className="mt-3">{nextButton("Record Your Keep", () => { patch({ messageParagraphs: project.messageParagraphs.filter((p) => p.trim()) }); go("recordPrep"); }, !project.messageParagraphs.some((p) => p.trim()))}</div></div>
      {askOpen && sheet("Ask Keep", () => { if (!askBusy) { setAskOpen(false); setAskSuggestion(null); setAskError(""); } }, askSuggestion ? <>
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
          ].map(([prompt, note]) => <Button key={prompt} variant="bare" disabled={askBusy} className="flex h-auto min-h-16 w-full items-center justify-between border-t border-border px-0 py-3 text-left font-normal whitespace-normal" onClick={() => void askKeep(prompt ?? "", "message")}><span className="pr-4"><span className="block">{prompt}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{note}</span></span><ArrowRight className="size-4 shrink-0 text-accent" /></Button>)}

          <div className="mt-5 border-t border-border pt-5">
            <label htmlFor="ask-keep-whole-custom" className="eyebrow">TELL KEEP WHAT YOU WANT</label>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Describe how you want KEEP to reshape the entire message.</p>
            <textarea id="ask-keep-whole-custom" value={askPrompt} onChange={(e) => setAskPrompt(e.target.value.slice(0, 500))} placeholder="Make this warmer and more conversational. Spend more time on what this relationship has meant to me…" rows={4} className="mt-3 min-h-28 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-6 outline-none focus:border-accent" />
            <Button variant="keep" size="touch" className="mt-3 w-full justify-between" disabled={askBusy || !askPrompt.trim()} onClick={() => void askKeep(askPrompt, "message")}>Ask Keep<Sparkles /></Button>
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
    {screen === "memories" && <>{top()}<div className="px-7 pb-10 pt-9">
      {title("YOUR MOMENTS", "Add photos & videos.", "Choose the moments that bring your story to life.")}
      <div className="keep-editorial-surface mb-7 px-5 py-5" aria-live="polite">
        <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-medium uppercase tracking-[.14em] text-[#6A5849]">Suggested moments</p>{guidanceSeconds > 0 && <span className="text-[11px] text-muted-foreground">{narrationLengthText}</span>}</div>
        {guidanceSeconds > 0 ? <>
          <p className="mt-3 font-display text-[33px] leading-none text-foreground">{minRecommendedMoments}–{maxRecommendedMoments} <span className="text-[23px]">photos or videos</span></p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">We suggest about one photo or video every 3–5 seconds of narration. {recordedNarrationSec ? "This is based on your recording." : "This is estimated from your message length."} Around {idealRecommendedMoments} is a great starting point.</p>
          <p className="mt-3 text-xs text-[#6A5849]">{personalMedia.length} added{personalMedia.length >= minRecommendedMoments && personalMedia.length <= maxRecommendedMoments ? " · In the suggested range" : personalMedia.length < minRecommendedMoments ? ` · ${minRecommendedMoments - personalMedia.length} more to reach the range` : " · More than suggested is okay"}</p>
        </> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Add a message or record your voice to see a personalized photo recommendation. Most stories work well with a new moment every 3–5 seconds.</p>}
        <p className="mt-3 border-t border-border/50 pt-3 text-[11px] leading-5 text-muted-foreground">Just a guide — use as many or as few moments as you'd like. You can always add more later.</p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {personalMedia.map((m, i) => <div key={m.id} className="relative aspect-square overflow-hidden bg-card"><MediaView item={m} thumb alt={m.name ?? "Your memory"} className="h-full w-full object-cover" /><button type="button" aria-label={"Remove memory " + (i+1)} onClick={() => removeMemory(i)} className="absolute right-1 top-1 rounded-full bg-black/70 p-2 text-white"><X className="size-4" /></button></div>)}
        <button type="button" onClick={() => addInput.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-2 border border-border text-xs text-muted-foreground"><Plus className="size-5" />{busy ? "Adding…" : "Add media"}</button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{personalMedia.length} personal moments added</p>
      <div className="mt-10">{nextButton("Continue", () => { setStyleTouched(false); go("storyStyle"); })}</div>
      <Button variant="bare" size="touch" className="mt-3 w-full text-muted-foreground" onClick={() => { setStyleTouched(false); go("storyStyle"); }}>Continue without more photos</Button>
    </div></>}
    {screen === "storyStyle" && <>{top()}<div className="px-7 pb-10 pt-9">
      {title("YOUR STORY", "How should it come to life?", "Both include your voice, music, captions and personal moments.")}
      <div className="space-y-3">
        <button type="button" onClick={() => { setStyleTouched(true); patch({ creationStyle: "memories" }); }} className={`w-full rounded-lg border p-5 text-left ${chosenStyle === "memories" ? "border-accent bg-accent/5" : "border-border"}`}>
          <span className="flex items-center justify-between text-sm">Memories First {chosenStyle === "memories" && <Check className="size-4 text-accent" />}</span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">Let your photos and videos tell the story from beginning to end.</span>
          {suggestedStyle === "memories" && <span className="mt-3 block text-[10px] uppercase tracking-widest text-accent">Recommended</span>}
        </button>
        <button type="button" onClick={() => { setStyleTouched(true); patch({ creationStyle: "words" }); }} className={`w-full rounded-lg border p-5 text-left ${chosenStyle === "words" ? "border-accent bg-accent/5" : "border-border"}`}>
          <span className="flex items-center justify-between text-sm">Words First {chosenStyle === "words" && <Check className="size-4 text-accent" />}</span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">Your voice and meaningful words lead, with your photos at special moments.</span>
          {suggestedStyle === "words" && <span className="mt-3 block text-[10px] uppercase tracking-widest text-accent">Recommended for your media</span>}
        </button>
      </div>
      <div className="mt-10">{nextButton("Create My Keep", createStory)}</div>
    </div></>}
    {screen === "generating" && <div className="flex keep-h-screen flex-col items-center justify-center px-8 text-center"><div className="relative mb-14 flex size-30 items-center justify-center"><div className="pulse-ring absolute inset-0 rounded-full border border-accent" /><Sparkles className="size-8 text-accent" /></div><h1 key={generation} className="display min-h-32 text-5xl page-enter">{["Listening to your story…", "Finding the moments that fit…", "Building your Keep…", "Almost there…"][generation]}</h1><p className="mt-8 text-xs text-muted-foreground">MVP preview · memories are arranged in the order you added them</p></div>}
    {screen === "editor" && selected && <div className="keep-studio">
      <div className="flex items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))]">
        <Button variant="bare" size="icon" aria-label="Back" onClick={back}><ArrowLeft /></Button>
        <div className="flex items-center gap-1">
          <Button variant="bare" size="icon" aria-label="Undo" disabled={!undoPast.current.length} onClick={() => stepHistory("undo")}><Undo2 className="size-4" /></Button>
          <Button variant="bare" size="icon" aria-label="Redo" disabled={!undoFuture.current.length} onClick={() => stepHistory("redo")}><Redo2 className="size-4" /></Button>
          <Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => { setViewingDemo(false); setPreviewChooserOpen(true); setReadArrangeOpen(false); }}><Play className="size-4" /> Review</Button>
          <Button variant="keep" size="sm" onClick={toCard}>Done <Check className="size-4" /></Button>
        </div>
      </div>

      {rec?.audioUrl && !rec.demo && <audio ref={editorAudioRef} src={rec.audioUrl} preload="metadata" onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; setEditorTime(time); setFrame(editorSceneAt(time)); }} onEnded={() => { if (editorDuration <= (rec?.durationSec ?? 0) + 0.1) { setEditorPlaying(false); setEditorTime(editorDuration); } }} />}
      <div className="keep-studio-stage">
        <div className="keep-studio-canvas-wrap">
          <div className="keep-studio-canvas relative aspect-[9/16] overflow-hidden rounded-2xl bg-card shadow-lg">
            <CinematicMedia item={selected} playing={editorPlaying} duration={Math.max(5, selected.displayDurationSec ?? 7)} className="absolute inset-0" imageClassName={`editor-image-${styleSlug(project.visualStyle)}`} />
            <div className="absolute inset-0 photo-shade" />
            {editorPanel === "Memories" && <div className="absolute inset-x-0 top-0 bottom-14 z-20 cursor-grab touch-none active:cursor-grabbing" aria-label="Drag photo to reposition" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); photoDrag.current = { x: e.clientX, y: e.clientY, focusX: selected.focusX ?? 50, focusY: selected.focusY ?? 50, width: r.width, height: r.height }; setEditorPlaying(false); }} onPointerMove={(e) => { const d = photoDrag.current; if (!d) return; updateSelectedMoment({ focusX: Math.max(0, Math.min(100, d.focusX - (e.clientX - d.x) / d.width * 100)), focusY: Math.max(0, Math.min(100, d.focusY - (e.clientY - d.y) / d.height * 100)) }); }} onPointerUp={() => { photoDrag.current = null; }} onPointerCancel={() => { photoDrag.current = null; }}><span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1 text-[10px] text-white">Drag photo to reposition</span></div>}

            {project.captionStyle !== "None" && editorCaption && <div className={`absolute left-5 right-5 text-center ${project.captionPosition === "top" ? "top-16" : project.captionPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-16"}`}>
              <p className={`${project.captionStyle === "Film" ? "font-display text-3xl font-normal" : project.captionStyle === "Minimal" ? "text-sm" : project.captionStyle === "Story" ? "font-display text-2xl italic" : project.captionStyle === "Clean" ? "text-sm font-medium" : "text-lg font-semibold"} leading-tight drop-shadow-md`} style={{ maxWidth: (project.captionLines ?? 2) === 1 ? "95%" : (project.captionLines ?? 2) === 3 ? "65%" : "80%", marginInline: "auto", whiteSpace: "pre-line" }}>
                {editorCaption}
              </p>
            </div>}

            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-black/45 px-2 py-1 backdrop-blur">
              <Button variant="bare" size="icon" className="size-8 bg-black/25 backdrop-blur" aria-label={editorPlaying ? "Pause preview" : "Play preview"} onClick={() => { if (editorTime >= editorDuration - 0.1) seekEditor(0); setEditorPlaying(!editorPlaying); }}>{editorPlaying ? <Pause className="size-3.5" fill="currentColor" /> : <Play className="size-3.5" fill="currentColor" />}</Button>
              <input type="range" min={0} max={editorDuration} step={0.1} value={Math.min(editorTime, editorDuration)} aria-label="Seek Keep playback" onChange={(e) => seekEditor(Number(e.target.value))} className="h-5 min-w-0 flex-1 accent-white" />
              <span className="text-[9px] tabular-nums">{fmt(editorTime)} / {fmt(editorDuration)}</span>
            </div>
          </div>


        </div>
      </div>

      <div className="keep-studio-workspace" key={editorPanel ?? "timeline"}>
      {!rec?.demo && rec?.audioUrl && project.captionStyle !== "None" && !project.captionCues.length && <div className="border-t border-border/60 bg-card/70 px-5 py-3 text-xs"><div className="flex items-center justify-between gap-3"><span>{captionSyncing ? "Syncing captions to your recording…" : captionSyncError ? "Captions did not sync. Your recording is safe." : "Captions are not ready yet."}</span>{!captionSyncing && <Button variant="quiet" size="sm" onClick={() => void retryCaptionSync()}><RotateCcw className="size-3" /> Retry captions</Button>}</div></div>}
      {(editorPanel === "Music" || editorPanel === "Captions" || editorPanel === "Style") && <div className="border-t border-border/60 bg-card/55 px-5 py-3 backdrop-blur-md page-enter">
        {editorPanel === "Music" && <>
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Music</p><p className="mt-1 text-[10px] text-muted-foreground">Hear each mood, then play your Keep to hear it under your voice.</p></div><Button variant="bare" size="icon" aria-label="Close music" onClick={() => { stopMusicSample(); setMusicSampling(""); setEditorPanel(null); }}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-2">
            {tracks.map((track) => <div key={track.name} className={`w-44 shrink-0 rounded-xl border p-3 ${project.musicMood === track.name ? "border-accent/70 bg-accent/[0.04]" : "border-border bg-background/35"}`}>
              <div className="min-h-14"><p className="text-xs font-medium">{track.name}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{track.note}</p></div>
              <div className="mt-3 flex gap-1.5"><Button variant="quiet" size="sm" className="flex-1 px-2 text-[10px]" onClick={() => void toggleMusicSample(track.name)}>{musicSampling === track.name ? <Square className="size-3" fill="currentColor" /> : <Play className="size-3" fill="currentColor" />}{musicSampling === track.name ? "Stop" : "Sample"}</Button><Button variant={project.musicMood === track.name ? "selected" : "bare"} size="sm" className="flex-1 px-2 text-[10px]" onClick={() => patch({ musicMood: track.name })}>{project.musicMood === track.name ? <Check className="size-3" /> : null}{project.musicMood === track.name ? "Selected" : "Use"}</Button></div>
            </div>)}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Worth Keeping is an original 60-second instrumental arrangement generated in your browser, not a studio-recorded audio file. Press play in the editor to hear the selected music with your actual voice.</p>
          <div className="mt-2 flex items-center gap-2"><span className="mr-1 text-[9px] tracking-widest text-muted-foreground">MIX</span><span className="text-[10px] text-muted-foreground">Voice / Music</span></div><div className="mt-3 space-y-4 rounded-lg border border-border bg-background/60 p-3">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs"><label htmlFor="keep-voice-volume" className="font-medium">Voice volume</label><span>{project.voiceVolume ?? 60}%</span></div>
                <input id="keep-voice-volume" type="range" min="0" max="100" step="1" value={project.voiceVolume ?? 60} onChange={(e) => patch({ voiceVolume: Number(e.target.value) })} className="w-full accent-current" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs"><label htmlFor="keep-music-volume" className="font-medium">Music volume</label><span>{project.musicVolume ?? 60}%</span></div>
                <input id="keep-music-volume" type="range" min="0" max="100" step="1" value={project.musicVolume ?? 60} onChange={(e) => patch({ musicVolume: Number(e.target.value) })} className="w-full accent-current" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={mix.voiceMuted ? "selected" : "quiet"} aria-pressed={mix.voiceMuted} onClick={() => patchMix({ voiceMuted: !mix.voiceMuted })}>{mix.voiceMuted ? <VolumeX className="size-3.5" /> : <Mic className="size-3.5" />}{mix.voiceMuted ? "Voice muted" : "Mute voice"}</Button>
                <Button size="sm" variant={mix.musicMuted ? "selected" : "quiet"} aria-pressed={mix.musicMuted} onClick={() => patchMix({ musicMuted: !mix.musicMuted })}>{mix.musicMuted ? <VolumeX className="size-3.5" /> : <Music2 className="size-3.5" />}{mix.musicMuted ? "Music muted" : "Mute music"}</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Music fade in: {mix.fadeIn.toFixed(1)}s<input type="range" min="0.5" max="6" step="0.5" value={mix.fadeIn} onChange={(e) => patchMix({ fadeIn: Number(e.target.value) })} className="mt-1 w-full" /></label>
                <label className="text-xs">Music fade out: {mix.fadeOut.toFixed(1)}s<input type="range" min="1" max="8" step="0.5" value={mix.fadeOut} onChange={(e) => patchMix({ fadeOut: Number(e.target.value) })} className="mt-1 w-full" /></label>
              </div>
              <label className="flex items-center justify-between gap-3 text-xs"><span><span className="block font-medium">Lower music while you speak</span><span className="text-[10px] text-muted-foreground">Music rises again at the end.</span></span><input type="checkbox" checked={mix.ducking} onChange={(e) => patchMix({ ducking: e.target.checked })} className="size-4 accent-current" /></label>
              <p className="text-[10px] text-muted-foreground">Fade and ducking changes restart the music bed from the beginning of the preview.</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>Adjust each independently while your Keep plays.</span><button type="button" className="underline" onClick={() => patch({ voiceVolume: 60, musicVolume: 60 })}>Reset levels</button></div>
            </div>
        </>}
        {editorPanel === "Captions" && <>
          {!rec?.demo && rec?.audioUrl && <div className="mb-3 rounded-lg border border-border bg-background/50 p-3 text-xs"><div className="flex items-center justify-between gap-3"><span>{captionSyncing ? "Syncing captions to your voice…" : project.captionCues.length ? `${project.captionCues.length} caption segments ready` : captionSyncError ? "Captions could not be synchronized." : "Captions have not been generated yet."}</span>{!captionSyncing && !project.captionCues.length && <Button variant="quiet" size="sm" onClick={() => void retryCaptionSync()}><RotateCcw className="size-3.5" /> Retry sync</Button>}</div>{!captionSyncing && !project.captionCues.length && <p className="mt-2 text-[10px] text-muted-foreground">Your voice recording is saved. Retrying captions will not erase it.</p>}</div>}
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Captions</p><p className="mt-1 text-[10px] text-muted-foreground">{project.captionCues.length ? "Synced to your voice." : "Choose how your words appear."}</p></div><Button variant="bare" size="icon" aria-label="Close captions" onClick={() => setEditorPanel(null)}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">{captionOptions.map((c) => <Button key={c} variant={project.captionStyle === c ? "selected" : "quiet"} className="h-16 min-w-28 shrink-0 flex-col whitespace-normal px-3" onClick={() => patch({ captionStyle: c })}><span className={c === "Film" ? "font-display text-lg" : "text-xs"}>{c}</span><small className="text-[8px] font-normal text-muted-foreground">{c === "None" ? "No words" : c === "Reel" ? "Bold" : c === "Film" ? "Elegant" : c === "Story" ? "Emotional" : c === "Minimal" ? "Quiet" : "Simple"}</small></Button>)}</div>
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/50 p-3">
            <div><label className="mb-1 block text-xs font-medium" htmlFor="caption-words">Words per caption: {project.captionWordsPerCue ?? 5}</label><input id="caption-words" type="range" min="1" max="18" value={project.captionWordsPerCue ?? 5} className="w-full" onChange={(e) => { const count = Number(e.target.value); patch({ captionWordsPerCue: count, ...(project.captionWords?.length ? { captionCues: groupTimedWords(project.captionWords, count) } : {}) }); }} /><p className="text-[10px] text-muted-foreground">Choose one word at a time or longer phrases. Timing follows each spoken word.</p></div>
            <div><label className="mb-1 block text-xs font-medium" htmlFor="caption-lines">Maximum display lines</label><select id="caption-lines" className="w-full rounded-md border border-border bg-background p-2 text-xs" value={project.captionLines ?? 2} onChange={(e) => patch({ captionLines: Number(e.target.value) })}><option value={1}>1 line</option><option value={2}>2 lines</option><option value={3}>3 lines</option></select></div>
            <div><p className="mb-1 text-xs font-medium">Position</p><div className="flex gap-2">{(["top","middle","bottom"] as const).map((pos) => <Button key={pos} size="sm" variant={(project.captionPosition ?? "bottom") === pos ? "selected" : "quiet"} className="flex-1 capitalize" onClick={() => patch({ captionPosition: pos })}>{pos}</Button>)}</div></div>
            <p className="text-xs font-medium">Edit individual caption segments</p>
            <div className="max-h-52 space-y-2 overflow-y-auto">{project.captionCues.map((cue, i) => <div key={i} className="rounded-md border border-border/60 p-2"><div className="mb-1 flex items-center justify-between"><button type="button" className="text-[10px] underline" onClick={() => seekEditor(cue.start)}>{cue.start.toFixed(1)}s – {cue.end.toFixed(1)}s · Preview</button><span className="text-[10px] text-muted-foreground">#{i + 1}</span></div><textarea aria-label={`Caption segment ${i+1}`} onFocus={() => { setEditorPlaying(false); seekEditor(cue.start); }} rows={2} className="w-full resize-y rounded border border-border bg-background p-2 text-xs" value={cue.text} onChange={(e) => patch({ captionCues: project.captionCues.map((c, j) => j === i ? { ...c, text: e.target.value } : c) })} /><div className="mt-1 flex gap-2"><label className="flex-1 text-[10px]">Start (s)<input type="number" min={0} step={0.1} className="w-full rounded border border-border bg-background p-1" value={cue.start.toFixed(2)} onChange={(e) => patch({ captionCues: project.captionCues.map((c,j) => j === i ? { ...c, start: Math.max(0, Number(e.target.value)) } : c) })}/></label><label className="flex-1 text-[10px]">End (s)<input type="number" min={0} step={0.1} className="w-full rounded border border-border bg-background p-1" value={cue.end.toFixed(2)} onChange={(e) => patch({ captionCues: project.captionCues.map((c,j) => j === i ? { ...c, end: Math.max(0, Number(e.target.value)) } : c) })}/></label></div></div>)}</div>
            {!!project.captionWords?.length && <Button variant="quiet" size="sm" onClick={() => patch({ captionCues: groupTimedWords(project.captionWords ?? [], project.captionWordsPerCue ?? 5) })}>Restore automatic timing and text</Button>}
          </div>
        </>}
        {editorPanel === "Style" && <>
          <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-2xl">Style</p><p className="mt-1 text-[10px] text-muted-foreground">Tap a look and see it above instantly.</p></div><Button variant="bare" size="icon" aria-label="Close style" onClick={() => setEditorPanel(null)}><X className="size-4" /></Button></div>
          <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">{styles.map((style) => <button key={style.name} type="button" onClick={() => patch({ visualStyle: style.name })} className={`w-24 shrink-0 overflow-hidden rounded-lg border text-left ${project.visualStyle === style.name ? "border-accent ring-1 ring-accent" : "border-border"}`}><div className="relative h-14 overflow-hidden"><MediaView item={selected} thumb alt={style.name} className={`h-full w-full object-cover editor-image-${styleSlug(style.name)}`} /></div><div className="p-2"><p className="text-[10px] font-medium">{style.name}</p></div></button>)}</div>
        </>}
      </div>}

      {!editorPanel && <KeepTimeline
        media={shown}
        captions={project.captionCues}
        duration={editorDuration}
        time={editorTime}
        selectedIndex={frame % Math.max(1,shown.length)}
        voicePresent={!!rec && !rec.demo}
        musicMood={project.musicMood}
        onSeek={(t) => { setEditorPlaying(false); seekEditor(t); }}
        onSelect={(i) => { setEditorPlaying(false); setFrame(i); }}
        onMove={moveMemory}
        onDuration={(i,seconds) => patch({ memories: shown.map((m,j)=>j===i?{...m,displayDurationSec:seconds}:m) })}
        onCaption={(i) => { setEditorPanel("Captions"); seekEditor(project.captionCues[i]?.start??0); }}
        onAdd={() => addInput.current?.click()}
        onVoice={() => setEditorPanel("Voice")}
        onMusic={() => setEditorPanel("Music")}
        onSplit={splitMoment}
        onDuplicate={(i)=>{void duplicateMoment(i);}}
        onDelete={removeMemory}
        onReplace={()=>replaceInput.current?.click()}
        onPhotoSettings={()=>setEditorPanel("Memories")}
        onCaptionChange={(i,text)=>patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,text}:c)})}
        onCaptionTime={(i,start,end)=>patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,start:Math.max(0,Math.min(start,end-.1)),end:Math.min(editorDuration,Math.max(end,start+.1))}:c)})}
      />}

      {editorPanel === "Memories" && editorToolPanel("Photos", () => setEditorPanel(null), <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose the moments that bring your words to life. Reorder, replace, or add anything you want.</p>
        <div className="thin-scroll mt-5 flex gap-2 overflow-x-auto pb-2">{shown.map((m, i) => <div key={m.id} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragFrom.current !== null) moveMemory(dragFrom.current, i); dragFrom.current = null; }} className="shrink-0"><Button variant="bare" className={`relative h-24 w-18 overflow-hidden rounded-lg !p-0 ${i === frame % shown.length ? "ring-2 ring-accent" : "opacity-65"}`} aria-label={`Select memory ${i + 1}`} onClick={() => { setEditorPlaying(false); seekEditor(shown.slice(0, i).reduce((sum, m) => sum + Math.max(1, m.displayDurationSec ?? 4), 0)); }}><MediaView item={m} thumb alt={m.source === "sample" ? memoryLabels[i % memoryLabels.length] ?? "" : m.name ?? ""} className="h-full w-full object-cover" />{m.kind === "video" && <Play className="absolute bottom-1.5 left-1.5 size-3" fill="currentColor" />}</Button></div>)}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="quiet" onClick={() => addInput.current?.click()}><Plus /> Add moments</Button>
          <Button variant="quiet" onClick={() => replaceInput.current?.click()}>Replace</Button>
          <Button variant="quiet" disabled={frame % shown.length === 0} onClick={() => moveMemory(frame % shown.length, frame % shown.length - 1)}><ChevronLeft /> Earlier</Button>
          <Button variant="quiet" disabled={frame % shown.length >= shown.length - 1} onClick={() => moveMemory(frame % shown.length, frame % shown.length + 1)}>Later <ChevronRight /></Button>
        </div>
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/50 p-3">
          <p className="text-xs font-medium">Frame and movement · Moment {frame % shown.length + 1}</p>
          <p className="text-[10px] text-muted-foreground">Move the focus to keep faces and important details in view. Changes appear in the preview.</p>
          <p className="text-xs">Touch and drag the photo above to reposition it. Changes appear instantly.</p>
          <label className="block text-xs">Zoom: {Math.round((selected?.zoom ?? 1.08) * 100)}%<input type="range" min="100" max="140" step="1" value={Math.round((selected?.zoom ?? 1.08) * 100)} className="mt-1 w-full" onChange={(e) => patch({ memories: shown.map((m,i) => i === frame % shown.length ? { ...m, zoom: Number(e.target.value) / 100 } : m) })} /></label>
          <div><p className="mb-2 text-xs">Motion direction</p><div className="grid grid-cols-4 gap-1">{(["in","out","left","right"] as const).map((direction) => <Button key={direction} size="sm" variant={(selected?.motion ?? "in") === direction ? "selected" : "quiet"} className="capitalize px-1 text-[10px]" onClick={() => patch({ memories: shown.map((m,i) => i === frame % shown.length ? { ...m, motion: direction } : m) })}>{direction}</Button>)}</div></div>
          <div><p className="mb-2 text-xs">Transition · tap to preview</p><div className="grid grid-cols-3 gap-1">{(["fade","dissolve","cut"] as const).map((transition) => <Button key={transition} size="sm" variant={(selected?.transition ?? "fade") === transition ? "selected" : "quiet"} className="capitalize text-[11px]" onClick={() => { updateSelectedMoment({ transition }); setEditorPlaying(true); }}>{transition === "cut" ? "Instant" : transition === "dissolve" ? "Dissolve" : "Fade"}</Button>)}</div></div>
          <label className="block text-xs">Moment duration: {selected?.displayDurationSec ?? 7}s<input type="range" min="4" max="15" step="1" value={selected?.displayDurationSec ?? 7} className="mt-1 w-full" onChange={(e) => patch({ memories: shown.map((m,i) => i === frame % shown.length ? { ...m, displayDurationSec: Number(e.target.value) } : m) })} /></label>
          <Button variant="quiet" size="sm" onClick={() => patch({ memories: shown.map((m,i) => i === frame % shown.length ? { ...m, focusX: 50, focusY: 50, zoom: 1.08, motion: "in" } : m) })}>Reset framing</Button>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
          <Button variant="bare" size="sm" disabled={shown.length <= 1} className="text-muted-foreground" onClick={() => removeMemory(frame % shown.length)}><Trash2 className="size-4" /> Remove</Button>
          <Button variant="bare" size="sm" onClick={cycleMemoryDuration}>Duration {selected?.displayDurationSec ?? 4}s</Button>
        </div>
      </div>)}

      {editorPanel === "Voice" && editorToolPanel("Voice & words", () => setEditorPanel(null), <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Remember something you want to add? You can change the words or record your voice again without losing the rest of your Keep.</p>
        <div className="mt-6 space-y-3">
          <button type="button" onClick={editWordsFromEditor} className="flex w-full items-center justify-between rounded-xl border border-border bg-background/45 p-5 text-left transition-colors hover:border-accent/45">
            <span className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.05] text-accent"><MessageCircle className="size-5" /></span>
              <span>
                <strong className="block font-display text-2xl font-normal">Edit my words</strong>
                <small className="mt-1 block max-w-[250px] text-[11px] leading-5 text-muted-foreground">Add a memory, change a line, or use Ask Keep again. Then record the updated message.</small>
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

      </div>
      <nav className="keep-studio-tools" aria-label="Editing tools">
        {([{ panel: null, label: "Timeline", Icon: GripVertical }, { panel: "Memories", label: "Photos", Icon: Images }, { panel: "Captions", label: "Captions", Icon: MessageCircle }, { panel: "Music", label: "Music", Icon: Music2 }, { panel: "Voice", label: "Voice", Icon: Mic }, { panel: "Style", label: "Style", Icon: Sparkles }] as const).map(({ panel, label, Icon }) => <button key={label} type="button" aria-pressed={editorPanel === panel} onClick={() => { stopMusicSample(); setMusicSampling(""); setEditorPanel(panel); }}><Icon /><span>{label}</span></button>)}
      </nav>

      {previewChooserOpen && sheet("Preview your Keep", () => { setPreviewChooserOpen(false); setReadArrangeOpen(false); }, <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose how you want to check it. Previewing is optional — you can come back and make changes anytime.</p>
        <div className="mt-5 space-y-2">
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("watch")}><span className="flex items-center gap-3"><Images className="size-5" /><span><strong className="block font-normal">Watch</strong><small className="mt-1 block font-normal text-muted-foreground">Voice, memories, music + captions</small></span></span><ArrowRight /></Button>
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
      : <KeepPlayer name={(name || "Your Keep").toUpperCase()} from="Alex" year="2026" subtitle={project.occasion} onExit={back} onFinish={() => { setScreen("editor"); resetPageScroll(); }} style={project.visualStyle} captions={project.captionStyle} media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion })) : undefined} audioUrl={rec && !rec.demo ? rec.audioUrl : undefined} audioDuration={rec?.durationSec} lines={captionLines} captionCues={project.captionCues} musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume} captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={mix} />)}
    {screen === "recipientPreview" && <KeepRecipientExperience
      name={(name || engraving[0] || "You").trim()}
      from={(engraving[1]?.replace(/^FROM\s+/i, "") || "Alex").trim()}
      year={(engraving[2] || "2026").trim()}
      subtitle={project.occasion}
      openingMessage={project.openingMessage}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs.length ? project.messageParagraphs : initialMessage.map((p) => withName(p, name))}
      style={project.visualStyle}
      captions={project.captionStyle}
      lines={captionLines}
      captionCues={project.captionCues}
      musicMood={project.musicMood}
      voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume} captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={mix}
      persistVisit={false}
      creatorPreview
      initialExperience={creatorPreviewMode ?? "watch"}
      onCreatorExit={() => { setCreatorPreviewMode(null); setHistory([]); setScreen("editor"); resetPageScroll(); }}
      onCreatorContinue={() => { setCreatorPreviewMode(null); setScreen("editor"); resetPageScroll(); }}
    />}
    {screen === "recipientReveal" && <KeepRecipientExperience
      name={(name || engraving[0] || "You").trim()}
      from={(engraving[1]?.replace(/^FROM\s+/i, "") || "").trim()}
      year={(engraving[2] || "").trim()}
      openingMessage={project.openingMessage}
      subtitle={project.occasion}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs}
      style={project.visualStyle} captions={project.captionStyle} lines={captionLines} captionCues={project.captionCues}
      musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume}
      captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={mix}
      persistVisit={false} creatorPreview
      onCreatorExit={() => { setScreen("card"); resetPageScroll(); }}
      onCreatorContinue={() => { setScreen("card"); resetPageScroll(); }}
    />}
    {screen === "card" && <>{top()}<div className="px-7 pb-10 pt-7">{title("The final touch", "Give it somewhere to live.", "Your card opens this Keep with a tap. No app or login required.")}<div className="card-object relative mx-auto aspect-[1.586] w-full max-w-none overflow-hidden rounded-lg border border-foreground/10 p-7 text-white"><span className="brand absolute left-7 top-7 text-sm text-white">Keep</span><div className="absolute left-7 top-[42%] flex -translate-y-1/2 flex-col items-start gap-1 text-left text-[11px] tracking-[.2em] text-white"><strong className="font-normal">{engraving[0]}</strong>{engraving[1] && <span>{engraving[1]}</span>}{engraving[2] && <span>{engraving[2]}</span>}</div></div><div className="mt-9 space-y-4">{["To / Title", "From (optional)", "Date (optional)"].map((label, i) => <label key={label} className="block"><span className="eyebrow">{label}</span><input aria-label={`Card ${label}`} maxLength={22} value={engraving[i] ?? ""} onChange={(e) => updateEngraving(i, e.target.value)} className="mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-sm tracking-widest outline-none focus:border-accent" /></label>)}</div><div className="mt-9 space-y-3 border-t border-border pt-7"><h2 className="font-display text-2xl">Your opening message</h2><p className="text-xs leading-5 text-muted-foreground">The first words they'll see when they tap your card. Keep it short and personal.</p><label className="block"><span className="sr-only">Opening message</span><textarea aria-label="Opening message" maxLength={160} rows={3} placeholder="Made just for you." value={project.openingMessage ?? "Made just for you."} onChange={(e) => patch({ openingMessage: e.target.value })} className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-4 font-display text-lg outline-none focus:border-accent" /></label><div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{(project.openingMessage ?? "Made just for you.").length}/160</span><Button variant="quiet" size="sm" onClick={() => { go("recipientReveal"); }}>Preview card opening <ArrowRight className="size-4" /></Button></div></div><div className="mt-10">{engraving[0]?.trim() && <KeepPublishPanel project={project} onChange={patch} onPublished={() => go("success")} />}</div><p className="mt-3 text-center text-[11px] text-muted-foreground">Only To / Title is required. Use your own NFC card with the viewing link.</p></div></>}
    {screen === "success" && <div className="flex keep-min-screen flex-col justify-between px-7 pb-10 pt-10"><span className="brand">Keep</span><div className="py-12"><div className="mb-10 flex size-13 items-center justify-center rounded-full border border-accent text-accent"><Check /></div>{title("", "Your Keep is ready.")}<button type="button" className="card-object relative mt-12 block aspect-[1.586] w-full overflow-hidden rounded-lg border border-foreground/10 p-7 text-left text-white" onClick={() => setCardBack(!cardBack)} aria-label={cardBack ? "View front of keepsake card" : "View back of keepsake card"}>{!cardBack ? <><span className="brand absolute left-7 top-7 text-lg text-white">Keep</span><div className="absolute left-7 top-[42%] flex -translate-y-1/2 flex-col items-start gap-1 text-left text-[11px] tracking-[.2em] text-white"><span>{engraving[0]}</span>{engraving[1] && <span>{engraving[1]}</span>}{engraving[2] && <span>{engraving[2]}</span>}</div></> : <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 px-7 text-center text-[11px] font-normal tracking-[.2em] text-white"><span>SOME THINGS ARE WORTH KEEPING.</span><Radio className="size-4 stroke-[1.5]" aria-hidden="true" /></div>}</button><Button variant="bare" className="mx-auto mt-3 flex h-auto items-center gap-2 px-3 py-2 text-xs text-muted-foreground" onClick={() => setCardBack(!cardBack)}>{cardBack ? "View front" : "View back"} <RotateCcw className="size-3.5" /></Button><p className="mt-2 text-xs text-muted-foreground">{engraving[0]}{engraving[1] ? ` · ${engraving[1].toLowerCase()}` : ""}{engraving[2] ? ` · ${engraving[2]}` : ""}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Physical card ordering is coming next. No card has been ordered or shipped.</p></div><div className="space-y-3"><KeepPublishPanel project={project} onChange={patch} /><Button variant="quiet" size="touch" className="w-full" onClick={() => go("editor")}>Back to editor</Button><Button asChild variant="quiet" size="touch" className="w-full"><Link to="/app">Back to Keeps</Link></Button></div></div>}
  </div></main>;
}
