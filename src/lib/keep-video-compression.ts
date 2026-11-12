/**
 * Browser-native, local video transcoding for Keep.
 * No footage is transmitted to a third party and no wasm codec bundle is
 * downloaded. The hidden, muted source is drawn into a 720p canvas; the
 * resulting stream is recorded as H.264 MP4 (Safari) or VP8 WebM (Chromium).
 *
 * This is intentionally real-time and feature-detected: unsupported browsers
 * return null, letting the caller safely keep an already-small original.
 */
export const KEEP_VIDEO_COMPRESSION_TRIGGER_BYTES = 5 * 1024 * 1024;
export const KEEP_VIDEO_TARGET_LONG_EDGE = 720;
export const KEEP_VIDEO_BITRATE = 1_450_000;
export const KEEP_VIDEO_FPS = 24;

export function shouldCompressKeepVideo(sizeBytes: number): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > KEEP_VIDEO_COMPRESSION_TRIGGER_BYTES;
}
export function keepCompressedSizeText(before: number, after: number): string {
  if (!before || before <= after) return "Using original video";
  return `${Math.round((1 - after / before) * 100)}% smaller`;
}

function recorderType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return null;
  const candidates = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp8", "video/webm"];
  const probe = document.createElement("video");
  return candidates.find((type) => {
    if (!MediaRecorder.isTypeSupported(type)) return false;
    const basic = type.split(";")[0]!;
    return basic === "video/mp4" || probe.canPlayType(type) !== "" || probe.canPlayType(basic) !== "";
  }) ?? null;
}

/** Re-encode locally, preserving the entire clip and producing NO audio track.
 * Returns null rather than damaging the source when a platform cannot encode.
 */
export async function compressKeepVideo(file: File, duration: number, onProgress?: (percent: number) => void): Promise<File | null> {
  if (!shouldCompressKeepVideo(file.size)) return null;
  if (typeof document === "undefined") return null;
  const type = recorderType();
  if (!type) return null;

  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") return null;
  const src = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.style.cssText = "position:fixed;left:-4px;bottom:0;width:2px;height:2px;opacity:0.001;pointer-events:none;z-index:-1;";
  document.body.appendChild(video);

  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let frame = 0;
  let watchdog = 0;
  try {
    video.src = src;
    video.load();
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { clear(); reject(new Error("Could not decode video")); }, 12000);
      const clear = () => { window.clearTimeout(timeout); video.removeEventListener("loadeddata", ready); video.removeEventListener("error", fail); };
      const ready = () => { clear(); resolve(); };
      const fail = () => { clear(); reject(new Error("Could not decode video")); };
      if (video.readyState >= 2 && video.videoWidth) { clear(); resolve(); return; }
      video.addEventListener("loadeddata", ready, { once: true });
      video.addEventListener("error", fail, { once: true });
    });
    if (!video.videoWidth || !video.videoHeight) throw new Error("Video has no frames");
    const factor = Math.min(1, KEEP_VIDEO_TARGET_LONG_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, 2 * Math.round(video.videoWidth * factor / 2));
    canvas.height = Math.max(2, 2 * Math.round(video.videoHeight * factor / 2));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas encoder unavailable");
    stream = canvas.captureStream(KEEP_VIDEO_FPS);
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: KEEP_VIDEO_BITRATE });

    const chunks: Blob[] = [];
    const result = new Promise<File>((resolve, reject) => {
      let settled = false;
      const done = (error?: Error, compressed?: File) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(watchdog);
        if (error || !compressed) reject(error ?? new Error("Compression produced no video"));
        else resolve(compressed);
      };
      const activeRecorder = recorder!;
      activeRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      activeRecorder.onerror = () => done(new Error("Video encoder failed"));
      activeRecorder.onstop = () => {
        const mime = (activeRecorder.mimeType || type).split(";")[0]!;
        const blob = new Blob(chunks, { type: mime });
        if (!blob.size) { done(new Error("Empty compressed video")); return; }
        const ext = mime.includes("mp4") ? ".mp4" : ".webm";
        done(undefined, new File([blob], file.name.replace(/\.[^.]+$/, "") + "-keep" + ext, { type: mime, lastModified: Date.now() }));
      };
      // A 90-second clip should have time to encode in real time, even on an
      // older iPhone. A genuinely stalled Safari encoder must not hang Keep.
      watchdog = window.setTimeout(() => done(new Error("Video compression timed out")), Math.max(30000, Math.min(240000, duration * 3000 + 15000)));
    });
    const draw = () => {
      if (video.readyState >= 2) {
        try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { /* waiting for decoded frame */ }
      }
      const fraction = Math.min(1, video.currentTime / Math.max(0.1, duration));
      onProgress?.(Math.min(99, Math.round(fraction * 100)));
      if (!video.ended && video.currentTime < duration - 0.03) {
        frame = requestAnimationFrame(draw);
      } else if (recorder?.state === "recording") {
        recorder.stop();
      }
    };
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    recorder.start(1000);
    await video.play();
    frame = requestAnimationFrame(draw);
    const output = await result;
    onProgress?.(100);
    return output;
  } catch {
    // Caller retains the original file; never save an incomplete transcode.
    return null;
  } finally {
    window.clearTimeout(watchdog);
    if (frame) cancelAnimationFrame(frame);
    video.pause();
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* encoder already stopped */ }
    }
    stream?.getTracks().forEach((track) => track.stop());
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(src);
  }
}
