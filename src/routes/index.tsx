import { KeepRemoteScriptApproval } from "@/components/keep-remote-script-approval";
import { KeepCreativeCollaboration } from "@/components/keep-creative-collaboration";
import { KeepCollaborativeVoices } from "@/components/keep-collaborative-voices";
import { KeepOccasionChoices, KeepHeartAndFeelings, chosenKeepOccasion } from "@/components/keep-occasion-and-feelings";
import { KeepFilmCaption } from "@/components/keep-film-caption";
import { KeepAppMenu } from "@/components/keep-app-menu";
import { KeepOpeningScreen } from "@/components/keep-opening-screen";
import { KeepLoadingScreen } from "@/components/keep-loading-screen";
import { getKeepEntryIntent } from "@/lib/keep-entry-intent";
import type { KeepRestoreProgress } from "@/lib/keep-cloud";
import { ViewingLink } from "@/components/keep-publish-panel";
import { publishKeep } from "@/lib/keep-publish";
import { KeepCaptionEditor } from "@/components/keep-caption-editor";
import { KeepMusicEditor } from "@/components/keep-music-editor";
import { KeepVoiceEditor } from "@/components/keep-voice-editor";
import { KeepRemoteInviteManager } from "@/components/keep-remote-invite-manager";
import { remoteOwnerDownload, type RemoteMediaItem } from "@/lib/keep-remote";
import { KeepPhotosEditor } from "@/components/keep-photos-editor";
import { KeepFramingReview } from "@/components/keep-framing-review";
import { updateMomentFraming } from "@/lib/keep-framing";
import { clampCaptionRange, removeEditableMoment, shouldPreserveExistingVoice } from "@/lib/keep-editor-safety";
import { KeepMomentsUploader } from "@/components/keep-moments-uploader";
import { KeepPhoneTip } from "@/components/keep-phone-tip";
import { KeepStudioResize, DEFAULT_PREVIEW_SIZE, constrainPreviewSize } from "@/components/keep-studio-resize";
import { KeepTeleprompter } from "@/components/keep-teleprompter";
import { KeepVoiceTransition } from "@/components/keep-voice-transition";
import { keepCheckoutPath, loadCheckoutKeep, type CheckoutKeep } from "@/lib/keep-checkout";
import { KeepFinishingDialog } from "@/components/keep-finishing-dialog";
import { KeepStyleEditor } from "@/components/keep-style-editor";
import { KeepSelfieEditor } from "@/components/keep-selfie-editor";
import { KeepSelfieBackup } from "@/components/keep-selfie-backup";
import { hasSavedVoice, nextAfterMessage, nextAfterMedia, nextAfterVoice, resumeKeepRecordingFlow, usesRemoteRecording } from "@/lib/keep-recording-flow";
import { composeSelfieStory, withoutSelfieScenes } from "@/lib/keep-selfie-story";
import { KeepFinishingChoices } from "@/components/keep-finishing-choices";
import { KeepAskAIModal, KeepWordChanges } from "@/components/keep-ask-ai-modal";
import { KeepInterviewIntro } from "@/components/keep-interview-intro";
import { KeepInterviewSummary } from "@/components/keep-interview-summary";
import { KeepRecordedAnswerPlayer } from "@/components/keep-recorded-answer-player";
import { useInterviewViewport } from "@/hooks/use-interview-viewport";
import { arrangeWords, spreadMemories, recommendedStyle } from "@/lib/keep-story-layout";
import { filmTotal, sceneBoundary, sceneDuration, sceneElapsed, sceneIndexAt, sceneSeekTime } from "@/lib/keep-film-timing";
import { captionAtTime, captionTimingIsBroken, groupTimedWords, recoverCaptionTiming } from "@/lib/keep-caption-timing";
import { activeKeepSession, loadEditableKeep, loadCloudDraft, saveCloudDraft, removeCloudDraft, retryMissingCloudMedia, loadSavedVoiceForCaptionSync } from "@/lib/keep-cloud";
import { CinematicMedia } from "@/components/cinematic-media";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Headphones, CircleHelp, Download, Ellipsis, GripVertical, Images, LockKeyhole, MessageCircle, Mic, Music2, Loader2, Pause, Play, Plus, Radio, RotateCcw, Settings2, Sparkles, Square, Trash2, Undo2, Redo2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages, memoryLabels } from "@/components/keep-player";
import { KeepRecipientExperience, type KeepExperienceMode } from "@/components/keep-recipient-experience";
import { KeepOpeningPersonalization } from "@/components/keep-opening-personalization";
import { engravingLayout } from "@/lib/keep-card-engraving";
import { KeepEditorCardPreview } from "@/components/keep-editor-card-preview";
import { KeepFinalTouchGuide } from "@/components/keep-final-touch-guide";
import { KeepErrorBoundary } from "@/components/keep-error-boundary";
import { KeepLengthGuide } from "@/components/keep-length-guide";
import { KeepWritingStep } from "@/components/keep-writing-step";
import { relationshipGroups, chosenKeepRecipientRelationship } from "@/lib/keep-recipient-categories";
import { checkKeepVideo, KEEP_VIDEO_MAX_BYTES, KEEP_VIDEO_MAX_SOURCE_BYTES, KEEP_VIDEO_MAX_SECONDS, readKeepVideoDuration } from "@/lib/keep-video-upload";
import { compressKeepVideo, keepCompressedSizeText, shouldCompressKeepVideo } from "@/lib/keep-video-compression";
import { keepOptimizedPhotoId, keepPhotoSavings, optimizeKeepPhoto, shouldOptimizeKeepPhoto } from "@/lib/keep-photo-optimization";
import { countKeepWords, estimateKeepSeconds, formatKeepTime } from "@/lib/keep-length";
import { useRecorder, type RecordingResult } from "@/hooks/use-recorder";
import { joinKeepVoiceParts } from "@/lib/keep-collaborative-audio";
import { deleteBlobs, getBlob, putBlob, listStoredVoiceRecordings } from "@/lib/keep-media-store";
import { createKeepVoiceMix, KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, playMusicSample, stopMusicSample, type MusicBalance } from "@/lib/keep-audio";
import { fetchDraft, fetchNextQuestion, fetchRevision, keepAiAvailable, transcribeAudio, transcribeTimedAudio } from "@/lib/keep-ai";
import { fmt, hydrateDraftMedia, loadDraft, clearDraft, newId, newProject, resumeKeepCreationStage, projectBlobIds, projectObjectUrls, sampleMemories, saveDraft, preferLocalKeepDraft, stageLabels, defaultAudioMix, type AudioMix, type CaptionCue, type InterviewAnswer, type KeepProject, type KeepVoicePart, type MediaItem, type VoiceTone } from "@/lib/keep-project";

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

