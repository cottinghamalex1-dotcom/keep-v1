import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const endpoint = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(endpoint, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUCKET = "keep-draft-media";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const answer = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { ...cors, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
const error = (message: string, status = 400) => answer({ error: message }, status);
const small = (value: unknown, max = 100) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validUuid = (id: string) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
const tokenFormat = (token: string) => /^[a-f0-9]{64}$/.test(token);
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2,"0")).join("");
const tokenHash = async (token: string) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))),
  (v) => v.toString(16).padStart(2,"0")).join("");
type Part = { index: number; text: string };
type Invite = {
  id: string; keep_id: string; owner_id: string; contributor_id: string; contributor_name: string;
  creator_name: string; recipient_name: string; occasion: string | null;
  script_parts: Part[]; token_hash: string; pending_uploads: Record<string,{path:string;mime:string;createdAt:number}>;
  upload_attempts: number; expires_at: string; email_sent_at: string | null;
  pending_media?: Record<string,{path:string;mime:string;kind:"image"|"video";name:string;size:number;duration:number|null;createdAt:number}>;
  media_upload_attempts?: number; media_email_sent_at?:string|null;
};
type StoredPart = { invite_id: string; paragraph_index: number; text_fingerprint: string;
  file_path: string; content_type: string; size_bytes: number; duration_seconds: number };
type StoredMedia = {
  id:string; invite_id:string; kind:"image"|"video"; file_path:string; original_name:string;
  content_type:string; size_bytes:number; duration_seconds:number|null; uploaded_at:string;
};
async function mediaFor(ids:string[]):Promise<StoredMedia[]> {
  if(!ids.length)return [];
  const {data,error:dbError}=await admin.from("keep_remote_media").select("*").in("invite_id",ids).order("uploaded_at",{ascending:true});
  if(dbError)throw dbError;
  return (data??[]) as StoredMedia[];
}
const mediaTypes: Record<string,{kind:"image"|"video";ext:string}> = {
  "image/jpeg":{kind:"image",ext:"jpg"}, "image/png":{kind:"image",ext:"png"},
  "image/webp":{kind:"image",ext:"webp"}, "image/heic":{kind:"image",ext:"heic"},
  "image/heif":{kind:"image",ext:"heif"},
  "video/mp4":{kind:"video",ext:"mp4"}, "video/quicktime":{kind:"video",ext:"mov"},
  "video/webm":{kind:"video",ext:"webm"}
};
function scriptPart(invite: Invite, index: number) {
  return (invite.script_parts ?? []).find(p=>p.index===index && typeof p.text==="string" && p.text.trim());
}
const completedIndices = (invite: Invite, recordings: StoredPart[]) =>
  invite.script_parts.filter(part=>recordings.some(row=>
    row.invite_id===invite.id && row.paragraph_index===part.index && row.text_fingerprint===part.text.trim()
  )).map(part=>part.index);
