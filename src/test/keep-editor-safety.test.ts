import { describe, expect, it } from "vitest";
import { clampCaptionRange, removeEditableMoment, shouldPreserveExistingVoice } from "@/lib/keep-editor-safety";
import { composeSelfieStory } from "@/lib/keep-selfie-story";
import { newProject, type MediaItem } from "@/lib/keep-project";

const photo = (id: string): MediaItem => ({ id, source:"upload", kind:"image", url:`blob:${id}`, persisted:true });
const selfie: MediaItem = {
  id:"selfie-a",source:"upload",kind:"video",url:"blob:selfie",isSelfie:true,
  selfiePartIndex:0,videoDurationSec:45,displayDurationSec:45
};

describe("editor photo identity and selfie protection", () => {
  it("removes exactly the selected gallery image even when a selfie plays first", () => {
    const base = [photo("photo-a"), photo("photo-b"), photo("photo-c")];
    const p = { ...newProject(), selfieBaseMedia:base, selfieVideos:[selfie],
      memories:composeSelfieStory(base,[selfie],45,newProject()) };
    expect(p.memories[0]?.isSelfie).toBe(true);
    const next = removeEditableMoment(p,"photo-a");
    expect(next.selfieBaseMedia?.map(m=>m.id)).toEqual(["photo-b","photo-c"]);
    expect(next.memories.some(m=>m.id==="photo-a")).toBe(false);
    expect(next.memories.some(m=>m.id==="photo-b")).toBe(true);
    expect(next.memories.some(m=>m.isSelfie)).toBe(true);
  });

  it("removes the intended image when text scenes come earlier in the timeline", () => {
    const textCard: MediaItem = { id:"words-0",source:"text",kind:"image",url:"data:image/svg+xml,test" };
    const p = { ...newProject(), selfieBaseMedia:[textCard,photo("photo-a"),photo("photo-b")],
      memories:[textCard,photo("photo-a"),photo("photo-b")] };
    const next = removeEditableMoment(p,"photo-b");
    expect(next.memories.map(m=>m.id)).toEqual(["words-0","photo-a"]);
    expect(next.selfieBaseMedia?.map(m=>m.id)).toEqual(["words-0","photo-a"]);
  });

  it("refuses to remove selfie footage from the ordinary photo uploader", () => {
    const p = { ...newProject(), selfieBaseMedia:[photo("photo-a")], selfieVideos:[selfie],
      memories:[selfie,photo("photo-a")] };
    expect(removeEditableMoment(p,"selfie-a")).toBe(p);
    expect(removeEditableMoment(p,"photo-not-found")).toBe(p);
  });
});

describe("editing safety", () => {
  it("keeps an existing recording if a new take could not be saved", () => {
    expect(shouldPreserveExistingVoice(true,false)).toBe(true);
    expect(shouldPreserveExistingVoice(true,true)).toBe(false);
    expect(shouldPreserveExistingVoice(false,false)).toBe(false);
  });
  it("keeps manually entered caption times valid and within the narration", () => {
    expect(clampCaptionRange(-50,-3,150)).toEqual({start:0,end:0.1});
    expect(clampCaptionRange(150,151,150)).toEqual({start:149.9,end:150});
    expect(clampCaptionRange(80,40,150)).toEqual({start:80,end:80.1});
    expect(clampCaptionRange(0,10,150)).toEqual({start:0,end:10});
    expect(clampCaptionRange(NaN,Infinity,80)).toEqual({start:0,end:0.1});
  });
});
