/**
 * Combine separate, locally recorded voices into one narration.
 * The single WAV output works with Keep's existing player, music mix,
 * caption transcription, and permanent publishing pipeline.
 */
export type JoinedVoices = { blob: Blob; durationSec: number };
export type VoiceLevel = { gain: number; rms: number; peak: number };
/** Match different microphone levels without squashing dynamics or boosting noise excessively. */
export function voiceLevelForSamples(channels: Float32Array[]): VoiceLevel {
  let power=0, count=0, peak=0;
  for(const channel of channels)for(let i=0;i<channel.length;i++){
    const v=channel[i]!;
    if(Math.abs(v)<0.012)continue; // Silence should not drive gain upward.
    power+=v*v;
    count++;
    peak=Math.max(peak,Math.abs(v));
  }
  const rms=count?Math.sqrt(power/count):0;
  if(!rms||!peak)return {gain:1,rms,peak};
  const targetRms=0.105; // comfortable speech bed before the shared mastering chain
  const loudnessGain=Math.max(0.65,Math.min(2.5,targetRms/rms));
  return {gain:Math.min(loudnessGain,0.88/peak),rms,peak};
}

export async function joinKeepVoiceParts(parts: Blob[], gapSeconds = 0.3): Promise<JoinedVoices> {
  if (!parts.length) throw new Error("Record at least one voice before continuing.");
  const Context = window.AudioContext;
  if (!Context) throw new Error("This browser cannot combine voice recordings. Try an updated Safari or Chrome.");
  const context = new Context();
  let buffers: AudioBuffer[];
  try {
    buffers = [];
    for (const part of parts) {
      if (!part.size) throw new Error("One voice recording is empty. Record that part again.");
      buffers.push(await context.decodeAudioData(await part.arrayBuffer()));
    }
  } finally {
    await context.close().catch(() => {});
  }
  const sampleRate = 24000;
  const frameCounts = buffers.map((buffer) => Math.round(buffer.duration * sampleRate));
  const gapFrames = Math.round(Math.max(0, Math.min(gapSeconds, 1)) * sampleRate);
  const totalFrames = frameCounts.reduce((sum, n) => sum + n, 0) + gapFrames * Math.max(0, parts.length - 1);
  if (!totalFrames || totalFrames / sampleRate > 900) throw new Error("These recordings are too long to combine.");
  const bytes = new ArrayBuffer(44 + totalFrames * 2);
  const view = new DataView(bytes);
  const setText = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  setText(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  setText(8, "WAVE");
  setText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  setText(36, "data");
  view.setUint32(40, totalFrames * 2, true);
  let cursor = 44;
  for (let index = 0; index < buffers.length; index++) {
    const buffer = buffers[index]!;
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const frameCount = frameCounts[index]!;
    const level=voiceLevelForSamples(channels);
    const edgeFrames=Math.min(Math.round(sampleRate*0.016),Math.floor(frameCount/4));
    for (let i = 0; i < frameCount; i++) {
      const position = i * buffer.sampleRate / sampleRate;
      const base = Math.min(buffer.length - 1, Math.floor(position));
      const following = Math.min(buffer.length - 1, base + 1);
      const fraction = position - base;
      let sample = 0;
      for (const channel of channels) sample += channel[base]! * (1 - fraction) + channel[following]! * fraction;
      // Gentle fades avoid clicks between contributors' separate recordings.
      const edge=edgeFrames ? Math.min(1,i/edgeFrames,(frameCount-1-i)/edgeFrames) : 1;
      sample = Math.max(-1, Math.min(1,(sample / channels.length)*level.gain*edge));
      view.setInt16(cursor, Math.round(sample < 0 ? sample * 32768 : sample * 32767), true);
      cursor += 2;
    }
    if (index < buffers.length - 1) cursor += gapFrames * 2;
  }
  return { blob: new Blob([bytes], { type: "audio/wav" }), durationSec: totalFrames / sampleRate };
}
