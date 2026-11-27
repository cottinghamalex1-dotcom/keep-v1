import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** A one-time visual walkthrough when entering the final personalization step. */
export function KeepFinalTouchGuide({ recipientName }: { recipientName: string }) {
  const [open, setOpen] = useState(true);
  const name = recipientName.trim() || "Someone special";
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-[#171311]/60 backdrop-blur-[5px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#D8CCBE] bg-[#F8F3EC] p-5 text-[#211C18] shadow-2xl sm:p-7">
          <Dialog.Close aria-label="Close final step guide" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-[#D8CCBE] text-[#6C5B4B]">
            <X className="size-4" />
          </Dialog.Close>
          <div className="pr-7">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8B725A]">One last step</p>
            <Dialog.Title className="mt-2 font-display text-[32px] leading-[1.08]">The first and last words.</Dialog.Title>
            <Dialog.Description className="mt-3 text-sm leading-6 text-[#6C5B4B]">
              Your film is edited. Now choose two short messages that appear on screen before and after your story.
            </Dialog.Description>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#786451]">01 · Opening line</p>
              <div className="flex aspect-[9/14] flex-col items-center justify-center overflow-hidden rounded-xl bg-[#171311] px-3 text-center text-[#F5EDE5]">
                <p className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#D6C1AA]">A Keep for</p>
                <p className="mt-2 break-words font-display text-[24px] leading-tight">{name}</p>
                <p className="mt-4 font-display text-[16px] italic leading-snug">You make the ordinary moments extraordinary.</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6C5B4B]">Before the photos and voice begin.</p>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#786451]">02 · Closing line</p>
              <div className="flex aspect-[9/14] flex-col items-center justify-center overflow-hidden rounded-xl bg-[#171311] px-3 text-center text-[#F5EDE5]">
                <p className="break-words text-[8px] font-semibold uppercase tracking-[.16em] text-[#D6C1AA]">For {name}</p>
                <p className="mt-4 font-display text-[21px] italic leading-snug">You are so loved.</p>
                <div className="mt-5 h-px w-7 bg-[#9E8975]" />
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6C5B4B]">After the recording ends, as the music fades.</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#6C5B4B]">These are examples. Choose your own written words next — no recording needed.</p>
          <Dialog.Close asChild>
            <Button variant="keep" size="touch" className="keep-premium-action mt-5 w-full justify-between">Let’s add the final words <ArrowRight className="size-5" /></Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
