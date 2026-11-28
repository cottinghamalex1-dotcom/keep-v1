// Derive a re-shareable capability from the invitation row without storing
// recoverable bearer tokens. The original random token remains valid.
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
const payload = (id: string, tokenHash: string) => encoder.encode(`keep-remote-invite:v1:${id}:${tokenHash}`);
const importKey = (secret: string) => crypto.subtle.importKey(
  "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
);

export async function reusableInviteToken(id: string, tokenHash: string, secret: string) {
  const signature = await crypto.subtle.sign("HMAC", await importKey(secret), payload(id, tokenHash));
  return id.replaceAll("-", "") + hex(new Uint8Array(signature));
}

export function reusableInviteId(token: string): string | null {
  if (!/^[a-f0-9]{96}$/.test(token)) return null;
  const id = token.slice(0, 32);
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export async function verifyReusableInviteToken(token: string, id: string, tokenHash: string, secret: string) {
  if (reusableInviteId(token) !== id) return false;
  const signature = Uint8Array.from(token.slice(32).match(/../g)!, part => parseInt(part, 16));
  return crypto.subtle.verify("HMAC", await importKey(secret), signature, payload(id, tokenHash));
}
