import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecorder } from "@/hooks/use-recorder";

const startEncoder = vi.fn();
const stopTrack = vi.fn();
const track = { readyState: "live", stop: stopTrack };
const captured = { getAudioTracks: () => [track], getVideoTracks: () => [track], getTracks: () => [track] };
class TestRecorder {
  state = "inactive";
  static isTypeSupported() { return true; }
  start() { this.state = "recording"; startEncoder(); }
  stop() { this.state = "inactive"; }
  pause() { this.state = "paused"; }
  resume() { this.state = "recording"; }
}
const getUserMedia = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("MediaRecorder", TestRecorder);
  vi.stubGlobal("MediaStream", class {});
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  getUserMedia.mockResolvedValue(captured);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("recording countdown", () => {
  it("waits for microphone permission, then counts 3–2–1 before encoding", async () => {
    let releasePermission!: (value: typeof captured) => void;
    getUserMedia.mockReturnValueOnce(new Promise(resolve => { releasePermission = resolve; }));
    const { result } = renderHook(() => useRecorder());
    let started!: ReturnType<typeof result.current.start>;
    act(() => { started = result.current.start({ countdown: true }); });
    expect(result.current.status).toBe("requesting");
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(startEncoder).not.toHaveBeenCalled();
    await act(async () => { releasePermission(captured); });
    expect(result.current.countdown).toBe(3);
    expect(result.current.status).toBe("countdown");
    for (const remaining of [2, 1]) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(result.current.countdown).toBe(remaining);
      expect(result.current.elapsed).toBe(0);
      expect(startEncoder).not.toHaveBeenCalled();
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(await started).toBe(true);
    expect(startEncoder).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("recording");
    expect(result.current.countdown).toBeNull();
    expect(result.current.elapsed).toBe(0);
  });

  it("cancels pending recording without ever starting an encoder", async () => {
    const { result } = renderHook(() => useRecorder());
    let started!: ReturnType<typeof result.current.start>;
    await act(async () => { started = result.current.start({ countdown: true }); });
    expect(result.current.countdown).toBe(3);
    act(() => { result.current.cancel(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(await started).toBeNull();
    expect(result.current.status).toBe("idle");
    expect(result.current.countdown).toBeNull();
    expect(startEncoder).not.toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalled();
  });

  it("starts interview recording immediately without the optional countdown", async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe("recording");
    expect(result.current.countdown).toBeNull();
    expect(startEncoder).toHaveBeenCalledTimes(1);
  });

  it("starts both selfie and voice encoders together after the countdown", async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => { void result.current.start({ selfie: true, countdown: true }); });
    expect(result.current.countdown).toBe(3);
    expect(startEncoder).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.status).toBe("recording");
    expect(startEncoder).toHaveBeenCalledTimes(2);
  });
});
