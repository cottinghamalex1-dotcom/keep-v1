/** Shared, display-only catalog math. Checkout must verify entitlements server-side before fulfillment. */
export type KeepTier = "basic" | "signature";
export const KEEP_PRICING = {
  basicCents: 7900,
  basicRetailCents: 10900,
  signatureRetailCents: 12900,
  signatureCents: 9900,
  additionalSpeakerCents: 1900,
  additionalSpeakerRetailCents: 3900,
  discountedBasicEngravingCents: 900,
  regularBasicEngravingCents: 2000,
  extraCardCents: 3900,
  engravedExtraCardCents: 4900,
  engravedExtraCardRetailCents: 9900,
} as const;

export type KeepOrderSelection = {
  tier: KeepTier;
  /** The number of cards beyond the single card in the base package. */
  extraCards: number;
  /** Extra cards can have a different finish from the included card. */
  extraCardStyle?: "classic" | "engraved";
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
  order: Pick<KeepOrderSelection, "tier" | "extraCards" | "engravingUpgrade" | "extraCardStyle">,
  speakerCount: number,
) {
  const tier = order.tier === "signature" ? "signature" : "basic";
  const includedCardCount = 1;
  const extraCards = normalizeExtraCards(order.extraCards);
  const includedVoices = tier === "signature" ? 2 : 1;
  const additionalSpeakers = Math.max(0, Math.floor(Number.isFinite(speakerCount) ? speakerCount : 1) - includedVoices);
  const hasEngraving = tier === "signature" || order.engravingUpgrade;
  // Older drafts inherited their base card finish. Preserve that selection.
  const extraCardStyle = order.extraCardStyle ?? (hasEngraving ? "engraved" : "classic");
  const extraCardUnitCents = extraCardStyle === "engraved" ? KEEP_PRICING.engravedExtraCardCents : KEEP_PRICING.extraCardCents;
  const baseCents = tier === "signature" ? KEEP_PRICING.signatureCents : KEEP_PRICING.basicCents;
  const speakerCents = additionalSpeakers * KEEP_PRICING.additionalSpeakerCents;
  const engravingCents = tier === "basic" && order.engravingUpgrade ? KEEP_PRICING.discountedBasicEngravingCents : 0;
  const extraCardsCents = extraCards * extraCardUnitCents;
  return {
    tier, includedCardCount, extraCards, totalCards: includedCardCount + extraCards,
    includedVoices, extraCardStyle, extraCardUnitCents, additionalSpeakers, baseCents, speakerCents, engravingCents, extraCardsCents,
    totalCents: baseCents + speakerCents + engravingCents + extraCardsCents,
    hasEngraving,
    hasAnyEngraving: hasEngraving || (extraCards > 0 && extraCardStyle === "engraved"),
    // Signature includes the second voice; further contributors are paid add-ons.
    includesCollaborators: tier === "signature",
  };
}
