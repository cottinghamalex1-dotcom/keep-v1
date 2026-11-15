/** Shared, display-only catalog math. Checkout must verify entitlements server-side before fulfillment. */
export type KeepTier = "basic" | "signature";
export const KEEP_PRICING = {
  basicCents: 6900,
  signatureCents: 9900,
  additionalSpeakerCents: 900,
  discountedBasicEngravingCents: 1499,
  regularBasicEngravingCents: 3000,
  extraCardCents: 3900,
} as const;

export type KeepOrderSelection = {
  tier: KeepTier;
  /** The number of cards beyond the single card in the base package. */
  extraCards: number;
  /** Basic-only optional engraved front, offered at completion. */
  engravingUpgrade: boolean;
  /** Prevents the promotional pop-up from reopening automatically on every edit. */
  engravingOfferSeen?: boolean;
};

export const defaultKeepOrder = (): KeepOrderSelection => ({
  tier: "basic", extraCards: 0, engravingUpgrade: false, engravingOfferSeen: false,
});

export const keepMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function normalizeExtraCards(value: number): number {
  // No arbitrary per-order card limit. Guard accidental negative, decimal and nonfinite input.
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function keepOrderQuote(
  order: Pick<KeepOrderSelection, "tier" | "extraCards" | "engravingUpgrade">,
  speakerCount: number,
) {
  const tier = order.tier === "signature" ? "signature" : "basic";
  const includedCardCount = 1;
  const extraCards = normalizeExtraCards(order.extraCards);
  const additionalSpeakers = Math.max(0, Math.floor(Number.isFinite(speakerCount) ? speakerCount : 1) - 1);
  const baseCents = tier === "signature" ? KEEP_PRICING.signatureCents : KEEP_PRICING.basicCents;
  const speakerCents = tier === "signature" ? 0 : additionalSpeakers * KEEP_PRICING.additionalSpeakerCents;
  const engravingCents = tier === "basic" && order.engravingUpgrade ? KEEP_PRICING.discountedBasicEngravingCents : 0;
  const extraCardsCents = extraCards * KEEP_PRICING.extraCardCents;
  return {
    tier, includedCardCount, extraCards, totalCards: includedCardCount + extraCards,
    additionalSpeakers, baseCents, speakerCents, engravingCents, extraCardsCents,
    totalCents: baseCents + speakerCents + engravingCents + extraCardsCents,
    hasEngraving: tier === "signature" || order.engravingUpgrade,
    // Multiple voices are included at no extra charge on Signature.
    includesCollaborators: tier === "signature",
  };
}
