import { activeKeepSession, type KeepSession } from './keep-cloud';
import { getBlob, putBlob } from './keep-media-store';
import { keepOptimizedPhotoId, optimizeKeepPhoto, shouldOptimizeKeepPhoto } from './keep-photo-optimization';
import type { KeepProject, MediaItem } from './keep-project';

const endpoint = 'https://lwkzhpwugtosbidxvdcr.supabase.co';
const publicKey = 'sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi';
export const viewingLink = (token: string) => `https://keep-v1.vercel.app/recipient?keep=${encodeURIComponent(token)}`;
export type PublishedProject = Pick<KeepProject, 'recipientName' | 'openingMessage' | 'closingLine' | 'engraveOpeningMessage' | 'occasion' | 'messageParagraphs' | 'readMemoryOrder' | 'musicMood' | 'voiceMusicBalance' | 'voiceVolume' | 'musicVolume' | 'audioMix' | 'captionStyle' | 'captionPosition' | 'captionLines' | 'captionCues' | 'visualStyle' | 'cardEngraving' | 'voiceMode' | 'contributors' | 'paragraphSpeakers'> & {
  memories: MediaItem[]; voiceUrl?: string; renderedVideoUrl?: string; voiceDuration: number;
};
async function boundedFetch(url: string, init: RequestInit, timeoutMs = 120_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, {...init, signal:controller.signal}); }
  catch { throw new Error("The connection was interrupted while saving your Keep. Your draft remains available; check your connection and retry."); }
  finally { clearTimeout(timeout); }
}
export async function publicationRequest(body: unknown, session?: KeepSession | null) {
  const res = await boundedFetch(endpoint + '/functions/v1/keep-publish', {
    method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}) }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Your Keep could not be loaded. Please try again.');
  return data;
}
export function publicationSettings(p: KeepProject) {
  return { voiceMode: p.voiceMode ?? "solo", contributors: p.contributors ?? [], paragraphSpeakers: p.paragraphSpeakers ?? [], recipientName: p.recipientName, openingMessage: (p.openingMessage ?? '').trim().slice(0, 160), closingLine: (p.closingLine ?? '').trim().slice(0, 90), engraveOpeningMessage: !!p.engraveOpeningMessage && !!p.openingMessage?.trim(), occasion: p.occasion, messageParagraphs: p.messageParagraphs, readMemoryOrder: p.readMemoryOrder,
    musicMood: p.musicMood, voiceMusicBalance: p.voiceMusicBalance, voiceVolume: p.voiceVolume ?? 60, musicVolume: p.musicVolume ?? 60,
    audioMix: p.audioMix, captionStyle: p.captionStyle, captionPosition: p.captionPosition, captionLines: p.captionLines,
    captionCues: p.captionCues, visualStyle: p.visualStyle, cardEngraving: p.cardEngraving, voiceDuration: p.finalVoiceRecording?.durationSec ?? 0 };
}
// Hash only saved source identities and the authored film settings, not temporary
// URLs, timestamps, or private interview answers. A no-op Done must not replace
// a finished render with another revision just because upload paths changed.
function sceneSettings(m: MediaItem) {
  return {id:m.id,kind:m.kind,source:m.source,displayDurationSec:m.displayDurationSec,videoStartSec:m.videoStartSec,videoDurationSec:m.videoDurationSec,isSelfie:m.isSelfie,selfieRole:m.selfieRole,focusX:m.focusX,focusY:m.focusY,zoom:m.zoom,motion:m.motion,transition:m.transition};
}
export async function publicationFingerprint(p: KeepProject): Promise<string | undefined> {
  if (!crypto.subtle) return undefined;
  const snapshot = {
    version: 1, settings: publicationSettings(p), audioId: p.finalVoiceRecording?.audioId,
    scenes: p.memories.map(m => ({...sceneSettings(m), sourceIdentity: m.source === "upload" ? m.blobId ?? m.id : m.url || m.sampleIndex})),
  };
  // Stable across JSON key reordering by the database and restoration.
  const canonical = JSON.stringify(snapshot, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key,value[key]])) : value);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,"0")).join("");
}
export async function publishKeep(p: KeepProject, keepId: string, progress: (message: string) => void): Promise<{keepId: string; token: string; unchanged?: boolean}> {
  const session = await activeKeepSession();
  if (!session) throw new Error('Sign in to your Keep account below, then return to publish. Your draft stays saved on this phone.');
  if (p.draftOwnerId && p.draftOwnerId !== session.user.id) throw new Error("Sign in to the account that owns this Keep.");
  if (p.restoreIncomplete) throw new Error("Restore the missing media before publishing.");
  if (!p.finalVoiceRecording?.audioId || p.finalVoiceRecording.demo) throw new Error('Record your voice before publishing your Keep.');
  if (!p.messageParagraphs.some(x => x.trim())) throw new Error('Add your message before publishing.');
  if (!p.memories.length) throw new Error('Create your story before publishing.');
  const sourceFingerprint = await publicationFingerprint(p);
  if (sourceFingerprint && p.publicationToken) {
    progress("Checking your saved film…");
    const response = await boundedFetch(endpoint + "/rest/v1/keeps?select=id,recipient_token,published_project,published_at&id=eq." + encodeURIComponent(keepId) + "&owner_id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {
      headers: {apikey:publicKey, Authorization:"Bearer "+session.access_token},
    });
    if (!response.ok) throw new Error("Couldn't check your existing Keep. No published film was changed. Please retry.");
    const [existing] = await response.json();
    if (existing?.published_at && existing.published_project?.sourceFingerprint === sourceFingerprint && existing.recipient_token)
      return {keepId:existing.id, token:existing.recipient_token, unchanged:true};
  }
  const prefix = `${session.user.id}/publications/${keepId}/${crypto.randomUUID()}`;
  let done = 0;
  const total = new Set(p.memories.map(m => m.source === "upload" ? m.blobId ?? m.id : m.id)).size + 1;
  async function upload(blob: Blob, name: string) {
    const path = `${prefix}/${name}`;
    const res = await boundedFetch(endpoint + '/storage/v1/object/keep-media/' + path, {method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+session!.access_token,'Content-Type':blob.type || 'application/octet-stream'},body:blob});
    if (!res.ok) throw new Error('A file could not upload. Keep this page open and try publishing again. Your existing link has not changed.');
    progress(`Saving memories ${++done} of ${total}…`);
    return path;
  }
  const memories = [];
  const uploadedSourcePaths=new Map<string,string>();
  for (const m of p.memories) {
    // A selfie used for both opening and closing must upload just once. Both
    // authored scenes safely reference that same private storage object.
    const sourceKey=m.source==='upload'?(m.blobId??m.id):m.id;
    let storagePath=uploadedSourcePaths.get(sourceKey);
    if(!storagePath){
      let blob:Blob|undefined;
      if(m.source==='upload')blob=(await getBlob(sourceKey))??undefined;
      else{const response=await fetch(m.url);if(response.ok)blob=await response.blob();}
      if(!blob)throw new Error('A photo or video is missing. Reopen your saved draft or add that memory again.');
      if (m.kind === "image" && m.source === "upload") {
        // Preserve the full-quality source in the owner's local/cloud draft.
        // Send only a separately verified, quality-checked rendering to the
        // recipient. Older drafts without an optimized copy are handled here.
        const sourceId = m.blobId ?? m.id;
        const zoomed = typeof m.zoom === "number" && m.zoom > 1.45;
        let optimized = zoomed ? null : await getBlob(keepOptimizedPhotoId(sourceId));
        if (!optimized && shouldOptimizeKeepPhoto({ size: blob.size, type: blob.type, name: m.name })) {
          progress(`Preparing photo ${memories.length + 1} of ${p.memories.length} for smooth playback…`);
          optimized = await optimizeKeepPhoto(blob, { zoom: m.zoom, name: m.name });
          if (optimized && !zoomed) void putBlob(keepOptimizedPhotoId(sourceId), optimized);
        }
        if (optimized && optimized.size > 0 && optimized.size < blob.size) blob = optimized;
      } else if (m.kind === "image" && shouldOptimizeKeepPhoto({ size: blob.size, type: blob.type })) {
        // Optimize bundled stills too; video and animated GIFs are untouched.
        const optimized = await optimizeKeepPhoto(blob);
        if (optimized && optimized.size < blob.size) blob = optimized;
      }
      storagePath=await upload(blob,`memory-${memories.length}`);
      uploadedSourcePaths.set(sourceKey,storagePath);
    }
    memories.push({...sceneSettings(m),storagePath});
  }
  const voice = await getBlob(p.finalVoiceRecording.audioId);
  if (!voice) throw new Error('Your voice recording is missing from this phone. Reopen your saved draft or record it again.');
  const voicePath = await upload(voice, 'voice');
  progress('Creating your permanent link…');
  return publicationRequest({action:'publish',keepId,project:{...publicationSettings(p),sourceFingerprint,memories,voicePath}}, session);
}
