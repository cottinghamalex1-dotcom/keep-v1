import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CinematicMedia } from '../components/cinematic-media';
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
  const image = container.querySelector("img");
  expect(image).not.toBeNull();
  // The cinematic image is decorative: alt="" is deliberate.
  rerender(<CinematicMedia item={{ ...item, focusX: 25, zoom: 1.3 }} playing={false} sceneElapsed={0} imageClassName="editor-image-warm" />);
  expect(container.querySelector("img")).toBe(image);
  expect(image!.style.objectPosition).toBe('25% 50%');
  expect(image!.style.transform).toContain('scale(1.3)');
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
  expect([...container.querySelectorAll("img")].map(node=>node.getAttribute("src"))).toEqual(["/one.jpg","/two.jpg"]);
  const layers=container.querySelectorAll('div[style*="opacity"]');
  expect(layers.length).toBeGreaterThanOrEqual(2);
});
