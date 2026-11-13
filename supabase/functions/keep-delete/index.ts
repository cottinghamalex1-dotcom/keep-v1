import { createClient } from "@supabase/supabase-js";

// Deletes only a Keep owned by the authenticated user. Public viewer links
// stop resolving as soon as the row is deleted. A linked NFC card is retained,
// but its keep_id is nulled by the existing foreign key.
const endpoint = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(endpoint, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

type MediaReference = { audioId?: string; id?: string; source?: string };
function draftMediaIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const project = value as {
    memories?: MediaReference[]; interviewAnswers?: MediaReference[];
    finalVoiceRecording?: MediaReference; voiceParts?: MediaReference[];
  };
  const ids = [
    ...(Array.isArray(project.memories) ? project.memories.filter(m => m?.source === "upload").map(m => m.id) : []),
    ...(Array.isArray(project.interviewAnswers) ? project.interviewAnswers.map(a => a?.audioId) : []),
    project.finalVoiceRecording?.audioId,
    ...(Array.isArray(project.voiceParts) ? project.voiceParts.map(p => p?.audioId) : []),
  ].filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(id));
  return [...new Set(ids)];
}
async function publishedMediaPaths(prefix: string): Promise<string[]> {
  const bucket = admin.storage.from("keep-media");
  const paths: string[] = [];
  const walk = async (folder: string, depth: number) => {
    if (depth > 4) throw new Error("Media folder exceeds expected depth");
    let offset = 0;
    while (true) {
      const { data, error } = await bucket.list(folder, { limit: 1000, offset });
      if (error) throw error;
      for (const item of data ?? []) {
        if (!item.name || item.name === "." || item.name === "..") continue;
        const path = folder + "/" + item.name;
        if (item.id) paths.push(path);
        else await walk(path, depth + 1);
      }
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
  };
  await walk(prefix, 0);
  return paths;
}
async function removeChunks(bucket: "keep-media" | "keep-draft-media", paths: string[]) {
  for (let offset = 0; offset < paths.length; offset += 500) {
    const { error } = await admin.storage.from(bucket).remove(paths.slice(offset, offset + 500));
    if (error) throw error;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 1500) return reply({ error: "Invalid request" }, 413);
    let body: { keepId?: unknown };
    try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid request" }, 400); }
    if (!uuid(body?.keepId)) return reply({ error: "Invalid Keep ID" }, 400);
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "Sign in to delete your Keep." }, 401);

    // NEVER authorize through service role; the user's token and RLS must
    // authorize both the read and the deletion.
    const client = createClient(endpoint, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply({ error: "Sign in to delete your Keep." }, 401);
    const keepId = body.keepId;
    const { data: keep, error: lookupError } = await client.from("keeps")
      .select("id,draft_project").eq("id", keepId).eq("owner_id", user.id).maybeSingle();
    if (lookupError) return reply({ error: "Could not verify your Keep." }, 500);
    if (!keep) return reply({ error: "This Keep was not found in your account." }, 404);

    const { data: draft, error: draftError } = await client.from("keep_drafts")
      .select("project").eq("owner_id", user.id).maybeSingle();
    if (draftError) return reply({ error: "Could not check your saved draft." }, 500);
    const matchingDraft = draft?.project?.publicationId === keepId;

    const { data: deleted, error: deletionError } = await client.from("keeps")
      .delete().eq("id", keepId).eq("owner_id", user.id).select("id");
    if (deletionError || deleted?.length !== 1) {
      return reply({ error: "Deletion was not confirmed. Your Keep is still saved." }, 409);
    }

    // Remove the single-draft pointer only if it still references this Keep;
    // don't delete a separate creation the owner started in another tab.
    let cleanupPending = false;
    if (matchingDraft) {
      const { error } = await client.from("keep_drafts").delete().eq("owner_id", user.id)
        .filter("project->>publicationId", "eq", keepId);
      if (error) cleanupPending = true;
    }

    // Reclaim every publication version for this Keep, including files from
    // previous updates. Use the Storage API, never SQL deletion of objects.
    try {
      const prefix = user.id + "/publications/" + keepId;
      await removeChunks("keep-media", await publishedMediaPaths(prefix));
      const ids = new Set(draftMediaIds(keep.draft_project));
      if (matchingDraft) draftMediaIds(draft?.project).forEach(id => ids.add(id));
      // Other Keeps can be based on a shared/editable draft; do not delete
      // audio or images that another existing Keep still references.
      const { data: others, error } = await client.from("keeps")
        .select("draft_project").eq("owner_id", user.id).limit(1000);
      if (error) throw error;
      for (const other of others ?? []) draftMediaIds(other.draft_project).forEach(id => ids.delete(id));
      if (!matchingDraft) draftMediaIds(draft?.project).forEach(id => ids.delete(id));
      await removeChunks("keep-draft-media", [...ids].map(id => user.id + "/" + id));
    } catch {
      // Viewing link is already revoked and owner row deleted. Report that a
      // media cleanup needs attention instead of claiming full erasure.
      cleanupPending = true;
    }
    return reply({ deleted: true, keepId, mediaCleanupPending: cleanupPending });
  } catch {
    return reply({ error: "Could not delete this Keep. Please try again." }, 500);
  }
});