async function ownerUser(req: Request) {
  const bearer=req.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ")) return null;
  const client = createClient(endpoint,publishable,{ global:{headers:{Authorization:bearer}}, auth:{persistSession:false} });
  const { data: {user}, error: authError }=await client.auth.getUser(bearer.slice(7));
  return authError ? null : user;
}
async function ownedKeep(keepId: string, ownerId: string) {
  if (!validUuid(keepId)) return null;
  const {data}=await admin.from("keeps").select("id,owner_id,draft_project").eq("id",keepId).eq("owner_id",ownerId).maybeSingle();
  return data;
}
async function loadInvite(token: string): Promise<Invite | null> {
  if (!tokenFormat(token)) return null;
  const {data}=await admin.from("keep_remote_invites").select("*").eq("token_hash",await tokenHash(token)).maybeSingle();
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data as Invite;
}
async function recordingsFor(ids: string[]): Promise<StoredPart[]> {
  if (!ids.length) return [];
  const {data,error:databaseError}=await admin.from("keep_remote_recordings").select("*").in("invite_id",ids);
  if(databaseError) throw databaseError;
  return (data??[]) as StoredPart[];
}
async function notifyOwner(invite: Invite, type:"voice"|"media"="voice") {
  if (type==="voice" ? invite.email_sent_at : invite.media_email_sent_at) return false;
  const key=Deno.env.get("RESEND_API_KEY");
  const from=Deno.env.get("KEEP_EMAIL_FROM");
  if (!key || !from) return false;
  const {data:{user}}=await admin.auth.admin.getUserById(invite.owner_id);
  if (!user?.email) return false;
  const subject=type==="media"
    ? `${invite.contributor_name} shared photos or videos for ${invite.recipient_name} · Keep`
    : `${invite.contributor_name} finished recording for ${invite.recipient_name} · Keep`;
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,to:[user.email],subject,
      text:type==="media"
        ? `${invite.contributor_name} sent moments for your Keep for ${invite.recipient_name}.\n\nOpen your creation and choose the remote contributions area to review and add the photos or videos: https://keep-v1.vercel.app/my-keeps\n\nSome things are worth keeping.`
        : `${invite.contributor_name} has finished their voice recording for your Keep for ${invite.recipient_name}.\n\nOpen Keep, choose your creation, and collect the recording: https://keep-v1.vercel.app/my-keeps\n\nSome things are worth keeping.`
    })
  });
  if(!response.ok) {
    console.error("Keep remote notification failed",response.status);
    return false;
  }
  const col=type==="voice"?"email_sent_at":"media_email_sent_at";
  await admin.from("keep_remote_invites").update({[col]:new Date().toISOString()}).eq("id",invite.id).is(col,null);
  return true;
}

