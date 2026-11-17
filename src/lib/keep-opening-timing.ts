import { KEEP_MUSIC_LEAD_SECONDS } from "./keep-audio";

/**
 * Gives recipients enough uninterrupted music to read their dedication,
 * instead of rushing narration after the old 2.8-second generic intro.
 * Unpersonalized editor previews retain the original shorter lead-in.
 */
export function keepOpeningLeadSeconds(openingMessage: string | undefined, cinematicOpening: boolean): number {
  if (!cinematicOpening) return KEEP_MUSIC_LEAD_SECONDS;
  const characters = (openingMessage ?? "").trim().length;
  return Math.min(14, Math.max(7.5, 5.5 + characters / 26));
}
