import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";
import { KeepGiftTimeline, FirstExperienceBadge } from "@/components/keep-gift-activity";
import { recordFirstExperience, loadGiftActivities, type GiftActivity } from "@/lib/keep-gift-activity";
import { activeKeepSession, readKeepSession } from "@/lib/keep-cloud";
import { canConfirmDelivery, deliveryEmail, emailRetryable, validDeliveryDate } from "../../supabase/functions/keep-gift-events/policy";
vi.mock("@/lib/keep-cloud",()=>({activeKeepSession:vi.fn(),readKeepSession:vi.fn()}));
vi.mock("@/components/keep-player",()=>({
  memoryImages:[],
  KeepPlayer:({onOpeningFrameReady,onExit}:{onOpeningFrameReady:()=>void;onExit:()=>void})=><div><button onClick={onOpeningFrameReady}>First frame ready</button><button onClick={onExit}>Exit player</button></div>,
}));
const session={access_token:"access",refresh_token:"refresh",user:{id:"owner"}};
const film={name:"Dad",from:"Alex",year:"2026",audioUrl:"/test.mp3",audioDuration:30,messageParagraphs:["I love you, Dad."],media:[{url:"/photo.jpg",kind:"image" as const}],persistVisit:false};
const fetchOK=()=>new Response(JSON.stringify({ok:true,activities:{}}),{status:200});
beforeEach(()=>{vi.clearAllMocks();vi.mocked(readKeepSession).mockReturnValue(null);vi.mocked(activeKeepSession).mockResolvedValue(session);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe("intentional first experience milestone",()=>{
  it("does not register a link preview or a tap before a live film is ready",()=>{
    const callback=vi.fn();
    render(<KeepRecipientExperience {...film} onFirstExperience={callback}/>);
    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByText(/creator can see when/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Experience your Keep"}));
    expect(callback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"First frame ready"}));
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("does not count loaded MP4 metadata as a view; counts actual playback",()=>{
    const callback=vi.fn();
    const {container}=render(<KeepRecipientExperience {...film} renderedVideoUrl="/film.mp4" onFirstExperience={callback}/>);
    fireEvent.click(screen.getByRole("button",{name:"Experience your Keep"}));
    const video=container.querySelector("video")!;
    fireEvent.loadedData(video);
    expect(callback).not.toHaveBeenCalled();
    fireEvent.playing(video);
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("never reports creator previews, even when opening media is ready",()=>{
    const callback=vi.fn();
    render(<KeepRecipientExperience {...film} creatorPreview initialExperience="watch" onFirstExperience={callback}/>);
    fireEvent.click(screen.getByRole("button",{name:"First frame ready"}));
    expect(callback).not.toHaveBeenCalled();
    expect(screen.queryByText(/creator can see when/i)).toBeNull();
  });
  it("reports an intentional read experience",()=>{
    const callback=vi.fn();
    render(<KeepRecipientExperience {...film} onFirstExperience={callback}/>);
    fireEvent.click(screen.getByRole("button",{name:"Experience your Keep"}));
    fireEvent.click(screen.getByRole("button",{name:"Exit player"}));
    fireEvent.click(screen.getByRole("button",{name:/Just the written message/i}));
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("sends the creator session for server-side exclusion instead of masquerading as an anonymous recipient",async()=>{
    vi.mocked(readKeepSession).mockReturnValue(session);
    const fetcher=vi.fn().mockResolvedValue(fetchOK());vi.stubGlobal("fetch",fetcher);
    await recordFirstExperience("viewing-token");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({action:"first-experience",token:"viewing-token"});
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("Bearer access");
  });
  it("fails closed if a stored session cannot be renewed",async()=>{
    vi.mocked(readKeepSession).mockReturnValue(session);vi.mocked(activeKeepSession).mockResolvedValue(null);
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    expect(await recordFirstExperience("viewing-token")).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not collect viewer identifiers from anonymous recipients",async()=>{
    const fetcher=vi.fn().mockResolvedValue(fetchOK());vi.stubGlobal("fetch",fetcher);
    await recordFirstExperience("token");
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({action:"first-experience",token:"token"});
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });
  it("requests account activity only with an authenticated session",async()=>{
    const fetcher=vi.fn().mockResolvedValue(fetchOK());vi.stubGlobal("fetch",fetcher);
    await loadGiftActivities(["one","one"]);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({action:"owner-status",keepIds:["one"]});
    expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("Bearer access");
  });
});

describe("gift delivery safeguards",()=>{
  const shipment={purchase_id:"p",shipped:true,shipping_carrier:"USPS",tracking_number:"TRACK"};
  const purchase={status:"shipped",keep_id:"k",owner_id:"owner"};
  it("requires a shipped order linked to a creator and real tracking",()=>{
    expect(canConfirmDelivery(shipment,purchase)).toBe(true);
    expect(canConfirmDelivery(shipment,{...purchase,status:"approved"})).toBe(true);
    expect(canConfirmDelivery({...shipment,shipped:false},purchase)).toBe(false);
    expect(canConfirmDelivery({...shipment,tracking_number:""},purchase)).toBe(false);
    expect(canConfirmDelivery(shipment,{...purchase,status:"refunded"})).toBe(false);
    expect(canConfirmDelivery(shipment,{...purchase,owner_id:null})).toBe(false);
  });
  it("rejects impossible carrier dates",()=>{
    const now=Date.parse("2026-11-27T12:00:00Z");
    expect(validDeliveryDate("2026-11-26T14:00:00Z","2026-11-24T12:00:00Z",now)).toBe("2026-11-26T14:00:00.000Z");
    expect(validDeliveryDate("2026-11-28T12:00:00Z",null,now)).toBeNull();
    expect(validDeliveryDate("2026-11-23T12:00:00Z","2026-11-24T12:00:00Z",now)).toBeNull();
    expect(validDeliveryDate("not a date",null,now)).toBeNull();
  });
  it("never retries a sent or ambiguous email automatically",()=>{
    for(const state of ["sent","sending","unknown"] as const)expect(emailRetryable(state)).toBe(false);
    for(const state of ["pending","failed","unconfigured"] as const)expect(emailRetryable(state)).toBe(true);
  });
  it("uses the private creator dashboard in the notification, not the recipient's viewing token",()=>{
    const message=deliveryEmail("Dad");
    expect(message.subject).toBe("Your Keep has been delivered");
    expect(message.text).toContain("confirmed delivered");
    expect(message.text).toContain("/my-keeps");
    expect(message.text).not.toContain("/recipient?");
  });
  it("clearly distinguishes shipped, delivered, and first-view milestones",()=>{
    const activity:GiftActivity={firstExperiencedAt:null,shipments:[{purchaseId:"p",shipped:true,shippedAt:"2026-11-24T12:00:00Z",carrier:"USPS",tracking:"TRACK",deliveredAt:null,emailSent:false}]};
    const {rerender}=render(<KeepGiftTimeline activity={activity}/>);
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(screen.getByText("Awaiting delivery")).toBeInTheDocument();
    expect(screen.getByText("Not yet recorded")).toBeInTheDocument();
    expect(screen.queryByText("Delivery email sent")).toBeNull();
    const delivered={...activity,firstExperiencedAt:"2026-11-27T15:00:00Z",shipments:activity.shipments.map(s=>({...s,deliveredAt:"2026-11-26T14:00:00Z",emailSent:true}))};
    rerender(<><FirstExperienceBadge activity={delivered}/><KeepGiftTimeline activity={delivered}/></>);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Delivery email sent")).toBeInTheDocument();
    expect(screen.getByText("First experienced")).toBeInTheDocument();
    expect(screen.getByText(/First experienced ·/)).toBeInTheDocument();
  });
});
