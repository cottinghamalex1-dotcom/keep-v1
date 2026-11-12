import { expect, it } from "vitest";
import { checkKeepVideo, KEEP_VIDEO_MAX_BYTES, KEEP_VIDEO_MAX_SECONDS, KEEP_VIDEO_RECOMMENDED_SECONDS } from "@/lib/keep-video-upload";

it("accepts compact videos appropriate for personal Keeps", () => {
  expect(checkKeepVideo(7 * 1024 * 1024, 8)).toBeNull();
  expect(checkKeepVideo(KEEP_VIDEO_MAX_BYTES, 10)).toBeNull();
  expect(checkKeepVideo(6 * 1024 * 1024, 35)).toBeNull();
  expect(KEEP_VIDEO_RECOMMENDED_SECONDS).toBe(10);
});
it("gives specific guidance when a video is too long or large", () => {
  expect(checkKeepVideo(8 * 1024 * 1024, KEEP_VIDEO_MAX_SECONDS + 1)).toMatch(/90 seconds/i);
  expect(checkKeepVideo(KEEP_VIDEO_MAX_BYTES + 1, 8)).toMatch(/40 MB/i);
  expect(checkKeepVideo(4 * 1024 * 1024, Number.NaN)).toMatch(/length/i);
});
