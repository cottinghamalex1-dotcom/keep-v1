import type { AudioMix, VoiceTone } from "./keep-project";

export type MusicBalance = "Soft" | "Balanced" | "Full";
type MixOptions = Partial<AudioMix>;

type MusicConfig = {
  chords: number[][];
  waveform: OscillatorType;
  chordSeconds: number;
  brightness: number;
};

const configs: Record<string, MusicConfig> = {
  "Warm + Nostalgic": { chords: [[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]], waveform: "sine", chordSeconds: 4.8, brightness: 1250 },
  "Joyful": { chords: [[48,55,60,64],[53,60,65,69],[45,52,57,60],[55,62,67,71]], waveform: "triangle", chordSeconds: 3.4, brightness: 1800 },
  "Cinematic": { chords: [[45,52,57,60],[41,48,53,57],[48,55,60,64],[43,50,55,59]], waveform: "sine", chordSeconds: 5.8, brightness: 950 },
  "Romantic": { chords: [[48,55,60,64],[52,59,64,67],[45,52,57,60],[53,60,65,69]], waveform: "sine", chordSeconds: 5.2, brightness: 1150 },
  "Hopeful": { chords: [[48,55,60,64],[55,62,67,71],[45,52,57,60],[53,60,65,69]], waveform: "triangle", chordSeconds: 4.2, brightness: 1550 },
  "Playful": { chords: [[60,64,67,72],[62,65,69,74],[57,60,64,69],[55,59,62,67]], waveform: "triangle", chordSeconds: 2.8, brightness: 2100 },
  "Reflective": { chords: [[45,52,57,60],[48,55,60,64],[41,48,53,57],[43,50,55,59]], waveform: "sine", chordSeconds: 6.2, brightness: 850 },
  "Acoustic": { chords: [[48,55,60,64],[43,50,55,59],[45,52,57,60],[41,48,53,57]], waveform: "triangle", chordSeconds: 4.4, brightness: 1450 },
  "Piano": { chords: [[48,55,60,64],[45,52,57,60],[53,60,65,69],[43,50,55,59]], waveform: "sine", chordSeconds: 4.0, brightness: 1350 },
};

const balanceLevels: Record<string, { intro: number; under: number; outro: number }> = {
  Soft: { intro: 0.105, under: 0.026, outro: 0.075 },
  Balanced: { intro: 0.145, under: 0.045, outro: 0.11 },
  Full: { intro: 0.19, under: 0.072, outro: 0.15 },
};

/** The same audio envelope is used in Watch and Listen, including the supplied MP3. */
export const KEEP_MUSIC_LEAD_SECONDS = 2.8;
export const KEEP_MUSIC_TAIL_SECONDS = 4.5;

export function musicEnvelope(introSeconds: number, voiceDuration: number, fadeInSeconds = 2.5, fadeOutSeconds = 3) {
  const intro = Math.max(0, introSeconds);
  const voiceEnd = intro + Math.max(1, voiceDuration);
  return {
    introPeak: Math.min(Math.max(0.25, intro - 0.55), Math.max(0.25, Math.min(1.35, fadeInSeconds * 0.4))),
    duckStart: Math.max(Math.min(Math.max(0.25, intro - 0.55), Math.max(0.25, Math.min(1.35, fadeInSeconds * 0.4))) + 0.05, intro - 0.45),
    duckEnd: Math.max(intro + 0.38, Math.max(0.25, intro - 0.55) + 0.35),
    voiceStart: intro,
    voiceEnd,
    outroRise: voiceEnd + 0.72,
    outroFadeStart: voiceEnd + Math.max(0.8, KEEP_MUSIC_TAIL_SECONDS - Math.max(1.1, Math.min(3.7, fadeOutSeconds))),
    outroEnd: voiceEnd + KEEP_MUSIC_TAIL_SECONDS,
  };
}

