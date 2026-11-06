import type { MediaItem } from './keep-project';

export type CreationStyle = 'memories' | 'words';
export const recommendedStyle = (count: number, seconds: number): CreationStyle => count >= Math.max(5, Math.ceil(seconds / 16)) ? 'memories' : 'words';

export function spreadMemories(media: MediaItem[], duration: number): MediaItem[] {
  const seconds = Math.max(8, duration);
  return media.map(item => ({ ...item, displayDurationSec: seconds / Math.max(1, media.length) }));
}
