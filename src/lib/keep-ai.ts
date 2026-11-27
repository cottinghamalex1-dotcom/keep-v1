// Client for KEEP's guided interview service. Configured via VITE_KEEP_AI_URL / VITE_KEEP_AI_KEY.
const URL_ = (import.meta.env['VITE_KEEP_AI_URL'] as string | undefined) || "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-ai";
const KEY = (import.meta.env['VITE_KEEP_AI_KEY'] as string | undefined) || "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

export const keepAiAvailable = () => !!URL_ && !!KEY;

export type InterviewContext = {
  recipientName: string;
  relationship: string;
  occasion: string;
  intent: string;
  contributors?: string[];
  answers: { question: string; transcript: string }[];
};

async function post<T>(body: BodyInit, json: boolean): Promise<T> {
  if (!URL_ || !KEY) throw new Error("unavailable");
  const headers: Record<string, string> = { apikey: KEY };
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(URL_, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchNextQuestion(ctx: InterviewContext) {
  const r = await post<{ done?: boolean; question?: string; summary?: string }>(JSON.stringify({ action: "next_question", ...ctx }), true);
  const done = !!r.done;
  if (!done && !r.question?.trim()) throw new Error("empty question");
  return { done, question: (r.question ?? "").trim(), summary: (r.summary ?? "").trim() };
}

export async function transcribeAudio(blob: Blob, mimeType?: string) {
  const ext = (mimeType ?? blob.type).includes("mp4") ? "m4a" : (mimeType ?? blob.type).includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("action", "transcribe");
  fd.append("file", new File([blob], `answer.${ext}`, { type: blob.type || mimeType || "audio/webm" }));
  const r = await post<{ transcript?: string }>(fd, false);
  return (r.transcript ?? "").trim();
}

export type TimedWord = { word: string; start: number; end: number };

type TimedChunk = { file: Blob; offset: number; duration: number; silent?: boolean };
type DecodedVoice = {
  chunks: TimedChunk[];
  duration: number;
  split: (part: TimedChunk) => [TimedChunk, TimedChunk] | null;
};
const CAPTION_RATE = 16000;
const seconds = (frames: number) => frames / CAPTION_RATE;

/** Create short, mono PCM clips on the exact original recording clock.
 * Silence detection uses a real audio window, not a few isolated samples. */
function splitVoiceBuffer(buffer: AudioBuffer): DecodedVoice {
  const duration = buffer.duration;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const ratio = buffer.sampleRate / CAPTION_RATE;
  const pcm = new Float32Array(Math.round(duration * CAPTION_RATE));
  for (let i = 0; i < pcm.length; i++) {
    const from = Math.min(buffer.length - 1, Math.floor(i * ratio));
    const to = Math.min(buffer.length, Math.max(from + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let frame = from; frame < to; frame++) {
      for (const channel of channels) sum += channel[frame]!;
    }
    pcm[i] = sum / ((to - from) * channels.length);
  }

  // Find a quiet 160 ms window around the desired boundary. Use the full
  // window energy so a zero-crossing within a spoken word isn't mistaken for silence.
  const quietCut = (from: number, to: number, target: number, radius: number) => {
    const lo = Math.max(from + CAPTION_RATE * 2, target - radius);
    const hi = Math.min(to - CAPTION_RATE * 2, target + radius);
    let best = target, quietest = Infinity;
    for (let at = Math.ceil(lo); at <= hi; at += CAPTION_RATE / 20) {
      let energy = 0;
      for (let j = at - 1280; j < at + 1280; j += 4) energy += pcm[j]! ** 2;
      if (energy < quietest || (energy === quietest && Math.abs(at - target) < Math.abs(best - target))) {
        best = at; quietest = energy;
      }
    }
    return Math.round(best);
  };

  const makeChunk = (from: number, to: number): TimedChunk => {
    const frames = to - from;
    const bytes = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(bytes);
    const label = (index: number, value: string) => { for (let j = 0; j < value.length; j++) view.setUint8(index + j, value.charCodeAt(j)); };
    label(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); label(8, "WAVE");
    label(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, CAPTION_RATE, true);
    view.setUint32(28, CAPTION_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    label(36, "data"); view.setUint32(40, frames * 2, true);
    let peak = 0;
    for (let i = 0; i < frames; i++) {
      const value = Math.max(-1, Math.min(1, pcm[from + i]!));
      peak = Math.max(peak, Math.abs(value));
      view.setInt16(44 + i * 2, Math.round(value < 0 ? value * 32768 : value * 32767), true);
    }
    // Only skip effectively digital silence; quiet narration is still transcribed.
    return { file: new Blob([bytes], { type: "audio/wav" }), offset: seconds(from), duration: seconds(frames), silent: peak < 0.0001 };
  };

  const chunks: TimedChunk[] = [];
  let from = 0;
  while (pcm.length - from > CAPTION_RATE * 22) {
    const end = quietCut(from, pcm.length, from + CAPTION_RATE * 18, CAPTION_RATE * 2);
    chunks.push(makeChunk(from, end));
    from = end;
  }
  if (from < pcm.length) chunks.push(makeChunk(from, pcm.length));
  return {
    chunks, duration,
    split(part) {
      // Retry only an affected section with shorter clips, retaining all
      // previously aligned sections and their exact absolute timestamps.
      if (part.duration < 8) return null;
      const start = Math.round(part.offset * CAPTION_RATE);
      const end = start + Math.round(part.duration * CAPTION_RATE);
      const cut = quietCut(start, end, Math.round((start + end) / 2), CAPTION_RATE);
      if (cut - start < CAPTION_RATE * 2 || end - cut < CAPTION_RATE * 2) return null;
      return [makeChunk(start, cut), makeChunk(cut, end)];
    },
  };
}

async function voiceChunks(blob: Blob): Promise<DecodedVoice | null> {
  if (typeof AudioContext === "undefined") return null;
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || !buffer.numberOfChannels) return null;
    return splitVoiceBuffer(buffer);
  } catch {
    // Some browser codecs can't be decoded locally. Try the original file,
    // but never accept collapsed timestamps or invent timing for it.
    return null;
  } finally {
    if (context) await context.close().catch(() => undefined);
  }
}

/** Preserve provider anchors. A few 0-ms timestamps are common on contractions
 * and very short words; extend only isolated words into their adjacent free
 * interval. A cluster of collapsed/reversed timestamps must be re-transcribed. */
function reliableWordTimes(words: TimedWord[], duration: number): TimedWord[] | null {
  if (!words.length || !Number.isFinite(duration) || duration <= 0) return null;
  const invalid = words.some(w => !Number.isFinite(w.start) || !Number.isFinite(w.end) ||
    w.start < -0.1 || w.end < w.start || w.end > duration + 0.35 || w.end - w.start > 5);
  const repeated = words.slice(1).filter((w, i) => Math.abs(w.start - words[i]!.start) < 0.03).length;
  const reversed = words.slice(1).some((w, i) => w.start + 0.005 < words[i]!.start);
  const tiny = words.filter(w => w.end - w.start <= 0.045).length;
  if (invalid || reversed || repeated / Math.max(1, words.length - 1) > 0.12 ||
      tiny > Math.max(1, Math.floor(words.length * 0.2))) return null;
  const normalized: TimedWord[] = [];
  let nextStart: number | undefined;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const start = Math.max(0, nextStart ?? w.start);
    nextStart = undefined;
    let end = Math.min(duration, w.end);
    if (end - start <= 0.045) {
      const next = words[i + 1];
      const anchor = Math.min(duration, next?.start ?? duration);
      // Keep the original spoken start. Never spread a group of words or
      // shift later speech to fill a pause.
      end = Math.min(anchor, start + 0.12);
      if (end - start <= 0.045 && next && Math.abs(next.start - start) < 0.03) {
        // Whisper sometimes gives a brief preceding word (e.g. "we") the
        // exact start of the next word ("will"). Their measured combined
        // span is still useful if it is an isolated pair, not a collapsed run.
        const measuredEnd = Math.min(duration, next.end, words[i + 2]?.start ?? duration);
        const span = measuredEnd - start;
        if (span >= 0.15 && span <= 1 && next.end - next.start > 0.12) {
          end = start + Math.min(0.1, span / 3);
          nextStart = end;
        }
      }
      if (end - start <= 0.045) return null;
    }
    normalized.push({ ...w, start, end });
  }
  return normalized;
}

export async function transcribeTimedAudio(blob: Blob, mimeType?: string, prompt?: string, onProgress?: (completed: number, total: number) => void) {
  const decoded = await voiceChunks(blob);
  const duration = decoded?.duration ?? 0;
  const parts = decoded?.chunks ?? [{ file: blob, offset: 0, duration: 0 }];
  const transcripts: string[] = [];
  const words: TimedWord[] = [];
  onProgress?.(0, parts.length);

  const transcribe = async (part: TimedChunk, usePrompt: boolean, label: string) => {
    const type = part.file.type || mimeType || blob.type || "audio/webm";
    const ext = type.includes("wav") ? "wav" : type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("mpeg") ? "mp3" : "webm";
    const fd = new FormData();
    fd.append("action", "transcribe_timed");
    fd.append("file", new File([part.file], `keep-voice-${label}.${ext}`, { type }));
    // Do not feed the start of the full script to every clip. It can make
    // Whisper repeat the opening words in later sections instead of listening.
    if (usePrompt && prompt?.trim()) fd.append("prompt", prompt.trim().slice(0, 1200));
    const result = await post<{ transcript?: string; words?: TimedWord[] }>(fd, false);
    const localWords = (result.words ?? []).map(w => ({
      word: String(w.word ?? "").trim(), start: Number(w.start), end: Number(w.end),
    })).filter(w => w.word);
    const clipDuration = part.duration || Math.max(0, ...localWords.map(w => w.end));
    const normalized = reliableWordTimes(localWords, clipDuration);
    return normalized ? {
      transcript: (result.transcript ?? "").trim() || normalized.map(w => w.word).join(" "),
      words: normalized.map(w => ({ ...w,
        start: Number((w.start + part.offset).toFixed(3)),
        end: Number((w.end + part.offset).toFixed(3)),
      })),
    } : null;
  };

  const align = async (part: TimedChunk, label: string, depth = 0, usePrompt = false): Promise<{ transcript: string; words: TimedWord[] } | null> => {
    if (part.silent) return { transcript: "", words: [] };
    const result = await transcribe(part, usePrompt, label);
    if (result) return result;
    // A short original recording may have used a script hint. Retry without
    // it before splitting, or if local decoding wasn't available.
    if (usePrompt) {
      const unprompted = await transcribe(part, false, label + "-retry");
      if (unprompted) return unprompted;
    }
    const halves = depth < 2 ? decoded?.split(part) : null;
    if (!halves) return null;
    const left = await align(halves[0], label + "-a", depth + 1);
    if (!left) return null;
    const right = await align(halves[1], label + "-b", depth + 1);
    if (!right) return null;
    return { transcript: [left.transcript, right.transcript].filter(Boolean).join(" "), words: [...left.words, ...right.words] };
  };

  for (const [index, part] of parts.entries()) {
    const label = String(index + 1);
    let result;
    try {
      result = await align(part, label, 0, parts.length === 1 && !!prompt?.trim());
    } catch {
      throw new Error(`Caption transcription could not finish section ${index + 1} of ${parts.length}. Your saved voice and captions are unchanged. Please retry.`);
    }
    if (!result) {
      throw new Error(`Caption timing could not be verified for section ${index + 1} of ${parts.length}, even after retrying shorter clips. Your original voice and captions are safe.`);
    }
    transcripts.push(result.transcript);
    words.push(...result.words);
    onProgress?.(index + 1, parts.length);
  }
  if (!words.length) throw new Error("No spoken words were detected. Your original voice is saved; check that you can hear it before retrying caption sync.");
  return { transcript: transcripts.filter(Boolean).join(" "), words, audioDurationSec: duration };
}

/** Three personal, engraving-length lines based on the complete final script. */
export async function fetchOpeningSuggestions(
  recipientName: string,
  occasion: string,
  messageParagraphs: string[],
): Promise<string[]> {
  const r = await post<{ suggestions?: string[] }>(
    JSON.stringify({ action: "opening_suggestions", recipientName, occasion, messageParagraphs }),
    true,
  );
  const unique = [...new Set((r.suggestions ?? []).map(s => String(s).trim()).filter(s => s.length > 8 && s.length <= 110))];
  if (unique.length !== 3) throw new Error("The three personal openings could not be generated.");
  return unique;
}

export async function fetchDraft(ctx: InterviewContext) {
  const r = await post<{ paragraphs?: string[] }>(JSON.stringify({ action: "draft", ...ctx }), true);
  const paras = (r.paragraphs ?? []).map((p) => String(p).trim()).filter(Boolean);
  if (!paras.length) throw new Error("empty draft");
  return paras;
}


export async function fetchRevision(
  ctx: InterviewContext,
  messageParagraphs: string[],
  paragraphIndex: number,
  instruction: string,
  scope: "section" | "message" = "section",
) {
  const r = await post<{ paragraphs?: string[]; changedIndexes?: number[]; note?: string }>(
    JSON.stringify({
      action: "revise",
      ...ctx,
      messageParagraphs,
      paragraphIndex,
      instruction,
      scope,
    }),
    true,
  );
  const paragraphs = (r.paragraphs ?? []).map((p) => String(p).trim()).filter(Boolean);
  if (!paragraphs.length) throw new Error("empty revision");
  return {
    paragraphs,
    changedIndexes: (r.changedIndexes ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < paragraphs.length),
    note: String(r.note ?? "").trim(),
  };
}
