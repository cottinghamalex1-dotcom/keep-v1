import { ArrowRight, Check, Mic2, RotateCcw, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import "./keep-voice-transition.css";

type Props = {
  isSaving: boolean;
  isSyncing: boolean;
  hasCaptions: boolean;
  syncError: boolean;
  isDemo: boolean;
  isPersisted: boolean;
  hasRecording: boolean;
  returnToEditor: boolean;
  onContinue: () => void;
  onRetry: () => void;
  onRecordAgain: () => void;
};

/**
 * A short, intentional handoff after voice recording. Progress remains
 * indeterminate until the actual recording/caption work finishes; the
 * confirmation must never appear before the audio is usable.
 */
export function KeepVoiceTransition({
  isSaving, isSyncing, hasCaptions, syncError, isDemo, isPersisted, hasRecording, returnToEditor,
  onContinue, onRetry, onRecordAgain,
}: Props) {
  // A slow caption transcription must never trap the creator on this screen.
  // The voice is already stored; captions may finish while creation continues.
  const processing = isSaving;
  const missingRecording = !processing && !hasRecording;
  const needsCaptionReview = !processing && !isSyncing && hasRecording && !isDemo && (syncError || !hasCaptions);
  const notStored = !processing && hasRecording && !isDemo && !isPersisted;
  const title = processing
    ? "Holding onto your words."
    : missingRecording ? "Your recording needs another try." : isDemo ? "Ready for a preview." : "Your voice is kept.";
  const message = isSaving
    ? "Preserving your recording and the moments that make it yours."
    : isSyncing
      ? "Your voice is saved. Captions are still preparing in the background, and you can continue."
      : missingRecording
        ? "We couldn't restore that recording. Please record it again so your Keep has your voice."
        : isDemo
          ? "This is a demo without recorded audio. You can keep creating and add your real voice later."
          : needsCaptionReview
            ? "Your recording is ready. Captions need another look before you share your Keep."
            : "Not polished. Not performed. Just you, exactly as they should hear you.";

  // Render outside the animated screen. iOS Safari otherwise positions fixed overlays
  // against a transformed ancestor and scrolls the focused button offscreen.
  if (typeof document === "undefined") return null;
  return createPortal(<div className="keep-voice-transition fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#211A14]/75 px-4 py-[max(18px,env(safe-area-inset-top))] sm:px-6">
    <section role="dialog" aria-modal="true" aria-labelledby="keep-voice-transition-title"
      className="keep-voice-transition-card relative my-auto w-full max-w-[460px] overflow-hidden rounded-[28px] border border-[#E6D9C9] bg-[#FBF8F3] px-6 pb-7 pt-7 text-center text-[#211A16] shadow-[0_30px_100px_rgba(24,17,10,.34)] sm:px-10 sm:pb-9 sm:pt-9">
      <div className="keep-voice-transition-glow pointer-events-none absolute left-1/2 top-16 size-64 -translate-x-1/2 rounded-full" aria-hidden="true"/>
      <div className="relative">
        <p className="font-['Cormorant_Garamond',Georgia,serif] text-[40px] font-medium leading-none tracking-[-.065em]">Keep</p>
        <div className="mx-auto mt-4 h-px w-14 bg-gradient-to-r from-transparent via-[#B5966F] to-transparent"/>
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.24em] text-[#91765B]">Some things are worth keeping.</p>

        <div className="keep-voice-transition-orb relative mx-auto mt-8 flex size-[118px] items-center justify-center rounded-full border border-[#D8C4AC] bg-gradient-to-br from-[#FAF3E9] via-[#F2E5D4] to-[#E5D4BE]">
          <div className="keep-voice-transition-halo absolute -inset-3 rounded-full border border-[#D7BD9B]/40" aria-hidden="true"/>
          {processing || missingRecording
            ? <Mic2 aria-hidden="true" className="relative size-9 text-[#876849]" strokeWidth={1.3}/>
            : <Check aria-hidden="true" className="keep-voice-transition-check relative size-10 text-[#846644]" strokeWidth={1.55}/>}
          <Sparkles aria-hidden="true" className="absolute -right-4 top-0 size-5 text-[#C8A571]" strokeWidth={1.45}/>
          <span aria-hidden="true" className="absolute -left-2 bottom-2 size-1.5 rounded-full bg-[#BA996E]"/>
        </div>

        <h1 id="keep-voice-transition-title" className="mx-auto mt-8 max-w-[360px] font-display text-[clamp(33px,9vw,43px)] leading-[1.1] tracking-[-.035em]">{title}</h1>
        <p className="mx-auto mt-3 max-w-[310px] text-[13px] leading-[1.7] text-[#726559]">{message}</p>

        <div className="mx-auto mt-7 max-w-[335px]" aria-live="polite">
          <div role="progressbar" aria-label="Preparing your recording" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={processing ? undefined : missingRecording ? 0 : 100}
            aria-valuetext={processing ? (isSaving ? "Saving recording" : "Syncing captions") : missingRecording ? "Recording missing" : "Preparation complete"}
            className="relative h-1.5 overflow-hidden rounded-full bg-[#E8DDD0]">
            <div className={processing ? "keep-voice-transition-progress-loading absolute inset-y-0 left-0 w-[38%] rounded-full bg-gradient-to-r from-[#B99C78] via-[#816346] to-[#CBB392]"
              : missingRecording ? "absolute inset-y-0 left-0 w-0" : "keep-voice-transition-progress-complete absolute inset-0 rounded-full bg-gradient-to-r from-[#B9A17F] to-[#826548]"} />
          </div>
          <p role="status" className="mt-3 text-[10px] font-semibold tracking-[.08em] text-[#8D755D]">
            {isSaving ? "SAVING YOUR VOICE" : isSyncing ? "VOICE SAVED · CAPTIONS PREPARING" : missingRecording ? "RECORDING NOT FOUND" : isDemo ? "DEMO · NO VOICE ATTACHED" : needsCaptionReview ? "VOICE READY · CAPTIONS TO REVIEW" : "READY FOR THE NEXT MOMENT"}
          </p>
        </div>

        {!processing && <>
          {!missingRecording && <button type="button" onClick={onContinue}
            className="mt-7 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#1D1A17] px-5 text-[13px] font-medium text-[#FCF8F2] shadow-[0_12px_25px_rgba(29,26,23,.16)] transition-transform hover:bg-[#342B24] active:scale-[.99]">
            {returnToEditor ? "Back to my Keep" : "Continue my Keep"} <ArrowRight aria-hidden="true" className="size-4"/>
          </button>}
          <button type="button" onClick={onRecordAgain}
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[11px] text-[#806A55] underline-offset-4 hover:underline">
            <RotateCcw aria-hidden="true" className="size-3.5" /> Record again
          </button>
          {needsCaptionReview && <button type="button" onClick={onRetry}
            className="block min-h-10 w-full text-center text-[11px] font-medium text-[#66503A] underline underline-offset-4">
            Retry caption sync
          </button>}
          {notStored && <p role="alert" className="mt-2 text-[11px] leading-5 text-[#975B43]">
            This recording is available in this session, but couldn't be saved to device storage. Please avoid refreshing until you finish.
          </p>}
        </>}
      </div>
    </section>
  </div>, document.body);
}
