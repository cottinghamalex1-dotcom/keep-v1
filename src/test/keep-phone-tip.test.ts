import { describe, expect, it } from "vitest";
import { isNonPhoneDevice } from "@/components/keep-phone-tip";

describe("Keep smartphone guidance", () => {
  it("does not nudge iPhones or Android phones", () => {
    expect(isNonPhoneDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile", "iPhone", 5, true)).toBe(false);
    expect(isNonPhoneDevice("Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Mobile Safari/537.36", "Linux armv8", 5, true)).toBe(false);
  });

  it("does nudge desktop and iPad visitors", () => {
    expect(isNonPhoneDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 0, false)).toBe(true);
    expect(isNonPhoneDevice("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile", "iPad", 5, false)).toBe(true);
    expect(isNonPhoneDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 5, false)).toBe(true);
  });
});
