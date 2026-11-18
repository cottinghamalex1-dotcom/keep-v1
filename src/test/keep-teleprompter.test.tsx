import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepTeleprompter } from "@/components/keep-teleprompter";

const props = {
  text: "These are the moments that meant so much to us.\n\nEvery one of them is worth keeping.",
  label: "PART 1 OF 3",
  speaker: "Mom",
  isRecording: false,
  isPaused: false,
  elapsed: 0,
};

afterEach(() => vi.unstubAllGlobals());

describe("shared recording teleprompter", () => {
  it("shows the speaker and a pinned recording indicator with elapsed time", () => {
    const { rerender } = render(<KeepTeleprompter {...props} />);
    expect(screen.getByText("PART 1 OF 3")).toBeInTheDocument();
    expect(screen.getByText("Mom")).toBeInTheDocument();
    expect(screen.getByText("Ready to record")).toBeInTheDocument();
    rerender(<KeepTeleprompter {...props} isRecording elapsed={73} />);
    expect(screen.getByLabelText("Recording in progress")).toHaveTextContent("RECORDING");
    expect(screen.getByLabelText("Recording in progress")).toHaveTextContent("01:13");
    rerender(<KeepTeleprompter {...props} isRecording isPaused elapsed={73} />);
    expect(screen.getByLabelText("Recording paused")).toHaveTextContent("PAUSED");
  });

  it("scrolls by default when recording; touching text does not disable the teleprompter", () => {
    render(<KeepTeleprompter {...props} isRecording />);
    const viewport = screen.getByLabelText("Auto-scrolling teleprompter script");
    expect(screen.getByRole("status")).toHaveTextContent("AUTO-SCROLLING");
    expect(screen.getByRole("button", { name: "Pause auto-scroll" })).toBeInTheDocument();
    fireEvent.touchStart(viewport);
    expect(screen.getByRole("button", { name: "Pause auto-scroll" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause auto-scroll" }));
    expect(screen.getByRole("button", { name: "Resume auto-scroll" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume auto-scroll" }));
    expect(screen.getByRole("button", { name: "Pause auto-scroll" })).toBeInTheDocument();
  });
  
  it("provides clearly marked speed buttons for both solo and group speakers", () => {
    const { rerender } = render(<KeepTeleprompter {...props} speaker="Dad" text="The first part." />);
    expect(screen.getByRole("button", { name: "Slower teleprompter scrolling" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faster teleprompter scrolling" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Faster teleprompter scrolling" }));
    expect(screen.getByText("1.2×")).toBeInTheDocument();
    rerender(<KeepTeleprompter {...props} speaker="Mom" text="The next speaker's part." isRecording />);
    expect(screen.getByText("Mom")).toBeInTheDocument();
    expect(screen.getByText("1.2×")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("AUTO-SCROLLING");
  });

  it("offers rehearsal without making the creator think the microphone is recording", () => {
    render(<KeepTeleprompter {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Practice scrolling" }));
    expect(screen.getByText("PRACTICE · NOT RECORDING")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause practice" })).toBeInTheDocument();
  });

  it("automatically advances the script when real recording is underway", () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { frame = cb; return 1; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<KeepTeleprompter {...props} isRecording />);
    const viewport = screen.getByLabelText("Auto-scrolling teleprompter script") as HTMLElement;
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 1500 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 300 });
    act(() => {
      frame?.(1000);
      frame?.(1080);
    });
    expect(viewport.scrollTop).toBeGreaterThan(0);
  });

  it("keeps the reading area clipped separately from the opaque controls in both modes", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const stream = {} as MediaStream;
    const { rerender } = render(<KeepTeleprompter {...props} />);
    const viewport = screen.getByLabelText("Auto-scrolling teleprompter script");
    const slower = screen.getByRole("button", { name: "Slower teleprompter scrolling" });
    expect(viewport.closest("section")).toHaveClass("grid");
    expect(viewport.parentElement).toHaveClass("overflow-hidden");
    expect(viewport).toHaveClass("h-full");
    expect(viewport.contains(slower)).toBe(false);

    rerender(<KeepTeleprompter {...props} cameraStream={stream} isRecording />);
    expect(screen.getByLabelText("Live front camera preview")).toBeInTheDocument();
    expect(viewport.parentElement).toHaveClass("overflow-hidden");
    expect(viewport.contains(slower)).toBe(false);
    play.mockRestore();
  });

  it("moves even when mobile Safari rounds each scrollTop assignment to an integer", () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => { frame = cb; return 1; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<KeepTeleprompter {...props} text={"word ".repeat(350)} isRecording />);
    const viewport = screen.getByLabelText("Auto-scrolling teleprompter script") as HTMLElement;
    let position = 0;
    Object.defineProperty(viewport, "scrollHeight", { configurable: true, value: 700 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(viewport, "scrollTop", {
      configurable: true,
      get: () => position,
      set: (value: number) => { position = Math.floor(value); },
    });
    act(() => {
      for (let time = 1000; time < 3500; time += 16) frame?.(time);
    });
    expect(position).toBeGreaterThan(0);
  });

  it("uses fractional GPU movement on browsers that only scroll whole pixels",()=>{
    let frame:FrameRequestCallback|undefined;
    vi.stubGlobal("requestAnimationFrame",vi.fn((cb:FrameRequestCallback)=>{frame=cb;return 1;}));
    vi.stubGlobal("cancelAnimationFrame",vi.fn());
    render(<KeepTeleprompter {...props} isRecording />);
    const viewport=screen.getByLabelText("Auto-scrolling teleprompter script") as HTMLElement;
    const script=viewport.querySelector("p") as HTMLElement;
    Object.defineProperty(viewport,"scrollHeight",{configurable:true,value:1500});
    Object.defineProperty(viewport,"clientHeight",{configurable:true,value:300});
    let pos=0;
    Object.defineProperty(viewport,"scrollTop",{configurable:true,get:()=>pos,set:(v:number)=>{pos=Math.floor(v);}});
    act(()=>{frame?.(1000);frame?.(1016);});
    expect(pos).toBeGreaterThan(0);
    expect(script.style.transform).toContain("translate3d(0, -");
  });

  it("offers a guarded restart that discards only the current take",async()=>{
    const restart=vi.fn().mockResolvedValue(undefined);
    render(<KeepTeleprompter {...props} isRecording onRestartRecording={restart}/>);
    fireEvent.click(screen.getByRole("button",{name:"Start over current recording"}));
    expect(screen.getByRole("alertdialog",{name:"Restart recording confirmation"})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Keep recording"}));
    expect(restart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Start over current recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Discard & restart"}));
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it("explains that auto-scroll pauses with the recording and resumes automatically", () => {
    const { rerender } = render(<KeepTeleprompter {...props} isRecording isPaused elapsed={9} />);
    expect(screen.getByRole("status")).toHaveTextContent("Auto-scroll will resume");
    expect(screen.getByRole("button", { name: "Scrolling paused with recording" })).toBeDisabled();
    rerender(<KeepTeleprompter {...props} isRecording isPaused={false} elapsed={10} />);
    expect(screen.getByRole("status")).toHaveTextContent("AUTO-SCROLLING");
    expect(screen.getByRole("button", { name: "Pause auto-scroll" })).toBeEnabled();
  });
});
