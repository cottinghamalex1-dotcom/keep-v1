import { activeKeepSession, type KeepSession } from "./keep-cloud";

const API_URL = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-remote-voices";
const API_KEY = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export type RemoteScriptPart = { index: number; text: string };
export type RemoteInviteStatus = {
  id: string; contributorId: string; contributorName: string;
  total: number; completed: number; expiresAt: string; emailSent: boolean;
  mediaCount: number; mediaEmailSent?: boolean;
};
export type RemoteRecording = {
  paragraphIndex: number; contributorId: string; textFingerprint: string;
  signedUrl: string; durationSec: number; mimeType: string;
};
export type RemoteInviteDetails = {
  creatorName: string; recipientName: string; occasion: string | null;
  contributorName: string; expiresAt: string; mediaCount: number;
  parts: (RemoteScriptPart & { completed: boolean })[];
};
type JsonResult = Record<string, unknown>;
async function callApi<T>(payload: JsonResult, session?: KeepSession): Promise<T> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      apikey: API_KEY, "Content-Type": "application/json",
      ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: JSON.stringify(payload),
    referrerPolicy: "no-referrer",
  });
  let data: Record<string, unknown>;
  try {data=await response.json() as Record<string, unknown>;} catch {throw new Error("Couldn't contact Keep. Check your connection and try again.");}
  if(!response.ok) throw new Error(typeof data["error"] === "string" ? data["error"] : "Keep couldn't complete that request. Please try again.");
  return data as T;
}
export async function callRemoteOwner<T>(payload: JsonResult): Promise<T> {
  const session = await activeKeepSession();
  if (!session) throw new Error("Sign in to Keep before sending recording invitations.");
  return callApi<T>(payload,session);
}
export async function createRemoteInvite(input: {
  keepId: string; contributorId: string; contributorName: string; creatorName: string;
  recipientName: string; occasion: string; parts: RemoteScriptPart[];
}) {
  return callRemoteOwner<{url: string; expiresAt: string} >({action:"owner-create",...input});
}
export const listRemoteInvites = (keepId:string) =>
  callRemoteOwner<{invites:RemoteInviteStatus[];notificationsEnabled?:boolean}>({action:"owner-list",keepId});
export const remoteOwnerDownload = (keepId:string) =>
  callRemoteOwner<{recordings:RemoteRecording[]}>({action:"owner-download",keepId});
export const revokeRemoteInvite = (keepId:string,inviteId:string) =>
  callRemoteOwner<{revoked:boolean}>({action:"owner-revoke",keepId,inviteId});

export type RemoteMediaItem = {
  id:string; contributorId:string; contributorName:string; kind:"image"|"video";
  name:string; mimeType:string; bytes:number; durationSec:number|null; signedUrl:string; uploadedAt:string;
};
export const listRemoteMedia = (keepId:string)=>
  callRemoteOwner<{media:RemoteMediaItem[]}>({action:"owner-media",keepId});

export async function uploadRemoteMedia(token:string,file:File,kind:"image"|"video",durationSec?:number):Promise<{saved:boolean;mediaId:string;count:number;emailSent:boolean}> {
  const max=kind==="video" ? 40*1024*1024 : 15*1024*1024;
  if(!file.size || file.size>max)throw new Error(kind==="video"?"Please use a video under 40 MB.":"Please use a photo under 15 MB.");
  const mimeType=file.type.toLowerCase().split(";")[0]||{
    jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",heic:"image/heic",heif:"image/heif",
    mp4:"video/mp4",mov:"video/quicktime",webm:"video/webm"
  }[file.name.split(".").pop()?.toLowerCase()??""]||"";
  const {signedUrl,path,mediaId}=await callApi<{signedUrl:string;path:string;mediaId:string}>({
    action:"prepare-media",token,kind,fileName:file.name,mimeType,size:file.size,durationSec,
  });
  const url=new URL(signedUrl,"https://lwkzhpwugtosbidxvdcr.supabase.co");
  const uploaded=await fetch(url.toString(),{
    method:"PUT",headers:{"Content-Type":mimeType,"x-upsert":"false"},
    body:file,referrerPolicy:"no-referrer"
  });
  if(!uploaded.ok)throw new Error("Your photo or video didn't finish uploading. Please retry.");
  return callApi<{saved:boolean;mediaId:string;count:number;emailSent:boolean}>({
    action:"complete-media",token,mediaId,path
  });
}

export const resolveRemoteInvitation = (token:string) =>
  callApi<RemoteInviteDetails>({action:"resolve",token});
export async function uploadRemoteRecording(
  token:string,partIndex:number,blob:Blob,durationSec:number
):Promise<{saved:boolean;allFinished:boolean;emailSent:boolean}> {
  if(!blob.size || blob.size>20*1024*1024) throw new Error("Audio must be smaller than 20 MB.");
  const mimeType=blob.type.split(";")[0] || "application/octet-stream";
  const {signedUrl,path}=await callApi<{signedUrl:string;path:string}>({
    action:"prepare-upload",token,paragraphIndex:partIndex,size:blob.size,mimeType,
  });
  // A limited-time signed URL uploads directly to private Storage; neither a
  // Keep login nor an exposed service-role key is required from the contributor.
  const url=new URL(signedUrl,"https://lwkzhpwugtosbidxvdcr.supabase.co");
  const uploaded=await fetch(url.toString(),{
    method:"PUT",
    headers:{"Content-Type":mimeType, "x-upsert":"false"},
    body:blob,
    referrerPolicy:"no-referrer",
  });
  if(!uploaded.ok) throw new Error("The audio couldn't finish uploading. Please check your connection and try again.");
  return callApi<{saved:boolean;allFinished:boolean;emailSent:boolean}>({
    action:"complete-upload",token,paragraphIndex:partIndex,path,durationSec,
  });
}

/** Validate length using the file itself rather than asking the guest to guess. */
export async function getRemoteFileDuration(blob:Blob):Promise<number> {
  const url=URL.createObjectURL(blob);
  try {
    return await new Promise<number>((resolve,reject)=>{
      const audio=document.createElement("audio");
      audio.preload="metadata";
      const timer=window.setTimeout(()=>{audio.removeAttribute("src");reject(new Error("Couldn't read the length of this audio file. Try recording directly in Keep."));},14000);
      audio.onloadedmetadata=()=>{
        window.clearTimeout(timer);
        const duration=audio.duration;
        audio.removeAttribute("src");
        if(Number.isFinite(duration)&&duration>0.25&&duration<=600) resolve(duration);
        else reject(new Error("Use an audio recording between one second and ten minutes."));
      };
      audio.onerror=()=>{window.clearTimeout(timer);reject(new Error("This audio file couldn't be read. Try M4A, MP3 or WAV."));};
      audio.src=url;
    });
  } finally {URL.revokeObjectURL(url);}
}
