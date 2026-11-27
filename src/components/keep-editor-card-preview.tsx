import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ChevronRight, CreditCard, X } from "lucide-react";
import { KeepCardFront } from "@/components/keep-card-front";
import { Button } from "@/components/ui/button";
import type { KeepProject } from "@/lib/keep-project";

type CardPreviewProject = Pick<KeepProject, "publicationToken" | "openingMessage" | "engraveOpeningMessage"> & {
  cardEngraving?: readonly string[];
};

/** A successful final-step save assigns a publication token. An autosaved
 * draft ID or a partially entered dedication does not unlock this preview. */
export function KeepEditorCardPreview({ project, variant = "editor" }: {
  project: CardPreviewProject;
  variant?: "editor" | "library";
}) {
  if (!project.publicationToken) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {variant === "library" ? (
          <button type="button" className="keep-library-more-option">
            <span className="keep-library-more-icon" aria-hidden="true"><CreditCard className="size-4" strokeWidth={1.7} /></span>
            <span className="keep-library-more-label">Preview Keep Card</span>
            <ChevronRight className="keep-library-more-arrow" aria-hidden="true" />
          </button>
        ) : (
          <Button variant="quiet" className="h-auto w-full justify-between p-4 text-left">
            <span className="flex items-center gap-3">
              <CreditCard className="size-5" />
              <span>
                <strong className="block font-normal">Preview Keep Card</strong>
                <small className="mt-1 block font-normal text-muted-foreground">See your black card and engraving</small>
              </span>
            </span>
            <ArrowRight />
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-[#171311]/60 backdrop-blur-[5px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#D8CCBE] bg-[#F8F3EC] p-5 text-[#211C18] shadow-2xl sm:p-7">
          <Dialog.Close aria-label="Close card preview" className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border border-[#D8CCBE] text-[#6C5B4B]">
            <X className="size-5" />
          </Dialog.Close>
          <div className="pr-10">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8B725A]">A KEEPSAKE YOU CAN HOLD</p>
            <Dialog.Title className="mt-2 font-display text-[32px] leading-[1.08]">Your Keep card.</Dialog.Title>
            <Dialog.Description className="mt-3 text-sm leading-6 text-[#6C5B4B]">
              A preview of your matte-black metal card with personalized engraving.
            </Dialog.Description>
          </div>
          <figure className="mt-6 rounded-[20px] border border-[#D8CCBE] bg-[#F5EDE3]/65 px-3 pb-5 pt-6 sm:px-6">
            <div className="mx-auto w-full max-w-[360px]">
              <KeepCardFront engraving={project.cardEngraving ?? []} openingMessage={project.openingMessage ?? ""} showOpeningMessage={!!project.engraveOpeningMessage} />
            </div>
            <figcaption className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[.15em] text-[#8B725A]">Front · Laser engraving preview</figcaption>
          </figure>
          {!project.cardEngraving && <p className="mt-4 text-xs leading-5 text-[#6C5B4B]">The saved card details are unavailable for this older Keep.</p>}
          <p className="mt-4 text-xs leading-5 text-[#6C5B4B]">Engraving is included with Signature and optional with Basic. Your closing line stays in your film.</p>
          <Dialog.Close asChild>
            <Button variant="keep" size="touch" className="keep-premium-action mt-5 w-full justify-center">{variant === "library" ? "Back to your Keeps" : "Back to previews"}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
