import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepTeleprompter } from "@/components/keep-teleprompter";

const props = {
  text: "These are the moments that meant so much to us.\n\nEvery one of them is worth keeping.",
  label: "PART 1 OF 3",
  speaker: "Mom",
  isRecording: false,
  isPaused: false,
  elapsed: 0,
};

afterEach(() => vi.unstubAllGlobals());

describe("shared recording teleprompter", () => {
  it("shows the speaker and a pinned recording indicator with elapsed time", () => {
    const { rerender } = render(<KeepTeleprompter {...props} />);
    expect(screen.getByText("PART 1 OF 3")).toBeInTheDocument();
    expect(screen.getByText("Mom")).toBeInTheDocument();
    expect(screen.getByText("Ready to record")).toBeInTheDocument();
    rerender(<KeepTeleprompter {...props} isRecording elapsed={73} />);
    expect(screen.getByLabelText("Recording in progress")).toHaveTextContent("RECORDING");
    expect(screen.getByLabelText("Recording in progress")).toHaveTextContent("01:13");
    rerender(<KeepTeleprompter {...props} isRecording isPaused elapsed={73} />);
    expect(screen.getByLabelText("Recording paused")).toHaveTextContent("PAUSED");
  });

  it("keeps the scripture scrollable by hand and offers a way back to auto-scroll", () => {
    render(<KeepTeleprompter {...props} isRecording />);
    const viewport = screen.getByLabelText("Teleprompter script. Swipe to adjust your reading position.");
    fireEvent.touchStart(viewport);
    expect(screen.getByRole("button", { name: "Resume auto-scroll" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume auto-scroll" }));
    expect(screen.getByRole("button", { name: "Pause auto-scroll" })).toBeInTheDocument();
  });

  it("offers rehearsal without making the creator think the microphone is recording", () => {
    render(<KeepTeleprompter {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Practice scrolling" }));
    expect(screen.getByText("PRACTICE · NOT RECORDING")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause practice" })).toBeInTheDocument();
  });

  it("automatically advances the script when real recording is underway", () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { frame = cb; return 1; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<KeepTeleprompter {...props} isRecording />);
    const viewport = screen.getByLabelText("Teleprompter script. Swipe to adjust your reading position.") as HTMLElement;
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 1500 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 300 });
    act(() => {
      frame?.(1000);
      frame?.(1080);
    });
    expect(viewport.scrollTop).toBeGreaterThan(0);
  });
});
