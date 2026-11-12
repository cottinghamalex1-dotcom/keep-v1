/** Keep's preferred spoken length is a flexible guideline, never a limit. */
export const KEEP_WORDS_PER_MINUTE = 140;
export const KEEP_TARGET_MIN_WORDS = 280;
export const KEEP_TARGET_MAX_WORDS = 420;

export function countKeepWords(text: string): number {
  return (text.trim().match(/\S+/gu) ?? []).length;
}

export function estimateKeepSeconds(wordCount: number): number {
  return Math.round(Math.max(0, wordCount) * 60 / KEEP_WORDS_PER_MINUTE);
}

export function formatKeepTime(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function getKeepLengthFeedback(wordCount: number): string {
  if (!wordCount) return "Start with what matters most. There is no required length.";
  if (wordCount < KEEP_TARGET_MIN_WORDS) return "A shorter Keep can be just as meaningful. Add a memory or two if you'd like.";
  if (wordCount > KEEP_TARGET_MAX_WORDS) return "A little longer than the sweet spot. Trim if you'd like—or keep every word.";
  return "Right in the sweet spot for a two-to-three-minute Keep.";
}
