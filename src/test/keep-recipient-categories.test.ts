import { describe, expect, it } from "vitest";
import { relationshipGroups, KEEP_RECIPIENT_CATEGORIES, chosenKeepRecipientRelationship, isKeepRecipientCategorySelected } from "@/lib/keep-recipient-categories";

describe("Keep recipient relationships", () => {
  it("releases the exact approved grouped chooser from PR #64", () => {
    expect(relationshipGroups.map(g => g.title)).toEqual(["Family & friends", "Work & community", "Other"]);
    for (const category of ["Parent", "In-Law", "Family Member", "Family Friend", "Coworker",
      "Boss / Mentor", "Neighbor", "Teacher / Coach", "Pastor / Faith Leader",
      "Service Provider", "Military / Veteran", "Myself", "Someone else"]) {
      expect(KEEP_RECIPIENT_CATEGORIES).toContain(category);
    }
    expect(KEEP_RECIPIENT_CATEGORIES).not.toContain("Mom");
    expect(KEEP_RECIPIENT_CATEGORIES).not.toContain("Dad");
    expect(new Set(KEEP_RECIPIENT_CATEGORIES).size).toBe(KEEP_RECIPIENT_CATEGORIES.length);
  });
  it("retains older parent drafts without erasing their stored Mom/Dad values", () => {
    expect(chosenKeepRecipientRelationship("Mom")).toBe("Parent");
    expect(chosenKeepRecipientRelationship("Dad")).toBe("Parent");
    expect(isKeepRecipientCategorySelected("Mom", "Parent")).toBe(true);
    expect(isKeepRecipientCategorySelected("Dad", "Parent")).toBe(true);
    expect(isKeepRecipientCategorySelected("In-Law", "Parent")).toBe(false);
  });
  it("shows legacy custom values as Someone else rather than hiding their selection", () => {
    expect(chosenKeepRecipientRelationship("My counselor")).toBe("Someone else");
    expect(chosenKeepRecipientRelationship("Pastor / Faith Leader")).toBe("Pastor / Faith Leader");
    expect(isKeepRecipientCategorySelected("My counselor", "Someone else")).toBe(true);
  });
});
