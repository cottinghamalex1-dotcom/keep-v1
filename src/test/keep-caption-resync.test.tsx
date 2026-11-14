import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepCaptionEditor } from "@/components/keep-caption-editor";
import type { CaptionCue } from "@/lib/keep-project";

const cues: CaptionCue[] = [{ text: "The words we share", start: 0.1, end: 2.4 }];
const callbacks = () => ({
  onClose: vi.fn(),
  onSeek: vi.fn(),
  onChangeCaption: vi.fn(),
  onChangeCaptionTime: vi.fn(),
  onChangeStyle: vi.fn(),
  onChangePosition: vi.fn(),
  onChangeLines: vi.fn(),
  onRegroup: vi.fn(),
  onRestore: vi.fn(),
  onRetrySync: vi.fn(),
  onResync: vi.fn(),
  onPreviewSync: vi.fn(),
});
const editor = (cb: ReturnType<typeof callbacks>, options: { cues?: CaptionCue[]; syncing?: boolean; syncError?: boolean; hasVoice?: boolean; timingEstimated?: boolean } = {}) =>
  <KeepCaptionEditor
    cues={options.cues ?? cues} time={0} style="Clean" position="bottom" maxLines={2} wordsPerCue={5}
    syncing={options.syncing ?? false} syncError={options.syncError ?? false}
    timingEstimated={options.timingEstimated ?? false} hasVoice={options.hasVoice ?? true}
    canRestore={true} {...cb}
  />;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("caption-to-voice synchronization controls", () => {
  it("always offers a true re-sync and a preview for a completed recording", () => {
    const cb = callbacks();
    render(editor(cb));
    expect(screen.getByRole("status")).toHaveTextContent("Captions aligned to your voice");
    fireEvent.click(screen.getByRole("button", { name: "Re-sync captions to voice" }));
    expect(cb.onResync).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(cb.onPreviewSync).toHaveBeenCalledOnce();
  });
  it("retries initial or failed caption sync when no cues are present", () => {
    const cb = callbacks();
    render(editor(cb, { cues: [], syncError: true }));
    expect(screen.getByRole("status")).toHaveTextContent("Caption sync needs attention");
    fireEvent.click(screen.getByRole("button", { name: "Re-sync captions to voice" }));
    expect(cb.onRetrySync).toHaveBeenCalledOnce();
    expect(cb.onResync).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Preview" })).not.toBeInTheDocument();
  });
  it("disables duplicate requests while syncing", () => {
    const cb = callbacks();
    render(editor(cb, { syncing: true }));
    expect(screen.getByRole("button", { name: "Syncing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Re-aligning captions");
  });
  it("clearly indicates when caption timings are estimated", () => {
    const cb = callbacks();
    render(editor(cb, { timingEstimated: true }));
    expect(screen.getByRole("status")).toHaveTextContent("estimated");
  });
  it("does not show synchronization when a real voice was not recorded", () => {
    const cb = callbacks();
    render(editor(cb, { hasVoice: false }));
    expect(screen.queryByRole("button", { name: "Re-sync captions to voice" })).not.toBeInTheDocument();
  });
});
