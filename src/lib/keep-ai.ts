// Client for KEEP's guided interview service. Configured via VITE_KEEP_AI_URL / VITE_KEEP_AI_KEY.
const URL_ = (import.meta.env['VITE_KEEP_AI_URL'] as string | undefined) || "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-ai";
const KEY = (import.meta.env['VITE_KEEP_AI_KEY'] as string | undefined) || "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

export const keepAiAvailable = () => !!URL_ && !!KEY;

export type InterviewContext = {
  recipientName: string;
  relationship: string;
  occasion: string;
  intent: string;
  answers: { question: string; transcript: string }[];
};

async function post<T>(body: BodyInit, json: boolean): Promise<T> {
  if (!URL_ || !KEY) throw new Error("unavailable");
  const headers: Record<string, string> = { apikey: KEY };
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(URL_, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchNextQuestion(ctx: InterviewContext) {
  const r = await post<{ done?: boolean; question?: string; summary?: string }>(JSON.stringify({ action: "next_question", ...ctx }), true);
  const done = !!r.done;
  if (!done && !r.question?.trim()) throw new Error("empty question");
  return { done, question: (r.question ?? "").trim(), summary: (r.summary ?? "").trim() };
}

export async function transcribeAudio(blob: Blob, mimeType?: string) {
  const ext = (mimeType ?? blob.type).includes("mp4") ? "m4a" : (mimeType ?? blob.type).includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("action", "transcribe");
  fd.append("file", new File([blob], `answer.${ext}`, { type: blob.type || mimeType || "audio/webm" }));
  const r = await post<{ transcript?: string }>(fd, false);
  return (r.transcript ?? "").trim();
}

export async function fetchDraft(ctx: InterviewContext) {
  const r = await post<{ paragraphs?: string[] }>(JSON.stringify({ action: "draft", ...ctx }), true);
  const paras = (r.paragraphs ?? []).map((p) => String(p).trim()).filter(Boolean);
  if (!paras.length) throw new Error("empty draft");
  return paras;
}
