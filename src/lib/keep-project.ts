import { memoryImages } from "@/components/keep-player";
import { getBlob } from "./keep-media-store";
import { keepOptimizedPhotoId } from "./keep-photo-optimization";
import { defaultKeepOrder, type KeepOrderSelection } from "./keep-pricing";

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  source: "upload" | "sample" | "text";
  url: string; // object URL (uploads) or bundled asset (samples) — never persisted for uploads
  name?: string | undefined;
  mimeType?: string | undefined;
  remoteMediaId?: string | undefined; // prevents re-importing a contributor moment
  blobId?: string | undefined; // one recorded selfie video may be used twice without duplicating bytes
  isSelfie?: boolean | undefined;
  selfiePartIndex?: number | undefined;
  selfieRole?: "full" | "intro" | "outro" | undefined;
  videoStartSec?: number | undefined;
  videoDurationSec?: number | undefined;
  sampleIndex?: number | undefined;
  persisted?: boolean | undefined; // blob saved in IndexedDB
  displayDurationSec?: number | undefined; // how long this moment stays on screen in watch mode
  focusX?: number | undefined;
  focusY?: number | undefined;
  zoom?: number | undefined;
  motion?: "in" | "out" | "left" | "right" | undefined;
  transition?: "fade" | "dissolve" | "cut" | undefined;
};

/** Per-track audio settings. Optional on KeepProject so older saved drafts load unchanged. */
export type VoiceTone = "natural" | "clear" | "warm";
export type AudioMix = { voiceMuted: boolean; musicMuted: boolean; fadeIn: number; fadeOut: number; ducking: boolean; voiceTone?: VoiceTone };
export const defaultAudioMix: AudioMix = { voiceMuted: false, musicMuted: false, fadeIn: 2.5, fadeOut: 3, ducking: true, voiceTone: "natural" };

/** One interview answer. A future transcription/AI service consumes the audio blob
 *  (looked up by audioId) plus all prior answers as conversation context. */
export type InterviewAnswer = {
  questionIndex: number;
  question: string;
  audioId?: string | undefined;
  audioUrl?: string | undefined;
  durationSec?: number | undefined;
  mimeType?: string | undefined;
  demoText?: string | undefined; // set only when the demo fallback was used
  transcript?: string | undefined; // set only by a real transcription service (none connected yet)
};

export type KeepContributor = { id: string; name: string };
export type KeepVoicePart = { paragraphIndex: number; contributorId: string; textFingerprint: string; audioId: string; audioUrl?: string; durationSec: number; mimeType?: string };
export type VoiceRecording = { audioId?: string | undefined; audioUrl?: string | undefined; durationSec: number; mimeType?: string | undefined; demo: boolean };
export type CaptionCue = { text: string; start: number; end: number };
/** A phrase entry carries the provider's real phrase bounds, not per-word timing. */
export type CaptionWord = { word: string; start: number; end: number; phrase?: true };

