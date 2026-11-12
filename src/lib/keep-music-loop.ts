/**
 * Full-length Keep soundtracks contain musical outros, many of which fade to
 * silence during the final seconds. Crossfade *before* that outro into the
 * established body of the same track. Voice/music ducking and the actual Keep
 * end fade are intentionally handled by musicEnvelope, not this loop.
 */
export const MUSIC_CROSSFADE_SECONDS = 7;
export const MUSIC_OUTRO_SKIP_SECONDS = 9;
export const MUSIC_REENTRY_SECONDS = 8;

export type MusicLoopPlan = {
  crossfadeStart: number;
  crossfadeSeconds: number;
  loopFrom: number;
  crossfadeEnd: number;
};

export function musicLoopPlan(trackSeconds: number, keepSeconds: number): MusicLoopPlan | null {
  if (!Number.isFinite(trackSeconds) || trackSeconds < 40 || !Number.isFinite(keepSeconds)) return null;
  const crossfadeEnd = trackSeconds - MUSIC_OUTRO_SKIP_SECONDS;
  if (keepSeconds <= crossfadeEnd) return null;
  const crossfadeStart = crossfadeEnd - MUSIC_CROSSFADE_SECONDS;
  return {
    crossfadeStart,
    crossfadeSeconds: MUSIC_CROSSFADE_SECONDS,
    loopFrom: MUSIC_REENTRY_SECONDS,
    crossfadeEnd,
  };
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
