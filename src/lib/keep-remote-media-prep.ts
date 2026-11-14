import { compressKeepVideo, shouldCompressKeepVideo } from "./keep-video-compression";
import { checkKeepVideo, KEEP_VIDEO_MAX_SOURCE_BYTES, readKeepVideoDuration } from "./keep-video-upload";

const PHOTO_LIMIT=15*1024*1024;
const PHOTO_COMPRESS_AFTER=5*1024*1024;
export const REMOTE_MEDIA_LIMIT=25;
export type PreparedRemoteMoment={file:File;kind:"image"|"video";durationSec?:number};

/** Re-encode a large decodable photo on the contributor's phone before upload.
 * The source file remains on their device. We never transcode SVG or animated GIF.
 */
export async function prepareRemotePhoto(file:File):Promise<File> {
  const ext=file.name.split(".").at(-1)?.toLowerCase()??"";
  const mime=file.type.split(";")[0].toLowerCase()||({
    heic:"image/heic",heif:"image/heif",jpg:"image/jpeg",jpeg:"image/jpeg",
    png:"image/png",webp:"image/webp"
  } as Record<string,string>)[ext];
  if(!["image/jpeg","image/png","image/webp","image/heic","image/heif"].includes(mime??""))
    throw new Error("Please choose a JPG, PNG, WebP or iPhone photo.");
  if(file.size<=PHOTO_COMPRESS_AFTER)return file;
  try {
    const bitmap=await createImageBitmap(file);
    const factor=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*factor));
    canvas.height=Math.max(1,Math.round(bitmap.height*factor));
    const context=canvas.getContext("2d");
    if(!context){bitmap.close();throw Error("No canvas");}
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));
    if(blob && blob.size>100 && blob.size<file.size)
      return new File([blob],file.name.replace(/\.[^.]*$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
  }catch{ /* Photo decoding/transcoding differs across iPhones. Preserve a small original. */ }
  if(file.size>PHOTO_LIMIT)throw new Error("That photo is over 15 MB and couldn't be compressed. Choose a smaller image.");
  return file;
}
export async function prepareRemoteMoment(file:File,onStatus?: (status:string)=>void):Promise<PreparedRemoteMoment> {
  const ext=file.name.split(".").at(-1)?.toLowerCase()??"";
  const kind=file.type.startsWith("video/")||["mov","mp4","webm"].includes(ext)?"video":"image";
  if(kind==="image") {
    onStatus?.("Preparing photo…");
    return {file:await prepareRemotePhoto(file),kind};
  }
  if(file.size>KEEP_VIDEO_MAX_SOURCE_BYTES)throw new Error("That video is too large. Trim it in Photos first.");
  onStatus?.("Checking video length…");
  const durationSec=await readKeepVideoDuration(file);
  if(durationSec>90.5)throw new Error("Trim your video to 90 seconds or less. Short clips under 10 seconds are ideal.");
  let prepared=file;
  if(shouldCompressKeepVideo(file.size)) {
    onStatus?.("Compressing video on your phone…");
    try{
      const encoded=await compressKeepVideo(file,durationSec);
      if(encoded && encoded.size<file.size*.9) {
        const verified=await readKeepVideoDuration(encoded);
        if(Math.abs(verified-durationSec)<=Math.max(1.5,durationSec*.12))prepared=encoded;
      }
    }catch{ /* If it was already under the upload limit, the original is fine. */ }
  }
  const issue=checkKeepVideo(prepared.size,durationSec);
  if(issue)throw new Error("This video couldn't be made small enough. Please trim it or export it at 720p.");
  return {file:prepared,kind,durationSec};
}
