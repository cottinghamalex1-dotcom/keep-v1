import { expect, it } from "vitest";
import { countKeepWords, estimateKeepSeconds, formatKeepTime, getKeepLengthFeedback, KEEP_TARGET_MIN_WORDS, KEEP_TARGET_MAX_WORDS } from "@/lib/keep-length";

it("keeps the natural writing target in the two-to-three-minute window", () => {
  expect(KEEP_TARGET_MIN_WORDS).toBe(280);
  expect(KEEP_TARGET_MAX_WORDS).toBe(420);
  expect(formatKeepTime(estimateKeepSeconds(280))).toBe("2:00");
  expect(formatKeepTime(estimateKeepSeconds(420))).toBe("3:00");
  expect(formatKeepTime(estimateKeepSeconds(350))).toBe("2:30");
});

it("counts words across multiline uploaded and edited text", () => {
  expect(countKeepWords("   Hey, Hannah.\n\nI love you   so much. ")).toBe(7);
  expect(countKeepWords("")).toBe(0);
  expect(countKeepWords("   \n\t  ")).toBe(0);
});

it("provides gentle guidance, never blocks out-of-range messages", () => {
  expect(getKeepLengthFeedback(0)).toMatch(/no required length/i);
  expect(getKeepLengthFeedback(180)).toMatch(/shorter Keep/i);
  expect(getKeepLengthFeedback(350)).toMatch(/sweet spot/i);
  expect(getKeepLengthFeedback(450)).toMatch(/longer/i);
});
