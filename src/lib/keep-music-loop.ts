import { musicLoopPlan } from "../../supabase/functions/keep-render/composition";
export { musicLoopPlan, MUSIC_CROSSFADE_SECONDS, MUSIC_OUTRO_SKIP_SECONDS, MUSIC_REENTRY_SECONDS } from "../../supabase/functions/keep-render/composition";
export type { MusicLoopPlan } from "../../supabase/functions/keep-render/composition";
/** Keep one music decoder running for short Keeps. A secondary silent
 * decoder is only needed when the soundtrack may actually have to loop. */
export function shouldPrepareMusicLoop(keepSeconds: number, trackSeconds?: number): boolean {
  if (!Number.isFinite(keepSeconds) || keepSeconds <= 0) return false;
  if (trackSeconds && Number.isFinite(trackSeconds) && trackSeconds > 0) {
    return musicLoopPlan(trackSeconds, keepSeconds) !== null;
  }
  // Before metadata arrives, prefer one decoder for a typical short Keep.
  // The bundled non-Intentional tracks are approximately three minutes long.
  return keepSeconds > 155;
}

export function musicCrossfadeCurves(steps = 64): { outgoing: Float32Array; incoming: Float32Array } {
  const length = Math.max(2, Math.round(steps));
  const outgoing = new Float32Array(length);
  const incoming = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const position = i / (length - 1);
    outgoing[i] = Math.cos(position * Math.PI / 2);
    incoming[i] = Math.sin(position * Math.PI / 2);
  }
  return { outgoing, incoming };
}
