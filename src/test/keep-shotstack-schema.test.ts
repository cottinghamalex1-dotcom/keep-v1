import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import { CAPTION_CHOICES } from "../../supabase/functions/keep-render/composition";
import schema from "./fixtures/shotstack-edit-schema.json";
import { buildShotstackEdit, type RenderProject, type ShotstackSources } from "../../supabase/functions/keep-render/shotstack";

const check = new Ajv({ allErrors: true, strict: false }).compile(schema);
const fixture = (visualStyle: string): RenderProject => ({
  recipientName:"Recipient",openingMessage:"A few words we will always keep.",
  closingLine:"With all our love.",voicePath:"voice",voiceDuration:132.329,
  captionStyle:"Clean",captionPosition:"bottom",captionLines:2,visualStyle,
  captionCues:Array.from({length:71},(_,i)=>({text:"Caption number "+(i+1),start:i*1.8,end:i*1.8+1.6})),
  memories:Array.from({length:26},(_,i)=>({storagePath:"memory-"+i,kind:"image",
    displayDurationSec:5,focusX:(i*23)%101,focusY:(i*13)%101,zoom:1.15})),
});
const sources = (p: RenderProject): ShotstackSources => ({
  voiceUrl:"https://example.com/voice.mp3",musicUrl:"https://example.com/music.mp3",musicDurationSec:96,
  memoryUrls:Object.fromEntries(p.memories.map(m=>[m.storagePath,"https://example.com/"+m.storagePath+".jpg"])),
  mediaDimensions:Object.fromEntries(p.memories.map((m,i)=>[m.storagePath,i%2?{width:1080,height:1920}:{width:1920,height:1080}])),
});
describe("Shotstack request contract (offline provider schema)",()=>{
  it.each(["Dreamy","Warm","Film","Modern","Black & White","Vintage","Soft","Original"])("validates all 26 memories and 71 captions with the %s filter",style=>{
    const p=fixture(style), edit=buildShotstackEdit(p,sources(p));
    expect(check(edit), JSON.stringify(check.errors)).toBe(true);
  });
  it.each(CAPTION_CHOICES.map(c=>c.name))("validates render payload with %s captions",captionStyle=>{
    const p={...fixture("Warm"),captionStyle};
    const edit=buildShotstackEdit(p,sources(p));
    expect(check(edit),JSON.stringify(check.errors)).toBe(true);
  });
  it("rejects the old invalid Dreamy brightness multiplier",()=>{
    const p=fixture("Dreamy"), edit=buildShotstackEdit(p,sources(p));
    const photo=edit.timeline.tracks.flatMap(t=>t.clips).find(c=>c.asset.src===sources(p).memoryUrls["memory-0"])!;
    photo.filters=[{type:"brightness",value:1.13}];
    expect(check(edit)).toBe(false);
  });
  it("keeps integer text and shape sizes after adapting a long dedication",()=>{
    const p={...fixture("Dreamy"),recipientName:"Long recipient name ".repeat(5),openingMessage:"A long note ".repeat(13)};
    const edit=buildShotstackEdit(p,sources(p));
    expect(check(edit),JSON.stringify(check.errors)).toBe(true);
  });
});
