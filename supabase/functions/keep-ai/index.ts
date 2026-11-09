import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const getOutputText = (data: any) => {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of data?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
};

const allowedClientKey = (req: Request) => {
  const presented = req.headers.get("apikey") || "";
  if (!presented) return false;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}";
  let allowed: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    allowed = Object.values(parsed).filter((v): v is string => typeof v === "string");
  } catch { /* ignore */ }
  const legacy = Deno.env.get("SUPABASE_ANON_KEY");
  if (legacy) allowed.push(legacy);
  return allowed.includes(presented);
};

const openAIJson = async ({
  model,
  instructions,
  input,
  name,
  schema,
}: {
  model: string;
  instructions: string;
  input: string;
  name: string;
  schema: Record<string, unknown>;
}) => {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema,
        },
      },
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${raw.slice(0, 800)}`);
  const data = JSON.parse(raw);
  const output = getOutputText(data);
  if (!output) throw new Error("OpenAI returned no text");
  return JSON.parse(output);
};

const normalizeContext = (body: any) => {
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 10).map((a: any) => ({
    question: String(a?.question || "").slice(0, 1000),
    transcript: String(a?.transcript || "").slice(0, 6000),
  })).filter((a: any) => a.transcript.trim()) : [];
  return {
    recipientName: String(body.recipientName || "them").slice(0, 100),
    relationship: String(body.relationship || "").slice(0, 100),
    occasion: String(body.occasion || "").slice(0, 160),
    intent: String(body.intent || "").slice(0, 2500),
    answers,
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!allowedClientKey(req)) return json({ error: "Invalid client key" }, 401);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return json({ error: "AI is not configured yet" }, 503);

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const action = String(form.get("action") || "");
      if (action !== "transcribe" && action !== "transcribe_timed") return json({ error: "Unknown action" }, 400);
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Audio file is required" }, 400);
      if (file.size > 20 * 1024 * 1024) return json({ error: "Audio file is too large" }, 413);

      const aiForm = new FormData();
      aiForm.append("file", file, file.name || "answer.webm");

      if (action === "transcribe_timed") {
        aiForm.append("model", "whisper-1");
        aiForm.append("response_format", "verbose_json");
        aiForm.append("timestamp_granularities[]", "word");
        const prompt = String(form.get("prompt") || "").trim().slice(0, 1200);
        if (prompt) aiForm.append("prompt", prompt);
      } else {
        aiForm.append("model", "gpt-4o-mini-transcribe");
      }

      const ai = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: aiForm,
      });
      const raw = await ai.text();
      if (!ai.ok) return json({ error: "Transcription failed", detail: raw.slice(0, 500) }, 502);
      const data = JSON.parse(raw);

      if (action === "transcribe_timed") {
        const words = Array.isArray(data.words)
          ? data.words.map((w: any) => ({
              word: String(w?.word || "").trim(),
              start: Number(w?.start) || 0,
              end: Number(w?.end) || 0,
            })).filter((w: any) => w.word && w.end >= w.start)
          : [];
        return json({ transcript: String(data.text || "").trim(), words });
      }

      return json({ transcript: String(data.text || "").trim() });
    }

    const body = await req.json();
    const action = String(body.action || "");
    const context = normalizeContext(body);

    if (action === "next_question") {
      const result = await openAIJson({
        model: "gpt-5-mini",
        name: "keep_interview_step",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            done: { type: "boolean" },
            question: { type: "string" },
            summary: { type: "string" },
          },
          required: ["done", "question", "summary"],
        },
        instructions: `You are the invisible interviewer inside KEEP, a product that helps people preserve meaningful words and memories.

Your job is not to sound like an AI, therapist, coach, or questionnaire. Help the creator uncover concrete, emotionally resonant material for a 2–4 minute spoken message to someone they care about.

