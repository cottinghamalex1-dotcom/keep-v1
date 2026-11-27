import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeTimedAudio } from "@/lib/keep-ai";

function fakeVoice(duration: number, silent = false) {
  const sampleRate = 16000;
  const channel = new Float32Array(duration * sampleRate);
  if (!silent) channel.fill(0.1);
  const decode = vi.fn(async () => ({
    duration, sampleRate, numberOfChannels: 1, length: channel.length,
    getChannelData: () => channel,
  }));
  const close = vi.fn(async () => {});
  class FakeAudioContext { decodeAudioData = decode; close = close; }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  const blob = new Blob(["synthetic voice"], {type: "audio/wav"});
  // jsdom's Blob has no arrayBuffer in some versions.
  Object.defineProperty(blob, "arrayBuffer", {value: async () => new ArrayBuffer(1)});
  return {blob, close};
}
type Word = {word: string; start: number; end: number};
const response = (words: Word[]) => new Response(JSON.stringify({ transcript: words.map(w => w.word).join(" "), words }));
const valid = (word: string) => [{word, start: 0.4, end: 0.8}, {word:"spoken",start:1.2,end:1.6}];
const bad = () => Array.from({length: 12}, (_, i) => ({word:`wrong${i}`, start:1, end:1}));

describe("long Keep caption transcription", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("retries only the failed section as shorter clips at the original recording offsets", async () => {
    const {blob, close} = fakeVoice(54);
    const filenames: string[] = [];
    const sizes: number[] = [];
    const prompts: unknown[] = [];
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const fd = init.body as FormData;
      const file = fd.get("file") as File;
      filenames.push(file.name);
      sizes.push(file.size);
      prompts.push(fd.get("prompt"));
      return response(file.name === "keep-voice-2.wav" ? bad() : valid(file.name));
    });
    vi.stubGlobal("fetch", fetch);
    const progress = vi.fn();
    const result = await transcribeTimedAudio(blob, "audio/wav", "full script opening", progress);
    expect(filenames).toEqual(["keep-voice-1.wav", "keep-voice-2.wav", "keep-voice-2-a.wav", "keep-voice-2-b.wav", "keep-voice-3.wav"]);
    expect(prompts.every(p => p === null)).toBe(true);
    expect(sizes[2]! + sizes[3]! - 44).toBe(sizes[1]);
    expect(result.audioDurationSec).toBe(54);
    expect(result.words.filter(w => w.word.startsWith("keep-voice")).map(w => w.start)).toEqual([0.4,18.4,27.4,36.4]);
    expect(result.transcript).not.toContain("wrong");
    expect(progress.mock.calls).toEqual([[0,3],[1,3],[2,3],[3,3]]);
    expect(close).toHaveBeenCalledOnce();
  });
  it("uses the nearby timestamp anchor to repair an isolated zero-duration word", async () => {
    const {blob} = fakeVoice(10);
    const first = [{word:"The",start:0.3,end:0.3},{word:"words",start:0.65,end:0.9},{word:"are",start:1.3,end:1.4},{word:"here",start:1.8,end:2.2}];
    const fetch = vi.fn(async () => response(first));
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(fetch).toHaveBeenCalledOnce();
    expect(result.words[0]).toEqual({word:"The",start:0.3,end:0.42});
    expect(result.words.slice(1)).toEqual(first.slice(1));
  });
  it("rejects unresolved collapsed timestamps instead of inventing uniformly spaced captions", async () => {
    const {blob} = fakeVoice(10);
    const fetch = vi.fn(async () => response(bad()));
    vi.stubGlobal("fetch",fetch);
    await expect(transcribeTimedAudio(blob,"audio/wav")).rejects.toThrow("section 1 of 1");
    expect(fetch.mock.calls.length).toBeLessThanOrEqual(7);
  });
  it("does not invent words for a silent recording", async () => {
    const {blob} = fakeVoice(10,true);
    const fetch = vi.fn();
    vi.stubGlobal("fetch",fetch);
    await expect(transcribeTimedAudio(blob,"audio/wav")).rejects.toThrow("No spoken words");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retries a bad short recording without the script prompt", async () => {
    const {blob} = fakeVoice(7);
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const fd = init.body as FormData;
      return response(fd.has("prompt") ? bad() : valid("correct"));
    });
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav","script");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.transcript).toBe("correct spoken");
  });
});
