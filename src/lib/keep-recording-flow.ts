import { resumeKeepCreationStage, type KeepProject } from "@/lib/keep-project";

export function usesRemoteRecording(project: KeepProject): boolean {
  return project.voiceMode === "together" && project.voiceRecordingLocation === "remote";
}

export function hasSavedVoice(project: KeepProject): boolean {
  return !!project.finalVoiceRecording || (project.voiceParts ?? []).some(part => !!part.audioId);
}

/** Photo selection comes before the first local recording, never before an intentional retake. */
export function nextAfterMessage(project: KeepProject, returningToEditor: boolean): "memories" | "recordPrep" | "remoteInvite" {
  if (usesRemoteRecording(project)) return "remoteInvite";
  return returningToEditor || hasSavedVoice(project) ? "recordPrep" : "memories";
}

/** The suggestion is a guide, not a required minimum. Only offer the backup once they choose to continue. */
export function nextAfterMedia(project: KeepProject, momentCount: number, suggestedMinimum: number): "storyStyle" | "recordPrep" | "offerSelfie" {
  if (project.finalVoiceRecording || usesRemoteRecording(project)) return "storyStyle";
  if (hasSavedVoice(project)) return "recordPrep";
  return momentCount < Math.max(1, suggestedMinimum) ? "offerSelfie" : "recordPrep";
}

export function nextAfterVoice(project: KeepProject): "storyStyle" | "memories" {
  return project.recordingVisualMode ? "storyStyle" : "memories";
}

/** Uploaded photos are no longer proof that narration or story creation is finished. */
export function resumeKeepRecordingFlow(project: KeepProject, finalTouchesRequested = false): string {
  // Only saved, fully restored Keeps can enter final touches from checkout.
  if (finalTouchesRequested && project.publicationToken && !project.restoreIncomplete && project.finalVoiceRecording && project.memories.length) return "card";
  const stage = resumeKeepCreationStage(project.stage || "recipient");
  if(stage==="collaboration")return stage;
  if(project.voiceMode==="together"&&!project.messageParagraphs.length&&["path","interview","summary","write"].includes(stage))return "collaboration";
  if (stage === "memories" || stage === "framing" || stage === "storyStyle" || stage === "recorded" || stage === "remoteInvite") return stage;
  if (["recordPrep", "record", "groupRecord"].includes(stage) && !usesRemoteRecording(project)) {
    // Older unfinished voice-first drafts can now select visuals before recording.
    if (!project.recordingVisualMode && !hasSavedVoice(project)) return "memories";
    if (project.recordingVisualMode || !project.memories.length) return stage;
  }
  if (stage === "message" && !hasSavedVoice(project)) return stage;
  return project.memories.length ? "editor" : stage;
}
