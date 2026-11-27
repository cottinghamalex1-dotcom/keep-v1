import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { KeepFilmCaption } from "@/components/keep-film-caption";
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
  onChangeSize: vi.fn(),
  onRegroup: vi.fn(),
  onRestore: vi.fn(),
  onRetrySync: vi.fn(),
  onResync: vi.fn(),
  onPreviewSync: vi.fn(),
});
const editor = (cb: ReturnType<typeof callbacks>, options: { cues?: CaptionCue[]; syncing?: boolean; syncError?: boolean; hasVoice?: boolean; timingEstimated?: boolean; captionSize?: number; syncErrorMessage?: string; syncProgress?: {completed:number;total:number} } = {}) =>
  <KeepCaptionEditor
    cues={options.cues ?? cues} time={0} style="Clean" position="bottom" maxLines={2} captionSize={options.captionSize} wordsPerCue={5}
    syncing={options.syncing ?? false} syncError={options.syncError ?? false}
    timingEstimated={options.timingEstimated ?? false} hasVoice={options.hasVoice ?? true}
    syncErrorMessage={options.syncErrorMessage} syncProgress={options.syncProgress}
    canRestore={true} {...cb}
  />;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("caption-to-voice synchronization controls", () => {
  it("allows resizing without changing style or re-syncing, and restores default size", () => {
    const cb = callbacks();
    const { rerender } = render(editor(cb));
    const slider = screen.getByRole("slider", {name: "Caption size"});
    expect(slider).toHaveValue("100");
    fireEvent.change(slider, {target: {value: "130"}});
    expect(cb.onChangeSize).toHaveBeenCalledWith(130);
    rerender(editor(cb, {captionSize: 130}));
    expect(slider).toHaveValue("130");
    fireEvent.click(screen.getByRole("button", {name: "Reset size"}));
    expect(cb.onChangeSize).toHaveBeenLastCalledWith(100);
    expect(cb.onChangeStyle).not.toHaveBeenCalled();
    expect(cb.onResync).not.toHaveBeenCalled();
  });
  it("updates preview typography proportionally without changing caption text, font or position", () => {
    // jsdom does not support container-query units, but React emits them for the real browser.
    const original = renderToStaticMarkup(<KeepFilmCaption text="Our words" style="Story" position="top" />);
    const larger = renderToStaticMarkup(<KeepFilmCaption text="Our words" style="Story" position="top" captionSize={150} />);
    const originalSize = Number(original.match(/font-size:([\d.]+)cqw/)?.[1]);
    const largerSize = Number(larger.match(/font-size:([\d.]+)cqw/)?.[1]);
    expect(originalSize).toBeGreaterThan(0);
    expect(largerSize).toBeCloseTo(originalSize * 1.5);
    expect(larger.replace(/font-size:[\d.]+cqw/, "font-size:SIZE")).toBe(original.replace(/font-size:[\d.]+cqw/, "font-size:SIZE"));
  });
  it("always offers a true re-sync and a preview for a completed recording", () => {
    const cb = callbacks();
    render(editor(cb));
    expect(screen.getByRole("status")).toHaveTextContent("Captions aligned to your voice");
    fireEvent.click(screen.getByRole("button", { name: "Re-sync captions to voice" }));
    expect(screen.getByRole("group", { name: "Confirm caption re-sync" })).toBeInTheDocument();
    expect(cb.onResync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Re-sync now" }));
    expect(cb.onResync).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(cb.onPreviewSync).toHaveBeenCalledOnce();
  });
  it("allows cancelling a re-sync without replacing a saved recording or captions", () => {
    const cb = callbacks();
    render(editor(cb, { timingEstimated: true }));
    fireEvent.click(screen.getByRole("button", { name: "Re-sync captions to voice" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cb.onResync).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Confirm caption re-sync" })).toBeNull();
  });
  it("displays recovery progress and a useful failure when needed", () => {
    const cb = callbacks();
    const { rerender } = render(editor(cb, { syncing: true, syncProgress: {completed:2,total:6} }));
    expect(screen.getByRole("status")).toHaveTextContent("section 2 of 6 completed");
    rerender(editor(cb, {syncError: true, syncErrorMessage:"Voice backup couldn't be downloaded"}));
    expect(screen.getByRole("alert")).toHaveTextContent("Voice backup couldn't be downloaded");
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
    expect(screen.getByRole("status")).toHaveTextContent("Preparing your saved voice");
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
