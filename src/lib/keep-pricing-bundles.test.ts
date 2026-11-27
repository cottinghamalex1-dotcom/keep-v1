import { describe, expect, it } from "vitest";
import { defaultKeepOrder, keepOrderQuote } from "./keep-pricing";

describe("Flat extra-card pricing (no bundles)", () => {
  it("uses the same card rate for every quantity on both packages", () => {
    for (const tier of ["basic", "signature"] as const) for (const extraCards of [1, 2, 3, 4, 5, 9, 100]) {
      const quote = keepOrderQuote({ ...defaultKeepOrder(), tier, extraCards }, 1);
      expect(quote.totalCents).toBe((tier === "basic" ? 7900 : 9900) + 4900 * extraCards);
    }
  });
  it("adds voices beyond two only to Signature", () => {
    expect(keepOrderQuote({ ...defaultKeepOrder(), extraCards: 2 }, 4).totalCents).toBe(23500);
  });
});
