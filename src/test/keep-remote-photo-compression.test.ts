import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareRemotePhoto } from "@/lib/keep-remote-media-prep";
import { optimizeKeepPhoto } from "@/lib/keep-photo-optimization";

vi.mock("@/lib/keep-photo-optimization", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/keep-photo-optimization")>()),
  optimizeKeepPhoto: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("remote contributor photo upload optimization", () => {
  it("optimizes an ordinary 2 MB photo before its secure upload", async () => {
    const original = new File([new Uint8Array(2_000_000)], "family.jpeg", { type: "image/jpeg" });
    const smaller = new Blob([new Uint8Array(350_000)], { type: "image/webp" });
    vi.mocked(optimizeKeepPhoto).mockResolvedValue(smaller);
    const prepared = await prepareRemotePhoto(original);
    expect(optimizeKeepPhoto).toHaveBeenCalledWith(original, { name: "family.jpeg" });
    expect(prepared.name).toBe("family.webp");
    expect(prepared.type).toBe("image/webp");
    expect(prepared.size).toBe(350_000);
    expect(original.size).toBe(2_000_000);
  });

  it("does not change the original when the quality guard rejects conversion", async () => {
    const photo = new File([new Uint8Array(900_000)], "portrait.jpg", { type: "image/jpeg" });
    vi.mocked(optimizeKeepPhoto).mockResolvedValue(null);
    expect(await prepareRemotePhoto(photo)).toBe(photo);
  });

  it("never processes an already-small photo", async () => {
    const photo = new File([new Uint8Array(150_000)], "portrait.jpg", { type: "image/jpeg" });
    expect(await prepareRemotePhoto(photo)).toBe(photo);
    expect(optimizeKeepPhoto).not.toHaveBeenCalled();
  });
});
