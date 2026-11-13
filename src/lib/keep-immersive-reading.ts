import type { CaptionCue } from "@/lib/keep-project";
import { recoverCaptionTiming } from "@/lib/keep-caption-timing";

export type ReadingFrame = { start: number; end: number; text: string };

/** Short time-aligned reading moments rather than a transcript to scroll. */
export function makeReadingFrames(
  cues: CaptionCue[],
  paragraphs: string[],
  duration: number,
): ReadingFrame[] {
  const seconds = Math.max(1, Number.isFinite(duration) ? duration : 150);
  const corrected = recoverCaptionTiming([], cues, seconds).cues
    .filter(c => c.text?.trim() && Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start);
  if (corrected.length > 0) {
    const groups: ReadingFrame[] = [];
    let text = "";
    let start = corrected[0]!.start;
    let count = 0;
    for (let i=0; i<corrected.length; i++) {
      const cue = corrected[i]!;
      const piece = cue.text.trim();
      if (!text) start = cue.start;
      text = text ? text + " " + piece : piece;
      count += piece.split(/\s+/u).length;
      const next = corrected[i+1];
      // Stay within roughly 3–4 lines on a phone; use real caption
      // timestamps to turn each set of spoken phrases into one moment.
      if (count >= 12 || !next || count >= 9 && next.text.split(/\s+/u).length > 5) {
        groups.push({ start: Math.max(0,start), end: next ? Math.max(cue.end,next.start) : Math.min(seconds,cue.end), text });
        text = "";
        count = 0;
      }
    }
    return groups;
  }
  // A published legacy Keep may not have usable per-word timings.
  // Preserve its full message as a readable, honestly estimated fallback.
  const words = paragraphs.join(" ").trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return [];
  const grouped: string[] = [];
  for (let i=0; i<words.length; i+=14) grouped.push(words.slice(i,i+14).join(" "));
  return grouped.map((text,i)=>({ text,start:i*seconds/grouped.length,end:(i+1)*seconds/grouped.length }));
}
export function frameAtTime(frames: ReadingFrame[], time: number): number {
  if (!frames.length) return -1;
  for (let i=frames.length-1;i>=0;i--) if (time + 0.04 >= frames[i]!.start) return i;
  return 0;
}
