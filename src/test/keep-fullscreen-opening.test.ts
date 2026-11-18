import { afterEach, describe, expect, it, vi } from "vitest";
import { enterKeepFullscreen, leaveKeepFullscreen, toggleKeepFullscreen } from "@/lib/keep-fullscreen";
import { keepOpeningLeadSeconds } from "@/lib/keep-opening-timing";
import { KEEP_MUSIC_LEAD_SECONDS } from "@/lib/keep-audio";

afterEach(() => { vi.restoreAllMocks(); });

describe("the recipient's full-screen opening", () => {
  it("gives short dedications time to be read, with longer messages up to 14 seconds", () => {
    expect(keepOpeningLeadSeconds("", false)).toBe(KEEP_MUSIC_LEAD_SECONDS);
    expect(keepOpeningLeadSeconds("", true)).toBe(7.5);
    expect(keepOpeningLeadSeconds("I love you, Dad.", true)).toBe(7.5);
    expect(keepOpeningLeadSeconds("A".repeat(160), true)).toBeGreaterThan(10);
    expect(keepOpeningLeadSeconds("A".repeat(400), true)).toBe(14);
  });

  it("requests real fullscreen when supported by the browser", () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const original = document.documentElement.requestFullscreen;
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: requestFullscreen,
    });
    try {
      enterKeepFullscreen();
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true, value: original,
      });
    }
  });

  it("continues normally if the current browser cannot grant fullscreen", () => {
    const original = document.documentElement.requestFullscreen;
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: undefined,
    });
    try {
      expect(() => enterKeepFullscreen()).not.toThrow();
      expect(() => leaveKeepFullscreen()).not.toThrow();
    } finally {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true, value: original,
      });
    }
  });
  it("allows a fullscreen button to enter and exit fullscreen", async () => {
    const originalRequest = document.documentElement.requestFullscreen;
    const originalExit = document.exitFullscreen;
    const originalElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    let active = false;
    const request = vi.fn(async () => { active = true; });
    const exit = vi.fn(async () => { active = false; });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: request,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true, value: exit,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true, get: () => active ? document.documentElement : null,
    });
    try {
      expect(await toggleKeepFullscreen()).toBe(true);
      expect(request).toHaveBeenCalledOnce();
      expect(await toggleKeepFullscreen()).toBe(true);
      expect(exit).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true, value: originalRequest,
      });
      Object.defineProperty(document, "exitFullscreen", {
        configurable: true, value: originalExit,
      });
      if (originalElement) Object.defineProperty(document, "fullscreenElement", originalElement);
      else Reflect.deleteProperty(document, "fullscreenElement");
    }
  });

  it("returns false instead of throwing when a browser rejects fullscreen", async () => {
    const originalRequest = document.documentElement.requestFullscreen;
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true, value: vi.fn().mockRejectedValue(new Error("Not supported")),
    });
    try {
      expect(await toggleKeepFullscreen()).toBe(false);
    } finally {
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true, value: originalRequest,
      });
    }
  });

});
