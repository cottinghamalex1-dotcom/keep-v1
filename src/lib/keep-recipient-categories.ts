/**
 * Recipient choices shown in every new Keep. Keep these in one place so category
 * additions cannot silently disappear from future revisions of the creation flow.
 *
 * Older drafts may still store "Mom" or "Dad" instead of "Parent"; those labels
 * must remain valid so reopening a draft does not erase its saved relationship.
 */
export const KEEP_RECIPIENT_CATEGORIES = [
  "Spouse / Partner",
  "Parent",
  "Child",
  "Grandparent",
  "Sibling",
  "In-law",
  "Friend",
  "Family member",
  "Family friend",
  "Coworker",
  "Boss",
  "Neighbor",
  "Pastor",
  "Military / Service member",
  "Service provider",
  "Coach / Mentor",
  "Myself",
  "Someone else",
] as const;

export function isKeepRecipientCategorySelected(savedRelationship: string, category: string): boolean {
  return savedRelationship === category ||
    (category === "Parent" && (savedRelationship === "Mom" || savedRelationship === "Dad"));
}
