import { describe, expect, it } from "vitest";
import { KEEP_RECIPIENT_CATEGORIES, isKeepRecipientCategorySelected } from "@/lib/keep-recipient-categories";

describe("Keep recipient relationships", () => {
  it("includes all approved recipient categories including in-laws and service providers", () => {
    for (const category of [
      "Parent", "In-law", "Coworker", "Family member", "Family friend", "Boss",
      "Neighbor", "Pastor", "Military / Service member", "Service provider",
      "Spouse / Partner", "Child", "Grandparent", "Sibling", "Friend",
      "Myself", "Someone else"
    ]) expect(KEEP_RECIPIENT_CATEGORIES).toContain(category);
    expect(KEEP_RECIPIENT_CATEGORIES).not.toContain("Mom");
    expect(KEEP_RECIPIENT_CATEGORIES).not.toContain("Dad");
    expect(new Set(KEEP_RECIPIENT_CATEGORIES).size).toBe(KEEP_RECIPIENT_CATEGORIES.length);
  });
  it("keeps Mom and Dad from older saved Keeps visibly selected as Parent", () => {
    expect(isKeepRecipientCategorySelected("Mom", "Parent")).toBe(true);
    expect(isKeepRecipientCategorySelected("Dad", "Parent")).toBe(true);
    expect(isKeepRecipientCategorySelected("Parent", "Parent")).toBe(true);
    expect(isKeepRecipientCategorySelected("In-law", "Parent")).toBe(false);
  });
  it("keeps specialty selections exact and preserves custom labels", () => {
    expect(isKeepRecipientCategorySelected("Pastor", "Pastor")).toBe(true);
    expect(isKeepRecipientCategorySelected("Military / Service member", "Service provider")).toBe(false);
    expect(isKeepRecipientCategorySelected("My counselor", "Someone else")).toBe(false);
  });
});
