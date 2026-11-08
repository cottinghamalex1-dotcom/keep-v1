import { render, cleanup } from '@testing-library/react';
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
  const { rerender, getByAltText } = render(<CinematicMedia item={item} playing={false} />);
  const image = getByAltText('Memory');
  rerender(<CinematicMedia item={{ ...item, focusX: 25, zoom: 1.3 }} playing={false} imageClassName="editor-image-warm" />);
  expect(getByAltText('Memory')).toBe(image);
  expect(image.style.objectPosition).toBe('25% 50%');
  expect(image.style.transform).toBe('scale(1.3)');
  expect(image.className).toContain('editor-image-warm');
});
