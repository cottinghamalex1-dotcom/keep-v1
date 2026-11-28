import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepRemoteContributor } from "@/routes/contribute";
import { useRecorder } from "@/hooks/use-recorder";
import { resolveRemoteInvitation, uploadRemoteMedia, uploadRemoteRecording, type RemoteInviteDetails } from "@/lib/keep-remote";

vi.mock("@/hooks/use-recorder",()=>({useRecorder:vi.fn()}));
vi.mock("@/lib/keep-remote",()=>({
  resolveRemoteInvitation:vi.fn(), uploadRemoteMedia:vi.fn(), uploadRemoteRecording:vi.fn()
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

async function openMedia(count:number){
  vi.mocked(resolveRemoteInvitation).mockResolvedValue(invite(count));
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