export type KeepProject = {
  publicationId?: string;
  /** Owner of this device snapshot; never copy it into another account. */
  draftOwnerId?: string;
  publicationToken?: string;
  active: boolean;
  /** Transient: some cloud media have not restored; never autosave this partial copy. */
  restoreIncomplete?: boolean;
  restoreMissingCount?: number;
  stage: string;
  recipientName: string;
  /** Short personalized note shown when the NFC card is opened, before playback. */
  openingMessage?: string;
  /** Optional personal final words on the dark film fadeout. */
  closingLine?: string;
  /** Selected original or AI-generated message is also engraved on the front. */
  engraveOpeningMessage?: boolean;
  openingMessageSuggestions?: string[];
  openingSuggestionsFor?: string;
  relationship: string;
  occasion: string;
  /** Optional specifics supplied by the creator, independent of the occasion category. */
  occasionDetail?: string;
  /** Desired recipient experience, not assumed facts or feelings. */
  recipientFeelings?: string[];
  intent: string;
  questionIndex: number;
  /** Last confirmed local/cloud snapshot time, used to avoid restoring a stale cloud draft. */
  draftSavedAt?: number;
  /** A once-per-creation reminder before the first guided question. */
  interviewWelcomeSeen?: boolean;
  interviewAnswers: InterviewAnswer[];
  messageSource: "demo" | "own" | "ai" | null;
  interviewQuestion: string;
  interviewSummary: string;
  writtenText: string;
  messageParagraphs: string[];
  /** Optional collaborative recording; existing Keeps remain single-voice. */
  voiceMode?: "solo" | "together";
  voiceRecordingLocation?: "in_person" | "remote";
  contributors?: KeepContributor[];
  paragraphSpeakers?: string[];
  voiceParts?: KeepVoicePart[];
  /** Snapshot of the script and parts used to build the final narration. */
  groupVoiceSignature?: string;
  /** Selected before recording; absent for drafts created with the older voice-first flow. */
  recordingVisualMode?: "photos" | "selfie";
  finalVoiceRecording: VoiceRecording | null;
  captionTranscript: string;
  captionCues: CaptionCue[];
  captionWords?: CaptionWord[];
  /** True when unreliable provider timestamps were estimated across the preserved voice recording. */
  captionTimingEstimated?: boolean;
  captionWordsPerCue?: number;
  captionLines?: number;
  /** Percentage of the selected caption style; absent in older Keeps (100%). */
  captionSize?: number | undefined;
  captionPosition?: "top" | "middle" | "bottom";
  creationStyle?: "memories" | "words";
  memories: MediaItem[];
  /** Resume a photo/video framing review without losing the current position. */
  framingReviewIndex?: number;
  framingReviewOrigin?: "memories" | "remoteInvite" | "editor";
  /** Optional front-camera recording sources, saved once and reused for visual clips. */
  selfieVideos?: MediaItem[];
  /** Non-selfie moments remain available even when Full selfie hides them in Watch. */
  selfieBaseMedia?: MediaItem[];
  selfiePresentation?: "auto" | "full" | "bookends" | "off";
  selfieBookendSeconds?: number;
  selfieIntroId?: string;
  selfieOutroId?: string;
  readMemoryOrder: string[];
  musicMood: string;
  voiceMusicBalance: string;
  musicMix?: number;
  voiceVolume?: number;
  musicVolume?: number;
  audioMixVersion?: number;
  audioMix?: AudioMix | undefined;
  captionStyle: string;
  visualStyle: string;
  cardEngraving: string[];
  /** Catalog choices are a quote, not a verified purchase entitlement. */
  keepOrder?: KeepOrderSelection;
};

export const DRAFT_KEY = "keep.draft.v1";
export const ONBOARD_KEY = "keep.onboarded.v1";

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const sampleMemories = (): MediaItem[] =>
  memoryImages.map((url, i) => ({ id: newId("sample"), kind: "image", source: "sample", url, sampleIndex: i, displayDurationSec: 7 }));

export function newProject(): KeepProject {
  return {
    active: false, stage: "recipient", recipientName: "", openingMessage: "", closingLine: "", engraveOpeningMessage: false, openingMessageSuggestions: [], openingSuggestionsFor: "", relationship: "", occasion: "", occasionDetail: "", recipientFeelings: [], intent: "", questionIndex: 0, interviewWelcomeSeen: false, interviewQuestion: "", interviewSummary: "",
    interviewAnswers: [], messageSource: null, writtenText: "", messageParagraphs: [], voiceMode: "solo", voiceRecordingLocation: "in_person", contributors: [], paragraphSpeakers: [], voiceParts: [], finalVoiceRecording: null, captionTranscript: "", captionCues: [], captionWords: [], captionWordsPerCue: 5, captionLines: 2, captionSize: 100, captionPosition: "bottom", creationStyle: "memories", memories: [], selfieVideos: [], selfieBaseMedia: [], selfiePresentation: "auto", selfieBookendSeconds: 4, readMemoryOrder: [],
    musicMood: "Warm + Nostalgic", voiceMusicBalance: "Balanced", musicMix: 50, voiceVolume: 60, musicVolume: 60, audioMixVersion: 2, captionStyle: "Reel", visualStyle: "Natural", cardEngraving: ["", "", ""], keepOrder: defaultKeepOrder(),
  };
}

