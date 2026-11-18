import { describe, expect, it } from "vitest";
import { relationshipGroups } from "@/routes/index";

describe("Keep recipient choices", () => {
  const options = relationshipGroups.flatMap((group) => [...group.options]);
  it("replaces Mom and Dad with one Parent category", () => {
    expect(options).toContain("Parent");
    expect(options).not.toContain("Mom");
    expect(options).not.toContain("Dad");
  });
  it("covers family, friends, work, community and service relationships without duplicates", () => {
    for (const name of ["Family Member", "Family Friend", "Coworker", "Boss / Mentor",
      "Neighbor", "Service Provider", "Military / Veteran", "Pastor / Faith Leader",
      "Teacher / Coach", "Myself", "Someone else"]) {
      expect(options).toContain(name);
    }
    expect(new Set(options).size).toBe(options.length);
    expect(relationshipGroups.map((group) => group.title)).toEqual([
      "Family & friends", "Work & community", "Other",
    ]);
  });
});
