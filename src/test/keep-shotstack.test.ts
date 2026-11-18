import { describe, expect, it } from "vitest";
import { buildKeepRenderPlan, type RenderInput } from "@/lib/keep-render-plan";
import { buildShotstackEdit } from "@/lib/keep-shotstack";
import { keepOpeningLeadSeconds } from "@/lib/keep-opening-timing";

const input: RenderInput = {
  voicePath: "owner/publications/keep/rev/voice",
  voiceDuration: 120,
  memories: [
    { id: "first", kind: "image", source: "upload", storagePath: "owner/publications/keep/rev/memory-0", displayDurationSec: 5 },
    { id: "video", kind: "video", source: "upload", storagePath: "owner/publications/keep/rev/memory-1", displayDurationSec: 5, videoStartSec: 2, transition: "dissolve" },
    { id: "last", kind: "image", source: "upload", storagePath: "owner/publications/keep/rev/memory-2", displayDurationSec: 5 },
  ],
  captionCues: [{ text: "Moments become memories", start: 0, end: 3 }, { text: "Every ending matters", start: 116, end: 120 }],
  captionStyle: "Reel", visualStyle: "Natural",
  musicMood: "Warm + Nostalgic", voiceMusicBalance: "Balanced",
  voiceVolume: 70, musicVolume: 60,
};

describe("Shotstack adapter", () => {
  const render = () => buildShotstackEdit(buildKeepRenderPlan(input), {
    voiceUrl: "https://example.com/voice.mp3",
    musicUrl: "https://example.com/music.mp3",
    musicDurationSec: 60,
    memoryUrls: {
      [input.memories[0]!.storagePath]: "https://example.com/one.jpg",
      [input.memories[1]!.storagePath]: "https://example.com/two.mp4",
      [input.memories[2]!.storagePath]: "https://example.com/three.jpg",
    },
  }, { recipientName: "Dad", openingMessage: "I love you Dad, always.", closingLine: "Until we meet again.", from: "Alex" });

  it("outputs one portrait H264-compatible MP4 edit with a dark title and personalized farewell", () => {
    const edit = render();
    expect(edit.output).toEqual({ format: "mp4", size: { width: 1080, height: 1920 }, fps: 30, quality: "high" });
    expect(edit.timeline.background).toBe("#171311");
    const clips = edit.timeline.tracks.flatMap(t => t.clips);
    expect(clips.some(clip => clip.asset.type === "rich-text" && String(clip.asset.text).includes("A KEEP FOR\nDad"))).toBe(true);
    expect(clips.some(clip => clip.asset.type === "rich-text" && String(clip.asset.text).includes("Until we meet again."))).toBe(true);
    expect(clips.some(clip => clip.asset.type === "shape" && clip.start > 100)).toBe(true);
  });

  it("does not show photos before the dedication and aligns narration and captions", () => {
    const edit = render();
    const intro = keepOpeningLeadSeconds("I love you Dad, always.", true);
    const clips = edit.timeline.tracks.flatMap(t => t.clips);
    const images = clips.filter(c => c.asset.type === "image" || c.asset.type === "video");
    expect(Math.min(...images.map(c => c.start))).toBeGreaterThanOrEqual(intro - 0.65 - 0.001);
    expect(clips.find(c => c.asset.type === "audio" && c.asset.src === "https://example.com/voice.mp3")?.start).toBe(intro);
    expect(clips.find(c => c.asset.type === "rich-text" && c.asset.text === "Moments become memories")?.start).toBe(intro);
    expect(images.some(c => c.asset.type === "video" && c.asset.volume !== 1)).toBe(true);
  });

  it("loops music through the ending and never allows browser-only asset paths", () => {
    const edit = render();
    const clips = edit.timeline.tracks.flatMap(t => t.clips);
    const music = clips.filter(c => c.asset.src === "https://example.com/music.mp3");
    expect(music).toHaveLength(3);
    expect(music[0]?.start).toBe(0);
    expect(music.at(-1)!.start + music.at(-1)!.length).toBeGreaterThan(120);
    expect(() => buildShotstackEdit(buildKeepRenderPlan(input), { voiceUrl: "https://example.com/voice.mp3", memoryUrls: {} }, {recipientName:"Dad"})).toThrow(/secure Shotstack memory URL/);
  });
});
