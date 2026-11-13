import type { CaptionCue, CaptionWord } from "./keep-project";

/**
 * The timestamp transcription provider can occasionally return batches of words
 * with zero durations or identical timestamps. Those cues disappear or pile up
 * in the player even though the narration and transcription are preserved.
 */
const valid = (n: number) => Number.isFinite(n) && n >= 0;
/** Spoken word count is a better timing weight than character count.
 * In particular, a one-word caption must not last as long as a six-word phrase. */
const spokenWords = (text: string) => (text.trim().match(/\S+/gu) ?? []).length;
const weight = (text: string) => Math.max(0.7, spokenWords(text)) + (/[.!?]$/.test(text.trim()) ? 0.2 : 0);

export function captionTimingIsBroken(words: CaptionWord[], cues: CaptionCue[], duration: number): boolean {
  if (!valid(duration) || duration <= 0 || !cues.length) return false;
  if (cues.some((cue) => !valid(cue.start) || !valid(cue.end) || cue.end <= cue.start || cue.end > duration + 2)) return true;
  // Some timestamp providers assign a handful of words to 10–15 seconds,
  // while all their values remain finite and technically in range. These are
  // broken timings, not deliberate slow narration.
  const stretched = cues.some((cue) => cue.end - cue.start > Math.max(7, spokenWords(cue.text) * 1.25 + 1.5));
  if (stretched) return true;
  const reversed = cues.slice(1).some((cue, index) => cue.start + 0.05 < cues[index]!.start);
  if (reversed) return true;
  const deadTime = cues.reduce((gap, cue, index) => gap + Math.max(0, cue.start - (index ? cues[index-1]!.end : 0)), 0);
  if (deadTime > Math.max(10, duration * 0.13)) return true;

  const tinyCues = cues.filter((cue) => cue.end - cue.start < 0.18).length;
  const delay = cues[0]!.start;
  const largeGap = cues.slice(1).some((cue, index) => cue.start - cues[index]!.end > Math.max(3, duration * 0.07));
  if (tinyCues >= Math.max(3, Math.ceil(cues.length * 0.24))) return true;

  if (words.length >= 10) {
    const tinyWords = words.filter((word) => !valid(word.start) || !valid(word.end) || word.end - word.start <= 0.045).length;
    const repeated = words.slice(1).filter((word, i) => Math.abs(word.start - words[i]!.start) < 0.03).length;
    const badWords = tinyWords / words.length > 0.22 || repeated / words.length > 0.19;
    if (badWords) return true;
    if (delay > Math.max(6, duration * 0.23) && largeGap) return true;
  }
  // An implausibly late first caption with a full-length spoken transcript.
  return delay > Math.max(10, duration * 0.3) && cues.length > 3;
}

function spreadByWords<T>(values: T[], duration: number, content: (item: T) => string, range: (item: T, start: number, end: number) => T): T[] {
  if (!values.length) return [];
  const usable = Math.max(0.3, duration - 0.1);
  const weights = values.map((v) => weight(content(v)));
  const total = weights.reduce((sum, n) => sum + n, 0) || 1;
  let offset = 0;
  return values.map((item, i) => {
    const start = Math.min(usable, offset / total * usable);
    offset += weights[i]!;
    const end = i === values.length - 1 ? duration : Math.min(duration, offset / total * usable + 0.1);
    return range(item, Math.max(0, Number(start.toFixed(3))), Math.max(start + 0.08, Number(end.toFixed(3))));
  });
}

export function recoverCaptionTiming(
  words: CaptionWord[],
  cues: CaptionCue[],
  duration: number,
): { words: CaptionWord[]; cues: CaptionCue[]; repaired: boolean } {
  if (!captionTimingIsBroken(words, cues, duration)) return { words, cues, repaired: false };

  // Preserve original caption wording (including any creator edits) and audio.
  // Timing is estimated across the known recording duration, not claimed to
  // be word-accurate; the editor still supports individual timing adjustment.
  const safeDuration = Math.max(0.5, duration);
  const correctedWords = spreadByWords(words, safeDuration, (w) => w.word, (w, start, end) => ({ ...w, start, end }));
  const correctedCues = spreadByWords(cues, safeDuration, (c) => c.text, (c, start, end) => ({ ...c, start, end }));
  return { words: correctedWords, cues: correctedCues, repaired: true };
}

/** Keep one caption visible through any small silence between phrases.
 * The playing narration controls when to start/end displaying captions. */
export function captionAtTime(cues: CaptionCue[], time: number): CaptionCue | undefined {
  if (!cues.length || !Number.isFinite(time) || time < 0) return undefined;
  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i]!;
    if (time + 0.015 >= cue.start && time <= cue.end + 0.08) return cue;
  }
  // Hold the preceding caption until the next phrase instead of flashing blank.
  // Before the first timestamp, show the first phrase once narration starts.
  for (let i = cues.length - 1; i >= 0; i--) {
    if (cues[i]!.start <= time + 0.015) return cues[i];
  }
  return cues[0];
}
