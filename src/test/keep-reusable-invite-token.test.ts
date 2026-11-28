import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reusableInviteId, reusableInviteToken, verifyReusableInviteToken } from "../../supabase/functions/keep-remote-voices/invite-links";
afterEach(()=>vi.unstubAllGlobals());
describe("reusable private invitation capability",()=>{
  it("resolves the same signed link on every share and invalidates changed or forged capabilities",async()=>{
    vi.stubGlobal("crypto",webcrypto);
    const id="12345678-1234-1234-1234-123456789abc";
    const hash="a".repeat(64);
    const secret="test-only-secret";
    const token=await reusableInviteToken(id,hash,secret);
    expect(token).toHaveLength(96);
    expect(await reusableInviteToken(id,hash,secret)).toBe(token);
    expect(reusableInviteId(token)).toBe(id);
    expect(await verifyReusableInviteToken(token,id,hash,secret)).toBe(true);
    expect(await verifyReusableInviteToken(token,id,"b".repeat(64),secret)).toBe(false);
    expect(await verifyReusableInviteToken(token,id,hash,"wrong")).toBe(false);
    const tampered=token.slice(0,-1)+(token.endsWith("0")?"1":"0");
    expect(await verifyReusableInviteToken(tampered,id,hash,secret)).toBe(false);
    expect(reusableInviteId("c".repeat(64))).toBeNull(); // legacy tokens still take the hash lookup path
  });
});
