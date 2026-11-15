import { beforeEach, describe, expect, it, vi } from "vitest";
import { newProject, type KeepProject } from "@/lib/keep-project";
import { publishKeep } from "@/lib/keep-publish";
import { getBlob, putBlob } from "@/lib/keep-media-store";
import { activeKeepSession } from "@/lib/keep-cloud";
import { keepOptimizedPhotoId, optimizeKeepPhoto } from "@/lib/keep-photo-optimization";

vi.mock("@/lib/keep-cloud", () => ({ activeKeepSession: vi.fn() }));
vi.mock("@/lib/keep-media-store", () => ({ getBlob: vi.fn(), putBlob: vi.fn() }));
vi.mock("@/lib/keep-photo-optimization", async importActual => {
  const original = await importActual<typeof import("@/lib/keep-photo-optimization")>();
  return { ...original, optimizeKeepPhoto: vi.fn() };
});

const owner = "00000000-0000-4000-8000-000000000001";
const publicationId = "00000000-0000-4000-8000-000000000002";
const full = new Blob([new Uint8Array(3_500_000)], { type: "image/jpeg" });
const small = new Blob([new Uint8Array(420_000)], { type: "image/webp" });
const narration = new Blob(["narration"], { type: "audio/wav" });
const project = (): KeepProject => ({
  ...newProject(), active: true, recipientName: "Someone special",
  messageParagraphs: ["What I want to say"],
  finalVoiceRecording: { audioId: "voice-recording", durationSec: 90, demo: false },
  memories: [{ id: "original-photo", kind: "image", source: "upload", persisted: true,
    name: "photo.jpeg", url: "blob:local", displayDurationSec: 10 }],
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(activeKeepSession).mockResolvedValue({
    access_token: "token", refresh_token: "refresh", user: { id: owner },
  });
  vi.mocked(putBlob).mockResolvedValue(true);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ keepId: publicationId, token: "permanent" }), { status: 200 },
  )));
});

describe("quality-first publishing", () => {
  it("publishes the optimized image while preserving the original in IndexedDB", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "original-photo") return full;
      if (id === keepOptimizedPhotoId("original-photo")) return small;
      if (id === "voice-recording") return narration;
      return null;
    });
    await publishKeep(project(), publicationId, () => {});
    const requests = vi.mocked(fetch).mock.calls;
    expect(requests).toHaveLength(3);
    expect(requests[0]![1]?.body).toBe(small);
    expect(new Headers(requests[0]![1]?.headers).get("Content-Type")).toBe("image/webp");
    expect(vi.mocked(getBlob)).toHaveBeenCalledWith("original-photo");
    expect(vi.mocked(getBlob)).toHaveBeenCalledWith(keepOptimizedPhotoId("original-photo"));
    expect(optimizeKeepPhoto).not.toHaveBeenCalled();
  });

  it("optimizes old drafts that have no derivative before publishing", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "original-photo") return full;
      if (id === "voice-recording") return narration;
      return null;
    });
    vi.mocked(optimizeKeepPhoto).mockResolvedValue(small);
    await publishKeep(project(), publicationId, () => {});
    expect(vi.mocked(fetch).mock.calls[0]![1]?.body).toBe(small);
    expect(optimizeKeepPhoto).toHaveBeenCalledWith(full, { zoom: undefined, name: "photo.jpeg" });
    expect(putBlob).toHaveBeenCalledWith(keepOptimizedPhotoId("original-photo"), small);
  });

  it("keeps the original when the quality guard refuses compression", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "original-photo") return full;
      if (id === "voice-recording") return narration;
      return null;
    });
    vi.mocked(optimizeKeepPhoto).mockResolvedValue(null);
    await publishKeep(project(), publicationId, () => {});
    expect(vi.mocked(fetch).mock.calls[0]![1]?.body).toBe(full);
    expect(new Headers(vi.mocked(fetch).mock.calls[0]![1]?.headers).get("Content-Type")).toBe("image/jpeg");
    expect(putBlob).not.toHaveBeenCalled();
  });

  it("re-optimizes at higher resolution for heavily zoomed photographs", async () => {
    vi.mocked(getBlob).mockImplementation(async id => {
      if (id === "original-photo") return full;
      if (id === keepOptimizedPhotoId("original-photo")) return small;
      if (id === "voice-recording") return narration;
      return null;
    });
    vi.mocked(optimizeKeepPhoto).mockResolvedValue(null);
    const p = project();
    p.memories[0]!.zoom = 1.8;
    await publishKeep(p, publicationId, () => {});
    expect(optimizeKeepPhoto).toHaveBeenCalledWith(full, { zoom: 1.8, name: "photo.jpeg" });
    expect(vi.mocked(fetch).mock.calls[0]![1]?.body).toBe(full);
  });
});
