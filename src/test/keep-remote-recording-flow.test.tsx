import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepRemoteContributor } from "@/routes/contribute";
import { useRecorder } from "@/hooks/use-recorder";
import { resolveRemoteInvitation, saveRemoteStory, reviewRemoteParts, uploadRemoteMedia, uploadRemoteRecording, type RemoteInviteDetails } from "@/lib/keep-remote";

vi.mock("@/hooks/use-recorder",()=>({useRecorder:vi.fn()}));
vi.mock("@/lib/keep-remote",()=>({
  resolveRemoteInvitation:vi.fn(), saveRemoteStory:vi.fn(), reviewRemoteParts:vi.fn(), uploadRemoteMedia:vi.fn(), uploadRemoteRecording:vi.fn()
}));

const start=vi.fn();
const stop=vi.fn();
const disableSelfie=vi.fn();
const recordingState=(status:"idle"|"recording"="idle"):ReturnType<typeof useRecorder>=>({
  supported:true,canPause:true,status,elapsed:2,countdown:null,start,stop,disableSelfie,
  pause:vi.fn(),resume:vi.fn(),cancel:vi.fn(),prepareSelfie:vi.fn(),previewStream:null,cameraError:""
});
const invite=(mediaCount:number,completed=0):RemoteInviteDetails=>({
  creatorName:"Alex",recipientName:"Mom",contributorName:"Alex",occasion:"Birthday",expiresAt:"2027-12-01",
  mediaCount,parts:[{index:0,text:"My first words",completed:completed>=1},{index:1,text:"My next words",completed:completed>=2}]
});
beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(useRecorder).mockReturnValue(recordingState());
  start.mockResolvedValue(true);
  vi.mocked(uploadRemoteRecording).mockResolvedValue({saved:true,allFinished:false,emailSent:false});
  vi.mocked(uploadRemoteMedia).mockResolvedValue({saved:true,mediaId:"video",count:1,emailSent:false});
});
afterEach(cleanup);

