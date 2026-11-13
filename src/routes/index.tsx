import { KeepAccountButton } from "@/components/keep-account-button";
import { KeepOpeningScreen } from "@/components/keep-opening-screen";
import type { KeepRestoreProgress } from "@/lib/keep-cloud";
import { ViewingLink } from "@/components/keep-publish-panel";
import { KeepCardFront } from "@/components/keep-card-front";
import { publishKeep } from "@/lib/keep-publish";
import { KeepCaptionEditor } from "@/components/keep-caption-editor";
import { KeepMusicEditor } from "@/components/keep-music-editor";
import { KeepVoiceEditor } from "@/components/keep-voice-editor";
import { KeepTeleprompter } from "@/components/keep-teleprompter";
import { KeepStyleEditor } from "@/components/keep-style-editor";
import { KeepFinishingChoices } from "@/components/keep-finishing-choices";
import { KeepAskAIModal, KeepWordChanges } from "@/components/keep-ask-ai-modal";
import { arrangeWords, spreadMemories, recommendedStyle } from "@/lib/keep-story-layout";
import { filmTotal, sceneBoundary, sceneDuration, sceneElapsed, sceneIndexAt, sceneSeekTime } from "@/lib/keep-film-timing";
import { captionAtTime, recoverCaptionTiming } from "@/lib/keep-caption-timing";
import { activeKeepSession, loadEditableKeep, loadCloudDraft, saveCloudDraft, removeCloudDraft, retryMissingCloudMedia } from "@/lib/keep-cloud";
import { CinematicMedia } from "@/components/cinematic-media";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Download, Ellipsis, GripVertical, Images, LockKeyhole, MessageCircle, Mic, Keyboard, Music2, FileUp, Loader2, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Square, Trash2, Undo2, Redo2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, memoryLabels } from "@/components/keep-player";
import { KeepRecipientExperience, type KeepExperienceMode } from "@/components/keep-recipient-experience";
import { KeepOpeningPersonalization } from "@/components/keep-opening-personalization";
import { KeepErrorBoundary } from "@/components/keep-error-boundary";
import { KeepLengthGuide } from "@/components/keep-length-guide";
import { checkKeepVideo, KEEP_VIDEO_MAX_BYTES, KEEP_VIDEO_MAX_SOURCE_BYTES, KEEP_VIDEO_MAX_SECONDS, readKeepVideoDuration } from "@/lib/keep-video-upload";
import { compressKeepVideo, keepCompressedSizeText, shouldCompressKeepVideo } from "@/lib/keep-video-compression";
import { countKeepWords, estimateKeepSeconds, formatKeepTime } from "@/lib/keep-length";
import { useRecorder } from "@/hooks/use-recorder";
import { joinKeepVoiceParts } from "@/lib/keep-collaborative-audio";
import { deleteBlobs, getBlob, putBlob } from "@/lib/keep-media-store";
import { createKeepVoiceMix, playMusicSample, stopMusicSample, type MusicBalance } from "@/lib/keep-audio";
import { fetchDraft, fetchNextQuestion, fetchRevision, keepAiAvailable, transcribeAudio, transcribeTimedAudio, type TimedWord } from "@/lib/keep-ai";
import { fmt, hydrateDraftMedia, loadDraft, newId, newProject, projectBlobIds, projectObjectUrls, sampleMemories, saveDraft, stageLabels, defaultAudioMix, type AudioMix, type CaptionCue, type InterviewAnswer, type KeepProject, type MediaItem, type VoiceTone } from "@/lib/keep-project";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Keep — Say what matters. Keep it forever." },
    { name: "description", content: "Create a personal memory-film from your words, your voice, and the moments worth keeping." },
    { property: "og:title", content: "Keep — Say what matters. Keep it forever." },
    { property: "og:description", content: "Create a personal memory-film from your words, your voice, and the moments worth keeping." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: KeepRoute,
});

type Screen = "home" | "you" | "detail" | "recipient" | "occasion" | "voices" | "intent" | "path" | "interview" | "summary" | "messageGenerating" | "write" | "message" | "recordPrep" | "record" | "groupRecord" | "recorded" | "memories" | "storyStyle" | "generating" | "editor" | "preview" | "recipientReveal" | "recipientPreview" | "giveReady" | "card" | "success";
type Mode = "Memories" | "Music" | "Captions" | "Style" | "Voice";
const creationScreens: Screen[] = ["recipient", "occasion", "voices", "intent", "path", "interview", "summary", "messageGenerating", "write", "message", "recordPrep", "record", "groupRecord", "recorded", "memories", "storyStyle", "generating", "editor", "preview", "recipientPreview", "card", "success"];
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
  { name: "Warm + Nostalgic", note: "Gentle, familiar warmth", group: "For You" },
  { name: "Intentional", note: "Our signature soundtrack · beautifully personal", group: "For You" },
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
/** Divide a long typed message into sentence groups for separate readers. */
const splitForVoices = (text: string, people: number): string[] => {
  const sentences = (text.trim().match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/gu) ?? []).map(x=>x.trim()).filter(Boolean);
  if (sentences.length < 2) {
    const words = text.trim().split(/\s+/u).filter(Boolean);
    if (words.length < 30) return [text.trim()];
    const perPart = Math.max(15,Math.ceil(words.length/Math.max(people,2)));
    return Array.from({length:Math.ceil(words.length/perPart)},(_,i)=>words.slice(i*perPart,(i+1)*perPart).join(" "));
  }
  const target = Math.max(18,Math.ceil(text.trim().split(/\s+/u).length/Math.max(people,2)));
  const result: string[] = [];
  let part = "";
  for (const sentence of sentences) {
    if (part && (part+" "+sentence).split(/\s+/u).length>target && result.length<98) { result.push(part); part=sentence; }
    else part = part ? part+" "+sentence : sentence;
  }
  if (part) result.push(part);
  return result;
};
const releaseUrls = (urls: (string | undefined)[]) => urls.forEach((u) => { if (u && u.startsWith("blob:")) URL.revokeObjectURL(u); });

function KeepRoute() {
  const [key, setKey] = useState(0);
  return <KeepErrorBoundary onReset={() => setKey((k) => k + 1)}><KeepApp key={key} /></KeepErrorBoundary>;
}

function MediaView({ item, className, alt, thumb = false }: { item: MediaItem; className: string; alt: string; thumb?: boolean }) {
  if (!item.url) return <div className={`${className} bg-card`} aria-label="Media unavailable" />;
  if (item.kind === "video") return thumb ? <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" className={className} aria-label={alt} /> : <video src={item.url} autoPlay muted loop playsInline className={className} aria-label={alt} />;
  return <img src={item.url} alt={alt} loading={thumb ? "lazy" : "eager"} className={className} />;
}

function KeepApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [history, setHistory] = useState<Screen[]>([]);
  const [project, setProject] = useState<KeepProject>(newProject);
  const [hydrated, setHydrated] = useState(false);
  const [openingPhase, setOpeningPhase] = useState<"session" | "draft" | "media" | "finishing">("session");
  const [openingProgress, setOpeningProgress] = useState<KeepRestoreProgress | null>(null);
  const [cloudSyncAllowed, setCloudSyncAllowed] = useState(true);
  const [restoreRetrying, setRestoreRetrying] = useState(false);
  const [viewingDemo, setViewingDemo] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [appliedAiOriginal, setAppliedAiOriginal] = useState<{ before: string[]; changedIndexes: number[] } | null>(null);
  const [editingAiParagraph, setEditingAiParagraph] = useState<number | null>(null);
  const [askPrompt, setAskPrompt] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState("");
  const [askLastInstruction, setAskLastInstruction] = useState("");
  const [askLastScope, setAskLastScope] = useState<"section" | "message">("section");
  const [askSuggestion, setAskSuggestion] = useState<null | { paragraphs: string[]; changedIndexes: number[]; note: string }>(null);
  const [aiBusy, setAiBusy] = useState<null | "start" | "transcribe" | "next" | "draft">(null);
  const [interviewViewportHeight, setInterviewViewportHeight] = useState<number | null>(null);
  const [interviewKeyboardOpen, setInterviewKeyboardOpen] = useState(false);
  const [interviewInputFocused, setInterviewInputFocused] = useState(false);
  const interviewFullHeight = useRef(0);
  const [aiError, setAiError] = useState<null | { kind: "start" | "transcribe" | "next" | "draft"; retry: () => void }>(null);
  const [generation, setGeneration] = useState(0);
  const [mode, setMode] = useState<Mode>("Memories");
  const [resumeError, setResumeError] = useState("");
  const [editorPanel, setEditorPanel] = useState<Mode | null>(null);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [compareOriginalStyle, setCompareOriginalStyle] = useState(false);
  const [previewChooserOpen, setPreviewChooserOpen] = useState(false);
  const [creatorPreviewMode, setCreatorPreviewMode] = useState<KeepExperienceMode | null>(null);
  const [readArrangeOpen, setReadArrangeOpen] = useState(false);
  const [readArrangeIndex, setReadArrangeIndex] = useState(0);
  const [returnToEditorAfterRecording, setReturnToEditorAfterRecording] = useState(false);
  const [groupPartIndex, setGroupPartIndex] = useState(0);
  const [groupBusy, setGroupBusy] = useState(false);
  const [frame, setFrame] = useState(0);
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorTime, setEditorTime] = useState(0);
  const editorAudioRef = useRef<HTMLAudioElement>(null);
  const editorMixRef = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const [publishError, setPublishError] = useState("");
  const publishingLock = useRef(false);
  const [setting, setSetting] = useState("");
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceTime, setVoiceTime] = useState(0);
  const [captionSyncing, setCaptionSyncing] = useState(false);
  const [captionSyncError, setCaptionSyncError] = useState(false);
  const captionSyncToken = useRef(0);
  const [musicSampling, setMusicSampling] = useState("");
  const musicSampleTimer = useRef<number | null>(null);
  const voicePlaybackRef = useRef<HTMLAudioElement>(null);
  const [busy, setBusy] = useState(false);
  const [mediaImport, setMediaImport] = useState<{ total: number; completed: number; detail?: string; compressionPercent?: number } | null>(null);
  const [voiceSampling, setVoiceSampling] = useState<VoiceTone | null>(null);
  const voiceSampleRef = useRef<{ tone: VoiceTone; audio: HTMLAudioElement; mixer: NonNullable<ReturnType<typeof createKeepVoiceMix>>; timer: number | null } | null>(null);
  const [otherOccasion, setOtherOccasion] = useState("");
  const [otherRelationship, setOtherRelationship] = useState("");
  const [dictating, setDictating] = useState(false);
  const [writeInputMode, setWriteInputMode] = useState<"speak" | "type" | "upload">("type");
  const [uploadedDraftName, setUploadedDraftName] = useState("");
  const dictationRef = useRef<any>(null);
  const dictationTargetRef = useRef<"write" | "intent">("write");
  const recorder = useRecorder();
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
        setOpeningPhase("session");
        const session = await activeKeepSession();
        if (cancelled) return;
        if (session) {
          setOpeningPhase("draft");
          const onRestore = (progress: KeepRestoreProgress) => {
            if (cancelled) return;
            setOpeningPhase("media");
            setOpeningProgress(progress);
          };
          const remote = editId ? await loadEditableKeep(editId, session, onRestore) : await loadCloudDraft(session, onRestore);
          if (remote) {
            next = remote;
            // A partial restore may be viewed, but must NEVER overwrite the
            // complete cloud copy or its associated published Keep.
            if (remote.restoreIncomplete) setCloudSyncAllowed(false);
          }
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
      setOpeningPhase("finishing");
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
    if (!hydrated || project.restoreIncomplete) return;
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
  useEffect(() => { if (screen !== "interview" && screen !== "record" && screen !== "groupRecord") recorder.cancel(); }, [screen]);
  useEffect(() => {
    if (screen === "recorded") return;
    const audio = voicePlaybackRef.current;
    if (audio) audio.pause();
    setVoicePlaying(false);
    setVoiceTime(0);
  }, [screen]);
  useEffect(() => { if (screen !== "write" && screen !== "intent" && dictationRef.current) { dictationRef.current.stop(); dictationRef.current = null; setDictating(false); } }, [screen]);
  useEffect(() => {
    if (screen === "editor" && returnToEditorAfterRecording) setReturnToEditorAfterRecording(false);
  }, [screen, returnToEditorAfterRecording]);
  useEffect(() => {
    if (screen === "editor" || screen === "storyStyle") return;
    stopMusicSample();
    setMusicSampling("");
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
    musicSampleTimer.current = null;
  }, [screen]);
  useEffect(() => () => {
    stopMusicSample();
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
  }, []);

  const retryMissingRestore = async () => {
    if (restoreRetrying || !project.restoreIncomplete) return;
    setRestoreRetrying(true);
    try {
      const session = await activeKeepSession();
      if (!session) throw new Error("Please sign in again to restore your remaining media.");
      const restored = await retryMissingCloudMedia(project,session);
      setProject(restored);
      if (!restored.restoreIncomplete) {
        setCloudSyncAllowed(true);
        toast.success("All your original photos and audio are restored. Saving is enabled.");
      } else {
        toast.error(`${restored.restoreMissingCount ?? 0} files still need restoring. Your cloud Keep remains unchanged.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your saved Keep is safe. Try restoring the remaining files again.");
    } finally {
      setRestoreRetrying(false);
    }
  };

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
  const editDemoCopy = () => startProject({ ...newProject(), recipientName: "Hanna", relationship: "Spouse", messageSource: "demo", messageParagraphs: initialMessage, memories: sampleMemories(), finalVoiceRecording: { durationSec: 150, demo: true }, cardEngraving: ["HANNA", "FROM ALEX", "2026"] }, "editor");
  const continueDraft = () => { setViewingDemo(false); setHistory(["home"]); setScreen((project.stage as Screen) || "recipient"); };


  // On iPhone the keyboard shrinks the visual viewport without consistently
  // updating 100dvh. Size this screen to the actual visible area instead.
  useEffect(() => {
    if (screen !== "interview") return;
    const viewport = window.visualViewport;
    interviewFullHeight.current = Math.max(window.innerHeight, viewport?.height ?? 0);
    const measure = () => {
      const height = Math.round(viewport?.height ?? window.innerHeight);
      setInterviewViewportHeight(height);
      setInterviewKeyboardOpen(interviewFullHeight.current - height > 135);
    };
    measure();
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      setInterviewInputFocused(false);
    };
  }, [screen]);

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
    contributors: project.voiceMode === "together" ? (project.contributors ?? []).map(c => c.name) : [],
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
      patch({ messageParagraphs: paragraphs, messageSource: "ai", paragraphSpeakers: paragraphs.map((_,i) => project.contributors?.[i % Math.max(1,project.contributors.length)]?.id ?? "") });
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
    setAskLastScope("message");
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
    const changedIndexes = askSuggestion.paragraphs.map((p, i) => p !== project.messageParagraphs[i] ? i : -1).filter((i) => i >= 0);
    if (!changedIndexes.length) { toast.info("No changes were made to your message."); return; }
    setAppliedAiOriginal({ before: [...project.messageParagraphs], changedIndexes });
    setEditingAiParagraph(null);
    patch({ messageParagraphs: askSuggestion.paragraphs, paragraphSpeakers: askSuggestion.paragraphs.map((_,i) => project.paragraphSpeakers?.[i] || project.contributors?.[i % Math.max(1,project.contributors.length)]?.id || "") });
    setActiveParagraph(changedIndexes[0] ?? activeParagraph);
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
  const isTogether = project.voiceMode === "together" && (project.contributors?.length ?? 0) > 1;
  const speakerFor = (i: number) => project.paragraphSpeakers?.[i] || project.contributors?.[i % Math.max(1,project.contributors.length)]?.id || "";
  const speakerName = (i: number) => project.contributors?.find(c => c.id === speakerFor(i))?.name || "Contributor";
  const readyPart = (i: number) => (project.voiceParts ?? []).find(part => part.paragraphIndex === i && part.contributorId === speakerFor(i) && part.textFingerprint === (project.messageParagraphs[i] ?? "").trim() && !!part.audioId);
  const readyCount = project.messageParagraphs.filter((p,i) => p.trim() && readyPart(i)).length;
  const groupReady = project.messageParagraphs.length > 1 && readyCount === project.messageParagraphs.length;
  const groupSignature = project.messageParagraphs.map((p,i)=>[speakerFor(i),p.trim(),readyPart(i)?.audioId ?? ""].join("::")).join("\n");
  const giverNames = isTogether ? (project.contributors ?? []).map(c => c.name.trim()).filter(Boolean).join(" & ") : "Alex";
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
    setScreen(isTogether ? "groupRecord" : "record");
    setGroupPartIndex(0);
    setScroll(0);
    setScrollPaused(false);
    setRehearsing(false);
    window.scrollTo(0, 0);
  };
  const startFinal = async () => { const ok = await recorder.start(); if (!ok) toast.error("The microphone isn't available right now."); };

  const syncFinalCaptions = async (blob: Blob, mimeType?: string, recordedDuration = rec?.durationSec ?? 0, sourceAudioId?: string) => {
    const request = ++captionSyncToken.current;
    setCaptionSyncing(true);
    setCaptionSyncError(false);
    try {
      const prompt = project.messageParagraphs.join(" ").slice(0, 700);
      const timed = await transcribeTimedAudio(blob, mimeType, prompt);
      const cues = groupTimedWords(timed.words, project.captionWordsPerCue ?? 5);
      if (!cues.length) throw new Error("No timestamped words returned");
      // Some transcription responses contain impossible timestamps: dozens of
      // words can pile up at one instant, leaving long stretches with no captions.
      // Preserve every recognized word and reconstruct estimated cue timing.
      const corrected = recoverCaptionTiming(timed.words, cues, recordedDuration);
      // A finished transcription must never overwrite a newer recording.
      if (request !== captionSyncToken.current) return;
      setProject((o) => sourceAudioId && o.finalVoiceRecording?.audioId !== sourceAudioId ? o : ({
        ...o, captionTranscript: timed.transcript, captionWords: corrected.words,
        captionCues: corrected.cues, captionTimingEstimated: corrected.repaired,
      }));
      if (corrected.repaired) toast.info("Some caption timing was unreliable, so we spaced the phrases across your recording. Please review.");
    } catch {
      if (request !== captionSyncToken.current) return;
      setCaptionSyncError(true);
      toast.error("Captions couldn't sync. Please retry before sharing your Keep.");
    } finally {
      if (request === captionSyncToken.current) setCaptionSyncing(false);
    }
  };

  const finishFinal = async () => {
    const r = await recorder.stop();
    if (!r) { toast.error("Nothing was recorded. Try again."); return; }
    const id = newId("voice");
    const stored = await putBlob(id, r.blob);
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    captionSyncToken.current++;
    const audioUrl = URL.createObjectURL(r.blob);
    setProject((o) => ({
      ...o,
      finalVoiceRecording: { audioId: stored ? id : undefined, audioUrl, durationSec: r.durationSec, mimeType: r.mimeType, demo: false },
      captionTranscript: "",
      captionCues: [],
      captionWords: [],
      captionTimingEstimated: false,
    }));
    go("recorded");
    void syncFinalCaptions(r.blob, r.mimeType, r.durationSec, stored ? id : undefined);
  };

  const finishGroupPart = async () => {
    if (groupBusy) return;
    setGroupBusy(true);
    try {
      const r = await recorder.stop();
      if (!r || r.durationSec < 0.25) throw new Error("That recording was too short. Try again.");
      const index = groupPartIndex;
      const id = newId("voice-part");
      if (!(await putBlob(id,r.blob))) throw new Error("Your device could not save this recording. Please free some storage and try again.");
      const currentParts = project.voiceParts ?? [];
      const oldPart = currentParts.find(p => p.paragraphIndex === index);
      const nextParts = [...currentParts.filter(p => p.paragraphIndex !== index), {
        paragraphIndex:index, contributorId:speakerFor(index), textFingerprint:(project.messageParagraphs[index] ?? "").trim(),
        audioId:id, audioUrl:URL.createObjectURL(r.blob), durationSec:r.durationSec, mimeType:r.mimeType,
      }];
      setProject(old=>({...old,voiceParts:nextParts,finalVoiceRecording:null,groupVoiceSignature:undefined,captionTranscript:"",captionCues:[],captionWords:[],captionTimingEstimated:false}));
      if (oldPart) { releaseUrls([oldPart.audioUrl]); if (oldPart.audioId) void deleteBlobs([oldPart.audioId]); }
      const nextIndex = project.messageParagraphs.findIndex((p,i) => p.trim() && !nextParts.some(part => part.paragraphIndex === i && part.contributorId === speakerFor(i) && part.textFingerprint === p.trim()));
      if (nextIndex >= 0) setGroupPartIndex(nextIndex);
      toast.success(nextIndex >= 0 ? "Part saved. Hand the phone to the next speaker." : "All voices recorded. Ready to bring them together.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recording couldn't be saved.");
    } finally {
      setGroupBusy(false);
    }
  };
  const combineGroupVoices = async () => {
    if (groupBusy || !groupReady) return;
    setGroupBusy(true);
    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < project.messageParagraphs.length; i++) {
        const part = readyPart(i);
        const blob = part?.audioId ? await getBlob(part.audioId) : null;
        if (!blob) throw new Error("A voice is missing. Please record that part again.");
        blobs.push(blob);
      }
      const joined = await joinKeepVoiceParts(blobs);
      if (joined.blob.size > 19 * 1024 * 1024) throw new Error("This combined message is too long. Make the parts a little shorter.");
      const id = newId("voice");
      if (!(await putBlob(id,joined.blob))) throw new Error("Not enough device storage to save the combined recording.");
      if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
      captionSyncToken.current++;
      setProject(old=>({...old,finalVoiceRecording:{audioId:id,audioUrl:URL.createObjectURL(joined.blob),durationSec:joined.durationSec,mimeType:"audio/wav",demo:false},groupVoiceSignature:groupSignature,captionTranscript:"",captionCues:[],captionWords:[],captionTimingEstimated:false}));
      go("recorded");
      void syncFinalCaptions(joined.blob, "audio/wav", joined.durationSec, id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recordings couldn't be combined. Your individual parts are saved.");
    } finally {
      setGroupBusy(false);
    }
  };

  const retryCaptionSync = async () => {
    if (!rec?.audioUrl) return;
    try {
      const response = await fetch(rec.audioUrl);
      const blob = await response.blob();
      await syncFinalCaptions(blob, rec.mimeType, rec.durationSec, rec.audioId);
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

  // Recover previously saved Keeps that contain broken timestamp metadata.
  // The original voice blob and caption text are left untouched.
  useEffect(() => {
    if (!hydrated || !project.active || !rec?.durationSec || rec.demo || !project.captionCues.length || project.captionTimingEstimated) return;
    const corrected = recoverCaptionTiming(project.captionWords ?? [], project.captionCues, rec.durationSec);
    if (!corrected.repaired) return;
    setProject((old) => ({
      ...old,
      captionWords: corrected.words,
      captionCues: corrected.cues,
      captionTimingEstimated: true,
    }));
    toast.info("We repaired gaps in your saved caption timing. Your recording and words are unchanged.");
  }, [hydrated, project.active, project.captionWords, project.captionCues, project.captionTimingEstimated, rec?.durationSec, rec?.demo]);

  const useDemoRecording = () => {
    if (rec) { releaseUrls([rec.audioUrl]); if (rec.audioId) void deleteBlobs([rec.audioId]); }
    patch({ finalVoiceRecording: { durationSec: 150, demo: true }, captionTranscript: "", captionCues: [], captionWords: [] });
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
  const photoCount = personalMedia.filter(m => m.kind === "image").length;
  const videoCount = personalMedia.filter(m => m.kind === "video").length;
  // Narration-first photo guidance: use the real voice recording when available,
  // otherwise estimate speaking time from the current message (~140 words/minute).
  const narrationWordCount = countKeepWords(project.messageParagraphs.join(" "));
  const intendedSpeakingTime = formatKeepTime(estimateKeepSeconds(narrationWordCount));
  const estimatedNarrationSec = narrationWordCount ? estimateKeepSeconds(narrationWordCount) : 0;
  const recordedNarrationSec = rec && !rec.demo && rec.durationSec > 0 ? rec.durationSec : 0;
  const guidanceSeconds = recordedNarrationSec || estimatedNarrationSec;
  const minRecommendedMoments = guidanceSeconds ? Math.ceil(guidanceSeconds / 5) : 0;
  const maxRecommendedMoments = guidanceSeconds ? Math.ceil(guidanceSeconds / 3) : 0;
  const idealRecommendedMoments = guidanceSeconds ? Math.round(guidanceSeconds / 4) : 0;
  const narrationLengthText = guidanceSeconds ? (guidanceSeconds < 60 ? `${Math.round(guidanceSeconds)} seconds` : `${Math.floor(guidanceSeconds / 60)} min${Math.round(guidanceSeconds % 60) ? ` ${Math.round(guidanceSeconds % 60)} sec` : ""}`) : "";

  const suggestedStyle = recommendedStyle(personalMedia.length, rec?.durationSec ?? 150);
  const chosenStyle = styleTouched ? (project.creationStyle ?? "memories") : suggestedStyle;
  const createStory = () => {
    const duration = rec?.durationSec ?? 150;
    const media = chosenStyle === "memories" && personalMedia.length
      ? spreadMemories(personalMedia, duration)
      : arrangeWords(personalMedia, project.messageParagraphs, duration);
    patch({ memories: media, creationStyle: chosenStyle });
    setFrame(0);
    setEditorTime(0);
    setEditorPlaying(false);
    setEditorPanel(null);
    setEditorExpanded(false);
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
    const supported = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(heic|heif|jpe?g|png|gif|webp|mov|mp4|m4v)$/i.test(f.name));
    if (!supported.length) { toast.error("Choose photos or short video clips to add."); return; }
    setBusy(true);
    setMediaImport({ total: supported.length, completed: 0 });
    // Give iPhone time to paint the status before reading iCloud media.
    await new Promise<void>((resolve) => requestAnimationFrame(() => window.setTimeout(resolve, 0)));
    const items: MediaItem[] = [];
    const skipped: string[] = [];
    let processed = 0;
    try {
      for (const f of supported) {
        try {
          const kind = f.type.startsWith("video/") || /\.(mov|mp4|m4v)$/i.test(f.name) ? "video" as const : "image" as const;
          let displayDurationSec = 7;
          let savedFile = f;
          if (kind === "video") {
            if (f.size > KEEP_VIDEO_MAX_SOURCE_BYTES) {
              throw new Error("This source video is very large. Please trim it or export a smaller version in Photos.");
            }
            setMediaImport({ total: supported.length, completed: processed, detail: "Checking video length…" });
            let seconds: number;
            try { seconds = await readKeepVideoDuration(f); }
            catch { throw new Error("Couldn't read this video's length. Try an MP4 or MOV clip."); }
            if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Couldn't read this video's length.");
            if (seconds > KEEP_VIDEO_MAX_SECONDS + 0.5) throw new Error("Please trim this clip to 90 seconds or less.");
            displayDurationSec = Math.max(1, seconds);
            if (shouldCompressKeepVideo(f.size)) {
              setMediaImport({ total: supported.length, completed: processed, detail: "Compressing video on your device…", compressionPercent: 0 });
              const encoded = await compressKeepVideo(f, seconds, (percent) => {
                setMediaImport({ total: supported.length, completed: processed, detail: "Compressing video on your device…", compressionPercent: percent });
              });
              if (encoded && encoded.size > 0 && encoded.size < f.size * 0.9) {
                // Verify the result is actually decodable and the whole
                // moment survived before replacing the user's source file.
                let verified = false;
                try {
                  const resultSeconds = await readKeepVideoDuration(encoded);
                  verified = Math.abs(resultSeconds - seconds) <= Math.max(1.5, seconds * 0.12);
                } catch { /* Some devices create incompatible containers. */ }
                if (verified) {
                  savedFile = encoded;
                  toast.success(`Video compressed — ${keepCompressedSizeText(f.size, encoded.size)}`);
                }
              }
            }
            setMediaImport({ total: supported.length, completed: processed, detail: "Saving your video…" });
            const issue = checkKeepVideo(savedFile.size, seconds);
            if (issue) {
              throw new Error(savedFile === f
                ? "This video couldn't be compressed enough on your device. Try a shorter clip or export it at 720p."
                : issue);
            }
          }
          const id = newId("media");
          const persisted = await putBlob(id, savedFile);
          // Never point an uploaded video at a transient URL that cannot be
          // restored from IndexedDB after closing Safari.
          if (kind === "video" && !persisted) throw new Error("This video couldn't be saved on your device. Try a shorter clip.");
          items.push({ id, kind, source: "upload", url: URL.createObjectURL(savedFile), name: savedFile.name, mimeType: savedFile.type, persisted, displayDurationSec });
        } catch (error) {
          skipped.push(`${f.name}: ${error instanceof Error ? error.message : "This file could not be added."}`);
        } finally {
          processed++;
          setMediaImport({ total: supported.length, completed: processed, detail: undefined });
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      }
      if (items.length) {
        if (replaceIndex !== undefined) {
          patch({ memories: frames.length ? frames.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: items[0]!.kind === "video" ? items[0]!.displayDurationSec : m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition } : m)) : shown.map((m, i) => (i === replaceIndex ? { ...items[0]!, displayDurationSec: items[0]!.displayDurationSec } : m)) });
          toast.success("Moment updated");
        } else {
          patch({ memories: [...frames, ...items] });
          toast.success(`${items.length} ${items.length === 1 ? "moment" : "moments"} added`);
        }
      }
      if (skipped.length) toast.error(skipped.length === 1 ? skipped[0]! : `${skipped.length} files skipped. ${skipped[0]}`, { duration: 8000 });
      if (items.some((item) => !item.persisted)) toast.warning("Some photos may not be stored on this device. Keep this page open until your account finishes syncing.");
      if (supported.length !== files.length) toast.info("Some selected files weren't recognized as photos or videos.");
    } finally {
      setMediaImport(null);
      setBusy(false);
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
    // The active photo keeps its identity after a reorder. Move the playback
    // head to its NEW scaled time as well, otherwise the next audio timeupdate
    // unexpectedly selects the photo that previously occupied this position.
    const duration = rec?.audioUrl && !rec.demo && rec.durationSec > 0
      ? rec.durationSec
      : Math.max(rec?.durationSec ?? 0, filmTotal(list));
    const time = sceneSeekTime(list, to, duration);
    setEditorPlaying(false);
    editorAudioRef.current?.pause();
    if (editorAudioRef.current) editorAudioRef.current.currentTime = time;
    setEditorTime(time);
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
  const stopVoiceSample = () => {
    const active = voiceSampleRef.current;
    if (!active) return;
    voiceSampleRef.current = null;
    if (active.timer !== null) window.clearTimeout(active.timer);
    active.audio.onended = null;
    active.audio.pause();
    active.audio.removeAttribute("src");
    active.audio.load();
    void active.mixer.stop();
    setVoiceSampling(null);
  };
  const toggleVoiceSample = async (tone: VoiceTone) => {
    if (voiceSampleRef.current?.tone === tone) { stopVoiceSample(); return; }
    stopVoiceSample();
    if (!rec?.audioUrl || rec.demo) {
      toast.info("Record your own voice first to hear these effects.");
      return;
    }
    stopMusicSample();
    setMusicSampling("");
    if (musicSampleTimer.current) window.clearTimeout(musicSampleTimer.current);
    musicSampleTimer.current = null;
    const audio = new Audio(rec.audioUrl);
    audio.preload = "auto";
    const mixer = createKeepVoiceMix(audio, project.musicMood, "Soft", Math.max(rec.durationSec, 10), 0, { voiceTone: tone, voiceMuted: false, musicMuted: true });
    if (!mixer) {
      toast.error("Voice samples are not supported in this browser.");
      return;
    }
    const sample = { tone, audio, mixer, timer: null as number | null };
    voiceSampleRef.current = sample;
    mixer.setTrackMutes(false, true);
    mixer.setLevels(85, 0);
    audio.onended = () => { if (voiceSampleRef.current === sample) stopVoiceSample(); };
    setVoiceSampling(tone);
    try {
      // Both playback requests start inside the same tap for iOS Safari audio permissions.
      const audioStart = audio.play();
      const graphStart = mixer.play();
      await Promise.all([audioStart, graphStart]);
      if (voiceSampleRef.current === sample) {
        sample.timer = window.setTimeout(() => { if (voiceSampleRef.current === sample) stopVoiceSample(); }, 8000);
      }
    } catch {
      if (voiceSampleRef.current === sample) stopVoiceSample();
      toast.error("Couldn't play that voice sample. Tap to try again.");
    }
  };
  useEffect(() => {
    if (screen !== "storyStyle" && voiceSampleRef.current) stopVoiceSample();
  }, [screen]);
  useEffect(() => () => {
    const active = voiceSampleRef.current;
    if (!active) return;
    voiceSampleRef.current = null;
    if (active.timer !== null) window.clearTimeout(active.timer);
    active.audio.pause();
    void active.mixer.stop();
  }, []);

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
      await playMusicSample(trackName, 12);
      musicSampleTimer.current = window.setTimeout(() => {
        setMusicSampling("");
        musicSampleTimer.current = null;
      }, 12000);
    } catch {
      setMusicSampling("");
      toast.error("Music preview isn't available in this browser.");
    }
  };

  useEffect(() => {
    if (screen !== "generating") return;
    if (generation >= 3) {
      const t = window.setTimeout(() => {
        // The previous step remains finishing preferences, not the transient build screen.
        setScreen("editor");
        resetPageScroll();
      }, 650);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setGeneration((n) => n + 1), 1250);
    return () => window.clearTimeout(t);
  }, [screen, generation]);
  const captionLines = project.messageParagraphs.map((p) => (p.split(/(?<=[.!?])\s/)[0] ?? p).trim()).filter(Boolean).slice(0, 8);
  // The recorded voice is the editor's master clock. Photo timing and captions follow it.
  const editorMediaTotal = Math.max(1, filmTotal(shown));
  const editorDuration = rec?.audioUrl && !rec.demo && rec.durationSec > 0
    ? rec.durationSec
    : Math.max(rec?.durationSec ?? 0, editorMediaTotal);
  const editorSceneAt = (time: number) => sceneIndexAt(shown, time, editorDuration);
  const editorCue = captionAtTime(project.captionCues, editorTime);
  const editorCaption = editorCue?.text ?? (rec?.demo ? captionLines[Math.min(captionLines.length - 1, Math.floor(editorTime / Math.max(1, editorDuration / Math.max(1, captionLines.length))))] ?? "" : "");
  const seekEditor = (time: number) => {
    const next = Math.max(0, Math.min(editorDuration, time));
    // Seeking should not restart the soundtrack; that causes audible jumps and drift.
    if (editorAudioRef.current) editorAudioRef.current.currentTime = next;
    setEditorTime(next);
    setFrame(editorSceneAt(next));
  };
  const previewCurrentTransition = () => {
    const index = frame % Math.max(1, shown.length);
    if (index >= shown.length - 1) {
      toast.info("The last photo has no next transition.");
      return;
    }
    const boundary = sceneBoundary(shown, index, editorDuration);
    setEditorPlaying(false);
    seekEditor(Math.max(0, boundary - 0.9));
    window.requestAnimationFrame(() => setEditorPlaying(true));
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
  useEffect(() => { editorMixRef.current?.setVoiceTone(mix.voiceTone ?? "natural"); }, [screen, mix.voiceTone]);

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
     const tick = (now: number) => {
      const elapsed = (now - started) / 1000;
      const audioTime = audio?.currentTime ?? 0;
      // Never advance visuals while a recorded narration is buffering or paused.
      const next = Math.min(editorDuration, voiceClock ? audioTime : initialTime + elapsed);
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
  // Publishing happens as part of finishing, not through a separate "Update" action.
  // A published Keep is always republished under its original ID/token.
  const finishAndShare = async (updated?: KeepProject) => {
    if (publishingLock.current) return;
    const original = updated ?? project;
    if (captionSyncing) { setPublishError("Keep is still syncing your captions. Finish that step before sharing."); return; }
    if (original.captionStyle !== "None" && original.finalVoiceRecording && !original.finalVoiceRecording.demo && !original.captionCues.length) {
      setPublishError("Your captions are missing. Return to the editor, open Captions, and retry syncing before sharing.");
      return;
    }
    const recovered = recoverCaptionTiming(original.captionWords ?? [], original.captionCues, original.finalVoiceRecording?.durationSec ?? 0);
    const current = recovered.repaired ? {
      ...original, captionCues: recovered.cues, captionWords: recovered.words, captionTimingEstimated: true,
    } : original;
    if (current.restoreIncomplete) {
      setPublishError("Finish restoring your saved memories before publishing.");
      return;
    }
    if (current.voiceMode === "together" && (!groupReady || current.groupVoiceSignature !== groupSignature)) {
      setPublishError("Your shared script has changed. Re-record any updated parts and combine your voices again.");
      return;
    }
    publishingLock.current = true;
    setPublishing(true);
    setPublishError("");
    setPublishStatus("Saving your Keep…");
    const publicationId = current.publicationId || crypto.randomUUID();
    // Keep the in-progress screen until publication succeeds. Persist the ID
    // before uploading so network retries never accidentally create a new link.
    const next = { ...current, publicationId };
    setProject((previous) => ({ ...previous, publicationId }));
    saveDraft(next);
    try {
      const result = await publishKeep(next, publicationId, setPublishStatus);
      const complete = { ...next, stage: "success", publicationId: result.keepId, publicationToken: result.token };
      setProject(complete);
      saveDraft(complete);
      // The permanent link is updated before we display the success screen.
      // Persist the editable version as well so Back to editor restores these edits.
      try {
        const session = await activeKeepSession();
        if (session) await saveCloudDraft(complete, session);
      } catch {
        toast.info("Your published Keep is saved. A cloud draft backup will retry when you reopen the editor.");
      }
      setHistory((h) => [...h, screen]);
      setScreen("success");
      resetPageScroll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't save your Keep. Please try again.";
      setPublishError(message);
      toast.error(message);
    } finally {
      publishingLock.current = false;
      setPublishing(false);
      setPublishStatus("");
    }
  };
  const toCard = () => {
    const next = !engraving[0]?.trim()
      ? { ...project, cardEngraving: [(name || "Hanna").toUpperCase(), engraving[1] || "FROM ALEX", engraving[2] || "2026"] }
      : project;
    if (next !== project) setProject(next);
    saveDraft(next);
    // "Done" on an already published Keep also updates the live viewing link.
    if (next.publicationToken) { void finishAndShare(next); return; }
    go("card");
  };
  const totalSec = rec?.durationSec ?? 150;

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
  const fileInputs = <><input ref={draftInput} type="file" accept=".docx,.pdf,.txt,.md,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,application/rtf" className="sr-only" aria-label="Upload something you have already written" tabIndex={-1} onChange={(e) => void importDraft(e)} /><input ref={addInput} type="file" accept="image/*,video/mp4,video/quicktime,video/*" multiple className="sr-only" aria-label="Choose photos and videos" tabIndex={-1} onChange={(e) => void addFiles(e)} /><input ref={replaceInput} type="file" accept="image/*,video/mp4,video/quicktime,video/*" className="sr-only" aria-label="Choose a replacement photo or short video" tabIndex={-1} onChange={(e) => void addFiles(e, frame % Math.max(1, shown.length))} /></>;

  if (resumeError) return <main className="app-shell flex min-h-dvh flex-col px-8 py-10"><a href="/app" className="keep-wordmark" aria-label="Keep home">Keep</a><div className="my-auto max-w-sm"><h1 className="font-display text-[38px] leading-tight">We couldn't open your Keep.</h1><p role="alert" className="mt-5 text-sm leading-7 text-muted-foreground">{resumeError}</p><div className="mt-9 flex flex-col gap-3"><Button variant="keep" size="touch" onClick={() => window.location.reload()}>Try again</Button><a href="/app" className="rounded-xl border border-border px-5 py-3 text-center text-sm">Back to your creations</a></div></div></main>;
  if (!hydrated) return <KeepOpeningScreen phase={openingPhase} progress={openingProgress} onBack={() => window.location.assign("/app")} />;
  return <main className={`app-shell keep-creator-app keep-creator-app--${screen}`}>{fileInputs}
    {mediaImport && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-6 backdrop-blur-[4px]" role="status" aria-live="polite" aria-label="Adding selected photos and videos to Keep">
      <div className="w-full max-w-xs rounded-[22px] border border-[#DED4C8] bg-[#F7F5F2] px-7 py-8 text-center text-[#181614] shadow-[0_25px_80px_rgba(0,0,0,.27)]">
        <Loader2 className="mx-auto mb-5 size-7 animate-spin text-[#7B6551]" />
        <p className="font-display text-[27px] leading-tight">Adding your moments.</p>
        <p className="mt-3 text-[13px] leading-5 text-[#73695F]">{mediaImport.detail ?? `Checking and adding ${mediaImport.total === 1 ? "your moment" : `${mediaImport.total} moments`} to Keep…`}</p>
        {mediaImport.compressionPercent !== undefined && <p className="mt-2 text-[12px] tabular-nums text-[#73695F]">{mediaImport.compressionPercent}% compressed</p>}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#E7DED4]"><div className="h-full rounded-full bg-[#6A5849] transition-[width] duration-200" style={{ width: `${(mediaImport.completed / mediaImport.total) * 100}%` }} /></div>
        <p className="mt-3 text-xs tabular-nums text-[#73695F]">{mediaImport.completed} of {mediaImport.total} added</p>
        <p className="mt-3 text-[11px] text-[#8B8177]">You can continue as soon as these finish saving.</p>
      </div>
    </div>}
    <div key={screen} className={`page-enter keep-screen keep-screen--${screen}`}>
    {screen === "you" && <>{top()}<div className="px-7 pt-8">{title("Your space", "Alex.", "The things worth keeping, all in one place.")}<div className="mt-12 border-t border-border">{[{ label: "My cards", Icon: Radio }, { label: "Downloads & backups", Icon: Download }, { label: "Privacy", Icon: LockKeyhole }, { label: "Help", Icon: CircleHelp }].map(({ label, Icon }) => <Button key={label} variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal" onClick={() => setSetting(label)}><span className="flex items-center gap-4"><Icon className="size-4 text-accent" />{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}{project.active && <Button variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal text-destructive" onClick={() => { if (!window.confirm("Delete your draft Keep? Recordings and photos added to it will be removed from this device.")) return; discard(project); setProject(newProject()); toast.success("Draft deleted"); }}><span className="flex items-center gap-4"><Trash2 className="size-4" />Delete draft Keep</span></Button>}</div><p className="mt-9 text-xs leading-6 text-muted-foreground">Your Keeps are private.</p></div>{setting && sheet(setting, () => setSetting(""), <><p className="mt-5 text-sm leading-7 text-muted-foreground">{setting === "Privacy" ? "Your Keeps are private by default. In this MVP, drafts, recordings and photos stay on this device only. Sharing a card gives its recipient access to that Keep — no account required." : setting === "My cards" ? "HANNA · from Alex · 2026 (sample). Physical card ordering is coming next." : setting === "Downloads & backups" ? "Your draft is saved on this device. Cloud backups and downloads aren't available yet." : "We're here when you need us. Support isn't connected in this preview yet."}</p><Button variant="quiet" className="mt-8 w-full" onClick={() => setSetting("")}>Done</Button></>)}</>}
    {screen === "detail" && <>{top("READY")}<div className="relative mx-4 h-[min(55dvh,520px)] overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-8 left-6"><p className="eyebrow text-foreground">ANNIVERSARY · 2026</p><h1 className="display mt-3 text-5xl">HANNA</h1><p className="mt-3 text-sm">from Alex · 2:30</p></div></div><div className="space-y-3 px-6 pt-7">{nextButton("Play Keep", () => { setViewingDemo(true); go("preview"); })}<Button variant="quiet" size="touch" className="w-full" onClick={editDemoCopy}><Settings2 /> Edit a copy</Button><Button variant="bare" size="touch" className="w-full" asChild><Link to="/recipient" search={{ keep: "" }}><Radio /> View as recipient</Link></Button></div></>}
    {screen === "recipient" && <>{top("01 / 04")}<div className="px-7 pt-11">{title("Begin with someone", "Who is this Keep for?")}<div className="grid grid-cols-2 gap-3" role="group" aria-label="Who is this Keep for?">{relationships.map((r) => <Button key={r} type="button" aria-pressed={project.relationship === r} variant="quiet" className={`keep-choice-bubble ${project.relationship === r ? "keep-choice-bubble--selected" : ""}`} onClick={() => { patch({ relationship: r, ...(r === "Myself" ? { recipientName: "Myself" } : project.relationship === "Myself" ? { recipientName: "" } : {}) }); if (r !== "Someone else") setOtherRelationship(""); }}><span className="min-w-0 flex-1 text-left">{r}</span>{project.relationship === r && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}</Button>)}</div>{project.relationship === "Someone else" && <div className="mt-8 page-enter"><label htmlFor="other-relationship" className="eyebrow">WHO ARE THEY TO YOU?</label><input id="other-relationship" value={otherRelationship} onChange={(e) => setOtherRelationship(e.target.value.slice(0, 50))} placeholder="My coach" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}{project.relationship && project.relationship !== "Myself" && <div className="mt-9 page-enter"><label htmlFor="recipient-name" className="eyebrow">NAME(S)</label><input id="recipient-name" value={name} onChange={(e) => patch({ recipientName: e.target.value.slice(0, 60) })} placeholder="Gigi & Pops" autoComplete="off" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}<div className="mt-10">{nextButton("Continue", () => { if (project.relationship === "Someone else") patch({ relationship: otherRelationship.trim() }); go("occasion"); }, !project.relationship || (project.relationship !== "Myself" && !name.trim()) || (project.relationship === "Someone else" && !otherRelationship.trim()))}</div></div></>}
    {screen === "occasion" && <>{top("02 / 04")}<div className="px-7 pt-11">{title("Give it a moment", "What are you keeping?", "Choose an occasion or moment.")}<div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose an occasion or moment">{occasions.map((o) => <Button key={o} type="button" aria-pressed={project.occasion === o} variant="quiet" className={`keep-choice-bubble ${project.occasion === o ? "keep-choice-bubble--selected" : ""}`} onClick={() => { patch({ occasion: o }); if (o !== "Other") setOtherOccasion(""); }}><span className="min-w-0 flex-1 text-left">{o}</span>{project.occasion === o && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}</Button>)}</div>{project.occasion === "Other" && <div className="mt-8 page-enter"><label className="eyebrow" htmlFor="other-occasion">TELL US WHAT IT'S FOR</label><input id="other-occasion" value={otherOccasion} onChange={(e) => setOtherOccasion(e.target.value.slice(0, 80))} placeholder="Our family Disney trip with Gigi & Pops" className="mt-3 w-full border-0 border-b border-border bg-transparent pb-4 font-display text-3xl outline-none focus:border-accent" /><p className="mt-3 text-xs text-muted-foreground"></p></div>}<div className="mt-12">{nextButton("Continue", () => { if (project.occasion === "Other") patch({ occasion: otherOccasion.trim() }); go("voices"); }, project.occasion === "Other" && !otherOccasion.trim())}</div></div></>}
    {screen === "voices" && <>{top("03 / 05")}<div className="mx-auto max-w-[620px] px-7 pb-12 pt-9">
      {title("The voices behind it", "Will anyone create this Keep with you?", "Most Keeps are made by one person. You can also bring several voices together in one gift.")}
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose how many voices">
        <button type="button" aria-pressed={project.voiceMode !== "together"} onClick={() => patch({voiceMode:"solo"})} className={`min-h-[140px] rounded-2xl border p-5 text-left transition-colors ${project.voiceMode !== "together" ? "border-[#B49B7F] bg-[#F3EADD]" : "border-border bg-card"}`}>
          <Mic className="mb-5 size-6 text-[#78634E]" /><span className="block font-display text-2xl">Just me</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">One voice, one heartfelt message.</span>
        </button>
        <button type="button" aria-pressed={project.voiceMode === "together"} onClick={() => patch({voiceMode:"together",contributors:(project.contributors?.length ?? 0) >= 2 ? project.contributors : [{id:newId("speaker"),name:""},{id:newId("speaker"),name:""}]})} className={`min-h-[140px] rounded-2xl border p-5 text-left transition-colors ${project.voiceMode === "together" ? "border-[#B49B7F] bg-[#F3EADD]" : "border-border bg-card"}`}>
          <span className="mb-5 block text-2xl text-[#78634E]">♡</span><span className="block font-display text-2xl">Create together</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">Different voices. One beautiful Keep.</span>
        </button>
      </div>
      {project.voiceMode === "together" && <div className="mt-6 rounded-2xl border border-border bg-white/40 p-5">
        <h2 className="font-display text-2xl">Who will speak?</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Add each person's first name. Later you'll choose who says each part and pass the phone around to record.</p>
        <div className="mt-5 space-y-3">{(project.contributors ?? []).map((person,i) => <div key={person.id} className="flex items-center gap-2">
          <label className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Voice {i+1}</span>
            <input aria-label={`Voice ${i+1} name`} placeholder={i===0?"Your name":i===1?"Second person's name":"Contributor name"} maxLength={60} value={person.name} onChange={event=>patch({contributors:(project.contributors ?? []).map(p=>p.id===person.id?{...p,name:event.target.value}:p)})} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base outline-none focus:border-accent"/></label>
          {(project.contributors?.length ?? 0) > 2 && <button type="button" aria-label={`Remove ${person.name || `voice ${i+1}`}`} className="mt-5 rounded-lg border border-border p-3 text-muted-foreground" onClick={()=>patch({contributors:(project.contributors ?? []).filter(p=>p.id!==person.id)})}><Trash2 className="size-4"/></button>}
        </div>)}</div>
        {(project.contributors?.length ?? 0) < 8 && <Button variant="bare" size="sm" className="mt-3" onClick={()=>patch({contributors:[...(project.contributors ?? []),{id:newId("speaker"),name:""}]})}><Plus className="size-4"/> Add another voice</Button>}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Everyone records separately on this device. Keep brings the recordings together with the music, photos and captions.</p>
      </div>}
      <div className="mt-8">{nextButton("Continue",()=>go("intent"),project.voiceMode === "together" && ((project.contributors?.length ?? 0)<2 || (project.contributors ?? []).some(p=>!p.name.trim()) || new Set((project.contributors ?? []).map(p=>p.name.trim().toLowerCase())).size !== (project.contributors?.length ?? 0)))}</div>
    </div></>}
    {screen === "intent" && <>{top("04 / 05")}<div className="px-7 pt-11">{title("The reason behind it", "Why does this Keep matter to you?", "What would you like them to remember?")}<textarea value={project.intent} onChange={(e) => patch({ intent: e.target.value.slice(0, 500) })} placeholder="I want Gigi & Pops to know how special it was watching them experience Disney through our kids' eyes, and I want our family to always remember this trip together." className="min-h-44 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-7 outline-none focus:border-accent" /><div className="mt-4 grid grid-cols-2 gap-2"><Button variant={dictating && dictationTargetRef.current === "intent" ? "selected" : "quiet"} className="h-12" onClick={() => toggleDictation("intent")}>{dictating && dictationTargetRef.current === "intent" ? <Square className="mr-2 size-4" fill="currentColor" /> : <Mic className="mr-2 size-4" />}{dictating && dictationTargetRef.current === "intent" ? "Stop" : "Speak"}</Button><Button variant="quiet" className="h-12" onClick={() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus()}><Keyboard aria-hidden="true" className="mr-2 size-4" />Type</Button></div>{dictating && dictationTargetRef.current === "intent" && <p className="mt-3 text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear above as you talk. Tap Stop when you're finished.</p>}<div className="mt-10">{nextButton("Continue", () => go("path"), !project.intent.trim())}</div></div></>}
    {screen === "path" && <>{top("05 / 05")}<div className="px-7 pt-11">
      {title("The heart of it", "What do you want to say?")}
      <div className="keep-creator-path-options grid grid-cols-1 gap-3">
        <Button variant="quiet" className="keep-editorial-surface relative h-auto min-h-[190px] w-full !items-start !justify-start p-6 pr-14 text-left whitespace-normal" onClick={startInterview}>
          <span className="block min-w-0 flex-1">
            <Sparkles className="mb-7 size-6 text-accent" />
            <strong className="block max-w-[18ch] font-display text-3xl font-normal leading-[1.15]">Help me find the words</strong>
            <small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">A few thoughtful questions to guide you.</small>
          </span>
          <ArrowRight aria-hidden="true" className="!absolute right-6 top-6 !size-5" />
        </Button>
        <Button variant="quiet" className="keep-editorial-surface relative h-auto min-h-[190px] w-full !items-start !justify-start p-6 pr-14 text-left whitespace-normal" onClick={() => go("write")}>
          <span className="block min-w-0 flex-1">
            <span className="mb-7 block font-display text-3xl text-accent">“</span>
            <strong className="block max-w-[18ch] whitespace-normal font-display text-3xl font-normal leading-[1.15]">I know what I want to say</strong>
            <small className="mt-3 block text-sm font-normal leading-6 text-muted-foreground">Speak, type, or upload your words.</small>
          </span>
          <ArrowRight aria-hidden="true" className="!absolute right-6 top-6 !size-5" />
        </Button>
      </div>
    </div></>}
    {screen === "interview" && <div
      className="keep-interview-screen flex min-h-0 w-full flex-col overflow-hidden bg-background"
      style={{ height: interviewViewportHeight ? `${interviewViewportHeight}px` : "100dvh" }}
    >
      {top()}
      <div className={`shrink-0 px-6 pt-4 ${interviewKeyboardOpen ? "pb-2" : "pb-4"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow !text-[10px]">YOUR STORY, YOUR WORDS</p>
          <p className="text-[11px] tabular-nums text-muted-foreground">Question {q + 1} · about 7 total</p>
        </div>
        <div className="mt-3 grid h-[5px] gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(7, q + 1)}, minmax(0, 1fr))` }}
             role="progressbar" aria-label="Interview progress" aria-valuemin={0}
             aria-valuemax={Math.max(7, q + 1)} aria-valuenow={Math.min(q + 1, Math.max(7, q + 1))}
             aria-valuetext={`Question ${q + 1} of approximately 7; the interview may finish a little sooner or later.`}>
          {Array.from({ length: Math.max(7, q + 1) }, (_, i) =>
            <span key={i} className={`h-[4px] rounded-full ${i < completedAnswers ? "bg-accent" : i === q ? "bg-accent/60" : "bg-border"}`} />)}
        </div>
      </div>
      <div key={q} className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5 pt-4">
        {!aiReady ? <div className="mx-auto max-w-md py-4 text-center page-enter">
          <h1 className="font-display text-3xl leading-tight">Let's find your words another way.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">The guided interview is temporarily unavailable. You can still write your message.</p>
        </div> : aiBusy === "start" || aiBusy === "next" ? <div className="mx-auto max-w-md py-8 text-center page-enter">
          {wave(17,true)}
          <p className="mt-5 font-display text-2xl">{aiBusy === "start" ? "Getting ready to listen…" : "Thinking about your words…"}</p>
        </div> : !project.interviewQuestion ? <p className="mx-auto max-w-md py-8 text-center font-display text-2xl">{aiError ? aiErrorText : "Getting ready to listen…"}</p>
        : <div className="mx-auto max-w-md page-enter">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[.18em] text-accent">A question for you</p>
          <h1 className="font-display text-[clamp(25px,6.6vw,35px)] font-normal leading-[1.16] tracking-[-.025em] text-foreground">{project.interviewQuestion}</h1>
          {currentAnswer?.audioUrl && !isRecording && <div className="mt-5 rounded-xl border border-border bg-card/60 p-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Your recorded answer · {fmt(currentAnswer.durationSec ?? 0)}</p>
            <audio controls src={currentAnswer.audioUrl} className="w-full" preload="metadata" />
          </div>}
          {aiBusy === "transcribe" && <p role="status" className="mt-5 text-sm text-accent animate-pulse">Turning your recording into words…</p>}
          {micUnavailable && <p className="mt-4 text-xs leading-5 text-muted-foreground">{micMessage} You can type your answer instead.</p>}
        </div>}
        {aiError && aiReady && <div className="mx-auto mt-5 max-w-md border-l-2 border-accent pl-4 text-left" role="alert">
          <p className="text-sm leading-6">{aiErrorText}</p>
          <Button variant="bare" size="sm" className="mt-2 px-0 text-accent" onClick={aiError.retry}><RotateCcw /> Retry</Button>
        </div>}
      </div>
      <div className={`z-10 w-full shrink-0 border-t border-border/75 bg-background px-5 pt-3 shadow-[0_-12px_30px_rgba(0,0,0,.045)] ${interviewKeyboardOpen ? "pb-2" : "pb-[max(18px,env(safe-area-inset-bottom))]"}`}>
        {!aiReady ? <Button variant="keep" size="touch" className="w-full justify-between" onClick={() => go("write")}>Write it myself <ArrowRight /></Button>
        : isRecording ? <div className="space-y-3">
          <p role="status" className="text-center text-sm tabular-nums text-accent">● Recording · {fmt(recorder.elapsed)}</p>
          <Button variant="keep" size="touch" className="w-full" onClick={() => void stopAnswer()}><Square fill="currentColor" /> Stop recording</Button>
        </div> : !project.interviewQuestion ? <Button variant="quiet" size="touch" className="w-full" onClick={() => go("write")}>Write it myself</Button>
        : <div className="mx-auto max-w-md">
          {aiBusy !== "transcribe" && <>
            <label htmlFor="keep-interview-answer" className="mb-2 block text-xs font-medium text-foreground/75">Your answer</label>
            <textarea id="keep-interview-answer" aria-label="Your answer" value={currentAnswer?.transcript ?? ""}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onFocus={() => setInterviewInputFocused(true)}
              onBlur={() => setInterviewInputFocused(false)}
              placeholder="Tap here to type your answer…"
              rows={interviewKeyboardOpen ? 2 : 3}
              className="block w-full min-h-[76px] max-h-[19dvh] resize-none overflow-y-auto rounded-xl border border-border bg-card px-4 py-3 text-left text-[16px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/75 focus:border-accent focus:ring-1 focus:ring-accent/20"
            />
          </>}
          <div className="mt-3 space-y-2">
            {currentAnswer?.transcript?.trim()
              ? <Button variant="keep" size="touch" className="w-full justify-between" disabled={!!aiBusy} onClick={nextQuestion}>Continue <ArrowRight /></Button>
              : !micUnavailable && aiBusy !== "transcribe"
                ? <Button variant="keep" size="touch" className="w-full" disabled={!!aiBusy || recorder.status === "requesting" || recorder.supported === null} onClick={() => void startAnswer()}><Mic className="size-4" /> {recorder.status === "requesting" ? "Waiting for microphone…" : "Or tap to speak"}</Button>
                : aiBusy === "transcribe" ? <p className="py-2 text-center text-xs text-muted-foreground">Saving your words…</p> : null}
            {!interviewKeyboardOpen && !interviewInputFocused && (currentAnswer?.transcript?.trim() ? !micUnavailable : true) && !micUnavailable && !!currentAnswer?.transcript?.trim() && <Button variant="bare" size="sm" className="w-full text-muted-foreground" disabled={!!aiBusy} onClick={() => void startAnswer()}><Mic className="size-4" /> Record again</Button>}
            {!interviewKeyboardOpen && !interviewInputFocused && <Button variant="bare" size="sm" className="w-full text-muted-foreground" onClick={() => go("write")}>Write it myself</Button>}
          </div>
        </div>}
      </div>
    </div>}
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
    {screen === "write" && <>{top("05 / 05")}<div className="px-7 pb-12 pt-9">{title("In your own words", "Bring us what you want to say.", "Speak it, type it, or upload something you've already written. Aim for 2–3 minutes, but make it yours.")}<div className="mb-5 grid grid-cols-3 gap-2"><Button variant={writeInputMode === "speak" ? "selected" : "quiet"} className="h-20 flex-col px-2" onClick={() => { setWriteInputMode("speak"); toggleDictation("write"); }}>{dictating && writeInputMode === "speak" ? <Square fill="currentColor" /> : <Mic />}{dictating && writeInputMode === "speak" ? "Stop" : "Speak"}</Button><Button variant={writeInputMode === "type" ? "selected" : "quiet"} className="h-20 flex-col px-2" onClick={() => { setWriteInputMode("type"); if (dictationRef.current && dictating) dictationRef.current.stop(); window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your message"]')?.focus(), 0); }}><MessageCircle />Type</Button><Button variant={writeInputMode === "upload" ? "selected" : "quiet"} className="h-20 flex-col px-2" disabled={busy} onClick={() => draftInput.current?.click()}><FileUp />{busy ? "Reading…" : "Upload"}</Button></div>{dictating && writeInputMode === "speak" && <div className="mb-4 rounded-sm border border-accent/40 p-4 text-center page-enter"><div className="mb-2 flex items-center justify-center gap-2 text-sm text-accent"><span className="size-2 animate-pulse rounded-full bg-accent" />Listening</div><p className="text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear below as you talk. Tap Stop when you're finished.</p></div>}{uploadedDraftName && writeInputMode === "upload" && <div className="mb-4 flex items-center justify-between rounded-sm border border-border px-4 py-3 page-enter"><span className="min-w-0"><span className="eyebrow block">IMPORTED</span><span className="mt-1 block truncate text-xs text-muted-foreground">{uploadedDraftName}</span></span><Button variant="bare" size="sm" className="shrink-0 text-muted-foreground" onClick={() => draftInput.current?.click()}>Replace</Button></div>}<KeepLengthGuide text={project.writtenText} className="mb-4" /><textarea aria-label="Your message" value={project.writtenText} onChange={(e) => { setWriteInputMode("type"); patch({ writtenText: e.target.value }); }} placeholder="Start here…" rows={12} className="min-h-[320px] w-full resize-y rounded-sm border border-border bg-transparent p-4 font-display text-[22px] leading-[1.35] outline-none focus:border-accent" /><div className="mt-3 flex items-center justify-between"><Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => { patch({ writtenText: "" }); setUploadedDraftName(""); setWriteInputMode("type"); }}>Clear</Button><span className="text-[10px] tracking-wide text-muted-foreground">DOCX · PDF · TXT · MD · RTF</span></div><div className="mt-8">{nextButton("Continue", () => { const paras = project.writtenText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); patch({ messageParagraphs: paras, messageSource: "own", paragraphSpeakers: paras.map((_,i)=>project.contributors?.[i % Math.max(1,project.contributors?.length ?? 0)]?.id ?? "") }); setActiveParagraph(0); go("message"); }, !project.writtenText.trim())}</div></div></>}
    {screen === "message" && <>{top()}
      <div className="mx-auto max-w-[650px] px-7 pb-32 pt-9">
        {title("", project.messageSource === "own" ? "Your message." : "Your message is ready.", "These are your words. Make them yours, or let Keep help you shape them.")}
        <KeepLengthGuide text={project.messageParagraphs.join(" ")} className="mb-6" />
        {isTogether && <div className="mb-6 rounded-xl border border-[#D0BDA4] bg-[#F1E7D9] p-4 text-[#453B31]"><h2 className="font-display text-[23px]">A Keep from all of you.</h2><p className="mt-2 text-xs leading-5">Choose whose voice reads each paragraph. Add or split paragraphs wherever the speaker changes, then record each turn separately.</p></div>}
        {appliedAiOriginal && appliedAiOriginal.changedIndexes.length > 0 && <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#C9B092] bg-[#F3E9DB] px-4 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#44382B] text-white"><Check className="size-3.5" /></span>
          <p className="text-[12px] leading-5 text-[#554639]"><strong className="font-semibold">Keep AI updated your message.</strong> The revised wording is highlighted below. Tap any highlighted paragraph to edit it yourself.</p>
        </div>}
        <div className="space-y-3">
          {project.messageParagraphs.map((p, i) => {
            const highlighted = !!appliedAiOriginal?.changedIndexes.includes(i) && editingAiParagraph !== i && appliedAiOriginal.before[i] !== p;
            return <div key={i} className={`rounded-xl border ${highlighted ? "border-[#BDA080] bg-[#FAF3E8]" : "border-[#E4DDD4] bg-white/40"}`}>
              {highlighted ? <button type="button" aria-label={`Edit updated paragraph ${i + 1}`} className="w-full p-4 text-left" onClick={() => { setActiveParagraph(i); setEditingAiParagraph(i); }}>
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6A5849]"><span>PARAGRAPH {i+1} · KEEP AI EDITED</span><span className="flex items-center gap-1 font-medium"><Settings2 className="size-3.5"/> Edit</span></div>
                <p className="whitespace-pre-wrap font-display text-[22px] leading-[1.42] text-[#211C18]"><KeepWordChanges before={appliedAiOriginal!.before[i] ?? ""} after={p}/></p>
              </button> : <textarea aria-label={`Message paragraph ${i + 1}`} rows={Math.max(3,Math.ceil(p.length / 44))}
                value={p} onFocus={() => setActiveParagraph(i)} onChange={(event) => {
                  patch({ messageParagraphs: project.messageParagraphs.map((item,j) => i === j ? event.target.value : item) });
                  if (appliedAiOriginal?.changedIndexes.includes(i)) setAppliedAiOriginal((old) => old ? { ...old, changedIndexes: old.changedIndexes.filter((j) => j !== i) } : null);
                }}
                className="w-full resize-y bg-transparent p-4 font-display text-[22px] leading-[1.42] text-foreground outline-none focus:ring-1 focus:ring-[#9D856D]" />}
              {isTogether && <label className="flex items-center justify-between gap-3 border-t border-[#E4DDD4] px-4 py-3 text-xs text-[#6A5849]"><span className="font-medium">Read by</span><select aria-label={`Speaker for paragraph ${i+1}`} value={speakerFor(i)} onChange={event=>patch({paragraphSpeakers:project.messageParagraphs.map((_,j)=>j===i?event.target.value:speakerFor(j))})} className="min-w-0 max-w-[70%] rounded-lg border border-[#D2C3B2] bg-[#FFFDF9] px-3 py-2 text-sm text-[#30271F]">{(project.contributors ?? []).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            </div>;
          })}
        </div>
        {isTogether && project.messageParagraphs.length===1 && <Button variant="quiet" size="touch" className="mt-4 w-full" onClick={()=>{ const paragraphs=splitForVoices(project.messageParagraphs[0]??"",(project.contributors??[]).length); if(paragraphs.length<2){toast.info("Add another paragraph to give someone else a turn.");return;} patch({messageParagraphs:paragraphs,paragraphSpeakers:paragraphs.map((_,i)=>project.contributors?.[i%(project.contributors?.length??1)]?.id??"")}); }}>Split this message into speaking parts <ArrowRight className="size-4"/></Button>}
        <Button variant="bare" size="sm" className="mt-4 text-[#786B5D]" onClick={() => { patch({ messageParagraphs: [...project.messageParagraphs, ""], paragraphSpeakers: [...project.messageParagraphs.map((_,i)=>speakerFor(i)),project.contributors?.[project.messageParagraphs.length % Math.max(1,project.contributors?.length ?? 0)]?.id ?? ""] }); setActiveParagraph(project.messageParagraphs.length); }}>
          <Plus className="size-4"/> Add paragraph
        </Button>
        <button type="button" onClick={openAskKeep} className="group mt-8 flex min-h-[82px] w-full items-center gap-4 rounded-2xl border border-[#C5B6A1] bg-[#28231F] px-5 text-left text-[#FAF8F5] shadow-[0_10px_26px_rgba(38,31,25,.13)] transition-transform active:scale-[.99]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#C9B69C]/40 bg-[#C9B69C]/15"><Sparkles className="size-6 text-[#E7D4B7]" strokeWidth={1.6}/></span>
          <span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-[15px] font-medium">Ask Keep AI</strong><small className="text-[11px] leading-4 text-[#C8BCAD]">Make your message more personal, emotional or polished</small></span>
          <ArrowRight className="size-5 shrink-0 text-[#D9C6AA] transition-transform group-hover:translate-x-1"/>
        </button>
        {isTogether && project.messageParagraphs.filter(p=>p.trim()).length < 2 && <p className="mt-4 text-xs text-[#806B57]">Create at least two speaking parts so everyone can take a turn.</p>}
        <div className="mt-5">{nextButton(isTogether ? "Record together" : "Record Your Keep", () => {
          patch({ messageParagraphs: project.messageParagraphs.filter((p) => p.trim()), paragraphSpeakers: project.messageParagraphs.map((p,i)=>p.trim()?speakerFor(i):"").filter(Boolean) });
          setAppliedAiOriginal(null);
          go("recordPrep");
        }, !project.messageParagraphs.some((p) => p.trim()) || (isTogether && project.messageParagraphs.filter(p=>p.trim()).length < 2))}</div>
      </div>
      {askOpen && <KeepAskAIModal
        paragraphs={project.messageParagraphs}
        activeParagraph={activeParagraph}
        onParagraph={setActiveParagraph}
        busy={askBusy}
        error={askError}
        suggestion={askSuggestion}
        instruction={askLastInstruction}
        scope={askLastScope}
        onAction={(instruction, scope) => { void askKeep(instruction, scope); }}
        onApply={applyAskSuggestion}
        onDismiss={() => { if (askBusy) return; setAskOpen(false); setAskSuggestion(null); setAskError(""); }}
      />}
    </>}
    {screen === "recordPrep" && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#111113]/65 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] backdrop-blur-[5px]">
      <section role="dialog" aria-modal="true" aria-labelledby="record-tips-title" aria-describedby="record-tips-intro" className="flex max-h-[calc(100dvh-32px)] w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] border border-[#E6DED3] bg-[#F7F5F2] text-[#0B0B0B] shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        <div className="min-h-0 overflow-y-auto px-7 pt-7 sm:px-9 sm:pt-9">
          <div className="mb-6 flex size-11 items-center justify-center rounded-full border border-[#D8C5AC] bg-[#EAE1D7]"><Mic className="size-5 text-[#6A5849]" strokeWidth={1.65} /></div>
          <h2 id="record-tips-title" className="font-display text-[clamp(35px,9vw,44px)] leading-[1.04] tracking-[-.035em]">Before you record.</h2>
          <p id="record-tips-intro" className="mt-4 max-w-[34ch] text-[14px] leading-6 text-[#746E67]">{isTogether ? "Each person records their own section. Pass the phone around, and Keep will combine your voices." : "It doesn't need to sound perfect. It just needs to sound like you."}</p>
          <p className="mt-3 text-[12px] leading-5 text-[#746E67]">Your message is about {intendedSpeakingTime} when read naturally. Two to three minutes is a great guide, not a rule.</p>
          <div className="mt-7 divide-y divide-[#DDD5CB] border-y border-[#DDD5CB]">
            {([
              ["Find a quiet space", "Silence notifications and keep your phone about 6–12 inches away."],
              ["Speak to them", "Imagine they're right there with you. Read naturally, not like a performance."],
              ["Take your time", "Go a little slower. Pauses are welcome."],
              ["Keep the real moments", "A laugh, a stumble, or a little emotion makes it yours."],
            ] as const).map(([heading, explanation], i) => <div key={heading} className="flex gap-4 py-3.5">
              <span className="pt-0.5 font-display text-[21px] leading-none text-[#A98D72]">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0"><h3 className="text-[14px] font-medium leading-5">{heading}</h3><p className="mt-1 text-[12px] leading-[1.55] text-[#746E67]">{explanation}</p></div>
            </div>)}
          </div>
        </div>
        <div className="shrink-0 bg-[#F7F5F2] px-7 pb-7 pt-5 sm:px-9 sm:pb-9">
          <Button autoFocus variant="keep" size="touch" className="keep-premium-action w-full justify-between" onClick={() => { setGroupPartIndex(0); setScreen(isTogether ? "groupRecord" : "record"); resetPageScroll(); }}>I'm ready <ArrowRight className="size-5" /></Button>
          <p className="mt-3 text-center text-[11px] leading-5 text-[#746E67]">Recording begins only when you tap Start Recording.</p>
        </div>
      </section>
    </div>}
    {(screen === "record" || screen === "recordPrep") && <div inert={screen === "recordPrep"} aria-hidden={screen === "recordPrep"} className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">{top()}</div>
      <div className="mx-auto flex min-h-0 w-full max-w-[650px] flex-1 flex-col px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-7">
        <div className="shrink-0 pb-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#7C6752]">YOUR VOICE · YOUR WORDS</p>
          <h1 className="mt-1 font-display text-[clamp(28px,7.2vw,40px)] leading-[1.05] tracking-[-.025em]">Now say it in your own voice.</h1>
          {!isRecording && <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">Read naturally. The words will scroll for you.</p>}
        </div>
        <KeepTeleprompter text={project.messageParagraphs.join("\n\n")} label="YOUR MESSAGE" speaker="Your voice" isRecording={isRecording} isPaused={recorder.status === "paused"} elapsed={recorder.elapsed} />
        <div className="shrink-0 pt-3">
          {micUnavailable ? <>
            <p role="alert" className="mb-2 text-center text-xs text-destructive">{micMessage}</p>
            <Button variant="keep" size="touch" className="w-full" onClick={useDemoRecording}>Use demo recording (2:30)</Button>
          </> : !isRecording ? (
            <Button variant="keep" size="touch" className="w-full" disabled={recorder.status === "requesting" || recorder.supported !== true} onClick={() => void startFinal()}>
              {recorder.status === "requesting" ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
              {recorder.status === "requesting" ? "Waiting for microphone…" : "Start recording"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {recorder.canPause && <Button variant="quiet" size="touch" className="flex-1" onClick={() => recorder.status === "paused" ? recorder.resume() : recorder.pause()}>
                {recorder.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
                {recorder.status === "paused" ? "Resume" : "Pause"}
              </Button>}
              <Button variant="keep" size="touch" className="flex-1" onClick={() => void finishFinal()}><Check className="size-4" /> Finish recording</Button>
            </div>
          )}
        </div>
      </div>
    </div>}
    {screen === "groupRecord" && <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">{top()}</div>
      <div className="mx-auto flex min-h-0 w-full max-w-[650px] flex-1 flex-col px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-7">
        <div className="shrink-0 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7C6752]">CREATE TOGETHER · {readyCount} OF {project.messageParagraphs.length} PARTS SAVED</p>
          <h1 className="mt-1 font-display text-[clamp(29px,7.5vw,42px)] leading-[1.07] tracking-[-.025em]">Every voice matters.</h1>
          {!isRecording && <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">Each person reads their turn. Pass the phone when you're done.</p>}
        </div>
        <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a recording part">
          {project.messageParagraphs.map((p,i) => <button type="button" key={i} disabled={isRecording || groupBusy} aria-pressed={groupPartIndex === i} aria-label={"Part " + (i+1) + " for " + speakerName(i)} onClick={() => setGroupPartIndex(i)}
            className={groupPartIndex === i ? "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#AE9478] bg-[#EDE2D3] px-3 text-xs font-medium text-[#4A382B] disabled:opacity-65" : "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#DDD2C6] bg-card px-3 text-xs text-foreground disabled:opacity-65"}>
            {readyPart(i) ? <Check className="size-3.5 text-[#6A8462]" /> : <Mic className="size-3.5" />} {i+1}. {speakerName(i)}
          </button>)}
        </div>
        <KeepTeleprompter key={groupPartIndex} text={project.messageParagraphs[groupPartIndex] ?? ""} label={"PART " + (groupPartIndex+1) + " OF " + project.messageParagraphs.length}
          speaker={speakerName(groupPartIndex)} isRecording={isRecording} isPaused={recorder.status === "paused"} elapsed={recorder.elapsed} />
        <div className="shrink-0 space-y-2 pt-2.5">
          {!isRecording && readyPart(groupPartIndex)?.audioUrl && <audio src={readyPart(groupPartIndex)!.audioUrl} controls preload="none" className="h-10 w-full" aria-label={"Review " + speakerName(groupPartIndex) + "'s saved recording"} />}
          {micUnavailable && <p role="alert" className="text-center text-xs text-destructive">{micMessage} A real voice recording is needed for each part.</p>}
          {!isRecording ? (
            <Button variant="keep" size="touch" className="w-full" disabled={groupBusy || micUnavailable || recorder.status === "requesting" || recorder.supported !== true} onClick={() => void startFinal()}>
              {recorder.status === "requesting" ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              {readyPart(groupPartIndex) ? "Re-record this part" : "Record " + speakerName(groupPartIndex) + "'s part"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {recorder.canPause && <Button variant="quiet" size="touch" className="flex-1" onClick={() => recorder.status === "paused" ? recorder.resume() : recorder.pause()}>
                {recorder.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
                {recorder.status === "paused" ? "Resume" : "Pause"}
              </Button>}
              <Button variant="keep" size="touch" className="flex-1" disabled={groupBusy} onClick={() => void finishGroupPart()}>
                {groupBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {groupBusy ? "Saving part…" : "Save this part"}
              </Button>
            </div>
          )}
          {groupReady && !isRecording && <Button variant="keep" size="touch" className="w-full" disabled={groupBusy} onClick={() => void combineGroupVoices()}>
            {groupBusy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {groupBusy ? "Preparing voices…" : "Bring all voices together"}
          </Button>}
          {!groupReady && !isRecording && <p className="text-center text-[11px] text-muted-foreground">Record all {project.messageParagraphs.length} parts to combine your voices.</p>}
          {!isRecording && <button type="button" disabled={groupBusy} className="block min-h-8 w-full text-center text-[11px] text-[#806B57] disabled:opacity-50" onClick={() => go("message")}>Edit who says what</button>}
        </div>
      </div>
    </div>}
    {screen === "recorded" && <>{top()}<div className="relative flex keep-min-screen-minus-90 flex-col overflow-hidden px-7 pb-[max(36px,env(safe-area-inset-bottom))] pt-8">
      <div className="pointer-events-none absolute left-1/2 top-[31%] h-80 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="relative z-10 text-center">
        
        <h1 className="display mx-auto mt-5 max-w-sm text-[clamp(50px,13vw,68px)] leading-[0.96]">{isTogether ? "Your voices are ready." : "Your voice is ready."}</h1>
        <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-muted-foreground">{isTogether ? "Different people, one heartfelt message. Just the way you wanted them to hear it." : "Not polished. Not performed. Just you — exactly how they should hear it."}</p>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-7">
        {!rec ? <p className="text-sm text-muted-foreground">No recording yet.</p> : rec.demo ? <div className="w-full max-w-sm rounded-2xl border border-accent/20 bg-card/80 p-7 text-center shadow-2xl backdrop-blur">
          <div className="voice-orb mx-auto flex size-24 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.05]"><Play className="ml-1 size-8 text-accent" fill="currentColor" /></div>
          <p className="mt-6 font-display text-2xl">Demo recording</p>
          <p className="mt-2 text-xs text-muted-foreground">No audio attached · 2:30</p>
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
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{rec.durationSec >= 120 && rec.durationSec <= 180 ? "Beautiful — right around the 2–3 minute sweet spot." : "Two to three minutes is a great guide, but your message can be shorter or longer."}</p>
                {!rec.demo && <div className="mt-4">
                  {captionSyncing ? <p className="flex items-center justify-center gap-2 text-[11px] text-accent"><Sparkles className="size-3.5 animate-pulse" /> Syncing captions to your voice…</p> : captionSyncError ? <div><p className="text-[11px] leading-5 text-muted-foreground">Caption timing needs another pass.</p><Button variant="bare" size="sm" className="mt-1 text-accent" onClick={() => void retryCaptionSync()}><RotateCcw /> Retry sync</Button></div> : project.captionCues.length ? <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><Check className="size-3.5 text-accent" /> {project.captionTimingEstimated ? "Captions placed with estimated timing — please review" : "Captions synced to your recording"}</p> : null}
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
        <Button variant="bare" size="touch" className="w-full text-muted-foreground" onClick={() => {setGroupPartIndex(0);go(isTogether ? "groupRecord" : "record");}}><RotateCcw /> Record again</Button>
      </div>
    </div></>}
    {screen === "memories" && <>{top()}<div className="px-7 pb-10 pt-9">
      {title("YOUR MOMENTS", "Add photos & videos.", "Let photos tell most of the story, with a few meaningful video moments mixed in.")}
      <div className="keep-editorial-surface mb-7 px-5 py-5" aria-live="polite">
        <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-medium uppercase tracking-[.14em] text-[#6A5849]">Suggested moments</p>{guidanceSeconds > 0 && <span className="text-[11px] text-muted-foreground">{narrationLengthText}</span>}</div>
        {guidanceSeconds > 0 ? <>
          <p className="mt-3 font-display text-[33px] leading-none text-foreground">{minRecommendedMoments}–{maxRecommendedMoments} <span className="text-[23px]">moments</span></p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.1em] text-[#79654F]">Mostly photos · a few short videos</p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">We recommend mostly <strong>photos</strong>, changing about every 3–5 seconds of narration. Sprinkle in a few <strong>short video clips</strong> when movement adds something special. Photos load faster and keep the viewing experience smooth. {recordedNarrationSec ? "This is based on your recording." : "This is estimated from your message length."} Around {idealRecommendedMoments} total moments is a great starting point.</p>
          <p className="mt-3 text-xs text-[#6A5849]">{photoCount} photos · {videoCount} videos · {personalMedia.length} total{personalMedia.length >= minRecommendedMoments && personalMedia.length <= maxRecommendedMoments ? " · In the suggested range" : personalMedia.length < minRecommendedMoments ? " · " + (minRecommendedMoments - personalMedia.length) + " more to reach the range" : " · More than suggested is okay"}</p>
          {videoCount > photoCount && videoCount >= 3 && <p className="mt-2 text-[11px] leading-5 text-[#806B57]">Tip: add more photos if you can. A photo-first Keep will usually upload and play more smoothly.</p>}
        </> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Add a message or record your voice to see a personalized recommendation. For a 2–3 minute Keep, start with about 30–45 photos, and sprinkle in a few short videos if you wish.</p>}
        <p className="mt-3 border-t border-border/50 pt-3 text-[11px] leading-5 text-muted-foreground">Just a guide — use as many or as few moments as you'd like. You can always add more later.</p>
      </div>
      <aside aria-label="iPhone photo upload tip" className="mb-5 flex items-start gap-3 rounded-xl border border-[#DAD0C5] bg-[#F0EAE2]/65 px-4 py-4">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-[#79654F]" strokeWidth={1.6} aria-hidden="true" />
        <div>
          <p className="text-[12px] font-semibold tracking-[.01em] text-[#44382D]">Quick tip for iPhone uploads</p>
          <p className="mt-1 text-[12px] leading-5 text-[#675B50]">After tapping the blue checkmark in your iPhone library, it may take a moment to prepare your photos or clips. Keep will show progress when the files arrive. Please leave this page open.</p>
        </div>
      </aside>
      <aside aria-label="Video upload recommendation" className="mb-5 flex items-start gap-3 rounded-xl border border-[#DAD0C5] bg-white/50 px-4 py-3.5">
        <Play className="mt-0.5 size-4 shrink-0 text-[#79654F]" aria-hidden="true" />
        <div>
          <p className="text-[12px] font-semibold text-[#44382D]">Adding videos? Keep them short.</p>
          <p className="mt-1 text-[12px] leading-5 text-[#675B50]">Short clips of <strong>10 seconds or less</strong> usually tell the story best. For longer videos, Keep will <strong>automatically compress</strong> the file on your device when possible (up to 90 seconds). This can take a little while. The video plays muted so your narration and music stay front and center.</p>
        </div>
      </aside>
      <div className="keep-creator-photo-grid grid grid-cols-3 gap-1">
        {personalMedia.map((m, i) => <div key={m.id} className="relative aspect-square overflow-hidden bg-card"><MediaView item={m} thumb alt={m.name ?? "Your memory"} className="h-full w-full object-cover" /><button type="button" aria-label={"Remove memory " + (i+1)} onClick={() => removeMemory(i)} className="absolute right-1 top-1 rounded-full bg-black/70 p-2 text-white"><X className="size-4" /></button></div>)}
        <button type="button" onClick={() => addInput.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-2 border border-border text-xs text-muted-foreground"><Plus className="size-5" />{busy ? "Adding…" : "Add moments"}</button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{personalMedia.length} personal moments added</p>
      <div className="mt-10">{nextButton("Continue", () => { setStyleTouched(false); go("storyStyle"); })}</div>
      <Button variant="bare" size="touch" className="mt-3 w-full text-muted-foreground" onClick={() => { setStyleTouched(false); go("storyStyle"); }}>Continue without more photos</Button>
    </div></>}
    {screen === "storyStyle" && <>{top()}<KeepFinishingChoices
      captionStyle={project.captionStyle}
      musicMood={project.musicMood === "Worth Keeping" ? "Intentional" : project.musicMood}
      visualStyle={project.visualStyle}
      voiceTone={mix.voiceTone ?? "natural"}
      tracks={tracks}
      looks={styles}
      previewMedia={personalMedia.find((moment) => !!moment.url)}
      musicSampling={musicSampling}
      voiceSampling={voiceSampling}
      hasVoice={!!rec?.audioUrl && !rec.demo}
      onCaption={(captionStyle) => patch({ captionStyle })}
      onMusic={(musicMood) => patch({ musicMood })}
      onSample={(track) => { void toggleMusicSample(track); }}
      onStyle={(visualStyle) => patch({ visualStyle })}
      onVoice={(voiceTone) => patchMix({ voiceTone })}
      onVoiceSample={(tone) => { void toggleVoiceSample(tone); }}
      onCreate={() => { stopVoiceSample(); createStory(); }}
    /></>}
    {screen === "generating" && <div className="flex keep-h-screen flex-col items-center justify-center px-8 text-center"><div className="relative mb-14 flex size-30 items-center justify-center"><div className="pulse-ring absolute inset-0 rounded-full border border-accent" /><Sparkles className="size-8 text-accent" /></div><h1 key={generation} className="display min-h-32 text-5xl page-enter">{["Gathering your moments…", "Bringing your voice and music together…", "Building your Keep…", "Your film is almost ready…"][generation]}</h1><p className="mt-8 max-w-xs text-xs leading-6 text-muted-foreground">Your selections are coming together into one personal film.</p></div>}
    {screen === "editor" && selected && <div className={`keep-studio ${editorExpanded ? "keep-studio--expanded" : "keep-studio--immersive"}`}>
      {project.restoreIncomplete && <div role="alert" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#AD8F66] bg-[#30281F] px-3 py-3 text-white">
        <p className="text-xs leading-5">Your Keep is open. {project.restoreMissingCount ?? "Some"} files still need restoring. Your saved cloud copy is safe. Cloud saving is paused; tap Retry before making edits.</p>
        <Button type="button" variant="quiet" size="sm" disabled={restoreRetrying} onClick={() => void retryMissingRestore()}>
          <RotateCcw className={`size-3.5 ${restoreRetrying ? "animate-spin" : ""}`} /> {restoreRetrying ? "Restoring" : "Retry"}
        </Button>
      </div>}
      <div className="keep-studio-header flex items-center justify-between px-5 pt-[max(14px,env(safe-area-inset-top))]">
        <Button variant="bare" size="icon" aria-label="Back" onClick={back}><ArrowLeft /></Button>
        <div className="flex items-center gap-1">
          <Button variant="bare" size="icon" aria-label="Undo" disabled={!undoPast.current.length} onClick={() => stepHistory("undo")}><Undo2 className="size-4" /></Button>
          <Button variant="bare" size="icon" aria-label="Redo" disabled={!undoFuture.current.length} onClick={() => stepHistory("redo")}><Redo2 className="size-4" /></Button>
          <Button variant="bare" size="sm" className="text-muted-foreground" onClick={() => { setViewingDemo(false); setPreviewChooserOpen(true); setReadArrangeOpen(false); }}><Play className="size-4" /> Preview</Button>
          <Button variant="keep" size="sm" disabled={!!project.restoreIncomplete} onClick={toCard}>Done <Check className="size-4" /></Button>
        </div>
      </div>

      {rec?.audioUrl && !rec.demo && <audio ref={editorAudioRef} src={rec.audioUrl} preload="metadata" onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; setEditorTime(time); setFrame(editorSceneAt(time)); }} onEnded={() => { if (editorDuration <= (rec?.durationSec ?? 0) + 0.1) { setEditorPlaying(false); setEditorTime(editorDuration); } }} />}
      <div className="keep-studio-stage">
        <div className="keep-studio-canvas-wrap">
          <div className="keep-studio-canvas relative aspect-[9/16] overflow-hidden rounded-2xl bg-card shadow-lg">
            <CinematicMedia item={selected} nextItem={shown[frame + 1]} sceneKey={frame} motionIndex={frame} playing={editorPlaying} duration={sceneDuration(shown, frame, editorDuration)} sceneElapsed={sceneElapsed(shown, frame, editorTime, editorDuration)} className="absolute inset-0" imageClassName={`editor-image-${styleSlug(compareOriginalStyle && editorPanel === "Style" ? "Natural" : project.visualStyle)}`} />
            <div className="absolute inset-0 photo-shade" />
            {editorPanel === "Memories" && <div className="absolute inset-x-0 top-0 bottom-14 z-20 cursor-grab touch-none active:cursor-grabbing" aria-label="Drag photo to reposition" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); photoDrag.current = { x: e.clientX, y: e.clientY, focusX: selected.focusX ?? 50, focusY: selected.focusY ?? 50, width: r.width, height: r.height }; setEditorPlaying(false); }} onPointerMove={(e) => { const d = photoDrag.current; if (!d) return; updateSelectedMoment({ focusX: Math.max(0, Math.min(100, d.focusX - (e.clientX - d.x) / d.width * 100)), focusY: Math.max(0, Math.min(100, d.focusY - (e.clientY - d.y) / d.height * 100)) }); }} onPointerUp={() => { photoDrag.current = null; }} onPointerCancel={() => { photoDrag.current = null; }}><span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1 text-[10px] text-white">Drag photo to reposition</span></div>}

            {project.captionStyle !== "None" && editorCaption && <div className={`absolute left-5 right-5 text-center ${project.captionPosition === "top" ? "top-16" : project.captionPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-32"}`}>
              <p className={`${project.captionStyle === "Film" ? "font-display text-3xl font-normal" : project.captionStyle === "Minimal" ? "text-sm" : project.captionStyle === "Story" ? "font-display text-2xl italic" : project.captionStyle === "Clean" ? "text-sm font-medium" : "text-lg font-semibold"} keep-caption-visible leading-tight drop-shadow-md`} style={{ maxWidth: (project.captionLines ?? 2) === 1 ? "95%" : (project.captionLines ?? 2) === 3 ? "65%" : "80%", marginInline: "auto", whiteSpace: "pre-line" }}>
                {editorCaption}
              </p>
            </div>}

            {editorPanel !== "Memories" && <button type="button" aria-label={editorPlaying ? "Pause video preview" : "Play video preview"} aria-pressed={editorPlaying}
              onClick={() => { if (editorTime >= editorDuration - .1) seekEditor(0); setEditorPlaying(!editorPlaying); }}
              className={`keep-video-play absolute left-1/2 ${editorPanel === "Captions" && project.captionPosition === "middle" ? "top-[26%]" : "top-1/2"} z-30 flex size-17 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-xl backdrop-blur-sm transition-opacity duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${editorPlaying ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"}`}>
              {editorPlaying ? <Pause className="size-7" fill="currentColor" /> : <Play className="ml-1 size-8" fill="currentColor" />}
            </button>}
            <button type="button" aria-label={editorExpanded ? "Hide editing tools" : "Open editing tools"} aria-expanded={editorExpanded}
              onClick={() => { setEditorPlaying(false); setEditorExpanded((value) => !value); setEditorPanel(editorExpanded ? null : "Memories"); }}
              className="keep-studio-edit-toggle absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-xl bg-black/45 px-5 py-2 text-white backdrop-blur-sm">
              <ChevronRight className={`size-5 transition-transform ${editorExpanded ? "rotate-90" : "-rotate-90"}`} strokeWidth={3} />
              <span className="text-[11px] font-semibold">{editorExpanded ? "Close editor" : "Edit"}</span>
            </button>
          </div>
        </div>
      </div>



      {!editorExpanded && <section className="keep-studio-preview-controls" aria-label="Preview playback">
        <button type="button" aria-label={editorPlaying ? "Pause preview" : "Play preview"}
          onClick={() => {
            if (editorTime >= editorDuration - 0.1) seekEditor(0);
            setEditorPlaying((current) => !current);
          }}
          className="keep-studio-preview-play">
          {editorPlaying ? <Pause className="size-[18px]" fill="currentColor" /> : <Play className="ml-0.5 size-[18px]" fill="currentColor" />}
        </button>
        <input type="range" aria-label="Seek through your Keep" min={0} max={Math.max(1,editorDuration)} step={0.1}
          value={Math.min(editorDuration,editorTime)}
          onChange={(e) => { setEditorPlaying(false); seekEditor(Number(e.target.value)); }}
          className="keep-studio-preview-range" />
        <span className="keep-studio-preview-time">{fmt(editorTime)} / {fmt(editorDuration)}</span>
      </section>}

      <div className="keep-studio-workspace" key={editorPanel ?? "preview"}>
      {!rec?.demo && rec?.audioUrl && project.captionStyle !== "None" && !project.captionCues.length && <div className="border-t border-border/60 bg-card/70 px-5 py-3 text-xs"><div className="flex items-center justify-between gap-3"><span>{captionSyncing ? "Syncing captions to your recording…" : captionSyncError ? "Captions did not sync. Your recording is safe." : "Captions are not ready yet."}</span>{!captionSyncing && <Button variant="quiet" size="sm" onClick={() => void retryCaptionSync()}><RotateCcw className="size-3" /> Retry captions</Button>}</div></div>}
      {(editorPanel === "Music" || editorPanel === "Captions" || editorPanel === "Style") && <div className={`border-t border-border/60 bg-card/55 backdrop-blur-md page-enter ${editorPanel === "Captions" || editorPanel === "Music" || editorPanel === "Style" ? "" : "px-5 py-3"}`}>
        {editorPanel === "Music" && <KeepMusicEditor
          tracks={tracks}
          selected={project.musicMood === "Worth Keeping" ? "Intentional" : project.musicMood}
          sampling={musicSampling}
          voiceVolume={project.voiceVolume ?? 60}
          musicVolume={project.musicVolume ?? 60}
          mix={mix}
          onClose={() => { stopMusicSample(); setMusicSampling(""); setEditorExpanded(false); setEditorPanel(null); }}
          onSample={(track) => { void toggleMusicSample(track); }}
          onSelect={(track) => { stopMusicSample(); setMusicSampling(""); patch({musicMood:track}); }}
          onSetVolume={(kind,value) => patch(kind === "voice" ? {voiceVolume:value} : {musicVolume:value})}
          onSetMix={patchMix}
          onHearWithVoice={() => {
            stopMusicSample(); setMusicSampling("");
            if(editorTime >= editorDuration - .1) seekEditor(0);
            setEditorPlaying(true);
          }}
        />}
        {editorPanel === "Captions" && <KeepCaptionEditor
          cues={project.captionCues}
          time={editorTime}
          style={project.captionStyle}
          position={project.captionPosition ?? "bottom"}
          maxLines={project.captionLines ?? 2}
          wordsPerCue={project.captionWordsPerCue ?? 5}
          syncing={captionSyncing}
          syncError={captionSyncError}
          timingEstimated={!!project.captionTimingEstimated}
          hasVoice={!!rec?.audioUrl && !rec.demo}
          canRestore={!!project.captionWords?.length}
          onClose={() => { setEditorExpanded(false); setEditorPanel(null); }}
          onSeek={(seconds) => { setEditorPlaying(false); seekEditor(seconds); }}
          onChangeCaption={(i,text) => patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,text}:c)})}
          onChangeCaptionTime={(i,startTime,endTime) => patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,start:Math.max(0,Math.min(startTime,endTime-.1)),end:Math.min(editorDuration,Math.max(endTime,startTime+.1))}:c)})}
          onChangeStyle={(style) => patch({captionStyle:style})}
          onChangePosition={(position) => patch({captionPosition:position})}
          onChangeLines={(lines) => patch({captionLines:lines})}
          onRegroup={(wordsPerCue) => patch({captionWordsPerCue:wordsPerCue,...(project.captionWords?.length ? {captionCues:groupTimedWords(project.captionWords,wordsPerCue)}:{})})}
          onRestore={() => patch({captionCues:groupTimedWords(project.captionWords ?? [],project.captionWordsPerCue ?? 5)})}
          onRetrySync={() => void retryCaptionSync()}
        />}
        {editorPanel === "Style" && <KeepStyleEditor
          looks={styles}
          currentLook={project.visualStyle}
          moment={selected}
          compareOriginal={compareOriginalStyle}
          onLook={(name) => patch({visualStyle:name})}
          onCompare={setCompareOriginalStyle}
          onClose={() => { setCompareOriginalStyle(false); setEditorExpanded(false); setEditorPanel(null); }}
        />}
      </div>}

      {editorPanel === "Memories" && editorToolPanel("Photos", () => { setEditorExpanded(false); setEditorPanel(null); }, <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose the photos and short videos that bring your words to life. Tap a moment to select it, then use Earlier or Later to reorder. Short video clips work best; longer videos are automatically compressed when supported.</p>
        <div className="thin-scroll mt-5 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Choose a photo to edit">{shown.map((m, i) => <div key={m.id} draggable={typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches} onDragStart={() => { dragFrom.current = i; }} onDragEnd={() => { dragFrom.current = null; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragFrom.current !== null) moveMemory(dragFrom.current, i); dragFrom.current = null; }} className="shrink-0"><Button variant="bare" className={`relative h-24 w-18 overflow-hidden rounded-lg !p-0 touch-manipulation ${i === frame % shown.length ? "ring-2 ring-accent opacity-100" : "opacity-75"}`} aria-label={`Select photo ${i + 1} of ${shown.length}`} aria-pressed={i === frame % shown.length} onClick={() => {
          if (dragFrom.current !== null) return;
          // Film scenes are stretched/compressed to fit the recording. Seeking
          // with unscaled photo lengths made taps select the wrong thumbnail.
          setEditorPlaying(false);
          editorAudioRef.current?.pause();
          seekEditor(sceneSeekTime(shown, i, editorDuration));
          setFrame(i);
        }}><MediaView item={m} thumb alt={m.source === "sample" ? memoryLabels[i % memoryLabels.length] ?? "" : m.name ?? ""} className="h-full w-full object-cover pointer-events-none" />{m.kind === "video" && <Play className="pointer-events-none absolute bottom-1.5 left-1.5 size-3" fill="currentColor" />}</Button></div>)}</div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="quiet" onClick={() => addInput.current?.click()}><Plus /> Add moments</Button>
          <Button variant="quiet" onClick={() => replaceInput.current?.click()}>Replace</Button>
          <Button variant="quiet" disabled={frame % shown.length === 0} onClick={() => moveMemory(frame % shown.length, frame % shown.length - 1)}><ChevronLeft /> Earlier</Button>
          <Button variant="quiet" disabled={frame % shown.length >= shown.length - 1} onClick={() => moveMemory(frame % shown.length, frame % shown.length + 1)}>Later <ChevronRight /></Button>
        </div>
        <div className="mt-5 rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Photo transitions</h3>
            <span className="text-[10px] text-muted-foreground">Moment {frame % shown.length + 1}</span>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Choose how this photo flows into the next one.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([{ key: "fade", label: "Fade", note: "Smooth" }, { key: "dissolve", label: "Dissolve", note: "Soft blend" }, { key: "cut", label: "Instant", note: "No blend" }] as const).map(option =>
              <button key={option.key} type="button" disabled={frame % shown.length >= shown.length - 1} aria-pressed={(selected?.transition ?? "dissolve") === option.key} onClick={() => updateSelectedMoment({ transition: option.key })}
                className={`min-h-[70px] rounded-xl border p-2.5 text-left disabled:opacity-40 ${(selected?.transition ?? "dissolve") === option.key ? "border-[#D2BA99] bg-[#E8E1D7] text-[#171719]" : "border-border bg-[#252326] text-foreground"}`}>
                <span className="block text-xs font-medium">{option.label}</span>
                <span className={`mt-1 block text-[10px] ${(selected?.transition ?? "dissolve") === option.key ? "text-[#5F544B]" : "text-muted-foreground"}`}>{option.note}</span>
              </button>)}
          </div>
          <Button variant="quiet" className="mt-3 w-full" disabled={frame % shown.length >= shown.length - 1} onClick={previewCurrentTransition}>
            <Play className="size-4" /> Preview transition
          </Button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Need to reposition a photo? Drag it in the preview above. Gentle motion is applied automatically.</p>
        <div className="mt-3 flex justify-start border-t border-border pt-4">
          <Button variant="bare" size="sm" disabled={shown.length <= 1} className="text-muted-foreground" onClick={() => removeMemory(frame % shown.length)}><Trash2 className="size-4" /> Remove photo</Button>
        </div>
      </div>)}

      {editorPanel === "Voice" && <KeepVoiceEditor
        hasVoice={!!rec?.audioUrl && !rec.demo}
        duration={rec?.durationSec}
        playing={editorPlaying}
        tone={mix.voiceTone ?? "natural"}
        voiceVolume={project.voiceVolume ?? 60}
        musicVolume={project.musicVolume ?? 60}
        mix={mix}
        onClose={() => { setEditorExpanded(false); setEditorPanel(null); }}
        onEditWords={editWordsFromEditor}
        onRerecord={rerecordFromEditor}
        onPlayPreview={() => { if(editorTime >= editorDuration - .1) seekEditor(0); setEditorPlaying(v=>!v); }}
        onTone={(tone) => { patchMix({ voiceTone: tone }); if (!editorPlaying && !!rec?.audioUrl && !rec.demo) { if (editorTime >= editorDuration - 0.1) seekEditor(0); setEditorPlaying(true); } }}
        onVolume={(kind,value) => patch(kind === "voice" ? {voiceVolume:value} : {musicVolume:value})}
        onMix={patchMix}
      />}

      </div>
      <nav className="keep-studio-tools" aria-label="Editing tools">
        {([{ panel: "Memories", label: "Photos", Icon: Images }, { panel: "Captions", label: "Captions", Icon: MessageCircle }, { panel: "Music", label: "Music", Icon: Music2 }, { panel: "Voice", label: "Voice", Icon: Mic }, { panel: "Style", label: "Style", Icon: Sparkles }] as const).map(({ panel, label, Icon }) => <button key={label} type="button" aria-pressed={editorPanel === panel} onClick={() => { stopMusicSample(); setMusicSampling(""); setCompareOriginalStyle(false); setEditorPanel(panel); }}><Icon /><span>{label}</span></button>)}
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
      : <KeepPlayer name={(name || "Your Keep").toUpperCase()} from={giverNames} year="2026" subtitle={project.occasion} onExit={back} onFinish={() => { setScreen("editor"); resetPageScroll(); }} style={project.visualStyle} captions={project.captionStyle} media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined} audioUrl={rec && !rec.demo ? rec.audioUrl : undefined} audioDuration={rec?.durationSec} lines={captionLines} captionCues={project.captionCues} musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume} captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={mix} />)}
    {screen === "recipientPreview" && <KeepRecipientExperience
      name={(name || engraving[0] || "You").trim()}
      from={isTogether ? giverNames : (engraving[1]?.replace(/^FROM\s+/i, "") || "Alex").trim()}
      year={(engraving[2] || "2026").trim()}
      subtitle={project.occasion}
      openingMessage={project.openingMessage}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs.length ? project.messageParagraphs : initialMessage.map((p) => withName(p, name))}
      speakerNames={isTogether ? project.messageParagraphs.map((_,i)=>speakerName(i)) : undefined}
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
      from={isTogether ? giverNames : (engraving[1]?.replace(/^FROM\s+/i, "") || "").trim()}
      year={(engraving[2] || "").trim()}
      openingMessage={project.openingMessage}
      subtitle={project.occasion}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs}
      speakerNames={isTogether ? project.messageParagraphs.map((_,i)=>speakerName(i)) : undefined}
      style={project.visualStyle} captions={project.captionStyle} lines={captionLines} captionCues={project.captionCues}
      musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume}
      captionPosition={project.captionPosition} captionLines={project.captionLines} audioMix={mix}
      persistVisit={false} creatorPreview
      onCreatorExit={() => { setScreen("card"); resetPageScroll(); }}
      onCreatorContinue={() => { setScreen("card"); resetPageScroll(); }}
    />}
    {screen === "card" && <>{top()}<div className="mx-auto max-w-xl px-7 pb-14 pt-7">
      {title("The final touch", "Give it somewhere to live.", "One simple front design for your physical Keep card.")}
      <KeepOpeningPersonalization project={project} onUpdate={patch} onPreview={() => go("recipientReveal")} disabled={publishing} />
      <div className="mt-10 border-t border-border pt-7">
        <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" disabled={publishing || !engraving[0]?.trim()} onClick={() => void finishAndShare()}>
          {publishing ? "Saving your Keep…" : "Finish & share"} <ArrowRight className="size-5" />
        </Button>
        {publishing && <p role="status" className="mt-3 text-center text-xs text-muted-foreground">{publishStatus}</p>}
        {publishError && <p role="alert" className="mt-3 text-sm leading-6 text-[#9B3529]">{publishError}</p>}
        <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Finishing saves your changes and creates or refreshes the same permanent viewing link.</p>
      </div>
    </div></>}

    {screen === "success" && <div className="mx-auto flex keep-min-screen w-full max-w-xl flex-col px-7 pb-12 pt-10">
      <div className="flex items-center justify-center"><span className="keep-wordmark">Keep</span></div>
      <div className="pt-12">
        <div className="mb-7 flex size-12 items-center justify-center rounded-full border border-[#B8A89A] text-[#6A5849]"><Check className="size-5" /></div>
        <h1 className="keep-editorial-title">Your Keep is ready.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">A memory worth keeping. Ready to share whenever you are.</p>
        <div className="mt-9"><KeepCardFront engraving={engraving} openingMessage={project.openingMessage} showOpeningMessage={project.engraveOpeningMessage} /></div>
        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">Physical card ordering is coming next. No card has been ordered or shipped.</p>
      </div>
      <div className="mt-11 space-y-3">
        {project.publicationToken && <ViewingLink token={project.publicationToken} />}
        <Button variant="quiet" size="touch" className="w-full" onClick={() => go("editor")}>Back to editor</Button>
        <Button asChild variant="quiet" size="touch" className="w-full"><Link to="/app">Back to Keeps</Link></Button>
        <p className="pt-2 text-center text-[11px] leading-5 text-muted-foreground">Your draft is saved as you edit. Tapping Done in the editor refreshes this same viewing link.</p>
      </div>
    </div>}
  </div></main>;
}
