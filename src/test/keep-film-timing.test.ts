import { expect, it } from "vitest";
import { defaultMotionAt, filmTotal, motionFor, sceneBoundary, sceneDuration, sceneIndexAt } from "@/lib/keep-film-timing";
import { spreadMemories } from "@/lib/keep-story-layout";
import type { MediaItem } from "@/lib/keep-project";

it("ties every photo boundary to narration time instead of independent clip timers", () => {
  const media = [{ displayDurationSec: 4 }, { displayDurationSec: 6 }, { displayDurationSec: 2 }];
  expect(filmTotal(media)).toBe(12);
  expect(sceneDuration(media, 0, 24)).toBe(8);
  expect(sceneDuration(media, 1, 24)).toBe(12);
  expect(sceneBoundary(media, 1, 24)).toBe(20);
  expect(sceneIndexAt(media, 0, 24)).toBe(0);
  expect(sceneIndexAt(media, 7.99, 24)).toBe(0);
  expect(sceneIndexAt(media, 8, 24)).toBe(1);
  expect(sceneIndexAt(media, 19.99, 24)).toBe(1);
  expect(sceneIndexAt(media, 20, 24)).toBe(2);
  expect(sceneIndexAt(media, 24, 24)).toBe(2);
  expect(sceneIndexAt(media, 100, 24)).toBe(2);
});

it("cycles subtle default movement without overriding creators' motion choices", () => {
  expect([0,1,2,3,4,5,6,7].map(defaultMotionAt))
    .toEqual(["in", "left", "out", "right", "in", "right", "out", "left"]);
  expect(motionFor({}, 3)).toBe("right");
  expect(motionFor({ motion: "out" }, 3)).toBe("out");
});

it("assigns varied motion to new photos and retains manually selected transitions", () => {
  const source: MediaItem[] = ["a", "b", "c", "d"].map((url, index) => ({
    id: url, url, kind: "image" as const, source: "upload" as const,
    ...(index === 1 ? { motion: "right" as const, transition: "cut" as const } : {}),
  }));
  const output = spreadMemories(source, 20);
  expect(output.map((m) => m.motion)).toEqual(["in", "right", "out", "right"]);
  expect(output.map((m) => m.displayDurationSec)).toEqual([5,5,5,5]);
  expect(output[1]!.transition).toBe("cut");
  expect(source[0]!.motion).toBeUndefined();
});
