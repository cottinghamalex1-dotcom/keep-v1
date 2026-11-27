import { ArrowRight, FileText, FileUp, Mic, PenLine, Square, X } from "lucide-react";
import {
  countKeepWords,
  estimateKeepSeconds,
  formatKeepTime,
  getKeepLengthFeedback,
  KEEP_TARGET_MAX_WORDS,
  KEEP_TARGET_MIN_WORDS,
  KEEP_WORDS_PER_MINUTE,
} from "@/lib/keep-length";
import "./keep-writing-step.css";

export type KeepWritingMode = "speak" | "type" | "upload";

type Props = {
  text: string;
  mode: KeepWritingMode;
  dictating: boolean;
  busy: boolean;
  uploadedName: string;
  onSpeak: () => void;
  onType: () => void;
  onUpload: () => void;
  onTextChange: (text: string) => void;
  onClear: () => void;
  onContinue: () => void;
};

/** A quiet, letter-like workspace for the creator's own words. */
export function KeepWritingStep({
  text,
  mode,
  dictating,
  busy,
  uploadedName,
  onSpeak,
  onType,
  onUpload,
  onTextChange,
  onClear,
  onContinue,
}: Props) {
  const words = countKeepWords(text);
  const time = formatKeepTime(estimateKeepSeconds(words));
  const listening = dictating && mode === "speak";
  const imported = uploadedName && mode === "upload";

  return (
    <div className="keep-writer">
      <div className="keep-writer__heading">
        <span className="keep-writer__eyebrow">In your own words</span>
        <h1 className="keep-editorial-title">Say what matters.</h1>
        <p>Speak from the heart, write a message, or bring one you've already written.</p>
      </div>

      <div
        className="keep-writer__methods"
        role="group"
        aria-label="Choose how to share your words"
      >
        <button type="button" aria-pressed={mode === "speak"} onClick={onSpeak}>
          {listening ? (
            <Square size={18} strokeWidth={1.6} fill="currentColor" aria-hidden="true" />
          ) : (
            <Mic size={18} strokeWidth={1.6} aria-hidden="true" />
          )}
          <span>{listening ? "Stop" : "Speak"}</span>
        </button>
        <button type="button" aria-pressed={mode === "type"} onClick={onType}>
          <PenLine size={18} strokeWidth={1.6} aria-hidden="true" />
          <span>Type</span>
        </button>
        <button type="button" aria-pressed={mode === "upload"} disabled={busy} onClick={onUpload}>
          <FileUp size={18} strokeWidth={1.6} aria-hidden="true" />
          <span>{busy ? "Reading…" : "Upload"}</span>
        </button>
      </div>

      {listening && (
        <div className="keep-writer__notice" role="status">
          <span className="keep-writer__listening-dot" aria-hidden="true" />
          <div>
            <strong>Listening</strong>
            <p>Your words will appear as you speak. Tap Stop when you're finished.</p>
          </div>
        </div>
      )}
      {imported && (
        <div className="keep-writer__notice">
          <FileText size={21} strokeWidth={1.5} aria-hidden="true" />
          <div className="keep-writer__import">
            <strong>Document imported</strong>
            <p title={uploadedName}>{uploadedName}</p>
          </div>
          <button
            type="button"
            className="keep-writer__text-action"
            onClick={onUpload}
            disabled={busy}
          >
            Replace
          </button>
        </div>
      )}

      <section className="keep-writer__paper" aria-label="Your writing workspace">
        <div className="keep-writer__paper-head">
          <label htmlFor="keep-writing-message">Your message</label>
          <span
            className="keep-writer__estimate"
            title={`Estimated at ${KEEP_WORDS_PER_MINUTE} words per minute`}
          >
            {words} {words === 1 ? "word" : "words"} <span aria-hidden="true">·</span> ~{time}
          </span>
        </div>
        <textarea
          id="keep-writing-message"
          aria-label="Your message"
          aria-describedby="keep-writing-guide"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Start with what matters most…"
          rows={9}
        />
        <div className="keep-writer__paper-footer">
          <button
            type="button"
            className="keep-writer__text-action"
            onClick={onClear}
            disabled={!text && !uploadedName}
          >
            <X size={14} strokeWidth={1.6} aria-hidden="true" /> Clear
          </button>
          <span>DOCX · PDF · TXT · MD · RTF</span>
        </div>
      </section>

      <div
        id="keep-writing-guide"
        className="keep-writer__guide"
        aria-label="Estimated Keep length"
      >
        <div className="keep-writer__guide-head">
          <span>Make it yours</span>
          <span>2–3 min suggested</span>
        </div>
        <div className="keep-writer__progress" aria-hidden="true">
          <div style={{ width: `${Math.min(100, (words / KEEP_TARGET_MAX_WORDS) * 100)}%` }} />
        </div>
        <p aria-live="polite">
          {words === 0
            ? `Aim for ${KEEP_TARGET_MIN_WORDS}–${KEEP_TARGET_MAX_WORDS} words, but there is no required length.`
            : getKeepLengthFeedback(words)}
        </p>
        {words > KEEP_TARGET_MAX_WORDS && (
          <p>Actual recording length may vary with your speaking pace.</p>
        )}
      </div>

      <button
        type="button"
        className="keep-writer__continue"
        onClick={onContinue}
        disabled={!text.trim()}
      >
        <span>Continue</span>
        <span className="keep-writer__arrow" aria-hidden="true">
          <ArrowRight size={19} strokeWidth={1.6} />
        </span>
      </button>
    </div>
  );
}
