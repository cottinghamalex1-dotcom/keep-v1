export const INTERVIEW_MIN_ANSWERS = 8;
export const INTERVIEW_IDEAL_ANSWERS = 9;
export const INTERVIEW_MAX_ANSWERS = 10;

export type InterviewStep = { done: boolean; question: string; summary: string };

const fallbackQuestions = [
  "What has this relationship meant to you over the years?",
  "What is one memory together that always brings a smile to your face?",
  "What is a small, everyday thing about this person that you appreciate?",
  "Can you remember a time when this person made a difference in your life?",
  "What is something about them you wish they could see through your eyes?",
  "How have you grown or changed because of this relationship?",
  "What is something you've wanted to say but haven't said quite this way before?",
  "What moment or detail would you want them to remember most?",
  "What do you hope stays with them long after they hear your words?",
];

/** Enforce 8–10 answered questions even if an upstream LLM ends prematurely.
 * Prefer nine; permit a tenth only when the interviewer finds a real gap. */
export function enforceInterviewStep(answerCount: number, result: InterviewStep): InterviewStep {
  const count = Math.max(0, Math.floor(Number(answerCount) || 0));
  if (count >= INTERVIEW_MAX_ANSWERS) {
    return { done: true, question: "", summary: result.summary?.trim() ?? "" };
  }
  if (count < INTERVIEW_MIN_ANSWERS) {
    const question = !result.done && result.question?.trim()
      ? result.question.trim()
      : fallbackQuestions[Math.min(count - 1, fallbackQuestions.length - 1)] ?? fallbackQuestions[0]!;
    return { done: false, question, summary: "" };
  }
  if (result.done || !result.question?.trim()) {
    return { done: true, question: "", summary: result.summary?.trim() ?? "" };
  }
  return { done: false, question: result.question.trim(), summary: "" };
}
