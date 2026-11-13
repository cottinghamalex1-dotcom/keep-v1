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
    ...(project.finalVoiceRecording?.audioId ? [project.finalVoiceRecording.audioId] : []),
    ...(project.voiceParts ?? []).map(part => part.audioId)
  ]));
}
function safeProject(project: KeepProject): KeepProject {
  return {
    ...project,
    memories: project.memories.map(m=>({...m,url:m.source==="text"?m.url:""})),
    interviewAnswers: project.interviewAnswers.map(a=>({...a,audioUrl:undefined})),
    finalVoiceRecording: project.finalVoiceRecording ? {...project.finalVoiceRecording,audioUrl:undefined}:null,
    voiceParts: (project.voiceParts ?? []).map(({audioUrl:_url,...part})=>part)
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
/** Abort slow storage requests; no one image may keep the editor loading forever. */
async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("A media transfer timed out"));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function downloadBlob(session:KeepSession,id:string,budgetMs = 10000) {
  // Previously restored files should reopen instantly, even on slow cellular.
  let cached: Blob | null = null;
  try { cached = await withTimeout(() => getBlob(id), Math.min(2000, budgetMs)); } catch { /* IndexedDB unavailable */ }
  if (cached?.size) return URL.createObjectURL(cached);

  const path=encodeURIComponent(session.user.id)+"/"+encodeURIComponent(id);
  const blob = await withTimeout(async (signal) => {
    const res = await request("/storage/v1/object/authenticated/keep-draft-media/"+path,session,{signal});
    const file = await res.blob();
    if (!file.size) throw new Error("Empty media response");
    return file;
  }, Math.max(1500,budgetMs));
  // Never let a blocked IndexedDB transaction freeze the editor either.
  try { await withTimeout(() => putBlob(id,blob), 2500); } catch { /* usable in this session */ }
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
export async function loadCloudDraft(session:KeepSession,onProgress?: (progress: KeepRestoreProgress) => void):Promise<KeepProject|null> {
  const res=await request("/rest/v1/keep_drafts?select=project&owner_id=eq."+encodeURIComponent(session.user.id)+"&limit=1",session);
  const rows=await res.json() as {project:Partial<KeepProject>}[];
  if (!rows.length) return null;
  return hydrateCloudProject(rows[0]!.project, session, onProgress);
}
export type KeepRestoreProgress = { completed: number; total: number; kind: "media" };
async function hydrateCloudProject(project: Partial<KeepProject>, session: KeepSession, onProgress?: (progress: KeepRestoreProgress) => void): Promise<KeepProject> {
  const p:KeepProject={...newProject(),...project};
  type Need = { id: string; url: string | undefined };
  const needs: Need[] = [
    ...(p.finalVoiceRecording?.audioId ? [{ id: p.finalVoiceRecording.audioId, url: p.finalVoiceRecording.audioUrl }] : []),
    ...(p.voiceParts ?? []).map(part=>({id:part.audioId,url:part.audioUrl})), 
    ...p.memories.filter((m) => m.source === "upload").map((m) => ({id:m.id,url:m.url})),
    ...p.interviewAnswers.filter((a) => !!a.audioId).map((a) => ({id:a.audioId!,url:a.audioUrl})),
  ];
  const total = needs.length;
  const urls = new Map<string,string>();
  const missing = new Set<string>();
  let completed = 0;
  const progress = () => onProgress?.({completed,total,kind:"media"});
  for (const need of needs) {
    if (need.url?.startsWith("blob:")) {
      urls.set(need.id,need.url);
      completed++;
    }
  }
  progress();
  const remaining = [...new Set(needs.filter((need) => !urls.has(need.id)).map((need) => need.id))];
  let next = 0;
  // Hard overall restoration budget; any incomplete files remain safely in cloud
  // and can be retried from the editor without deleting or overwriting them.
  const deadline = Date.now() + 28000;
  const worker = async () => {
    while (next < remaining.length) {
      const id = remaining[next++]!;
      const left = deadline - Date.now();
      if (left < 1500) { missing.add(id); continue; }
      try {
        const url = await downloadBlob(session,id,Math.min(9500,left));
        urls.set(id,url);
        completed += 1;
        progress();
      } catch {
        // A second attempt helps with transient cellular drops, within budget.
        const retryBudget = Math.min(5500,deadline-Date.now());
        if (retryBudget >= 1800) {
          try {
            const url = await downloadBlob(session,id,retryBudget);
            urls.set(id,url);
            completed += 1;
            progress();
            continue;
          } catch { /* continue opening with available media */ }
        }
        missing.add(id);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5,remaining.length) }, () => worker()));
  const memories = p.memories.map((m) => {
    if (m.source === "sample") return {...m,url:memoryImages[m.sampleIndex??0]??""};
    if (m.source === "text") return m;
    return {...m,url:urls.get(m.id)??"",persisted:!!urls.get(m.id)};
  });
  const interviewAnswers = p.interviewAnswers.map((a) => ({...a,audioUrl:a.audioId ? urls.get(a.audioId) : a.audioUrl}));
  const finalVoiceRecording = p.finalVoiceRecording?.audioId
    ? {...p.finalVoiceRecording,audioUrl:urls.get(p.finalVoiceRecording.audioId)}
    : p.finalVoiceRecording;
  const voiceParts = (p.voiceParts ?? []).map(part=>({...part,audioUrl:urls.get(part.audioId)}));
  return {...p,memories,interviewAnswers,finalVoiceRecording,voiceParts,
    restoreIncomplete:missing.size>0,restoreMissingCount:missing.size};
}

/** Retry just the unfinished media without ever replacing text or recorded audio. */
export async function retryMissingCloudMedia(project: KeepProject, session: KeepSession, onProgress?: (progress: KeepRestoreProgress) => void): Promise<KeepProject> {
  return hydrateCloudProject(project,session,onProgress);
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
export async function loadEditableKeep(id: string, session: KeepSession, onProgress?: (progress: KeepRestoreProgress) => void): Promise<KeepProject> {
  const owner = encodeURIComponent(session.user.id);
  const response = await request("/rest/v1/keeps?select=id,recipient_token,published_at,draft_project,published_project&id=eq." + encodeURIComponent(id) + "&owner_id=eq." + owner + "&limit=1", session);
  const rows = await response.json();
  const keep = rows[0];
  if (!keep) throw new Error("This Keep could not be found in your account.");
  // Preserve work from the previous single-draft editor when it belongs to this Keep.
  const latestResponse = await request("/rest/v1/keep_drafts?select=project&owner_id=eq." + owner + "&limit=1", session);
  const latest = (await latestResponse.json())[0]?.project;
  const draft = latest?.publicationId === id ? latest : keep.draft_project;
  if (draft) return { ...await hydrateCloudProject(draft, session, onProgress), active: true, publicationId: id, publicationToken: keep.published_at ? keep.recipient_token : undefined };
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
  const total = published.memories.length + 1;
  let completed = 0;
  onProgress?.({completed,total,kind:"media"});
  for (const memory of published.memories) {
    // Unique local IDs prevent an older published copy replacing another draft's media.
    const blobId = crypto.randomUUID();
    const { storagePath, ...settings } = memory;
    memories.push({ ...settings, id: blobId, source: "upload" as const, url: await restore(storagePath, blobId) });
    completed += 1;
    onProgress?.({completed,total,kind:"media"});
  }
  const audioId = crypto.randomUUID();
  const audioUrl = await restore(published.voicePath, audioId);
  completed += 1;
  onProgress?.({completed,total,kind:"media"});
  const { voicePath, voiceDuration, memories: oldMemories, ...settings } = published;
  const idMap = new Map(oldMemories.map((m: {id: string}, i: number) => [m.id, memories[i]!.id]));
  return { ...newProject(), ...settings, active: true, stage: "editor", publicationId: id, publicationToken: keep.recipient_token, memories, readMemoryOrder: (published.readMemoryOrder ?? []).map((oldId: string) => idMap.get(oldId)).filter(Boolean), finalVoiceRecording: { audioId, audioUrl, durationSec: voiceDuration ?? 0, demo: false } };
}
