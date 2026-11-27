import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepSaveAndPurchase } from "@/routes/checkout";
import { keepCheckoutPath, loadCheckoutKeep, type CheckoutKeep } from "@/lib/keep-checkout";

const keepId = "00000000-1111-2222-3333-444444444444";
const keep: CheckoutKeep = {
  id: keepId, recipient_name: "Mom", recipient_token: "private",
  published_project: {musicMood:"Intentional", audioMix:{musicMuted:true}, voiceMode:"solo"},
};
vi.mock("@/lib/keep-cloud", () => ({
  activeKeepSession: async () => ({access_token:"token",user:{id:"owner"}}),
}));
const response = (data:unknown, status=200) => new Response(JSON.stringify(data),{status});
const flush = async () => { await act(async()=>{}); };
const actions = (mock:ReturnType<typeof vi.fn>) => mock.mock.calls.map(([,init])=>JSON.parse(init.body).action);
const ready = {status:"ready", videoUrl:"https://example.test/private.mp4"};
describe("automatic finishing and purchase handoff",()=>{
  beforeEach(()=>{ vi.useFakeTimers(); sessionStorage.clear(); });
  afterEach(()=>{ cleanup();vi.useRealTimers();vi.unstubAllGlobals(); });
  it("automatically starts the exact saved render, waits for storage verification, then displays buying options",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(response({status:"not_started"}))
      .mockResolvedValueOnce(response({status:"rendering"}))
      .mockResolvedValueOnce(response({status:"ready"}))
      .mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    expect(actions(fetchMock)).toEqual(["status","start"]);
    expect(screen.queryByRole("button",{name:/Render my/})).toBeNull();
    expect(screen.queryByRole("group",{name:"Keep package"})).toBeNull();
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.queryByRole("group",{name:"Keep package"})).toBeNull();
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.getByRole("group",{name:"Keep package"})).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Checkout opening soon"})).toBeDisabled();
    expect(screen.getByLabelText("Completed, seekable Keep film")).toHaveAttribute("src",ready.videoUrl);
    expect(actions(fetchMock)).toEqual(["status","start","status","status"]);
  });
  it("resumes a rendering job without a second submission and transitions automatically",async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(response({status:"rendering"})).mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.getByRole("group",{name:"Keep package"})).toBeInTheDocument();
    expect(actions(fetchMock)).toEqual(["status","status"]);
  });
  it("reuses a completed render and calculates the current package price",async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={{...keep,published_project:{...keep.published_project,voiceMode:"together",contributors:[{},{}]}}}/>);
    await flush();
    expect(screen.getByRole("button",{name:/Signature Keep/})).toHaveAttribute("aria-pressed","true");
    expect(screen.getByText("$99.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/Basic Keep/}));
    expect(screen.getByText("$98.00")).toBeInTheDocument();
    expect(actions(fetchMock)).toEqual(["status"]);
  });
  it("does not automatically resubmit a failed provider job or allow checkout",async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(response({status:"failed",hasProviderRender:true,error:"Storage unavailable"}));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    expect(screen.getByRole("button",{name:"Retry saving existing MP4"})).toBeEnabled();
    expect(screen.queryByRole("group",{name:"Keep package"})).toBeNull();
    expect(actions(fetchMock)).toEqual(["status"]);
  });
  it("checks ownership before triggering any render",async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch",fetchMock);
    await expect(loadCheckoutKeep(keepId)).rejects.toThrow("hasn't been saved");
    const url=new URL(fetchMock.mock.calls[0]![0]);
    expect(url.searchParams.get("id")).toBe("eq."+keepId);
    expect(url.searchParams.get("owner_id")).toBe("eq.owner");
    expect(keepCheckoutPath(keepId)).toBe("/checkout?keep="+keepId);
  });
});
