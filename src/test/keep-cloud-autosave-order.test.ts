import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/keep-player", () => ({ memoryImages: [] }));
vi.mock("@/lib/keep-media-store", () => ({ getBlob: vi.fn(), putBlob: vi.fn() }));
import { removeCloudDraft, saveCloudDraft, type KeepSession } from "@/lib/keep-cloud";
import { newProject } from "@/lib/keep-project";

afterEach(() => vi.unstubAllGlobals());
const session: KeepSession = { access_token:"token",refresh_token:"refresh",user:{id:"editor-safety-owner"} };
const ok = () => new Response(JSON.stringify([]),{status:200});

describe("cloud autosave ordering", () => {
  it("does not allow an older in-flight save to overwrite newer edits", async () => {
    let finishOld!: (response:Response) => void;
    const oldPending=new Promise<Response>(resolve => { finishOld=resolve; });
    const fetcher=vi.fn().mockImplementationOnce(() => oldPending).mockResolvedValue(ok());
    vi.stubGlobal("fetch",fetcher);
    const previous={...newProject(),active:true,recipientName:"Before editing"};
    const updated={...previous,recipientName:"After editing"};
    const first=saveCloudDraft(previous,session);
    const latest=saveCloudDraft(updated,session);
    await new Promise(resolve => setTimeout(resolve,0));
    expect(fetcher).toHaveBeenCalledTimes(1);
    finishOld(ok());
    await Promise.all([first,latest]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const firstBody=JSON.parse(fetcher.mock.calls[0]![1].body);
    const secondBody=JSON.parse(fetcher.mock.calls[1]![1].body);
    expect([firstBody.project.recipientName,secondBody.project.recipientName]).toEqual(["Before editing","After editing"]);
  });
  it("does not resurrect a draft after a queued deletion", async () => {
    let finishSave!: (response:Response) => void;
    const waiting=new Promise<Response>(resolve => { finishSave=resolve; });
    const fetcher=vi.fn().mockImplementationOnce(() => waiting).mockResolvedValue(ok());
    vi.stubGlobal("fetch",fetcher);
    const saving=saveCloudDraft({...newProject(),active:true},session);
    const removing=removeCloudDraft(session);
    await new Promise(resolve => setTimeout(resolve,0));
    expect(fetcher).toHaveBeenCalledTimes(1);
    finishSave(ok());
    await Promise.all([saving,removing]);
    expect(fetcher.mock.calls[0]![1].method).toBe("POST");
    expect(fetcher.mock.calls[1]![1].method).toBe("DELETE");
  });
});
