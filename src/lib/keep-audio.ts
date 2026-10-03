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
  const total = Math.max(14, introSeconds + voiceDuration + 3.6);
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

  const nodes: OscillatorNode[] = [];
  const voices = 4;
  for (let voice = 0; voice < voices; voice++) {
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    osc.type = cfg.waveform;
    osc.detune.value = (voice - 1.5) * 2.5;
    voiceGain.gain.value = voice === 0 ? 0.48 : voice === 3 ? 0.28 : 0.36;
    osc.connect(voiceGain);
    voiceGain.connect(musicGain);

    const chordCount = Math.ceil(total / cfg.chordSeconds) + 2;
    for (let c = 0; c < chordCount; c++) {
      const chord = cfg.chords[c % cfg.chords.length]!;
      const note = chord[Math.min(voice, chord.length - 1)]!;
      const at = start + c * cfg.chordSeconds;
      if (c === 0) osc.frequency.setValueAtTime(midiHz(note), at);
      else osc.frequency.exponentialRampToValueAtTime(midiHz(note), at + 0.18);
    }
    osc.start(start);
    osc.stop(start + total + 0.2);
    nodes.push(osc);
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
