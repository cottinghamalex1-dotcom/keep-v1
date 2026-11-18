/**
 * A user tap is required for fullscreen. Browser chrome on iPhone Safari and
 * embedded iOS browsers cannot be hidden by arbitrary web content; on those
 * devices we keep the same edge-to-edge film with no broken request.
 */
export function enterKeepFullscreen() {
  if (typeof document === "undefined" || document.fullscreenElement) return;
  const request = document.documentElement.requestFullscreen;
  if (!request) return;
  try {
    const result = request.call(document.documentElement);
    if (result && typeof result.catch === "function") void result.catch(() => undefined);
  } catch { /* Unsupported or denied: still play the Keep normally. */ }
}

export function leaveKeepFullscreen() {
  if (typeof document === "undefined" || !document.fullscreenElement) return;
  try { void document.exitFullscreen?.().catch(() => undefined); }
  catch { /* Leave the film gracefully even if fullscreen was denied. */ }
}


/**
 * Explicit fullscreen control for the in-film button. The browser may reject
 * this on iPhone, where arbitrary DOM (photo/caption/music) fullscreen is not
 * available. Returning false lets the player explain the alternative.
 * Call directly from the button's user-activation handler.
 */
export async function toggleKeepFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  try {
    if (document.fullscreenElement) {
      if (!document.exitFullscreen) return false;
      await document.exitFullscreen();
      return true;
    }
    const request = document.documentElement.requestFullscreen;
    if (typeof request !== "function") return false;
    await request.call(document.documentElement);
    return true;
  } catch {
    return false;
  }
}