/** Drafts saved during an older creation flow resume at the equivalent current screen. */
export function resumeKeepCreationStage(stage: string): string {
  if (stage === "feelings") return "intent";
  if (stage === "messageGenerating") return "summary";
  if (stage === "generating") return "memories";
  if (stage === "preview" || stage === "recipientPreview") return "editor";
  return stage;
}

export const stageLabels: Record<string, string> = {
  recipient: "Choosing who it's for", occasion: "Choosing the occasion", voices: "Choosing the voices", intent: "Expressing the heart behind it", feelings: "Expressing the heart behind it", remoteInvite: "Collecting voices remotely", groupRecord: "Recording together", path: "Finding the words", interview: "In the interview",
  summary: "Story gathered", write: "Writing the message", message: "Shaping the message", recordPrep: "Getting ready to record", record: "Recording your voice",
  recorded: "Voice recorded", memories: "Adding memories", framing: "Framing photos & videos", editor: "In the editor", card: "Final touches", finalizing: "Finishing film", success: "Ready",
};

// Keep the latest pointer and per-Keep snapshots separate for each account.
function deviceOwner(): string | undefined {
  try { return JSON.parse(localStorage.getItem("keep-app-session") ?? "null")?.user?.id; } catch { return undefined; }
}
const draftKey = (owner?: string, id?: string) => owner ? DRAFT_KEY + "." + owner + (id ? "." + id : "") : DRAFT_KEY;
export function saveDraft(p: KeepProject): boolean {
  try {
    const owner = p.draftOwnerId ?? deviceOwner();
    if (owner && owner !== deviceOwner()) return false;
    if (p.restoreIncomplete) return false;
    // Don't replace an intact snapshot with one whose new photo/video only
    // exists in memory. Otherwise reopening silently removes that moment.
    if ([...p.memories, ...(p.selfieBaseMedia ?? []), ...(p.selfieVideos ?? [])].some(m => m.source === "upload" && m.persisted === false)) return false;
    if (!p.active) { localStorage.removeItem(draftKey(owner)); return true; }
    const lite: KeepProject = {
      ...p,
      draftOwnerId: owner,
      draftSavedAt: Date.now(),
      memories: p.memories.filter((m) => m.source === "sample" || m.source === "text" || m.persisted).map((m) => ({ ...m, url: m.source === "text" ? m.url : "" })),
      selfieVideos: (p.selfieVideos ?? []).filter(m=>m.persisted).map(m=>({...m,url:""})),
      selfieBaseMedia: (p.selfieBaseMedia??[]).filter(m=>m.source!=="upload"||m.persisted)
        .map(m=>({...m,url:m.source==="text"?m.url:""})),
      interviewAnswers: p.interviewAnswers.map(({ audioUrl: _a, ...a }) => a),
      // A recording without a saved blob cannot be restored after a reload.
      // Preserve the written message rather than restoring a phantom voice.
      finalVoiceRecording: p.finalVoiceRecording && (p.finalVoiceRecording.demo || p.finalVoiceRecording.audioId)
        ? (({audioUrl: _url, ...safe}) => safe)(p.finalVoiceRecording) : null,
      voiceParts: (p.voiceParts ?? []).map(({ audioUrl: _url, ...part }) => part),
    };
    const serialized = JSON.stringify(lite);
    if (owner && p.publicationId) localStorage.setItem(draftKey(owner, p.publicationId), serialized);
    localStorage.setItem(draftKey(owner), serialized);
    return true;
  } catch { return false; /* Never claim to have saved when storage is unavailable. */ }
}

