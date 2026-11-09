import { ArrowLeft, ArrowRight } from "lucide-react";
import "./keep-first-play-reveal.css";

type Props = {
  name: string;
  occasion?: string | undefined;
  introduction?: string | undefined;
  from?: string | undefined;
  year?: string | undefined;
  onOpen: () => void;
  onOtherFormats: () => void;
  onCreatorExit?: (() => void) | undefined;
};

/**
 * The first impression when someone taps their physical Keep.
 * Kept separate from the film: no first-photo overlays, stock media, or sound autoplay.
 */
export function KeepFirstPlayReveal({
  name,
  occasion,
  introduction,
  from,
  year,
  onOpen,
  onOtherFormats,
  onCreatorExit,
}: Props) {
  const recipient = name.trim() || "You";
  const moment = (occasion ?? "").trim();
  const message = (introduction ?? "").trim() || "Some things are worth keeping close.";
  const signature = [from?.trim() ? `From ${from.trim()}` : "", year?.trim() ?? ""].filter(Boolean).join(" · ");

  return (
    <section className="keep-first-play" aria-label={`A personal Keep for ${recipient}`}>
      <div className="keep-first-play__light" aria-hidden="true" />
      <div className="keep-first-play__texture" aria-hidden="true" />
      <div className="keep-first-play__border" aria-hidden="true" />

      <header className="keep-first-play__header">
        <span className="keep-wordmark keep-first-play__wordmark">Keep</span>
        <span className="keep-first-play__edition">A gift unlike any other</span>
      </header>

      <div className="keep-first-play__center">
        <div className="keep-first-play__emblem" aria-hidden="true">
          <span className="keep-first-play__emblem-letter" />
        </div>
        <p className="keep-first-play__kicker">Something was kept for you</p>
        <h1 className="keep-first-play__name">{recipient}</h1>
        {moment && <p className="keep-first-play__occasion">{moment}</p>}
        <div className="keep-first-play__rule" aria-hidden="true" />
        <blockquote className="keep-first-play__message">{message}</blockquote>
        {signature && <p className="keep-first-play__signature">{signature}</p>}
      </div>

      <footer className="keep-first-play__footer">
        <button type="button" className="keep-first-play__open" onClick={onOpen}>
          <span>Experience your Keep</span>
          <ArrowRight size={19} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <button type="button" className="keep-first-play__other" onClick={onOtherFormats}>
          Or choose to listen or read
        </button>
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
