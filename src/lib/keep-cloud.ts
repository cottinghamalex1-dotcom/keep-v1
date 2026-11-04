import { getBlob, putBlob } from "./keep-media-store";
import { newProject, type KeepProject } from "./keep-project";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export const SESSION_KEY = "keep-app-session";
export type KeepSession = { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user: { id: string; email?: string } };
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
    memories: project.memories.map(m=>({...m,url:""})),
    interviewAnswers: project.interviewAnswers.map(a=>({...a,audioUrl:undefined})),
    finalVoiceRecording: project.finalVoiceRecording ? {...project.finalVoiceRecording,audioUrl:undefined}:null
  };
}
async function uploadBlob(session:KeepSession,id:string,blob:Blob) {
  const path = encodeURIComponent(session.user.id)+"/"+encodeURIComponent(id);
  await request("/storage/v1/object/keep-draft-media/"+path,session,{method:"POST",headers:{"Content-Type":blob.type||"application/octet-stream","x-upsert":"true"},body:blob});
}
async function downloadBlob(session:KeepSession,id:string) {
  const path=encodeURIComponent(session.user.id)+"/"+encodeURIComponent(id);
  const res=await request("/storage/v1/object/authenticated/keep-draft-media/"+path,session);
  const blob=await res.blob();
  await putBlob(id,blob);
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
  const res=await request("/rest/v1/keep_drafts?on_conflict=owner_id",session,{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({owner_id:session.user.id,project:safeProject(project),updated_at:new Date().toISOString()})});
  await res.text();
}
export async function loadCloudDraft(session:KeepSession):Promise<KeepProject|null> {
  const res=await request("/rest/v1/keep_drafts?select=project&owner_id=eq."+encodeURIComponent(session.user.id)+"&limit=1",session);
  const rows=await res.json() as {project:Partial<KeepProject>}[];
  if (!rows.length) return null;
  const p:KeepProject={...newProject(),...rows[0].project};
  const memories=[];
  for(const m of p.memories) {
    if(m.source==="sample") { memories.push(m); continue; }
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
