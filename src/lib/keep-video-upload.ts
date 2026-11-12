/**
 * Small clips are a first-class Keep memory. We intentionally limit new raw
 * iPhone videos until we have a resumable server-side transcoding pipeline:
 * unlike photos, browsers cannot reliably transcode 4K/HEVC footage on iOS.
 */
export const KEEP_VIDEO_RECOMMENDED_SECONDS = 10;
export const KEEP_VIDEO_MAX_SECONDS = 10.5; // iPhone encoders can add a few trailing frames
export const KEEP_VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export function checkKeepVideo(sizeBytes: number, durationSeconds: number): string | null {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "This video appears to be empty.";
  if (sizeBytes > KEEP_VIDEO_MAX_BYTES) return "This video is over 40 MB. Please export a smaller clip, ideally at 1080p, then try again.";
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "Couldn't read this video's length. Try a shorter MP4 or MOV clip.";
  if (durationSeconds > KEEP_VIDEO_MAX_SECONDS) return "This video is longer than 10 seconds. Trim it to 10 seconds or less in Photos, then add it again.";
  return null;
}

export async function readKeepVideoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  return new Promise<number>((resolve, reject) => {
    let finished = false;
    const finish = (duration: number | null) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (duration === null) reject(new Error("Video metadata unavailable"));
      else resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), 12000);
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(null);
    video.src = url;
    video.load();
  });
}
