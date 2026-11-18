import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveCloudDraft, type KeepSession } from "@/lib/keep-cloud";
import { getBlob } from "@/lib/keep-media-store";
import { keepOptimizedPhotoId } from "@/lib/keep-photo-optimization";
import { newProject, type KeepProject } from "@/lib/keep-project";

vi.mock("@/components/keep-player", () => ({ memoryImages: [] }));
vi.mock("@/lib/keep-media-store", () => ({
  getBlob: vi.fn(),
  putBlob: vi.fn(),
}));

const original = new Blob([new Uint8Array(3_200_000)], { type: "image/jpeg" });
const optimized = new Blob([new Uint8Array(480_000)], { type: "image/webp" });
const session = (suffix: string): KeepSession => ({
  access_token: "test-token",
  refresh_token: "test-refresh",
  user: { id: "photo-sync-" + suffix },
});
const project = (id: string, kind: "image" | "video" = "image"): KeepProject => ({
  ...newProject(),
  active: true,
  memories: [{
    id, kind, source: "upload", url: "blob:local", persisted: true,
    name: kind === "image" ? "family.jpeg" : "family.mov",
  }],
});
function uploadedMedia() {
  return vi.mocked(fetch).mock.calls.filter(([url]) =>
    typeof url === "string" && url.includes("/storage/v1/object/keep-draft-media/")
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());

describe("fast quality-first cloud draft uploads", () => {
  it("sends the verified smaller photo, not the full local original", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "family-photo") return original;
      if (id === keepOptimizedPhotoId("family-photo")) return optimized;
      return null;
    });
    await saveCloudDraft(project("family-photo"), session("optimized"));
    expect(uploadedMedia()).toHaveLength(1);
    expect(uploadedMedia()[0]![1]?.body).toBe(optimized);
    expect(new Headers(uploadedMedia()[0]![1]?.headers).get("Content-Type")).toBe("image/webp");
    expect(getBlob).toHaveBeenCalledWith("family-photo");
  });

  it("keeps the original if compression isn't available or beneficial", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "family-fallback") return original;
      if (id === keepOptimizedPhotoId("family-fallback")) return null;
      return null;
    });
    await saveCloudDraft(project("family-fallback"), session("fallback"));
    expect(uploadedMedia()[0]![1]?.body).toBe(original);
  });

  it("never treats video clips as still-image derivatives", async () => {
    vi.mocked(getBlob).mockImplementation(async id => id === "family-video" ? original : null);
    await saveCloudDraft(project("family-video", "video"), session("video"));
    expect(uploadedMedia()[0]![1]?.body).toBe(original);
    expect(getBlob).not.toHaveBeenCalledWith(keepOptimizedPhotoId("family-video"));
  });
});
