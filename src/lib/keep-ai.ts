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

type TimedChunk = { file: Blob; offset: number; duration: number };

/** An extended iPhone recording can make Whisper's full-file word timestamps
 * collapse. Decode it, split near quiet moments, and anchor each short clip
 * to its true position on the original recording clock. */
async function voiceChunks(blob: Blob): Promise<{ chunks: TimedChunk[]; duration: number } | null> {
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const duration = buffer.duration;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    if (duration < 35) return { chunks: [{ file: blob, offset: 0, duration }], duration };
    const rate = buffer.sampleRate;
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    const sample = (time: number) => {
      const index = Math.min(buffer.length - 1, Math.max(0, Math.round(time * rate)));
      return channels.reduce((sum, channel) => sum + channel[index]!, 0) / channels.length;
    };
    const cuts = [0];
    while (duration - cuts[cuts.length - 1]! > 30) {
      const start = cuts[cuts.length - 1]!;
      let bestAt = Math.min(duration, start + 23), quietest = Infinity;
      // Find a quiet 120 ms window near the desired cut so words are not split.
      for (let at = start + 20; at <= Math.min(duration - 4, start + 26); at += 0.1) {
        let energy = 0;
        for (let j = 0; j < 12; j++) energy += Math.abs(sample(at + j * 0.01));
        if (energy < quietest) { quietest = energy; bestAt = at; }
      }
      cuts.push(Number(bestAt.toFixed(3)));
    }
    cuts.push(duration);
    const chunks: TimedChunk[] = [];
    for (let n = 0; n < cuts.length - 1; n++) {
      const offset = cuts[n]!, end = cuts[n + 1]!, seconds = end - offset;
      const frames = Math.ceil(seconds * 16000);
      const bytes = new ArrayBuffer(44 + frames * 2);
      const view = new DataView(bytes);
      const label = (index: number, value: string) => { for (let j = 0; j < value.length; j++) view.setUint8(index + j, value.charCodeAt(j)); };
      label(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); label(8, "WAVE");
      label(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
      view.setUint16(22, 1, true); view.setUint32(24, 16000, true);
      view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      label(36, "data"); view.setUint32(40, frames * 2, true);
      for (let i = 0; i < frames; i++) {
        const value = Math.max(-1, Math.min(1, sample(Math.min(end - 0.0001, offset + i / 16000))));
        view.setInt16(44 + i * 2, Math.round(value < 0 ? value * 32768 : value * 32767), true);
      }
      chunks.push({ file: new Blob([bytes], { type: "audio/wav" }), offset, duration: seconds });
    }
    return { chunks, duration };
  } catch {
    // A codec may not be decodable on an older iPhone. Do not prevent the
    // provider from trying the original file; validate its timing afterward.
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

function reliableWordTimes(words: TimedWord[], duration: number): boolean {
  if (!words.length || duration <= 0) return false;
  const bad = words.filter(w => !Number.isFinite(w.start) || !Number.isFinite(w.end) ||
    w.start < -0.1 || w.end <= w.start + 0.045 || w.end > duration + 1).length;
  const repeated = words.slice(1).filter((w, i) => Math.abs(w.start - words[i]!.start) < 0.03).length;
  const reversed = words.slice(1).filter((w, i) => w.start + 0.05 < words[i]!.start).length;
  return bad / words.length <= 0.08 &&
    repeated / Math.max(1, words.length - 1) < 0.12 &&
    reversed === 0;
}

export async function transcribeTimedAudio(blob: Blob, mimeType?: string, prompt?: string, onProgress?: (completed: number, total: number) => void) {
  const decoded = await voiceChunks(blob);
  const duration = decoded?.duration ?? 0;
  const parts = decoded?.chunks ?? [{ file: blob, offset: 0, duration: 0 }];
  const transcripts: string[] = [];
  const words: TimedWord[] = [];
  onProgress?.(0, parts.length);
  for (const [index, part] of parts.entries()) {
    const type = part.file.type || mimeType || blob.type;
    const ext = type.includes("wav") ? "wav" : type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData();
    fd.append("action", "transcribe_timed");
    fd.append("file", new File([part.file], `keep-voice-${index + 1}.${ext}`, { type }));
    if (prompt?.trim()) fd.append("prompt", prompt.trim().slice(0, 1200));
    const result = await post<{ transcript?: string; words?: TimedWord[] }>(fd, false);
    const localWords = (result.words ?? []).map(w => ({
      word: String(w.word ?? "").trim(), start: Number(w.start), end: Number(w.end),
    })).filter(w => w.word);
    // Reject collapsed provider timing rather than inventing uniform timestamps.
    // Uniform spreads were the source of captions drifting through long Keeps.
    const clipDuration = part.duration || Math.max(0, ...localWords.map(w => w.end));
    if (!reliableWordTimes(localWords, clipDuration)) {
      throw new Error("Captions couldn't be aligned to your voice. Retry sync before publishing.");
    }
    transcripts.push((result.transcript ?? "").trim());
    words.push(...localWords.map(w => ({ ...w,
      start: Number((w.start + part.offset).toFixed(3)),
      end: Number((w.end + part.offset).toFixed(3)),
    })));
    onProgress?.(index + 1, parts.length);
  }
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
