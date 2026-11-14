import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepRemoteMediaContributor } from "@/components/keep-remote-media-contributor";
import { KeepRemoteInviteManager } from "@/components/keep-remote-invite-manager";
import { newProject } from "@/lib/keep-project";
import { prepareRemoteMoment } from "@/lib/keep-remote-media-prep";
import { listRemoteInvites, listRemoteMedia, uploadRemoteMedia } from "@/lib/keep-remote";

vi.mock("@/lib/keep-remote",()=>({
  listRemoteInvites:vi.fn(),listRemoteMedia:vi.fn(),uploadRemoteMedia:vi.fn(),
  createRemoteInvite:vi.fn(),revokeRemoteInvite:vi.fn()
}));
vi.mock("@/lib/keep-cloud",()=>({
  activeKeepSession:vi.fn(),saveCloudDraft:vi.fn()
}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

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
  await waitFor(()=>expect(screen.getByText(/1 photos or videos received/)).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:/Review & add 1 shared moments/}));
  await waitFor(()=>expect(screen.getByText("family.jpg")).toBeTruthy());
  fireEvent.click(screen.getByRole("button",{name:/Add 1 selected moment/}));
  await waitFor(()=>expect(onImportMedia).toHaveBeenCalledOnce());
  expect(onImportMedia.mock.calls[0]?.[0][0].id).toBe("photo-1");
});
