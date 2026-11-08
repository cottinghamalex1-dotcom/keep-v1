import { getBlob, putBlob } from "./keep-media-store";
import { newProject, type KeepProject } from "./keep-project";
import { memoryImages } from "@/components/keep-player";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export const SESSION_KEY = "keep-app-session";
export type KeepSession = { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user: { id: string; email?: string; user_metadata?: { first_name?: string; given_name?: string; display_name?: string; full_name?: string; name?: string } } };
export function readKeepSession(): KeepSession | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as KeepSession : null; } catch { return null; }
}
export async function activeKeepSession(): Promise<KeepSession | null> {
  const session = readKeepSession();
  if (!session) return null;
  if (!session.expires_at || session.expires_at > Math.floor(Date.now()/1000) + 90) return session;
  const res = await fetch(endpoint + "/auth/v1/token?grant_type=refresh_token", { method:"POST", headers: { apikey: publicKey, "Content-Type":"application/json" }, body: JSON.stringify({refresh_token: session.refresh_token}) });
  if (!res.ok) { localStorage.removeItem(SESSION_KEY); return null; }
  const renewed = await res.json();
  const next: KeepSession = { ...renewed, expires_at: Math.floor(Date.now()/1000) + renewed.expires_in };
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}
async function request(path: string, session: KeepSession, options: RequestInit = {}) {
  const res = await fetch(endpoint + path, { ...options, headers: { apikey:publicKey, Authorization:"Bearer "+session.access_token, ...options.headers } });
  if (!res.ok) { const err = await res.text(); throw new Error("Cloud sync failed ("+res.status+"): "+err.slice(0,160)); }
  return res;
}
function fileRefs(project: KeepProject): string[] {
  return Array.from(new Set([
    ...project.memories.filter(m=>m.source==="upload").map(m=>m.id),
    ...project.interviewAnswers.map(a=>a.audioId).filter((v):v is string=>!!v),
    ...(project.finalVoiceRecording?.audioId ? [project.finalVoiceRecording.audioId] : [])
  ]));
}
function safeProject(project: KeepProject): KeepProject {
  return {
    ...project,
    memories: project.memories.map(m=>({...m,url:m.source==="text"?m.url:""})),
    interviewAnswers: project.interviewAnswers.map(a=>({...a,audioUrl:undefined})),
    finalVoiceRecording: project.finalVoiceRecording ? {...project.finalVoiceRecording,audioUrl:undefined}:null
  };
}
const uploadedThisSession = new Set<string>();
async function uploadBlob(session:KeepSession,id:string,blob:Blob) {
  const cacheKey=session.user.id+":"+id;
  if(uploadedThisSession.has(cacheKey)) return;
  const path = encodeURIComponent(session.user.id)+"/"+encodeURIComponent(id);
  await request("/storage/v1/object/keep-draft-media/"+path,session,{method:"POST",headers:{"Content-Type":blob.type||"application/octet-stream","x-upsert":"true"},body:blob});
  uploadedThisSession.add(cacheKey);
}
async function downloadBlob(session:KeepSession,id:string) {
  const path=encodeURIComponent(session.user.id)+"/"+encodeURIComponent(id);
  const res=await request("/storage/v1/object/authenticated/keep-draft-media/"+path,session);
  const blob=await res.blob();
  await putBlob(id,blob);
  uploadedThisSession.add(session.user.id+":"+id);
  return URL.createObjectURL(blob);
}
export async function saveCloudDraft(project:KeepProject,session:KeepSession):Promise<void> {
  if (!project.active) return;
  // Do not commit metadata pointing at files that failed to upload.
  for(const id of fileRefs(project)) {
    const blob=await getBlob(id);
    if (!blob) throw new Error("A recording or photo is missing from this device. Sync was not completed.");
    await uploadBlob(session,id,blob);
  }
  if (project.publicationId) {
    // Omit status, published_project and recipient_token: autosave never republishes.
    await request("/rest/v1/keeps?on_conflict=id", session, { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: project.publicationId, owner_id: session.user.id, recipient_name: project.recipientName || "someone special", occasion: project.occasion, draft_project: safeProject(project), updated_at: new Date().toISOString() }) });
  }
  const res=await request("/rest/v1/keep_drafts?on_conflict=owner_id",session,{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({owner_id:session.user.id,project:safeProject(project),updated_at:new Date().toISOString()})});
  await res.text();
}
export async function loadCloudDraft(session:KeepSession):Promise<KeepProject|null> {
  const res=await request("/rest/v1/keep_drafts?select=project&owner_id=eq."+encodeURIComponent(session.user.id)+"&limit=1",session);
  const rows=await res.json() as {project:Partial<KeepProject>}[];
  if (!rows.length) return null;
  return hydrateCloudProject(rows[0]!.project, session);
}
async function hydrateCloudProject(project: Partial<KeepProject>, session: KeepSession): Promise<KeepProject> {
  const p:KeepProject={...newProject(),...project};
  const memories=[];
  for(const m of p.memories) {
    if(m.source==="sample") { memories.push({...m,url:memoryImages[m.sampleIndex??0]??""}); continue; }
    if(m.source==="text") { memories.push(m); continue; }
    try { memories.push({...m,url:await downloadBlob(session,m.id)}); } catch { throw new Error("A saved photo or video could not be restored. Please try again."); }
  }
  const interviewAnswers=[];
  for(const a of p.interviewAnswers) interviewAnswers.push({...a,audioUrl:a.audioId ? await downloadBlob(session,a.audioId):undefined});
  const finalVoiceRecording=p.finalVoiceRecording?.audioId ? {...p.finalVoiceRecording,audioUrl:await downloadBlob(session,p.finalVoiceRecording.audioId)}:p.finalVoiceRecording;
  return {...p,memories,interviewAnswers,finalVoiceRecording};
}
export async function removeCloudDraft(session:KeepSession):Promise<void> {
  await request("/rest/v1/keep_drafts?owner_id=eq."+encodeURIComponent(session.user.id),session,{method:"DELETE"});
}

