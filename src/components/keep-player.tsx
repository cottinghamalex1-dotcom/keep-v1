import { useEffect, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import travel from "@/assets/memory-travel.jpg";

export const memoryImages = [couple, wedding, travel, home, couple, travel, home, wedding, couple, home];
export const memoryLabels = ["The beginning", "Our wedding", "The places we've been", "The little things", "Us, always", "Another adventure", "Our family", "That day", "Everyday magic", "Home"];

type Props = { name: string; from: string; year: string; onExit: () => void; onFinish?: () => void; recipient?: boolean; style?: string; captions?: string };

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, style = "Natural", captions = "Reel" }: Props) {
  const [scene, setScene] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!playing || scene >= 5) return;
    const timer = window.setTimeout(() => setScene(s => s + 1), scene === -1 ? 2600 : 3300);
    return () => window.clearTimeout(timer);
  }, [scene, playing]);
  const end = scene >= 5;
  return <div className="relative h-dvh min-h-[600px] w-full overflow-hidden bg-background text-foreground">
    {scene >= 0 && !end && <div key={scene} className="absolute inset-0 overflow-hidden"><img src={memoryImages[scene]} alt="Prototype memory photograph" className={`h-full w-full object-cover ken-burns editor-image-${style.toLowerCase()}`} /><div className="absolute inset-0 photo-shade" /></div>}
    {scene === -1 && <div className="absolute inset-0 flex flex-col items-center justify-center text-center page-enter"><div className="brand mb-16">KEEP</div><div className="eyebrow mb-5">A KEEP FOR</div><h1 className="display text-7xl uppercase">{name}</h1><p className="mt-7 text-sm text-muted-foreground">from {from} · {year}</p></div>}
    {end && <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center page-enter"><span className="brand mb-24">KEEP</span><h1 className="display text-7xl">KEEP THIS.</h1><p className="mt-6 max-w-60 text-sm leading-6 text-muted-foreground">Whenever you want to hear it again.</p><div className="mt-16 flex flex-col gap-3 w-full max-w-65"><Button variant="keep" size="touch" onClick={() => { setScene(-1); setPlaying(true); }}><RotateCcw /> Replay</Button>{recipient ? <Button variant="quiet" size="touch" onClick={onExit}>Close</Button> : <><Button variant="quiet" size="touch" onClick={onExit}>Make Changes</Button><Button variant="bare" size="touch" onClick={onFinish}>Finish Keep →</Button></>}</div></div>}
    {!end && <><div className="absolute left-0 right-0 top-0 z-10 px-5 pt-[max(24px,env(safe-area-inset-top))]"><div className="mb-5 flex gap-1">{Array.from({length: 6}, (_, i) => <div key={i} className={`h-[2px] flex-1 ${scene + 1 >= i ? "bg-foreground" : "bg-foreground/30"}`} />)}</div><div className="flex items-center justify-between"><Button variant="bare" size="icon" aria-label="Exit preview" onClick={onExit}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><Button variant="bare" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button></div></div>{scene >= 0 && <div className="absolute bottom-28 left-7 right-7 text-center"><div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene]}</div>{captions !== "None" && <p className={`mx-auto max-w-sm text-2xl font-medium leading-snug ${captions === "Film" ? "font-display text-4xl" : ""}`}>{["You make people feel at home.", "I still remember that day.", "Through every version of us.", "Then I got to watch you become a mom.", "I'd choose this life with you again."][scene]}</p>}</div>}<div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center"><Button variant="bare" size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button></div></>}
  </div>;
}