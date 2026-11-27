import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeReadingFrames, frameAtTime } from "@/lib/keep-immersive-reading";
import { KeepLibraryCard } from "@/components/keep-library-card";
import { KeepReadingMusic } from "@/components/keep-reading-music";

afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe("hands-free reading frames",()=>{
  it("turns time-stamped captions into short groups rather than a scrollable transcript",()=>{
    const cues=Array.from({length:18},(_,i)=>({text:"One lovely little memory",start:i*2,end:i*2+1.8}));
    const frames=makeReadingFrames(cues,["Fallback paragraph."],40);
    expect(frames.length).toBeGreaterThan(2);
    expect(frames.every(f=>f.text.split(/\s+/).length<=16)).toBe(true);
    expect(frameAtTime(frames,0)).toBe(0);
    expect(frameAtTime(frames,15)).toBeGreaterThan(0);
    expect(frameAtTime([{start:2,end:4,text:"First words"}],0)).toBe(-1);
    expect(frameAtTime([{start:2,end:4,text:"First words"}],2.05)).toBe(0);
    expect(frameAtTime([{start:2,end:4,text:"First words"}],5)).toBe(-1);
    expect(frames.at(-1)?.text).toContain("memory");
  });
  it("offers a timed estimated fallback for older Keeps with missing caption data",()=>{
    const frames=makeReadingFrames([],["We loved the ordinary moments we shared.","You are always worth celebrating."],45);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]?.start).toBe(0);
    expect(frames.at(-1)?.end).toBeCloseTo(45,2);
  });
});
describe("My Keeps illustrated cards",()=>{
  const keep={id:"keep-1",recipient_name:"Andi",occasion:"Birthday",status:"ready",recipient_token:"example",published_at:"2026-11-12T00:00:00Z",created_at:"2026-11-10T00:00:00Z"};
  it("shows cover and date, then one primary action with simple secondary controls",()=>{
    const onCopy=vi.fn(),onDelete=vi.fn();
    const activity={firstExperiencedAt:null,shipments:[]};
    const props={keep,thumbnail:"/moment.jpg",activity,copied:false,deleting:false,onToggle:()=>{},onCopy,onDelete};
    const {rerender}=render(<KeepLibraryCard {...props} expanded={false}/>);
    expect(screen.getByAltText("Cover photo for Andi")).toBeTruthy();
    expect(screen.getByText("Birthday")).toBeTruthy();
    expect(screen.queryByText("View Keep")).toBeNull();
    rerender(<KeepLibraryCard {...props} expanded/>);
    expect(screen.getByRole("link",{name:"View Keep"})).toHaveAttribute("href",expect.stringContaining("example"));
    expect(screen.getByRole("link",{name:"Edit"})).toHaveAttribute("href","/?edit=keep-1");
    expect(screen.getByText("Not yet viewed")).toBeInTheDocument();
    expect(screen.queryByText("Your gift journey")).toBeNull();
    expect(screen.queryByText("No card shipment yet.")).toBeNull();
    expect(screen.queryByText("Delete this Keep")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Copy link"}));
    expect(onCopy).toHaveBeenCalledOnce();
    rerender(<KeepLibraryCard {...props} expanded copied/>);
    expect(screen.getByRole("button",{name:"Copied!"})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"More"}));
    expect(screen.getByRole("button",{name:"More"})).toHaveAttribute("aria-expanded","true");
    expect(screen.getByRole("link",{name:"Film & card options"})).toHaveAttribute("href","/checkout?keep=keep-1");
    expect(screen.getByText("Gift activity")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Delete this Keep"}));
    expect(onDelete).toHaveBeenCalledOnce();
    rerender(<KeepLibraryCard {...props} expanded={false}/>);
    rerender(<KeepLibraryCard {...props} expanded/>);
    expect(screen.queryByText("Delete this Keep")).toBeNull();
  });
  it("shows only editing and safe management options for drafts or records without a viewing token",()=>{
    render(<KeepLibraryCard keep={{...keep,recipient_token:""}} expanded copied={false} deleting={false} onToggle={()=>{}} onCopy={()=>{}} onDelete={()=>{}}/>);
    expect(screen.getByRole("link",{name:"Continue editing"})).toBeInTheDocument();
    expect(screen.queryByRole("link",{name:"View Keep"})).toBeNull();
    expect(screen.queryByRole("button",{name:"Copy link"})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"More"}));
    expect(screen.getByRole("button",{name:"Delete this Keep"})).toBeInTheDocument();
    expect(screen.queryByRole("link",{name:"Film & card options"})).toBeNull();
  });
});
describe("optional Read soundtrack",()=>{
  it("does not play automatically, uses the selected instrumental track and exposes volume",()=>{
    const {container}=render(<KeepReadingMusic musicMood="Intentional"/>);
    const audio=container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe("/audio/intentional.mp3");
    expect(audio?.loop).toBe(true);
    expect(screen.getByRole("button",{name:"Play background music"})).toBeTruthy();
    fireEvent.change(screen.getByRole("slider",{name:"Background music volume"}),{target:{value:"65"}});
    expect(screen.getByText("65%")).toBeTruthy();
  });
});
