type KeepRenderPlan = {
  durationSec: number;
  voice: {startSec:number;endSec:number;volume:number;muted:boolean};
  music: {volume:number;balance:string;muted:boolean};
  scenes: Array<{sourcePath:string;kind:"image"|"video";startSec:number;endSec:number;dissolveInSec:number;dissolveOutSec:number;videoStartSec:number;motion:"in"|"out"|"left"|"right";focusX:number;focusY:number}>;
  captions:Array<{text:string;startSec:number;endSec:number}>;
  captionStyle:string;captionPosition:"top"|"middle"|"bottom";
};
function keepOpeningLeadSeconds(message:string|undefined,cinematic:boolean):number {
  return cinematic ? Math.min(14, Math.max(7.5, 5.5 + (message??"").trim().length/26)) : 2.8;
}

/**
 * Shotstack Edit API adapter. Produces an edit payload, NOT a rendered video.
 * Invoke Shotstack only from a trusted server; temporary signed sources and API
 * keys must never be included in a client bundle or published JSON manifest.
 */
export type ShotstackSources = {
  voiceUrl: string;
  musicUrl?: string;
  /** Measured MP3 duration: required for seamless repeated audio clips. */
  musicDurationSec?: number;
  memoryUrls: Record<string, string>;
};
type Clip = {
  asset: Record<string, unknown>;
  start: number;
  length: number;
  fit?: string;
  effect?: string;
  position?: string;
  offset?: { x: number; y: number };
  transition?: { in?: string; out?: string };
};
export type ShotstackEdit = {
  timeline: { background: string; tracks: Array<{ clips: Clip[] }> };
  output: { format: "mp4"; size: { width: 720; height: 1280 }; fps: 30; quality: "medium"; destinations: [{provider:"shotstack";exclude:true}] };
};
const round = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const url = (value: string | undefined, name: string) => {
  if (!value || !/^https:\/\//i.test(value)) throw new Error("Missing secure Shotstack " + name + " URL.");
  return value;
};
const textClip = (text: string, start: number, length: number, size: number, position = "center"): Clip => ({
  asset: {
    type: "rich-text", text,
    font: { family: "Georgia", size, color: "#F5EDE5", weight: "400" },
    align: { horizontal: "center", vertical: "middle" },
    shadow: { offsetX: 1, offsetY: 2, blur: 6, color: "#171311", opacity: 0.75 },
  },
  position, start: round(start), length: round(length), transition: { in: "fade", out: "fade" },
});
const motion = (name: string) => ({
  in: "zoomInSlow", out: "zoomOutSlow", left: "slideLeftSlow", right: "slideRightSlow",
}[name as "in" | "out" | "left" | "right"] ?? "zoomInSlow");

export function buildShotstackEdit(
  plan: KeepRenderPlan,
  sources: ShotstackSources,
  personalization: { recipientName: string; openingMessage?: string; closingLine?: string; from?: string },
): ShotstackEdit {
  if (!plan.scenes.length || plan.durationSec <= 0) throw new Error("No Keep scenes to render.");
  const intro = keepOpeningLeadSeconds(personalization.openingMessage, true);
  const delta = intro - plan.voice.startSec;
  const voiceEnd = plan.voice.endSec + delta;
  const filmEnd = plan.durationSec + delta;
  const tail = Math.max(0, filmEnd - voiceEnd);
  const images: Clip[][] = [[], []];
  plan.scenes.forEach((scene, index) => {
    const signed = url(sources.memoryUrls[scene.sourcePath], "memory");
    const start = index === 0 ? intro - 0.65 : scene.startSec + delta;
    const end = scene.endSec + delta;
    if (end <= start) throw new Error("A Keep scene has no duration.");
    images[index % 2]!.push({
      asset: scene.kind === "video"
        ? { type: "video", src: signed, trim: scene.videoStartSec, volume: 0, transcode: true }
        : { type: "image", src: signed },
      start: round(start), length: round(end - start), fit: "crop",
      effect: scene.kind === "image" ? motion(scene.motion) : undefined,
      offset: { x: round(clamp((scene.focusX - 50) / 250, -0.2, 0.2)), y: round(clamp((50 - scene.focusY) / 250, -0.2, 0.2)) },
      transition: {
        in: index === 0 || scene.dissolveInSec > 0 ? "fade" : "none",
        out: scene.dissolveOutSec > 0 ? "fade" : "none",
      },
    });
  });

  const captions: Clip[] = plan.captions.map(cue => textClip(
    cue.text, cue.startSec + delta, cue.endSec - cue.startSec,
    plan.captionStyle === "Film" ? 56 : plan.captionStyle === "Minimal" ? 38 : 46,
    plan.captionPosition === "top" ? "top" : plan.captionPosition === "middle" ? "center" : "bottom",
  ));

  const introText = (personalization.recipientName.trim() || "You") +
    (personalization.openingMessage?.trim() ? "\n\n" + personalization.openingMessage.trim() : "");
  const opening: Clip[] = [textClip("A KEEP FOR\n" + introText, 0.5, Math.max(1, intro - 0.5), 58)];
  const closing: Clip[] = tail > 1 ? [
    {
      asset: { type: "shape", shape: "rectangle", rectangle: { width: 1080, height: 1920 }, fill: { color: "#171311", opacity: 1 } },
      start: round(voiceEnd + 0.55), length: round(Math.max(0.1, tail - 0.55)),
      transition: { in: "fade", out: "none" },
    },
    textClip((personalization.closingLine?.trim() || "You are so loved.") +
      (personalization.from?.trim() ? "\n\nWith love, " + personalization.from.trim() : ""),
      voiceEnd + 0.9, Math.max(0.5, tail - 1), 54),
  ] : [];

  const tracks: Array<{ clips: Clip[] }> = [
    { clips: captions },
    { clips: opening },
    { clips: closing.slice(1) },
    { clips: closing.slice(0, 1) },
    { clips: images[1]! },
    { clips: images[0]! },
  ];
  if (!plan.voice.muted) tracks.push({ clips: [{
    asset: { type: "audio", src: url(sources.voiceUrl, "voice"), volume: clamp(plan.voice.volume, 0, 1) },
    start: round(intro), length: round(plan.voice.endSec - plan.voice.startSec),
  }] });
  if (!plan.music.muted) {
    if (!sources.musicDurationSec || sources.musicDurationSec < 5)
      throw new Error("Measured soundtrack duration is required to safely loop Shotstack audio.");
    const loopLength = round(sources.musicDurationSec);
    const musicUrl = url(sources.musicUrl, "music");
    const clips: Clip[] = [];
    const balance = plan.music.balance === "Soft" ? 0.45 : plan.music.balance === "Full" ? 0.8 : 0.6;
    const peak = clamp(plan.music.volume * balance, 0, 1);
    const envelope = (time: number) => {
      if (time <= 0) return 0;
      if (time < 1) return peak * time;
      if (time < intro - 0.5) return peak;
      if (time < intro + 0.5) return peak * (1 - 0.7 * (time - (intro - 0.5)));
      if (time < voiceEnd) return peak * 0.3;
      if (time < voiceEnd + 0.8) return peak * (0.3 + (time - voiceEnd) / 0.8 * 0.7);
      return peak * clamp((filmEnd - time) / Math.max(1, tail - 0.8), 0, 1);
    };
    for (let start = 0; start < filmEnd - 0.01; start += loopLength) {
      const length = Math.min(loopLength, filmEnd - start);
      const cuts = [start, start + length, 1, intro - 0.5, intro + 0.5, voiceEnd, voiceEnd + 0.8]
        .filter(v => v >= start && v <= start + length).sort((a, b) => a - b);
      const uniqueCuts = [...new Set(cuts)];
      const volumeTweens = uniqueCuts.slice(1).map((to, i) => {
        const from = uniqueCuts[i]!;
        return { from: round(envelope(from)), to: round(envelope(to)), start: round(from - start), length: round(to - from) };
      }).filter(t => t.length > 0);
      clips.push({ asset: {
        type: "audio", src: musicUrl, volume: volumeTweens.length ? volumeTweens : peak,
      }, start: round(start), length: round(length) });
    }
    tracks.push({ clips });
  }
  return {
    timeline: { background: "#171311", tracks: tracks.filter(track => track.clips.length > 0) },
    output: { format: "mp4", size: { width: 720, height: 1280 }, fps: 30, quality: "medium", destinations: [{provider:"shotstack",exclude:true}] },
  };
}
