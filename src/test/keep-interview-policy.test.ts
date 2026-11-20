import { describe, expect, it } from "vitest";
import { classifyInterviewOccasion, enforceInterviewStep, getFallbackInterviewQuestion, getInterviewGuidance, getOpeningInterviewQuestion, INTERVIEW_MIN_ANSWERS, INTERVIEW_IDEAL_ANSWERS, INTERVIEW_MAX_ANSWERS } from "../../supabase/functions/keep-ai/interview-policy";

const next = { done: false, question: "What has this relationship taught you?", summary: "" };
const done = { done: true, question: "", summary: "A deeply personal story about a friendship." };

describe("AI interview question range", () => {
  it("requires at least eight answers, even if AI tries to finish after five", () => {
    expect(INTERVIEW_MIN_ANSWERS).toBe(8);
    expect(INTERVIEW_IDEAL_ANSWERS).toBe(9);
    expect(INTERVIEW_MAX_ANSWERS).toBe(10);
    for (let count = 1; count < 8; count++) {
      const step = enforceInterviewStep(count, done);
      expect(step.done).toBe(false);
      expect(step.question.length).toBeGreaterThan(10);
      expect(step.summary).toBe("");
    }
  });

  it("permits natural ending after question eight or nine", () => {
    expect(enforceInterviewStep(8, done)).toEqual(done);
    expect(enforceInterviewStep(9, done)).toEqual(done);
    expect(enforceInterviewStep(8, next)).toEqual(next);
  });

  it("never asks more than ten answered questions", () => {
    expect(enforceInterviewStep(9, next)).toEqual(next);
    expect(enforceInterviewStep(10, next)).toEqual({ done: true, question: "", summary: "" });
    expect(enforceInterviewStep(15, done)).toEqual(done);
  });

  it("keeps a valid follow-up specific and allows a missing-answer fallback", () => {
    expect(enforceInterviewStep(4, next)).toEqual(next);
    expect(enforceInterviewStep(4, { done: false, question: "", summary: "" }).question).not.toBe("");
  });
});


describe("recipient and occasion-specific AI interview", () => {
  const context = (occasion: string, relationship = "Friend", recipientName = "Jordan") => ({
    recipientName, relationship, occasion, intent: "I want them to remember how much they matter.",
    answers: [{ question: "What matters?", transcript: "They always made me laugh." }],
  });

  it("starts with a genuinely different question for each occasion", () => {
    const cases = ["Birthday", "Anniversary", "Wedding", "New Baby", "Mother's Day",
      "Father's Day", "Graduation", "Thank You", "Trip / Adventure", "Milestone",
      "Celebration of Life", "Family Memories", "Just Because", "Other"];
    const prompts = cases.map(occasion => getOpeningInterviewQuestion(context(occasion)));
    expect(new Set(prompts).size).toBe(cases.length);
    for (const prompt of prompts) {
      expect(prompt).toContain("Jordan");
      expect(prompt.endsWith("?")).toBe(true);
    }
  });

  it("treats a spouse's anniversary differently from a friend's anniversary", () => {
    expect(getOpeningInterviewQuestion(context("Anniversary", "Spouse / Partner"))).toContain("Looking back");
    expect(getOpeningInterviewQuestion(context("Anniversary", "Friend"))).not.toContain("Looking back");
    expect(getInterviewGuidance(context("Anniversary", "Friend"))).toContain("Do not assume a romantic partnership");
  });

  it("does not assume a New Baby recipient is necessarily the baby", () => {
    expect(getOpeningInterviewQuestion(context("New Baby", "Child"))).toContain("beginning of their story");
    expect(getOpeningInterviewQuestion(context("New Baby", "Friend"))).toContain("welcoming this new baby");
  });

  it("keeps remembrance interviews sensitive and non-celebratory", () => {
    expect(classifyInterviewOccasion("In Memory of Dad")).toBe("memorial");
    expect(getOpeningInterviewQuestion(context("Celebration of Life", "Parent"))).toContain("preserve");
    expect(getFallbackInterviewQuestion(8, context("Celebration of Life", "Parent"))).toContain("carry forward");
    expect(getInterviewGuidance(context("Celebration of Life"))).toContain("Never assume the recipient is alive");
  });

  it("adapts custom occasions without turning them into birthdays", () => {
    expect(classifyInterviewOccasion("Retirement celebration")).toBe("retirement");
    expect(classifyInterviewOccasion("Moving away")).toBe("farewell");
    expect(classifyInterviewOccasion("Our cabin weekends")).toBe("custom");
    expect(getInterviewGuidance(context("Our cabin weekends"))).toContain("creator's own occasion");
  });

  it("preserves context in early-ending fallback and the 8–10 question bound", () => {
    const c = context("Birthday", "Child", "Taylor");
    expect(enforceInterviewStep(1, { done: true, question: "", summary: "" }, c).question)
      .toContain("Taylor");
    expect(enforceInterviewStep(8, { done: true, question: "", summary: "A birthday story" }, c).done).toBe(true);
    expect(enforceInterviewStep(10, { done: false, question: "More?", summary: "" }, c).done).toBe(true);
  });
});
