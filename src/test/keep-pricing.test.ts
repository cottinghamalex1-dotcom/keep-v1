import { describe, expect, it } from "vitest";
import { defaultKeepOrder, keepOrderQuote, normalizeExtraCards } from "@/lib/keep-pricing";

describe("two-tier Keep orders", () => {
  it("includes the first Basic voice and charges nine dollars per extra person", () => {
    const quote = keepOrderQuote({ ...defaultKeepOrder() }, 2);
    expect(quote.baseCents).toBe(6900);
    expect(quote.speakerCents).toBe(900);
    expect(quote.totalCents).toBe(7800);
  });

  it("includes any number of contributors and engraving with Signature", () => {
    const quote = keepOrderQuote({ tier: "signature", extraCards: 0, engravingUpgrade: false }, 8);
    expect(quote.speakerCents).toBe(0);
    expect(quote.engravingCents).toBe(0);
    expect(quote.hasEngraving).toBe(true);
    expect(quote.totalCents).toBe(9900);
  });

  it("offers discounted Basic engraving once, never on Signature", () => {
    const basic = keepOrderQuote({ tier: "basic", engravingUpgrade: true, extraCards: 0 }, 1);
    const signature = keepOrderQuote({ tier: "signature", engravingUpgrade: true, extraCards: 0 }, 1);
    expect(basic.engravingCents).toBe(1499);
    expect(basic.totalCents).toBe(8399);
    expect(signature.totalCents).toBe(9900);
  });

  it("permits any requested card count and connects it to just one digital Keep", () => {
    const quote = keepOrderQuote({ tier: "signature", engravingUpgrade: false, extraCards: 9 }, 2);
    expect(quote.totalCards).toBe(10);
    expect(quote.extraCardsCents).toBe(35100);
    expect(quote.totalCents).toBe(45000);
    expect(keepOrderQuote({ tier: "basic", extraCards: 999, engravingUpgrade: false }, 1).totalCards).toBe(1000);
  });

  it("ignores invalid negative, fractional or infinite extra card quantities", () => {
    expect(normalizeExtraCards(-2)).toBe(0);
    expect(normalizeExtraCards(2.5)).toBe(0);
    expect(normalizeExtraCards(Infinity)).toBe(0);
  });
});
