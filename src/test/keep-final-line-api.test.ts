import { afterEach, expect, it, vi } from "vitest";
import { fetchClosingSuggestions } from "@/lib/keep-ai";

afterEach(() => vi.unstubAllGlobals());

it("requests three closing ideas from the transcript and the dedicated final-lines service", async () => {
  const options = ["May you remember every ordinary day.", "Thank you for making us a home.", "I treasure the life we share."];
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: options }) });
  vi.stubGlobal("fetch", fetchMock);
  const transcript = ["You make every ordinary day special, and our house feels like home."];
  expect(await fetchClosingSuggestions("Hannah", "Anniversary", transcript)).toEqual(options);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/keep-final-lines$/), expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ action: "closing_suggestions", recipientName: "Hannah", occasion: "Anniversary", messageParagraphs: transcript }),
  }));
});

it("rejects duplicate or over-length suggestions instead of silently replacing words", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions: ["You make us happy.", "You make us happy.", "a".repeat(91)] }) });
  vi.stubGlobal("fetch", fetchMock);
  await expect(fetchClosingSuggestions("Hannah", "Anniversary", ["Our days together are so meaningful to me."])).rejects.toThrow("three personal closing lines");
});
