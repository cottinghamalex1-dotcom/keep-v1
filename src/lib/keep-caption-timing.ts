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
  // Silence between phrases is not, on its own, an invalid timestamp.
  // The player keeps the prior phrase visible until the next one starts.

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

  const safeDuration = Math.max(0.5, duration);
  const tinyWords = words.length ? words.filter(w => !valid(w.start) || !valid(w.end) || w.end - w.start <= 0.045).length / words.length : 0;
  const repeatedWords = words.length > 1 ? words.slice(1).filter((w,i) => Math.abs(w.start - words[i]!.start) < 0.03).length / (words.length - 1) : 0;
  const tinyCues = cues.filter(c => c.end - c.start < 0.18).length;
  const reversedCues = cues.slice(1).some((cue,i) => cue.start + 0.05 < cues[i]!.start);
  const invalidCues = cues.some(c => !valid(c.start) || !valid(c.end) || c.end <= c.start || c.end > duration + 2);
  const fullyCollapsed = tinyWords > 0.22 || repeatedWords > 0.19 ||
    tinyCues >= Math.max(3, Math.ceil(cues.length * 0.24)) || reversedCues || invalidCues;

  // For a widespread collapse of provider timestamps there are no trustworthy
  // anchors left. Spread the existing words across the voice recording.
  if (fullyCollapsed) {
    const correctedWords = spreadByWords(words, safeDuration, w => w.word, (w, start, end) => ({ ...w, start, end }));
    const correctedCues = spreadByWords(cues, safeDuration, c => c.text, (c, start, end) => ({ ...c, start, end }));
    return { words: correctedWords, cues: correctedCues, repaired: true };
  }

  // A few abnormally long phrases are a different failure: most timestamps
  // remain credible. Keep their exact starts and all later good alignment.
  // Never globally re-time an entire Keep because one phrase stretched.
  const correctedCues = cues.map(c => {
    const start = Math.max(0, Math.min(safeDuration - 0.08, c.start));
    const maxSpan = Math.max(7, spokenWords(c.text) * 1.25 + 1.5);
    const end = Math.min(safeDuration, Math.max(start + 0.08, Math.min(c.end, start + maxSpan - 0.03)));
    return { ...c, start, end };
  });
  const correctedWords = words.map(w => {
    const start = Math.max(0, Math.min(safeDuration - 0.08, w.start));
    const end = Math.min(safeDuration, Math.max(start + 0.08, Math.min(w.end, start + 2.5)));
    return { ...w, start, end };
  });
  return { words: correctedWords, cues: correctedCues, repaired: true };
}

/** Follow the true narration clock. A caption must never anticipate speech or
 * linger across a long pause: only brief gaps get a graceful 0.65s hold. */
export function captionAtTime(cues: CaptionCue[], time: number, narrationDuration?: number): CaptionCue | undefined {
  if(!cues.length||!Number.isFinite(time)||time<0)return undefined;
  if(narrationDuration && Number.isFinite(narrationDuration) && time>narrationDuration+0.05)return undefined;
  const first=cues[0]!;
  if(time+0.015<first.start)return undefined;
  for(let i=cues.length-1;i>=0;i--){
    const cue=cues[i]!;
    if(time+0.015<cue.start)continue;
    // Prefer the newest phrase when the timestamp provider overlaps words.
    if(time<=cue.end+0.08)return cue;
    // Leave a tiny post-phrase hold so natural breaths do not flash blank.
    return time<=cue.end+0.65?cue:undefined;
  }
  return undefined;
}
