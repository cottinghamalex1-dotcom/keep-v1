import { describe, expect, it } from "vitest";
import { KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS } from "@/lib/keep-audio";
import { buildKeepRenderPlan, type RenderInput } from "@/lib/keep-render-plan";

const makeInput = (): RenderInput => ({
  voicePath: "owner/publications/keep/rev/voice",
  voiceDuration: 150,
  memories: [
    { id: "first", kind: "image", source: "upload", storagePath: "owner/publications/keep/rev/first", displayDurationSec: 3 },
    { id: "middle", kind: "video", source: "upload", storagePath: "owner/publications/keep/rev/middle", displayDurationSec: 5, videoStartSec: 1.5, videoDurationSec: 5 },
    { id: "last", kind: "image", source: "upload", storagePath: "owner/publications/keep/rev/last", displayDurationSec: 2, transition: "cut" },
  ],
  captionCues: [{ text: "first spoken word", start: 0, end: 2 }, { text: "last spoken word", start: 148, end: 150 }],
  captionStyle: "Reel",
  visualStyle: "Natural",
  musicMood: "Warm + Nostalgic",
  voiceMusicBalance: "Balanced",
  voiceVolume: 60,
  musicVolume: 60,
});

describe("Keep fully rendered film edit decision list", () => {
  it("uses one master clock, including a music-only lead and tail", () => {
    const plan = buildKeepRenderPlan(makeInput());
    expect(plan.voice.startSec).toBe(KEEP_MUSIC_LEAD_SECONDS);
    expect(plan.voice.endSec).toBe(KEEP_MUSIC_LEAD_SECONDS + 150);
    expect(plan.durationSec).toBe(KEEP_MUSIC_LEAD_SECONDS + 150 + KEEP_MUSIC_TAIL_SECONDS);
    expect(plan.music.repeatToSec).toBe(plan.durationSec);
    expect(plan.music.envelope.voiceStart).toBe(plan.voice.startSec);
    expect(plan.music.envelope.voiceEnd).toBe(plan.voice.endSec);
    expect(plan.output).toMatchObject({container: "mp4", width: 1080, height: 1920, fps: 30});
  });

  it("covers every millisecond with media, including opening and ending, without black gaps", () => {
    const plan = buildKeepRenderPlan(makeInput());
    expect(plan.scenes[0]?.startSec).toBe(0);
    expect(plan.scenes.at(-1)?.endSec).toBe(plan.durationSec);
    for (let i = 1; i < plan.scenes.length; i++)
      expect(plan.scenes[i]!.startSec).toBeLessThanOrEqual(plan.scenes[i - 1]!.endSec);
    expect(plan.scenes[1]!.startSec).toBeLessThan(plan.scenes[0]!.endSec);
    expect(plan.scenes[2]!.startSec).toBe(plan.scenes[1]!.endSec);
    expect(plan.scenes[1]!.muted).toBe(true);
    expect(plan.scenes[1]!.videoStartSec).toBe(1.5);
  });

  it("offsets burned-in caption timing by music lead, with no captions before speech", () => {
    const plan = buildKeepRenderPlan(makeInput());
    expect(plan.captions[0]).toEqual({text: "first spoken word", startSec: 2.8, endSec: 4.8});
    expect(plan.captions[1]).toEqual({text: "last spoken word", startSec: 150.8, endSec: 152.8});
    expect(buildKeepRenderPlan({...makeInput(), captionStyle:"None"}).captions).toEqual([]);
  });

  it("preserves individually chosen motion, safely reuses music, and rejects missing assets", () => {
    const original = makeInput();
    original.memories[1]!.motion = "right";
    original.musicMood = "Worth Keeping";
    const plan = buildKeepRenderPlan(original);
    expect(plan.scenes[1]!.motion).toBe("right");
    expect(plan.music.sourcePath).toBe("/audio/intentional.mp3");
    expect(() => buildKeepRenderPlan({...original, memories:[]})).toThrow(/memory/);
    expect(() => buildKeepRenderPlan({...original, voiceDuration:0})).toThrow(/voice/);
    expect(() => buildKeepRenderPlan({...original, memories:[{...original.memories[0]!,storagePath:""}]})).toThrow(/memory/);
  });

  it("single image spans whole movie and video sound is never mixed over narration", () => {
    const input = makeInput();
    const plan = buildKeepRenderPlan({...input, memories:[input.memories[1]!]});
    expect(plan.scenes).toHaveLength(1);
    expect(plan.scenes[0]).toMatchObject({startSec:0,endSec:plan.durationSec,muted:true});
  });
});
