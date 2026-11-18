import { describe, expect, it } from "vitest";
import { keepSavingProgress } from "@/lib/keep-saving-progress";

describe("customer-facing saving progress", () => {
  it("counts actual uploaded source files, not elapsed seconds", () => {
    expect(keepSavingProgress(true, "Saving memories 2 of 4…").percent).toBe(21);
    expect(keepSavingProgress(true, "Saving memories 4 of 4…").percent).toBe(34);
  });
  it("uses real supplier milestones and stays below 100 until private storage is ready", () => {
    expect(keepSavingProgress(false, "", { status: "rendering", providerStatus: "queued" }).percent).toBe(42);
    expect(keepSavingProgress(false, "", { status: "rendering", providerStatus: "preprocessing" }).percent).toBe(55);
    expect(keepSavingProgress(false, "", { status: "rendering", providerStatus: "rendering" }).percent).toBe(68);
    expect(keepSavingProgress(false, "", { status: "rendering", providerStatus: "saving" }).percent).toBe(84);
    expect(keepSavingProgress(false, "", { status: "ready" }).percent).toBe(100);
  });
  it("never claims a failed save is finished", () => {
    expect(keepSavingProgress(false, "", { status: "failed", error: "Something failed" }).percent).toBeLessThan(100);
  });
});
