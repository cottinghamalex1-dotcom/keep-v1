/** A rendering engine change is also a new film revision. An old MP4 may
 * remain safely stored but must not replace an updated Watch experience. */
export const RENDER_COMPOSITION_VERSION = "editor-parity-v2";
export async function renderRevisionHash(project:unknown) {
  const bytes=new TextEncoder().encode(JSON.stringify({version:RENDER_COMPOSITION_VERSION,project}));
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join("");
}
