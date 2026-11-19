/** Shared, display-only catalog math. Checkout must verify entitlements server-side before fulfillment. */
export type KeepTier = "basic" | "signature";
export const KEEP_PRICING = {
  basicCents: 7900,
  signatureCents: 9900,
  additionalSpeakerCents: 1900,
  basicEngravingCents: 1900,
  extraCardCents: 3900,
  engravedExtraCardCents: 4900,
  // Signature matching engraved card bundles: 2 cards $139, 3 cards $179, 5 cards $249.
  signatureDuoCents: 13900,
  signatureFamilyThreeCents: 17900,
  signatureFamilyFiveCents: 24900,
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

/** Signed-in pricing preview only. Final payable items must be priced and verified on the server. */
export function signatureEngravedExtrasCents(extraCards: number): number {
  const count = normalizeExtraCards(extraCards);
  if (count === 0) return 0;
  if (count <= 3) return count * 4000;
  // Five physical cards cost $249 total with the included $99 Signature card.
  // Extra engraved cards beyond the five-card bundle remain $40 per card.
  return 15000 + (count - 4) * 4000;
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
  const engravingCents = tier === "basic" && order.engravingUpgrade ? KEEP_PRICING.basicEngravingCents : 0;
  const standardExtraCardsCents = extraCards * extraCardUnitCents;
  const usesSignatureEngravedBundle = tier === "signature" && extraCardStyle === "engraved" && extraCards > 0;
  const extraCardsCents = usesSignatureEngravedBundle ? signatureEngravedExtrasCents(extraCards) : standardExtraCardsCents;
  const bundleSavingsCents = standardExtraCardsCents - extraCardsCents;
  const bundleLabel = usesSignatureEngravedBundle ? (extraCards === 1 ? "Signature Duo" : extraCards === 2 ? "Signature Family" : extraCards === 4 ? "Signature Five" : "Signature matching-card savings") : null;
  return {
    tier, includedCardCount, extraCards, totalCards: includedCardCount + extraCards,
    includedVoices, extraCardStyle, extraCardUnitCents, additionalSpeakers, baseCents, speakerCents, engravingCents, extraCardsCents, bundleSavingsCents, bundleLabel,
    totalCents: baseCents + speakerCents + engravingCents + extraCardsCents,
    hasEngraving,
    hasAnyEngraving: hasEngraving || (extraCards > 0 && extraCardStyle === "engraved"),
    // Signature includes the second voice; further contributors are paid add-ons.
    includesCollaborators: tier === "signature",
  };
}
