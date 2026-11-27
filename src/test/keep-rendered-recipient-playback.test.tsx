import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";

const props = {
  name: "Dad", from: "Alex", year: "2026", persistVisit: false,
  renderedVideoUrl: "/finished-keep.mp4",
  messageParagraphs: ["I love you."],
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("single-tap rendered Keep playback", () => {
  it("preloads the same video and plays with sound before requesting fullscreen", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const fullscreen = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(document.documentElement, "requestFullscreen");
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: fullscreen });
    try {
      const callback = vi.fn();
      const { container } = render(<KeepRecipientExperience {...props} onFirstExperience={callback} />);
      const video = container.querySelector("video")!;
      expect(video.preload).toBe("auto");
      expect(video.parentElement).toHaveAttribute("aria-hidden", "true");
      expect(play).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
      expect(container.querySelector("video")).toBe(video);
      expect(play).toHaveBeenCalledOnce();
      expect(video.muted).toBe(false);
      expect(fullscreen).toHaveBeenCalledOnce();
      expect(play.mock.invocationCallOrder[0]).toBeLessThan(fullscreen.mock.invocationCallOrder[0]!);
      expect(video.parentElement).toHaveClass("fixed", "inset-0");
      expect(video.parentElement).toHaveAttribute("aria-hidden", "false");
      expect(video.controls).toBe(true);
      expect(screen.queryByText(/Tap play to watch/)).not.toBeInTheDocument();
      expect(callback).not.toHaveBeenCalled();
      fireEvent.playing(video);
      expect(callback).toHaveBeenCalledOnce();
      fireEvent.ended(video);
      expect(screen.getByText(/Some things are/)).toBeInTheDocument();
    } finally {
      if (original) Object.defineProperty(document.documentElement, "requestFullscreen", original);
      else Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    }
  });

  it("uses native video fullscreen on iPhone-style browsers and exits it when the film ends", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const enter = vi.fn();
    const exit = vi.fn();
    const { container } = render(<KeepRecipientExperience {...props} />);
    const video = container.querySelector("video")!;
    Object.defineProperties(video, {
      webkitEnterFullscreen: { value: enter },
      webkitExitFullscreen: { value: exit },
      webkitDisplayingFullscreen: { get: () => enter.mock.calls.length > 0 },
    });
    expect(video.playsInline).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    expect(play).toHaveBeenCalledOnce();
    expect(enter).toHaveBeenCalledOnce();
    fireEvent.playing(video);
    fireEvent.ended(video);
    expect(exit).toHaveBeenCalledOnce();
    expect(screen.getByText(/Some things are/)).toBeInTheDocument();
  });

  it("keeps a full-viewport player with normal seeking controls if the browser blocks playback", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotAllowedError"));
    const { container } = render(<KeepRecipientExperience {...props} />);
    const video = container.querySelector("video")!;
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(video.parentElement).toHaveClass("fixed", "inset-0");
    expect(video.controls).toBe(true);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Back to experiences" }));
    expect(screen.getByRole("button", { name: /Watch, Listen & Read/i })).toBeInTheDocument();
  });

  it("plays the prepared video again when returning from another experience", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const { container } = render(<KeepRecipientExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to experiences" }));
    fireEvent.click(screen.getByRole("button", { name: /^Read Just the written message/i }));
    fireEvent.click(screen.getByRole("button", { name: "Back to experiences" }));
    fireEvent.click(screen.getByRole("button", { name: /Watch, Listen & Read/i }));
    const video = container.querySelector("video")!;
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    expect(container.querySelector("video")).toBe(video);
    expect(play).toHaveBeenCalledTimes(2);
  });
});
