/** Permanent, owner-authorized deletion of a Keep and its viewing link. */
const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export type KeepDeletionResult = { deleted: true; keepId: string; mediaCleanupPending: boolean };

export async function deleteOwnedKeep(keepId: string, accessToken: string): Promise<KeepDeletionResult> {
  const response = await fetch(endpoint + "/functions/v1/keep-delete", {
    method: "POST",
    headers: { apikey: publicKey, Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ keepId }),
  });
  const result = await response.json().catch(() => null) as Partial<KeepDeletionResult> & { error?: string } | null;
  if (!response.ok) throw new Error(result?.error || "This Keep could not be deleted. Please try again.");
  if (!result || result.deleted !== true || result.keepId !== keepId) {
    throw new Error("Deletion could not be confirmed. Refresh before trying again.");
  }
  return { deleted: true, keepId, mediaCleanupPending: result.mediaCleanupPending === true };
}

export function keepDeleteConfirmation(recipientName: string | null, isPublished: boolean, linkedToCard: boolean): string {
  const recipient = recipientName?.trim() || "someone special";
  const consequences = isPublished
    ? "Their viewing link will stop working immediately, including any link you have already shared."
    : "This draft cannot be restored.";
  const cardWarning = linkedToCard
    ? " Any physical NFC card linked to this Keep will no longer open it until it is linked to a different Keep."
    : "";
  return `Permanently delete the Keep for ${recipient}?\n\n${consequences}${cardWarning}\n\nAll saved work in this Keep will be removed. This cannot be undone.`;
}
