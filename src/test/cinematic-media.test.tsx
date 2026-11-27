import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CinematicMedia } from '../components/cinematic-media';
beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('pauses and resumes an existing video when playback changes', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const item = { url: '/clip.mp4', kind: 'video' as const };
  const { rerender } = render(<CinematicMedia item={item} playing={false} />);
  expect(pause).toHaveBeenCalledTimes(1);
  rerender(<CinematicMedia item={item} playing />);
  expect(play).toHaveBeenCalledTimes(1);
  rerender(<CinematicMedia item={item} playing={false} />);
  expect(pause).toHaveBeenCalledTimes(2);
});
it('updates framing and visual style without remounting the image', () => {
  const item = { url: '/photo.jpg', kind: 'image' as const, focusX: 50, zoom: 1 };
  const { rerender, container } = render(<CinematicMedia item={item} playing={false} sceneElapsed={0} />);
  const image = container.querySelector('img[decoding="async"]');
  expect(image).not.toBeNull();
  // The cinematic image is decorative: alt="" is deliberate.
  rerender(<CinematicMedia item={{ ...item, focusX: 25, zoom: 1.3 }} playing={false} sceneElapsed={0} imageClassName="editor-image-warm" />);
  expect(container.querySelector('img[decoding="async"]')).toBe(image);
  expect(image!.style.objectPosition).toBe('50% 50%');
  expect(image!.style.transform).toContain('scale(0.94)');
  expect(image!.className).toContain('object-contain');
  expect(image!.className).toContain('editor-image-warm');
});

it("does not loop a recorded selfie when the narration outlasts the video take",()=>{
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const {container}=render(<CinematicMedia item={{url:"/selfie.mp4",kind:"video",isSelfie:true}} playing />);
  const video=container.querySelector("video");
  expect(video).not.toBeNull();
  expect(video!.muted).toBe(true);
  expect(video!.loop).toBe(false);
});
it("waits for an actual decoded frame before declaring the opening video ready",()=>{
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const ready=vi.fn();
  const {container}=render(<CinematicMedia item={{url:"/intro.mp4",kind:"video"}} onFirstFrameReady={ready} />);
  const video=container.querySelector("video")!;
  expect(ready).not.toHaveBeenCalled();
  fireEvent.loadedData(video);
  expect(ready).toHaveBeenCalledOnce();
  fireEvent.loadedData(video);
  expect(ready).toHaveBeenCalledOnce();
});
it("does not reveal the opening selfie outro frame at the wrong part of its recording",()=>{
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const ready=vi.fn();
  const {container}=render(<CinematicMedia item={{url:"/selfie.mp4",kind:"video",isSelfie:true,videoStartSec:25}} onFirstFrameReady={ready}/>);
  const video=container.querySelector("video")!;
  Object.defineProperty(video,"currentTime",{value:0,writable:true,configurable:true});
  fireEvent.loadedData(video);
  expect(ready).not.toHaveBeenCalled();
  video.currentTime=25;
  fireEvent.seeked(video);
  expect(ready).toHaveBeenCalledOnce();
});
it("preserves the outgoing image until the incoming image is ready to dissolve",()=>{
  const {container,rerender}=render(<CinematicMedia item={{url:"/one.jpg",kind:"image"}} sceneKey={0}/>);
  rerender(<CinematicMedia item={{url:"/two.jpg",kind:"image"}} sceneKey={1}/>);
  expect([...container.querySelectorAll('img[decoding="async"]')].map(node=>node.getAttribute("src"))).toEqual(["/one.jpg","/two.jpg"]);
  const layers=container.querySelectorAll('div[style*="opacity"]');
  expect(layers.length).toBeGreaterThanOrEqual(2);
});

it("never plays a hidden incoming video while the outgoing video is still visible",()=>{
  const play = vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(()=>{});
  const first={url:"/first-video.mp4",kind:"video" as const};
  const {container,rerender}=render(<CinematicMedia item={first} sceneKey={0} playing />);
  const visible=container.querySelector("video")!;
  expect(play.mock.instances).toContain(visible);
  rerender(<CinematicMedia item={{url:"/next-video.mp4",kind:"video"}} sceneKey={1} playing />);
  const videos=[...container.querySelectorAll("video")];
  expect(videos).toHaveLength(2);
  const hidden=videos.find(video=>video!==visible)!;
  expect(play.mock.instances).not.toContain(hidden);
  expect(pause.mock.instances).toContain(hidden);
  expect(hidden.autoplay).toBe(false);
});

it("loops short videos naturally without repeatedly seeking to their final frame",()=>{
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const {container,rerender}=render(<CinematicMedia
    item={{url:"/five-second-clip.mp4",kind:"video"}} sceneKey={0} sceneElapsed={12} playing />);
  const video=container.querySelector("video")!;
  Object.defineProperty(video,"readyState",{configurable:true,value:4});
  Object.defineProperty(video,"duration",{configurable:true,value:5});
  video.currentTime=2.2;
  rerender(<CinematicMedia item={{url:"/five-second-clip.mp4",kind:"video"}}
    sceneKey={0} sceneElapsed={12.1} playing />);
  expect(video.currentTime).toBeCloseTo(2.2,3);
  expect(video.loop).toBe(true);
});

it("retains a real previous photograph as poster while the next clip is loading",()=>{
  vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue();
  const photo={url:"/last-good-photo.jpg",kind:"image" as const};
  const {container,rerender}=render(<CinematicMedia item={photo} sceneKey={0} />);
  const still=container.querySelector("img")!;
  fireEvent.load(still);
  rerender(<CinematicMedia item={{url:"/slow-clip.mp4",kind:"video"}} sceneKey={1} />);
  const photos=[...container.querySelectorAll("img")].map(img=>img.getAttribute("src"));
  expect(photos).toContain("/last-good-photo.jpg");
  expect(container.querySelector("video")).not.toBeNull();
});

it("uses the full photo at the largest zoom and never stretches it to cover",()=>{
  const item={url:"/wide-group-photo.jpg",kind:"image" as const,zoom:3,focusX:0,focusY:100};
  const {container,rerender}=render(<CinematicMedia item={item} playing={false} duration={10} sceneElapsed={0}/>);
  const image=container.querySelector('img[decoding="async"]') as HTMLImageElement;
  expect(image.className).toContain("object-contain");
  expect(image.className).not.toContain("object-cover");
  expect(image.style.transform).toContain("scale(0.94)");
  rerender(<CinematicMedia item={item} playing={false} duration={10} sceneElapsed={10}/>);
  expect(image.style.transform).toBe("translate(0%, 0%) scale(1)");
  expect(image.parentElement!.style.background).not.toBe("");
});
