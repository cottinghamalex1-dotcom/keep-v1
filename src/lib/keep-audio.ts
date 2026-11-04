export type MusicBalance = "Soft" | "Balanced" | "Full";

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
): ScheduledMusic {
  const cfg = configs[mood] ?? configs["Warm + Nostalgic"]!;
  const levels = balanceLevels[balance] ?? balanceLevels.Balanced!;
  const musicGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cfg.brightness;
  filter.Q.value = 0.35;
  musicGain.connect(filter);
  filter.connect(destination);

  const start = ctx.currentTime + 0.02;
  const total = Math.max(60, introSeconds + voiceDuration + 3.6);
  const voiceEnd = start + introSeconds + Math.max(1, voiceDuration);

  musicGain.gain.cancelScheduledValues(start);
  musicGain.gain.setValueAtTime(0.0001, start);
  musicGain.gain.exponentialRampToValueAtTime(levels.intro, start + 0.8);
  musicGain.gain.setValueAtTime(levels.intro, start + Math.max(0.9, introSeconds - 0.65));
  musicGain.gain.exponentialRampToValueAtTime(levels.under, start + introSeconds + 0.35);
  musicGain.gain.setValueAtTime(levels.under, Math.max(start + introSeconds + 0.4, voiceEnd - 2.4));
  musicGain.gain.exponentialRampToValueAtTime(levels.outro, voiceEnd + 0.55);
  musicGain.gain.setValueAtTime(levels.outro, voiceEnd + 1.8);
  musicGain.gain.exponentialRampToValueAtTime(0.0001, voiceEnd + 3.3);

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
    note(chord[0]! - 12, barStart, beat * 3.85, 0.18, "strings");
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

export function createKeepVoiceMix(audio: HTMLAudioElement, mood: string, balance: MusicBalance, voiceDuration: number, introSeconds = 3.2) {
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

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -25;
  compressor.knee.value = 18;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.24;

  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 1.06;
  const master = ctx.createGain();
  master.gain.value = 0.92;

  source.connect(highpass);
  highpass.connect(presence);
  presence.connect(compressor);
  compressor.connect(voiceGain);
  voiceGain.connect(master);
  master.connect(ctx.destination);

  let music = scheduleMusic(ctx, master, mood, balance, voiceDuration, introSeconds);
  let currentMood = mood;
  let currentBalance = balance;

  return {
    context: ctx,
    play: async () => { if (ctx.state !== "running") await ctx.resume(); },
    pause: async () => { if (ctx.state === "running") await ctx.suspend(); },
    setMuted: (muted: boolean) => {
      const at = ctx.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.92, at, 0.025);
    },
    restartMusic: (nextMood = currentMood, nextBalance = currentBalance) => {
      currentMood = nextMood;
      currentBalance = nextBalance;
      music.stop();
      music = scheduleMusic(ctx, master, currentMood, currentBalance, voiceDuration, introSeconds);
    },
    stop: async () => {
      music.stop();
      try { source.disconnect(); } catch { /* ignore */ }
      try { await ctx.close(); } catch { /* ignore */ }
    },
  };
}

let activeSample: { context: AudioContext; music: ScheduledMusic; timer: number } | null = null;

export async function playMusicSample(mood: string, seconds = 9) {
  stopMusicSample();
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
  if (!activeSample) return;
  window.clearTimeout(activeSample.timer);
  activeSample.music.stop();
  void activeSample.context.close().catch(() => undefined);
  activeSample = null;
}
