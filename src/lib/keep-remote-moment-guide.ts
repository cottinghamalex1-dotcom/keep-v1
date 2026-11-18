import { estimateKeepSeconds } from "./keep-length";
import { REMOTE_MEDIA_LIMIT } from "./keep-remote-media-prep";

/** Divide the creator's narration-based moment recommendation across active speakers. */
export function remoteMomentGuide(totalWordCount:number, contributorCount:number) {
  const people=Math.max(1,Math.floor(Number.isFinite(contributorCount)?contributorCount:1));
  const seconds=estimateKeepSeconds(Math.max(0,Number.isFinite(totalWordCount)?totalWordCount:0));
  // Match the creator's suggested-moments calculation (one moment per 3–5s).
  // Fallback for a Keep whose total script is not yet available.
  const totalMin=seconds>0?Math.ceil(seconds/5):30;
  const totalMax=seconds>0?Math.ceil(seconds/3):45;
  return {
    people,totalMin,totalMax,
    min:Math.min(REMOTE_MEDIA_LIMIT,Math.ceil(totalMin/people)),
    max:Math.min(REMOTE_MEDIA_LIMIT,Math.ceil(totalMax/people)),
  };
}
