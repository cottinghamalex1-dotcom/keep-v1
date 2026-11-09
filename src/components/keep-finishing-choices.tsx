import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Pause, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaItem, VoiceTone } from "@/lib/keep-project";

type Track = { name: string; note: string; group: string };
type Look = { name: string; note: string };
type Props = {
  captionStyle: string;
  musicMood: string;
  visualStyle: string;
  voiceTone: VoiceTone;
  tracks: Track[];
  looks: Look[];
  previewMedia?: MediaItem | undefined;
  musicSampling: string;
  hasVoice: boolean;
  onCaption: (value: string) => void;
  onMusic: (value: string) => void;
  onSample: (value: string) => void;
  onStyle: (value: string) => void;
  onVoice: (value: VoiceTone) => void;
  onCreate: () => void;
};

const captionChoices = [
  { name: "Reel", note: "Modern & expressive" },
  { name: "Clean", note: "Simple and readable" },
  { name: "Film", note: "Soft cinematic type" },
  { name: "Minimal", note: "Quiet and subtle" },
  { name: "Story", note: "Warm and personal" },
  { name: "None", note: "Without captions" },
];
const voiceChoices: { name: VoiceTone; label: string; note: string }[] = [
  { name: "natural", label: "Natural", note: "Your voice, just as it is" },
  { name: "clear", label: "Clear", note: "A little more presence" },
  { name: "warm", label: "Warm", note: "Soft and rich" },
];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Choice({ name, note, chosen, onSelect }: { name: string; note?: string; chosen: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={chosen} onClick={onSelect} className={`keep-choice-bubble keep-finish-choice min-h-[76px] flex-col !items-start !justify-center gap-1 ${chosen ? "keep-choice-bubble--selected" : ""}`}>
    <span className="flex w-full items-center justify-between gap-2"><span className="text-left text-[13px] font-medium">{name}</span>{chosen && <span className="keep-choice-check !size-5"><Check className="!size-3" strokeWidth={2.7} /></span>}</span>
    {note && <span className="text-left text-[11px] leading-4 text-muted-foreground">{note}</span>}
  </button>;
}

export function KeepFinishingChoices({ captionStyle, musicMood, visualStyle, voiceTone, tracks, looks, previewMedia, musicSampling, hasVoice, onCaption, onMusic, onSample, onStyle, onVoice, onCreate }: Props) {
  const [moreTracks, setMoreTracks] = useState(false);
  const [moreLooks, setMoreLooks] = useState(false);
  const featuredTracks = tracks.slice(0, 4);
  const extraTracks = tracks.slice(4);
  const featuredLooks = looks.slice(0, 4);
  const extraLooks = looks.slice(4);
  const visibleTracks = moreTracks || extraTracks.some((t) => t.name === musicMood) ? tracks : featuredTracks;
  const visibleLooks = moreLooks || extraLooks.some((l) => l.name === visualStyle) ? looks : featuredLooks;
  return <div className="mx-auto max-w-xl px-7 pb-[max(45px,env(safe-area-inset-bottom))] pt-9">
    <div className="mb-9">
      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-full border border-[#D8C5AC] bg-[#EAE1D7]"><Sparkles className="size-5 text-[#6A5849]" /></div>
      <h1 className="keep-editorial-title">The finishing touches.</h1>
      <p className="keep-page-description mt-4">Tell Keep how you want it to feel. We'll bring everything together for you.</p>
    </div>

    <section className="keep-finish-section" aria-labelledby="finish-captions">
      <div className="mb-3"><h2 id="finish-captions" className="font-display text-[29px]">Captions</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">How would you like your words to appear?</p></div>
      <div className="grid grid-cols-2 gap-2.5">{captionChoices.map((c) => <Choice key={c.name} name={c.name} note={c.note} chosen={captionStyle === c.name} onSelect={() => onCaption(c.name)} />)}</div>
    </section>

    <section className="keep-finish-section" aria-labelledby="finish-music">
      <div className="mb-3"><h2 id="finish-music" className="font-display text-[29px]">Music</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a feeling. Tap play to hear a sample.</p></div>
      <div className="grid grid-cols-2 gap-2.5">{visibleTracks.map((track) => {
        const chosen = track.name === musicMood;
        const sampling = musicSampling === track.name;
        return <div key={track.name} className={`keep-choice-bubble keep-finish-music min-w-0 !p-0 ${chosen ? "keep-choice-bubble--selected" : ""}`}>
          <button type="button" className="flex min-h-[92px] min-w-0 flex-1 flex-col items-start justify-center px-3 py-3 text-left" aria-pressed={chosen} onClick={() => onMusic(track.name)}>
            <span className="flex w-full items-start justify-between gap-1"><span className="text-[13px] font-medium leading-5">{track.name}</span>{chosen && <span className="keep-choice-check !size-5 shrink-0"><Check className="!size-3" /></span>}</span>
            <span className="mt-1 text-[11px] leading-4 text-muted-foreground">{track.note.split(" · ").at(-1)}</span>
          </button>
          <button type="button" aria-label={`${sampling ? "Stop" : "Play"} sample of ${track.name}`} aria-pressed={sampling} onClick={() => onSample(track.name)} className={`mr-2 flex size-9 shrink-0 items-center justify-center rounded-full border ${sampling ? "border-[#6A5849] bg-[#E6DED3]" : "border-border bg-white/60"}`}>
            {sampling ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
          </button>
        </div>;
      })}</div>
      {!!extraTracks.length && <button type="button" onClick={() => setMoreTracks(!moreTracks)} className="mt-3 flex min-h-11 items-center gap-2 text-xs font-medium text-[#6A5849]">{moreTracks ? "Show fewer music options" : "Explore more music"} <ChevronDown className={`size-4 transition-transform ${moreTracks ? "rotate-180" : ""}`} /></button>}
    </section>

    <section className="keep-finish-section" aria-labelledby="finish-look">
      <div className="mb-3"><h2 id="finish-look" className="font-display text-[29px]">Film style</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">See how your moments will look.</p></div>
      <div className="grid grid-cols-2 gap-2.5">{visibleLooks.map((look) => {
        const chosen = look.name === visualStyle;
        return <button type="button" key={look.name} aria-pressed={chosen} onClick={() => onStyle(look.name)} className={`keep-finish-style overflow-hidden rounded-xl border text-left ${chosen ? "border-[#95775F] bg-[#EAE1D7] ring-1 ring-[#95775F]" : "border-border bg-white/65"}`}>
          <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[#867769] to-[#DAC8AE]">
            {previewMedia?.url && (previewMedia.kind === "video"
              ? <video src={previewMedia.url} muted playsInline preload="metadata" className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />
              : <img src={previewMedia.url} alt="" className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />)}
            {chosen && <span className="keep-choice-check absolute right-2 top-2"><Check className="!size-3.5" /></span>}
          </div>
          <div className="px-3 py-3"><span className="block text-[13px] font-medium">{look.name}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{look.note}</span></div>
        </button>;
      })}</div>
      {!previewMedia && <p className="mt-2 text-xs text-muted-foreground">Add photos to see these looks on your own moments.</p>}
      {!!extraLooks.length && <button type="button" onClick={() => setMoreLooks(!moreLooks)} className="mt-3 flex min-h-11 items-center gap-2 text-xs font-medium text-[#6A5849]">{moreLooks ? "Show fewer styles" : "Explore more styles"} <ChevronDown className={`size-4 transition-transform ${moreLooks ? "rotate-180" : ""}`} /></button>}
    </section>

    <section className="keep-finish-section" aria-labelledby="finish-voice">
      <div className="mb-3"><h2 id="finish-voice" className="font-display text-[29px]">Your voice</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A gentle finishing touch to your recording. {hasVoice ? "Your voice stays unmistakably yours." : "You can add a voice recording later."}</p></div>
      <div className="grid grid-cols-2 gap-2.5">{voiceChoices.map((c) => <Choice key={c.name} name={c.label} note={c.note} chosen={voiceTone === c.name} onSelect={() => onVoice(c.name)} />)}</div>
    </section>

    <div className="mt-9 border-t border-border pt-7">
      <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" onClick={onCreate}>Build My Keep <ArrowRight className="size-5" /></Button>
      <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">You can change every choice later in the editor.</p>
    </div>
  </div>;
}
