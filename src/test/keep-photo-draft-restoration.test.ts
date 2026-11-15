import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/keep-player", () => ({ memoryImages: [] }));
vi.mock("@/lib/keep-media-store", () => ({ getBlob: vi.fn() }));
import { getBlob } from "@/lib/keep-media-store";
import { hydrateDraftMedia, newProject } from "@/lib/keep-project";
import { keepOptimizedPhotoId } from "@/lib/keep-photo-optimization";

const original = new Blob(["untouched photo source"],{type:"image/jpeg"});
const derivative = new Blob(["optimized frame"],{type:"image/webp"});
const memory = {id:"family-photo",kind:"image" as const,source:"upload" as const,persisted:true,url:""};
const draft = () => ({
  ...newProject(), active:true, memories:[memory], selfieBaseMedia:[memory],
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((blob: Blob) => blob === derivative ? "blob:optimized-photo" : "blob:original-photo"),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("reopening an optimized Keep draft", () => {
  it("displays the optimized photo while retaining the original for editing and backup", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "family-photo") return original;
      if (id === keepOptimizedPhotoId("family-photo")) return derivative;
      return null;
    });
    const restored = await hydrateDraftMedia(draft());
    expect(restored.memories[0]?.url).toBe("blob:optimized-photo");
    expect(restored.selfieBaseMedia[0]?.url).toBe("blob:optimized-photo");
    expect(getBlob).toHaveBeenCalledWith(keepOptimizedPhotoId("family-photo"));
    expect(original.size).toBeGreaterThan(derivative.size);
  });

  it("automatically falls back to the original when no optimized variant exists", async () => {
    vi.mocked(getBlob).mockImplementation(async id => id === "family-photo" ? original : null);
    const restored = await hydrateDraftMedia(draft());
    expect(restored.memories[0]?.url).toBe("blob:original-photo");
    expect(restored.selfieBaseMedia[0]?.url).toBe("blob:original-photo");
  });
});
