import * as Dialog from "@radix-ui/react-dialog";
import { Check, ShieldCheck } from "lucide-react";

type Props = {
  open: boolean;
  onDone: () => void;
  stage: "memories" | "complete";
  contributorName: string;
  creatorName: string;
  recipientName: string;
};

/** A receipt, never a progress screen: only show after the server confirms the save. */
export function KeepContributorConfirmation({ open, onDone, stage, contributorName, creatorName, recipientName }: Props) {
  const complete = stage === "complete";
  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) onDone(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] bg-[#171311]/55 backdrop-blur-[6px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[211] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[#D8CCBE] bg-[#FFFCF8] px-6 py-8 text-center text-[#30271F] shadow-[0_25px_80px_rgba(0,0,0,.19)] sm:px-9 sm:py-10"
          onInteractOutside={event => event.preventDefault()}>
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-[#D8C9BA] bg-[#F0E9DF] text-[#78634F]">
            <Check className="size-7" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8B725A]">{complete ? "Contribution complete" : "Memories received"}</p>
          <Dialog.Title className="mt-3 font-display text-[clamp(35px,9vw,43px)] leading-[1.06] tracking-[-.03em]">{complete ? "You’re all set." : "Your memories are sent."}</Dialog.Title>
          <Dialog.Description className="mx-auto mt-4 max-w-[330px] text-sm leading-7 text-[#6E6257]">
            {complete
              ? <>Thank you, {contributorName}. Your recordings and any photos or videos you shared are safely with <strong className="font-semibold text-[#30271F]">{creatorName}</strong>, who will finish the Keep for {recipientName}.</>
              : <>Thank you, {contributorName}. Your memories have been shared with <strong className="font-semibold text-[#30271F]">{creatorName}</strong> to help create the Keep for {recipientName}.</>}
          </Dialog.Description>
          <div className="mt-6 rounded-[16px] border border-[#E3D9CB] bg-[#F5F0E8] px-4 py-4 text-left">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#4B3E32]"><ShieldCheck className="size-[17px] shrink-0 text-[#8B725A]" aria-hidden="true" /> {complete ? "Nothing else to do" : "What happens next"}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#6E6257]">{complete
              ? "You can close this page. It's in the creator's hands now."
              : <>You’re done for now. You can add any optional photos or videos, or close this page. Return to this same private link when {creatorName} has your words ready to record.</>}</p>
          </div>
          <button type="button" className="mt-6 keep-contribution-action keep-contribution-action--finish" onClick={onDone}>
            <span>{complete ? "Done" : "Done for now"}</span>
            <span className="keep-contribution-action__icon" aria-hidden="true"><Check className="size-[17px]" /></span>
          </button>
          <p className="mt-6 font-display text-xl italic text-[#806B56]">Some things are worth keeping.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