export function loadDraft(publicationId?: string): KeepProject | null {
  try {
    const owner = deviceOwner();
    const raw = [...new Set([owner && publicationId ? draftKey(owner, publicationId) : draftKey(owner), draftKey(owner), DRAFT_KEY])]
      .map(key => localStorage.getItem(key))
      .find(value => {
        if (!value) return false;
        try {
          const candidate = JSON.parse(value) as Partial<KeepProject>;
          return (!candidate.draftOwnerId || candidate.draftOwnerId === owner)
            && (!publicationId || candidate.publicationId === publicationId);
        } catch { return false; }
      });
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KeepProject>;
    if (parsed.draftOwnerId && parsed.draftOwnerId !== owner) return null;
    if (publicationId && parsed.publicationId !== publicationId) return null;
    const p = { ...newProject(), ...parsed };
    if ((parsed.audioMixVersion ?? 1) < 2) {
      if (parsed.voiceVolume == null || parsed.voiceVolume === 100) p.voiceVolume = 60;
      if (parsed.musicVolume == null || parsed.musicVolume === 50) p.musicVolume = 60;
      p.audioMixVersion = 2;
    }
    p.memories = (p.memories ?? []).map((m) => (m.source === "sample" ? { ...m, url: memoryImages[m.sampleIndex ?? 0] ?? "" } : m));
    return p;
  } catch {
    return null;
  }
}


/** Never silently replace a newer, playable phone recording with an older cloud snapshot. */
export function preferLocalKeepDraft(local: KeepProject | null, remote: KeepProject | null): boolean {
  if (!local?.active || local.restoreIncomplete) return false;
  if (!remote) return true;
  // A saved draft on this device can belong to another account or another Keep.
  if (!local.publicationId || local.publicationId !== remote.publicationId ||
    (local.draftOwnerId && remote.draftOwnerId && local.draftOwnerId !== remote.draftOwnerId)) return false;
  const localHasVoice = !!local.finalVoiceRecording?.audioId && !!local.finalVoiceRecording?.audioUrl;
  const remoteHasVoice = !!remote.finalVoiceRecording?.audioId && !!remote.finalVoiceRecording?.audioUrl;
  if (localHasVoice && !remoteHasVoice) return true;
  if (remoteHasVoice && !localHasVoice) return false;
  // Only compare complete local asset restorations. Otherwise preserve the cloud data.
  const localMissingMedia = local.memories.some(m=>m.source==="upload" && !m.url)
    || (local.selfieVideos??[]).some(m=>m.source==="upload" && !m.url)
    || (local.voiceParts??[]).some(p=>!p.audioUrl);
  if (localMissingMedia) return false;
  const localAt = local.draftSavedAt ?? 0;
  const remoteAt = remote.draftSavedAt ?? 0;
  return localAt > 0 && remoteAt > 0 && localAt > remoteAt + 250;
}

