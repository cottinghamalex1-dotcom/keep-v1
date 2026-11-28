import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { KeepCreativeCollaboration } from "@/components/keep-creative-collaboration";
import { KeepCreativeInterview, emptyStory } from "@/components/keep-creative-interview";
import { newProject, type KeepProject } from "@/lib/keep-project";
import { publicationSettings } from "@/lib/keep-publish";
import { resumeKeepRecordingFlow } from "@/lib/keep-recording-flow";
import { fetchCollaborativeDraft, fetchCreativeQuestion } from "@/lib/keep-ai";

vi.mock("@/lib/keep-ai",()=>({fetchCreativeQuestion:vi.fn(),fetchCollaborativeDraft:vi.fn(),transcribeAudio:vi.fn()}));
afterEach(cleanup);
beforeEach(()=>vi.clearAllMocks());
const ctx={recipientName:"Grandma",relationship:"grandson",occasion:"Birthday",intent:"Make her feel loved",answers:[]};
describe("creative collaboration",()=>{
  it("keeps each person's own words separate and waits for both before weaving",async()=>{
    const initial={...newProject(),voiceMode:"together" as const,recipientName:"Grandma",relationship:"grandson",contributors:[{id:"alex",name:"Alex",relationship:"grandson"},{id:"mom",name:"Mom",relationship:"daughter"}]};
    const finished=vi.fn();
    vi.mocked(fetchCollaborativeDraft).mockResolvedValue([{contributorId:"mom",text:"Mom, thank you."},{contributorId:"alex",text:"Grandma, I love you."}]);
    function Harness(){const [p,update]=useState<KeepProject>(initial);return <KeepCreativeCollaboration project={p} onChange={patch=>update(old=>({...old,...patch}))} onComplete={finished}/>;}
    render(<Harness/>);
    expect(screen.getByRole("button",{name:/Bring our stories together/})).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button",{name:/Share my memories/})[0]!);
    fireEvent.click(screen.getByRole("button",{name:/I know what I want to say/}));
    fireEvent.change(screen.getByRole("textbox",{name:"Your own words"}),{target:{value:"Grandma baked with me."}});
    fireEvent.click(screen.getByRole("button",{name:/Submit my words/}));
    await screen.findByText("1 of 2 stories submitted");
    expect(screen.getByRole("button",{name:/Bring our stories together/})).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:/Share my memories/}));
    fireEvent.click(screen.getByRole("button",{name:/I know what I want to say/}));
    fireEvent.change(screen.getByRole("textbox",{name:"Your own words"}),{target:{value:"Mom taught me to be patient."}});
    fireEvent.click(screen.getByRole("button",{name:/Submit my words/}));
    await screen.findByText("2 of 2 stories submitted");
    fireEvent.click(screen.getByRole("button",{name:/Bring our stories together/}));
    await waitFor(()=>expect(finished).toHaveBeenCalledWith(expect.objectContaining({paragraphSpeakers:["mom","alex"]})));
    const [,people]=vi.mocked(fetchCollaborativeDraft).mock.calls[0]!;
    expect(people.map(p=>[p.id,p.story.relationship,p.story.written])).toEqual([["alex","grandson","Grandma baked with me."],["mom","daughter","Mom taught me to be patient."]]);
  });
  it("asks follow-up questions using only the selected person's relationship and answers",async()=>{
    vi.mocked(fetchCreativeQuestion).mockResolvedValueOnce("What does your mom mean to you?").mockResolvedValueOnce("Tell me more about the kitchen.");
    const save=vi.fn().mockResolvedValue(undefined);
    render(<KeepCreativeInterview name="Mom" context={ctx} story={emptyStory("daughter")} onSave={save} onDone={()=>{}}/>);
    fireEvent.click(screen.getByRole("button",{name:/Help me find the words/}));
    await screen.findByText("What does your mom mean to you?");
    fireEvent.change(screen.getByRole("textbox",{name:"Your answer"}),{target:{value:"We spent time in the kitchen."}});
    fireEvent.click(screen.getByRole("button",{name:/Continue/}));
    await screen.findByText("Tell me more about the kitchen.");
    expect(fetchCreativeQuestion).toHaveBeenLastCalledWith(expect.objectContaining({relationship:"daughter",contributors:[],answers:[{question:"What does your mom mean to you?",transcript:"We spent time in the kitchen."}]}),"Mom");
  });
  it("does not publish private interview notes",()=>{
    const project={...newProject(),contributors:[{id:"a",name:"Alex",story:{relationship:"grandson",answers:[],written:"Private notes",completed:true}}]};
    expect(publicationSettings(project).contributors).toEqual([{id:"a",name:"Alex"}]);
  });
  it("routes unfinished collaborative interviews into the new flow, leaving solo alone",()=>{
    const base={...newProject(),stage:"interview"};
    expect(resumeKeepRecordingFlow({...base,voiceMode:"together"})).toBe("collaboration");
    expect(resumeKeepRecordingFlow(base)).toBe("interview");
  });
});
