import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/components/keep-player", () => ({ memoryImages: [] }));
vi.mock("@/lib/keep-media-store", () => ({ getBlob: vi.fn().mockResolvedValue(null), putBlob: vi.fn().mockResolvedValue(true) }));
import { loadEditableKeep, retryMissingCloudMedia, type KeepSession } from "@/lib/keep-cloud";
import { newProject } from "@/lib/keep-project";

const session: KeepSession = { access_token: "test-token", refresh_token: "test-refresh", user: {id:"owner"} };
const json = (value: unknown) => new Response(JSON.stringify(value), {status:200,headers:{"content-type":"application/json"}});

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("opens a 24-file Keep despite a failed download, preserving every photo reference and the original voice", async () => {
  const media = Array.from({length:23}, (_,i) => ({
    id: `photo-${i}`,kind:"image" as const,source:"upload" as const,url:"",
    displayDurationSec:4,
  }));
  const old = {
    ...newProject(),active:true,stage:"editor",publicationId:"existing-keep",
    memories:media,finalVoiceRecording:{ audioId:"voice-original", durationSec:55, demo:false }
  };
  const fetcher = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("/rest/v1/keeps?")) return json([{id:"existing-keep",draft_project:old}]);
    if (url.includes("/rest/v1/keep_drafts?")) return json([]);
    if (url.includes("photo-18")) return new Response("failed",{status:404});
    return new Response(new Blob(["binary"]),{status:200});
  });
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("URL", {createObjectURL: vi.fn(()=>"blob:restored")});
  const progress: number[] = [];
  const output = await loadEditableKeep("existing-keep",session,(p)=>progress.push(p.completed));
  expect(output.memories).toHaveLength(23);
  expect(output.memories[18]!.id).toBe("photo-18");
  expect(output.memories[18]!.url).toBe("");
  expect(output.memories[0]!.url).toBe("blob:restored");
  expect(output.finalVoiceRecording?.audioId).toBe("voice-original");
  expect(output.finalVoiceRecording?.audioUrl).toBe("blob:restored");
  expect(output.restoreIncomplete).toBe(true);
  expect(output.restoreMissingCount).toBe(1);
  expect(progress.at(-1)).toBe(23);
});

it("only retries missing images and enables saving once all files restore", async () => {
  const p = {
    ...newProject(), active:true, restoreIncomplete:true, restoreMissingCount:1,
    memories:[{id:"a",kind:"image" as const,source:"upload" as const,url:"blob:cached"},
              {id:"b",kind:"image" as const,source:"upload" as const,url:""}],
  };
  const fetcher = vi.fn().mockResolvedValue(new Response(new Blob(["downloaded"]),{status:200}));
  vi.stubGlobal("fetch",fetcher);
  vi.stubGlobal("URL",{createObjectURL:vi.fn(()=>"blob:recovered")});
  const result=await retryMissingCloudMedia(p,session);
  expect(result.restoreIncomplete).toBe(false);
  expect(result.memories.map(m=>m.url)).toEqual(["blob:cached","blob:recovered"]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
