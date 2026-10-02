import { memoryImages } from "@/components/keep-player";
import { getBlob } from "./keep-media-store";

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  source: "upload" | "sample";
  url: string; // object URL (uploads) or bundled asset (samples) — never persisted for uploads
  name?: string;
  mimeType?: string;
  sampleIndex?: number;
  persisted?: boolean; // blob saved in IndexedDB
};

/** One interview answer. A future transcription/AI service consumes the audio blob
 *  (looked up by audioId) plus all prior answers as conversation context. */
export type InterviewAnswer = {
  questionIndex: number;
  question: string;
  audioId?: string;
  audioUrl?: string;
  durationSec?: number;
  mimeType?: string;
  demoText?: string; // set only when the demo fallback was used
  transcript?: string; // set only by a real transcription service (none connected yet)
};

export type VoiceRecording = { audioId?: string; audioUrl?: string; durationSec: number; mimeType?: string; demo: boolean };

export type KeepProject = {
  active: boolean;
  stage: string;
  recipientName: string;
  relationship: string;
  occasion: string;
  questionIndex: number;
  interviewAnswers: InterviewAnswer[];
  messageSource: "demo" | "own" | null;
  writtenText: string;
  messageParagraphs: string[];
  finalVoiceRecording: VoiceRecording | null;
  memories: MediaItem[];
  musicMood: string;
  voiceMusicBalance: string;
  captionStyle: string;
  visualStyle: string;
  cardEngraving: string[];
};

export const DRAFT_KEY = "keep.draft.v1";
export const ONBOARD_KEY = "keep.onboarded.v1";

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const sampleMemories = (): MediaItem[] =>
  memoryImages.map((url, i) => ({ id: newId("sample"), kind: "image", source: "sample", url, sampleIndex: i }));

export function newProject(): KeepProject {
  return {
    active: false, stage: "recipient", recipientName: "", relationship: "", occasion: "Anniversary", questionIndex: 0,
    interviewAnswers: [], messageSource: null, writtenText: "", messageParagraphs: [], finalVoiceRecording: null, memories: [],
    musicMood: "Warm + Nostalgic", voiceMusicBalance: "Balanced", captionStyle: "Reel", visualStyle: "Natural", cardEngraving: ["", "FROM ALEX", "2026"],
  };
}

export const stageLabels: Record<string, string> = {
  recipient: "Choosing who it's for", occasion: "Choosing the occasion", path: "Finding the words", interview: "In the interview",
  summary: "Story gathered", write: "Writing the message", message: "Shaping the message", record: "Recording your voice",
  recorded: "Voice recorded", memories: "Adding memories", editor: "In the editor", card: "Designing the card", success: "Ready",
};

export function saveDraft(p: KeepProject) {
  try {
    if (!p.active) { localStorage.removeItem(DRAFT_KEY); return; }
    const lite: KeepProject = {
      ...p,
      memories: p.memories.filter((m) => m.source === "sample" || m.persisted).map((m) => ({ ...m, url: "" })),
      interviewAnswers: p.interviewAnswers.map(({ audioUrl: _a, ...a }) => a),
      finalVoiceRecording: p.finalVoiceRecording ? { ...p.finalVoiceRecording, audioUrl: undefined } : null,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(lite));
  } catch { /* storage full or blocked — draft stays session-only */ }
}

export function loadDraft(): KeepProject | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KeepProject>;
    const p = { ...newProject(), ...parsed };
    p.memories = (p.memories ?? []).map((m) => (m.source === "sample" ? { ...m, url: memoryImages[m.sampleIndex ?? 0] ?? "" } : m));
    return p;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

const blobUrl = async (id?: string) => {
  if (!id) return undefined;
  const b = await getBlob(id);
  return b ? URL.createObjectURL(b) : undefined;
};

/** Restores object URLs for media/audio saved in IndexedDB. Items whose blobs are gone are dropped. */
export async function hydrateDraftMedia(p: KeepProject) {
  const memories: MediaItem[] = [];
  for (const m of p.memories) {
    if (m.source === "sample") { memories.push(m); continue; }
    const url = await blobUrl(m.id);
    if (url) memories.push({ ...m, url });
  }
  const interviewAnswers = await Promise.all(p.interviewAnswers.map(async (a) => ({ ...a, audioUrl: await blobUrl(a.audioId) })));
  const f = p.finalVoiceRecording;
  const finalVoiceRecording = f ? (f.demo ? f : { ...f, audioUrl: await blobUrl(f.audioId) }) : null;
  return { memories, interviewAnswers, finalVoiceRecording };
}

export function projectBlobIds(p: KeepProject) {
  return [
    ...p.memories.filter((m) => m.source === "upload").map((m) => m.id),
    ...p.interviewAnswers.map((a) => a.audioId).filter((x): x is string => !!x),
    ...(p.finalVoiceRecording?.audioId ? [p.finalVoiceRecording.audioId] : []),
  ];
}

export function projectObjectUrls(p: KeepProject) {
  return [
    ...p.memories.filter((m) => m.source === "upload").map((m) => m.url),
    ...p.interviewAnswers.map((a) => a.audioUrl),
    p.finalVoiceRecording?.audioUrl,
  ].filter((x): x is string => !!x && x.startsWith("blob:"));
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
