import { describe, expect, it } from "vitest";
import { clampCaptionRange, removeEditableMoment, shouldPreserveExistingVoice } from "@/lib/keep-editor-safety";
import { composeSelfieStory } from "@/lib/keep-selfie-story";
import { clearDraft, loadDraft, newProject, saveDraft, preferLocalKeepDraft, type MediaItem } from "@/lib/keep-project";

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
      memories:[textCard,photo("photo-a"),photo("photo-b")],
      readMemoryOrder:["photo-b","words-0","photo-a"] };
    const next = removeEditableMoment(p,"photo-b");
    expect(next.memories.map(m=>m.id)).toEqual(["words-0","photo-a"]);
    expect(next.selfieBaseMedia?.map(m=>m.id)).toEqual(["words-0","photo-a"]);
    expect(next.readMemoryOrder).toEqual(["words-0","photo-a"]);
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

describe("voice restoration when device storage is unavailable", () => {
  it("does not pretend an in-session-only recording can be reopened after refresh", () => {
    try {
      saveDraft({ ...newProject(), active:true,
        finalVoiceRecording:{ audioUrl:"blob:temporary-only", durationSec:85, demo:false } });
      expect(loadDraft()?.finalVoiceRecording).toBeNull();
    } finally { clearDraft(); }
  });
  it("keeps a voice that has an actual saved blob ID", () => {
    try {
      saveDraft({ ...newProject(), active:true,
        finalVoiceRecording:{ audioId:"voice-stored", audioUrl:"blob:temporary", durationSec:85, demo:false } });
      expect(loadDraft()?.finalVoiceRecording?.audioId).toBe("voice-stored");
      expect(loadDraft()?.finalVoiceRecording?.audioUrl).toBeUndefined();
    } finally { clearDraft(); }
  });
});

describe("preserving new voice after failed or delayed cloud upload", () => {
  const base = { ...newProject(), active: true, publicationId: "same-keep",
    messageParagraphs: ["A personal message worth keeping."] };
  const voice = { audioId: "voice-stored", audioUrl: "blob:local-voice", durationSec: 125, mimeType: "audio/mp4", demo: false };

  it("prefers an actual playable local recording over the cloud copy that did not get the voice", () => {
    const local = { ...base, draftSavedAt: 4000, finalVoiceRecording: voice };
    const remote = { ...base, draftSavedAt: 5000, finalVoiceRecording: null };
    expect(preferLocalKeepDraft(local, remote)).toBe(true);
  });

  it("will not treat a missing local blob as a valid recording", () => {
    const local = { ...base, draftSavedAt: 7000, finalVoiceRecording: {...voice, audioUrl: undefined} };
    const remote = { ...base, draftSavedAt: 5000, finalVoiceRecording: voice };
    expect(preferLocalKeepDraft(local, remote)).toBe(false);
  });

  it("never takes a different Keep from localStorage over the requested cloud Keep", () => {
    const local = { ...base, publicationId:"different", finalVoiceRecording:voice };
    expect(preferLocalKeepDraft(local, { ...base, finalVoiceRecording:null })).toBe(false);
  });

  it("selects the newer valid local text draft when both have the same available media", () => {
    expect(preferLocalKeepDraft({...base,draftSavedAt:9000}, {...base,draftSavedAt:4000})).toBe(true);
    expect(preferLocalKeepDraft({...base,draftSavedAt:3000}, {...base,draftSavedAt:4000})).toBe(false);
  });

  it("never replaces a complete cloud copy with a local draft missing a photo", () => {
    const missing = {...base,draftSavedAt:9000,
      memories:[{id:"a",kind:"image" as const,source:"upload" as const,url:""}] };
    const remote = {...base,draftSavedAt:4000,memories:missing.memories.map(m=>({...m,url:"blob:cloud"}))};
    expect(preferLocalKeepDraft(missing, remote)).toBe(false);
  });

  it("only reports local save success after localStorage accepted metadata", () => {
    try {
      const saved = saveDraft({ ...base, finalVoiceRecording:voice });
      expect(saved).toBe(true);
      expect(loadDraft()?.draftSavedAt).toBeGreaterThan(0);
      expect(loadDraft()?.finalVoiceRecording?.audioId).toBe("voice-stored");
    } finally { clearDraft(); }
  });
});

describe("new customer creation defaults", () => {
  it("does not silently select an anniversary before the customer chooses an occasion", () => {
    expect(newProject().occasion).toBe("");
  });
  it("does not put a developer's name or an arbitrary year on a real customer's card", () => {
    expect(newProject().cardEngraving).toEqual(["", "", ""]);
  });
});
