import { KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, MUSIC_FILES, musicEnvelope } from "./keep-audio";
import { motionFor, sceneBoundary, sceneDuration } from "./keep-film-timing";
import type { AudioMix, CaptionCue, MediaItem } from "./keep-project";

/**
 * Canonical, deterministic edit decision list for a fully rendered Keep.
 *
 * IMPORTANT: This is a render CONTRACT, not a browser video export. A trusted
 * server-side worker must transcode these sources to one H.264/AAC MP4,
 * upload it privately, and mark that exact revision ready before sharing.
 * Never hand the recipient this manifest as proof a video is rendered.
 */
export type RenderSource = Omit<MediaItem, "url"> & { storagePath: string };
export type RenderInput = {
  voicePath: string;
  voiceDuration: number;
  memories: RenderSource[];
  captionCues: CaptionCue[];
  captionStyle: string;
  captionPosition?: "top" | "middle" | "bottom";
  captionLines?: number;
  visualStyle: string;
  musicMood: string;
  voiceMusicBalance: string;
  voiceVolume: number;
  musicVolume: number;
  audioMix?: AudioMix;
};

export type RenderScene = {
  id: string;
  sourcePath: string;
  kind: "image" | "video";
  startSec: number;
  endSec: number;
  /** Precise authored scene boundary, excluding transition handles. */
  activeStartSec: number;
  activeEndSec: number;
  dissolveInSec: number;
  dissolveOutSec: number;
  videoStartSec: number;
  videoDurationSec?: number;
  muted: true;
  motion: "in" | "out" | "left" | "right";
  focusX: number;
  focusY: number;
  zoom: number;
  visualStyle: string;
};
export type KeepRenderPlan = {
  version: 1;
  output: { container: "mp4"; videoCodec: "h264"; audioCodec: "aac"; width: 1080; height: 1920; fps: 30 };
  durationSec: number;
  voice: { sourcePath: string; startSec: number; endSec: number; volume: number; muted: boolean };
  music: {
    sourcePath: string;
    repeatToSec: number;
    volume: number;
    muted: boolean;
    balance: string;
    envelope: ReturnType<typeof musicEnvelope>;
  };
  scenes: RenderScene[];
  captions: Array<{ text: string; startSec: number; endSec: number }>;
  captionStyle: string;
  captionPosition: "top" | "middle" | "bottom";
  captionLines: number;
};

const finitePositive = (n: number) => Number.isFinite(n) && n > 0;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const t = (n: number) => Math.round(n * 1000) / 1000;

export function buildKeepRenderPlan(input: RenderInput): KeepRenderPlan {
  if (!input.voicePath || !finitePositive(input.voiceDuration) || input.voiceDuration > 7200)
    throw new Error("A complete voice recording is required to render a Keep.");
  if (!input.memories.length || input.memories.some(m => !m.storagePath || !["image", "video"].includes(m.kind)))
    throw new Error("Every Keep memory must have a saved source before rendering.");

  const lead = KEEP_MUSIC_LEAD_SECONDS;
  const tail = KEEP_MUSIC_TAIL_SECONDS;
  const duration = lead + input.voiceDuration + tail;
  // The live Watch view scales scene lengths to narration time. This plan
  // shares the exact boundaries instead of reconstructing independent timers.
  const boundaries = input.memories.map((_, i) => sceneBoundary(input.memories, i, input.voiceDuration));
  const scenes: RenderScene[] = input.memories.map((moment, i) => {
    const activeStart = i === 0 ? 0 : lead + boundaries[i - 1]!;
    const activeEnd = i === input.memories.length - 1 ? duration : lead + boundaries[i]!;
    // Fade overlaps run over two occupied image/video layers; never fade into
    // an empty/black canvas. Cuts have zero handles.
    const overlapIn = i === 0 || moment.transition === "cut" ? 0 : 0.3;
    const following = input.memories[i + 1];
    const overlapOut = !following || following.transition === "cut" ? 0 : 0.3;
    const startSec = Math.max(0, activeStart - overlapIn);
    const endSec = Math.min(duration, activeEnd + overlapOut);
    return {
      id: moment.id,
      sourcePath: moment.storagePath,
      kind: moment.kind,
      startSec: t(startSec),
      endSec: t(endSec),
      activeStartSec: t(activeStart),
      activeEndSec: t(activeEnd),
      dissolveInSec: t(activeStart - startSec),
      dissolveOutSec: t(endSec - activeEnd),
      videoStartSec: moment.videoStartSec ?? 0,
      ...(moment.videoDurationSec ? { videoDurationSec: moment.videoDurationSec } : {}),
      muted: true as const,
      motion: motionFor(moment, i),
      focusX: moment.focusX ?? 50,
      focusY: moment.focusY ?? 50,
      zoom: moment.zoom ?? 1,
      visualStyle: input.visualStyle,
    };
  });

  const captions = input.captionStyle === "None" ? [] : input.captionCues.flatMap(cue => {
    const start = clamp(cue.start, 0, input.voiceDuration);
    const end = clamp(cue.end, 0, input.voiceDuration);
    return end > start && cue.text.trim() ? [{
      text: cue.text.trim(),
      startSec: t(lead + start),
      endSec: t(lead + end),
    }] : [];
  });
  const mood = input.musicMood === "Worth Keeping" ? "Intentional" : input.musicMood;
  const file = MUSIC_FILES[mood];
  if (!file && !input.audioMix?.musicMuted)
    throw new Error("The selected soundtrack must be available before rendering.");

  return {
    version: 1,
    output: { container: "mp4", videoCodec: "h264", audioCodec: "aac", width: 1080, height: 1920, fps: 30 },
    durationSec: t(duration),
    voice: {
      sourcePath: input.voicePath,
      startSec: lead,
      endSec: t(lead + input.voiceDuration),
      volume: clamp(input.voiceVolume, 0, 100) / 100,
      muted: !!input.audioMix?.voiceMuted,
    },
    music: {
      sourcePath: file ?? "",
      repeatToSec: t(duration),
      volume: clamp(input.musicVolume, 0, 100) / 100,
      muted: !!input.audioMix?.musicMuted,
      balance: input.voiceMusicBalance,
      envelope: musicEnvelope(lead, input.voiceDuration, input.audioMix?.fadeIn, input.audioMix?.fadeOut),
    },
    scenes,
    captions,
    captionStyle: input.captionStyle,
    captionPosition: input.captionPosition ?? "bottom",
    captionLines: clamp(input.captionLines ?? 2, 1, 3),
  };
}
