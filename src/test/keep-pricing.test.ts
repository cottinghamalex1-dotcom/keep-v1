import { describe, expect, it } from "vitest";
import { KEEP_PRICING, defaultKeepOrder, keepOrderQuote, normalizeExtraCards } from "@/lib/keep-pricing";

describe("Keep package pricing", () => {
  it("shows the approved base and add-on prices", () => {
    expect(KEEP_PRICING).toEqual({ basicCents: 7900, signatureCents: 9900, additionalSpeakerCents: 1900, extraCardCents: 4900 });
  });
  it("requires Signature for multiple voices or engraving", () => {
    const basic = keepOrderQuote(defaultKeepOrder(), 1);
    expect(basic.tier).toBe("basic");
    expect(basic.totalCents).toBe(7900);
    expect(basic.hasEngraving).toBe(false);
    for (const order of [defaultKeepOrder(), { ...defaultKeepOrder(), engravingUpgrade: true }]) {
      const quote = keepOrderQuote(order, 2);
      expect(quote.tier).toBe("signature");
      expect(quote.totalCents).toBe(9900);
    }
    expect(keepOrderQuote({ ...defaultKeepOrder(), engravingUpgrade: true }, 1).tier).toBe("signature");
    expect(keepOrderQuote({ ...defaultKeepOrder(), extraCards: 1, extraCardStyle: "engraved" }, 1).tier).toBe("signature");
  });
  it.each([[1, 9900], [2, 9900], [3, 11800], [8, 21300]])("quotes Signature with %i voices", (voices, total) => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), tier: "signature" }, voices);
    expect(quote.totalCents).toBe(total);
    expect(quote.hasEngraving).toBe(true);
    expect(quote.includedVoices).toBe(2);
  });
  it.each(["basic", "signature"] as const)("charges $49 for every extra card on %s", tier => {
    for (const extraCards of [0, 1, 2, 3, 4, 5, 10, 999]) {
      const quote = keepOrderQuote({ ...defaultKeepOrder(), tier, extraCards }, 1);
      expect(quote.extraCardsCents).toBe(extraCards * 4900);
      expect(quote.totalCards).toBe(extraCards + 1);
      expect(quote.extraCardStyle).toBe(tier === "signature" ? "engraved" : "classic");
    }
  });
  it("supports large card orders and ignores invalid quantities", () => {
    expect(keepOrderQuote({ ...defaultKeepOrder(), extraCards: 999 }, 1).totalCards).toBe(1000);
    for (const value of [-2, 2.5, Infinity, NaN]) expect(normalizeExtraCards(value)).toBe(0);
  });
  it("reprices restored legacy choices", () => {
    const restored = JSON.parse(JSON.stringify({ ...defaultKeepOrder(), tier: "signature", extraCards: 4, extraCardStyle: "classic" }));
    expect(keepOrderQuote(restored, 3).totalCents).toBe(31400);
  });
});