export function clearDraft(publicationId?: string) {
  try {
    const owner = deviceOwner();
    const current = loadDraft();
    const id = publicationId ?? current?.publicationId;
    if (owner && id) localStorage.removeItem(draftKey(owner, id));
    if (!publicationId || current?.publicationId === publicationId) localStorage.removeItem(draftKey(owner));
    const legacy = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as KeepProject | null;
    if (legacy && (!legacy.draftOwnerId || legacy.draftOwnerId === owner)
        && (id ? legacy.publicationId === id : !owner)) localStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}

const blobUrl = async (id?: string) => {
  if (!id) return undefined;
  try { const b = await getBlob(id); return b?.size ? URL.createObjectURL(b) : undefined; } catch { return undefined; }
};

/** Restores object URLs for media/audio saved in IndexedDB. Missing file references are retained so a failed restoration cannot erase the project. */
export async function hydrateDraftMedia(p: KeepProject): Promise<Pick<KeepProject, "memories" | "selfieBaseMedia" | "selfieVideos" | "interviewAnswers" | "finalVoiceRecording" | "voiceParts" | "restoreIncomplete" | "restoreMissingCount">> {
  const memories: MediaItem[] = [];
  for (const m of p.memories) {
    if (m.source === "sample" || m.source === "text") { memories.push(m); continue; }
    const sourceId = m.blobId ?? m.id;
    const url = (m.kind === "image" ? await blobUrl(keepOptimizedPhotoId(sourceId)) : undefined)
      ?? await blobUrl(sourceId);
    memories.push({ ...m, url: url ?? "" });
  }
  const selfieBaseMedia:MediaItem[]=[];
  for(const item of p.selfieBaseMedia??[]){
    if(item.source==="sample"){selfieBaseMedia.push({...item,url:memoryImages[item.sampleIndex??0]??""});continue;}
    if(item.source==="text"){selfieBaseMedia.push(item);continue;}
    const sourceId = item.blobId ?? item.id;
    const url = (item.kind === "image" ? await blobUrl(keepOptimizedPhotoId(sourceId)) : undefined)
      ?? await blobUrl(sourceId);
    selfieBaseMedia.push({...item,url:url ?? ""});
  }
  const selfieVideos: MediaItem[]=[];
  for(const item of p.selfieVideos??[]){
    const url=await blobUrl(item.blobId??item.id);
    selfieVideos.push({...item,url:url ?? ""});
  }
  const interviewAnswers = await Promise.all(p.interviewAnswers.map(async (a) => {
    const {audioUrl: _previous, ...rest} = a;
    const url = await blobUrl(a.audioId);
    return url ? {...rest,audioUrl:url} : rest;
  }));
  const f = p.finalVoiceRecording;
  const finalVoiceRecording = f ? (f.demo ? f : await (async () => {
    const {audioUrl: _previous, ...rest} = f;
    const url = await blobUrl(f.audioId);
    return url ? {...rest,audioUrl:url} : rest;
  })()) : null;
  const voiceParts = await Promise.all((p.voiceParts ?? []).map(async part => {
    const {audioUrl: _previous, ...rest} = part;
    const url = await blobUrl(part.audioId);
    return url ? {...rest,audioUrl:url} : rest;
  }));
  const missing = new Set<string>();
  for (const item of [...memories, ...selfieBaseMedia, ...selfieVideos]) if (item.source === "upload" && !item.url) missing.add(item.blobId ?? item.id);
  for (const audio of [...interviewAnswers, ...voiceParts, ...(finalVoiceRecording ? [finalVoiceRecording] : [])]) {
    if (audio.audioId && !audio.audioUrl) missing.add(audio.audioId);
  }
  return { memories, selfieBaseMedia, selfieVideos, interviewAnswers, finalVoiceRecording, voiceParts,
    restoreIncomplete: missing.size > 0, restoreMissingCount: missing.size };

}

export function projectBlobIds(p: KeepProject) {
  return [
    ...p.memories.filter((m) => m.source === "upload").map((m) => m.blobId??m.id),
    ...(p.selfieVideos??[]).filter(m=>m.source==="upload").map(m=>m.blobId??m.id),
    ...(p.selfieBaseMedia??[]).filter(m=>m.source==="upload").map(m=>m.blobId??m.id),
    ...p.interviewAnswers.map((a) => a.audioId).filter((x): x is string => !!x),
    ...(p.finalVoiceRecording?.audioId ? [p.finalVoiceRecording.audioId] : []),
    ...(p.voiceParts ?? []).map((part) => part.audioId),
  ];
}

export function projectObjectUrls(p: KeepProject) {
  return [
    ...p.memories.filter((m) => m.source === "upload").map((m) => m.url),
    ...(p.selfieVideos??[]).map(m=>m.url),
    ...(p.selfieBaseMedia??[]).filter(m=>m.source==="upload").map(m=>m.url),
    ...p.interviewAnswers.map((a) => a.audioUrl),
    p.finalVoiceRecording?.audioUrl,
    ...(p.voiceParts ?? []).map((part) => part.audioUrl),
  ].filter((x): x is string => !!x && x.startsWith("blob:"));
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