Rules:
- Ask exactly one question at a time.
- Make every question specific to the recipient, occasion, stated intention, and prior answers.
- Follow meaningful details and emotional rabbit trails instead of marching through a checklist.
- Prefer memories, sensory details, ordinary moments, specific examples, change over time, gratitude, and what the creator hopes the recipient understands.
- Do not invent facts or assume feelings the creator has not expressed.
- Avoid clichés, therapy language, melodrama, and repetitive questions.
- Keep each question warm and conversational, usually one sentence and never more than two.
- The finished message should usually land around 3–4 spoken minutes. Gather enough specific raw material to support roughly 425–550 spoken words without padding.
- Do not finish before 6 substantive answers. Prefer 7–8 questions for a normal KEEP. You may finish at 6 only if the prior answers are unusually detailed and specific. By 9 substantive answers, finish rather than dragging the interview out.
- When there is enough material for a specific, personal message, set done=true, question="", and write a concise 2–4 sentence summary of the emotional through-line in summary.
- Otherwise set done=false, provide the next question, and set summary="".`,
        input: JSON.stringify(context),
      });
      return json(result);
    }

    if (action === "draft") {
      if (!context.answers.length) return json({ error: "Interview answers are required" }, 400);
      const result = await openAIJson({
        model: "gpt-5.1",
        name: "keep_message_draft",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            paragraphs: { type: "array", items: { type: "string" } },
          },
          required: ["paragraphs"],
        },
        instructions: `You are KEEP's writing assistant. Turn the creator's interview into a message they will record in their own voice.

The ideal reaction is: "That's exactly what I meant. I just didn't know how to say it."

Writing rules:
- Write directly to the recipient, not about them.
- Preserve the creator's actual facts, memories, phrases, emotional emphasis, and natural vocabulary.
- Never invent a memory, detail, quote, trait, event, or feeling.
- Keep it personal and conversational, not literary for its own sake.
- Avoid greeting-card clichés, inflated sentiment, therapy language, and generic inspiration.
- Let specific ordinary details do the emotional work.
- Use contractions when natural.
- Create 5–8 short, recordable paragraphs and usually 425–550 words, aiming for about 3–4 minutes spoken at a natural pace.
- Do not pad the message to hit a word count. If the interview genuinely does not support that length, stay shorter rather than inventing or repeating.
- Build toward a strong, simple ending that says what the creator most wants the recipient to know.
- Do not mention KEEP, AI, the interview, or drafting.
- Return only the paragraphs in the required JSON structure.`,
        input: JSON.stringify(context),
      });
      const paragraphs = Array.isArray(result.paragraphs)
        ? result.paragraphs.map((p: unknown) => String(p).trim()).filter(Boolean).slice(0, 8)
        : [];
      if (!paragraphs.length) throw new Error("Draft contained no paragraphs");
      return json({ paragraphs });
    }

    if (action === "revise") {
      const paragraphs = Array.isArray(body.messageParagraphs)
        ? body.messageParagraphs.map((p: unknown) => String(p).trim()).filter(Boolean).slice(0, 12)
        : [];
      if (!paragraphs.length) return json({ error: "Message paragraphs are required" }, 400);

      const paragraphIndex = Math.max(0, Math.min(paragraphs.length - 1, Number(body.paragraphIndex) || 0));
      const scope = body.scope === "message" ? "message" : "section";
      const instruction = String(body.instruction || "").trim().slice(0, 1200);
      if (!instruction) return json({ error: "Revision instruction is required" }, 400);

      const result = await openAIJson({
        model: "gpt-5.1",
        name: "keep_message_revision",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            paragraphs: { type: "array", items: { type: "string" } },
            changedIndexes: { type: "array", items: { type: "integer" } },
            note: { type: "string" },
          },
          required: ["paragraphs", "changedIndexes", "note"],
        },
        instructions: `You are KEEP's deeply attentive writing editor. You help ordinary people say meaningful things beautifully without making them sound like a professional writer or like AI.

You will receive:
- recipient/relationship/occasion/intention
- the creator's actual interview answers, which are your strongest evidence for their voice and memories
- the complete current message
- the paragraph they currently have selected
- revisionScope: either "message" for the entire message or "section" for only the selected section
- a revision request

