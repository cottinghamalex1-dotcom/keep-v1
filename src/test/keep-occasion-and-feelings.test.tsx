import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepFeelingChoices, KeepHeartAndFeelings, KeepOccasionChoices, keepOccasions, keepRecipientFeelings } from "@/components/keep-occasion-and-feelings";
import { newProject, loadDraft, saveDraft, clearDraft, resumeKeepCreationStage, type KeepProject } from "@/lib/keep-project";
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
    expect(resumeKeepCreationStage(loadDraft()!.stage)).toBe("intent");
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

describe("combined heart and feelings page", () => {
  it("shows the heart prompt and emotional choices in order, with a single Continue button", () => {
    const onContinue = vi.fn();
    const onToggleDictation = vi.fn();
    function Harness() {
      const [intent, setIntent] = useState("");
      const [selected, setSelected] = useState<string[]>([]);
      return <KeepHeartAndFeelings intent={intent} selected={selected} forSelf={false} dictating={false}
        onIntentChange={setIntent} onFeelingsChange={setSelected} onToggleDictation={onToggleDictation} onContinue={onContinue} />;
    }
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "What is the heart behind this Keep?" })).toBeVisible();
    const input = screen.getByRole("textbox");
    const feelingsHeading = screen.getByRole("heading", { name: "How do you want them to feel?" });
    expect(input.compareDocumentPosition(feelingsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Continue" })).toHaveLength(1);
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(onToggleDictation).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Type" }));
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "I want her to know how special she is." } });
    expect(next).not.toBeDisabled(); // Feelings remain optional.
    fireEvent.click(screen.getByRole("button", { name: "Loved" }));
    fireEvent.click(screen.getByRole("button", { name: "Special" }));
    expect(screen.getByRole("button", { name: "Loved" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Special" })).toHaveAttribute("aria-pressed", "true");
    expect(input).toHaveValue("I want her to know how special she is.");
    fireEvent.click(next);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("keeps all 14 feelings, reflects the selected count and clearly exposes dictation state", () => {
    function Harness() {
      const [intent, setIntent] = useState("A special birthday");
      const [selected, setSelected] = useState<string[]>([]);
      const [dictating, setDictating] = useState(false);
      return <KeepHeartAndFeelings intent={intent} selected={selected} forSelf={false} dictating={dictating}
        onIntentChange={setIntent} onFeelingsChange={setSelected}
        onToggleDictation={() => setDictating(value => !value)} onContinue={vi.fn()} />;
    }
    render(<Harness />);
    expect(screen.getByText("0 selected")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Your thoughts" })).toHaveAttribute("maxlength", "500");
    for (const feeling of keepRecipientFeelings) {
      fireEvent.click(screen.getByRole("button", { name: feeling }));
      expect(screen.getByRole("button", { name: feeling })).toHaveAttribute("aria-pressed", "true");
    }
    expect(screen.getByText("14 selected")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Loved" }));
    expect(screen.getByText("13 selected")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(screen.getByRole("button", { name: "Stop" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Listening")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(screen.getByRole("button", { name: "Speak" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Listening")).toBeNull();
  });

  it("restores both inputs on the combined screen, including a legacy feelings-stage draft", () => {
    const draft = { ...newProject(), active: true, stage: "feelings", intent: "Celebrating a new chapter", recipientFeelings: ["Hopeful", "Encouraged"] };
    saveDraft(draft);
    const restored = loadDraft()!;
    expect(resumeKeepCreationStage(restored.stage)).toBe("intent");
    render(<KeepHeartAndFeelings intent={restored.intent} selected={restored.recipientFeelings ?? []}
      forSelf dictating={false} onIntentChange={vi.fn()} onFeelingsChange={vi.fn()} onToggleDictation={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "How do you want to feel?" })).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("Celebrating a new chapter");
    expect(screen.getByRole("button", { name: "Hopeful" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Encouraged" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });
});
