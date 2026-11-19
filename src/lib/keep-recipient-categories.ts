/** Approved grouped recipient chooser, extracted from unreleased Shotstack PR #64. */
export const relationshipGroups = [
  { title: "Family & friends", options: [
    "Spouse / Partner", "Parent", "In-Law", "Child", "Grandparent",
    "Sibling", "Family Member", "Friend", "Family Friend",
  ] },
  { title: "Work & community", options: [
    "Coworker", "Boss / Mentor", "Neighbor", "Teacher / Coach",
    "Pastor / Faith Leader", "Service Provider", "Military / Veteran",
  ] },
  { title: "Other", options: ["Myself", "Someone else"] },
] as const;

export const KEEP_RECIPIENT_CATEGORIES: string[] = relationshipGroups.flatMap(group => [...group.options]);

/** Keep legacy Mom/Dad drafts and custom relationships editable without changing saved data. */
export function chosenKeepRecipientRelationship(savedRelationship: string): string {
  if (savedRelationship === "Mom" || savedRelationship === "Dad") return "Parent";
  if (KEEP_RECIPIENT_CATEGORIES.includes(savedRelationship)) return savedRelationship;
  return savedRelationship ? "Someone else" : "";
}

export function isKeepRecipientCategorySelected(savedRelationship: string, category: string): boolean {
  return chosenKeepRecipientRelationship(savedRelationship) === category;
}
