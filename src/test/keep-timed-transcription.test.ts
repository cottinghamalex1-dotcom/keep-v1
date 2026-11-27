import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeTimedAudio } from "@/lib/keep-ai";
import { captionTimingIsBroken, groupTimedWords } from "@/lib/keep-caption-timing";

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
  it("handles an isolated zero-length word sharing its neighbor's actual start", async () => {
    const {blob} = fakeVoice(10);
    const first = [
      ...Array.from({length:10}, (_,i) => ({word:`word${i}`,start:i*0.4,end:i*0.4+0.3})),
      {word:"we",start:5.76,end:5.76},
      {word:"will",start:5.76,end:5.98},
      {word:"pause",start:5.98,end:6.26},
    ];
    const fetch = vi.fn(async () => response(first));
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(fetch).toHaveBeenCalledOnce();
    expect(result.words[10]!.start).toBe(5.76);
    expect(result.words[10]!.end).toBeCloseTo(5.833,3);
    expect(result.words[11]!.start).toBe(result.words[10]!.end);
    expect(result.words[11]!.end).toBe(5.98);
    expect(result.words[12]).toEqual(first[12]);
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

  it("recovers section 3 of a seven-section voice using measured phrase boundaries, not estimated words", async () => {
    const {blob} = fakeVoice(120);
    const files: string[] = [];
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const fd = init.body as FormData;
      const name = (fd.get("file") as File).name;
      files.push(name);
      if (name !== "keep-voice-3.wav") return response(valid(name));
      const segments = [{text:"I remember that day.",start:0.7,end:2.85},{text:"You were always there.",start:7.1,end:9.4}];
      const transcript = segments.map(s => s.text).join(" ");
      return new Response(JSON.stringify({transcript,words:transcript.split(" ").map(word=>({word,start:1,end:1})),segments}));
    });
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(files).toEqual(Array.from({length:7},(_,i)=>`keep-voice-${i+1}.wav`));
    const phrases = result.words.filter(w=>w.phrase);
    expect(phrases).toEqual([
      {word:"I remember that day.",start:36.7,end:38.85,phrase:true},
      {word:"You were always there.",start:43.1,end:45.4,phrase:true},
    ]);
    for (const limit of [2,5,8]) {
      const cues = groupTimedWords(result.words, limit);
      expect(cues).toContainEqual({text:"I remember that day.",start:36.7,end:38.85});
      expect(cues).toContainEqual({text:"You were always there.",start:43.1,end:45.4});
      expect(captionTimingIsBroken(result.words,cues,120)).toBe(false);
    }
  });
  it("prefers usable individual word timestamps over a phrase", async () => {
    const {blob} = fakeVoice(6);
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      transcript:"correct spoken",words:valid("correct"),segments:[{text:"correct spoken",start:0.2,end:1.8}]
    })));
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(result.words).toEqual(valid("correct"));
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("requests segment-only timing if both timestamp streams initially fail", async () => {
    const {blob} = fakeVoice(6);
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const fd = init.body as FormData;
      const transcript = "You were always there.";
      return new Response(JSON.stringify({transcript,words:bad(),
        segments:[{text:transcript,start:0.6,end:fd.get("timing")==="segment"?3:0.6}]}));
    });
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.words).toEqual([{word:"You were always there.",start:0.6,end:3,phrase:true}]);
  });
  it("rejects invalid or incomplete measured phrases", async () => {
    const {blob} = fakeVoice(6);
    for (const segments of [
      [{text:"You were there.",start:0.5,end:0.5}],
      [{text:"You were there.",start:3,end:1}],
      [{text:"You were there.",start:1,end:20}],
      [{text:"You were",start:0.5,end:1}],
      [{text:"You were",start:0.5,end:3},{text:"there.",start:1,end:4}],
    ]) {
      const fetch = vi.fn(async () => new Response(JSON.stringify({transcript:"You were there.",words:bad(),segments})));
      vi.stubGlobal("fetch",fetch);
      await expect(transcribeTimedAudio(blob,"audio/wav")).rejects.toThrow("section 1 of 1");
    }
  });
  it("preserves an actual pause when the recognizer explicitly confirms no speech in a section", async () => {
    const {blob} = fakeVoice(54);
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const name = ((init.body as FormData).get("file") as File).name;
      return name==="keep-voice-2.wav" ? new Response(JSON.stringify({transcript:"",words:[],segments:[],noSpeech:true})) : response(valid(name));
    });
    vi.stubGlobal("fetch",fetch);
    const result = await transcribeTimedAudio(blob,"audio/wav");
    expect(result.words.map(w=>w.start)).toEqual([0.4,1.2,36.4,37.2]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("does not skip a section when its no-speech metadata is missing or inconsistent", async () => {
    const {blob} = fakeVoice(6);
    const fetch = vi.fn(async () => new Response(JSON.stringify({transcript:"words",words:[],segments:[],noSpeech:true})));
    vi.stubGlobal("fetch",fetch);
    await expect(transcribeTimedAudio(blob,"audio/wav")).rejects.toThrow("section 1 of 1");
  });
});
