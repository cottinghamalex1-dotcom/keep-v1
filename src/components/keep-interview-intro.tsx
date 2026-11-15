import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Heart, MessageCircle, PenLine, Sparkles } from "lucide-react";

type Props = { onReady: () => void };

/** One welcoming moment before the first AI interview question, including
 * resumed drafts that were interrupted before their first answer. */
export function KeepInterviewIntro({ onReady }: Props) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const tips = [
    { Icon: PenLine, text: <><strong>Say as much as you can.</strong> Longer, thoughtful answers give your Keep more to work with.</> },
    { Icon: Heart, text: <><strong>Be specific.</strong> Share real stories, everyday moments, and little details only you would know.</> },
    { Icon: MessageCircle, text: <><strong>Don't try to sound polished.</strong> Natural, imperfect words are often the most meaningful.</> },
    { Icon: Sparkles, text: <><strong>Go with your first thought.</strong> You don't need to find the perfect answer.</> },
  ];

  const body = <div className="fixed inset-0 z-[110] flex h-[100dvh] items-center justify-center bg-[#211A14]/65 px-4 py-[max(16px,env(safe-area-inset-top))] backdrop-blur-[8px]">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="keep-interview-intro-title" aria-describedby="keep-interview-intro-description"
      className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[450px] flex-col overflow-hidden rounded-[26px] border border-[#E1D5C6] bg-[#FBF8F3] text-[#241C17] shadow-[0_28px_90px_rgba(26,19,12,.3)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-3 pt-7 sm:px-9 sm:pt-9">
        <div className="flex items-center justify-between">
          <span className="font-display text-[32px] leading-none tracking-[-.065em]">Keep</span>
          <span className="text-[9px] font-semibold uppercase tracking-[.17em] text-[#927459]">Before we begin</span>
        </div>
        <div className="mt-6 h-px w-full bg-[#E1D4C5]" />
        <span className="mt-7 flex size-[52px] items-center justify-center rounded-full border border-[#DDCDB9] bg-[#F0E6D9] text-[#80644B]" aria-hidden="true">
          <Heart className="size-6" strokeWidth={1.5}/>
        </span>
        <h2 id="keep-interview-intro-title" className="mt-5 font-display text-[clamp(31px,8.7vw,39px)] leading-[1.08] tracking-[-.045em]">
          Your best words are <span className="italic text-[#907359]">your own.</span>
        </h2>
        <p id="keep-interview-intro-description" className="mt-3 text-[12px] leading-[1.75] text-[#76675B]">
          Keep will guide you through about 8–10 questions. A few things to remember as you tell your story:
        </p>
        <ul className="mt-5 space-y-4">
          {tips.map(({ Icon, text }, index) => <li key={index} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F0E6DA] text-[#907154]">
              <Icon className="size-4" strokeWidth={1.65} aria-hidden="true"/>
            </span>
            <p className="pt-0.5 text-[12px] leading-[1.7] text-[#76675B] [&_strong]:font-semibold [&_strong]:text-[#372C22]">{text}</p>
          </li>)}
        </ul>
        <p className="mt-5 text-center font-display text-[17px] italic text-[#8B745C]">There's no wrong way to say what matters.</p>
      </div>
      <div className="shrink-0 border-t border-[#E7DCCE] bg-[#FBF8F3] px-6 pb-[max(18px,env(safe-area-inset-bottom))] pt-4 sm:px-9">
        <button type="button" onClick={onReady} autoFocus
          className="flex min-h-[54px] w-full items-center justify-between rounded-xl bg-[#211C18] px-5 text-[14px] font-medium text-[#FFF9F2] transition-colors hover:bg-[#3A3027] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A68B6F]">
          I'm ready <ArrowRight className="size-5" strokeWidth={1.7} aria-hidden="true"/>
        </button>
        <p className="mt-3 text-center text-[10px] text-[#8C7968]">You can type or record your answers. Nothing needs to be perfect.</p>
      </div>
    </section>
  </div>;
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
