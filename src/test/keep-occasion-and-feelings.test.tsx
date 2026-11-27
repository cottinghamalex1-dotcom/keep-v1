import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepFeelingChoices, KeepOccasionChoices, keepOccasions } from "@/components/keep-occasion-and-feelings";
import { newProject, loadDraft, saveDraft, clearDraft, type KeepProject } from "@/lib/keep-project";
import { fetchDraft, fetchNextQuestion, fetchRevision } from "@/lib/keep-ai";
import { getOpeningInterviewQuestion, getInterviewGuidance } from "../../supabase/functions/keep-ai/interview-policy";

afterEach(() => { cleanup(); clearDraft(); vi.unstubAllGlobals(); });

function OccasionHarness({ initial = newProject() }: { initial?: KeepProject }) {
  const [project, setProject] = useState(initial);
  return <KeepOccasionChoices occasion={project.occasion} occasionDetail={project.occasionDetail}
    onChange={change => setProject(previous => ({ ...previous, ...change }))}
    continueButton={disabled => <button disabled={disabled}>Continue</button>} />;
}

describe("occasion detail and recipient feelings", () => {
  it("expands a birthday clarification under its row and keeps it optional", () => {
    render(<OccasionHarness />);
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Birthday" }));
    const input = screen.getByRole("textbox", { name: "Which birthday are they celebrating?" });
    const wedding = screen.getByRole("button", { name: "Wedding" });
    expect(input.compareDocumentPosition(wedding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
    fireEvent.change(input, { target: { value: "Her 8th birthday" } });
    expect(input).toHaveValue("Her 8th birthday");
    fireEvent.click(screen.getByRole("button", { name: "Birthday" }));
    expect(input).toHaveValue("Her 8th birthday");
    fireEvent.click(screen.getByRole("button", { name: "Trip / Adventure" }));
    expect(screen.getByRole("textbox", { name: "What trip or adventure are you remembering?" })).toHaveValue("");
  });

  it("offers a contextual clarifier for every occasion and preserves older custom occasions", () => {
    render(<OccasionHarness initial={{ ...newProject(), occasion: "Our Disney trip" }} />);
    expect(screen.getByRole("button", { name: "Other" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox")).toHaveValue("Our Disney trip");
    for (const option of keepOccasions.filter(o => o !== "Other")) {
      fireEvent.click(screen.getByRole("button", { name: option }));
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
    }
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A family reunion" } });
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("supports independent multiple selections, deselection, and draft persistence", () => {
    function FeelingsHarness() {
      const [selected, setSelected] = useState<string[]>(["Loved"]);
      return <KeepFeelingChoices selected={selected} onChange={value => {
        setSelected(value);
        saveDraft({ ...newProject(), active: true, stage: "feelings", occasion: "Birthday", occasionDetail: "Her 8th birthday", recipientFeelings: value });
      }} />;
    }
    render(<FeelingsHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Encouraged" }));
    fireEvent.click(screen.getByRole("button", { name: "Special" }));
    expect(screen.getByRole("button", { name: "Loved" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Encouraged" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Loved" }));
    expect(screen.getByRole("button", { name: "Loved" })).toHaveAttribute("aria-pressed", "false");
    expect(loadDraft()).toMatchObject({
      stage: "feelings", occasion: "Birthday", occasionDetail: "Her 8th birthday", recipientFeelings: ["Encouraged", "Special"],
    });
    expect(newProject().recipientFeelings).toEqual([]);
  });

  it("passes both fields to question, script and revision endpoints", async () => {
    const context = { recipientName: "Andi", relationship: "Child", occasion: "Birthday", occasionDetail: "Her 8th birthday", recipientFeelings: ["Loved", "Special"], intent: "She matters to us", answers: [{ question: "What?", transcript: "She is kind." }] };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ question: "A question?", paragraphs: ["A message"] })));
    vi.stubGlobal("fetch", fetchMock);
    await fetchNextQuestion(context);
    await fetchDraft(context);
    await fetchRevision(context, ["A message"], 0, "Make it warmer.");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of (fetchMock.mock.calls as unknown as [string, RequestInit][])) {
      expect(JSON.parse(String(init.body))).toMatchObject({ occasion: "Birthday", occasionDetail: "Her 8th birthday", recipientFeelings: ["Loved", "Special"] });
    }
    expect(getOpeningInterviewQuestion(context)).toContain("Her 8th birthday");
    expect(getInterviewGuidance(context)).toContain("selected recipient feelings as goals");
  });
});
