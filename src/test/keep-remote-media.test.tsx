import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeepRemoteMediaContributor } from "@/components/keep-remote-media-contributor";
import { KeepRemoteInviteManager } from "@/components/keep-remote-invite-manager";
import { newProject } from "@/lib/keep-project";
import { prepareRemoteMoment } from "@/lib/keep-remote-media-prep";
import { createRemoteInvite, releaseRemoteScript, listRemoteInvites, listRemoteMedia, uploadRemoteMedia } from "@/lib/keep-remote";

import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";

vi.mock("@/lib/keep-remote",()=>({
  listRemoteInvites:vi.fn(),listRemoteMedia:vi.fn(),uploadRemoteMedia:vi.fn(),
  createRemoteInvite:vi.fn(),releaseRemoteScript:vi.fn(),revokeRemoteInvite:vi.fn()
}));
vi.mock("@/lib/keep-cloud",()=>({
  activeKeepSession:vi.fn(),saveCloudDraft:vi.fn()
}));
beforeEach(()=>{vi.spyOn(window,"scrollTo").mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.restoreAllMocks();});

it("accepts a photo from the same guest invitation and reports the secure upload",async()=>{
  vi.mocked(uploadRemoteMedia).mockResolvedValue({saved:true,mediaId:"abc",count:2,emailSent:false});
  const updated=vi.fn();
  render(<KeepRemoteMediaContributor token="private-invite" mediaCount={1} onUploaded={updated}/>);
  const photo=new File(["this is a test photo"],"family.jpg",{type:"image/jpeg"});
  fireEvent.change(screen.getByLabelText("Choose photos and short videos"),{target:{files:[photo]}});
  await waitFor(()=>expect(uploadRemoteMedia).toHaveBeenCalledWith("private-invite",photo,"image",undefined));
  expect(updated).toHaveBeenCalledWith(2);
  expect(screen.getByText(/moment sent successfully|moments sent successfully/)).toBeTruthy();
});

it("preserves a small photo without destructive processing",async()=>{
  const photo=new File(["small"],"memory.jpg",{type:"image/jpeg"});
  const result=await prepareRemoteMoment(photo);
  expect(result.kind).toBe("image");
  expect(result.file).toBe(photo);
});

it("lets the creator review and select shared moments before importing",async()=>{
  vi.mocked(listRemoteInvites).mockResolvedValue({
    notificationsEnabled:false,
    invites:[{id:"invite-one",contributorId:"a",contributorName:"Diane",total:1,completed:1,expiresAt:"2026-12-15T00:00:00Z",emailSent:false,mediaCount:1}]
  });
  vi.mocked(listRemoteMedia).mockResolvedValue({media:[{
    id:"photo-1",kind:"image",contributorName:"Diane",contributorId:"a",
    name:"family.jpg",mimeType:"image/jpeg",bytes:500,durationSec:null,
    signedUrl:"https://example.com/photo",uploadedAt:"2026-11-14T12:00:00Z"
  }]});
  const onImportMedia=vi.fn().mockResolvedValue(1);
  const project={...newProject(),publicationId:"keep-id",recipientName:"Mom",voiceMode:"together" as const,
    voiceRecordingLocation:"remote" as const,contributors:[{id:"a",name:"Diane"},{id:"b",name:"Caren"}],
    messageParagraphs:["Happy birthday","You are loved"],paragraphSpeakers:["a","b"]};
  render(<KeepRemoteInviteManager project={project} onContinue={vi.fn()} onCombine={vi.fn()}
    onImportMedia={onImportMedia} combining={false} onBack={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:/Continue to photos/}));
  await waitFor(()=>expect(screen.getByText(/1 photo or video received/)).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:/Review shared moments/}));
  await waitFor(()=>expect(screen.getByText("family.jpg")).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:/Add 1 selected moment/}));
  await waitFor(()=>expect(onImportMedia).toHaveBeenCalledOnce());
  expect(onImportMedia.mock.calls[0]?.[0][0].id).toBe("photo-1");
});


const groupProject={...newProject(),publicationId:"keep-id",recipientName:"Mom",voiceMode:"together" as const,
  voiceRecordingLocation:"remote" as const,contributors:[{id:"a",name:"Alex"},{id:"b",name:"Kristen"}],
  messageParagraphs:["Happy birthday","You are loved"],paragraphSpeakers:["a","b"]};
const readyInvite=(id:string,name:string)=>({id:`invite-${id}`,contributorId:id,contributorName:name,total:1,completed:1,
  expiresAt:"2099-12-15T00:00:00Z",emailSent:false,mediaCount:0});

