import type { MediaItem } from './keep-project';
import { defaultMotionAt } from './keep-film-timing';

export type CreationStyle = 'memories' | 'words';
export const recommendedStyle = (count: number, seconds: number): CreationStyle => count >= Math.max(5, Math.ceil(seconds / 16)) ? 'memories' : 'words';

export function spreadMemories(media: MediaItem[], duration: number): MediaItem[] {
  const seconds = Math.max(8, duration);
  return media.map((item, index) => ({
    ...item,
    displayDurationSec: seconds / Math.max(1, media.length),
    motion: item.motion ?? defaultMotionAt(index),
    transition: item.transition ?? (index % 3 === 1 ? 'fade' as const : 'dissolve' as const),
  }));
}

function wordScene(text: string, index: number): MediaItem {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const words = text.trim().split(/\s+/);
  const rows: string[] = [];
  let row = '';
  for (const word of words) {
    if ((row + ' ' + word).trim().length > 24 && row) { rows.push(row); row = word; }
    else row = (row + ' ' + word).trim();
  }
  if (row) rows.push(row);
  const visible = rows.slice(0, 6);
  const lines = visible.map((part, j) => '<text x="540" y="' + (880 + (j - visible.length / 2) * 88) + '" fill="#f6f3ed" font-family="Georgia,serif" font-size="54" text-anchor="middle">' + escape(part) + '</text>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#111111"/><text x="540" y="340" fill="#c6b49a" font-family="Georgia,serif" font-size="42" text-anchor="middle">keep</text>' + lines + '</svg>';
  return { id: 'words-' + index, kind: 'image', source: 'text', name: 'Keep words', url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), displayDurationSec: 8, motion: 'in' };
}

export function arrangeWords(media: MediaItem[], paragraphs: string[], duration: number): MediaItem[] {
  const seconds = Math.max(8, duration);
  const phrases = paragraphs.join(' ').split(/(?<=[.!?])\s+/).map(p => p.trim()).filter(Boolean);
  const text = phrases.length ? phrases : ['Some things are worth keeping'];
  const photos = media.filter(item => item.source !== 'text');
  const photoCount = Math.min(photos.length, Math.floor(seconds / 18));
  const photoDuration = photoCount ? Math.min(7, seconds * .35 / photoCount) : 0;
  const wordCount = Math.max(1, Math.ceil((seconds - photoCount * photoDuration) / 9));
  const wordDuration = (seconds - photoCount * photoDuration) / wordCount;
  const result: MediaItem[] = [];
  let photoIndex = 0;
  for (let i = 0; i < wordCount; i++) {
    result.push({ ...wordScene(text[i % text.length]!, i), displayDurationSec: wordDuration });
    if (photoIndex < photoCount && i + 1 === Math.round((photoIndex + 1) * wordCount / (photoCount + 1))) {
      const photo = photos[photoIndex++]!;
      result.push({
        ...photo,
        displayDurationSec: photoDuration,
        motion: photo.motion ?? defaultMotionAt(result.length),
        transition: photo.transition ?? 'dissolve',
      });
    }
  }
  return result;
}
