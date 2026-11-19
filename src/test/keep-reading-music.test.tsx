import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepReadingMusic } from "@/components/keep-reading-music";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("uses a Web Audio gain on iPhones so the Read-only music slider changes audible volume", async () => {
  const setTargetAtTime = vi.fn();
  const connect = vi.fn();
  const disconnect = vi.fn();
  const resume = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  class FakeAudioContext {
    currentTime = 12;
    destination = {};
    createMediaElementSource() { return { connect }; }
    createGain() { return { gain: { value: 0, setTargetAtTime }, connect, disconnect }; }
    resume = resume;
    close = close;
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

  render(<KeepReadingMusic musicMood="Warm + Nostalgic" />);
  fireEvent.click(screen.getByRole("button", { name: "Play background music" }));
  await waitFor(() => expect(resume).toHaveBeenCalled());
  const slider = screen.getByRole("slider", { name: "Background music volume" });
  fireEvent.change(slider, { target: { value: "80" } });
  expect(screen.getByText("80%")).toBeTruthy();
  await waitFor(() => expect(setTargetAtTime).toHaveBeenCalledWith(0.8, 12, 0.015));
  fireEvent.change(slider, { target: { value: "0" } });
  await waitFor(() => expect(setTargetAtTime).toHaveBeenCalledWith(0, 12, 0.015));
});
