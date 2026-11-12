import { afterEach, describe, expect, it, vi } from "vitest";
import { purchaseStatus, reservePaidKeep } from "@/lib/keep-commerce";
import type { KeepSession } from "@/lib/keep-cloud";

const customer: KeepSession = {
  access_token: "valid-test-token",
  refresh_token: "refresh-token",
  user: { id: "58c86cba-a7cb-44ce-a0a5-7a35f9b92b90", email: "customer@example.com" },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("purchase-first entitlement checks", () => {
  it("does not unlock creation when no account is signed in", async () => {
    await expect(purchaseStatus(null)).resolves.toEqual({
      canCreate: false,
      reservedKeeps: 0,
      awaitingApproval: 0,
    });
  });

  it("uses the server-verified purchase status and bearer token", async () => {
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(options.headers).toMatchObject({ Authorization: "Bearer valid-test-token" });
      expect(JSON.parse(String(options.body))).toEqual({ action: "status" });
      return { ok: true, json: async () => ({ canCreate: true, reservedKeeps: 0, awaitingApproval: 0 }) };
    });
    vi.stubGlobal("fetch", request);
    await expect(purchaseStatus(customer)).resolves.toEqual({ canCreate: true, reservedKeeps: 0, awaitingApproval: 0 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("requires the server to approve reserving a creation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Purchase required" }) })));
    await expect(reservePaidKeep("7db55229-f971-4e7f-a65b-25df68adebc2", customer)).rejects.toThrow("Purchase required");
  });

  it("reserves only the provided Keep ID with the server", async () => {
    const keepId = "7db55229-f971-4e7f-a65b-25df68adebc2";
    const request = vi.fn(async (_url: string, options: RequestInit) => {
      expect(JSON.parse(String(options.body))).toEqual({ action: "reserve", keepId });
      return { ok: true, json: async () => ({ reserved: true }) };
    });
    vi.stubGlobal("fetch", request);
    await reservePaidKeep(keepId, customer);
    expect(request).toHaveBeenCalledOnce();
  });
});
