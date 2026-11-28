import { ArrowRight, Check, PenLine } from "lucide-react";
import "./keep-interview-summary.css";

type Props = {
  summary: string;
  aiReady: boolean;
  onCreate: () => void;
  onWrite: () => void;
};

/** The transition from a guided interview to the editable message. */
export function KeepInterviewSummary({ summary, aiReady, onCreate, onWrite }: Props) {
  return (
    <section className="keep-interview-summary" aria-labelledby="keep-interview-summary-title">
      <div className="keep-interview-summary__heading">
        <div className="keep-interview-summary__eyebrow">
          <span aria-hidden="true"><Check size={14} strokeWidth={1.8} /></span>
          Story gathered
        </div>
        <h1 id="keep-interview-summary-title">I think we have it.</h1>
      </div>

      <div className="keep-interview-summary__paper">
        <h2 className="keep-interview-summary__paper-label">The heart of your Keep</h2>
        <p className="keep-interview-summary__story">{summary.trim() || "You've shared what matters. Let's put it into words."}</p>
      </div>

      <div className="keep-interview-summary__actions">
        {!aiReady && <p className="keep-interview-summary__note">
          You can still write your message in your own words.
        </p>}
        <button type="button" className="keep-interview-summary__primary" onClick={onCreate} disabled={!aiReady}>
          <span>Create My Message</span>
          <span className="keep-interview-summary__primary-icon" aria-hidden="true"><ArrowRight size={18} strokeWidth={1.6} /></span>
        </button>
        <button type="button" className="keep-interview-summary__secondary" onClick={onWrite}>
          <PenLine size={17} strokeWidth={1.6} aria-hidden="true" />
          <span>Write it myself</span>
        </button>
      </div>
    </section>
  );
}
