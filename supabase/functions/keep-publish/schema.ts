import { z } from 'zod';
const text = (max: number) => z.string().max(max);
const number = (min: number,max: number) => z.number().finite().min(min).max(max);
export const manifestSchema = z.object({
  recipientName: text(100).min(1), openingMessage: text(160).optional().default(''), engraveOpeningMessage: z.boolean().optional().default(false), occasion: text(100),
  messageParagraphs: z.array(text(10000)).min(1).max(100),
  voiceMode: z.enum(['solo','together']).optional(),
  contributors: z.array(z.object({id:text(100),name:text(60)})).max(8).optional(),
  paragraphSpeakers: z.array(text(100)).max(100).optional(),
  cardEngraving: z.array(text(100)).max(3), readMemoryOrder:z.array(text(100)).max(300),
  memories:z.array(z.object({
    id:text(100), kind:z.enum(['image','video']), source:z.enum(['upload','sample','text']), storagePath:text(300),
    displayDurationSec:number(0.01,7200).optional(), videoStartSec:number(0,7200).optional(), videoDurationSec:number(0,7200).optional(), isSelfie:z.boolean().optional(), selfieRole:z.enum(["full","intro","outro"]).optional(), focusX:number(0,100).optional(), focusY:number(0,100).optional(), zoom:number(1,4).optional(),
    motion:z.enum(['in','out','left','right']).optional(), transition:z.enum(['fade','dissolve','cut']).optional(),
  })).min(1).max(300),
  voicePath:text(300), voiceDuration:number(0.01,7200), musicMood:text(100), voiceMusicBalance:text(40),
  voiceVolume:number(0,100).default(60), musicVolume:number(0,100).default(60),
  audioMix:z.object({voiceMuted:z.boolean(),musicMuted:z.boolean(),fadeIn:number(0,30),fadeOut:number(0,30),ducking:z.boolean()}).optional(),
  captionStyle:text(40), visualStyle:text(40), captionPosition:z.enum(['top','middle','bottom']).optional(), captionLines:number(1,3).optional(),
  captionCues:z.array(z.object({text:text(2000),start:number(0,7200),end:number(0,7200)}).refine(c=>c.end>=c.start)).max(10000),
});
export function ownedPaths(project:z.infer<typeof manifestSchema>,owner:string,id:string) {
  const prefix=`${owner}/publications/${id}/`;
  const paths=[...project.memories.map(m=>m.storagePath),project.voicePath];
  if(paths.some(path=>!path.startsWith(prefix)||!/^[-a-zA-Z0-9/]+$/.test(path)||path.slice(prefix.length).split('/').length!==2)) throw new Error('Invalid media path');
  return [...new Set(paths)];
}
