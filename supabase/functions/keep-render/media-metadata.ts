/** Only reads bounded headers; the actual original never enters edge memory. */
export type MediaDimensions = {width:number;height:number;duration?:number};
const dimensions = (width:number,height:number): MediaDimensions | undefined =>
  Number.isFinite(width) && Number.isFinite(height) && width>0 && height>0 && width<=100000 && height<=100000 ? {width,height} : undefined;
export function imageDimensions(bytes: Uint8Array): MediaDimensions | undefined {
  const v = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const str = (i:number,n:number) => String.fromCharCode(...bytes.subarray(i,i+n));
  if(bytes.length>=24 && str(1,3)==="PNG") return dimensions(v.getUint32(16),v.getUint32(20));
  if(bytes.length>=10 && str(0,3)==="GIF") return dimensions(v.getUint16(6,true),v.getUint16(8,true));
  if(bytes.length>=30 && str(0,4)==="RIFF" && str(8,4)==="WEBP") {
    if(str(12,4)==="VP8X") return dimensions(1+bytes[24]!+bytes[25]!*256+bytes[26]!*65536,1+bytes[27]!+bytes[28]!*256+bytes[29]!*65536);
    if(str(12,4)==="VP8 " && bytes[23]===0x9d && bytes[24]===1 && bytes[25]===0x2a)
      return dimensions(v.getUint16(26,true)&0x3fff,v.getUint16(28,true)&0x3fff);
    if(str(12,4)==="VP8L" && bytes[20]===0x2f) {
      const bits=v.getUint32(21,true);return dimensions((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);
    }
  }
  if(bytes.length<4 || bytes[0]!==255 || bytes[1]!==216) return undefined;
  let i=2, orientation=1;
  while(i+4<=bytes.length) {
    if(bytes[i++]!==255) break;
    while(bytes[i]===255)i++;
    const marker=bytes[i++]!;
    if(marker===0xda || marker===0xd9 || i+2>bytes.length)break;
    const length=v.getUint16(i);
    if(length<2 || i+length>bytes.length) break;
    if(marker===0xe1 && str(i+2,6)==="Exif\0\0") {
      try {
        const base=i+8, little=str(base,2)==="II";
        const first=base+v.getUint32(base+4,little);
        const entries=v.getUint16(first,little);
        for(let n=0;n<entries;n++) {
          const offset=first+2+n*12;
          if(offset+12>i+length)break;
          if(v.getUint16(offset,little)===0x112) {orientation=v.getUint16(offset+8,little);break;}
        }
      } catch { /* malformed EXIF does not invent a rotation */ }
    }
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length>=7) {
      const height=v.getUint16(i+3),width=v.getUint16(i+5);
      return orientation>=5 && orientation<=8 ? dimensions(height,width) : dimensions(width,height);
    }
    i+=length;
  }
  return undefined;
}
export async function inspectStill(url:string):Promise<MediaDimensions|undefined> {
  const limit=256*1024;
  try {
    const response=await fetch(url,{headers:{Range:"bytes=0-"+(limit-1)},signal:AbortSignal.timeout(8000)});
    if(!response.ok || !response.body)return undefined;
    const reader=response.body.getReader(), data=new Uint8Array(limit);
    let n=0;
    try {
      while(n<limit) {
        const {value,done}=await reader.read();
        if(done || !value)break;
        const take=value.subarray(0,limit-n);data.set(take,n);n+=take.length;
        const info=imageDimensions(data.subarray(0,n));if(info)return info;
      }
      return imageDimensions(data.subarray(0,n));
    } finally { await reader.cancel().catch(()=>undefined); }
  } catch { return undefined; }
}
type ProbeStream = {codec_type?:string;width?:number;height?:number;duration?:string;tags?:{rotate?:string};side_data_list?:Array<{rotation?:number}>;disposition?:{attached_pic?:number}};
type ProbeMetadata = {streams?:ProbeStream[];format?:{duration?:string}};
export function probeDimensions(response:unknown):MediaDimensions|undefined {
  const result=response as {success?:boolean;response?: ProbeMetadata & {metadata?:ProbeMetadata}};
  if(result?.success===false)return undefined;
  // Shotstack wraps FFprobe's streams and format in response.metadata.
  // Continue accepting the older unwrapped shape for compatibility.
  const metadata=result?.response?.metadata ?? result?.response;
  const stream=metadata?.streams?.find(s=>s.codec_type==="video" && !s.disposition?.attached_pic && dimensions(Number(s.width),Number(s.height)));
  if(!stream)return undefined;
  const rotation=Number(stream.side_data_list?.find(s=>s.rotation!==undefined)?.rotation ?? stream.tags?.rotate ?? 0);
  const swap=Math.abs(rotation)%180===90;
  const d=dimensions(Number(swap?stream.height:stream.width),Number(swap?stream.width:stream.height));
  const duration=[Number(stream.duration),Number(metadata?.format?.duration)].find(n=>Number.isFinite(n)&&n>0);
  return d ? {...d,...(duration!==undefined?{duration}:{})} : undefined;
}
