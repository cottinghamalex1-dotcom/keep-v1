import { useState } from "react";
import { ArrowRight, Check, ChevronDown, LockKeyhole } from "lucide-react";
import { keepMoney, keepOrderQuote, type KeepOrderSelection, type KeepTier } from "@/lib/keep-pricing";
import { checkoutVoiceCount, loadCheckoutSelection, saveCheckoutSelection, type CheckoutKeep } from "@/lib/keep-checkout";

const choices = [
  { tier: "basic", name: "Basic Keep", price: "$79", detail: "1 voice · 1 matte-black card" },
  { tier: "signature", name: "Signature Keep", price: "$99", detail: "2 voices · personalized engraving" },
] as const;

/** The payment launch gate remains locked until the existing Stripe checkout,
 * tax, fulfillment and purchase verification acceptance tests pass. */
export function KeepPurchase({ keep }: { keep: CheckoutKeep }) {
  const voices = checkoutVoiceCount(keep);
  const [order, setOrder] = useState<KeepOrderSelection>(() => loadCheckoutSelection(keep.id, voices));
  const [extrasOpen, setExtrasOpen] = useState(false);
  const update = (change: Partial<KeepOrderSelection>) => {
    const next = { ...order, ...change };
    setOrder(next);
    saveCheckoutSelection(keep.id, next);
  };
  const selectTier = (tier: KeepTier) => update({ tier, engravingUpgrade: false });
  const quote = keepOrderQuote(order, voices);
  return <section aria-label="Purchase your Keep" className="space-y-5">
    <div>
      <h1 className="keep-editorial-title">Make it theirs.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Choose the card for {keep.recipient_name || "your finished Keep"}.</p>
    </div>
    <div role="group" aria-label="Keep package" className="grid gap-3 sm:grid-cols-2">
      {choices.map(({ tier, name, price, detail }) => (
        <button type="button" key={tier} aria-pressed={order.tier === tier} onClick={() => selectTier(tier)}
          className={`relative rounded-2xl border bg-[#FFFCF8] px-5 py-5 text-left transition-colors ${order.tier === tier ? "border-[#211B17] ring-1 ring-[#211B17]" : "border-[#DDD0C2]"}`}>
          <div className="flex items-start justify-between gap-2">
            <div><span className="block font-display text-[24px] text-[#2C221A]">{name}</span><span className="mt-1 block text-xs text-[#746758]">{detail}</span></div>
            <span className="shrink-0 text-lg font-medium">{price}</span>
          </div>
          {tier === "signature" && <span className="mt-4 inline-block rounded-full bg-[#EEE3D6] px-2.5 py-1 text-[10px] font-medium text-[#6A5849]">Engraving included</span>}
          {order.tier === tier && <Check aria-label="Selected" className="ml-auto mt-2 size-4 text-[#47715B]" />}
        </button>
      ))}
    </div>
    <div className="rounded-xl border border-border bg-card">
      <button type="button" aria-expanded={extrasOpen} onClick={() => setExtrasOpen(v => !v)} className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-sm">
        Card details &amp; extras <ChevronDown className={`size-4 transition-transform ${extrasOpen ? "rotate-180" : ""}`} />
      </button>
      {extrasOpen && <div className="space-y-4 border-t border-border p-4 text-sm">
        {order.tier === "basic" && <label className="flex items-center justify-between gap-3">Add personalized engraving (+$19)<input type="checkbox" checked={order.engravingUpgrade} onChange={e => update({ engravingUpgrade: e.target.checked })} className="size-4 accent-[#211B17]" /></label>}
        {quote.hasEngraving && keep.published_project.openingMessage && <p className="rounded-lg bg-[#F4EEE6] p-3 text-xs leading-5">Opening message: “{keep.published_project.openingMessage}”</p>}
        <label className="flex items-center justify-between gap-4">Additional cards
          <input type="number" min={0} step={1} aria-label="Additional cards" value={order.extraCards} onChange={e => update({ extraCards: Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(e.target.value) || 0))) })} className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </label>
        {order.extraCards > 0 && <label className="block">Extra card finish
          <select value={quote.extraCardStyle} onChange={e => update({ extraCardStyle: e.target.value as "classic" | "engraved" })} className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm"><option value="classic">Logo only · $39 each</option><option value="engraved">Engraved · {order.tier === "signature" ? "matching-card savings" : "$49 each"}</option></select>
        </label>}
      </div>}
    </div>
    <div className="space-y-2 border-t border-border pt-4 text-sm">
      {quote.additionalSpeakers > 0 && <div className="flex justify-between text-muted-foreground"><span>{quote.additionalSpeakers} additional {quote.additionalSpeakers === 1 ? "voice" : "voices"}</span><span>{keepMoney(quote.speakerCents)}</span></div>}
      {quote.engravingCents > 0 && <div className="flex justify-between text-muted-foreground"><span>Engraving</span><span>{keepMoney(quote.engravingCents)}</span></div>}
      {quote.extraCards > 0 && <div className="flex justify-between text-muted-foreground"><span>Additional cards</span><span>{keepMoney(quote.extraCardsCents)}</span></div>}
      <div className="flex items-center justify-between font-medium"><span>Subtotal</span><span className="text-xl">{keepMoney(quote.totalCents)}</span></div>
      <p className="text-xs text-muted-foreground">Standard U.S. shipping included. Applicable tax is additional.</p>
    </div>
    <button type="button" disabled className="keep-premium-action flex min-h-14 w-full items-center justify-between px-5 text-sm opacity-65"><span>Checkout opening soon</span><ArrowRight className="size-5" /></button>
    <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground"><LockKeyhole className="size-3.5" /> Your Keep is saved. Payments are not yet active.</p>
  </section>;
}
