import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepSelfiePrompt } from "@/components/keep-selfie-prompt";
import { KeepSelfieEditor } from "@/components/keep-selfie-editor";
import { composeSelfieStory, withoutSelfieScenes } from "@/lib/keep-selfie-story";
import { filmTotal } from "@/lib/keep-film-timing";
import type { MediaItem } from "@/lib/keep-project";

const take=(id:string,part=0,seconds=150):MediaItem=>({
  id,blobId:id,kind:"video",source:"upload",url:`blob:${id}`,
  persisted:true,isSelfie:true,selfiePartIndex:part,displayDurationSec:seconds,videoDurationSec:seconds
});
const photo=(id:string):MediaItem=>({
  id,kind:"image",source:"upload",url:`blob:${id}`,displayDurationSec:7
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe("optional selfie presentation",()=>{
  it("uses the complete front-camera recording as the primary visual when there are no photos",()=>{
    const scenes=composeSelfieStory([],[take("solo")],150,{selfiePresentation:"auto"});
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({id:"solo",blobId:"solo",selfieRole:"full",videoStartSec:0,isSelfie:true});
    expect(scenes[0]!.displayDurationSec).toBe(150);
  });
  it("uses only a few seconds at the beginning and end when photos exist",()=>{
    const moments=[photo("one"),photo("two"),photo("three")];
    const scenes=composeSelfieStory(moments,[take("selfie",0,155)],150,{selfiePresentation:"auto"});
    expect(scenes).toHaveLength(5);
    expect(scenes[0]).toMatchObject({id:"selfie:selfie-intro",selfieRole:"intro",videoStartSec:0,displayDurationSec:4});
    expect(scenes[4]).toMatchObject({id:"selfie:selfie-outro",selfieRole:"outro",videoStartSec:151,displayDurationSec:4});
    expect(scenes[0]?.blobId).toBe("selfie");
    expect(scenes[4]?.blobId).toBe("selfie");
    expect(filmTotal(scenes)).toBeCloseTo(150);
    expect(withoutSelfieScenes(scenes).map(item=>item.id)).toEqual(moments.map(item=>item.id));
  });
  it("allows intro and outro from different speakers without mixing up the recordings",()=>{
    const scenes=composeSelfieStory([photo("family")],[take("first",0,30),take("last",2,42)],120,{
      selfiePresentation:"bookends",selfieBookendSeconds:6,selfieIntroId:"last",selfieOutroId:"first"
    });
    expect(scenes[0]?.blobId).toBe("last");
    expect(scenes.at(-1)?.blobId).toBe("first");
    expect(scenes.at(-1)?.videoStartSec).toBe(24);
  });
  it("respects an explicit opt-out and never changes the user's photos",()=>{
    const photos=[photo("only")];
    expect(composeSelfieStory(photos,[take("private")],150,{selfiePresentation:"off"})).toEqual(photos);
  });
  it("shows recorded selfie parts in sequence when several people have no other photos",()=>{
    const scenes=composeSelfieStory([],[take("second",1,60),take("first",0,40)],100,{selfiePresentation:"auto"});
    expect(scenes.map(item=>item.blobId)).toEqual(["first","second"]);
    expect(scenes.map(item=>item.displayDurationSec)).toEqual([40,60]);
  });
});

describe("selfie UI is always optional",()=>{
  it("offers a clear voice-only choice before camera permission",()=>{
    const onChoose=vi.fn();
    render(<KeepSelfiePrompt enabled={false} preparing={false} onChoose={onChoose} onVoiceOnly={vi.fn()}/>);
    expect(screen.getByRole("button",{name:/Voice only/})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(screen.getByRole("button",{name:/Record selfie too/}));
    expect(onChoose).toHaveBeenCalledOnce();
  });
  it("has a dedicated editor with distinct automatic, full and bookend options",()=>{
    const onChange=vi.fn();
    render(<KeepSelfieEditor takes={[take("my-selfie")]} settings={{selfiePresentation:"auto",selfieBookendSeconds:4}}
      hasOtherMoments onClose={vi.fn()} onChange={onChange} onRecord={vi.fn()} onRemove={vi.fn()}/>);
    expect(screen.getByRole("region",{name:"Selfie video editor"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:/Opening & closing/}));
    expect(onChange).toHaveBeenCalledWith({selfiePresentation:"bookends"});
  });
});
