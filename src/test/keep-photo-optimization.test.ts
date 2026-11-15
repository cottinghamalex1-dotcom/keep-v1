import { describe, expect, it } from "vitest";
import {
  KEEP_PHOTO_LONG_EDGE, KEEP_PHOTO_MIN_SAVINGS,
  KEEP_PHOTO_QUALITY_LEVELS, KEEP_PHOTO_ZOOM_LONG_EDGE,
  keepOptimizedPhotoId, keepPhotoOutputSize, keepPhotoQualityAcceptable,
  keepPhotoSavings, keepPhotoMaxEdge, shouldOptimizeKeepPhoto,
  optimizeKeepPhoto,
} from "@/lib/keep-photo-optimization";

describe("Keep quality-first photo optimization", () => {
  it("sets visual quality, not 350KB, as the constraint", () => {
    expect(KEEP_PHOTO_LONG_EDGE).toBeGreaterThanOrEqual(2560);
    expect(KEEP_PHOTO_ZOOM_LONG_EDGE).toBeGreaterThan(KEEP_PHOTO_LONG_EDGE);
    expect(KEEP_PHOTO_QUALITY_LEVELS).toEqual([0.85, 0.89, 0.93, 0.96]);
    expect(KEEP_PHOTO_MIN_SAVINGS).toBeLessThan(0.2);
    expect(keepPhotoOutputSize(4032, 3024)).toEqual({width:2560,height:1920});
    expect(keepPhotoOutputSize(800, 600)).toEqual({width:800,height:600});
    expect(keepPhotoOutputSize(3024, 4032, KEEP_PHOTO_ZOOM_LONG_EDGE)).toEqual({width:2304,height:3072});
    expect(keepPhotoMaxEdge(1.7)).toBe(KEEP_PHOTO_ZOOM_LONG_EDGE);
    expect(keepPhotoMaxEdge(1.1)).toBe(KEEP_PHOTO_LONG_EDGE);
  });

  it("optimizes only eligible, sufficiently large still photographs", () => {
    expect(shouldOptimizeKeepPhoto({size:4_000_000,type:"image/jpeg",name:"image.jpeg"})).toBe(true);
    expect(shouldOptimizeKeepPhoto({size:3_000_000,type:"image/heic",name:"family.heic"})).toBe(true);
    expect(shouldOptimizeKeepPhoto({size:2_000_000,type:"image/png",name:"photo.png"})).toBe(true);
    expect(shouldOptimizeKeepPhoto({size:125_000,type:"image/jpeg"})).toBe(false);
    expect(shouldOptimizeKeepPhoto({size:9_000_000,type:"image/gif",name:"animated.gif"})).toBe(false);
    expect(shouldOptimizeKeepPhoto({size:9_000_000,type:"image/png",name:"animated.gif"})).toBe(false);
    expect(shouldOptimizeKeepPhoto({size:9_000_000,type:"video/mp4"})).toBe(false);
    expect(shouldOptimizeKeepPhoto({size:9_000_000,type:"image/svg+xml"})).toBe(false);
  });

  it("rejects visibly different or damaged transparent frames", () => {
    const reference = new Uint8ClampedArray([80,120,150,255, 70,110,200,255, 40,130,220,255]);
    expect(keepPhotoQualityAcceptable(reference, reference)).toBe(true);
    const subtle = new Uint8ClampedArray([82,122,152,255, 72,112,202,255, 42,132,222,255]);
    expect(keepPhotoQualityAcceptable(reference, subtle)).toBe(true);
    const blurred = new Uint8ClampedArray([100,150,180,255, 100,150,180,255, 100,150,180,255]);
    expect(keepPhotoQualityAcceptable(reference, blurred)).toBe(false);
    const alphaDamage = new Uint8ClampedArray([80,120,150,240, 70,110,200,240, 40,130,220,240]);
    expect(keepPhotoQualityAcceptable(reference, alphaDamage)).toBe(false);
    expect(keepPhotoQualityAcceptable(reference,new Uint8ClampedArray(2))).toBe(false);
  });

  it("retains the original for already-small images and unsupported media", async () => {
    expect(await optimizeKeepPhoto(new Blob(["small"],{type:"image/jpeg"}))).toBeNull();
    expect(await optimizeKeepPhoto(new Blob(["gif"],{type:"image/gif"}))).toBeNull();
    expect(keepPhotoSavings(3_600_000,360_000)).toBe(90);
    expect(keepOptimizedPhotoId("photo-123")).toBe("photo-123:optimized-photo-v1");
  });
});
