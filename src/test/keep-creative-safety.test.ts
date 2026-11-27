import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/keep-player", () => ({ memoryImages: [] }));
vi.mock("@/lib/keep-media-store", () => ({ getBlob: vi.fn(), putBlob: vi.fn() }));
import { activeKeepSession, retryMissingCloudMedia, saveCloudDraft, SESSION_KEY, type KeepSession } from "@/lib/keep-cloud";
import { clearDraft, hydrateDraftMedia, loadDraft, newProject, preferLocalKeepDraft, saveDraft } from "@/lib/keep-project";
import { getBlob } from "@/lib/keep-media-store";
const expired = (owner: string): KeepSession => ({access_token:"old-"+owner,refresh_token:"refresh-"+owner,expires_at:1,user:{id:owner}});
const signin = (owner:string) => localStorage.setItem(SESSION_KEY, JSON.stringify(expired(owner)));
const json = (value:unknown,status=200) => new Response(JSON.stringify(value),{status});
beforeEach(() => {localStorage.clear();vi.clearAllMocks();vi.mocked(getBlob).mockResolvedValue(null);});
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

describe("creative recovery across accounts and slow connections", () => {
  it("restores each account's own multiple Keeps without replacing other drafts", () => {
    signin("alice");
    expect(saveDraft({...newProject(),active:true,publicationId:"a1",recipientName:"First"})).toBe(true);
    expect(saveDraft({...newProject(),active:true,publicationId:"a2",recipientName:"Second"})).toBe(true);
    signin("bob");
    expect(loadDraft()).toBeNull();
    expect(loadDraft("a1")).toBeNull();
    expect(saveDraft({...newProject(),active:true,draftOwnerId:"alice",publicationId:"a1"})).toBe(false);
    expect(saveDraft({...newProject(),active:true,publicationId:"b1",recipientName:"Bob"})).toBe(true);
    signin("alice");
    expect(loadDraft()?.recipientName).toBe("Second");
    expect(loadDraft("a1")?.recipientName).toBe("First");
    clearDraft("a1");
    expect(loadDraft("a1")).toBeNull();
    expect(loadDraft()?.recipientName).toBe("Second");
    signin("bob");
    expect(loadDraft()?.recipientName).toBe("Bob");
  });
  it("preserves all missing media references, counts unique sources, and declines partial autosaves", async () => {
    signin("alice");
    const photo={id:"photo",blobId:"shared",source:"upload" as const,kind:"image" as const,url:"",persisted:true};
    const draft={...newProject(),active:true,draftOwnerId:"alice",publicationId:"a1",memories:[photo],selfieBaseMedia:[photo],finalVoiceRecording:{demo:false,audioId:"voice",durationSec:10}};
    expect(saveDraft(draft)).toBe(true);
    const hydrated={...draft,...await hydrateDraftMedia(draft)};
    expect(hydrated.memories[0]?.id).toBe("photo");
    expect(hydrated.restoreMissingCount).toBe(2);
    expect(hydrated.restoreIncomplete).toBe(true);
    expect(saveDraft({...hydrated,recipientName:"unsafe"})).toBe(false);
    expect(loadDraft()?.recipientName).not.toBe("unsafe");
    await expect(saveCloudDraft(hydrated,expired("alice"))).rejects.toThrow("Restore the missing media");
    await expect(saveCloudDraft(draft,expired("bob"))).rejects.toThrow("different Keep account");
  });
  it("keeps the previous snapshot when a phone refuses to store an imported photo", () => {
    signin("alice");
    const base={...newProject(),active:true,publicationId:"a1",draftOwnerId:"alice",recipientName:"Safe"};
    expect(saveDraft(base)).toBe(true);
    const photo={id:"not-stored",source:"upload" as const,kind:"image" as const,url:"blob:session-only",persisted:false};
    expect(saveDraft({...base,recipientName:"Unsafe",memories:[photo]})).toBe(false);
    expect(loadDraft()?.recipientName).toBe("Safe");
  });
  it("does not restore intentionally removed photos from a stale cloud snapshot", () => {
    const base={...newProject(),active:true,publicationId:"a1",draftOwnerId:"alice"};
    const cloud={...base,draftSavedAt:1000,memories:[{id:"old",source:"upload" as const,kind:"image" as const,url:"blob:old"}]};
    expect(preferLocalKeepDraft({...base,draftSavedAt:2000},cloud)).toBe(true);
  });
  it("counts a repeated bookend source only once in the restoration progress", async () => {
    const video={id:"clip",blobId:"same-video",source:"upload" as const,kind:"video" as const,url:"blob:restored"};
    const progress:{completed:number;total:number}[]=[];
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const restored=await retryMissingCloudMedia({...newProject(),memories:[video,{...video,id:"outro"}],selfieVideos:[video]},expired("alice"),p=>progress.push(p));
    expect(progress.at(-1)).toMatchObject({completed:1,total:1});
    expect(restored.restoreIncomplete).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("shares concurrent token refreshes and keeps the new session", async () => {
    signin("alice");
    const next={...expired("alice"),access_token:"new",refresh_token:"new-refresh",expires_in:3600};
    const fetcher=vi.fn().mockResolvedValue(json(next));vi.stubGlobal("fetch",fetcher);
    const [a,b]=await Promise.all([activeKeepSession(),activeKeepSession()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a?.access_token).toBe("new");expect(b).toEqual(a);
  });
  it("does not erase the session after a transient refresh failure", async () => {
    signin("alice");vi.stubGlobal("fetch",vi.fn().mockResolvedValue(json({},503)));
    await expect(activeKeepSession()).rejects.toThrow("refresh your session");
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).user.id).toBe("alice");
  });
  it("does not resurrect a signed-out account or replace an account selected mid-refresh", async () => {
    signin("alice");
    let complete!:(response:Response)=>void;
    vi.stubGlobal("fetch",vi.fn().mockImplementation(()=>new Promise(resolve=>{complete=resolve;})));
    const first=activeKeepSession();
    signin("bob");
    complete(json({...expired("alice"),expires_in:3600}));
    expect(await first).toBeNull();
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).user.id).toBe("bob");
  });
});
