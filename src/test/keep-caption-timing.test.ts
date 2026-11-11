import { expect, it } from "vitest";
import { captionAtTime, captionTimingIsBroken, recoverCaptionTiming } from "@/lib/keep-caption-timing";
import type { CaptionCue, CaptionWord } from "@/lib/keep-project";

it("repairs a 55-second recording whose word timestamps collapse near 30 seconds", () => {
  const words: CaptionWord[] = Array.from({ length: 88 }, (_, i) => {
    const start = i < 12 ? 17.28 + i * 0.22 : i < 46 ? 29.93 : 34.9 + (i - 46) * 0.43;
    return { word: `word${i}`, start, end: i >= 12 && i < 46 ? start : start + 0.25 };
  });
  const cues: CaptionCue[] = Array.from({ length: 18 }, (_, i) => ({
    text: `Phrase number ${i + 1}`,
    start: i === 0 ? 17.23 : i < 8 ? 29.93 : 34.9 + (i - 8) * 1.9,
    end: i === 0 ? 29.64 : i < 8 ? 30.14 : 36.4 + (i - 8) * 1.9,
  }));
  expect(captionTimingIsBroken(words, cues, 54.662)).toBe(true);
  const result = recoverCaptionTiming(words, cues, 54.662);
  expect(result.repaired).toBe(true);
  expect(result.cues).toHaveLength(18);
  expect(result.words).toHaveLength(88);
  expect(result.cues.map((c) => c.text)).toEqual(cues.map((c) => c.text));
  expect(result.words.map((w) => w.word)).toEqual(words.map((w) => w.word));
  expect(result.cues[0]!.start).toBeLessThan(0.2);
  expect(result.cues.at(-1)!.end).toBeCloseTo(54.662, 2);
  expect(result.cues.every((cue, index) => cue.end > cue.start && (index === 0 || cue.start >= result.cues[index - 1]!.start))).toBe(true);
  expect(result.words.every((word) => word.end > word.start)).toBe(true);
  expect(captionAtTime(result.cues, 0.4)).toBeDefined();
  expect(captionAtTime(result.cues, 30)).toBeDefined();
  expect(captionAtTime(result.cues, 50)).toBeDefined();
  expect(recoverCaptionTiming(result.words, result.cues, 54.662).repaired).toBe(false);
});

it("preserves correct timestamps and any creator-edited words", () => {
  const words = Array.from({ length: 12 }, (_, i) => ({ word: `w${i}`, start: i * 0.45, end: i * 0.45 + 0.3 }));
  const cues: CaptionCue[] = [
    { text: "I changed this line.", start: 0, end: 2.3 },
    { text: "Keep these edits.", start: 2.4, end: 5.5 },
  ];
  const result = recoverCaptionTiming(words, cues, 5.8);
  expect(result.repaired).toBe(false);
  expect(result.cues).toBe(cues);
  expect(result.words).toBe(words);
});

it("prefers the newest cue during a short transition overlap", () => {
  const cues = [{ text: "first", start: 0, end: 2.2 }, { text: "second", start: 2, end: 4 }];
  expect(captionAtTime(cues, 2.1)?.text).toBe("second");
  expect(captionAtTime(cues, 4.5)).toBeUndefined();
});