export async function loadKeepDisplayName(session: KeepSession): Promise<string> {
  const res = await request("/rest/v1/keep_profiles?select=display_name&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1", session);
  const rows = await res.json() as { display_name: string | null }[];
  return rows[0]?.display_name?.trim() || "";
}

/** Load exactly the selected creation using the owner's authenticated API access. */
export async function loadEditableKeep(id: string, session: KeepSession): Promise<KeepProject> {
  const owner = encodeURIComponent(session.user.id);
  const response = await request("/rest/v1/keeps?select=id,recipient_token,published_at,draft_project,published_project&id=eq." + encodeURIComponent(id) + "&owner_id=eq." + owner + "&limit=1", session);
  const rows = await response.json();
  const keep = rows[0];
  if (!keep) throw new Error("This Keep could not be found in your account.");
  // Preserve work from the previous single-draft editor when it belongs to this Keep.
  const latestResponse = await request("/rest/v1/keep_drafts?select=project&owner_id=eq." + owner + "&limit=1", session);
  const latest = (await latestResponse.json())[0]?.project;
  const draft = latest?.publicationId === id ? latest : keep.draft_project;
  if (draft) return { ...await hydrateCloudProject(draft, session), active: true, publicationId: id, publicationToken: keep.published_at ? keep.recipient_token : undefined };
  const published = keep.published_project;
  if (!published?.memories?.length || !published.voicePath) throw new Error("This Keep has no saved editing project yet.");
  const restore = async (path: string, blobId: string) => {
    if (!path.startsWith(session.user.id + "/publications/" + id + "/")) throw new Error("A saved media path does not belong to this Keep.");
    const file = await request("/storage/v1/object/authenticated/keep-media/" + path.split("/").map(encodeURIComponent).join("/"), session);
    const blob = await file.blob();
    await putBlob(blobId, blob);
    return URL.createObjectURL(blob);
  };
  const memories: KeepProject["memories"] = [];
  for (const memory of published.memories) {
    // Unique local IDs prevent an older published copy replacing another draft's media.
    const blobId = crypto.randomUUID();
    const { storagePath, ...settings } = memory;
    memories.push({ ...settings, id: blobId, source: "upload" as const, url: await restore(storagePath, blobId) });
  }
  const audioId = crypto.randomUUID();
  const audioUrl = await restore(published.voicePath, audioId);
  const { voicePath, voiceDuration, memories: oldMemories, ...settings } = published;
  const idMap = new Map(oldMemories.map((m: {id: string}, i: number) => [m.id, memories[i]!.id]));
  return { ...newProject(), ...settings, active: true, stage: "editor", publicationId: id, publicationToken: keep.recipient_token, memories, readMemoryOrder: (published.readMemoryOrder ?? []).map((oldId: string) => idMap.get(oldId)).filter(Boolean), finalVoiceRecording: { audioId, audioUrl, durationSec: voiceDuration ?? 0, demo: false } };
}
