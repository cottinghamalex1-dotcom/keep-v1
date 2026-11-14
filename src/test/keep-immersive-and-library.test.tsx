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
  it("shows a cover photo, occasion and creation date while keeping actions behind the arrow",()=>{
    const {rerender}=render(<KeepLibraryCard keep={keep} thumbnail="/moment.jpg" expanded={false} copied={false} deleting={false} onToggle={()=>{}} onCopy={()=>{}} onDelete={()=>{}}/>);
    expect(screen.getByAltText("Cover photo for Andi")).toBeTruthy();
    expect(screen.getByText("Birthday")).toBeTruthy();
    expect(screen.queryByText("Continue editing")).toBeNull();
    rerender(<KeepLibraryCard keep={keep} thumbnail="/moment.jpg" expanded copied={false} deleting={false} onToggle={()=>{}} onCopy={()=>{}} onDelete={()=>{}}/>);
    expect(screen.getByText("Continue editing")).toBeTruthy();
    expect(screen.getByText("Copy viewing link")).toBeTruthy();
    expect(screen.getByText("Delete this Keep")).toBeTruthy();
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
