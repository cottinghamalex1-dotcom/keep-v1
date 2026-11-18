import { describe, expect, it } from "vitest";
import { defaultKeepOrder, keepOrderQuote, KEEP_PRICING, normalizeExtraCards } from "./keep-pricing";

describe("Keep November 2026 packages", () => {
  it("prices one Basic package at $79 with one logo card and one voice", () => {
    const quote = keepOrderQuote(defaultKeepOrder(), 1);
    expect(quote.baseCents).toBe(7900);
    expect(quote.totalCents).toBe(7900);
    expect(quote.includedVoices).toBe(1);
    expect(quote.totalCards).toBe(1);
    expect(quote.hasEngraving).toBe(false);
  });

  it("includes engraving and two voices in Signature at $99", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), tier: "signature" }, 2);
    expect(quote.totalCents).toBe(9900);
    expect(quote.includedVoices).toBe(2);
    expect(quote.additionalSpeakers).toBe(0);
    expect(quote.hasEngraving).toBe(true);
    expect(quote.engravingCents).toBe(0);
  });

  it("charges Basic $19 for each additional person and $9 for engraving", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), engravingUpgrade: true }, 3);
    expect(quote.additionalSpeakers).toBe(2);
    expect(quote.speakerCents).toBe(3800);
    expect(quote.engravingCents).toBe(900);
    expect(quote.totalCents).toBe(12600);
  });

  it("charges Signature only for the third and subsequent voices", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), tier: "signature" }, 4);
    expect(quote.additionalSpeakers).toBe(2);
    expect(quote.totalCents).toBe(13700);
  });

  it("prices multiple logo-only cards without charging for another digital Keep", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), extraCards: 5, extraCardStyle: "classic" }, 1);
    expect(quote.totalCards).toBe(6);
    expect(quote.extraCardsCents).toBe(5 * 3900);
    expect(quote.totalCents).toBe(7900 + 5 * 3900);
  });

  it("prices engraved extra cards independently from the included card finish", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), extraCards: 9, extraCardStyle: "engraved" }, 1);
    expect(quote.totalCards).toBe(10);
    expect(quote.extraCardsCents).toBe(9 * 4900);
    expect(quote.hasEngraving).toBe(false);
    expect(quote.hasAnyEngraving).toBe(true);
    expect(quote.totalCents).toBe(7900 + 9 * 4900);
  });

  it("never double-charges engraving on Signature", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), tier: "signature", engravingUpgrade: true, extraCards: 2, extraCardStyle: "engraved" }, 2);
    expect(quote.engravingCents).toBe(0);
    expect(quote.totalCents).toBe(9900 + 2 * 4900);
  });

  it("guards malformed quantities without imposing a 10-card UI limit", () => {
    expect(normalizeExtraCards(-1)).toBe(0);
    expect(normalizeExtraCards(2.5)).toBe(0);
    expect(normalizeExtraCards(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeExtraCards(100)).toBe(100);
    expect(KEEP_PRICING.additionalSpeakerCents).toBe(1900);
  });
});
