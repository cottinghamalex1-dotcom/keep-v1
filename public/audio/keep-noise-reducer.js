/* Keep voice cleanup: gentle real-time downward expansion of quiet background.
 * Avoids clipping speech: the floor is learned slowly, release is smooth, and
 * the minimum gain is nonzero. This is not source separation or AI denoising.
 * Runs only in browsers supporting AudioWorklet.
 */
class KeepNoiseReducer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.floor = 0.002;
    this.gain = 1;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output.length) return true;
    if (!input || !input.length) {
      for (const channel of output) channel.fill(0);
      return true;
    }

    let power = 0;
    let count = 0;
    for (const channel of input) {
      for (let i = 0; i < channel.length; i++) {
        power += channel[i] * channel[i];
        count++;
      }
    }
    const rms = Math.sqrt(power / Math.max(1, count));
    if (rms < 0.022 && rms < this.floor * 3) {
      const adaptation = rms < this.floor ? 0.02 : 0.0003;
      this.floor += (Math.max(0.0003, rms) - this.floor) * adaptation;
    }
    const threshold = Math.min(0.014, Math.max(0.0028, this.floor * 2.3));
    const ratio = rms / threshold;
    const target = ratio >= 1.7 ? 1 : ratio <= 0.62 ? 0.34 : 0.34 + (ratio - 0.62) / 1.08 * 0.66;
    for (let channelIndex = 0; channelIndex < output.length; channelIndex++) {
      const destination = output[channelIndex];
      const source = input[Math.min(channelIndex, input.length - 1)];
      for (let i = 0; i < destination.length; i++) {
        this.gain += (target - this.gain) * (target > this.gain ? 0.035 : 0.0035);
        destination[i] = (source ? source[i] : 0) * this.gain;
      }
    }
    return true;
  }
}
registerProcessor("keep-noise-reducer", KeepNoiseReducer);
