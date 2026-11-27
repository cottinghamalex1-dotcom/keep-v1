/** Shared, display-only catalog math. Checkout must verify entitlements server-side before fulfillment. */
export type KeepTier = "basic" | "signature";
export const KEEP_PRICING = {
  basicCents: 7900,
  signatureCents: 9900,
  additionalSpeakerCents: 1900,
  extraCardCents: 4900,
} as const;

export type KeepOrderSelection = {
  tier: KeepTier;
  /** The number of cards beyond the single card in the base package. */
  extraCards: number;
  /** Legacy finish selection; new extra cards match the selected package. */
  extraCardStyle?: "classic" | "engraved";
  /** Legacy engraving request; resolves to Signature under current pricing. */
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
  const includedCardCount = 1;
  const extraCards = normalizeExtraCards(order.extraCards);
  const people = Math.max(1, Math.floor(Number.isFinite(speakerCount) ? speakerCount : 1));
  // Old selections requesting engraving and collaborative Keeps must use Signature.
  const tier = order.tier === "signature" || people > 1 || order.engravingUpgrade || (extraCards > 0 && order.extraCardStyle === "engraved") ? "signature" : "basic";
  const includedVoices = tier === "signature" ? 2 : 1;
  const additionalSpeakers = Math.max(0, people - includedVoices);
  const hasEngraving = tier === "signature";
  const extraCardStyle = hasEngraving ? "engraved" : "classic";
  const extraCardUnitCents = KEEP_PRICING.extraCardCents;
  const baseCents = tier === "signature" ? KEEP_PRICING.signatureCents : KEEP_PRICING.basicCents;
  const speakerCents = additionalSpeakers * KEEP_PRICING.additionalSpeakerCents;
  const extraCardsCents = extraCards * extraCardUnitCents;
  return {
    tier, includedCardCount, extraCards, totalCards: includedCardCount + extraCards,
    includedVoices, extraCardStyle, extraCardUnitCents, additionalSpeakers, baseCents, speakerCents, extraCardsCents,
    totalCents: baseCents + speakerCents + extraCardsCents,
    hasEngraving, hasAnyEngraving: hasEngraving,
    includesCollaborators: tier === "signature",
  } as const;
}
