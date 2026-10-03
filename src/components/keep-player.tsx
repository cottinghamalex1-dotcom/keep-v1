import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import travel from "@/assets/memory-travel.jpg";

export const memoryImages = [couple, wedding, travel, home, couple, travel, home, wedding, couple, home];
export const memoryLabels = ["The beginning", "Our wedding", "The places we've been", "The little things", "Us, always", "Another adventure", "Our family", "That day", "Everyday magic", "Home"];
const defaultLines = ["You make people feel at home.", "I still remember that day.", "Through every version of us.", "Then I got to watch you become a mom.", "I'd choose this life with you again."];

export type PlayerMedia = { url: string; kind: "image" | "video" };
type Props = {
  name: string; from: string; year: string; onExit: () => void; onFinish?: () => void; recipient?: boolean; style?: string; captions?: string;
  subtitle?: string | undefined; media?: PlayerMedia[] | undefined; audioUrl?: string | undefined; audioDuration?: number | undefined; lines?: string[] | undefined;
};

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, style = "Natural", captions = "Reel", subtitle, media, audioUrl, audioDuration, lines }: Props) {
  const [scene, setScene] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const items: PlayerMedia[] = media?.length ? media : memoryImages.map((url) => ({ url, kind: "image" }));
  const words = lines?.length ? lines : defaultLines;
  const end = audioUrl ? ended : scene >= 5;

  useEffect(() => {
    if (!playing || end) return;
    const timer = window.setTimeout(() => setScene((s) => s + 1), scene === -1 ? 2600 : 3300);
    return () => window.clearTimeout(timer);
  }, [scene, playing, end]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (scene >= 0 && playing && !end) a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    else a.pause();
  }, [scene >= 0, playing, end]);

  const replay = () => { setScene(-1); setEnded(false); setPlaying(true); setProgress(0); if (audio.current) audio.current.currentTime = 0; };
  const item = scene >= 0 ? items[scene % items.length] : undefined;

  return <div className="relative h-dvh min-h-[600px] w-full overflow-hidden bg-background text-foreground">
    {audioUrl && <audio ref={audio} src={audioUrl} muted={muted} playsInline preload="auto" onEnded={() => setEnded(true)} onTimeUpdate={(e) => { const a = e.currentTarget; const d = Number.isFinite(a.duration) ? a.duration : audioDuration || 1; setProgress(Math.min(1, a.currentTime / d)); }} />}
    {item && !end && <div key={scene} className="absolute inset-0 overflow-hidden">{item.kind === "video" ? <video src={item.url} autoPlay muted loop playsInline className={`h-full w-full object-cover editor-image-${style.toLowerCase()}`} /> : <img src={item.url} alt="Memory photograph" className={`h-full w-full object-cover ken-burns editor-image-${style.toLowerCase()}`} />}<div className="absolute inset-0 photo-shade" /></div>}
    {scene === -1 && <div className="absolute inset-0 flex flex-col items-center justify-center text-center page-enter"><div className="brand mb-16">KEEP</div><div className="eyebrow mb-5">A KEEP FOR</div><h1 className="display px-6 text-7xl uppercase">{name}</h1><p className="mt-7 text-sm text-muted-foreground">from {from} · {year}{subtitle ? ` · ${subtitle}` : ""}</p></div>}
    {end && <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center page-enter"><span className="brand mb-20">KEEP</span><h1 className="display text-5xl">SOME THINGS ARE<br />WORTH KEEPING.</h1><p className="mt-7 max-w-64 text-sm leading-6 text-muted-foreground">{recipient ? "This one is yours. Come back whenever you want to experience it again." : "Experience it once more, or make any final changes before you give it."}</p><div className="mt-14 flex w-full max-w-65 flex-col gap-3"><Button variant="keep" size="touch" onClick={recipient && onFinish ? onFinish : replay}>{recipient ? "Keep this close" : <><RotateCcw /> Replay</>}</Button>{recipient ? <Button variant="quiet" size="touch" onClick={replay}><RotateCcw /> Replay</Button> : <><Button variant="quiet" size="touch" onClick={onExit}>Make Changes</Button><Button variant="bare" size="touch" onClick={onFinish}>Finish Keep →</Button></>}</div></div>}
    {!end && <><div className="absolute left-0 right-0 top-0 z-10 px-5 pt-[max(24px,env(safe-area-inset-top))]"><div className="mb-5 flex gap-1">{audioUrl ? <div className="h-[2px] flex-1 bg-foreground/30"><div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></div> : Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-[2px] flex-1 ${scene + 1 >= i ? "bg-foreground" : "bg-foreground/30"}`} />)}</div><div className="flex items-center justify-between"><Button variant="bare" size="icon" aria-label="Exit preview" onClick={onExit}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><Button variant="bare" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button></div></div>{scene >= 0 && <div className="absolute bottom-28 left-7 right-7 text-center">{!media?.length && <div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene % memoryLabels.length]}</div>}{captions !== "None" && <p className={`mx-auto max-w-sm text-2xl font-medium leading-snug ${captions === "Film" ? "font-display text-4xl" : ""}`}>{words[scene % words.length]}</p>}{blocked && <Button variant="quiet" className="mt-5" onClick={() => audio.current?.play().then(() => setBlocked(false)).catch(() => undefined)}><Volume2 /> Tap to hear your voice</Button>}</div>}<div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center"><Button variant="bare" size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button></div></>}
  </div>;
}
