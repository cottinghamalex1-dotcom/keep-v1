import { describe, expect, it } from "vitest";
import { enforceInterviewStep, INTERVIEW_MIN_ANSWERS, INTERVIEW_IDEAL_ANSWERS, INTERVIEW_MAX_ANSWERS } from "../../supabase/functions/keep-ai/interview-policy";

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
