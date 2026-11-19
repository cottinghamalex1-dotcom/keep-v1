import { describe, expect, it } from "vitest";
import { keepOrderQuote, signatureEngravedExtrasCents } from "./keep-pricing";

const quote = (tier: "basic" | "signature", extraCards = 0, extraCardStyle: "classic" | "engraved" = "engraved", voices = 1, engravingUpgrade = false) =>
  keepOrderQuote({ tier, extraCards, extraCardStyle, engravingUpgrade }, voices);

describe("Keep November launch price matrix", () => {
  it("maintains credible $79 Basic and $99 Signature base prices", () => {
    expect(quote("basic", 0, "classic").totalCents).toBe(7900);
    expect(quote("signature").totalCents).toBe(9900);
    expect(quote("signature", 0, "engraved", 2).additionalSpeakers).toBe(0);
  });
  it("charges Basic engraving $19 once; Signature includes engraving and second voice", () => {
    expect(quote("basic", 0, "classic", 1, true).totalCents).toBe(9800);
    expect(quote("basic", 0, "classic", 2, true).totalCents).toBe(11700);
    expect(quote("signature", 0, "engraved", 2, true).totalCents).toBe(9900);
    expect(quote("signature", 0, "engraved", 3).totalCents).toBe(11800);
  });
  it("applies Signature engraved bundle prices including the base card", () => {
    expect(quote("signature", 1).totalCents).toBe(13900);
    expect(quote("signature", 2).totalCents).toBe(17900);
    expect(quote("signature", 4).totalCents).toBe(24900);
    expect(quote("signature", 1).bundleSavingsCents).toBe(900);
    expect(quote("signature", 2).bundleSavingsCents).toBe(1800);
    expect(quote("signature", 4).bundleSavingsCents).toBe(4600);
  });
  it("does not discount Basic cards or Signature plain extras", () => {
    expect(quote("basic", 2).totalCents).toBe(17700);
    expect(quote("signature", 2, "classic").totalCents).toBe(17700);
    expect(quote("signature", 2, "classic").bundleSavingsCents).toBe(0);
  });
  it("allows larger orders and sanitizes invalid quantities", () => {
    expect(quote("signature", 9).totalCents).toBe(44900);
    expect(signatureEngravedExtrasCents(-1)).toBe(0);
    expect(signatureEngravedExtrasCents(Number.NaN)).toBe(0);
  });
});
