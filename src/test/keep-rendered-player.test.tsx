import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KeepRenderedPlayer, formatKeepPlaybackTime } from "@/components/keep-rendered-player";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("finished Keep MP4 scrubbing", () => {
  const props = {
    videoUrl: "/finished-keep.mp4",
    onExit: vi.fn(),
    onFinish: vi.fn(),
    onOpeningFrameReady: vi.fn(),
    onPlaybackError: vi.fn(),
  };
  function setup() {
    const view = render(<KeepRenderedPlayer {...props} />);
    const video = screen.getByLabelText("Your finished Keep film") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 156.5 });
    fireEvent.loadedMetadata(video);
    return { video, view };
  }

  it("formats timestamps for short and long Keep films", () => {
    expect(formatKeepPlaybackTime(0)).toBe("0:00");
    expect(formatKeepPlaybackTime(63.8)).toBe("1:03");
    expect(formatKeepPlaybackTime(3661.9)).toBe("1:01:01");
  });

  it("has a touch-friendly always-visible seeker spanning the whole MP4", () => {
    const { video } = setup();
    const slider = screen.getByRole("slider", { name: "Seek through your Keep" });
    expect(slider).toBeEnabled();
    expect(slider).toHaveAttribute("max", "156.5");
    expect(slider).toHaveAttribute("aria-valuetext", "0:00 of 2:36");
    expect(screen.getByText("2:36")).toBeInTheDocument();

    // One MP4 contains opening + photos + ending, so any position is seekable.
    fireEvent.change(slider, { target: { value: "100.2" } });
    expect(video.currentTime).toBeCloseTo(100.2, 1);
    expect(slider).toHaveAttribute("aria-valuetext", "1:40 of 2:36");

    fireEvent.timeUpdate(video);
    expect(screen.getByText("1:40")).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "3.5" } });
    expect(video.currentTime).toBeCloseTo(3.5, 1);
  });

  it("keeps drag responsive and commits the seek when a finger releases", () => {
    const { video } = setup();
    const slider = screen.getByRole("slider", { name: "Seek through your Keep" });
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "84.2" } });
    expect(video.currentTime).toBe(0);
    fireEvent.pointerUp(slider);
    expect(video.currentTime).toBeCloseTo(84.2, 1);
  });

  it("keeps play, pause, mute and replay-end controls available", () => {
    const { video } = setup();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Play your Keep" }));
    expect(play).toHaveBeenCalled();
    // jsdom does not implement the media paused flag; mirror actual browser
    // behavior after its "play" event so pause uses the real media state.
    Object.defineProperty(video, "paused", { configurable: true, value: false });
    fireEvent.play(video);
    fireEvent.click(screen.getByRole("button", { name: "Pause your Keep" }));
    expect(pause).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Mute Keep" }));
    expect(video.muted).toBe(true);
    fireEvent.ended(video);
    expect(props.onFinish).toHaveBeenCalled();
  });
});