Non-negotiable rules:
- Preserve the creator's facts, memories, beliefs, emotional meaning, and recognizable voice.
- Never invent a memory, scene, quote, detail, trait, or feeling.
- Use details from the interview when they genuinely deepen the message.
- Prefer specificity over generic sentiment. Let concrete details carry emotion.
- Avoid greeting-card language, therapy language, purple prose, clichés, and generic lines like "I love you and always will" unless those exact words are clearly earned by the creator's own material.
- Do not make every line more dramatic. The goal is truer, clearer, more personal—not more ornate.
- Consider the whole message so every change fits the emotional arc and does not repeat ideas.
- CRITICAL: The user's selected action must have a clearly perceptible effect. Make substantive edits to sentence structure, specificity, emotional meaning, and/or length, rather than tiny synonym substitutions.
- When editing the whole message, make meaningful improvements to at least two paragraphs (typically three or more), unless the request is specifically about the ending.
- When editing one section, make a substantive change to that paragraph, not a one-line cosmetic adjustment. Preserve all other sections verbatim.
- For longer: when enough supported material exists, aim for 25–45% more words than the current message, without unnecessary repetition.
- For more emotional: substantially revise several sentences to make gratitude, vulnerability, meaning, and what is at stake more direct. Be sincere and specific, not melodramatic.
- For more personal: replace vague statements with real names, concrete moments, phrases, and details already provided by the creator; do not invent details.
- For shortening: remove approximately 25–40% of the selected section where possible while retaining the essential meaning.
- If available facts are too thin to support the requested intensity, be transparent in the note and do the strongest truthful revision possible.
- Preserve the same number of paragraphs and paragraph order whenever possible so the user can clearly review your changes.
- If revisionScope is "section", preserve every non-selected paragraph verbatim unless the instruction explicitly requires a neighboring transition to change.
- If revisionScope is "message", you may revise, expand, tighten, reorder, or bridge multiple paragraphs as needed, but preserve the creator's underlying story and facts.
- Keep contractions and natural spoken phrasing. The creator must be able to record this aloud comfortably.
- Return the complete revised paragraph array. Preserve untouched paragraphs verbatim whenever possible.
- changedIndexes must list only the zero-based paragraphs you meaningfully changed.
- note should be one short, warm sentence explaining what you strengthened. Do not mention AI or models.

Special handling:
SECTION scope:
- "Make this sound more like me": use the creator's interview phrasing, cadence, level of formality, and recurring language as evidence. Rewrite the selected paragraph only unless a neighboring sentence must move.
- "Deepen this section": meaningfully rewrite the selected paragraph so it offers more emotional specificity and directness, using facts already present in the interview or message. Avoid token changes; do not manufacture depth.
- "Shorten this section": make the selected paragraph meaningfully tighter while preserving its strongest specific detail and emotional point.
- "Bring in a memory": find a concrete memory from the interview that is not already doing work in the message and weave it naturally into the selected section. If there is no supported memory to add, make no changes and say so in note.

WHOLE MESSAGE scope:
- "Make this longer": make an unmistakable, substantial expansion, ideally 25–45% longer where the provided evidence permits. Add supported emotional connections, meaningful explanations, specific memories, and conversational texture; do not pad, repeat, or invent.
- "Make it more personal": make the whole message feel unmistakably specific to this creator and recipient by using real details, phrases, memories, and relational context from the interview.
- "Make it more emotional": rewrite multiple sentences in multiple paragraphs to express more emotional clarity and vulnerability, connecting specific memories to why they matter. The change should feel immediately noticeable when compared side by side, yet grounded and believable. Never invent feelings or become melodramatic.
- "Make it flow better": improve the structure, transitions, progression, and paragraph order so the message feels like one coherent spoken story. Preserve the strongest specific lines.
- "Strengthen the ending": rewrite the final one or two paragraphs so the ending resolves the central emotional thread and echoes specific material from the creator's story. Avoid a generic declaration pasted onto the end.
- For a custom request, follow it across the requested scope as long as it does not require inventing facts.

The ideal reaction is: "That sounds more like what I was trying to say—but better."`,
        input: JSON.stringify({
          ...context,
          messageParagraphs: paragraphs,
          paragraphIndex,
          selectedParagraph: paragraphs[paragraphIndex] || "",
          instruction,
          revisionScope: scope,
        }),
      });

      const revised = Array.isArray(result.paragraphs)
        ? result.paragraphs.map((p: unknown) => String(p).trim()).filter(Boolean).slice(0, 12)
        : [];
      if (!revised.length) throw new Error("Revision contained no paragraphs");

      // Derive changed paragraphs from actual wording rather than trusting model-reported indexes.
      const changedIndexes = revised.map((p: string, i: number) => p !== paragraphs[i] ? i : -1).filter((i: number) => i >= 0);

      return json({
        paragraphs: revised,
        changedIndexes,
        note: String(result.note || "").trim(),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(detail);
    if (detail.includes("credit_balance_exhausted") || detail.includes("insufficient_quota")) {
      return json({ error: "KEEP's guided interview is temporarily unavailable", code: "AI_CREDITS_EXHAUSTED" }, 503);
    }
    return json({ error: "KEEP couldn't complete that AI step", detail }, 500);
  }
});