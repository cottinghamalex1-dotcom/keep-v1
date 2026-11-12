/** Short videos are recommended; larger clips are compressed on-device when supported. */
export const KEEP_VIDEO_RECOMMENDED_SECONDS = 10;
export const KEEP_VIDEO_MAX_SECONDS = 90;
export const KEEP_VIDEO_MAX_SOURCE_BYTES = 350 * 1024 * 1024;
export const KEEP_VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export function checkKeepVideo(sizeBytes: number, durationSeconds: number): string | null {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "This video appears to be empty.";
  if (sizeBytes > KEEP_VIDEO_MAX_BYTES) return "This video is still over 40 MB after compression. Trim it or export at 720p, then try again.";
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "Couldn't read this video's length. Try a short MP4 or MOV clip.";
  if (durationSeconds > KEEP_VIDEO_MAX_SECONDS + 0.5) return "This video is longer than 90 seconds. Trim it to a shorter moment in Photos and try again.";
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