Deno.serve(async req => {
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(req.method!=="POST") return error("Method not allowed",405);
  try {
    const body=await req.json();
    const action=small(body.action,40);
    if(["owner-create","owner-list","owner-download","owner-media","owner-revoke"].includes(action)) {
      const user=await ownerUser(req);
      if(!user) return error("Sign in to Keep before inviting someone.",401);
      const keepId=small(body.keepId,80);
      const keep=await ownedKeep(keepId,user.id);
      if(!keep) return error("This Keep could not be found in your account.",404);

      if(action==="owner-create") {
        const contributorId=small(body.contributorId,120);
        const contributorName=small(body.contributorName,60);
        const creatorName=small(body.creatorName,60)||"Someone special";
        const recipientName=small(body.recipientName,80)||"someone special";
        const occasion=small(body.occasion,80);
        const incoming=Array.isArray(body.parts)?body.parts:[];
        if(!contributorId || !contributorName || !incoming.length || incoming.length>16) return error("Choose the person's name and their script before inviting.");
        const parts:Part[]=incoming.map((p:unknown)=>({index:Number((p as Part)?.index),text:small((p as Part)?.text,6500)}));
        if(parts.some(p=>!Number.isInteger(p.index)||p.index<0||p.index>99||!p.text) || new Set(parts.map(p=>p.index)).size!==parts.length || parts.reduce((n,p)=>n+p.text.length,0)>25000) return error("The script needs valid, nonempty speaking parts.");
        // Owner cannot grant a contributor lines not in their own saved draft.
        const draft=keep.draft_project as {contributors?:{id:string;name:string}[];messageParagraphs?:string[];paragraphSpeakers?:string[]} | null;
        if(!draft?.contributors?.some(c=>c.id===contributorId && c.name.trim()===contributorName) ||
           parts.some(p=>draft.messageParagraphs?.[p.index]?.trim()!==p.text ||
           (draft.paragraphSpeakers?.[p.index] ?? draft.contributors?.[p.index%draft.contributors.length]?.id)!==contributorId)) {
          return error("The contributor or words have changed. Save your Keep and try again.",409);
        }
        const token=randomToken();
        const hash=await tokenHash(token);
        const {data:existing}=await admin.from("keep_remote_invites").select("id,script_parts").eq("keep_id",keepId).eq("contributor_id",contributorId).maybeSingle();
        const scriptChanged=!!existing && JSON.stringify(existing.script_parts)!==JSON.stringify(parts);
        const inviteValues={
          ...(existing?.id?{id:existing.id}:{}), keep_id:keepId,owner_id:user.id,contributor_id:contributorId,
          contributor_name:contributorName,creator_name:creatorName,recipient_name:recipientName,occasion,
          script_parts:parts,token_hash:hash,pending_uploads:{},upload_attempts:0,
          expires_at:new Date(Date.now()+30*86400*1000).toISOString(),
          updated_at:new Date().toISOString(),
          ...(scriptChanged?{email_sent_at:null}:{})
        };
        const {data:invite,error:saveError}=await admin.from("keep_remote_invites").upsert(inviteValues,{onConflict:"keep_id,contributor_id"}).select("id").single();
        if(saveError||!invite) return error("Couldn't prepare that private invitation. Please retry.",500);
        if(scriptChanged) {
          const {error:clearError}=await admin.from("keep_remote_recordings").delete().eq("invite_id",invite.id);
          if(clearError) return error("The old script could not be retired. Try again.",500);
        }
        return answer({url:`https://keep-v1.vercel.app/contribute?invite=${token}`,contributorName,expiresAt:inviteValues.expires_at});
      }

      if(action==="owner-revoke") {
        const inviteId=small(body.inviteId,80);
        if(!validUuid(inviteId)) return error("Invalid invitation.");
        const {data:invite}=await admin.from("keep_remote_invites").select("id").eq("id",inviteId).eq("owner_id",user.id).eq("keep_id",keepId).maybeSingle();
        if(!invite) return error("Invitation not found.",404);
        await admin.from("keep_remote_invites").delete().eq("id",invite.id).eq("owner_id",user.id);
        return answer({revoked:true});
      }

      const {data:invites,error:listError}=await admin.from("keep_remote_invites").select("*").eq("owner_id",user.id).eq("keep_id",keepId).order("created_at");
      if(listError) return error("Invitations could not be loaded.",500);
      const rows=(invites??[]) as Invite[];
      const recs=await recordingsFor(rows.map(row=>row.id));
      const media=await mediaFor(rows.map(row=>row.id));
      if(action==="owner-list") return answer({notificationsEnabled:!!(Deno.env.get("RESEND_API_KEY") && Deno.env.get("KEEP_EMAIL_FROM")),invites:rows.map(invite=>({
        id:invite.id,contributorId:invite.contributor_id,contributorName:invite.contributor_name,
        total:invite.script_parts.length,completed:completedIndices(invite,recs).length,
        expiresAt:invite.expires_at,emailSent:!!invite.email_sent_at,
        mediaCount:media.filter(item=>item.invite_id===invite.id).length,mediaEmailSent:!!invite.media_email_sent_at
      }))});
      if(action==="owner-media"){
        const items:unknown[]=[];
        for(const invite of rows){
          for(const row of media.filter(item=>item.invite_id===invite.id)){
            if(!row.file_path.startsWith(user.id+"/remote/"+invite.id+"/moments/"))continue;
            const {data:signed,error:signError}=await admin.storage.from(BUCKET).createSignedUrl(row.file_path,900);
            if(signError||!signed?.signedUrl)return error("Couldn't retrieve contributed media. Try again.",500);
            items.push({
              id:row.id,contributorId:invite.contributor_id,contributorName:invite.contributor_name,
              name:row.original_name,kind:row.kind,mimeType:row.content_type,bytes:row.size_bytes,
              durationSec:row.duration_seconds,signedUrl:signed.signedUrl,uploadedAt:row.uploaded_at
            });
          }
        }
        return answer({media:items});
      }
      if(action==="owner-download") {
        const items:unknown[]=[];
        for(const invite of rows) {
          const complete=completedIndices(invite,recs);
          for(const row of recs.filter(row=>row.invite_id===invite.id && complete.includes(row.paragraph_index))) {
            if(!row.file_path.startsWith(user.id+"/remote/"+invite.id+"/")) continue;
            const {data:signed,error:signError}=await admin.storage.from(BUCKET).createSignedUrl(row.file_path,900);
            if(signError||!signed?.signedUrl) return error("Unable to retrieve one recording. Try again.",500);
            items.push({
              paragraphIndex:row.paragraph_index,contributorId:invite.contributor_id,textFingerprint:row.text_fingerprint,
              signedUrl:signed.signedUrl,durationSec:row.duration_seconds,mimeType:row.content_type
            });
          }
        }
        return answer({recordings:items});
      }
    }

    const token=small(body.token,100);
    const invite=await loadInvite(token);
    if(!invite) return error("This private invitation has expired or is no longer available.",404);
    const recordings=await recordingsFor([invite.id]);
    const complete=completedIndices(invite,recordings);
    const guestMedia=await mediaFor([invite.id]);
    if(action==="resolve") {
      return answer({
        creatorName:invite.creator_name,recipientName:invite.recipient_name,
        occasion:invite.occasion,contributorName:invite.contributor_name,
        expiresAt:invite.expires_at,mediaCount:guestMedia.length,
        parts:invite.script_parts.map(part=>({...part,completed:complete.includes(part.index)}))
      });
    }
    if(action==="prepare-media"){
      const mime=small(body.mimeType,80).toLowerCase().split(";")[0];
      const format=mediaTypes[mime];
      const size=Number(body.size);
      const kind=small(body.kind,8);
      const name=small(body.fileName,110).replace(/[\\/\\\\<>\\u0000-\\u001f]/g,"_")||"Shared moment";
      const duration=kind==="video"?Number(body.durationSec):null;
      if(!format||format.kind!==kind)return error("Please choose a supported photo or short video.",415);
      if(!Number.isFinite(size)||size<100||size>(kind==="video"?41943040:15728640))
        return error(kind==="video"?"Please share a video under 40 MB.":"Please share a photo under 15 MB.");
      if(kind==="video"&&(!Number.isFinite(duration)||duration!>90.5||duration!<=0))
        return error("Please trim videos to 90 seconds or less. Around 10 seconds is best.");
      if((invite.media_upload_attempts??0)>=60)return error("This link reached its upload limit. Ask for a fresh invitation.",429);
      if(guestMedia.length>=25)return error("You've shared 25 moments. The creator can add more from their own phone.");
      const mediaId=crypto.randomUUID();
      const filePath=`${invite.owner_id}/remote/${invite.id}/moments/${mediaId}.${format.ext}`;
      const {data:signed,error:signError}=await admin.storage.from(BUCKET).createSignedUploadUrl(filePath);
      if(signError||!signed?.signedUrl)return error("Couldn't prepare this photo or video. Try again.",500);
      const pending={...(invite.pending_media??{}),[mediaId]:{path:filePath,mime,kind:format.kind,name,size,duration,createdAt:Date.now()}};
      const {error:updateError}=await admin.from("keep_remote_invites").update({pending_media:pending,media_upload_attempts:(invite.media_upload_attempts??0)+1}).eq("id",invite.id);
      if(updateError)return error("Couldn't reserve the upload. Please retry.",500);
      return answer({signedUrl:signed.signedUrl,mediaId,path:filePath});
    }
    if(action==="complete-media"){
      const mediaId=small(body.mediaId,45);
      const pending=invite.pending_media?.[mediaId];
      if(!validUuid(mediaId)||!pending||pending.path!==body.path||Date.now()-pending.createdAt>7200000)
        return error("This upload has expired. Select the file again.",409);
      const filename=pending.path.split("/").at(-1)!;
      const folder=pending.path.slice(0,-filename.length-1);
      const {data:objects,error:storageError}=await admin.storage.from(BUCKET).list(folder,{limit:30,search:filename});
      const uploaded=objects?.find(item=>item.name===filename);
      const actualSize=Number(uploaded?.metadata?.size??0);
      if(storageError||!uploaded||actualSize<100||actualSize>pending.size+1024||actualSize>(pending.kind==="video"?41943040:15728640))
        return error("The uploaded photo or video could not be verified. Try again.",409);
      const {error:writeError}=await admin.from("keep_remote_media").insert({
        id:mediaId,invite_id:invite.id,kind:pending.kind,file_path:pending.path,
        original_name:pending.name,content_type:pending.mime,size_bytes:actualSize,
        duration_seconds:pending.duration,uploaded_at:new Date().toISOString()
      });
      if(writeError)return error("Couldn't save this moment. Please retry.",500);
      const updated={...(invite.pending_media??{})};delete updated[mediaId];
      await admin.from("keep_remote_invites").update({pending_media:updated}).eq("id",invite.id);
      let emailSent=false;
      try{emailSent=await notifyOwner(invite,"media");}catch(problem){console.error("Keep media notification failed",problem);}
      return answer({saved:true,mediaId,count:guestMedia.length+1,emailSent});
    }
    if(action==="prepare-upload") {
      const index=Number(body.paragraphIndex);
      const part=scriptPart(invite,index);
      const size=Number(body.size);
      const mime=small(body.mimeType,100).toLowerCase().split(";")[0];
      if(!part) return error("This speaking part is not on your invitation.",403);
      if(!Number.isFinite(size)||size<100||size>20971520) return error("Choose an audio file under 20 MB.");
      if(!["audio/mp4","audio/x-m4a","audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/webm","audio/ogg","audio/aac","application/octet-stream"].includes(mime))
        return error("Choose an audio recording in M4A, MP3, WAV, OGG or WebM format.");
      if(invite.upload_attempts>=40) return error("This link has reached its upload limit. Ask the creator for a new link.",429);
      const extension=mime.includes("webm")?"webm":mime.includes("ogg")?"ogg":mime.includes("wav")?"wav":mime.includes("mpeg")||mime.includes("mp3")?"mp3":"m4a";
      const filePath=`${invite.owner_id}/remote/${invite.id}/${crypto.randomUUID()}.${extension}`;
      const {data:signed,error:signError}=await admin.storage.from(BUCKET).createSignedUploadUrl(filePath);
      if(signError||!signed?.signedUrl) return error("Couldn't prepare your private upload. Please retry.",500);
      const pending={...(invite.pending_uploads??{}),[String(index)]:{path:filePath,mime,createdAt:Date.now()}};
      const {error:updateError}=await admin.from("keep_remote_invites").update({pending_uploads:pending,upload_attempts:invite.upload_attempts+1}).eq("id",invite.id);
      if(updateError) return error("Couldn't reserve upload. Please retry.",500);
      return answer({signedUrl:signed.signedUrl,path:filePath});
    }
    if(action==="complete-upload") {
      const index=Number(body.paragraphIndex);
      const expected=invite.pending_uploads?.[String(index)];
      const duration=Number(body.durationSec);
      if(!scriptPart(invite,index)||!expected||expected.path!==body.path||Date.now()-expected.createdAt>7200000) return error("Your upload needs to be restarted.",409);
      if(!Number.isFinite(duration)||duration<0.25||duration>600) return error("Recording length is invalid.");
      const path=expected.path;
      const filename=path.split("/").at(-1)!;
      const folder=path.slice(0,-filename.length-1);
      const {data:objects,error:storageError}=await admin.storage.from(BUCKET).list(folder,{limit:25,search:filename});
      const uploaded=objects?.find(item=>item.name===filename);
      const size=Number(uploaded?.metadata?.size??0);
      if(storageError||!uploaded||size<100||size>20971520) return error("We couldn't verify the uploaded audio. Please retry.",409);
      const part=scriptPart(invite,index)!;
      const {error:writeError}=await admin.from("keep_remote_recordings").upsert({
        invite_id:invite.id,paragraph_index:index,text_fingerprint:part.text.trim(),file_path:path,
        content_type:expected.mime,size_bytes:size,duration_seconds:duration,uploaded_at:new Date().toISOString()
      },{onConflict:"invite_id,paragraph_index"});
      if(writeError) return error("Couldn't save this recording. Please retry.",500);
      const pending={...(invite.pending_uploads??{})}; delete pending[String(index)];
      await admin.from("keep_remote_invites").update({pending_uploads:pending}).eq("id",invite.id);
      const nowRecorded=await recordingsFor([invite.id]);
      const completeNow=completedIndices(invite,nowRecorded);
      const finished=completeNow.length===invite.script_parts.length;
      let emailSent=false;
      if(finished) {
        try { emailSent=await notifyOwner(invite); } catch (problem) {console.error("Email delivery failed",problem);}
      }
      return answer({saved:true,allFinished:finished,completed:completeNow.length,total:invite.script_parts.length,emailSent});
    }
    return error("Unknown action.",400);
  } catch (e) {
    console.error("keep remote voice endpoint error",e instanceof Error?e.message:"unknown");
    return error("We couldn't complete that request. Please try again.",500);
  }
});
