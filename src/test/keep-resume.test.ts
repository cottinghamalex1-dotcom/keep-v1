import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/components/keep-player', () => ({ memoryImages: [] }));
vi.mock('@/lib/keep-media-store', () => ({ getBlob: vi.fn(), putBlob: vi.fn() }));
import { loadEditableKeep, saveCloudDraft, type KeepSession } from '@/lib/keep-cloud';
import { newProject } from '@/lib/keep-project';
const session: KeepSession = { access_token: 'test', refresh_token: 'test', user: { id: 'owner' } };
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
afterEach(() => vi.unstubAllGlobals());
it('opens the requested Keep, not the most recently edited different Keep', async () => {
  const selected = { ...newProject(), active: true, recipientName: 'Hannah', publicationId: 'hannah' };
  const fetcher = vi.fn().mockResolvedValueOnce(response([{ id: 'hannah', draft_project: selected }])).mockResolvedValueOnce(response([{ project: { ...selected, recipientName: 'Kids', publicationId: 'kids' } }]));
  vi.stubGlobal('fetch', fetcher);
  const result = await loadEditableKeep('hannah', session);
  expect(result.recipientName).toBe('Hannah');
  expect(result.publicationId).toBe('hannah');
  expect(fetcher.mock.calls[0]![0]).toContain('id=eq.hannah&owner_id=eq.owner');
});
it('restores newer legacy edits when they belong to the selected Keep', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response([{ draft_project: { ...newProject(), recipientName: 'Old' }, published_at: '2026-01-01', recipient_token: 'same-link' }])).mockResolvedValueOnce(response([{ project: { ...newProject(), active: true, publicationId: 'hannah', recipientName: 'New' } }])));
  const result = await loadEditableKeep('hannah', session);
  expect(result.recipientName).toBe('New');
  expect(result.publicationToken).toBe('same-link');
});
it('does not fall back to another draft if the selected Keep is missing', async () => {
  const fetcher = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetcher);
  await expect(loadEditableKeep('missing', session)).rejects.toThrow('could not be found');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('saves changes to the selected Keep without changing its published version or link', async () => {
  const fetcher = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetcher);
  await saveCloudDraft({ ...newProject(), active: true, publicationId: 'hannah', recipientName: 'Hannah' }, session);
  const body = JSON.parse(fetcher.mock.calls[0]![1].body);
  expect(body.id).toBe('hannah');
  expect(body.owner_id).toBe('owner');
  expect(body.draft_project.recipientName).toBe('Hannah');
  expect(body).not.toHaveProperty('published_project');
  expect(body).not.toHaveProperty('recipient_token');
  expect(body).not.toHaveProperty('status');
});
it('refuses to download published media from a different owner', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response([{ published_project: { voicePath: 'owner/publications/hannah/voice', memories: [{ storagePath: 'other/publications/hannah/photo' }] } }])).mockResolvedValueOnce(response([])));
  await expect(loadEditableKeep('hannah', session)).rejects.toThrow('does not belong');
});
it('restores a published Keep with its voice, media, settings and original viewing link', async () => {
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:restored') });
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response([{ recipient_token: 'original-link', published_project: { recipientName: 'Hannah', voicePath: 'owner/publications/hannah/voice', voiceDuration: 60, musicMood: 'Warm', memories: [{ id: 'original-photo', kind: 'image', storagePath: 'owner/publications/hannah/photo', focusX: 20 }], readMemoryOrder: ['original-photo'] } }]))
    .mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce(new Response(new Blob(['photo'])))
    .mockResolvedValueOnce(new Response(new Blob(['voice']))));
  const result = await loadEditableKeep('hannah', session);
  expect(result.stage).toBe('editor');
  expect(result.publicationId).toBe('hannah');
  expect(result.publicationToken).toBe('original-link');
  expect(result.finalVoiceRecording?.durationSec).toBe(60);
  expect(result.memories[0]?.focusX).toBe(20);
  expect(result.readMemoryOrder).toEqual([result.memories[0]?.id]);
});
