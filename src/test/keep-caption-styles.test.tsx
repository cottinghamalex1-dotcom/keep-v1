import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { KeepFinishingChoices } from "@/components/keep-finishing-choices";
import { KeepCaptionEditor } from "@/components/keep-caption-editor";
import { KeepFilmCaption } from "@/components/keep-film-caption";
import { CAPTION_CHOICES, captionLayout } from "../../supabase/functions/keep-render/composition";

afterEach(cleanup);
const noop=()=>{};
const styles=CAPTION_CHOICES.filter(c=>c.name!=="None");
const added=["Editorial","Bold","Heirloom","Whisper","Letter","Golden","Classic Caps"];

function Finishing() {
  const [style,setStyle]=useState("Reel");
  return <KeepFinishingChoices captionStyle={style} musicMood="" visualStyle="" voiceTone="natural"
    tracks={[]} looks={[]} musicSampling="" voiceSampling={null} hasVoice={false}
    onCaption={setStyle} onMusic={noop} onSample={noop} onStyle={noop} onVoice={noop} onVoiceSample={noop} onCreate={noop} />;
}
function Editor() {
  const [style,setStyle]=useState("Reel");
  return <KeepCaptionEditor cues={[]} time={0} style={style} position="bottom" maxLines={2} wordsPerCue={5}
    syncing={false} syncError={false} timingEstimated={false} hasVoice={false} canRestore={false}
    onClose={noop} onSeek={noop} onChangeCaption={noop} onChangeCaptionTime={noop} onChangeStyle={setStyle}
    onChangePosition={noop} onChangeLines={noop} onChangeSize={noop} onRegroup={noop} onRestore={noop}
    onRetrySync={noop} onResync={noop} onPreviewSync={noop} />;
}
describe("expandable caption designs",()=>{
  it("retains twelve different film styles and a no-caption choice",()=>{
    expect(styles).toHaveLength(12);
    expect(CAPTION_CHOICES).toHaveLength(13);
    const signatures=styles.map(({name})=>JSON.stringify(captionLayout(name)));
    expect(new Set(signatures).size).toBe(12);
    expect(added.every(name=>styles.some(c=>c.name===name))).toBe(true);
  });
  it("shows four finishing options, expands all choices and retains the selection when collapsed",()=>{
    render(<Finishing />);
    const section=screen.getByRole("region",{name:"Captions"});
    const choices=()=>within(section).getAllByRole("button",{name:/Caption style:/});
    expect(choices()).toHaveLength(4);
    const expand=within(section).getByRole("button",{name:"Explore more captions"});
    expect(expand).toHaveAttribute("aria-expanded","false");
    fireEvent.click(expand);
    expect(choices()).toHaveLength(13);
    for(const name of added) expect(within(section).getByRole("button",{name:new RegExp("Caption style: "+name)})).toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button",{name:/Caption style: Golden/}));
    fireEvent.click(within(section).getByRole("button",{name:"Show fewer caption options"}));
    expect(choices()).toHaveLength(4);
    expect(within(section).getByRole("button",{name:/Caption style: Golden/})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(within(section).getByRole("button",{name:"Explore more captions"}));
    fireEvent.click(within(section).getByRole("button",{name:/Caption style: None/}));
    expect(within(section).getByRole("button",{name:/Caption style: None/})).toHaveAttribute("aria-pressed","true");
  });
  it("makes all styles available directly in the editor and preserves the choice when collapsed",()=>{
    render(<Editor />);
    const list=()=>document.getElementById("studio-caption-options")!;
    expect(within(list()).getAllByRole("button")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button",{name:"Explore more captions"}));
    expect(within(list()).getAllByRole("button")).toHaveLength(13);
    fireEvent.click(within(list()).getByRole("button",{name:"Classic Caps"}));
    fireEvent.click(screen.getByRole("button",{name:"Show fewer caption options"}));
    expect(within(list()).getByRole("button",{name:"Classic Caps"})).toHaveAttribute("aria-pressed","true");
  });
  it("applies typography, color and case without modifying the actual words",()=>{
    const {rerender}=render(<KeepFilmCaption text="These are my words." style="Classic Caps" />);
    expect(screen.getByText("These are my words.")).toHaveStyle({textTransform:"uppercase"});
    rerender(<KeepFilmCaption text="These are my words." style="Golden" />);
    expect(screen.getByText("These are my words.")).toHaveStyle({color:"#F0D19D"});
    rerender(<KeepFilmCaption text="These are my words." style="None" />);
    expect(screen.queryByText("These are my words.")).toBeNull();
  });
});
