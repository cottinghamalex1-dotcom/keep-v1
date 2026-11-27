import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { measureInterviewViewport, useInterviewViewport } from "@/hooks/use-interview-viewport";

afterEach(() => vi.restoreAllMocks());

describe("keyboard-aware interview viewport", () => {
  it("tracks the keyboard and the iOS visual viewport's vertical pan", () => {
    expect(measureInterviewViewport(377.5, 390, 62.3, 780)).toEqual({
      height: 378, width: 390, top: 62, keyboardOpen: true,
    });
    expect(measureInterviewViewport(755, 390, 0, 780).keyboardOpen).toBe(false);
  });

  it("updates on keyboard resize and pan, restores the full view, and cleans up on exit", () => {
    const viewport = Object.assign(new EventTarget(), { height: 780, width: 390, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 780);
    const { result, rerender, unmount } = renderHook(({ active }) => useInterviewViewport(active), { initialProps: { active: true } });
    try {
      expect(document.documentElement).toHaveClass("keep-interview-active");
      expect(result.current?.keyboardOpen).toBe(false);
      act(() => {
        viewport.height = 350;
        viewport.dispatchEvent(new Event("resize"));
      });
      expect(result.current).toMatchObject({ height: 350, keyboardOpen: true });
      act(() => {
        viewport.offsetTop = 76;
        viewport.dispatchEvent(new Event("scroll"));
      });
      expect(result.current?.top).toBe(76);
      act(() => {
        viewport.height = 780;
        viewport.offsetTop = 0;
        viewport.dispatchEvent(new Event("resize"));
      });
      expect(result.current).toMatchObject({ height: 780, top: 0, keyboardOpen: false });
      rerender({ active: false });
      expect(result.current).toBeNull();
      expect(document.documentElement).not.toHaveClass("keep-interview-active");
    } finally {
      unmount();
      vi.unstubAllGlobals();
    }
  });
});
