import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KEEP_PRICING, keepMoney } from "@/lib/keep-pricing";

export function KeepEngravingOffer({ open, onOpenChange, onSelect, onUpgradeToSignature }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (engraving: boolean) => void;
  onUpgradeToSignature?: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border-[#D8C8B6] bg-[#FBF8F3] p-7 shadow-2xl">
      <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#806A53]">The finishing touch</span>
      <DialogTitle className="mt-3 font-display text-[clamp(30px,7vw,42px)] font-normal leading-tight">Make it unmistakably theirs.</DialogTitle>
      <DialogDescription className="text-sm leading-7 text-[#665B50]">Add a personal message engraved on your included metal card. Something they can hold, even before they tap.</DialogDescription>
      <div className="mt-2 flex items-baseline gap-3"><strong className="font-display text-4xl font-normal">{keepMoney(KEEP_PRICING.basicEngravingCents)}</strong></div>
      <p className="text-xs leading-6 text-[#77614D]">Or get Signature for just $1 more than Basic with engraving, including room for two voices.</p>
      {onUpgradeToSignature && <button type="button" className="keep-premium-action mt-3 flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-sm" onClick={onUpgradeToSignature}>Upgrade to Signature · $99</button>}
      <button type="button" className="mt-2 min-h-12 w-full rounded-xl border border-[#B99F7F] px-4 text-sm font-medium text-[#594A3B]" onClick={() => onSelect(true)}>Add engraving to Basic · $19</button>
      <button type="button" className="min-h-11 w-full text-xs text-[#6D6257]" onClick={() => onSelect(false)}>No thanks, keep it classic</button>
      <p className="text-center text-[10px] leading-5 text-[#8A7A68]">This saves your selection. Payment comes later at secure checkout.</p>
    </DialogContent>
  </Dialog>;
}
