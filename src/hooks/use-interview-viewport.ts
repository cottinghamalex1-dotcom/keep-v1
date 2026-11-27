import { useEffect, useState } from "react";

export type InterviewViewport = {
  height: number;
  width: number;
  top: number;
  keyboardOpen: boolean;
};

export function measureInterviewViewport(
  height: number,
  width: number,
  offsetTop: number,
  fullHeight: number,
): InterviewViewport {
  return {
    height: Math.round(height),
    width: Math.round(width),
    top: Math.max(0, Math.round(offsetTop)),
    keyboardOpen: fullHeight - height > 135,
  };
}

/** Mobile Safari can resize and pan its visual viewport independently of the
 * layout viewport. Follow both dimensions and offset, not just 100dvh. */
export function useInterviewViewport(active: boolean) {
  const [viewport, setViewport] = useState<InterviewViewport | null>(null);

  useEffect(() => {
    if (!active) {
      setViewport(null);
      return;
    }
    const visual = window.visualViewport;
    const root = document.documentElement;
    root.classList.add("keep-interview-active");
    let lastWidth = 0;
    let fullHeight = 0;
    const measure = () => {
      const height = visual?.height ?? window.innerHeight;
      const width = visual?.width ?? window.innerWidth;
      const layoutHeight = window.innerHeight;
      // Re-baseline when orientation changes; otherwise remember the full
      // height for browsers that resize the layout viewport with the keyboard.
      if (Math.abs(width - lastWidth) > 80) fullHeight = Math.max(height, layoutHeight);
      else fullHeight = Math.max(fullHeight, height, layoutHeight);
      lastWidth = width;
      const next = measureInterviewViewport(height, width, visual?.offsetTop ?? 0, fullHeight);
      setViewport(previous => previous && previous.height === next.height &&
        previous.width === next.width && previous.top === next.top &&
        previous.keyboardOpen === next.keyboardOpen ? previous : next);
    };
    measure();
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      root.classList.remove("keep-interview-active");
    };
  }, [active]);

  return viewport;
}
