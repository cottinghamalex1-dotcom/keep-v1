import { activeKeepSession, type KeepSession } from './keep-cloud';
import { getBlob } from './keep-media-store';
import type { KeepProject, MediaItem } from './keep-project';

const endpoint = 'https://lwkzhpwugtosbidxvdcr.supabase.co';
const publicKey = 'sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi';
export const viewingLink = (token: string) => `https://keep-v1.vercel.app/recipient?keep=${encodeURIComponent(token)}`;
export type PublishedProject = Pick<KeepProject, 'recipientName' | 'openingMessage' | 'engraveOpeningMessage' | 'occasion' | 'messageParagraphs' | 'readMemoryOrder' | 'musicMood' | 'voiceMusicBalance' | 'voiceVolume' | 'musicVolume' | 'audioMix' | 'captionStyle' | 'captionPosition' | 'captionLines' | 'captionCues' | 'visualStyle' | 'cardEngraving' | 'voiceMode' | 'contributors' | 'paragraphSpeakers'> & {
  memories: MediaItem[]; voiceUrl?: string; voiceDuration: number;
};
export async function publicationRequest(body: unknown, session?: KeepSession | null) {
  const res = await fetch(endpoint + '/functions/v1/keep-publish', {
    method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session.access_token } : {}) }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Your Keep could not be loaded. Please try again.');
  return data;
}
export function publicationSettings(p: KeepProject) {
  return { voiceMode: p.voiceMode ?? "solo", contributors: p.contributors ?? [], paragraphSpeakers: p.paragraphSpeakers ?? [], recipientName: p.recipientName, openingMessage: (p.openingMessage ?? '').trim().slice(0, 160), engraveOpeningMessage: !!p.engraveOpeningMessage && !!p.openingMessage?.trim(), occasion: p.occasion, messageParagraphs: p.messageParagraphs, readMemoryOrder: p.readMemoryOrder,
    musicMood: p.musicMood, voiceMusicBalance: p.voiceMusicBalance, voiceVolume: p.voiceVolume ?? 60, musicVolume: p.musicVolume ?? 60,
    audioMix: p.audioMix, captionStyle: p.captionStyle, captionPosition: p.captionPosition, captionLines: p.captionLines,
    captionCues: p.captionCues, visualStyle: p.visualStyle, cardEngraving: p.cardEngraving, voiceDuration: p.finalVoiceRecording?.durationSec ?? 0 };
}
export async function publishKeep(p: KeepProject, keepId: string, progress: (message: string) => void): Promise<{keepId: string; token: string}> {
  const session = await activeKeepSession();
  if (!session) throw new Error('Sign in to your Keep account below, then return to publish. Your draft stays saved on this phone.');
  if (!p.finalVoiceRecording?.audioId || p.finalVoiceRecording.demo) throw new Error('Record your voice before publishing your Keep.');
  if (!p.messageParagraphs.some(x => x.trim())) throw new Error('Add your message before publishing.');
  if (!p.memories.length) throw new Error('Create your story before publishing.');
  const prefix = `${session.user.id}/publications/${keepId}/${crypto.randomUUID()}`;
  let done = 0;
  async function upload(blob: Blob, name: string) {
    const path = `${prefix}/${name}`;
    const res = await fetch(endpoint + '/storage/v1/object/keep-media/' + path, {method:'POST',headers:{apikey:publicKey,Authorization:'Bearer '+session!.access_token,'Content-Type':blob.type || 'application/octet-stream'},body:blob});
    if (!res.ok) throw new Error('A file could not upload. Keep this page open and try publishing again. Your existing link has not changed.');
    progress(`Saving memories ${++done} of ${p.memories.length + 1}…`);
    return path;
  }
  const memories = [];
  for (const m of p.memories) {
    let blob: Blob | undefined;
    if (m.source === 'upload') blob = (await getBlob(m.blobId??m.id)) ?? undefined;
    else { const response = await fetch(m.url); if (response.ok) blob = await response.blob(); }
    if (!blob) throw new Error('A photo or video is missing. Reopen your saved draft or add that memory again.');
    memories.push({id:m.id,kind:m.kind,source:m.source,storagePath:await upload(blob, `memory-${memories.length}`),displayDurationSec:m.displayDurationSec,videoStartSec:m.videoStartSec,videoDurationSec:m.videoDurationSec,isSelfie:m.isSelfie,selfieRole:m.selfieRole,focusX:m.focusX,focusY:m.focusY,zoom:m.zoom,motion:m.motion,transition:m.transition});
  }
  const voice = await getBlob(p.finalVoiceRecording.audioId);
  if (!voice) throw new Error('Your voice recording is missing from this phone. Reopen your saved draft or record it again.');
  const voicePath = await upload(voice, 'voice');
  progress('Creating your permanent link…');
  return publicationRequest({action:'publish',keepId,project:{...publicationSettings(p),memories,voicePath}}, session);
}
