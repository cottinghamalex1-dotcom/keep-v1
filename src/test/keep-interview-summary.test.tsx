import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepInterviewSummary } from "@/components/keep-interview-summary";

afterEach(cleanup);

describe("Keep interview summary", () => {
  it("shows the entire generated summary and preserves both message paths", () => {
    const onCreate = vi.fn();
    const onWrite = vi.fn();
    const summary = "Celebrate the moments you have shared.\nRemember the everyday kindness that made them special.";
    render(<KeepInterviewSummary summary={summary} aiReady onCreate={onCreate} onWrite={onWrite}/>);
    expect(screen.getByRole("heading", { name: "I think we have it." })).toBeInTheDocument();
    const story = screen.getByText(/Celebrate the moments you have shared/);
    expect(story.textContent).toBe(summary);
    fireEvent.click(screen.getByRole("button", { name: "Create My Message" }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onWrite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Write it myself" }));
    expect(onWrite).toHaveBeenCalledOnce();
  });

  it("retains a fallback and the writing option when AI is unavailable", () => {
    const onCreate = vi.fn();
    const onWrite = vi.fn();
    render(<KeepInterviewSummary summary="  " aiReady={false} onCreate={onCreate} onWrite={onWrite}/>);
    expect(screen.getByText("You've shared what matters. Let's put it into words.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create My Message" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Write it myself" }));
    expect(onWrite).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
