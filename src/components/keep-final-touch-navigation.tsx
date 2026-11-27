import { useEffect, useRef, useState } from "react";

const sections = [
  { label: "Opening", id: "opening" },
  { label: "Closing", id: "closing" },
  { label: "Card", id: "card" },
] as const;
type SectionId = (typeof sections)[number]["id"];

/** Section shortcuts stay visible, with the active pill following the actual scroll position. */
export function KeepFinalTouchNavigation() {
  const nav = useRef<HTMLElement>(null);
  const [active, setActive] = useState<SectionId>("opening");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = (nav.current?.getBoundingClientRect().bottom ?? 0) + 22;
      let current: SectionId = "opening";
      for (const { id } of sections) {
        const section = document.getElementById(`keep-final-${id}`);
        if (section && section.getBoundingClientRect().top <= threshold) current = id;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    // Track scroll and layout changes (including message bubbles growing as edited).
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined;
    if (nav.current) observer?.observe(nav.current);
    for (const { id } of sections) {
      const section = document.getElementById(`keep-final-${id}`);
      if (section) observer?.observe(section);
    }
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const goTo = (id: SectionId) => {
    setActive(id);
    const section = document.getElementById(`keep-final-${id}`);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    section?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <nav ref={nav} aria-label="Final touches sections" className="keep-final-nav">
      <div className="keep-final-nav__track">
        {sections.map(({ label, id }) => (
          <button key={id} type="button" aria-controls={`keep-final-${id}`}
            aria-current={active === id ? "location" : undefined} onClick={() => goTo(id)}
            className="keep-final-nav__item">
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
