/** A single narration clock controls both creator previews and recipient films. */
export type FilmMoment = {
  displayDurationSec?: number | undefined;
  motion?: "in" | "out" | "left" | "right" | undefined;
};

const clipSeconds = (item: FilmMoment) => {
  const seconds = item.displayDurationSec;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? Math.max(0.6, seconds) : 7;
};

export function filmTotal(media: readonly FilmMoment[]): number {
  return media.reduce((total, item) => total + clipSeconds(item), 0);
}

/** Rescale authored scene lengths to the true voice duration, when available. */
const ratio = (media: readonly FilmMoment[], duration?: number) => {
  const total = filmTotal(media);
  return total > 0 && duration && Number.isFinite(duration) && duration > 0 ? duration / total : 1;
};

export function sceneDuration(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  return clipSeconds(media[Math.max(0, Math.min(index, media.length - 1))]!) * ratio(media, duration);
}

export function sceneBoundary(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  const count = Math.max(0, Math.min(index + 1, media.length));
  return media.slice(0, count).reduce((sum, item) => sum + clipSeconds(item), 0) * ratio(media, duration);
}

/** Begin at the exact narration-scaled boundary, not the raw photo duration.
 * A tiny inset protects floating-point rounding at the boundary on Safari. */
export function sceneSeekTime(media: readonly FilmMoment[], index: number, duration?: number): number {
  if (!media.length) return 0;
  const safeIndex = Math.max(0, Math.min(media.length - 1, Math.trunc(index)));
  if (safeIndex === 0) return 0;
  const start = sceneBoundary(media, safeIndex - 1, duration);
  const length = sceneDuration(media, safeIndex, duration);
  return start + Math.min(0.04, length * 0.2);
}

/** Elapsed time within the selected scene, in the narration clock. */
export function sceneElapsed(media: readonly FilmMoment[], index: number, time: number, duration?: number): number {
  const start = index > 0 ? sceneBoundary(media, index - 1, duration) : 0;
  const maxDuration = sceneDuration(media, index, duration);
  return Math.max(0, Math.min(maxDuration, time - start));
}

export function sceneIndexAt(media: readonly FilmMoment[], time: number, duration?: number): number {
  if (!media.length) return 0;
  const effectiveTime = Math.max(0, Number.isFinite(time) ? time : 0);
  if (effectiveTime >= sceneBoundary(media, media.length - 1, duration)) return media.length - 1;
  for (let i = 0; i < media.length; i++) {
    if (effectiveTime < sceneBoundary(media, i, duration)) return i;
  }
  return media.length - 1;
}

/** Deterministic, quiet variety — never randomize a film between replays. */
const defaultMotions = ["in", "left", "out", "right", "in", "right", "out", "left"] as const;
export function defaultMotionAt(index: number): (typeof defaultMotions)[number] {
  return defaultMotions[Math.abs(Math.floor(index)) % defaultMotions.length]!;
}

export function motionFor(item: FilmMoment, index: number) {
  return item.motion ?? defaultMotionAt(index);
}