/** Music opens alone, ducks under the voice, then lifts and fades after the last word. */
function applyMusicEnvelope(gain: AudioParam, start: number, intro: number, duration: number, introLevel: number, underLevel: number, outroLevel: number, options: MixOptions) {
  const e = musicEnvelope(intro, duration, options.fadeIn, options.fadeOut);
  gain.cancelScheduledValues(start);
  gain.setValueAtTime(0, start);
  gain.linearRampToValueAtTime(introLevel, start + e.introPeak);
  gain.setValueAtTime(introLevel, start + e.duckStart);
  gain.linearRampToValueAtTime(underLevel, start + e.duckEnd);
  gain.setValueAtTime(underLevel, start + e.voiceEnd);
  gain.linearRampToValueAtTime(outroLevel, start + e.outroRise);
  gain.setValueAtTime(outroLevel, start + e.outroFadeStart);
  gain.linearRampToValueAtTime(0, start + e.outroEnd);
}

const midiHz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

type ScheduledMusic = {
  gain: GainNode;
  nodes: OscillatorNode[];
  stop: () => void;
};

function scheduleMusic(
  ctx: AudioContext,
  destination: AudioNode,
  mood: string,
  balance: MusicBalance,
  voiceDuration: number,
  introSeconds = 3.2,
  options: MixOptions = {},
): ScheduledMusic {
  const cfg = configs[mood] ?? configs["Warm + Nostalgic"]!;
  const levels = balanceLevels[balance] ?? balanceLevels["Balanced"]!;
  const musicGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cfg.brightness;
  filter.Q.value = 0.35;
  musicGain.connect(filter);
  filter.connect(destination);

  const start = ctx.currentTime + 0.02;
  const total = Math.max(20, introSeconds + voiceDuration + KEEP_MUSIC_TAIL_SECONDS + 0.2);
  const under = options.ducking === false ? levels.intro * 0.75 : levels.under;
  applyMusicEnvelope(musicGain.gain, start, introSeconds, voiceDuration, levels.intro, under, levels.outro, options);

  // "Worth Keeping": original 60-second instrumental arrangement in C major / A minor.
  // Layered, individually enveloped piano notes, arpeggios, and gentle string swells
  // replace the old four continuously running oscillators (which sounded like a drone).
  const nodes: OscillatorNode[] = [];
  const beat = 0.625; // 96 BPM; 24 bars of 4 beats = 60 seconds
  const bars = Math.ceil(total / (beat * 4)) + 1;
  const progression = [
    [48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59],
    [48, 55, 60, 64], [45, 52, 57, 60], [53, 60, 65, 69], [43, 50, 55, 59],
  ];
  const melody = [76, 74, 72, 71, 72, 76, 79, 76, 74, 72, 69, 71, 72, 74, 76, 72,
                  76, 79, 81, 79, 76, 74, 72, 71, 69, 72, 74, 76, 72, 71, 69, 67];
  const note = (pitch: number, at: number, length: number, volume: number, timbre: "piano" | "strings") => {
    if (at > start + total) return;
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    osc.type = timbre === "piano" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(midiHz(pitch), at);
    if (timbre === "piano") {
      osc.frequency.exponentialRampToValueAtTime(midiHz(pitch) * 0.9995, at + 0.08);
      voiceGain.gain.setValueAtTime(0.0001, at);
      voiceGain.gain.exponentialRampToValueAtTime(volume, at + 0.018);
      voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.26), at + Math.min(length * 0.6, 0.85));
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    } else {
      voiceGain.gain.setValueAtTime(0.0001, at);
      voiceGain.gain.linearRampToValueAtTime(volume, at + Math.min(0.75, length * 0.35));
      voiceGain.gain.setValueAtTime(volume, at + Math.max(0.8, length * 0.7));
      voiceGain.gain.linearRampToValueAtTime(0.0001, at + length);
    }
    osc.connect(voiceGain);
    voiceGain.connect(musicGain);
    osc.start(at);
    osc.stop(at + length + 0.02);
    nodes.push(osc);
  };
  for (let bar = 0; bar < bars; bar++) {
    const chord = progression[bar % progression.length]!;
    const barStart = start + bar * beat * 4;
    // Gentle bass notes and chord pads, deliberately restrained under speech.
    note(chord[0]!, barStart, beat * 3.85, 0.07, "strings");
    for (let k = 1; k < 4; k++) note(chord[k]!, barStart + 0.08, beat * 3.7, 0.065, "strings");
    // Broken piano chords create movement and clear harmonic changes.
    const pattern = [0, 2, 1, 3, 1, 2, 3, 1];
    for (let i = 0; i < 8; i++) {
      const pitch = chord[pattern[i]!]! + (i >= 4 ? 12 : 0);
      note(pitch, barStart + i * beat * 0.5, beat * 1.2, 0.19, "piano");
    }
    // A sparse original melody; leave intentional gaps for the voice.
    if (bar % 4 !== 3) {
      const base = (bar * 2) % melody.length;
      note(melody[base]!, barStart + beat * 0.15, beat * 1.65, 0.12, "piano");
      note(melody[(base + 1) % melody.length]!, barStart + beat * 2.1, beat * 1.5, 0.095, "piano");
    }
  }

  return {
    gain: musicGain,
    nodes,
    stop: () => {
      for (const node of nodes) {
        try { node.stop(); } catch { /* already stopped */ }
      }
      try { musicGain.disconnect(); } catch { /* ignore */ }
      try { filter.disconnect(); } catch { /* ignore */ }
    },
  };
}

