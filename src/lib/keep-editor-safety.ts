import type { KeepProject } from "./keep-project";
import { composeSelfieStory, withoutSelfieScenes } from "./keep-selfie-story";

/**
 * Media-grid positions and film-scene positions are different when a Keep has
 * text cards, intro/outro selfie video, or rearranged photos. Remove by stable
 * moment ID, never by an index from a different list.
 */
export function removeEditableMoment(project: KeepProject, id: string): KeepProject {
  if (!id) return project;
  const base = project.selfieBaseMedia?.length
    ? project.selfieBaseMedia
    : withoutSelfieScenes(project.memories);
  if (!base.some(moment => moment.id === id && !moment.isSelfie)) return project;
  const nextBase = base.filter(moment => moment.id !== id);
  const scenes = (project.selfieVideos ?? []).length
    ? composeSelfieStory(nextBase, project.selfieVideos ?? [],
      project.finalVoiceRecording?.durationSec ?? 150, project)
    : project.memories.filter(moment => moment.id !== id);
  return {
    ...project,
    selfieBaseMedia: nextBase,
    memories: scenes,
    readMemoryOrder: project.readMemoryOrder.filter(momentId => momentId !== id),
  };
}

/** True when a real voice already has a durable recording we must not overwrite
 * with a new take that failed to save to IndexedDB. */
export function shouldPreserveExistingVoice(
  previousVoiceAvailable: boolean, incomingStored: boolean,
): boolean {
  return previousVoiceAvailable && !incomingStored;
}

/** A caption editor must never save an out-of-range or zero-length phrase,
 * including when a user clears a numeric field on mobile Safari. */
export function clampCaptionRange(start: number, end: number, duration: number) {
  const total = Number.isFinite(duration) ? Math.max(0.2, duration) : 1;
  const nextStart = Number.isFinite(start) ? start : 0;
  const nextEnd = Number.isFinite(end) ? end : nextStart + 0.1;
  const clampedStart = Math.max(0, Math.min(total - 0.1, nextStart));
  return {
    start: clampedStart,
    end: Math.min(total, Math.max(clampedStart + 0.1, nextEnd)),
  };
}
