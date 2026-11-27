import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import "./keep-first-play-reveal.css";

type Props = {
  name: string;
  onOpen: () => void;
  opening?: boolean;
  onCreatorExit?: (() => void) | undefined;
  showExperienceNotice?: boolean;
};

/**
 * A quiet cover, not the film's dedication. The personal message belongs in
 * the dark musical opening AFTER the recipient taps to begin.
 */
export function KeepFirstPlayReveal({ name, onOpen, opening = false, onCreatorExit, showExperienceNotice = false }: Props) {
  const recipient = name.trim() || "You";
  return (
    <section className="keep-first-play" aria-label={`A personal Keep for ${recipient}`}>
      <header className="keep-first-play__header">
        <span className="keep-wordmark keep-first-play__wordmark">Keep</span>
      </header>

      <div className="keep-first-play__center">
        <p className="keep-first-play__eyebrow">A KEEP FOR</p>
        <h1 className="keep-first-play__name">{recipient}</h1>
      </div>

      <footer className="keep-first-play__footer">
        <button type="button" className="keep-first-play__open" onClick={onOpen} disabled={opening} aria-busy={opening}>
          <span>{opening ? "Opening your Keep…" : "Experience your Keep"}</span>
          {opening
            ? <LoaderCircle size={19} strokeWidth={1.6} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            : <ArrowRight size={19} strokeWidth={1.6} aria-hidden="true" />}
        </button>
        {showExperienceNotice && <p className="mx-auto mt-3 max-w-xs text-center text-[10px] leading-4 text-[#8D7B6A]">The creator can see when this Keep is first experienced.</p>}
        {onCreatorExit && (
          <button type="button" className="keep-first-play__creator-exit" onClick={onCreatorExit}>
            <ArrowLeft size={14} strokeWidth={1.6} aria-hidden="true" />
            Back to editor
          </button>
        )}
      </footer>
    </section>
  );
}