const WORTH_KEEPING_MP3 = "/audio/worth-keeping.mp3";
type MusicBed = { stop: () => void; play?: () => Promise<void>; pause?: () => void };
function createMusicBed(ctx: AudioContext, destination: AudioNode, mood: string, balance: MusicBalance, voiceDuration: number, introSeconds: number, options: MixOptions): MusicBed {
  if (mood !== "Worth Keeping") return scheduleMusic(ctx, destination, mood, balance, voiceDuration, introSeconds, options);
  const audio = new Audio(WORTH_KEEPING_MP3);
  audio.preload = "auto";
  audio.loop = true;
  const source = ctx.createMediaElementSource(audio);
  const gain = ctx.createGain();
  source.connect(gain);
  gain.connect(destination);
  const levels: Record<MusicBalance, number> = { Soft: 0.22, Balanced: 0.32, Full: 0.45 };
  const level = levels[balance] ?? levels.Balanced;
  const under = options.ducking === false ? level * 0.75 : level * 0.36;
  // Don't schedule the envelope before a large MP3 actually begins playing:
  // buffering on iPhone would otherwise consume the music-only introduction.
  gain.gain.value = 0;
  let started = false;
  return {
    play: async () => {
      await audio.play();
      if (!started) {
        started = true;
        applyMusicEnvelope(gain.gain, ctx.currentTime, introSeconds, voiceDuration, level, under, level, options);
      }
    },
    pause: () => audio.pause(),
    stop: () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      source.disconnect();
      gain.disconnect();
    },
  };
}