it("shows only the active step, keeps the highlighted navigation, and allows photos while voices are pending",async()=>{
  vi.mocked(listRemoteInvites).mockResolvedValue({invites:[readyInvite("a","Alex")],notificationsEnabled:true});
  const onContinue=vi.fn(), onCombine=vi.fn();
  render(<KeepRemoteInviteManager project={groupProject} onContinue={onContinue} onCombine={onCombine}
    onImportMedia={vi.fn()} combining={false} onBack={vi.fn()}/>);
  expect(screen.queryByText(/CREATE TOGETHER · FROM ANYWHERE/)).toBeNull();
  expect(screen.getByRole("button",{name:/1. Voices/})).toHaveAttribute("aria-current","step");
  expect(screen.queryByText("Shared moments.")).toBeNull();
  expect(screen.queryByText("Bring it together.")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/Continue to photos/}));
  expect(screen.getByRole("button",{name:/2. Photos/})).toHaveAttribute("aria-current","step");
  expect(screen.queryByText("Record or invite.")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/Continue to finish/}));
  expect(screen.getByRole("button",{name:/3. Finish/})).toHaveAttribute("aria-current","step");
  await waitFor(()=>expect(screen.getByText("1 of 2 voices ready")).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:"Continue with photos"}));
  expect(onContinue).toHaveBeenCalledOnce();
  expect(onCombine).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:/1. Voices/}));
  expect(screen.getByRole("button",{name:/Invite Kristen/})).toBeTruthy();
});

it("combines only when every voice is ready",async()=>{
  vi.mocked(listRemoteInvites).mockResolvedValue({invites:[readyInvite("a","Alex"),readyInvite("b","Kristen")],notificationsEnabled:true});
  const onCombine=vi.fn().mockResolvedValue(undefined), onContinue=vi.fn();
  render(<KeepRemoteInviteManager project={groupProject} onContinue={onContinue} onCombine={onCombine}
    onImportMedia={vi.fn()} combining={false} onBack={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button",{name:/3. Finish/}));
  await waitFor(()=>expect(screen.getByText("2 of 2 voices ready")).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:"Bring every voice together"}));
  expect(onCombine).toHaveBeenCalledOnce();
  expect(onContinue).not.toHaveBeenCalled();
});

it("offers separate record and invite actions and retains private links while navigating",async()=>{
  vi.mocked(listRemoteInvites).mockResolvedValue({invites:[],notificationsEnabled:true});
  vi.mocked(activeKeepSession).mockResolvedValue({access_token:"session"} as Awaited<ReturnType<typeof activeKeepSession>>);
  vi.mocked(saveCloudDraft).mockResolvedValue(undefined as Awaited<ReturnType<typeof saveCloudDraft>>);
  vi.mocked(createRemoteInvite).mockResolvedValue({url:"https://example.com/private",expiresAt:"2099-12-15T00:00:00Z"});
  render(<KeepRemoteInviteManager project={groupProject} onContinue={vi.fn()} onCombine={vi.fn()}
    onImportMedia={vi.fn()} combining={false} onBack={vi.fn()}/>);
  const kristen=screen.getByRole("region",{name:"Kristen’s recording"});
  expect(within(kristen).getByRole("button",{name:"Record here"})).toBeTruthy();
  fireEvent.click(within(kristen).getByRole("button",{name:"Invite Kristen"}));
  await waitFor(()=>expect(within(kristen).getByRole("button",{name:"Share by text"})).toBeTruthy());
  await waitFor(()=>expect(screen.getByRole("button",{name:/Continue to photos/})).not.toBeDisabled());
  expect(createRemoteInvite).toHaveBeenCalledWith(expect.objectContaining({contributorId:"b",creatorName:"Alex"}));
  fireEvent.click(screen.getByRole("button",{name:/Continue to photos/}));
  fireEvent.click(screen.getByRole("button",{name:/Back to voices/}));
  const restored=screen.getByRole("region",{name:"Kristen’s recording"});
  expect(within(restored).getByRole("link",{name:"Record here"})).toHaveAttribute("href","https://example.com/private");
  expect(within(restored).getByRole("button",{name:"Copy invite"})).toBeTruthy();
});


it("releases the guest's attributed script to their original creative link without generating a new invite",async()=>{
  const guest={...readyInvite("b","Kristen"),total:0,completed:0,creativeStory:{relationship:"daughter",answers:[],written:"My memories",completed:true}};
  vi.mocked(listRemoteInvites).mockResolvedValue({invites:[guest]});
  vi.mocked(activeKeepSession).mockResolvedValue({access_token:"session"} as Awaited<ReturnType<typeof activeKeepSession>>);
  vi.mocked(saveCloudDraft).mockResolvedValue(undefined);
  vi.mocked(releaseRemoteScript).mockResolvedValue({released:true});
  render(<KeepRemoteInviteManager project={{...groupProject,collaborativeCreative:true}} onContinue={vi.fn()} onCombine={vi.fn()} onImportMedia={vi.fn()} combining={false} onBack={vi.fn()}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Share speaking parts with contributors"}));
  await waitFor(()=>expect(releaseRemoteScript).toHaveBeenCalledWith(expect.objectContaining({contributorId:"b",parts:[{index:1,text:"You are loved"}]})));
  expect(createRemoteInvite).not.toHaveBeenCalled();
  await screen.findByText(/same private links/);
});
