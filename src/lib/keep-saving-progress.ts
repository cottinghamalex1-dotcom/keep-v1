import type { KeepRenderStatus } from "./keep-render-client";

/**
 * A milestone percentage, NOT a time or frame-render estimate. Shotstack's
 * standard render status reports stages but not a trustworthy 0–100 percentage.
 * Only move when a real completed step has been confirmed by the server.
 */
export function keepSavingProgress(
  publishing: boolean,
  publishMessage: string,
  job?: KeepRenderStatus | null,
): { percent: number; label: string; detail: string } {
  if (publishing) {
    const match = publishMessage.match(/Saving memories (\d+) of (\d+)/i);
    const completed = match ? Number(match[1]) : 0;
    const count = match ? Number(match[2]) : 0;
    const percentage = count > 0 ? Math.min(34, 8 + Math.round(26 * completed / count)) : 8;
    return {
      percent: percentage,
      label: "Saving your memories",
      detail: publishMessage || "Getting your photos, videos and voice ready.",
    };
  }
  if (!job || job.status === "not_started") {
    return { percent: 38, label: "Preparing your story", detail: "Your memories are saved. Bringing the pieces together." };
  }
  if (job.status === "ready") {
    return { percent: 100, label: "Your Keep is saved", detail: "Every moment is ready to keep." };
  }
  if (job.status === "failed") {
    return { percent: 38, label: "We couldn't finish saving", detail: job.error || "Your original Keep is safe." };
  }
  switch ((job.providerStatus || "").toLowerCase()) {
    case "fetching":
      return { percent: 48, label: "Gathering your moments", detail: "Your photos, videos and voice are coming together." };
    case "preprocessing":
      return { percent: 55, label: "Preparing the details", detail: "Making sure everything plays smoothly." };
    case "generating":
      return { percent: 60, label: "Bringing your story to life", detail: "Preparing the finishing touches." };
    case "rendering":
      return { percent: 68, label: "Bringing your story to life", detail: "Blending your memories, music and words into one Keep." };
    case "saving":
      return { percent: 84, label: "Almost there", detail: "Finishing your Keep so it plays beautifully." };
    case "verifying":
      return { percent: 94, label: "One final check", detail: "Making sure your finished Keep is safely stored." };
    default:
      return { percent: 42, label: "Preparing your story", detail: "Everything is saved. We're putting the moments together." };
  }
}
