import { activeKeepSession } from "./keep-cloud";
import { MUSIC_FILES } from "./keep-audio";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publishableKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

/** Off until a real Shotstack sandbox render and fulfillment QA pass. */
export const shotstackRenderingEnabled = import.meta.env.VITE_KEEP_SHOTSTACK_ENABLED === "true";

export type KeepRenderStatus = {
  id?: string;
  status: "queued" | "rendering" | "ready" | "failed" | "not_started";
  providerStatus?: string;
  message?: string;
  error?: string;
};

async function requestRender(payload: Record<string, unknown>): Promise<KeepRenderStatus> {
  const session = await activeKeepSession();
  if (!session) throw new Error("Sign in again to prepare your Keep film.");
  const response = await fetch(endpoint + "/functions/v1/keep-render", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", apikey: publishableKey,
      Authorization: "Bearer " + session.access_token,
    },
    body: JSON.stringify(payload),
  });
  let parsed: KeepRenderStatus & { error?: string };
  try { parsed = await response.json(); } catch { throw new Error("The film service could not be reached."); }
  if (!response.ok) throw new Error(parsed.error || "The film service is temporarily unavailable.");
  return parsed;
}

/** Measured from the actual chosen music file, never guessed from the title. */
async function soundtrackDuration(musicMood: string): Promise<number> {
  const file = MUSIC_FILES[musicMood === "Worth Keeping" ? "Intentional" : musicMood];
  if (!file) throw new Error("Select an available soundtrack before finishing.");
  return await new Promise<number>((resolve, reject) => {
    const player = document.createElement("audio");
    let finished = false;
    const cleanup = () => { player.removeAttribute("src"); player.load(); };
    const complete = (duration?: number) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      cleanup();
      if (duration && Number.isFinite(duration) && duration >= 30 && duration <= 900) resolve(duration);
      else reject(new Error("The soundtrack length could not be confirmed."));
    };
    player.preload = "metadata";
    player.onloadedmetadata = () => complete(player.duration);
    player.onerror = () => complete();
    const timeout = window.setTimeout(() => complete(), 12000);
    player.src = file;
    player.load();
  });
}

export async function beginKeepRender(keepId: string, musicMood: string, musicMuted = false): Promise<KeepRenderStatus> {
  // Status comes first so refreshing a screen never queues an extra billable
  // render or requires reloading an MP3 just to see job progress.
  const existing = await requestRender({ action: "status", keepId });
  if (existing.status !== "not_started") return existing;
  const musicDurationSec = musicMuted ? undefined : await soundtrackDuration(musicMood);
  return requestRender({ action: "start", keepId, musicDurationSec });
}

/** Retry is explicitly user-initiated and only works for a failed job. */
export async function retryKeepRender(keepId: string, musicMood: string, musicMuted = false): Promise<KeepRenderStatus> {
  const musicDurationSec = musicMuted ? undefined : await soundtrackDuration(musicMood);
  return requestRender({ action: "retry", keepId, musicDurationSec });
}

export async function refreshKeepRender(keepId: string): Promise<KeepRenderStatus> {
  return requestRender({ action: "status", keepId });
}

/** Reuses Shotstack's existing completed render; does not submit another render. */
export async function recoverKeepRender(keepId: string): Promise<KeepRenderStatus> {
  return requestRender({ action: "recover", keepId });
}
