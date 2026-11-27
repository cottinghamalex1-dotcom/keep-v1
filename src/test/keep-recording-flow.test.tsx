import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepSelfieBackup } from "@/components/keep-selfie-backup";
import { KeepMomentsUploader } from "@/components/keep-moments-uploader";
import { hasSavedVoice, nextAfterMessage, nextAfterMedia, nextAfterVoice, resumeKeepRecordingFlow } from "@/lib/keep-recording-flow";
import { newProject, type KeepProject } from "@/lib/keep-project";

const photo = { id: "photo", kind: "image" as const, source: "upload" as const, url: "/photo.jpg" };
const voice = { audioId: "voice", audioUrl: "/voice.webm", durationSec: 60, demo: false };
const draft = (patch: Partial<KeepProject> = {}): KeepProject => ({ ...newProject(), active: true, messageParagraphs: ["Happy birthday!"], ...patch });

afterEach(cleanup);

describe("Photo-first recording flow", () => {
  it("collects photos after the script before the first solo or in-person group take", () => {
    expect(nextAfterMessage(draft(), false)).toBe("memories");
    expect(nextAfterMessage(draft({ voiceMode: "together" }), false)).toBe("memories");
  });
  it("only offers the backup for fewer than the suggested minimum", () => {
    expect(nextAfterMedia(draft(), 0, 0)).toBe("offerSelfie");
    expect(nextAfterMedia(draft(), 5, 12)).toBe("offerSelfie");
    expect(nextAfterMedia(draft(), 12, 12)).toBe("recordPrep");
    expect(nextAfterMedia(draft(), 30, 12)).toBe("recordPrep");
  });
  it("does not ask to record again when someone already has a narration", () => {
    const recorded = draft({ finalVoiceRecording: voice, memories: [photo] });
    expect(nextAfterMedia(recorded, 0, 12)).toBe("storyStyle");
    expect(nextAfterVoice(recorded)).toBe("memories");
    expect(nextAfterVoice({ ...recorded, recordingVisualMode: "photos" })).toBe("storyStyle");
    expect(nextAfterVoice({ ...recorded, recordingVisualMode: "selfie" })).toBe("storyStyle");
  });
  it("preserves editing and remote collaboration", () => {
    expect(nextAfterMessage(draft(), true)).toBe("recordPrep");
    const remote = draft({ voiceMode: "together", voiceRecordingLocation: "remote" });
    expect(nextAfterMessage(remote, false)).toBe("remoteInvite");
    expect(nextAfterMedia(remote, 0, 12)).toBe("storyStyle");
  });
  it("does not jump into the editor after uploading photos before recording", () => {
    expect(resumeKeepRecordingFlow(draft({ stage: "memories", memories: [photo] }))).toBe("memories");
    expect(resumeKeepRecordingFlow(draft({ stage: "message", memories: [photo] }))).toBe("message");
    expect(resumeKeepRecordingFlow(draft({ stage: "recordPrep", memories: [photo], recordingVisualMode: "selfie" }))).toBe("recordPrep");
    expect(resumeKeepRecordingFlow(draft({ stage: "record", memories: [photo], recordingVisualMode: "photos" }))).toBe("record");
    expect(resumeKeepRecordingFlow(draft({ stage: "recorded", memories: [photo], finalVoiceRecording: voice, recordingVisualMode: "photos" }))).toBe("recorded");
    expect(resumeKeepRecordingFlow(draft({ stage: "editor", memories: [photo], finalVoiceRecording: voice }))).toBe("editor");
  });
  it("moves older, not-yet-recorded drafts to photo selection but preserves saved group parts", () => {
    expect(resumeKeepRecordingFlow(draft({ stage: "record" }))).toBe("memories");
    const partial = draft({ stage: "groupRecord", voiceMode: "together", voiceParts: [{
      paragraphIndex: 0, contributorId: "one", textFingerprint: "Happy birthday!", audioId: "part", durationSec: 3,
    }] });
    expect(hasSavedVoice(partial)).toBe(true);
    expect(resumeKeepRecordingFlow(partial)).toBe("groupRecord");
    expect(nextAfterMedia(partial, 0, 12)).toBe("recordPrep");
  });
});

describe("Optional camera backup", () => {
  it("keeps the initial upload page free from camera choices", () => {
    const actions = { onClose: vi.fn(), onVoice: vi.fn(), onSelfie: vi.fn() };
    const upload = vi.fn();
    render(<><KeepMomentsUploader moments={[]} busy={false} onAdd={vi.fn()} onRemove={vi.fn()} onContinue={upload} continueLabel="Continue to recording" />
      <KeepSelfieBackup open={false} momentCount={0} {...actions} /></>);
    expect(screen.queryByRole("button", { name: "Record my message on camera" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to recording" }));
    expect(upload).toHaveBeenCalledOnce();
  });
  it("offers voice first and captures face and voice as a single optional take", () => {
    const actions = { onClose: vi.fn(), onVoice: vi.fn(), onSelfie: vi.fn() };
    render(<KeepSelfieBackup open momentCount={2} {...actions} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/capturing your face and voice in the same take/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue with my moments" }));
    fireEvent.click(screen.getByRole("button", { name: "Record my message on camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to photos & videos" }));
    expect(actions.onVoice).toHaveBeenCalledOnce();
    expect(actions.onSelfie).toHaveBeenCalledOnce();
    expect(actions.onClose).toHaveBeenCalledOnce();
  });
});
