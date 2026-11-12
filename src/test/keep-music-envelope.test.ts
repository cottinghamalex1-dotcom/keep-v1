import { expect, it } from "vitest";
import { KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, musicEnvelope } from "@/lib/keep-audio";

it("lets the music play for 2–3 seconds before voice, then ducks it gently", () => {
  const env = musicEnvelope(KEEP_MUSIC_LEAD_SECONDS, 55);
  expect(env.voiceStart).toBe(2.8);
  expect(env.introPeak).toBeGreaterThan(0.5);
  expect(env.introPeak).toBeLessThan(env.duckStart);
  expect(env.duckStart).toBeGreaterThan(2);
  expect(env.duckStart).toBeLessThan(env.voiceStart);
  expect(env.duckEnd).toBeGreaterThan(env.voiceStart);
  expect(env.duckEnd).toBeLessThan(env.voiceStart + 0.6);
});

it("restores the instrumental after the last word, then fades to silence", () => {
  const env = musicEnvelope(KEEP_MUSIC_LEAD_SECONDS, 55);
  expect(env.voiceEnd).toBeCloseTo(57.8, 3);
  expect(env.outroRise).toBeGreaterThan(env.voiceEnd);
  expect(env.outroRise).toBeLessThan(env.outroFadeStart);
  expect(env.outroEnd).toBe(env.voiceEnd + KEEP_MUSIC_TAIL_SECONDS);
  expect(env.outroEnd - env.voiceEnd).toBeGreaterThanOrEqual(4);
});

it("preserves configurable fade length without changing the narration start", () => {
  const fast = musicEnvelope(2.8, 55, 1, 1.2);
  const slow = musicEnvelope(2.8, 55, 4, 3.6);
  expect(fast.voiceStart).toBe(slow.voiceStart);
  expect(fast.introPeak).toBeLessThan(slow.introPeak);
  expect(fast.outroFadeStart).toBeGreaterThan(slow.outroFadeStart);
  expect(fast.outroEnd).toBe(slow.outroEnd);
});

it("supports the short, scrubbable editor bed without scheduling events backwards", () => {
  const env = musicEnvelope(0.8, 55);
  expect(env.introPeak).toBeLessThan(env.duckStart);
  expect(env.duckStart).toBeLessThan(env.duckEnd);
  expect(env.duckEnd).toBeLessThan(env.voiceEnd);
});
