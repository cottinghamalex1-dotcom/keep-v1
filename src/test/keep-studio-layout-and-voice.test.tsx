import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepStudioResize, constrainPreviewSize, DEFAULT_PREVIEW_SIZE } from "@/components/keep-studio-resize";
import { KeepVoiceEditor } from "@/components/keep-voice-editor";
import { KeepPhotosEditor } from "@/components/keep-photos-editor";
import { KeepMusicEditor } from "@/components/keep-music-editor";
import { KeepStyleEditor } from "@/components/keep-style-editor";
import { KEEP_VOICE_PROFILES } from "@/lib/keep-voice-profiles";
import { defaultAudioMix } from "@/lib/keep-project";

afterEach(() => {cleanup();vi.restoreAllMocks();});

describe("resizable studio editing layout", () => {
  it("allows sliding preview/control allocation without exceeding safe bounds", () => {
    const change = vi.fn();
    render(<KeepStudioResize size={DEFAULT_PREVIEW_SIZE} onSize={change} />);
    const range = screen.getByRole("slider",{name:"Preview height"});
    expect(range).toHaveValue("46");
    fireEvent.change(range,{target:{value:"59"}});
    expect(change).toHaveBeenCalledWith(59);
    expect(constrainPreviewSize(-20)).toBe(26);
    expect(constrainPreviewSize(100)).toBe(67);
  });
});

describe("automatic voice polish", () => {
  it("enhances all three voice profiles and provides distinct tone and compression settings", () => {
    const {natural,clear,warm} = KEEP_VOICE_PROFILES;
    expect(natural.compressorRatio).toBeGreaterThan(2);
    expect(clear.compressorRatio).toBeGreaterThan(natural.compressorRatio);
    expect(warm.compressorRatio).toBeGreaterThan(natural.compressorRatio);
    expect(clear.highpassHz).toBeGreaterThan(natural.highpassHz);
    expect(warm.highpassHz).toBeLessThan(natural.highpassHz);
    expect(clear.presenceDb).toBeGreaterThan(natural.presenceDb + 2);
    expect(warm.lowShelfDb).toBeGreaterThan(natural.lowShelfDb + 3);
    expect(clear.highShelfDb).toBeGreaterThan(warm.highShelfDb + 5);
  });
  it("makes voice profiles the essentials, and advanced volume options optional", () => {
    const onTone = vi.fn();
    render(<KeepVoiceEditor hasVoice duration={132} playing={false} tone="natural" voiceVolume={60} musicVolume={60} mix={defaultAudioMix}
      onClose={vi.fn()} onEditWords={vi.fn()} onRerecord={vi.fn()} onPlayPreview={vi.fn()} onTone={onTone}
      onVolume={vi.fn()} onMix={vi.fn()} />);
    expect(screen.getByText(/Enhanced automatically/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:/Clear.*Bright/}));
    expect(onTone).toHaveBeenCalledWith("clear");
    const more = screen.getByText("More voice & music settings").closest("details");
    expect(more).not.toBeNull();
    expect(more!.open).toBe(false);
  });
});

describe("progressive studio effects", () => {
  it("leaves the primary photo controls visible and extra controls collapsed", () => {
    const onTransition=vi.fn();
    render(<KeepPhotosEditor moments={[
      {id:"a",kind:"image",source:"upload",url:"/a.jpg"},
      {id:"b",kind:"image",source:"upload",url:"/b.jpg"},
    ]} selectedIndex={0} onClose={vi.fn()} onSelect={vi.fn()} onAdd={vi.fn()} onReplace={vi.fn()}
      onMove={vi.fn()} onTransition={onTransition} onPreviewTransition={vi.fn()} onRemove={vi.fn()}/>);
    expect(screen.getByRole("button",{name:"Add moments"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Fade"}));
    expect(onTransition).toHaveBeenCalledWith("fade");
    expect(screen.getByText("More photo tools").closest("details")?.open).toBe(false);
  });
  it("keeps music preview available while hiding detailed mixing by default", () => {
    const sample=vi.fn();
    render(<KeepMusicEditor tracks={[
      {name:"Warm + Nostalgic",note:"Gentle",group:"Warm"},
      {name:"Intentional",note:"Reflective",group:"Warm"},
      {name:"Joyful",note:"Bright",group:"Light"},
    ]} selected="Intentional" sampling="" voiceVolume={60} musicVolume={60} mix={defaultAudioMix}
      onClose={vi.fn()} onSample={sample} onSelect={vi.fn()} onSetVolume={vi.fn()} onSetMix={vi.fn()} onHearWithVoice={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Listen to Intentional"}));
    expect(sample).toHaveBeenCalledWith("Intentional");
    expect(screen.getByText("More music & mixing").closest("details")?.open).toBe(false);
  });
  it("offers a compact film-look chooser", () => {
    const onLook=vi.fn();
    render(<KeepStyleEditor looks={[{name:"Natural",note:"Original"},{name:"Warm",note:"Golden"},{name:"Film",note:"Classic"},{name:"Modern",note:"Sharp"}]}
      currentLook="Natural" moment={{id:"a",kind:"image",url:"/a.jpg"}}
      compareOriginal={false} onLook={onLook} onCompare={vi.fn()} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Warm"}));
    expect(onLook).toHaveBeenCalledWith("Warm");
  });
});
