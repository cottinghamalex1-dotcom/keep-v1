import type { VoiceTone } from "./keep-project";

/**
 * All profiles get automatic rumble removal, broadband noise reduction where
 * AudioWorklet is available, corrective EQ, compression and master limiting.
 * The presets change timbre, never pitch or the words being spoken.
 */
export type VoiceProfile = {
  highpassHz: number;
  lowShelfDb: number;
  lowMidDb: number;
  presenceDb: number;
  highShelfDb: number;
  compressorThreshold: number;
  compressorRatio: number;
  compressorAttack: number;
  compressorRelease: number;
  makeUp: number;
};
export const KEEP_VOICE_PROFILES: Record<VoiceTone, VoiceProfile> = {
  natural: {
    highpassHz: 85, lowShelfDb: 0, lowMidDb: -1.9, presenceDb: 1.9, highShelfDb: 1.0,
    compressorThreshold: -28, compressorRatio: 3.1, compressorAttack: 0.009, compressorRelease: 0.22,
    makeUp: 1.06,
  },
  clear: {
    highpassHz: 116, lowShelfDb: -2.2, lowMidDb: -4.2, presenceDb: 5.6, highShelfDb: 3.6,
    compressorThreshold: -30, compressorRatio: 4.4, compressorAttack: 0.005, compressorRelease: 0.16,
    makeUp: 0.93,
  },
  warm: {
    highpassHz: 65, lowShelfDb: 4.2, lowMidDb: -1.5, presenceDb: 0.9, highShelfDb: -2.7,
    compressorThreshold: -29, compressorRatio: 3.7, compressorAttack: 0.012, compressorRelease: 0.30,
    makeUp: 0.98,
  },
};
