import { describe, expect, it } from "vitest";
import { KEEP_PRICING, defaultKeepOrder, keepOrderQuote, normalizeExtraCards } from "@/lib/keep-pricing";

describe("Keep package pricing", () => {
  it("shows launch prices without invented former-price references", () => {
    expect(KEEP_PRICING.basicCents).toBe(7900);
    expect(KEEP_PRICING.signatureCents).toBe(9900);
    expect(KEEP_PRICING.basicEngravingCents).toBe(1900);
  });
  it.each([[1, 7900], [2, 9800], [3, 11700], [8, 21200]])("quotes Basic with %i voices", (voices, total) => {
    expect(keepOrderQuote(defaultKeepOrder(), voices).totalCents).toBe(total);
  });
  it.each([[1, 9900], [2, 9900], [3, 11800], [8, 21300]])("quotes Signature with %i voices", (voices, total) => {
    const quote = keepOrderQuote({ ...defaultKeepOrder(), tier: "signature" }, voices);
    expect(quote.totalCents).toBe(total);
    expect(quote.hasEngraving).toBe(true);
    expect(quote.includedVoices).toBe(2);
  });
  it("charges $19 once for Basic engraving and never adds it to Signature", () => {
    const basic = keepOrderQuote({ ...defaultKeepOrder(), engravingUpgrade: true }, 1);
    expect(basic.engravingCents).toBe(1900);
    expect(basic.totalCents).toBe(9800);
    expect(keepOrderQuote({ ...defaultKeepOrder(), tier: "signature", engravingUpgrade: true }, 2).totalCents).toBe(9900);
  });
  it.each(["basic", "signature"] as const)("allows both extra card finishes on %s independently of the included card", tier => {
    const order = { ...defaultKeepOrder(), tier, extraCards: 2 };
    const classic = keepOrderQuote({ ...order, extraCardStyle: "classic" }, 2);
    const engraved = keepOrderQuote({ ...order, extraCardStyle: "engraved" }, 2);
    expect(classic.extraCardsCents).toBe(7800);
    expect(engraved.extraCardsCents).toBe(tier === "signature" ? 8000 : 9800);
    expect(engraved.totalCents - classic.totalCents).toBe(tier === "signature" ? 200 : 2000);
    expect(engraved.hasEngraving).toBe(tier === "signature");
    expect(engraved.hasAnyEngraving).toBe(true);
    expect(engraved.totalCards).toBe(3);
  });
  it("keeps old draft extra cards in their inherited finish", () => {
    expect(keepOrderQuote({ tier: "signature", extraCards: 9, engravingUpgrade: false }, 2).totalCents).toBe(44900);
    expect(keepOrderQuote({ ...defaultKeepOrder(), engravingUpgrade: true, extraCards: 1 }, 1).totalCents).toBe(14700);
  });
  it("supports large card orders and ignores invalid quantities", () => {
    expect(keepOrderQuote({ ...defaultKeepOrder(), extraCards: 999 }, 1).totalCards).toBe(1000);
    for (const value of [-2, 2.5, Infinity, NaN]) expect(normalizeExtraCards(value)).toBe(0);
  });
  it("retains choices when a draft is saved and restored", () => {
    const restored = JSON.parse(JSON.stringify({ ...defaultKeepOrder(), tier: "signature", extraCards: 4, extraCardStyle: "classic" }));
    expect(keepOrderQuote(restored, 3).totalCents).toBe(27400);
  });
});
