import { expect, it, describe } from "vitest";
import { getSpeakerParts } from "@/components/keep-remote-invite-manager";
import { voiceLevelForSamples } from "@/lib/keep-collaborative-audio";
import { newProject } from "@/lib/keep-project";

describe("remote collaboration script safety",()=>{
  it("only includes the exact speaking parts assigned to each contributor",()=>{
    const project={...newProject(),
      messageParagraphs:["Dear Mom,","We remember your laughter.","Thank you for everything.","Love always."],
      contributors:[{id:"diane",name:"Diane"},{id:"caren",name:"Caren"}],
      paragraphSpeakers:["diane","caren","diane","caren"],
      voiceMode:"together" as const,
      voiceRecordingLocation:"remote" as const
    };
    expect(getSpeakerParts(project,"diane")).toEqual([{index:0,text:"Dear Mom,"},{index:2,text:"Thank you for everything."}]);
    expect(getSpeakerParts(project,"caren")).toEqual([{index:1,text:"We remember your laughter."},{index:3,text:"Love always."}]);
    expect(getSpeakerParts(project,"unknown")).toEqual([]);
  });
  it("retains back-compatible alternating paragraph assignments if no explicit mapping exists",()=>{
    const project={...newProject(),contributors:[{id:"a",name:"One"},{id:"b",name:"Two"}],messageParagraphs:[" A "," B "," C "],paragraphSpeakers:[]};
    expect(getSpeakerParts(project,"a")).toEqual([{index:0,text:"A"},{index:2,text:"C"}]);
  });
});

describe("consistent voice-level blending",()=>{
  it("raises a quieter voice without boosting silence",()=>{
    const quiet=voiceLevelForSamples([Float32Array.from({length:1000},(_,i)=>Math.sin(i/8)*.045)]);
    const loud=voiceLevelForSamples([Float32Array.from({length:1000},(_,i)=>Math.sin(i/8)*.22)]);
    expect(quiet.gain).toBeGreaterThan(loud.gain);
    expect(quiet.gain).toBeLessThanOrEqual(2.5);
    expect(loud.gain).toBeGreaterThan(0.5);
    expect(voiceLevelForSamples([new Float32Array(300)]).gain).toBe(1);
  });
  it("caps peaks to prevent clipped speech",()=>{
    const samples=Float32Array.from([1,0.7,-0.9,0.6,0.8]);
    const level=voiceLevelForSamples([samples]);
    expect(level.gain*level.peak).toBeLessThanOrEqual(0.880001);
  });
});