async function openMedia(count:number,completed=0){
  vi.mocked(resolveRemoteInvitation).mockResolvedValue(invite(count,completed));
  const view=render(<KeepRemoteContributor/>);
  fireEvent.click(await screen.findByRole("button",{name:"I'm ready"}));
  fireEvent.click(screen.getByRole("button",{name:"Continue to photos & videos"}));
  expect(screen.getByRole("region",{name:"Share photos and videos"})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Record my message on camera"})).not.toBeInTheDocument();
  return view;
}
function expectCleanRecorder(){
  expect(screen.getByRole("region",{name:"Recording teleprompter"})).toBeInTheDocument();
  expect(screen.queryByText(/Would you like to appear in your Keep/)).not.toBeInTheDocument();
  expect(screen.queryByText(/iPhone Voice Memos/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Choose audio file/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Record selfie too"})).not.toBeInTheDocument();
}
describe("remote media-first recording",()=>{
  it("goes straight to voice recording when photos or videos have already been shared",async()=>{
    await openMedia(1);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    expectCleanRecorder();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    expect(start).toHaveBeenCalledWith({selfie:false,countdown:true});
  });
  it("only offers camera after continuing without photos, and allows voice only",async()=>{
    await openMedia(0);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Back to photos & videos"}));
    expect(screen.getByRole("region",{name:"Share photos and videos"})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Continue with voice only"}));
    expectCleanRecorder();
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    expect(start).toHaveBeenCalledWith({selfie:false,countdown:true});
  });
  it("records each section with the selected selfie fallback without another choice",async()=>{
    const view=await openMedia(0);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Record my message on camera"}));
    expectCleanRecorder();
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    expect(start).toHaveBeenLastCalledWith({selfie:true,countdown:true});
    stop.mockResolvedValue({blob:new Blob(["voice"],{type:"audio/webm"}),durationSec:2,mimeType:"audio/webm",selfieBlob:new Blob(["camera"],{type:"video/webm"}),selfieMimeType:"video/webm"});
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(invite(1,1));
    vi.mocked(useRecorder).mockReturnValue(recordingState("recording"));
    view.rerender(<KeepRemoteContributor/>);
    fireEvent.click(screen.getByRole("button",{name:"Save & next section"}));
    vi.mocked(useRecorder).mockReturnValue(recordingState());
    await waitFor(()=>expect(screen.getByText("My next words")).toBeInTheDocument());
    await waitFor(()=>expect(screen.getByRole("button",{name:"Start recording"})).toBeInTheDocument());
    expect(uploadRemoteMedia).toHaveBeenCalledWith("",expect.any(File),"video",2,"selfie",0);
    expectCleanRecorder();
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    expect(start).toHaveBeenLastCalledWith({selfie:true,countdown:true});
  });
  it("offers a voice-only recovery if the selected camera is unavailable",async()=>{
    await openMedia(0);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Record my message on camera"}));
    start.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    fireEvent.click(await screen.findByRole("button",{name:"Continue with voice only"}));
    fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    expect(start).toHaveBeenLastCalledWith({selfie:false,countdown:true});
  });
});


describe("remote creative journey",()=>{
  it("starts with a contributor’s own memories, then uses the same invitation to review their assigned parts",async()=>{
    const before:RemoteInviteDetails={...invite(0),contributorName:"Mom",recipientName:"Grandma",parts:[],creativeStory:{relationship:"daughter",answers:[],completed:false}};
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(before);
    vi.mocked(saveRemoteStory).mockImplementation(async(_token,story)=>({story}));
    render(<KeepRemoteContributor/>);
    fireEvent.click(await screen.findByRole("button",{name:"I know what I want to say"}));
    expect(screen.queryByRole("region",{name:"Recording teleprompter"})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox",{name:"Your own words"}),{target:{value:"My mom taught me to bake."}});
    fireEvent.click(screen.getByRole("button",{name:"Submit my words"}));
    const confirmation=await screen.findByRole("dialog",{name:"Your memories are sent."});
    expect(confirmation).toHaveTextContent("You’re done for now");
    expect(confirmation).toHaveTextContent("Return to this same private link");
    expect(confirmation).toHaveTextContent("Alex");
    fireEvent.click(screen.getByRole("button",{name:"Done for now"}));
    await screen.findByText("Your memories are shared.");
    expect(saveRemoteStory).toHaveBeenCalledWith("",expect.objectContaining({relationship:"daughter",written:"My mom taught me to bake.",completed:true}));
    vi.mocked(resolveRemoteInvitation).mockResolvedValue({...before,creativeStory:{relationship:"daughter",answers:[],written:"My mom taught me to bake.",completed:true},parts:[{index:1,text:"Mom taught me to bake.",completed:false}]});
    fireEvent.click(screen.getByRole("button",{name:/Check if my words are ready/}));
    await screen.findByText("Make these words yours.");
    vi.mocked(reviewRemoteParts).mockResolvedValue({saved:true});
    fireEvent.change(screen.getByRole("textbox",{name:"Your part 1"}),{target:{value:"Mom, you taught me to bake."}});
    fireEvent.click(screen.getByRole("button",{name:"Ready to record my words"}));
    await screen.findByRole("button",{name:"I'm ready"});
    expect(reviewRemoteParts).toHaveBeenCalledWith("",[{index:1,text:"Mom, you taught me to bake."}]);
  });
});


describe("contributor handoff confirmations",()=>{
  it("does not confirm a memory submission when saving fails",async()=>{
    vi.mocked(resolveRemoteInvitation).mockResolvedValue({...invite(0),contributorName:"Kristen",recipientName:"Nanny",parts:[],creativeStory:{relationship:"daughter",answers:[],completed:false}});
    vi.mocked(saveRemoteStory).mockRejectedValueOnce(new Error("Please try again."));
    render(<KeepRemoteContributor/>);
    fireEvent.click(await screen.findByRole("button",{name:"I know what I want to say"}));
    fireEvent.change(screen.getByRole("textbox",{name:"Your own words"}),{target:{value:"My favorite memory."}});
    fireEvent.click(screen.getByRole("button",{name:"Submit my words"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("confirms the final recording after upload and leaves a clear receipt on dismissal",async()=>{
    const view=await openMedia(1,1);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    stop.mockResolvedValue({blob:new Blob(["voice"],{type:"audio/webm"}),durationSec:2,mimeType:"audio/webm"});
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(invite(1,2));
    vi.mocked(useRecorder).mockReturnValue(recordingState("recording"));
    view.rerender(<KeepRemoteContributor/>);
    fireEvent.click(screen.getByRole("button",{name:"Save final section"}));
    const confirmation=await screen.findByRole("dialog",{name:"You’re all set."});
    expect(confirmation).toHaveTextContent("Nothing else to do");
    expect(confirmation).toHaveTextContent("You can close this page");
    expect(confirmation).toHaveTextContent("safely with Alex");
    fireEvent.click(screen.getByRole("button",{name:"Done",exact:true}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("You’re all done.")).toBeInTheDocument();
  });
  it("does not claim completion if the final recording upload fails",async()=>{
    const view=await openMedia(1,1);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    stop.mockResolvedValue({blob:new Blob(["voice"],{type:"audio/webm"}),durationSec:2,mimeType:"audio/webm"});
    vi.mocked(uploadRemoteRecording).mockRejectedValueOnce(new Error("Couldn't send your voice."));
    vi.mocked(useRecorder).mockReturnValue(recordingState("recording"));
    view.rerender(<KeepRemoteContributor/>);
    fireEvent.click(screen.getByRole("button",{name:"Save final section"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send your voice.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Retry upload"})).toBeInTheDocument();
  });
  it("waits for a failed selfie to be retried or skipped before final confirmation",async()=>{
    const view=await openMedia(0,1);
    fireEvent.click(screen.getByRole("button",{name:"Continue to recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Record my message on camera"}));
    stop.mockResolvedValue({blob:new Blob(["voice"],{type:"audio/webm"}),durationSec:2,mimeType:"audio/webm",selfieBlob:new Blob(["camera"],{type:"video/webm"}),selfieMimeType:"video/webm"});
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(invite(0,2));
    vi.mocked(uploadRemoteMedia).mockRejectedValueOnce(new Error("Selfie failed."));
    vi.mocked(useRecorder).mockReturnValue(recordingState("recording"));
    view.rerender(<KeepRemoteContributor/>);
    fireEvent.click(screen.getByRole("button",{name:"Save final section"}));
    const skip=await screen.findByRole("button",{name:"Skip selfie video"});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:/I'm finished/})).toBeDisabled();
    fireEvent.click(skip);
    fireEvent.click(screen.getByRole("button",{name:/I'm finished/}));
    expect(await screen.findByRole("dialog",{name:"You’re all set."})).toBeInTheDocument();
  });
});

describe("persistent approval handoff",()=>{
  const review:RemoteInviteDetails={...invite(0),reviewRequired:true,approvedAt:null,recordingUnlocked:false,contributorName:"Mom",parts:[{index:1,text:"My original words",completed:false}],creativeStory:{relationship:"daughter",answers:[],written:"My memories",completed:true}};
  it("returns an approved guest to the waiting page after reopening, then unlocks recording only when everyone approves",async()=>{
    const approved={...review,approvedAt:"2026-11-28",parts:[{index:1,text:"My approved words",completed:false}]};
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(approved);
    render(<KeepRemoteContributor/>);
    await screen.findByText("Your words are ready.");
    expect(screen.queryByRole("button",{name:"I'm ready"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Approve my words"})).not.toBeInTheDocument();
    vi.mocked(resolveRemoteInvitation).mockResolvedValue({...approved,recordingUnlocked:true});
    fireEvent.click(screen.getByRole("button",{name:"Check recording status"}));
    await screen.findByRole("button",{name:"I'm ready"});
  });
  it("requires an explicit approval even when the guest keeps the draft unchanged",async()=>{
    vi.mocked(resolveRemoteInvitation).mockResolvedValue(review);
    vi.mocked(reviewRemoteParts).mockResolvedValue({saved:true});
    render(<KeepRemoteContributor/>);
    await screen.findByText("Make these words yours.");
    vi.mocked(resolveRemoteInvitation).mockResolvedValue({...review,approvedAt:"2026-11-28"});
    fireEvent.click(screen.getByRole("button",{name:"Approve my words"}));
    await screen.findByText("Your words are ready.");
    expect(reviewRemoteParts).toHaveBeenCalledWith("",[{index:1,text:"My original words"}],[{index:1,text:"My original words"}]);
  });
});
