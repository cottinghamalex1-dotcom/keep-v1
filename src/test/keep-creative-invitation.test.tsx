import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepCreativeCollaboration } from "@/components/keep-creative-collaboration";
import { newProject } from "@/lib/keep-project";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, listRemoteInvites } from "@/lib/keep-remote";

vi.mock("@/lib/keep-cloud", () => ({activeKeepSession:vi.fn(),saveCloudDraft:vi.fn()}));
vi.mock("@/lib/keep-remote", () => ({createRemoteInvite:vi.fn(),listRemoteInvites:vi.fn()}));
const url = "https://keep-v1.vercel.app/contribute?invite=test-private-token";
const expiresAt = "2099-01-01T00:00:00Z";
const project = {...newProject(), active:true, publicationId:"keep", voiceMode:"together" as const,
  voiceRecordingLocation:"remote" as const, recipientName:"Nanny", contributors:[{id:"a",name:"Alex"},{id:"k",name:"Kristen"}]};
const existing = {id:"invite",contributorId:"k",contributorName:"Kristen",total:0,completed:0,expiresAt,emailSent:false,mediaCount:0,url};
const view = () => render(<KeepCreativeCollaboration project={project} onChange={vi.fn()} onComplete={vi.fn()}/>);
const clipboard = vi.fn().mockResolvedValue(undefined);
const share = vi.fn().mockResolvedValue(undefined);
beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(activeKeepSession).mockResolvedValue({access_token:"token",refresh_token:"refresh",expires_at:9999999999,user:{id:"a"}});
  vi.mocked(saveCloudDraft).mockResolvedValue(undefined);
  vi.mocked(listRemoteInvites).mockResolvedValue({invites:[existing]});
  vi.mocked(createRemoteInvite).mockResolvedValue({url,expiresAt});
  Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:clipboard}});
  Object.defineProperty(navigator,"share",{configurable:true,value:share});
});
afterEach(cleanup);

describe("editable creative invitations",()=>{
  it("shows just the two invitation actions with no visible private URL and shares edited text",async()=>{
    view();
    await screen.findByText("Invited");
    expect(screen.queryByRole("button",{name:/create a new private link/i})).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(url)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Share invitation"}));
    const dialog=await screen.findByRole("dialog");
    const field=within(dialog).getByRole("textbox",{name:"Your invitation message"});
    expect(field).toHaveValue("Hi Kristen! I'd love to create a Keep with you for Nanny. This private link lets you share your own memories, photos and voice. No account needed:");
    fireEvent.change(field,{target:{value:"Mom, let's make this for Nanny!"}});
    const button=within(dialog).getByRole("button",{name:"Share invitation"});
    await waitFor(()=>expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(()=>expect(share).toHaveBeenCalledWith({text:"Mom, let's make this for Nanny!\n\n"+url}));
    expect(createRemoteInvite).not.toHaveBeenCalled();
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button",{name:"Copy invitation"}));
    const copyDialog=await screen.findByRole("dialog");
    expect(within(copyDialog).getByRole("textbox")).toHaveValue("Mom, let's make this for Nanny!");
    const copyButton=within(copyDialog).getByRole("button",{name:"Copy invitation"});
    await waitFor(()=>expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);
    await waitFor(()=>expect(clipboard).toHaveBeenCalledWith("Mom, let's make this for Nanny!\n\n"+url));
    expect(await screen.findByText("Invitation copied.")).toBeInTheDocument();
    expect(createRemoteInvite).not.toHaveBeenCalled();
  });
  it("prepares a new private link automatically when a person's first invitation is requested",async()=>{
    vi.mocked(listRemoteInvites).mockResolvedValue({invites:[]});
    view();
    fireEvent.click(screen.getByRole("button",{name:"Copy invitation"}));
    await waitFor(()=>expect(createRemoteInvite).toHaveBeenCalledWith(expect.objectContaining({keepId:"keep",contributorId:"k",creative:true})));
    expect(saveCloudDraft).toHaveBeenCalled();
    const dialog=screen.getByRole("dialog");
    const button=within(dialog).getByRole("button",{name:"Copy invitation"});
    await waitFor(()=>expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(()=>expect(clipboard).toHaveBeenCalledWith(expect.stringContaining(url)));
  });
});
