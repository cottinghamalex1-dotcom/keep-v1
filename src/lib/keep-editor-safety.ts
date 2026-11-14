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
  return { ...project, selfieBaseMedia: nextBase, memories: scenes };
}

/** True when a real voice already has a durable recording we must not overwrite
 * with a new take that failed to save to IndexedDB. */
export function shouldPreserveExistingVoice(
  previousVoiceAvailable: boolean, incomingStored: boolean,
): boolean {
  return previousVoiceAvailable && !incomingStored;
}