type Screen = "home" | "you" | "detail" | "recipient" | "occasion" | "voices" | "intent" | "collaboration" | "path" | "interview" | "summary" | "messageGenerating" | "write" | "message" | "recordPrep" | "record" | "groupRecord" | "remoteInvite" | "recorded" | "memories" | "framing" | "storyStyle" | "generating" | "editor" | "preview" | "recipientReveal" | "recipientPreview" | "giveReady" | "card" | "success";
type Mode = "Memories" | "Music" | "Captions" | "Style" | "Voice" | "Selfie";
const creationScreens: Screen[] = ["recipient", "occasion", "voices", "intent", "collaboration", "path", "interview", "summary", "messageGenerating", "write", "message", "recordPrep", "record", "groupRecord", "remoteInvite", "recorded", "memories", "framing", "storyStyle", "generating", "editor", "preview", "recipientPreview", "card", "success"];
const resumeScreen = (s: string): Screen => resumeKeepCreationStage(s) as Screen;

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
const EDIT_KEYS = ["memories", "selfieBaseMedia", "selfieVideos", "selfiePresentation", "selfieBookendSeconds", "selfieIntroId", "selfieOutroId", "captionCues", "captionStyle", "visualStyle", "musicMood", "voiceMusicBalance", "voiceVolume", "musicVolume", "captionPosition", "captionLines", "captionSize", "captionWordsPerCue", "audioMix"] as const;
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
  const [restoringPersonalKeep, setRestoringPersonalKeep] = useState(false);
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
  const interviewViewport = useInterviewViewport(screen === "interview");
  const [interviewInputFocused, setInterviewInputFocused] = useState(false);
  const interviewAnswerRef = useRef<HTMLTextAreaElement>(null);
  const interviewBodyRef = useRef<HTMLDivElement>(null);
  const interviewKeyboardOpen = !!interviewViewport?.keyboardOpen;
  const interviewCompact = interviewKeyboardOpen || (interviewInputFocused && (interviewViewport?.width ?? 1000) < 768);
  const [aiError, setAiError] = useState<null | { kind: "start" | "transcribe" | "next" | "draft"; retry: () => void }>(null);
  const [generation, setGeneration] = useState(0);
  const [mode, setMode] = useState<Mode>("Memories");
  const [resumeError, setResumeError] = useState("");
  const [editorPanel, setEditorPanel] = useState<Mode | null>(null);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [studioPreviewSize, setStudioPreviewSize] = useState(DEFAULT_PREVIEW_SIZE);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("keep-studio-preview-size");
      if (saved !== null && Number.isFinite(Number(saved))) setStudioPreviewSize(constrainPreviewSize(Number(saved)));
    } catch { /* Private-browsing preferences are optional. */ }
  }, []);
  const updateStudioPreviewSize = (value: number) => {
    const size = constrainPreviewSize(value);
    setStudioPreviewSize(size);
    try { window.localStorage.setItem("keep-studio-preview-size", String(size)); } catch { /* Optional */ }
  };
  const [compareOriginalStyle, setCompareOriginalStyle] = useState(false);
  const [previewChooserOpen, setPreviewChooserOpen] = useState(false);
  const [creatorPreviewMode, setCreatorPreviewMode] = useState<KeepExperienceMode | null>(null);
  const [readArrangeOpen, setReadArrangeOpen] = useState(false);
  const [readArrangeIndex, setReadArrangeIndex] = useState(0);
  const [returnToEditorAfterRecording, setReturnToEditorAfterRecording] = useState(false);
  const [groupPartIndex, setGroupPartIndex] = useState(0);
  const [recordRestartNonce,setRecordRestartNonce]=useState(0);
  const [selfieBackupOpen, setSelfieBackupOpen] = useState(false);
  const selfieSelected = project.recordingVisualMode === "selfie";
  const [groupBusy, setGroupBusy] = useState(false);
  const [frame, setFrame] = useState(0);
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorTime, setEditorTime] = useState(0);
  const editorAudioRef = useRef<HTMLAudioElement>(null);
  const editorMixRef = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const editorIntroRemainingRef = useRef(KEEP_MUSIC_LEAD_SECONDS*1000);
  const editorIntroStartedAtRef = useRef(0);
  const editorIntroTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const editorOutroTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearEditorOutro = () => {
    if (editorOutroTimerRef.current !== null) {
      window.clearTimeout(editorOutroTimerRef.current);
      editorOutroTimerRef.current = null;
    }
  };
  const editorPlayAttemptRef = useRef(0);
  const editorNarrationStartedRef = useRef(false);
  const cancelEditorIntro = () => {
    editorPlayAttemptRef.current++;
    if(editorIntroTimerRef.current!==null){
      window.clearTimeout(editorIntroTimerRef.current);
      editorIntroTimerRef.current=null;
      editorIntroRemainingRef.current=Math.max(0,editorIntroRemainingRef.current-(performance.now()-editorIntroStartedAtRef.current));
    }
  };
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const [renderKeep, setRenderKeep] = useState<CheckoutKeep | null>(null);
  const [publishError, setPublishError] = useState("");
  const publishingLock = useRef(false);
  const [setting, setSetting] = useState("");
  const [voiceFinalizing, setVoiceFinalizing] = useState(false);
  const voiceFinishInFlight = useRef(false);
  const groupFinishInFlight = useRef(false);
  // A failed IndexedDB write must not throw away the captured voice.
  const [pendingVoice, setPendingVoice] = useState<RecordingResult | null>(null);
  const [orphanVoices, setOrphanVoices] = useState<{id:string;size:number;mimeType:string;recordedAt:number}[]>([]);
  const [recoveryPreview, setRecoveryPreview] = useState<{id:string;url:string;blob:Blob;durationSec:number}|null>(null);
  const [captionSyncing, setCaptionSyncing] = useState(false);
  const [captionSyncError, setCaptionSyncError] = useState(false);
  const [captionSyncErrorMessage, setCaptionSyncErrorMessage] = useState("");
  const [captionSyncProgress, setCaptionSyncProgress] = useState<{completed: number; total: number} | null>(null);
  const captionRetryInFlight = useRef(false);
  const captionSyncToken = useRef(0);
  const [musicSampling, setMusicSampling] = useState("");
  const musicSampleTimer = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const mediaImportLock = useRef(false);
  const replaceTargetId = useRef<string | null>(null);
  const [mediaImport, setMediaImport] = useState<{ total: number; completed: number; detail?: string; compressionPercent?: number } | null>(null);
  const [voiceSampling, setVoiceSampling] = useState<VoiceTone | null>(null);
  const voiceSampleRef = useRef<{ tone: VoiceTone; audio: HTMLAudioElement; mixer: NonNullable<ReturnType<typeof createKeepVoiceMix>>; timer: number | null } | null>(null);
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
  const [remoteReviewFinished,setRemoteReviewFinished]=useState(false);
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
  const chosenRelationship = chosenKeepRecipientRelationship(project.relationship);
  const savedCustomRelationship = chosenRelationship === "Someone else" && project.relationship !== "Someone else" ? project.relationship : "";
  // Reveal the next action within the selected category row. On smaller screens,
  // scroll only as much as needed to make the newly revealed panel visible.
  useEffect(() => {
    if (screen !== "recipient" || !chosenRelationship) return;
    const frame = window.requestAnimationFrame(() => {
      const details = document.getElementById("recipient-details");
      if (details && typeof details.scrollIntoView === "function") {
        details.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen, chosenRelationship]);
  const q = project.questionIndex;

  // Hydrate local media first, then prefer the authenticated account's cloud draft.
  // Do not autosave until hydration is finished; that would overwrite the remote draft.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const { editId, finalTouchesRequested, resumeRequested, createRequested, redirectToDashboard } = getKeepEntryIntent(window.location.search);
      // A normal home visit should not restore a personal draft or show film-loading copy.
      if (redirectToDashboard) {
        window.location.replace("/app");
        return;
      }
      setRestoringPersonalKeep(resumeRequested);
      const requestedLocalId = new URLSearchParams(window.location.search).get("local");
      const local = loadDraft(editId || requestedLocalId || undefined);
      let next: KeepProject | null = null;
      let owner: string | undefined;
      try {
        setOpeningPhase("session");
        const session = await activeKeepSession();
        if (cancelled) return;
        owner = session?.user.id;
        if (createRequested) {
          // A new creation never needs to download or modify an existing Keep.
          if (!session) throw new Error("Please sign in to create your Keep.");
          setProject({ ...newProject(), draftOwnerId: owner, publicationId: crypto.randomUUID(), active: true, stage: "recipient" });
          window.history.replaceState(null, "", "/");
          setHistory(["home"]); setScreen("recipient"); setHydrated(true);
          return;
        }
        if (session) {
          setOpeningPhase("draft");
          const onRestore = (progress: KeepRestoreProgress) => {
            if (cancelled) return;
            setOpeningPhase("media");
            setOpeningProgress(progress);
          };
          const cloud = editId ? await loadEditableKeep(editId, session, onRestore) : await loadCloudDraft(session, onRestore);
          const remote = requestedLocalId && local?.draftOwnerId === session.user.id && local.publicationId === requestedLocalId && cloud?.publicationId !== requestedLocalId ? null : cloud;
          if (remote) {
            // A slow or failed upload must never make an older cloud draft erase
            // a playable voice already stored on this phone.
            const matchingLocal = local?.active && local.publicationId === remote.publicationId
              && (!editId || local.publicationId === editId)
              ? { ...local, draftOwnerId: session.user.id, ...await hydrateDraftMedia(local) } : null;
            if (matchingLocal && preferLocalKeepDraft(matchingLocal, remote)) {
              next = matchingLocal;
              if (matchingLocal.finalVoiceRecording?.audioUrl && !remote.finalVoiceRecording?.audioUrl) {
                toast.info("Your recording was recovered from this phone. Keep will back it up again.");
              }
            } else {
              next = remote;
              // Never overwrite an incomplete cloud restoration.
              if (remote.restoreIncomplete) setCloudSyncAllowed(false);
            }
          }
          else if (local?.active && (local.draftOwnerId === session.user.id ||
            (!local.draftOwnerId && resumeRequested && window.confirm("An older draft is saved on this device. Is it your Keep, and would you like to restore it into this account?")))) {
            next = { ...local, draftOwnerId: session.user.id, ...await hydrateDraftMedia(local) };
            if (next.restoreIncomplete) setCloudSyncAllowed(false);
          } else next = newProject();
        } else if (resumeRequested) {
          throw new Error("Please sign in to your Keep account to continue editing.");
        }
      } catch (error) {
        if (resumeRequested) { if (!cancelled) setResumeError(error instanceof Error ? error.message : "Your Keep could not be restored. Please try again."); return; }
        if (createRequested) { toast.error(error instanceof Error ? error.message : "Sign in again to create your Keep."); window.location.replace("/app"); return; }
        toast.error(error instanceof Error ? error.message : "Cloud draft unavailable.");
      }
      if (cancelled) return;
      setOpeningPhase("finishing");
      if (next) {
        next = { ...next, draftOwnerId: owner, publicationId: next.publicationId || crypto.randomUUID() };
        if (cancelled) return;
        setProject(next);
      }
      if (resumeRequested) {
        if (!next?.active) { setResumeError("There isn't a saved draft to continue yet."); return; }
        const stage = resumeKeepRecordingFlow(next, finalTouchesRequested) as Screen;
        setHistory(stage === "card" && finalTouchesRequested ? ["editor"] : []);
        setScreen(creationScreens.includes(stage) ? stage : "recipient");
        setHydrated(true);
        return;
      }
      window.location.replace("/app");
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
        if (!session || project.draftOwnerId !== session.user.id) return;
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
    if ((screen === "record" || screen === "groupRecord") && selfieSelected && recorder.supported === true) {
      void recorder.prepareSelfie();
    }
  }, [screen, selfieSelected, recorder.supported, recorder.prepareSelfie, groupPartIndex]);
  useEffect(() => { if (screen !== "memories" && screen !== "framing") setSelfieBackupOpen(false); }, [screen]);
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
      if (project.draftOwnerId !== session.user.id) throw new Error("Sign in to the account that owns this Keep.");
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
  const back = () => { if (publishingLock.current) return; const last = (screen === "framing" && (!history.length || history.at(-1) === "home")) ? project.framingReviewOrigin ?? "memories" : history[history.length - 1] ?? (screen === "intent" ? "voices" : undefined); if (!last || last === "home") { window.location.assign("/app"); return; } setScreen(last); setHistory((h) => h.slice(0, -1)); resetPageScroll(); };
  const home = () => { window.location.assign("/app"); };
  const discard = (p: KeepProject) => { releaseUrls(projectObjectUrls(p)); void deleteBlobs(projectBlobIds(p)); };
  const startProject = (p: KeepProject, at: Screen) => {
    setReturnToEditorAfterRecording(false);
    if (project.active && !saveDraft(project) && !window.confirm("Your current draft could not be backed up on this device. Start a new Keep anyway?")) return;
    setProject({ ...p, draftOwnerId: project.draftOwnerId, publicationId: crypto.randomUUID(), active: true, stage: at });
    setViewingDemo(false); setFrame(0); setMode("Memories");
    setHistory(["home"]); setScreen(at); window.scrollTo(0, 0);
  };
  const begin = () => startProject(newProject(), "recipient");
  const editDemoCopy = () => startProject({ ...newProject(), recipientName: "Hanna", relationship: "Spouse", messageSource: "demo", messageParagraphs: initialMessage, memories: sampleMemories(), finalVoiceRecording: { durationSec: 150, demo: true }, cardEngraving: ["HANNA", "FROM ALEX", "2026"] }, "editor");
  const continueDraft = () => { setViewingDemo(false); setHistory(["home"]); setScreen(resumeKeepRecordingFlow(project) as Screen); };


  useEffect(() => {
    if (screen !== "interview") setInterviewInputFocused(false);
  }, [screen]);
  // Each question starts at the top. Compacting on focus also brings the
  // question back into view instead of leaving the browser scrolled to the caret.
  useEffect(() => {
    if (screen === "interview" && interviewBodyRef.current) {
      interviewBodyRef.current.scrollTop = 0;
    }
  }, [screen, project.questionIndex, interviewCompact]);

  // ---- Interview ----
  // A crash between media storage and draft metadata can leave a valid voice
  // blob on this device. Offer it for listening and explicit recovery.
  useEffect(() => {
    if (!hydrated || screen !== "record" || project.finalVoiceRecording?.audioUrl) return;
    let cancelled = false;
    if (!project.publicationId) return;
    void listStoredVoiceRecordings(14, project.publicationId).then(items => {
      if (!cancelled) setOrphanVoices(items.filter(item => item.id !== project.finalVoiceRecording?.audioId && !!project.publicationId && item.id.startsWith("voice-" + project.publicationId + "-")).slice(0,4));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [hydrated, screen, project.publicationId, project.finalVoiceRecording?.audioId, project.finalVoiceRecording?.audioUrl]);
  useEffect(() => () => {
    // Object URL created only after the creator chooses to preview a recovered take.
    if (recoveryPreview?.url) URL.revokeObjectURL(recoveryPreview.url);
  }, [recoveryPreview?.url]);
  const previewOrphanVoice = async (id: string) => {
    const blob = await getBlob(id);
    if (!blob?.size) { toast.error("That recording is no longer available on this device."); return; }
    setRecoveryPreview({id, blob, url:URL.createObjectURL(blob),durationSec:0});
  };
  const downloadPendingVoice = () => {
    if (!pendingVoice) return;
    const url = URL.createObjectURL(pendingVoice.blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keep-voice-backup." + (pendingVoice.mimeType.includes("mp4")?"m4a":"webm");
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const currentAnswer = project.interviewAnswers.find((a) => a.questionIndex === q);
  const upsertAnswer = (a: InterviewAnswer) => setProject((o) => ({ ...o, interviewAnswers: [...o.interviewAnswers.filter((x) => x.questionIndex !== a.questionIndex), a].sort((x, y) => x.questionIndex - y.questionIndex) }));
  const setAnswer = (a: InterviewAnswer) => {
    const old = project.interviewAnswers.find((x) => x.questionIndex === a.questionIndex);
    const updated = {...project, interviewAnswers: [...project.interviewAnswers.filter(x => x.questionIndex !== a.questionIndex), a].sort((x,y)=>x.questionIndex-y.questionIndex)};
    if (!saveDraft(updated)) toast.warning("Your answer is open in this session. Don't close the editor until your draft is backed up.");
    setProject(updated);
    if (old) releaseUrls([old.audioUrl]);
  };
  const aiReady = keepAiAvailable();
  const aiContext = (list: InterviewAnswer[] = project.interviewAnswers) => ({
    recipientName: project.recipientName, relationship: project.relationship, occasion: project.occasion, occasionDetail: project.occasionDetail?.trim() || "", recipientFeelings: project.recipientFeelings ?? [], intent: project.intent,
    contributors: project.voiceMode === "together" ? (project.contributors ?? []).map(c => c.name) : [],
    answers: list.filter((a) => a.transcript?.trim()).map((a) => ({ question: a.question, transcript: (a.transcript ?? "").trim() })),
  });
  const runAi = async (kind: "start" | "transcribe" | "next" | "draft", fn: () => Promise<void>) => {
    setAiBusy(kind); setAiError(null);
    try { await fn(); } catch { setAiError({ kind, retry: () => void runAi(kind, fn) }); } finally { setAiBusy(null); }
  };
  const requestFirstInterviewQuestion = () => {
    if (!aiReady || project.interviewQuestion) return;
    void runAi("start", async () => {
      const r = await fetchNextQuestion(aiContext([]));
      if (r.done) throw new Error("no question");
      patch({ interviewQuestion: r.question, questionIndex: 0, interviewAnswers: [], interviewSummary: "" });
    });
  };
  const startInterview = () => {
    if(project.voiceMode==="together"){go("collaboration");return;}
    go("interview");
    // Let the creator read the reminders before the first question arrives.
    if (project.interviewWelcomeSeen) requestFirstInterviewQuestion();
  };
  const acknowledgeInterviewTips = () => {
    patch({ interviewWelcomeSeen: true });
    requestFirstInterviewQuestion();
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
    if (!stored) toast.warning("Your device couldn't store this audio. Keep the page open while we turn it into text.");
    const answer: InterviewAnswer = { questionIndex: q, question: project.interviewQuestion, audioId: stored ? id : undefined, audioUrl: URL.createObjectURL(r.blob), durationSec: r.durationSec, mimeType: r.mimeType, transcript: currentAnswer?.transcript };
    setAnswer(answer);
    if (!aiReady) return;
    void runAi("transcribe", async () => {
      const text = await transcribeAudio(r.blob, r.mimeType);
      if (!text) throw new Error("empty transcript");
      setProject((o) => ({ ...o, interviewAnswers: o.interviewAnswers.map((a) => (a.questionIndex === answer.questionIndex && a.audioUrl === answer.audioUrl ? { ...a, transcript: text } : a)) }));
    });
  };
  const nextQuestion = () => {
    // Keep the next prompt at the top and let the creator choose when to type.
    interviewAnswerRef.current?.blur();
    setInterviewInputFocused(false);
    void runAi("next", async () => {
      const r = await fetchNextQuestion(aiContext());
      if (r.done) { patch({ interviewSummary: r.summary }); go("summary"); }
      else patch({ questionIndex: q + 1, interviewQuestion: r.question });
    });
  };
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
      const speaker=project.collaborativeCreative?project.contributors?.find(p=>p.id===project.paragraphSpeakers?.[activeParagraph]):undefined;
      const context=speaker?.story?{...aiContext(),relationship:speaker.story.relationship,contributors:[],answers:[...speaker.story.answers,...(speaker.story.written?[{question:"Your own words",transcript:speaker.story.written}]:[])]}:aiContext();
      const suggestion = await fetchRevision(context, project.collaborativeCreative?[project.messageParagraphs[activeParagraph]??""]:project.messageParagraphs, project.collaborativeCreative?0:activeParagraph, request, project.collaborativeCreative?"section":scope);
      if(project.collaborativeCreative){const replacement=suggestion.paragraphs[0];suggestion.paragraphs=project.messageParagraphs.map((p,i)=>i===activeParagraph?replacement||p:p);suggestion.changedIndexes=replacement!==project.messageParagraphs[activeParagraph]?[activeParagraph]:[];}
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
  const speakingPartCount = project.messageParagraphs.filter(p => p.trim()).length;
  const groupReady = speakingPartCount > 1 && readyCount === speakingPartCount;
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
    // The teleprompter now resets its own scroll when recording starts.
    // Obsolete page-level setters caused a runtime crash on Re-record.
    window.scrollTo(0, 0);
  };
  const useVoiceOnly = () => {
    recorder.disableSelfie();
    patch({ recordingVisualMode: "photos" });
  };
  const restartCurrentRecording=async()=>{
    // Only the current unsaved take is discarded. Existing saved voices remain untouched.
    recorder.cancel();
    setRecordRestartNonce(value=>value+1);
    const ok=await recorder.start({selfie:selfieSelected,countdown:true});
    if(ok===false)toast.error(selfieSelected
      ?"The camera or microphone couldn't restart. Try voice only."
      :"The microphone couldn't restart. Tap Start recording to try again.");
  };
  const startFinal = async () => {
    if (rec?.audioUrl && !rec.demo && (project.selfieVideos??[]).length && !selfieSelected &&
      !window.confirm("Re-recording your voice will remove the old synced selfie video so the words and picture stay in sync. Continue?")) return;
    const ok=await recorder.start({selfie:selfieSelected,countdown:true});
    if(ok===false)toast.error(selfieSelected?"The camera or microphone isn't available. Try voice only.":"The microphone isn't available right now.");
  };
  const saveSelfieTake = async (blob:Blob|undefined,mimeType:string|undefined,durationSec:number,partIndex:number):Promise<MediaItem|undefined> => {
    if(!blob?.size)return undefined;
    if(blob.size>40*1024*1024){toast.warning("Your voice saved, but the selfie is too large. Try a shorter clip.");return undefined;}
    const id=newId("selfie");
    if(!(await putBlob(id,blob))){toast.warning("Your voice saved, but the selfie couldn't fit on this device.");return undefined;}
    return {id,blobId:id,kind:"video",source:"upload",isSelfie:true,selfiePartIndex:partIndex,
      url:URL.createObjectURL(blob),name:partIndex===0?"Your selfie video":`Selfie · part ${partIndex+1}`,
      persisted:true,mimeType:mimeType??blob.type,videoStartSec:0,videoDurationSec:durationSec,
      displayDurationSec:durationSec};
  };


  const syncFinalCaptions = async (blob: Blob, mimeType?: string, recordedDuration = rec?.durationSec ?? 0, sourceAudioId?: string) => {
    const request = ++captionSyncToken.current;
    setCaptionSyncing(true);
    setCaptionSyncError(false);
    setCaptionSyncErrorMessage("");
    setCaptionSyncProgress(null);
    try {
      const prompt = project.messageParagraphs.join(" ").slice(0, 700);
      const timed = await transcribeTimedAudio(blob, mimeType, prompt, (completed, total) => {
        if (request === captionSyncToken.current) setCaptionSyncProgress({completed, total});
      });
      const cues = groupTimedWords(timed.words, project.captionWordsPerCue ?? 5);
      const trueDuration = timed.audioDurationSec > 0 ? timed.audioDurationSec : recordedDuration;
      if (!cues.length || captionTimingIsBroken(timed.words, cues, trueDuration)) {
        throw new Error("These caption timestamps aren't reliable enough to show with your voice.");
      }
      // Respect the decoded recording clock, never transcript-length estimates.
      if (request !== captionSyncToken.current) return false;
      setProject((o) => sourceAudioId && o.finalVoiceRecording?.audioId !== sourceAudioId ? o : ({
        ...o,
        finalVoiceRecording: o.finalVoiceRecording && trueDuration > 0
          ? { ...o.finalVoiceRecording, durationSec: trueDuration } : o.finalVoiceRecording,
        captionTranscript: timed.transcript, captionWords: timed.words,
        captionCues: cues, captionTimingEstimated: false,
      }));
      return true;
    } catch (error) {
      if (request !== captionSyncToken.current) return false;
      const message = error instanceof Error ? error.message : "Caption alignment failed. Please try again.";
      setCaptionSyncError(true);
      setCaptionSyncErrorMessage(message);
      toast.error("Caption sync couldn't complete", { description: message, duration: 9000 });
      return false;
    } finally {
      if (request === captionSyncToken.current) {
        setCaptionSyncing(false);
        setCaptionSyncProgress(null);
      }
    }
  };

  const finishFinal = async (recoveredTake?: RecordingResult, preservedId?: string) => {
    if (voiceFinishInFlight.current) return;
    voiceFinishInFlight.current = true;
    setVoiceFinalizing(true);
    try {
      const r = recoveredTake ?? await recorder.stop();
      if (!r?.blob?.size) { toast.error("No audio was captured. Please try again."); return; }
      const id = preservedId ?? newId("voice-" + project.publicationId);
      if (!(await putBlob(id, r.blob))) {
        setPendingVoice(r);
        toast.error("Your recording is still open, but device storage failed. Do not refresh. Retry saving or download the audio backup.", { duration: 12000 });
        return;
      }
      const selfie = await saveSelfieTake(r.selfieBlob, r.selfieMimeType, r.durationSec, 0);
      const audioUrl = URL.createObjectURL(r.blob);
      const selfies = selfie ? [selfie] : [];
      const updated: KeepProject = {
        ...project,
        stage: "recorded",
        selfieVideos: selfies,
        memories: project.memories.length
          ? composeSelfieStory(project.selfieBaseMedia?.length ? project.selfieBaseMedia : withoutSelfieScenes(project.memories), selfies, r.durationSec, project)
          : project.memories,
        finalVoiceRecording: { audioId: id, audioUrl, durationSec: r.durationSec, mimeType: r.mimeType, demo: false },
        captionTranscript: "", captionCues: [], captionWords: [], captionTimingEstimated: false,
      };
      // Durable metadata must be written in the SAME interaction as finishing
      // the voice, not only in a later React effect or debounced cloud autosave.
      if (!saveDraft(updated)) {
        URL.revokeObjectURL(audioUrl);
        setPendingVoice(r);
        toast.error("Your audio was captured but the draft couldn't save. Do not refresh; retry saving or download the backup.", { duration: 12000 });
        return;
      }
      setPendingVoice(null);
      setOrphanVoices(items => items.filter(item => item.id !== id));
      if (recoveryPreview?.id === id) setRecoveryPreview(null);
      if (selfieSelected && !selfie) toast.info("Your narration is saved. The optional selfie video was not available.");
      if (rec?.audioUrl && rec.audioUrl !== audioUrl) releaseUrls([rec.audioUrl]);
      // Keep the previous take available until older cloud saves have settled.
      captionSyncToken.current++;
      setProject(updated);
      go("recorded");
      // Upload now rather than relying on the 2.5-second autosave delay.
      // The local copy is already safe if cellular upload fails or the tab closes.
      void activeKeepSession().then(session => session ? saveCloudDraft(updated, session) : undefined)
        .then(() => toast.success("Your recording was saved."))
        .catch(() => toast.warning("Voice saved on this phone. Cloud backup is pending; don't clear browser data."));
      void syncFinalCaptions(r.blob, r.mimeType, r.durationSec, id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recording couldn't be saved. Please try again.");
    } finally {
      voiceFinishInFlight.current = false;
      setVoiceFinalizing(false);
    }
  };

  const finishGroupPart = async () => {
    if (groupFinishInFlight.current) return;
    groupFinishInFlight.current = true;
    setGroupBusy(true);
    try {
      const r = await recorder.stop();
      if (!r || r.durationSec < 0.25) throw new Error("That recording was too short. Try again.");
      const index = groupPartIndex;
      const id = newId("voice-part");
      if (!(await putBlob(id,r.blob))) throw new Error("Your device could not save this recording. Please free some storage and try again.");
      const selfie=await saveSelfieTake(r.selfieBlob,r.selfieMimeType,r.durationSec,index);
      if(selfieSelected&&!selfie)toast.info("This voice part saved. The optional camera video wasn't captured.");
      const currentParts = project.voiceParts ?? [];
      const oldPart = currentParts.find(p => p.paragraphIndex === index);
      const nextParts = [...currentParts.filter(p => p.paragraphIndex !== index), {
        paragraphIndex:index, contributorId:speakerFor(index), textFingerprint:(project.messageParagraphs[index] ?? "").trim(),
        audioId:id, audioUrl:URL.createObjectURL(r.blob), durationSec:r.durationSec, mimeType:r.mimeType,
      }];
      const old = project;
      const updated = (()=>{
        const selfies=[...(old.selfieVideos??[]).filter(item=>item.selfiePartIndex!==index),...(selfie?[selfie]:[])];
        return {...old,stage:"groupRecord",selfieVideos:selfies,
          memories:old.memories.length?composeSelfieStory(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories),selfies,old.finalVoiceRecording?.durationSec??150,old):old.memories,
          voiceParts:nextParts,finalVoiceRecording:null,groupVoiceSignature:undefined,captionTranscript:"",captionCues:[],captionWords:[],captionTimingEstimated:false};
      })();
      const saved = saveDraft(updated);
      setProject(updated);
      if (!saved) toast.warning("Voice saved in this session. Keep this editor open while your draft backs up.");
      if (oldPart) releaseUrls([oldPart.audioUrl]);
      const nextIndex = project.messageParagraphs.findIndex((p,i) => p.trim() && !nextParts.some(part => part.paragraphIndex === i && part.contributorId === speakerFor(i) && part.textFingerprint === p.trim()));
      if (nextIndex >= 0) setGroupPartIndex(nextIndex);
      toast.success(nextIndex >= 0 ? "Part saved. Hand the phone to the next speaker." : "All voices recorded. Ready to bring them together.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recording couldn't be saved.");
    } finally {
      groupFinishInFlight.current = false;
      setGroupBusy(false);
    }
  };
  const combineGroupVoices = async () => {
    if (groupFinishInFlight.current || !groupReady) return;
    groupFinishInFlight.current = true;
    setGroupBusy(true);
    setVoiceFinalizing(true);
    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < project.messageParagraphs.length; i++) {
        if (!project.messageParagraphs[i]?.trim()) continue;
        const part = readyPart(i);
        const blob = part?.audioId ? await getBlob(part.audioId) : null;
        if (!blob) throw new Error("A voice is missing. Please record that part again.");
        blobs.push(blob);
      }
      const joined = await joinKeepVoiceParts(blobs);
      if (joined.blob.size > 19 * 1024 * 1024) throw new Error("This combined message is too long. Make the parts a little shorter.");
      const id = newId("voice-" + project.publicationId);
      if (!(await putBlob(id,joined.blob))) throw new Error("Not enough device storage to save the combined recording.");
      captionSyncToken.current++;
      const old = project;
      const updated = {...old,stage:"recorded",
        memories:old.memories.length?composeSelfieStory(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories),old.selfieVideos??[],joined.durationSec,old):old.memories,
        finalVoiceRecording:{audioId:id,audioUrl:URL.createObjectURL(joined.blob),durationSec:joined.durationSec,mimeType:"audio/wav",demo:false},groupVoiceSignature:groupSignature,captionTranscript:"",captionCues:[],captionWords:[],captionTimingEstimated:false};
      if (!saveDraft(updated)) toast.warning("The combined voice is saved in this session. Keep the editor open while backup completes.");
      setProject(updated);
      if (rec) releaseUrls([rec.audioUrl]);
      go("recorded");
      void syncFinalCaptions(joined.blob, "audio/wav", joined.durationSec, id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recordings couldn't be combined. Your individual parts are saved.");
    } finally {
      groupFinishInFlight.current = false;
      setGroupBusy(false);
      setVoiceFinalizing(false);
    }
  };

  /**
   * Bring secure, remotely uploaded per-paragraph audio into this creator's
   * local editor, then build the same narration file used for in-person groups.
   * Match contributor AND unchanged exact text to prevent mixing stale scripts.
   */
  const combineRemoteVoices = async () => {
    if(groupFinishInFlight.current || !project.publicationId || !isTogether) return;
    groupFinishInFlight.current = true;
    setGroupBusy(true);
    try {
      const {recordings}=await remoteOwnerDownload(project.publicationId);
      const blobs:Blob[]=[];
      const imported:KeepVoicePart[]=[];
      const reviewedParagraphs=[...project.messageParagraphs];
      for(let index=0;index<project.messageParagraphs.length;index++) {
        const paragraph=project.messageParagraphs[index]!.trim();
        if(!paragraph) continue;
        const contributorId=speakerFor(index);
        const local=readyPart(index);
        if(local) {
          const localBlob=await getBlob(local.audioId);
          if(localBlob?.size) {blobs.push(localBlob);imported.push(local);continue;}
        }
        const remote=recordings.find(item=>item.paragraphIndex===index && item.contributorId===contributorId && (item.textFingerprint===paragraph || (project.collaborativeCreative&&item.originalText===paragraph)));
        if(!remote) throw new Error(`Still waiting for ${speakerName(index)}'s recording of part ${index+1}.`);
        const response=await fetch(remote.signedUrl,{referrerPolicy:"no-referrer"});
        if(!response.ok) throw new Error(`Couldn't download ${speakerName(index)}'s audio. Try again.`);
        const blob=await response.blob();
        if(!blob.size || blob.size>20*1024*1024)throw new Error(`The recording for part ${index+1} could not be read.`);
        const id=newId("remote-voice-part");
        if(!(await putBlob(id,blob)))throw new Error("Your device couldn't save the received audio. Please free up space and retry.");
        reviewedParagraphs[index]=remote.textFingerprint;
        imported.push({paragraphIndex:index,contributorId,textFingerprint:remote.textFingerprint,audioId:id,
          audioUrl:URL.createObjectURL(blob),durationSec:remote.durationSec,mimeType:remote.mimeType});
        blobs.push(blob);
      }
      if(blobs.length!==project.messageParagraphs.filter(p=>p.trim()).length)throw new Error("A speaking part is missing.");
      const joined=await joinKeepVoiceParts(blobs);
      if(joined.blob.size>19*1024*1024)throw new Error("The combined narration is too long. Shorten a part and retry.");
      const audioId=newId("voice-" + project.publicationId);
      if(!(await putBlob(audioId,joined.blob)))throw new Error("Not enough device storage for the combined narration.");
      const signature=reviewedParagraphs.map((p,i)=>{
        const part=imported.find(item=>item.paragraphIndex===i && item.contributorId===speakerFor(i) && item.textFingerprint===p.trim());
        return [speakerFor(i),p.trim(),part?.audioId??""].join("::");
      }).join("\n");
      captionSyncToken.current++;
      const oldFinal=project.finalVoiceRecording;
      const old = project;
      const updated = {...old,stage:"recorded",messageParagraphs:reviewedParagraphs,voiceParts:imported,groupVoiceSignature:signature,
        memories:old.memories.length?composeSelfieStory(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories),old.selfieVideos??[],joined.durationSec,old):old.memories,
        finalVoiceRecording:{audioId,audioUrl:URL.createObjectURL(joined.blob),
          durationSec:joined.durationSec,mimeType:"audio/wav",demo:false},
        captionTranscript:"",captionCues:[],captionWords:[],captionTimingEstimated:false};
      if (!saveDraft(updated)) toast.warning("The combined voice is saved in this session. Keep the editor open while backup completes.");
      setProject(updated);
      if(oldFinal?.audioUrl)releaseUrls([oldFinal.audioUrl]);
      toast.success("All voices are together. Keep balanced every speaker's audio.");
      go("recorded");
      void syncFinalCaptions(joined.blob,"audio/wav",joined.durationSec,audioId);
    }catch(issue){
      toast.error(issue instanceof Error?issue.message:"Couldn't combine the received audio. All recordings are still safely saved.");
    }finally{groupFinishInFlight.current = false;setGroupBusy(false);}
  };

  const retryCaptionSync = async (): Promise<boolean> => {
    if (!rec || rec.demo || (!rec.audioId && !rec.audioUrl)) {
      toast.error("This Keep has no saved voice recording to re-sync.");
      return false;
    }
    if (captionSyncing || captionRetryInFlight.current) {
      toast.info("Your captions are already being synchronized.");
      return false;
    }
    captionRetryInFlight.current = true;
    setCaptionSyncing(true);
    setCaptionSyncError(false);
    setCaptionSyncErrorMessage("");
    setCaptionSyncProgress(null);
    try {
      // The saved draft may contain the original voice ID but no temporary
      // browser URL after a slow iPhone cloud restore. Use the private backup.
      let blob: Blob | undefined;
      if (rec.audioId) blob = await loadSavedVoiceForCaptionSync(rec.audioId);
      else if (rec.audioUrl) {
        const response = await fetch(rec.audioUrl);
        if (!response.ok) throw new Error("Your recorded voice could not be opened.");
        blob = await response.blob();
      }
      if (!blob?.size) throw new Error("Your recorded voice is unavailable. Try reopening your saved Keep.");
      if (rec.audioId && !rec.audioUrl) {
        const restoredUrl = URL.createObjectURL(blob);
        setProject(old => old.finalVoiceRecording?.audioId === rec.audioId
          ? { ...old, finalVoiceRecording: { ...old.finalVoiceRecording, audioUrl: restoredUrl } }
          : old);
      }
      return await syncFinalCaptions(blob, rec.mimeType || blob.type, rec.durationSec, rec.audioId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Your voice recording couldn't be recovered.";
      setCaptionSyncError(true);
      setCaptionSyncErrorMessage(message);
      toast.error("Couldn't re-sync captions", { description: message, duration: 9000 });
      return false;
    } finally {
      captionRetryInFlight.current = false;
      setCaptionSyncing(false);
    }
  };
  const resyncCaptionsFromVoice = async () => {
    // The editor presents a reliable inline confirmation on iPhone.
    setEditorPlaying(false);
    editorAudioRef.current?.pause();
    const synced = await retryCaptionSync();
    if (synced) {
      seekEditor(0);
      toast.success("Captions re-synced to your saved voice. Preview them before publishing.");
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
  // ---- Memories ----
  const [styleTouched, setStyleTouched] = useState(false);
  const personalMedia = (project.selfieBaseMedia?.length?project.selfieBaseMedia:project.memories).filter((m) => m.source !== "text" && !m.isSelfie);
  const photoCount = personalMedia.filter(m => m.kind === "image").length;
  const videoCount = personalMedia.filter(m => m.kind === "video").length;
  // Narration-first photo guidance: use the real voice recording when available,
  // otherwise estimate speaking time from the current message at a brisk reading pace.
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
    const selfieTakes=project.selfieVideos??[];
    const base = selfieTakes.length && !personalMedia.length ? []
      : chosenStyle === "memories" && personalMedia.length
        ? spreadMemories(personalMedia, duration)
        : arrangeWords(personalMedia, project.messageParagraphs, duration);
    const media=composeSelfieStory(base,selfieTakes,duration,project);
    patch({ memories: media, selfieBaseMedia:base, creationStyle: chosenStyle });
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
    const target=moments[frame % moments.length];
    if(!target || target.isSelfie)return prev;
    return {
      ...prev,
      memories:moments.map((m,i)=>i===frame % moments.length?{...m,...changes}:m),
      selfieBaseMedia:(prev.selfieBaseMedia??[]).map(m=>m.id===target.id?{...m,...changes}:m)
    };
  });
  const addFiles = async (e: ChangeEvent<HTMLInputElement>, replacementId?: string) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (mediaImportLock.current) {
      toast.info("Your previous media is still being added. Please finish that upload first.");
      return;
    }
    const supported = files.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(heic|heif|jpe?g|png|gif|webp|mov|mp4|m4v)$/i.test(f.name));
    if (!supported.length) { toast.error("Choose photos or short video clips to add."); return; }
    mediaImportLock.current = true;
    setBusy(true);
    setMediaImport({ total: supported.length, completed: 0 });
    // Give iPhone time to paint the status before reading iCloud media.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 30));
    const items: MediaItem[] = [];
    const skipped: string[] = [];
    let processed = 0;
    let optimizedPhotoCount = 0;
    let originalPhotoBytes = 0;
    let optimizedPhotoBytes = 0;
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
          // Keep the original image for editing and account backup. A smaller
          // viewing version is saved only if the quality guard approves it.
          let optimizedPhoto: Blob | null = null;
          if (kind === "image" && shouldOptimizeKeepPhoto(f)) {
            setMediaImport({ total: supported.length, completed: processed, detail: "Optimizing photo without losing detail…" });
            optimizedPhoto = await optimizeKeepPhoto(f, { name: f.name });
          }
          const persisted = await putBlob(id, savedFile);
          // Never accept a photo or video that won't survive closing Safari.
          if (!persisted) throw new Error(kind === "video" ? "This video couldn't be saved on your device. Try a shorter clip." : "This photo couldn't be saved on your device. Free some browser storage and try adding it again.");
          const optimizedSaved = optimizedPhoto && persisted
            ? await putBlob(keepOptimizedPhotoId(id), optimizedPhoto)
            : false;
          const displayBlob = optimizedSaved && optimizedPhoto ? optimizedPhoto : savedFile;
          if (optimizedSaved && optimizedPhoto) {
            optimizedPhotoCount++;
            originalPhotoBytes += f.size;
            optimizedPhotoBytes += optimizedPhoto.size;
          }
          items.push({ id, kind, source: "upload", url: URL.createObjectURL(displayBlob), name: savedFile.name, mimeType: savedFile.type, persisted, displayDurationSec });
        } catch (error) {
          skipped.push(`${f.name}: ${error instanceof Error ? error.message : "This file could not be added."}`);
        } finally {
          processed++;
          setMediaImport({ total: supported.length, completed: processed, detail: undefined });
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }
      }
      if (items.length) {
        if (replacementId !== undefined) {
          // A replacement targets the moment selected when the picker opened,
          // not whatever happens to be selected after a slow iCloud import.
          const target = (frames.length ? frames : shown).find(moment => moment.id === replacementId);
          if (!target || target.isSelfie) {
            toast.info(target?.isSelfie
              ? "Replace selfies in the Selfie Video editor."
              : "That moment has changed. Select it again before replacing.");
            for (const item of items) { releaseUrls([item.url]); if (item.persisted) void deleteBlobs([item.id, keepOptimizedPhotoId(item.id)]); }
          } else {
            const incoming = items[0]!;
            setProject(old => {
              const scenes = old.memories.length ? old.memories : sampleMemories();
              const latestTarget = scenes.find(moment => moment.id === replacementId);
              if (!latestTarget || latestTarget.isSelfie) return old;
              const replacement = {
                ...incoming, displayDurationSec: incoming.kind === "video"
                  ? incoming.displayDurationSec : latestTarget.displayDurationSec ?? 7,
                focusX: latestTarget.focusX, focusY: latestTarget.focusY,
                zoom: latestTarget.zoom, motion: latestTarget.motion,
                transition: latestTarget.transition,
              };
              const base = old.selfieBaseMedia?.length ? old.selfieBaseMedia : withoutSelfieScenes(old.memories);
              const nextBase = base.map(moment => moment.id === replacementId ? replacement : moment);
              return {
                ...old, selfieBaseMedia: nextBase,
                memories: (old.selfieVideos ?? []).length
                  ? composeSelfieStory(nextBase, old.selfieVideos ?? [], old.finalVoiceRecording?.durationSec ?? 150, old)
                  : scenes.map(moment => moment.id === replacementId ? replacement : moment),
                // Replacing a photo should not move it to the end of the
                // recipient's manually arranged photo-gallery order.
                readMemoryOrder: old.readMemoryOrder.map(id => id === replacementId ? replacement.id : id),
              };
            });
            for (const unused of items.slice(1)) { releaseUrls([unused.url]); if (unused.persisted) void deleteBlobs([unused.id, keepOptimizedPhotoId(unused.id)]); }
            toast.success("Moment updated");
          }
        } else {
          // The user can adjust other controls while iCloud uploads; append to
          // the *current* draft, never an older render captured before awaits.
          setProject(old => {
            const base = old.selfieBaseMedia?.length ? old.selfieBaseMedia : withoutSelfieScenes(old.memories);
            const nextBase = [...base, ...items];
            return {
              ...old,
              memories: composeSelfieStory(nextBase, old.selfieVideos ?? [], old.finalVoiceRecording?.durationSec ?? 150, old),
              selfieBaseMedia: nextBase,
            };
          });
          toast.success(`${items.length} ${items.length === 1 ? "moment" : "moments"} added`);
        }
      }
      if (optimizedPhotoCount > 0) toast.success(
        `${optimizedPhotoCount} ${optimizedPhotoCount === 1 ? "photo" : "photos"} optimized — ${keepPhotoSavings(originalPhotoBytes, optimizedPhotoBytes)}% less image data, originals preserved.`,
        { duration: 5500 },
      );
      if (skipped.length) toast.error(skipped.length === 1 ? skipped[0]! : `${skipped.length} files skipped. ${skipped[0]}`, { duration: 8000 });
      if (supported.length !== files.length) toast.info("Some selected files weren't recognized as photos or videos.");
    } finally {
      setMediaImport(null);
      setBusy(false);
      mediaImportLock.current = false;
    }
  };
  const importContributorMoments = async (items:RemoteMediaItem[]):Promise<number> => {
    const existing=new Set([...project.memories,...(project.selfieVideos??[])].map(moment=>moment.remoteMediaId).filter(Boolean));
    const newItems=items.filter(item=>!existing.has(item.id));
    if(!newItems.length)return 0;
    const staged:MediaItem[]=[];
    const savedIds:string[]=[];
    try{
      for(const media of newItems){
        if(media.kind!=="image"&&media.kind!=="video")throw new Error("An unsupported media type was shared.");
        if(media.bytes<100||media.bytes>(media.kind==="video"?40:15)*1024*1024)throw new Error("This shared file is too large.");
        const response=await fetch(media.signedUrl,{referrerPolicy:"no-referrer"});
        if(!response.ok)throw new Error(`Couldn't retrieve ${media.name}. Please refresh the shared moments.`);
        const blob=await response.blob();
        if(blob.size<100||blob.size>(media.kind==="video"?40:15)*1024*1024)
          throw new Error(`The file ${media.name} couldn't be verified.`);
        const id=newId(media.purpose==="selfie"?"selfie":"media");
        if(!(await putBlob(id,blob)))throw new Error("Your device couldn't save a shared moment. Free up space and try again.");
        savedIds.push(id);
        staged.push({
          id,kind:media.kind,source:"upload",name:media.name,mimeType:media.mimeType,
          remoteMediaId:media.id,persisted:true,url:URL.createObjectURL(blob),
          ...(media.purpose!=="selfie"&&media.framing?media.framing:{}),
          ...(media.purpose==="selfie"?{
            isSelfie:true,blobId:id,selfiePartIndex:media.paragraphIndex??0,
            videoDurationSec:media.durationSec??7,videoStartSec:0
          }:{}),
          displayDurationSec:media.kind==="video"?Math.max(1,Math.min(media.purpose==="selfie"?300:90,media.durationSec??7)):7
        });
      }
      setProject(old=>{
        const present=new Set([...old.memories,...(old.selfieVideos??[])].map(item=>item.remoteMediaId).filter(Boolean));
        const added=staged.filter(item=>!present.has(item.remoteMediaId));
        const selfies=[...(old.selfieVideos??[]),...added.filter(item=>item.isSelfie)];
        const ordinary=[...(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories)),...added.filter(item=>!item.isSelfie)];
        return {...old,selfieVideos:selfies,selfieBaseMedia:ordinary,memories:composeSelfieStory(ordinary,selfies,old.finalVoiceRecording?.durationSec??150,old)};
      });
      toast.success(`${staged.length} shared ${staged.length===1?"moment":"moments"} added. Arrange them in Photos.`);
      return staged.length;
    }catch(error){
      staged.forEach(item=>URL.revokeObjectURL(item.url));
      await deleteBlobs(savedIds);
      throw error;
    }
  };
  // The only explicit retake route lives in the editor, never in photo selection.
  const recordSelfieFromEditor = () => {
    if (usesRemoteRecording(project)) {
      toast.info("Remote contributors can add selfie video from their private invitation.");
      go("remoteInvite"); return;
    }
    if (hasSavedVoice(project) && !window.confirm("Recording a new synced selfie will replace your current narration. Continue?")) return;
    setReturnToEditorAfterRecording(true);
    patch({ recordingVisualMode: "selfie" });
    setGroupPartIndex(0);
    go(isTogether ? "groupRecord" : "record");
  };
  const continueToRecording = (mode: "photos" | "selfie") => {
    setSelfieBackupOpen(false);
    patch({ recordingVisualMode: mode });
    go("recordPrep");
  };
  const beginFramingReview = (origin: NonNullable<KeepProject["framingReviewOrigin"]>) => {
    setEditorPlaying(false);
    editorAudioRef.current?.pause();
    patch({ framingReviewIndex: 0, framingReviewOrigin: origin });
    go("framing");
  };
  const completeMediaReview = () => {
    const next = nextAfterMedia(project, personalMedia.length, minRecommendedMoments);
    if (next === "offerSelfie") setSelfieBackupOpen(true);
    else if (next === "recordPrep") continueToRecording(hasSavedVoice(project) ? project.recordingVisualMode ?? "photos" : "photos");
    else { setStyleTouched(false); go("storyStyle"); }
  };
  const continueFromMedia = () => {
    if (busy || mediaImportLock.current) return;
    if (personalMedia.length) beginFramingReview("memories");
    else completeMediaReview();
  };
  const completeFramingReview = () => {
    if (project.framingReviewOrigin === "editor" || project.framingReviewOrigin === "remoteInvite") {
      if (project.framingReviewOrigin === "editor") {
        setHistory(h => h.at(-1) === "editor" ? h.slice(0, -1) : h);
        setScreen("editor");
        resetPageScroll();
      } else go("editor");
    } else completeMediaReview();
  };
  const removeMomentById = (id: string) => {
    if (!id) return;
    const removedIndex = frames.findIndex(moment => moment.id === id);
    setEditorPlaying(false);
    editorAudioRef.current?.pause();
    setFrame(current => Math.max(0, Math.min(
      removedIndex >= 0 && current > removedIndex ? current - 1 : current,
      Math.max(0, frames.length - 2),
    )));
    setProject(previous => removeEditableMoment(previous, id));
  };
  const removeMemory = (i: number) => {
    const item = (frames.length ? frames : shown)[i];
    if (!item) return;
    if (item.isSelfie) { setEditorPanel("Selfie"); toast.info("Edit or hide the selfie in the Selfie Video controls."); return; }
    removeMomentById(item.id);
  };
  const moveMemory = (from: number, to: number) => {
    const list = [...(frames.length ? frames : shown)];
    if (to < 0 || to >= list.length || from === to) return;
    if(list[from]?.isSelfie||list[to]?.isSelfie){toast.info("Use Selfie Video to arrange the opening and closing moments.");return;}
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
    patch({ memories: list, selfieBaseMedia:list.filter(item=>!item.isSelfie) });
    setFrame(to);
  };
  const duplicateMoment = async (index:number, firstDuration?:number, secondDuration?:number) => {
    const item = shown[index];
    if (!item) return;
    if(item.isSelfie){setEditorPanel("Selfie");toast.info("Use the Selfie Video editor to change selfie footage.");return;}
    const id = newId("media");
    let persisted = item.persisted;
    let url = item.url;
    if (item.source === "upload") {
      const blob = await getBlob(item.blobId??item.id);
      if (!blob) { toast.error("The original photo is missing. Please re-add it."); return; }
      persisted = await putBlob(id,blob);
      if (!persisted) { toast.error("This moment could not be duplicated. Free some device storage and try again."); return; }
      url = URL.createObjectURL(blob);
    }
    const copy:MediaItem = {...item,id,blobId:id,url,persisted,displayDurationSec:secondDuration??item.displayDurationSec};
    const list = [...shown];
    if(firstDuration!==undefined) list[index]={...item,displayDurationSec:firstDuration};
    list.splice(index+1,0,copy);
    const base=list.filter(moment=>!moment.isSelfie);
    patch({memories:list,selfieBaseMedia:base});
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
    clearEditorOutro();
    const next = Math.max(0, Math.min(editorDuration, time));
    // Seeking should not restart the soundtrack; that causes audible jumps and drift.
    if (editorAudioRef.current) editorAudioRef.current.currentTime = next;
    if(next<0.05){
      editorNarrationStartedRef.current=false;
      editorIntroRemainingRef.current=KEEP_MUSIC_LEAD_SECONDS*1000;
    }else{
      editorNarrationStartedRef.current=true;
      editorIntroRemainingRef.current=0;
    }
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
      controller = createKeepVoiceMix(audio, project.musicMood, project.voiceMusicBalance as MusicBalance, rec.durationSec, KEEP_MUSIC_LEAD_SECONDS, mix);
      editorMixRef.current = controller;
      controller?.setLevels(project.voiceVolume ?? 60, project.musicVolume ?? 60);
      if (controller) void controller.pause();
    } catch {
      toast.error("Music mixing is unavailable on this device. Voice playback will still work.");
    }
    return () => {
      cancelEditorIntro();
      clearEditorOutro();
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
    if(screen!=="editor")return;
    const audio=editorAudioRef.current;
    if(!audio||!rec?.audioUrl||rec.demo)return;
    if(!editorPlaying){
      cancelEditorIntro();
      clearEditorOutro();
      audio.pause();
      void editorMixRef.current?.pause();
      return;
    }
    stopMusicSample();
    setMusicSampling("");
    const attempt=++editorPlayAttemptRef.current;
    void (async()=>{
      try{
        const controller=editorMixRef.current;
        // If an older browser cannot mix tracks, narration still works.
        if(controller)await controller.play();
        if(attempt!==editorPlayAttemptRef.current)return;
        const startVoice=()=>{
          if(attempt!==editorPlayAttemptRef.current)return;
          editorIntroTimerRef.current=null;
          editorIntroRemainingRef.current=0;
          editorNarrationStartedRef.current=true;
          void audio.play().catch(()=>{
            if(attempt!==editorPlayAttemptRef.current)return;
            setEditorPlaying(false);
            toast.error("Tap play again to enable audio on this device.");
          });
        };
        if(controller && !editorNarrationStartedRef.current && audio.currentTime<0.05){
          editorIntroStartedAtRef.current=performance.now();
          editorIntroTimerRef.current=window.setTimeout(startVoice,editorIntroRemainingRef.current);
        }else startVoice();
      }catch{
        if(attempt!==editorPlayAttemptRef.current)return;
        setEditorPlaying(false);
        toast.error("The soundtrack couldn't start. Tap play again.");
      }
    })();
    return ()=>{
      cancelEditorIntro();
      audio.pause();
    };
  },[screen,editorPlaying,rec?.audioUrl,rec?.demo]);
  useEffect(()=>{
    if(screen!=="editor")return;
    const onHide=()=>{if(document.hidden)setEditorPlaying(false);};
    document.addEventListener("visibilitychange",onHide);
    return ()=>document.removeEventListener("visibilitychange",onHide);
  },[screen]);

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
      if (next >= editorDuration) {
        // Keep the existing final photograph up while the soundtrack rises
        // after the final spoken word. onEnded owns the music-tail timeout.
        if (voiceClock) {
          if (audio?.ended) return;
        } else {
          setEditorPlaying(false);
          return;
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [screen, editorPlaying, rec?.audioUrl, rec?.demo, editorDuration]);
  useEffect(() => {
    if (screen === "editor" && editorPlaying) setFrame(editorSceneAt(editorTime));
  }, [screen, editorTime, editorPlaying, shown.length, editorDuration, editorMediaTotal]);

  const engraving = project.cardEngraving;
  // Publishing happens as part of finishing, not through a separate "Update" action.
  // A published Keep is always republished under its original ID/token.
  const finishAndShare = async (updated?: KeepProject) => {
    if (publishingLock.current) return;
    const original = updated ?? project;
    if (captionSyncing) { setPublishError("Keep is still syncing your captions. Finish that step before sharing."); return; }
    if (original.captionStyle !== "None" && original.captionTimingEstimated) {
      setPublishError("These captions use estimated timestamps. Re-sync to your actual voice in the editor, or switch captions off before publishing.");
      return;
    }
    if (original.captionStyle !== "None" && original.finalVoiceRecording && !original.finalVoiceRecording.demo && !original.captionCues.length) {
      setPublishError("Your captions are missing. Return to the editor, open Captions, and retry syncing before sharing.");
      return;
    }
    const recovered = recoverCaptionTiming(original.captionWords ?? [], original.captionCues, original.finalVoiceRecording?.durationSec ?? 0);
    const current = recovered.repaired ? {
      ...original, captionCues: recovered.cues, captionWords: recovered.words, captionTimingEstimated: true,
    } : original;
    if (current.captionStyle !== "None" && current.captionTimingEstimated) {
      setProject(current);
      setPublishError("Caption timing needs verification. Re-sync captions to your voice before publishing.");
      return;
    }
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
    setRenderKeep(null);
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
      const complete = { ...next, stage: "finalizing", publicationId: result.keepId, publicationToken: result.token };
      setProject(complete);
      saveDraft(complete);
      // The source snapshot is saved; checkout waits for the exact finished film.
      // Persist the editable version as well so Back to editor restores these edits.
      try {
        const session = await activeKeepSession();
        if (session) await saveCloudDraft(complete, session);
      } catch {
        toast.info("Your published Keep is saved. A cloud draft backup will retry when you reopen the editor.");
      }
      // Stay on the current screen. The modal starts or resumes the durable
      // render for the saved snapshot and hands off only after MP4 verification.
      setPublishStatus("Preparing your finished film…");
      setRenderKeep(await loadCheckoutKeep(result.keepId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't save your Keep. Please try again.";
      setPublishError(message);
      toast.error(message);
      publishingLock.current = false;
      setPublishing(false);
      setPublishStatus("");
    }
  };
  const toCard = () => {
    if (mediaImportLock.current || captionSyncing) {
      toast.info(mediaImportLock.current ? "Finish adding your photos and videos before continuing." : "Keep is still syncing your captions.");
      return;
    }
    if(isTogether && project.voiceRecordingLocation==="remote" && (!rec?.audioUrl || !groupReady || project.groupVoiceSignature!==groupSignature)){
      toast.info("Collect and combine all remote recordings before finishing this Keep.");
      setReturnToEditorAfterRecording(true);
      go("remoteInvite");
      return;
    }
    const next = !project.publicationToken && !project.cardEngravingLayout && !engraving[0]?.trim()
      ? { ...project, cardEngraving: [(name || "YOUR KEEP").toUpperCase(), engraving[1] || "", engraving[2] || ""], cardEngravingLayout: engravingLayout() }
      : project;
    if (next !== project) setProject(next);
    saveDraft(next);
    // Every Keep, including one already published, must revisit the editable
    // final words and physical card before saving its next revision.
    setPublishError("");
    go("card");
  };
  const totalSec = rec?.durationSec ?? 150;

  const recipientReady = !!chosenRelationship
    && (chosenRelationship === "Myself" || !!name.trim())
    && (chosenRelationship !== "Someone else" || !!(otherRelationship || savedCustomRelationship).trim());
  const completeRecipient = () => {
    if (!recipientReady) return;
    if (chosenRelationship === "Someone else") {
      patch({ relationship: (otherRelationship || savedCustomRelationship).trim() });
    }
    go("occasion");
  };

  const title = (eyebrow: string, heading: string, sub?: ReactNode) => <div className="mb-10 keep-page-heading"><h1 className="keep-editorial-title">{heading}</h1>{sub && <p className="keep-page-description mt-5">{sub}</p>}</div>;
  const top = (_label?: string, onBack = back) => <header className="sticky top-0 z-30 flex h-[calc(4.25rem+env(safe-area-inset-top))] w-full min-w-0 items-center justify-between border-b border-border/50 bg-background/95 px-6 pt-[env(safe-area-inset-top)] backdrop-blur-sm"><Button variant="bare" size="icon" aria-label="Go back" onClick={onBack}><ArrowLeft /></Button><span className="keep-wordmark !text-[26px]">Keep</span>{accountLink}</header>;
  const nextButton = (label: string, action: () => void, disabled = false) => <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" onClick={action} disabled={disabled}>{label}<ArrowRight /></Button>;
  const wave = (count = 27, active = true) => <div className="flex h-12 items-center justify-center gap-[3px]" aria-hidden="true">{Array.from({ length: count }, (_, i) => <span key={i} className={`${active ? "wave-bar" : "opacity-40"} w-[2px] rounded-full bg-accent`} style={{ height: `${10 + ((i * 17) % 34)}px`, animationDelay: `${-(i % 7) * 0.13}s` }} />)}</div>;
  const note = (children: ReactNode) => <p className="text-center text-[11px] leading-5 text-muted-foreground">{children}</p>;
  const sheet = (heading: string, onClose: () => void, children: ReactNode) => <div className={`keep-fixed-screen fixed left-0 right-0 top-0 z-40 flex items-end justify-center ${heading === "Moments" ? "pointer-events-none bg-transparent" : "bg-background/80"}`} onClick={heading === "Moments" ? undefined : onClose}><div className={`keep-sheet-panel w-full max-w-[540px] overflow-y-auto rounded-t-lg bg-card px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-6 ${heading === "Moments" ? "pointer-events-auto max-h-[43dvh] border-t border-border shadow-2xl" : ""}`} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-display text-[30px]">{heading}</h2><Button variant="bare" size="icon" aria-label="Close" onClick={onClose}><X /></Button></div>{children}</div></div>;
  const micUnavailable = recorder.supported === false || recorder.status === "denied" || recorder.status === "error";
  const micMessage = recorder.supported === false ? "This browser can't record audio here." : recorder.status === "denied" ? "Microphone access was blocked. You can allow it in your browser settings." : recorder.status === "error" ? "The microphone couldn't start." : "";
  const isRecording = recorder.status === "recording" || recorder.status === "paused";
  const recordingPreparing = recorder.status === "countdown" || recorder.status === "requesting";
  const accountLink = publishing ? <span className="w-10" /> : <KeepAppMenu />;
  const fileInputs = <><input ref={draftInput} type="file" accept=".docx,.pdf,.txt,.md,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,application/rtf" className="sr-only" aria-label="Upload something you have already written" tabIndex={-1} onChange={(e) => void importDraft(e)} /><input ref={addInput} type="file" accept="image/*,video/mp4,video/quicktime,video/*" multiple className="sr-only" aria-label="Choose photos and videos" tabIndex={-1} onChange={(e) => void addFiles(e)} /><input ref={replaceInput} type="file" accept="image/*,video/mp4,video/quicktime,video/*" className="sr-only" aria-label="Choose a replacement photo or short video" tabIndex={-1} onChange={(e) => { const id = replaceTargetId.current; replaceTargetId.current = null; void addFiles(e, id ?? undefined); }} /></>;

  if (resumeError) return <main className="app-shell flex min-h-dvh flex-col px-8 py-10"><a href="/app" className="keep-wordmark" aria-label="Keep home">Keep</a><div className="my-auto max-w-sm"><h1 className="font-display text-[38px] leading-tight">We couldn't open your Keep.</h1><p role="alert" className="mt-5 text-sm leading-7 text-muted-foreground">{resumeError}</p><div className="mt-9 flex flex-col gap-3"><Button variant="keep" size="touch" onClick={() => window.location.reload()}>Try again</Button><a href="/app" className="rounded-xl border border-border px-5 py-3 text-center text-sm">Back to your creations</a></div></div></main>;
  if (!hydrated) return restoringPersonalKeep
    ? <KeepOpeningScreen phase={openingPhase} progress={openingProgress} onBack={() => window.location.assign("/app")} />
    : <KeepLoadingScreen />;
  if (project.restoreIncomplete && screen !== "editor") return <main className="app-shell flex min-h-dvh flex-col px-8 py-10">
    <a href="/app" className="keep-wordmark" aria-label="Keep home">Keep</a>
    <div className="my-auto max-w-sm">
      <h1 className="font-display text-[38px] leading-tight">Let's restore your Keep.</h1>
      <p role="alert" className="mt-5 text-sm leading-7 text-muted-foreground">{project.restoreMissingCount ?? "Some"} saved files could not be opened yet. Your existing draft has not been overwritten. Editing and saving are paused until these files are restored.</p>
      <div className="mt-9 flex flex-col gap-3"><Button variant="keep" size="touch" disabled={restoreRetrying} onClick={() => void retryMissingRestore()}>{restoreRetrying ? <><Loader2 className="size-4 animate-spin" /> Restoring…</> : "Retry restoring files"}</Button><a href="/app" className="rounded-xl border border-border px-5 py-3 text-center text-sm">Back to your creations</a></div>
    </div>
  </main>;
  return <main className={`app-shell keep-creator-app keep-creator-app--${screen}`}>{fileInputs}
    {publishing && <KeepFinishingDialog keep={renderKeep} savingStatus={publishStatus} onReady={() => { if (renderKeep) window.location.assign(keepCheckoutPath(renderKeep.id)); }} />}
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
    <div key={screen} className={`page-enter keep-screen keep-screen--${screen}`}
      style={screen === "interview" && interviewViewport ? {
        "--keep-interview-height": `${interviewViewport.height}px`,
        "--keep-interview-top": `${interviewViewport.top}px`,
      } as CSSProperties : undefined}>
    {screen === "you" && <>{top()}<div className="px-7 pt-8">{title("Your space", "Your Keeps.", "The things worth keeping, all in one place.")}<div className="mt-12 border-t border-border">{[{ label: "My cards", Icon: Radio }, { label: "Downloads & backups", Icon: Download }, { label: "Privacy", Icon: LockKeyhole }, { label: "Help", Icon: CircleHelp }].map(({ label, Icon }) => <Button key={label} variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal" onClick={() => setSetting(label)}><span className="flex items-center gap-4"><Icon className="size-4 text-accent" />{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}{project.active && <Button variant="bare" className="flex h-17 w-full justify-between border-b border-border px-0 text-sm font-normal text-destructive" onClick={() => { if (!window.confirm("Delete your draft Keep? Recordings and photos added to it will be removed from this device.")) return; discard(project); clearDraft(project.publicationId); setProject({...newProject(),draftOwnerId:project.draftOwnerId}); toast.success("Draft deleted"); }}><span className="flex items-center gap-4"><Trash2 className="size-4" />Delete draft Keep</span></Button>}</div><p className="mt-9 text-xs leading-6 text-muted-foreground">Your Keeps are private.</p></div>{setting && sheet(setting, () => setSetting(""), <><p className="mt-5 text-sm leading-7 text-muted-foreground">{setting === "Privacy" ? "Your working draft is saved on this device and can sync to your signed-in Keep account. Published Keeps use private viewing links; anyone with a link can view that Keep, so share it intentionally." : setting === "My cards" ? "Digital Keeps can be viewed and managed in My Keeps. Physical card ordering and fulfillment are not yet live." : setting === "Downloads & backups" ? "Keep saves drafts on this device and syncs to your account when signed in. If an upload is still in progress, keep this browser's data until backup finishes. Finished Keeps are saved as 1080p MP4 films. Find your finished film in My Keeps." : "If something doesn't work, don't clear your browser data. Return to My Keeps and preserve your draft. In-app support is being prepared for launch."}</p><Button variant="quiet" className="mt-8 w-full" onClick={() => setSetting("")}>Done</Button></>)}</>}
    {screen === "detail" && <>{top("READY")}<div className="relative mx-4 h-[min(55dvh,520px)] overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="h-full w-full object-cover" /><div className="absolute inset-0 photo-bottom" /><div className="absolute bottom-8 left-6"><p className="eyebrow text-foreground">ANNIVERSARY · 2026</p><h1 className="display mt-3 text-5xl">HANNA</h1><p className="mt-3 text-sm">from Alex · 2:30</p></div></div><div className="space-y-3 px-6 pt-7">{nextButton("Play Keep", () => { setViewingDemo(true); go("preview"); })}<Button variant="quiet" size="touch" className="w-full" onClick={editDemoCopy}><Settings2 /> Edit a copy</Button><Button variant="bare" size="touch" className="w-full" asChild><Link to="/recipient" search={{ keep: "" }}><Radio /> View as recipient</Link></Button></div></>}
    {screen === "recipient" && <>{top("01 / 05")}<div className="px-7 pb-12 pt-11">
      {title("Begin with someone", "Who is this Keep for?")}<KeepPhoneTip />
      <div aria-label="Who is this Keep for?" className="space-y-7">
        {relationshipGroups.map((group) => <section key={group.title} aria-label={group.title}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#817365]">{group.title}</h2>
          <div className="space-y-3" role="group" aria-label={group.title + " relationships"}>
            {Array.from({ length: Math.ceil(group.options.length / 2) }, (_, i) => group.options.slice(i * 2, i * 2 + 2))
              .map((row) => <div key={row.join("|")}>
                <div className="grid grid-cols-2 gap-3">
                  {row.map((relationship) => <Button key={relationship} type="button"
                    aria-pressed={chosenRelationship === relationship} variant="quiet"
                    className={`keep-choice-bubble min-h-16 h-auto py-3 ${chosenRelationship === relationship ? "keep-choice-bubble--selected" : ""}`}
                    onClick={() => {
                      patch({ relationship, ...(relationship === "Myself" ? { recipientName: "Myself" }
                        : chosenRelationship === "Myself" ? { recipientName: "" } : {}) });
                      if (relationship !== "Someone else") setOtherRelationship("");
                      else if (savedCustomRelationship) setOtherRelationship(savedCustomRelationship);
                    }}>
                    <span className="min-w-0 flex-1 text-left leading-snug">{relationship}</span>
                    {chosenRelationship === relationship && <span className="keep-choice-check">
                      <Check className="!size-3.5" strokeWidth={2.7}/>
                    </span>}
                  </Button>)}
                </div>
                {row.some((relationship) => relationship === chosenRelationship) && (
                  <div id="recipient-details" role="region" aria-label="Next, personalize your Keep"
                    className="page-enter mt-3 rounded-[18px] border border-[#D7C9B9] bg-[#F2EDE6] px-5 py-5 shadow-sm">
                    {chosenRelationship === "Someone else" && <div className="mb-6">
                      <label htmlFor="other-relationship" className="block text-[11px] font-semibold uppercase tracking-[.14em] text-[#746658]">Who are they to you?</label>
                      <input id="other-relationship"
                        value={otherRelationship || savedCustomRelationship}
                        onChange={(e) => {
                          if (savedCustomRelationship) patch({ relationship: "Someone else" });
                          setOtherRelationship(e.target.value.slice(0, 50));
                        }}
                        placeholder="My coach" autoComplete="off"
                        className="mt-3 w-full rounded-xl border border-[#CBBCAE] bg-white px-4 py-3 font-display text-[26px] text-[#241F19] outline-none focus:border-[#6A5849] focus:ring-2 focus:ring-[#6A5849]/20" />
                    </div>}
                    {chosenRelationship !== "Myself" ? <>
                      <label htmlFor="recipient-name" className="block text-[11px] font-semibold uppercase tracking-[.14em] text-[#746658]">What's their name?</label>
                      <input id="recipient-name" value={name}
                        onChange={(e) => patch({ recipientName: e.target.value.slice(0, 60) })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); completeRecipient(); } }}
                        enterKeyHint="done"
                        placeholder="Type their name here" autoComplete="off"
                        className="mt-3 w-full rounded-xl border border-[#CBBCAE] bg-white px-4 py-3 font-display text-[26px] text-[#241F19] outline-none focus:border-[#6A5849] focus:ring-2 focus:ring-[#6A5849]/20" />
                      <p className="mt-3 text-xs leading-5 text-[#766A60]">This name will appear throughout your Keep.</p>
                    </> : <p className="text-sm leading-6 text-[#66584C]">A Keep for yourself. You're ready for the next step.</p>}
                    <div className="mt-6">{nextButton("Continue", completeRecipient, !recipientReady)}</div>
                  </div>
                )}
              </div>)}
          </div>
        </section>)}
      </div>
    </div></>}
    {screen === "occasion" && <>{top("02 / 05")}<div className="px-7 pb-12 pt-11">
      {title("Give it a moment", "What are you keeping?", "Choose an occasion or moment.")}
      <KeepOccasionChoices occasion={project.occasion} occasionDetail={project.occasionDetail} onChange={patch}
        continueButton={(disabled) => nextButton("Continue", () => {
          const isOther = chosenKeepOccasion(project.occasion) === "Other";
          const detail = (project.occasionDetail || (isOther && project.occasion !== "Other" ? project.occasion : "")).trim();
          patch({ occasion: isOther ? detail : project.occasion, occasionDetail: detail });
          go("voices");
        }, disabled)} />
    </div></>}
    {screen === "voices" && <>{top("03 / 05")}<div className="mx-auto max-w-[620px] px-7 pb-12 pt-9">
      {title("The voices behind it", "Will anyone create this Keep with you?", "Most Keeps are made by one person. You can also bring several voices together in one gift.")}
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose how many voices">
        <button type="button" aria-pressed={project.voiceMode !== "together"} onClick={() => patch({voiceMode:"solo"})}
          className={`keep-step-choice group ${project.voiceMode !== "together" ? "keep-step-choice--active" : "keep-step-choice--light"}`}>
          <span className="keep-step-choice__top">
            <span className="keep-step-choice__icon"><Mic className="size-6" strokeWidth={1.6}/></span>
            <span className="keep-step-choice__arrow" aria-hidden="true"><ArrowRight className="size-5" strokeWidth={1.6}/></span>
          </span>
          <span className="keep-step-choice__eyebrow">A PERSONAL MESSAGE</span>
          <strong className="keep-step-choice__title">Just me</strong>
          <span className="keep-step-choice__description">One voice, one heartfelt message.</span>
        </button>
        <button type="button" aria-pressed={project.voiceMode === "together"} onClick={() => patch({voiceMode:"together",contributors:(project.contributors?.length ?? 0) >= 2 ? project.contributors : [{id:newId("speaker"),name:""},{id:newId("speaker"),name:""}]})}
          className={`keep-step-choice group ${project.voiceMode === "together" ? "keep-step-choice--active" : "keep-step-choice--light"}`}>
          <span className="keep-step-choice__top">
            <span className="keep-step-choice__icon font-display text-3xl leading-none">♡</span>
            <span className="keep-step-choice__arrow" aria-hidden="true"><ArrowRight className="size-5" strokeWidth={1.6}/></span>
          </span>
          <span className="keep-step-choice__eyebrow">SHARE THE STORY</span>
          <strong className="keep-step-choice__title">Create together</strong>
          <span className="keep-step-choice__description">Different voices. One beautiful Keep.</span>
        </button>
      </div>
      {project.voiceMode === "together" && <KeepCollaborativeVoices
        contributors={project.contributors ?? []}
        location={project.voiceRecordingLocation}
        onRename={(id, name) => patch({ contributors: (project.contributors ?? []).map(person => person.id === id ? { ...person, name } : person) })}
        onRelationship={(id,relationship)=>patch({contributors:(project.contributors??[]).map(p=>p.id===id?{...p,relationship}:p)})}
        onAdd={() => patch({ contributors: [...(project.contributors ?? []), { id: newId("speaker"), name: "" }] })}
        onRemove={(id) => patch({ contributors: (project.contributors ?? []).filter(person => person.id !== id) })}
        onLocationChange={(voiceRecordingLocation) => patch({ voiceRecordingLocation })}
      />}
      <div className="mt-7">
        <Button type="button" variant="keep" size="touch" className="keep-voices-continue"
          onClick={() => go("intent")}
          disabled={project.voiceMode === "together" && ((project.contributors?.length ?? 0) < 2 || (project.contributors ?? []).some(p => !p.name.trim()) || new Set((project.contributors ?? []).map(p => p.name.trim().toLowerCase())).size !== (project.contributors?.length ?? 0))}>
          Continue <span className="keep-voices-continue__arrow" aria-hidden="true"><ArrowRight strokeWidth={1.6} /></span>
        </Button>
      </div>
    </div></>}
    {screen === "intent" && <>{top("04 / 05")}
      <KeepHeartAndFeelings intent={project.intent} selected={project.recipientFeelings ?? []}
        forSelf={project.relationship === "Myself"} dictating={dictating && dictationTargetRef.current === "intent"}
        onIntentChange={(intent) => patch({ intent })} onToggleDictation={() => toggleDictation("intent")}
        onFeelingsChange={(recipientFeelings) => patch({ recipientFeelings })} onContinue={() => go(project.voiceMode==="together"?"collaboration":"path")} />
    </>}
    {screen === "collaboration" && <KeepCreativeCollaboration project={project} renderHeader={onBack=>top(undefined,onBack)} onChange={patch} onComplete={change=>{patch(change);setActiveParagraph(0);go("message");}}/>}
    {screen === "path" && <>{top("05 / 05")}<div className="px-7 pt-11">
      {title("The heart of it", "What do you want to say?")}
      <div className="keep-creator-path-options grid grid-cols-1 gap-3">
        <button type="button" className="keep-step-choice keep-step-choice--featured group" onClick={startInterview}>
          <span className="keep-step-choice__top">
            <span className="keep-step-choice__icon"><Sparkles className="size-6" strokeWidth={1.6}/></span>
            <span className="keep-step-choice__arrow" aria-hidden="true"><ArrowRight className="size-5" strokeWidth={1.6}/></span>
          </span>
          <span className="keep-step-choice__eyebrow">GUIDED BY KEEP</span>
          <strong className="keep-step-choice__title">Help me find the words</strong>
          <span className="keep-step-choice__description">A few thoughtful questions to guide you.</span>
        </button>
        <button type="button" className="keep-step-choice keep-step-choice--light group" onClick={() => go(project.voiceMode==="together"?"collaboration":"write")}>
          <span className="keep-step-choice__top">
            <span className="keep-step-choice__icon font-display text-3xl leading-none">“</span>
            <span className="keep-step-choice__arrow" aria-hidden="true"><ArrowRight className="size-5" strokeWidth={1.6}/></span>
          </span>
          <span className="keep-step-choice__eyebrow">IN YOUR OWN WORDS</span>
          <strong className="keep-step-choice__title">I know what I want to say</strong>
          <span className="keep-step-choice__description">Speak, type, or upload your words.</span>
        </button>
      </div>
    </div></>}
    {screen === "interview" && <div
      className={`keep-interview-screen flex min-h-0 w-full flex-col bg-background ${interviewCompact ? "keep-interview-screen--compact" : ""}`}
    >
      {top()}
      <div className="keep-interview-progress">
        <div className="keep-interview-progress__line">
          <p className="keep-interview-progress__eyebrow eyebrow">Your story, your words</p>
          <p className="keep-interview-progress__count">Question {q + 1} · 8–10 total</p>
          {interviewCompact && <button type="button" className="keep-interview-progress__done" onPointerDown={e => e.preventDefault()} onClick={() => { interviewAnswerRef.current?.blur(); setInterviewInputFocused(false); }}>Done typing</button>}
        </div>
        <div className="keep-interview-progress__track grid h-[5px] gap-1.5" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}
             role="progressbar" aria-label="Interview progress" aria-valuemin={0}
             aria-valuemax={10} aria-valuenow={Math.min(q + 1, 10)}
             aria-valuetext={`Question ${q + 1} of 8 to 10. Some stories need one or two extra questions.`}>
          {Array.from({ length: 10 }, (_, i) =>
            <span key={i} className={`h-[4px] rounded-full ${i < completedAnswers ? "bg-accent" : i === q ? "bg-accent/60" : "bg-border"}`} />)}
        </div>
      </div>
      <div ref={interviewBodyRef} className="keep-interview-body thin-scroll">
      <div key={q} className="keep-interview-question">
        {!aiReady ? <div className="mx-auto max-w-md py-4 text-center page-enter">
          <h1 className="font-display text-3xl leading-tight">Let's find your words another way.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">The guided interview is temporarily unavailable. You can still write your message.</p>
        </div> : aiBusy === "start" || aiBusy === "next" ? <div className="mx-auto max-w-md py-8 text-center page-enter">
          {wave(17,true)}
          <p className="mt-5 font-display text-2xl">{aiBusy === "start" ? "Getting ready to listen…" : "Thinking about your words…"}</p>
        </div> : !project.interviewQuestion ? <p className="mx-auto max-w-md py-8 text-center font-display text-2xl">{aiError ? aiErrorText : "Getting ready to listen…"}</p>
        : <div className="mx-auto max-w-md page-enter">
          <p className="keep-interview-question__eyebrow">A question for you</p>
          <h1 id="keep-interview-question" className="keep-interview-question__title">{project.interviewQuestion}</h1>
          {currentAnswer?.audioUrl && !isRecording && !interviewCompact && <KeepRecordedAnswerPlayer
            key={currentAnswer.audioUrl} src={currentAnswer.audioUrl} durationSec={currentAnswer.durationSec} />}
          {aiBusy === "transcribe" && <p role="status" className="mt-5 text-sm text-accent animate-pulse">Turning your recording into words…</p>}
          {micUnavailable && !interviewCompact && <p className="mt-4 text-xs leading-5 text-muted-foreground">{micMessage} You can type your answer instead.</p>}
        </div>}
        {aiError && aiReady && <div className="mx-auto mt-5 max-w-md border-l-2 border-accent pl-4 text-left" role="alert">
          <p className="text-sm leading-6">{aiErrorText}</p>
          <Button variant="bare" size="sm" className="mt-2 px-0 text-accent" onClick={aiError.retry}><RotateCcw /> Retry</Button>
        </div>}
      </div>
      <div className="keep-interview-response">
        <div className="keep-interview-response__inner mx-auto max-w-md">
          {!aiReady ? <Button variant="keep" size="touch" className="keep-interview-response__primary" onClick={() => go("write")}><span>Write my message instead</span><span className="keep-interview-response__icon"><ArrowRight strokeWidth={1.5}/></span></Button>
          : isRecording ? <div className="keep-interview-response__recording">
            <p role="status" className="keep-interview-response__recording-status"><span className="keep-interview-response__recording-dot" aria-hidden="true" /> Recording <span className="keep-interview-response__timer">{fmt(recorder.elapsed)}</span></p>
            <Button variant="keep" size="touch" className="keep-interview-response__primary" onClick={() => void stopAnswer()}><span className="keep-interview-response__icon"><Square fill="currentColor" strokeWidth={1.5}/></span> Stop recording</Button>
          </div> : !project.interviewQuestion ? <Button variant="quiet" size="touch" className="keep-interview-response__secondary" onClick={() => go("write")}>Write my message instead <ArrowRight strokeWidth={1.5}/></Button>
          : <>
            {aiBusy !== "transcribe" && <div className="keep-interview-response__paper">
              <label htmlFor="keep-interview-answer" className="keep-interview-response__label">Your answer</label>
              <textarea ref={interviewAnswerRef} id="keep-interview-answer" aria-label="Your answer" aria-describedby={aiBusy === "start" || aiBusy === "next" ? undefined : "keep-interview-question"} disabled={aiBusy === "start" || aiBusy === "next"} value={currentAnswer?.transcript ?? ""}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onFocus={() => setInterviewInputFocused(true)}
                onBlur={() => setInterviewInputFocused(false)}
                placeholder="Begin in your own words…"
                rows={interviewCompact ? 2 : 4}
                className="keep-interview-response__input thin-scroll"
              />
            </div>}
            <div className="keep-interview-response__actions">
              {currentAnswer?.transcript?.trim()
                ? <Button variant="keep" size="touch" className="keep-interview-response__primary" disabled={!!aiBusy} onPointerDown={e => { if (interviewInputFocused) e.preventDefault(); }} onClick={nextQuestion}>Continue <span className="keep-interview-response__icon"><ArrowRight strokeWidth={1.5}/></span></Button>
                : !micUnavailable && aiBusy !== "transcribe"
                  ? <Button variant="keep" size="touch" className="keep-interview-response__primary" disabled={!!aiBusy || recorder.status === "requesting" || recorder.supported === null} onClick={() => void startAnswer()}><span className="keep-interview-response__icon"><Mic strokeWidth={1.6}/></span>{recorder.status === "requesting" ? "Waiting for microphone…" : "Speak your answer"}</Button>
                  : aiBusy === "transcribe" ? <p className="keep-interview-response__saving" role="status">Saving your words…</p> : null}
              {!interviewCompact && (currentAnswer?.transcript?.trim() ? !micUnavailable : true) && !micUnavailable && !!currentAnswer?.transcript?.trim() && <Button variant="bare" size="sm" className="keep-interview-response__secondary" disabled={!!aiBusy} onClick={() => void startAnswer()}><Mic strokeWidth={1.5}/> Record again</Button>}
              {!interviewCompact && <Button variant="bare" size="sm" className="keep-interview-response__secondary keep-interview-response__alternative" onClick={() => go("write")}>Write my message instead <ArrowRight strokeWidth={1.5}/></Button>}
            </div>
          </>}
        </div>
      </div>
      </div>
    </div>}
    {screen === "interview" && q === 0 && !project.interviewWelcomeSeen &&
      <KeepInterviewIntro onReady={acknowledgeInterviewTips} />}
    {screen === "summary" && <>{top()}
      <KeepInterviewSummary summary={project.interviewSummary} aiReady={aiReady} onCreate={createAiMessage} onWrite={() => go("write")} />
    </>}
    {screen === "messageGenerating" && <div className="relative flex keep-min-screen flex-col overflow-hidden px-7 pb-[max(40px,env(safe-area-inset-bottom))] pt-[max(36px,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-x-[-25%] top-[20%] h-72 rounded-full bg-accent/[0.06] blur-3xl" />
      <span className="brand relative z-10">Keep</span>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-10 flex size-20 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.04]"><Sparkles className="size-7 animate-pulse text-accent" /></div>
        <h1 className="display max-w-sm text-[clamp(48px,13vw,68px)] leading-[0.98]">Putting your words together.</h1>
        {aiBusy === "draft" && <div className="mt-9 w-full max-w-xs">
          {wave(23, true)}
          <div className="mt-4 text-center text-sm text-muted-foreground">Shaping your story into words</div>
        </div>}
        {aiError?.kind === "draft" && <div className="mt-10 w-full max-w-sm border-l border-accent pl-4 text-left page-enter" role="alert"><p className="text-sm leading-6 text-foreground/85">{aiErrorText}</p><div className="mt-3 flex gap-4"><Button variant="bare" size="sm" className="px-0 text-accent" onClick={aiError.retry}><RotateCcw /> Try again</Button><Button variant="bare" size="sm" className="px-0 text-muted-foreground" onClick={back}>Back</Button></div></div>}
      </div>
    </div>}
    {screen === "write" && <>{top("05 / 05")}
      <KeepWritingStep
        text={project.writtenText}
        mode={writeInputMode}
        dictating={dictating}
        busy={busy}
        uploadedName={uploadedDraftName}
        onSpeak={() => { setWriteInputMode("speak"); toggleDictation("write"); }}
        onType={() => { setWriteInputMode("type"); if (dictationRef.current && dictating) dictationRef.current.stop(); window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Your message"]')?.focus(), 0); }}
        onUpload={() => draftInput.current?.click()}
        onTextChange={(text) => { setWriteInputMode("type"); patch({ writtenText: text }); }}
        onClear={() => { patch({ writtenText: "" }); setUploadedDraftName(""); setWriteInputMode("type"); }}
        onContinue={() => {
          const paras = project.writtenText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
          patch({ messageParagraphs: paras, messageSource: "own", paragraphSpeakers: paras.map((_,i)=>project.contributors?.[i % Math.max(1,project.contributors?.length ?? 0)]?.id ?? "") });
          setActiveParagraph(0); go("message");
        }}
      />
    </>}
    {screen === "message" && <>{top()}
      <div className="keep-message-review mx-auto max-w-[650px] px-7 pb-32 pt-9">
        {title("", project.messageSource === "own" ? "Your message." : "Your message is ready.", isTogether ? project.collaborativeCreative ? "Everyone’s memories are woven into one story. Review each person’s own words before recording." : "Make these words your own, or let Keep AI help. Choose who reads each paragraph, adding or splitting paragraphs when the speaker changes. Record each part separately." : "These are your words. Make them yours, or let Keep help you shape them.")}
        {isTogether&&!project.collaborativeCreative&&!hasSavedVoice(project)&&<button type="button" className="mb-4 keep-message-actions__secondary w-full" onClick={()=>go("collaboration")}>Create this Keep together · gather everyone’s memories <ArrowRight size={18}/></button>}
        <KeepLengthGuide text={project.messageParagraphs.join(" ")} className="mb-6" />
        <button type="button" onClick={openAskKeep} className="group mb-6 flex min-h-[82px] w-full items-center gap-4 rounded-2xl border border-[#C5B6A1] bg-[#28231F] px-5 text-left text-[#FAF8F5] shadow-[0_10px_26px_rgba(38,31,25,.13)] transition-transform active:scale-[.99]">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#C9B69C]/40 bg-[#C9B69C]/15"><Sparkles className="size-6 text-[#E7D4B7]" strokeWidth={1.6}/></span>
          <span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-[15px] font-medium">Ask Keep AI</strong><small className="text-[11px] leading-4 text-[#C8BCAD]">Make your message more personal, emotional or polished</small></span>
          <ArrowRight className="size-5 shrink-0 text-[#D9C6AA] transition-transform group-hover:translate-x-1"/>
        </button>
        {appliedAiOriginal && appliedAiOriginal.changedIndexes.length > 0 && <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#C9B092] bg-[#F3E9DB] px-4 py-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#44382B] text-white"><Check className="size-3.5" /></span>
          <p className="text-[12px] leading-5 text-[#554639]"><strong className="font-semibold">Keep AI updated your message.</strong> The revised wording is highlighted below. Tap any highlighted paragraph to edit it yourself.</p>
        </div>}
        <div className="keep-message-paragraphs">
          {project.messageParagraphs.map((p, i) => {
            const highlighted = !!appliedAiOriginal?.changedIndexes.includes(i) && editingAiParagraph !== i && appliedAiOriginal.before[i] !== p;
            return <div key={i} className={`keep-message-paragraph${highlighted ? " keep-message-paragraph--revised" : ""}`}>
              {highlighted ? <button type="button" aria-label={`Edit updated paragraph ${i + 1}`} className="keep-message-paragraph__revision" onClick={() => { setActiveParagraph(i); setEditingAiParagraph(i); }}>
                <div className="keep-message-paragraph__head"><span>Paragraph {String(i + 1).padStart(2, "0")}</span><span className="keep-message-paragraph__status"><Sparkles size={13} strokeWidth={1.6} aria-hidden="true" /> AI edited · Edit</span></div>
                <p className="keep-message-copy__revised"><KeepWordChanges before={appliedAiOriginal!.before[i] ?? ""} after={p}/></p>
              </button> : <>
                <label className="keep-message-paragraph__head" htmlFor={`keep-message-paragraph-${i}`}><span>Paragraph {String(i + 1).padStart(2, "0")}</span><span className="keep-message-paragraph__status"><Settings2 size={14} strokeWidth={1.5} aria-hidden="true" /> Edit</span></label>
                <div className="keep-message-copy">
                  <div aria-hidden="true" className="keep-message-copy__measure">{p || " "}{" "}</div>
                  <textarea id={`keep-message-paragraph-${i}`} aria-label={`Message paragraph ${i + 1}`} rows={2}
                value={p} onFocus={() => setActiveParagraph(i)} onChange={(event) => {
                  patch({ messageParagraphs: project.messageParagraphs.map((item,j) => i === j ? event.target.value : item) });
                  if (appliedAiOriginal?.changedIndexes.includes(i)) setAppliedAiOriginal((old) => old ? { ...old, changedIndexes: old.changedIndexes.filter((j) => j !== i) } : null);
                }}
                className="keep-message-copy__input" placeholder="Write your next thought…" />
                </div>
              </>}
              {isTogether && <label className="keep-message-paragraph__speaker"><span className="font-medium">{project.collaborativeCreative?"Words by":"Read by"}</span><select aria-label={`Speaker for paragraph ${i+1}`} value={speakerFor(i)} onChange={event=>patch({paragraphSpeakers:project.messageParagraphs.map((_,j)=>j===i?event.target.value:speakerFor(j))})} className="keep-message-paragraph__speaker-select">{(project.contributors ?? []).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            </div>;
          })}
        </div>
        <div className="keep-message-actions">
        {isTogether && project.messageParagraphs.length===1 && <button type="button" className="keep-message-actions__secondary" onClick={()=>{ const paragraphs=splitForVoices(project.messageParagraphs[0]??"",(project.contributors??[]).length); if(paragraphs.length<2){toast.info("Add another paragraph to give someone else a turn.");return;} patch({messageParagraphs:paragraphs,paragraphSpeakers:paragraphs.map((_,i)=>project.contributors?.[i%(project.contributors?.length??1)]?.id??"")}); }}><span>Split this message into speaking parts</span><span className="keep-message-actions__secondary-icon" aria-hidden="true"><ArrowRight size={17} strokeWidth={1.6}/></span></button>}
        <button type="button" className="keep-message-actions__secondary" onClick={() => { patch({ messageParagraphs: [...project.messageParagraphs, ""], paragraphSpeakers: [...project.messageParagraphs.map((_,i)=>speakerFor(i)),project.contributors?.[project.messageParagraphs.length % Math.max(1,project.contributors?.length ?? 0)]?.id ?? ""] }); setActiveParagraph(project.messageParagraphs.length); }}>
          <span className="keep-message-actions__secondary-icon" aria-hidden="true"><Plus size={18} strokeWidth={1.6}/></span><span>Add paragraph</span>
        </button>
        {isTogether && (project.contributors??[]).some(person=>!project.messageParagraphs.some((p,i)=>p.trim()&&speakerFor(i)===person.id)) && <p className="keep-message-actions__note">Every contributor needs their own speaking part.</p>}
        {isTogether && project.messageParagraphs.filter(p=>p.trim()).length < 2 && <p className="keep-message-actions__note">Create at least two speaking parts so everyone can take a turn.</p>}
        <button type="button" className="keep-message-actions__primary" onClick={() => {
          patch({ messageParagraphs: project.messageParagraphs.filter((p) => p.trim()), paragraphSpeakers: project.messageParagraphs.map((p,i)=>p.trim()?speakerFor(i):"").filter(Boolean) });
          setAppliedAiOriginal(null);
          setRemoteReviewFinished(false);
          go(nextAfterMessage(project, returnToEditorAfterRecording));
        }} disabled={!project.messageParagraphs.some((p) => p.trim()) || (isTogether && (project.contributors??[]).some(person=>!project.messageParagraphs.some((p,i)=>p.trim()&&speakerFor(i)===person.id)))}>
          <span>{nextAfterMessage(project, returnToEditorAfterRecording) === "memories" ? "Choose photos & videos" : isTogether ? project.voiceRecordingLocation==="remote" ? project.collaborativeCreative ? "Review & approve together" : "Record yours & invite others" : "Record together" : "Record Your Keep"}</span>
          <span className="keep-message-actions__arrow" aria-hidden="true"><ArrowRight size={19} strokeWidth={1.6}/></span>
        </button>
        </div>
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
    {screen === "remoteInvite" && <>{top()}{project.collaborativeCreative&&usesRemoteRecording(project)&&!remoteReviewFinished?<KeepRemoteScriptApproval project={project} onBack={()=>{setScreen("message");resetPageScroll();}} onContinue={paragraphs=>{patch({messageParagraphs:paragraphs});setRemoteReviewFinished(true);resetPageScroll();}}/>:<KeepRemoteInviteManager project={project}
      onBack={()=>{setRemoteReviewFinished(false);setHistory(h=>[...h,"remoteInvite"]);setScreen("message");}}
      onContinue={()=>{if (personalMedia.length) beginFramingReview("remoteInvite"); else if(returnToEditorAfterRecording || project.memories.length) go("editor"); else go("memories");}}
      onCombine={combineRemoteVoices} onImportMedia={importContributorMoments} combining={groupBusy}/>}</>}
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
          <p className="mt-3 text-center text-[11px] leading-5 text-[#746E67]">Recording begins after a three-second countdown.</p>
        </div>
      </section>
    </div>}
    {(screen === "record" || screen === "recordPrep") && <div inert={screen === "recordPrep"} aria-hidden={screen === "recordPrep"} className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">{top()}</div>
      <div className="mx-auto flex min-h-0 w-full max-w-[650px] flex-1 flex-col px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-7">
        <div className="shrink-0 pb-3 text-center">
          <h1 className="mt-1 font-display text-[clamp(28px,7.2vw,40px)] leading-[1.05] tracking-[-.025em]">Now say it in your own voice.</h1>
          {!isRecording && !recordingPreparing && <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">Read naturally. The words will scroll for you.</p>}
        </div>
        {!isRecording && !recordingPreparing && selfieSelected && <div className="shrink-0 pb-2 text-center">
          {!!recorder.cameraError && <p role="alert" className="text-xs text-destructive">{recorder.cameraError}</p>}
          <button type="button" disabled={recorder.status === "requesting"} onClick={useVoiceOnly} className="min-h-8 text-xs text-[#806B57] underline underline-offset-4 disabled:opacity-50">Use voice only instead</button>
        </div>}
        <KeepTeleprompter text={project.messageParagraphs.join("\n\n")}
          cameraStream={selfieSelected?recorder.previewStream:null}
          isRecording={isRecording} isPaused={recorder.status === "paused"} elapsed={recorder.elapsed} countdown={recorder.countdown} preparing={recordingPreparing}
          onRestartRecording={restartCurrentRecording} restartNonce={recordRestartNonce} />
        <div className="shrink-0 pt-3">
          {pendingVoice && !isRecording && <div role="alert" className="mb-3 rounded-xl border border-amber-600/40 bg-amber-50 p-3 text-sm text-amber-950">
            <strong className="block">Your recording is still here, but isn't safely saved.</strong>
            <p className="mt-1 text-xs">Do not refresh or close this page. Retry saving, or keep an audio backup.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="keep" size="sm" disabled={voiceFinalizing} onClick={() => void finishFinal(pendingVoice)}>Retry save</Button>
              <Button variant="quiet" size="sm" onClick={downloadPendingVoice}><Download className="size-4" /> Download audio</Button>
            </div>
          </div>}
          {!pendingVoice && !isRecording && orphanVoices.length>0 && !project.finalVoiceRecording?.audioUrl && <div className="mb-3 rounded-xl border border-[#D3B993] bg-[#FAF1E4] p-3 text-[#493726]" role="region" aria-label="Recover a recording">
            <strong className="block text-sm">We found a recording on this phone.</strong>
            <p className="mt-1 text-xs leading-5">If your last take disappeared, listen before deciding whether to restore it.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {orphanVoices.map(item => <button type="button" key={item.id} className="rounded-lg border border-[#C7B39B] bg-white px-3 py-2 text-xs" onClick={() => void previewOrphanVoice(item.id)}>
                {new Date(item.recordedAt).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
              </button>)}
            </div>
            {recoveryPreview && <div className="mt-3 space-y-2">
              <audio src={recoveryPreview.url} controls preload="metadata" className="w-full" aria-label="Listen to recovered recording"
                onLoadedMetadata={event => { const seconds=event.currentTarget.duration; if(Number.isFinite(seconds)&&seconds>0) setRecoveryPreview(old=>old?.id===recoveryPreview.id?{...old,durationSec:seconds}:old); }} />
              <Button variant="keep" size="sm" disabled={voiceFinalizing} onClick={() => void finishFinal({
                blob:recoveryPreview.blob,
                mimeType:recoveryPreview.blob.type || "audio/mp4",
                durationSec:recoveryPreview.durationSec || estimateKeepSeconds(countKeepWords(project.messageParagraphs.join(" "))),
              },recoveryPreview.id)}>Restore this recording</Button>
            </div>}
          </div>}
          {micUnavailable ? <>
            <p role="alert" className="mb-2 text-center text-xs text-destructive">{micMessage}</p>
            <Button variant="keep" size="touch" className="w-full" onClick={useDemoRecording}>Use demo recording (2:30)</Button>
          </> : !isRecording ? (
            <Button variant="keep" size="touch" className="w-full" disabled={!!pendingVoice || voiceFinalizing || recordingPreparing || recorder.supported !== true} onClick={() => void startFinal()}>
              {recordingPreparing ? <Loader2 className="size-5 animate-spin" /> : <Mic className="size-5" />}
              {recordingPreparing ? "Getting ready…" : selfieSelected?"Start selfie & voice":"Start recording"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {recorder.canPause && <Button variant="quiet" size="touch" className="flex-1" onClick={() => recorder.status === "paused" ? recorder.resume() : recorder.pause()}>
                {recorder.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
                {recorder.status === "paused" ? "Resume" : "Pause"}
              </Button>}
              <Button variant="keep" size="touch" className="flex-1" disabled={voiceFinalizing} onClick={() => void finishFinal()}>{voiceFinalizing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {voiceFinalizing ? "Saving audio…" : "Finish recording"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>}
    {screen === "groupRecord" && <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">{top()}</div>
      <div className="mx-auto flex min-h-0 w-full max-w-[650px] flex-1 flex-col px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-7">
        <div className="shrink-0 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7C6752]">CREATE TOGETHER · {readyCount} OF {speakingPartCount} PARTS SAVED</p>
          <h1 className="mt-1 font-display text-[clamp(29px,7.5vw,42px)] leading-[1.07] tracking-[-.025em]">Every voice matters.</h1>
          {!isRecording && !recordingPreparing && <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">Each person reads their turn. Pass the phone when you're done.</p>}
        </div>
        <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a recording part">
          {project.messageParagraphs.map((p,i) => <button type="button" key={i} disabled={isRecording || recordingPreparing || groupBusy} aria-pressed={groupPartIndex === i} aria-label={"Part " + (i+1) + " for " + speakerName(i)} onClick={() => setGroupPartIndex(i)}
            className={groupPartIndex === i ? "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#AE9478] bg-[#EDE2D3] px-3 text-xs font-medium text-[#4A382B] disabled:opacity-65" : "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#DDD2C6] bg-card px-3 text-xs text-foreground disabled:opacity-65"}>
            {readyPart(i) ? <Check className="size-3.5 text-[#6A8462]" /> : <Mic className="size-3.5" />} {i+1}. {speakerName(i)}
          </button>)}
        </div>
        {!isRecording && !recordingPreparing && selfieSelected && <div className="shrink-0 pb-2 text-center">
          {!!recorder.cameraError && <p role="alert" className="text-xs text-destructive">{recorder.cameraError}</p>}
          <button type="button" disabled={recorder.status === "requesting"} onClick={useVoiceOnly} className="min-h-8 text-xs text-[#806B57] underline underline-offset-4 disabled:opacity-50">Use voice only instead</button>
        </div>}
        <KeepTeleprompter key={groupPartIndex} text={project.messageParagraphs[groupPartIndex] ?? ""} label={"PART " + (groupPartIndex+1) + " OF " + project.messageParagraphs.length}
          speaker={speakerName(groupPartIndex)} cameraStream={selfieSelected?recorder.previewStream:null}
          isRecording={isRecording} isPaused={recorder.status === "paused"} elapsed={recorder.elapsed} countdown={recorder.countdown} preparing={recordingPreparing}
          onRestartRecording={restartCurrentRecording} restartNonce={recordRestartNonce} />
        <div className="shrink-0 space-y-2 pt-2.5">
          {!isRecording && !recordingPreparing && readyPart(groupPartIndex)?.audioUrl && <audio src={readyPart(groupPartIndex)!.audioUrl} controls preload="none" className="h-10 w-full" aria-label={"Review " + speakerName(groupPartIndex) + "'s saved recording"} />}
          {micUnavailable && <p role="alert" className="text-center text-xs text-destructive">{micMessage} A real voice recording is needed for each part.</p>}
          {!isRecording ? (
            <Button variant="keep" size="touch" className="w-full" disabled={groupBusy || micUnavailable || recordingPreparing || recorder.supported !== true} onClick={() => void startFinal()}>
              {recordingPreparing ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              {recordingPreparing ? "Getting ready…" : selfieSelected ? "Record video + voice" : readyPart(groupPartIndex) ? "Re-record this part" : "Record " + speakerName(groupPartIndex) + "'s part"}
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
          {groupReady && !isRecording && !recordingPreparing && <Button variant="keep" size="touch" className="w-full" disabled={groupBusy} onClick={() => void combineGroupVoices()}>
            {groupBusy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {groupBusy ? "Preparing voices…" : "Bring all voices together"}
          </Button>}
          {!groupReady && !isRecording && !recordingPreparing && <p className="text-center text-[11px] text-muted-foreground">Record all {project.messageParagraphs.length} parts to combine your voices.</p>}
          {!isRecording && !recordingPreparing && <button type="button" disabled={groupBusy} className="block min-h-8 w-full text-center text-[11px] text-[#806B57] disabled:opacity-50" onClick={() => go("message")}>Edit who says what</button>}
        </div>
      </div>
    </div>}
    {voiceFinalizing && screen !== "recorded" && <KeepVoiceTransition
      isSaving isSyncing={false} hasCaptions={false} syncError={false}
      isDemo={false} isPersisted={false} hasRecording={false}
      returnToEditor={returnToEditorAfterRecording}
      onContinue={() => {}} onRetry={() => {}} onRecordAgain={() => {}} />}
    {screen === "recorded" && <KeepVoiceTransition
      isSaving={voiceFinalizing}
      isSyncing={captionSyncing}
      hasCaptions={project.captionCues.length > 0}
      syncError={captionSyncError}
      isDemo={!!rec?.demo}
      isPersisted={!!rec?.audioId || !!rec?.demo}
      hasRecording={!!rec?.audioUrl || !!rec?.demo}
      returnToEditor={returnToEditorAfterRecording}
      onRetry={() => void retryCaptionSync()}
      onRecordAgain={() => {
        captionSyncToken.current++;
        setCaptionSyncing(false);
        setCaptionSyncError(false);
        setGroupPartIndex(0);
        go(isTogether ? "groupRecord" : "record");
      }}
      onContinue={() => {
        if (returnToEditorAfterRecording) {
          setReturnToEditorAfterRecording(false);
          setHistory([]);
          setScreen("editor");
          window.scrollTo(0, 0);
        } else {
          setStyleTouched(false);
          go(nextAfterVoice(project));
        }
      }}
    />}
    {screen === "memories" && <>{top()}<div className="px-7 pb-10 pt-9">
      {title("YOUR MOMENTS", "Add photos & videos.", "Let photos tell most of the story, with a few meaningful video moments mixed in.")}
      <KeepPhoneTip variant="upload" />
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
      <KeepMomentsUploader
        moments={personalMedia}
        busy={busy}
        onAdd={() => addInput.current?.click()}
        onRemove={(index) => { const target = personalMedia[index]; if (target) removeMomentById(target.id); }}
        onContinue={continueFromMedia}
        continueLabel={personalMedia.length ? "Review photo & video framing" : !project.finalVoiceRecording && !usesRemoteRecording(project) ? "Continue to recording" : "Continue"}
      />
    </div></>}
    {screen === "framing" && <>{top()}<KeepFramingReview
      moments={personalMedia}
      index={project.framingReviewIndex ?? 0}
      onIndex={index => patch({ framingReviewIndex: index })}
      onFocus={(id, focus) => setProject(previous => updateMomentFraming(previous, id, focus))}
      onComplete={completeFramingReview}
    /></>}
    {(screen === "memories" || screen === "framing") && <KeepSelfieBackup open={selfieBackupOpen} momentCount={personalMedia.length}
      onClose={() => { setSelfieBackupOpen(false); if (screen === "framing") back(); }}
      onVoice={() => continueToRecording("photos")}
      onSelfie={() => continueToRecording("selfie")} />}
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
    {screen === "editor" && selected && <div className={`keep-studio ${editorExpanded ? "keep-studio--expanded" : "keep-studio--immersive"}`} style={{ "--keep-studio-stage-size": `${studioPreviewSize}%` } as CSSProperties}>
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
          <Button variant="bare" size="sm" className="text-muted-foreground" disabled={busy || publishing} onClick={() => { setViewingDemo(false); setPreviewChooserOpen(true); setReadArrangeOpen(false); }}><Play className="size-4" /> Preview</Button>
          <Button variant="keep" size="sm" disabled={!!project.restoreIncomplete || publishing || busy || captionSyncing} onClick={toCard}>{publishing ? "Saving…" : busy ? "Adding…" : captionSyncing ? "Syncing…" : project.publicationToken ? "Final touches" : "Done"} {publishing || busy || captionSyncing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}</Button>
        </div>
      </div>

      {(publishing || publishError) && <div className={`mx-4 mt-2 rounded-xl border px-4 py-3 text-xs leading-5 ${publishError ? "border-[#BE7363] bg-[#3B2826] text-[#FFE5DF]" : "border-[#927B61] bg-[#302922] text-[#F7EBDD]"}`} role={publishError ? "alert" : "status"}>{publishError || publishStatus || "Saving changes to your Keep…"}</div>}
      {rec?.audioUrl && !rec.demo && <audio ref={editorAudioRef} src={rec.audioUrl} preload="metadata" onWaiting={() => {if(editorPlaying)void editorMixRef.current?.pause();}} onStalled={() => {if(editorPlaying)void editorMixRef.current?.pause();}} onPlaying={() => {if(editorPlaying)void editorMixRef.current?.play().catch(()=>undefined);}} onTimeUpdate={(e) => { const time = e.currentTarget.currentTime; setEditorTime(time); setFrame(editorSceneAt(time)); }} onEnded={() => {
        if (editorDuration > (rec?.durationSec ?? 0) + 0.1) return;
        setEditorTime(editorDuration);
        clearEditorOutro();
        if (editorPlaying) {
          editorOutroTimerRef.current = window.setTimeout(() => {
            editorOutroTimerRef.current = null;
            setEditorPlaying(false);
          }, KEEP_MUSIC_TAIL_SECONDS * 1000);
        }
      }} />}
      <div className="keep-studio-stage">
        <div className="keep-studio-canvas-wrap">
          <div className="keep-studio-canvas relative aspect-[9/16] overflow-hidden rounded-2xl bg-card shadow-lg">
            <CinematicMedia item={selected} nextItem={shown[frame + 1]} sceneKey={frame} motionIndex={frame} playing={editorPlaying && (!selected.isSelfie || editorNarrationStartedRef.current)} duration={sceneDuration(shown, frame, editorDuration)} sceneElapsed={sceneElapsed(shown, frame, editorTime, editorDuration)} className="absolute inset-0" imageClassName={`editor-image-${styleSlug(compareOriginalStyle && editorPanel === "Style" ? "Natural" : project.visualStyle)}`} />
            <div className="absolute inset-0 photo-shade" />
            {editorPanel === "Memories" && <div className="absolute inset-x-0 top-0 bottom-14 z-20 cursor-grab touch-none active:cursor-grabbing" aria-label="Drag photo or video to reposition" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); photoDrag.current = { x: e.clientX, y: e.clientY, focusX: selected.focusX ?? 50, focusY: selected.focusY ?? 50, width: r.width, height: r.height }; setEditorPlaying(false); }} onPointerMove={(e) => { const d = photoDrag.current; if (!d) return; updateSelectedMoment({ focusX: Math.max(0, Math.min(100, d.focusX - (e.clientX - d.x) / d.width * 100)), focusY: Math.max(0, Math.min(100, d.focusY - (e.clientY - d.y) / d.height * 100)) }); }} onPointerUp={() => { photoDrag.current = null; }} onPointerCancel={() => { photoDrag.current = null; }}><span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1 text-[10px] text-white">Drag to reposition</span></div>}

            <KeepFilmCaption text={editorCaption} style={project.captionStyle} position={project.captionPosition} lines={project.captionLines} captionSize={project.captionSize} />

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

      {editorExpanded && <KeepStudioResize size={studioPreviewSize} onSize={updateStudioPreviewSize} />}
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
          captionSize={project.captionSize}
          wordsPerCue={project.captionWordsPerCue ?? 5}
          syncing={captionSyncing}
          syncError={captionSyncError}
          syncErrorMessage={captionSyncErrorMessage}
          syncProgress={captionSyncProgress}
          timingEstimated={!!project.captionTimingEstimated}
          hasVoice={!!rec && !rec.demo && (!!rec.audioId || !!rec.audioUrl)}
          canRestore={!!project.captionWords?.length}
          onClose={() => { setEditorExpanded(false); setEditorPanel(null); }}
          onSeek={(seconds) => { setEditorPlaying(false); seekEditor(seconds); }}
          onChangeCaption={(i,text) => patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,text}:c)})}
          onChangeCaptionTime={(i,startTime,endTime) => patch({captionCues:project.captionCues.map((c,j)=>j===i?{...c,...clampCaptionRange(startTime,endTime,editorDuration)}:c)})}
          onChangeStyle={(style) => patch({captionStyle:style})}
          onChangePosition={(position) => patch({captionPosition:position})}
          onChangeLines={(lines) => patch({captionLines:lines})}
          onChangeSize={(captionSize) => {
            patch({captionSize});
            // If paused between phrases, show a real caption immediately as the size changes.
            if (!editorPlaying && !editorCaption && project.captionCues.length) {
              const cue = project.captionCues.find(c => c.end >= editorTime) ?? project.captionCues.at(-1);
              if (cue) seekEditor(cue.start + .02);
            }
          }}
          onRegroup={(wordsPerCue) => patch({captionWordsPerCue:wordsPerCue,...(project.captionWords?.length ? {captionCues:groupTimedWords(project.captionWords,wordsPerCue)}:{})})}
          onRestore={() => patch({captionCues:groupTimedWords(project.captionWords ?? [],project.captionWordsPerCue ?? 5)})}
          onRetrySync={() => void retryCaptionSync()}
          onResync={() => void resyncCaptionsFromVoice()}
          onPreviewSync={() => { setEditorPlaying(false); editorAudioRef.current?.pause(); seekEditor(0); openCreatorPreview("watch"); }}
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

      {editorPanel === "Memories" && <KeepPhotosEditor
        moments={shown}
        selectedIndex={frame % shown.length}
        onClose={() => { setEditorExpanded(false); setEditorPanel(null); }}
        onSelect={(index) => {setEditorPlaying(false); editorAudioRef.current?.pause(); seekEditor(sceneSeekTime(shown,index,editorDuration));setFrame(index);}}
        onAdd={() => addInput.current?.click()}
        onReplace={() => { if (busy) { toast.info("Finish adding your previous media first."); return; } replaceTargetId.current = selected?.id ?? null; replaceInput.current?.click(); }}
        onMove={moveMemory}
        onReviewFraming={personalMedia.length ? () => beginFramingReview("editor") : undefined}
        onTransition={(transition) => updateSelectedMoment({transition})}
        onPreviewTransition={previewCurrentTransition}
        onRemove={() => removeMemory(frame % shown.length)}
      />}

      {editorPanel === "Selfie" && <KeepSelfieEditor
        takes={project.selfieVideos??[]}
        settings={project}
        hasOtherMoments={(project.selfieBaseMedia?.length?project.selfieBaseMedia:withoutSelfieScenes(project.memories)).filter(item=>item.source!=="text").length>0}
        onClose={()=>{setEditorExpanded(false);setEditorPanel(null);}}
        onChange={updates=>setProject(old=>({...old,...updates,
          memories:composeSelfieStory(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories),old.selfieVideos??[],
            old.finalVoiceRecording?.durationSec??150,{...old,...updates})}))}
        onRecord={recordSelfieFromEditor}
        onRemove={id=>{
          if(!window.confirm("Remove this selfie video from your Keep? The voice recording stays unchanged."))return;
          setProject(old=>{
            const selfies=(old.selfieVideos??[]).filter(item=>item.id!==id);
            return {...old,selfieVideos:selfies,
              memories:composeSelfieStory(old.selfieBaseMedia?.length?old.selfieBaseMedia:withoutSelfieScenes(old.memories),selfies,
                old.finalVoiceRecording?.durationSec??150,old)};
          });
        }}
      />}

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
        onRemoteManage={isTogether && project.voiceRecordingLocation==="remote" ? ()=>{
          setEditorPlaying(false);setEditorExpanded(false);setEditorPanel(null);
          setReturnToEditorAfterRecording(true);go("remoteInvite");
        }:undefined}
      />}

      </div>
      <nav className="keep-studio-tools" aria-label="Editing tools">
        {([{ panel: "Memories", label: "Photos", Icon: Images }, { panel: "Captions", label: "Captions", Icon: MessageCircle }, { panel: "Music", label: "Music", Icon: Music2 }, { panel: "Voice", label: "Voice", Icon: Mic }, { panel: "Style", label: "Style", Icon: Sparkles }, { panel: "Selfie", label: "Selfie", Icon: Camera }] as const).map(({ panel, label, Icon }) => <button key={label} type="button" aria-pressed={editorPanel === panel} onClick={() => {
          stopMusicSample(); setMusicSampling(""); setCompareOriginalStyle(false);
          // The caption and photo fields must not jump to another scene
          // mid-edit when the narration advances in the background.
          if (panel === "Captions" || panel === "Memories" || panel === "Selfie") {
            setEditorPlaying(false);
            editorAudioRef.current?.pause();
          }
          setEditorPanel(panel);
        }}><Icon /><span>{label}</span></button>)}
      </nav>

      {previewChooserOpen && sheet("Preview your Keep", () => { setPreviewChooserOpen(false); setReadArrangeOpen(false); }, <div className="pb-2">
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose how you want to check it. Previewing is optional — you can come back and make changes anytime.</p>
        <div className="mt-5 space-y-2">
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("watch")}><span className="flex items-center gap-3"><Images className="size-5" /><span><strong className="block font-normal">Watch, Listen &amp; Read</strong><small className="mt-1 block font-normal text-muted-foreground">Voice, photos, videos, music &amp; captions</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("listen")}><span className="flex items-center gap-3"><Headphones className="size-5" /><span><strong className="block font-normal">Listen &amp; Read</strong><small className="mt-1 block font-normal text-muted-foreground">Listen to their voice while reading every word</small></span></span><ArrowRight /></Button>
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left" onClick={() => openCreatorPreview("read")}><span className="flex items-center gap-3"><BookOpen className="size-5" /><span><strong className="block font-normal">Read</strong><small className="mt-1 block font-normal text-muted-foreground">Just the written message, no media</small></span></span><ArrowRight /></Button>
          <KeepEditorCardPreview project={project} />
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
      : <KeepPlayer name={(name || "Your Keep").toUpperCase()} from={giverNames} year="2026" subtitle={project.occasion} onExit={back} onFinish={() => { setScreen("editor"); resetPageScroll(); }} closingLine={project.closingLine} style={project.visualStyle} captions={project.captionStyle} media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, isSelfie:m.isSelfie, videoStartSec:m.videoStartSec, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined} audioUrl={rec && !rec.demo ? rec.audioUrl : undefined} audioDuration={rec?.durationSec} lines={captionLines} captionCues={project.captionCues} musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume} captionPosition={project.captionPosition} captionLines={project.captionLines} captionSize={project.captionSize} audioMix={mix} />)}
    {screen === "recipientPreview" && <KeepRecipientExperience
      name={(name || engraving[0] || "You").trim()}
      from={isTogether ? giverNames : (engraving[1]?.replace(/^FROM\s+/i, "") || "Alex").trim()}
      year={(engraving[2] || "2026").trim()}
      subtitle={project.occasion}
      openingMessage={project.openingMessage}
      closingLine={project.closingLine}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, isSelfie:m.isSelfie, videoStartSec:m.videoStartSec, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind, isSelfie:m.isSelfie, videoStartSec:m.videoStartSec, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs.length ? project.messageParagraphs : initialMessage.map((p) => withName(p, name))}
      speakerNames={isTogether ? project.messageParagraphs.map((_,i)=>speakerName(i)) : undefined}
      style={project.visualStyle}
      captions={project.captionStyle}
      lines={captionLines}
      captionCues={project.captionCues}
      musicMood={project.musicMood}
      voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume} captionPosition={project.captionPosition} captionLines={project.captionLines} captionSize={project.captionSize} audioMix={mix}
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
      closingLine={project.closingLine}
      subtitle={project.occasion}
      media={frames.length ? frames.map((m) => ({ url: m.url, kind: m.kind, isSelfie:m.isSelfie, videoStartSec:m.videoStartSec, displayDurationSec: m.displayDurationSec ?? 7, focusX: m.focusX, focusY: m.focusY, zoom: m.zoom, motion: m.motion, transition: m.transition })) : undefined}
      readMedia={readOrderedFrames.length ? readOrderedFrames.map((m) => ({ url: m.url, kind: m.kind, isSelfie:m.isSelfie, videoStartSec:m.videoStartSec })) : undefined}
      audioUrl={rec && !rec.demo ? rec.audioUrl : undefined}
      audioDuration={rec?.durationSec}
      messageParagraphs={project.messageParagraphs}
      speakerNames={isTogether ? project.messageParagraphs.map((_,i)=>speakerName(i)) : undefined}
      style={project.visualStyle} captions={project.captionStyle} lines={captionLines} captionCues={project.captionCues}
      musicMood={project.musicMood} voiceMusicBalance={project.voiceMusicBalance} voiceVolume={project.voiceVolume} musicVolume={project.musicVolume}
      captionPosition={project.captionPosition} captionLines={project.captionLines} captionSize={project.captionSize} audioMix={mix}
      persistVisit={false} creatorPreview
      onCreatorExit={() => { setScreen("card"); resetPageScroll(); }}
      onCreatorContinue={() => { setScreen("card"); resetPageScroll(); }}
    />}
    {screen === "card" && <>{top()}<div className="mx-auto max-w-xl px-7 pb-14 pt-7">
      {title("The final touch", project.publicationToken ? "Edit your final touches." : "Choose your opening and closing lines.", "Personalize the words before and after your film, and preview the engraving on your black Keep card.")}
      {!project.publicationToken && <KeepFinalTouchGuide recipientName={project.recipientName} />}
      <KeepOpeningPersonalization project={project} onUpdate={patch} disabled={publishing} />
      <div className="mt-10 border-t border-border pt-7">
        <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" disabled={publishing} onClick={() => void finishAndShare()}>
          {publishing ? "Saving your Keep…" : project.publicationToken ? "Save changes & continue" : "Save my Keep"} <ArrowRight className="size-5" />
        </Button>
        {publishError && <p role="alert" className="mt-3 text-sm leading-6 text-[#9B3529]">{publishError}</p>}
        <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">We’ll save your finished film and card details to the same permanent link, then take you straight to your card options.</p>
      </div>
    </div>
    </>}

    {screen === "success" && <div className="mx-auto flex keep-min-screen w-full max-w-xl flex-col px-7 pb-12 pt-10">
      <div className="flex items-center justify-center"><span className="keep-wordmark">Keep</span></div>
      <div className="pt-12">
        <div className="mb-7 flex size-12 items-center justify-center rounded-full border border-[#B8A89A] text-[#6A5849]"><Check className="size-5" /></div>
        <h1 className="keep-editorial-title">Your Keep is ready.</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">A message worth keeping. Ready to share whenever you are.</p>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">You can review or share your digital Keep now. Choose your physical card package, engraving, and additional cards during checkout.</p>
      </div>
      <div className="mt-11 space-y-3">
        {project.publicationId && <a className="keep-premium-action flex min-h-14 items-center justify-between px-5 text-sm" href={keepCheckoutPath(project.publicationId)}>Continue to your Keep <ArrowRight className="size-5" /></a>}
        {project.publicationToken && <ViewingLink token={project.publicationToken} />}
        <Button variant="quiet" size="touch" className="w-full" onClick={() => go("editor")}>Back to editor</Button>
        <Button asChild variant="quiet" size="touch" className="w-full"><Link to="/app">Back to Keeps</Link></Button>
        <p className="pt-2 text-center text-[11px] leading-5 text-muted-foreground">Your draft is saved as you edit. Tapping Done in the editor refreshes this same viewing link.</p>
      </div>
    </div>}
  </div></main>;
}
