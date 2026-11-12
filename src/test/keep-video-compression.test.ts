import { expect, it } from "vitest";
import { keepCompressedSizeText, shouldCompressKeepVideo } from "@/lib/keep-video-compression";
it("compresses large files automatically while skipping tiny clips", () => {
  expect(shouldCompressKeepVideo(8 * 1024 * 1024)).toBe(true);
  expect(shouldCompressKeepVideo(3 * 1024 * 1024)).toBe(false);
  expect(shouldCompressKeepVideo(0)).toBe(false);
});
it("only claims a reduction when output is actually smaller", () => {
  expect(keepCompressedSizeText(100, 40)).toBe("60% smaller");
  expect(keepCompressedSizeText(100, 110)).toBe("Using original video");
});
