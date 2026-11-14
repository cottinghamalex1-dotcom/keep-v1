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


it("detects a short phrase stretched across 13 seconds in a 98-second Keep", () => {
  // Representative timing shape only; sample text is synthetic.
  const cues: CaptionCue[] = [
    { text: "One", start: 1.87, end: 2.50 },
    { text: "A lovely day together", start: 6.41, end: 7.46 },
    { text: "We made a new memory today", start: 9.07, end: 22.52 },
    { text: "It was a wonderful afternoon", start: 23.03, end: 29.98 },
    ...Array.from({ length: 48 }, (_, i) => ({
      text: "Another moment worth remembering together",
      start: 30 + i * 1.4,
      end: 31.2 + i * 1.4,
    })),
  ];
  expect(captionTimingIsBroken([], cues, 98.41)).toBe(true);
  const repaired = recoverCaptionTiming([], cues, 98.41);
  expect(repaired.repaired).toBe(true);
  expect(repaired.cues.map(c => c.text)).toEqual(cues.map(c => c.text));
  // Preserve healthy provider anchors rather than shifting all later captions.
  expect(repaired.cues[0]!.start).toBeCloseTo(1.87, 2);
  expect(repaired.cues[4]!.start).toBeCloseTo(30, 2);
  expect(repaired.cues.at(-1)!.end).toBeCloseTo(97, 2);
  expect(repaired.cues[2]!.end - repaired.cues[2]!.start).toBeLessThan(9.1);
  for (let i = 0; i < repaired.cues.length; i++) {
    const cue = repaired.cues[i]!;
    expect(cue.end).toBeGreaterThan(cue.start);
    expect(captionAtTime(repaired.cues, cue.start + 0.05, 98.41)?.text).toBe(cue.text);
  }
  expect(recoverCaptionTiming([], repaired.cues, 98.41).repaired).toBe(false);
});

it("does not reveal words before speech and clears captions in long pauses", () => {
  const cues: CaptionCue[] = [
    {text:"First spoken phrase",start:2,end:3},
    {text:"Second spoken phrase",start:8,end:9},
  ];
  expect(captionAtTime(cues,0,10)).toBeUndefined();
  expect(captionAtTime(cues,1.98,10)).toBeUndefined();
  expect(captionAtTime(cues,2.1,10)?.text).toBe("First spoken phrase");
  expect(captionAtTime(cues,3.3,10)?.text).toBe("First spoken phrase");
  expect(captionAtTime(cues,5,10)).toBeUndefined();
  expect(captionAtTime(cues,7.99,10)).toBeUndefined();
  expect(captionAtTime(cues,8.4,10)?.text).toBe("Second spoken phrase");
  expect(captionAtTime(cues,9.3,10)?.text).toBe("Second spoken phrase");
  expect(captionAtTime(cues,9.8,10)).toBeUndefined();
  expect(captionAtTime(cues,10.5,10)).toBeUndefined();
  expect(captionAtTime(cues,10.5)).toBeUndefined();
});
