import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepSaveAndPurchase } from "@/routes/checkout";
import { KeepFinishingDialog } from "@/components/keep-finishing-dialog";
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
  it("opens over the final words during saving and only advances after the verified film is ready",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(response({status:"not_started"}))
      .mockResolvedValueOnce(response({status:"rendering"}))
      .mockResolvedValueOnce(response({status:"ready"}))
      .mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    const onReady=vi.fn();
    const page=(saved: CheckoutKeep | null) => <><h1>Choose your opening and closing lines.</h1><KeepFinishingDialog keep={saved} savingStatus="Saving memories 2 of 4…" onReady={onReady}/></>;
    const view=render(page(null));
    expect(screen.getByRole("dialog",{name:"Bringing it all together."})).toBeInTheDocument();
    expect(screen.getByText("Choose your opening and closing lines.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar",{name:"Saving media"})).toHaveAttribute("aria-valuenow","50");
    expect(fetchMock).not.toHaveBeenCalled();
    view.rerender(page(keep));
    await flush();
    expect(actions(fetchMock)).toEqual(["status","start"]);
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(onReady).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog",{name:"Bringing it all together."})).toBeInTheDocument();
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(onReady).toHaveBeenCalledWith(ready);
  });
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
    expect(screen.getByRole("link", {name:/Edit opening, closing & card/})).toHaveAttribute("href", "/?edit="+keepId+"&final=1");
    expect(screen.getByLabelText("Completed, seekable Keep film")).toHaveAttribute("src",ready.videoUrl);
    expect(actions(fetchMock)).toEqual(["status","start","status","status"]);
  });
  it("shows real processing stages and a rough remaining-time estimate until the film is verified",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(response({status:"not_started"}))
      .mockResolvedValueOnce(response({status:"rendering"}))
      .mockResolvedValueOnce(response({status:"rendering",providerStatus:"rendering"}))
      .mockResolvedValueOnce(response({status:"rendering",providerStatus:"saving"}))
      .mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByText(/Estimated time left:/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","0");
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","1");
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","2");
    expect(screen.queryByRole("group",{name:"Keep package"})).toBeNull();
    await act(async()=>{await vi.advanceTimersByTimeAsync(7000);});
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("group",{name:"Keep package"})).toBeInTheDocument();
    expect(actions(fetchMock)).toEqual(["status","start","status","status","status"]);
  });
  it("stops the ETA at the end of the rough estimate without claiming completion",async()=>{
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(response({status:"not_started"}))
      .mockImplementation(async()=>response({status:"rendering",providerStatus:"rendering"}));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    await act(async()=>{await vi.advanceTimersByTimeAsync(60_000);});
    expect(screen.getByText("Estimated time left: ~1–4 min")).toBeInTheDocument();
    await act(async()=>{await vi.advanceTimersByTimeAsync(240_000);});
    expect(screen.getByText(/Taking longer than estimated/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow","1");
    expect(screen.queryByRole("group",{name:"Keep package"})).toBeNull();
  });
  it("resumes a rendering job without a second submission and transitions automatically",async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(response({status:"rendering"})).mockResolvedValueOnce(response(ready));
    vi.stubGlobal("fetch",fetchMock);
    render(<KeepSaveAndPurchase keep={keep}/>);
    await flush();
    expect(screen.getByText(/Time remaining varies/)).toBeInTheDocument();
    expect(screen.queryByText(/Estimated time left:/)).toBeNull();
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
    expect(screen.getByRole("button",{name:/Basic Keep/})).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:/Basic Keep/}));
    expect(screen.getByText("$99.00")).toBeInTheDocument();
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
