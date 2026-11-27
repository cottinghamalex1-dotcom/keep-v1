import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepRecordedAnswerPlayer } from "@/components/keep-recorded-answer-player";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
    this.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: false });
    this.dispatchEvent(new Event("play"));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Keep recorded answer player", () => {
  it("renders a custom play button, the known duration and an accessible scrubber", () => {
    const { container } = render(<KeepRecordedAnswerPlayer src="blob:answer" durationSec={12} />);
    expect(screen.getByRole("button", { name: "Play recorded answer" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Recorded answer playback position" });
    expect(slider).toHaveAttribute("aria-valuetext", "0:00 of 0:12");
    expect(slider).toHaveAttribute("max", "12");
    expect(container.querySelector("audio")).not.toHaveAttribute("controls");
  });

  it("plays, pauses, follows the real recording time and seeks", async () => {
    const { container, unmount } = render(<KeepRecordedAnswerPlayer src="blob:answer" durationSec={12} />);
    const audio = container.querySelector("audio")!;
    const slider = screen.getByRole("slider");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Play recorded answer" })));
    expect(screen.getByRole("button", { name: "Pause recorded answer" })).toBeInTheDocument();
    Object.defineProperty(audio, "duration", { configurable: true, value: 14 });
    audio.currentTime = 5;
    fireEvent.loadedMetadata(audio);
    fireEvent.timeUpdate(audio);
    expect(slider).toHaveAttribute("aria-valuetext", "0:05 of 0:14");
    fireEvent.change(slider, { target: { value: "9" } });
    expect(audio.currentTime).toBe(9);
    expect(slider).toHaveAttribute("aria-valuetext", "0:09 of 0:14");
    fireEvent.click(screen.getByRole("button", { name: "Pause recorded answer" }));
    expect(screen.getByRole("button", { name: "Play recorded answer" })).toBeInTheDocument();
    unmount();
    expect(audio.pause).toHaveBeenCalledTimes(2);
  });

  it("restarts at zero after playback finishes", async () => {
    const { container } = render(<KeepRecordedAnswerPlayer src="blob:answer" durationSec={12} />);
    const audio = container.querySelector("audio")!;
    audio.currentTime = 12;
    fireEvent.ended(audio);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replay recorded answer" })));
    expect(audio.currentTime).toBe(0);
    expect(screen.getByRole("button", { name: "Pause recorded answer" })).toBeInTheDocument();
  });

  it("can still play without duration metadata and explains playback errors", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Playback failed"));
    render(<KeepRecordedAnswerPlayer src="blob:answer" durationSec={0} />);
    expect(screen.getByRole("slider")).toBeDisabled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Play recorded answer" })));
    expect(screen.getByRole("status")).toHaveTextContent("Tap play to try again");
  });
});
