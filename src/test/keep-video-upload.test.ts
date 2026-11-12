import { expect, it } from "vitest";
import { checkKeepVideo, KEEP_VIDEO_MAX_BYTES, KEEP_VIDEO_MAX_SECONDS } from "@/lib/keep-video-upload";

it("accepts compact videos appropriate for personal Keeps", () => {
  expect(checkKeepVideo(7 * 1024 * 1024, 8)).toBeNull();
  expect(checkKeepVideo(KEEP_VIDEO_MAX_BYTES, 10)).toBeNull();
});
it("gives specific guidance when a video is too long or large", () => {
  expect(checkKeepVideo(8 * 1024 * 1024, KEEP_VIDEO_MAX_SECONDS + 0.1)).toMatch(/10 seconds/i);
  expect(checkKeepVideo(KEEP_VIDEO_MAX_BYTES + 1, 8)).toMatch(/40 MB/i);
  expect(checkKeepVideo(4 * 1024 * 1024, Number.NaN)).toMatch(/length/i);
});
