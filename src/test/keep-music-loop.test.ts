import { describe, expect, it } from "vitest";
import { musicCrossfadeCurves, musicLoopPlan } from "@/lib/keep-music-loop";

describe("Keep soundtrack looping", () => {
  it("doesn't interrupt a Keep that finishes before the end of its soundtrack", () => {
    expect(musicLoopPlan(180, 155)).toBeNull();
    expect(musicLoopPlan(300, 190)).toBeNull();
  });
  it("crossfades three-minute tracks before their baked-in fade to silence", () => {
    expect(musicLoopPlan(180, 210)).toEqual({
      crossfadeStart: 164,
      crossfadeSeconds: 7,
      crossfadeEnd: 171,
      loopFrom: 8,
    });
  });
  it("supports Intentional's five-minute recording without unnecessary repetition", () => {
    expect(musicLoopPlan(300, 250)).toBeNull();
    expect(musicLoopPlan(300, 310)?.crossfadeStart).toBe(284);
  });
  it("uses matched equal-power crossfade curves for an even handoff", () => {
    const { outgoing, incoming } = musicCrossfadeCurves();
    expect(outgoing[0]).toBeCloseTo(1, 5);
    expect(incoming[0]).toBeCloseTo(0, 5);
    expect(outgoing[outgoing.length - 1]).toBeCloseTo(0, 5);
    expect(incoming[incoming.length - 1]).toBeCloseTo(1, 5);
    const mid = Math.floor(outgoing.length / 2);
    expect(outgoing[mid] ** 2 + incoming[mid] ** 2).toBeCloseTo(1, 4);
  });
  it("rejects missing or invalid metadata instead of guessing the boundary", () => {
    expect(musicLoopPlan(Number.NaN, 250)).toBeNull();
    expect(musicLoopPlan(Number.POSITIVE_INFINITY, 250)).toBeNull();
  });
});
