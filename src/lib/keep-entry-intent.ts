/** Determine whether the home entry needs a personal draft restore.
 * Normal visits to "/" belong to the dashboard, not the film editor.
 */
export function getKeepEntryIntent(search: string) {
  const params = new URLSearchParams(search);
  const editId = params.get("edit") || null;
  const resumeRequested = params.get("resume") === "1" || !!editId;
  const createRequested = params.get("create") === "1";
  return {
    editId,
    finalTouchesRequested: !!editId && params.get("final") === "1",
    resumeRequested,
    createRequested,
    // Do not restore photos, voice or cloud drafts just to open Home.
    redirectToDashboard: !resumeRequested && !createRequested,
  };
}


/** Return directly to the final personalization of a specific saved Keep. */
export const keepFinalTouchesPath = (id: string) => "/?edit=" + encodeURIComponent(id) + "&final=1";