export function createKeepVoiceMix(audio: HTMLAudioElement, mood: string, balance: MusicBalance, voiceDuration: number, introSeconds = 3.2, initialOptions: MixOptions = {}) {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx: AudioContext = new AudioCtx();
  const source = ctx.createMediaElementSource(audio);
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 78;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.Q.value = 0.75;
  presence.gain.value = 2.2;

  // Gentle, real-time EQ options. This is tonal shaping, not AI denoising.
  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowshelf";
  warmth.frequency.value = 240;
  warmth.gain.value = 0;

  const applyVoiceTone = (tone: VoiceTone = "natural") => {
    const next = tone === "clear" ? { bassCut: 115, clarity: 4.4, warmth: -0.8 }
      : tone === "warm" ? { bassCut: 64, clarity: 1.2, warmth: 2.2 }
      : { bassCut: 78, clarity: 2.2, warmth: 0 };
    const at = ctx.currentTime;
    highpass.frequency.setTargetAtTime(next.bassCut, at, 0.04);
    presence.gain.setTargetAtTime(next.clarity, at, 0.04);
    warmth.gain.setTargetAtTime(next.warmth, at, 0.04);
  };

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -25;
  compressor.knee.value = 18;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.24;

  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 0.6;
  const voiceMute = ctx.createGain();
  const musicMute = ctx.createGain();
  voiceMute.gain.value = initialOptions.voiceMuted ? 0 : 1;
  musicMute.gain.value = initialOptions.musicMuted ? 0 : 1;
  const musicLevel = ctx.createGain();
  musicLevel.gain.value = 1.5;
  const master = ctx.createGain();
  master.gain.value = 0.92;

  source.connect(highpass);
  highpass.connect(presence);
  presence.connect(warmth);
  warmth.connect(compressor);
  compressor.connect(voiceGain);
  applyVoiceTone(initialOptions.voiceTone ?? "natural");
  voiceGain.connect(voiceMute);
  voiceMute.connect(master);
  master.connect(ctx.destination);

  musicLevel.connect(musicMute);
  musicMute.connect(master);
  let options: MixOptions = { ...initialOptions };
  let music = createMusicBed(ctx, musicLevel, mood, balance, voiceDuration, introSeconds, options);
  let currentMood = mood;
  let currentBalance = balance;

  return {
    context: ctx,
    play: async () => { if (ctx.state !== "running") await ctx.resume(); await music.play?.(); },
    pause: async () => { music.pause?.(); if (ctx.state === "running") await ctx.suspend(); },
    setLevels: (voice: number, backing: number) => {
      const v = Math.max(0, Math.min(100, Number.isFinite(voice) ? voice : 60)) / 100;
      const m = Math.max(0, Math.min(100, Number.isFinite(backing) ? backing : 60)) / 100;
      const at = ctx.currentTime;
      voiceGain.gain.setTargetAtTime(v * 1.0, at, 0.025);
      musicLevel.gain.setTargetAtTime(m * 2.5, at, 0.025);
    },
    setVoiceTone: (tone: VoiceTone) => applyVoiceTone(tone),
    setMuted: (muted: boolean) => {
      const at = ctx.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.92, at, 0.025);
    },
    setTrackMutes: (voiceMuted: boolean, musicMuted: boolean) => {
      const at = ctx.currentTime;
      voiceMute.gain.setTargetAtTime(voiceMuted ? 0 : 1, at, 0.03);
      musicMute.gain.setTargetAtTime(musicMuted ? 0 : 1, at, 0.03);
    },
    restartMusic: (nextMood = currentMood, nextBalance = currentBalance, nextOptions: MixOptions = options) => {
      currentMood = nextMood;
      currentBalance = nextBalance;
      options = { ...nextOptions };
      music.stop();
      music = createMusicBed(ctx, musicLevel, currentMood, currentBalance, voiceDuration, introSeconds, options);
      if (ctx.state === "running") void music.play?.().catch(() => undefined);
    },
    stop: async () => {
      music.stop();
      try { source.disconnect(); } catch { /* ignore */ }
      try { await ctx.close(); } catch { /* ignore */ }
    },
  };
}

let activeSample: { context: AudioContext; music: ScheduledMusic; timer: number } | null = null;
let activeFileSample: { audio: HTMLAudioElement; timer: number } | null = null;

export async function playMusicSample(mood: string, seconds = 9) {
  stopMusicSample();
  if (mood === "Worth Keeping") {
    const audio = new Audio(WORTH_KEEPING_MP3);
    audio.preload = "auto";
    audio.volume = 0.65;
    audio.addEventListener("ended", () => stopMusicSample(), { once: true });
    await audio.play();
    const timer = window.setTimeout(() => stopMusicSample(), seconds * 1000);
    activeFileSample = { audio, timer };
    return;
  }
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error("Audio preview isn't supported in this browser.");
  const context: AudioContext = new AudioCtx();
  const output = context.createGain();
  output.gain.value = 1;
  output.connect(context.destination);
  const music = scheduleMusic(context, output, mood, "Full", Math.max(4, seconds - 4), 1.2);
  await context.resume();
  const timer = window.setTimeout(() => stopMusicSample(), seconds * 1000);
  activeSample = { context, music, timer };
}

export function stopMusicSample() {
  if (activeFileSample) {
    window.clearTimeout(activeFileSample.timer);
    activeFileSample.audio.pause();
    activeFileSample.audio.removeAttribute("src");
    activeFileSample.audio.load();
    activeFileSample = null;
  }
  if (!activeSample) return;
  window.clearTimeout(activeSample.timer);
  activeSample.music.stop();
  void activeSample.context.close().catch(() => undefined);
  activeSample = null;
}
