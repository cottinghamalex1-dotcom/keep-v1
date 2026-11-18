import { describe,expect,it } from "vitest";
import { remoteMomentGuide } from "@/lib/keep-remote-moment-guide";

describe("remote contributor photo/video targets",()=>{
  it("splits the creator's default 30–45 moments across two remote voices",()=>{
    expect(remoteMomentGuide(0,2)).toMatchObject({people:2,totalMin:30,totalMax:45,min:15,max:23});
  });
  it("splits the same target across three voices instead of giving everyone the total",()=>{
    expect(remoteMomentGuide(0,3)).toMatchObject({people:3,totalMin:30,totalMax:45,min:10,max:15});
  });
  it("uses the real message length to match creator photo guidance",()=>{
    const guide=remoteMomentGuide(390,3);
    expect(guide.totalMin).toBe(Math.ceil(Math.round(390*60/195)/5));
    expect(guide.totalMax).toBe(Math.ceil(Math.round(390*60/195)/3));
    expect(guide.min).toBe(Math.ceil(guide.totalMin/3));
    expect(guide.max).toBe(Math.ceil(guide.totalMax/3));
  });
  it("never asks a guest to exceed the existing private upload limit",()=>{
    const guide=remoteMomentGuide(700,1);
    expect(guide.max).toBe(25);
    expect(guide.min).toBeLessThanOrEqual(25);
  });
});
