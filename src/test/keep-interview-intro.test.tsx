import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepInterviewIntro } from "@/components/keep-interview-intro";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Keep AI interview introduction", () => {
  it("shows warm, practical reminders before asking the first question", () => {
    const ready = vi.fn();
    render(<KeepInterviewIntro onReady={ready}/>);
    const dialog = screen.getByRole("dialog", { name: /Your best words are your own/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/8–10 questions/)).toBeInTheDocument();
    expect(screen.getByText("Say as much as you can.")).toBeInTheDocument();
    expect(screen.getByText("Be specific.")).toBeInTheDocument();
    expect(screen.getByText("Don't try to sound polished.")).toBeInTheDocument();
    expect(screen.getByText("Go with your first thought.")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: /I'm ready/i }));
    expect(ready).toHaveBeenCalledOnce();
  });

  it("restores page scrolling when interview tips are dismissed", () => {
    const { unmount } = render(<KeepInterviewIntro onReady={vi.fn()}/>);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
