import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerDownload } from '@/lib/download';

// The shared export idiom: build a blob, mint a transient object URL, click a
// detached anchor, revoke. Pinned: the anchor carries the given filename and
// the minted URL, and the URL is revoked after the click (no leak).

afterEach(() => {
  vi.restoreAllMocks();
});

describe('triggerDownload', () => {
  it('clicks a detached anchor with the blob URL and filename, then revokes', () => {
    const created: Blob[] = [];
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    const anchors: HTMLAnchorElement[] = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') anchors.push(el as HTMLAnchorElement);
      return el;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    triggerDownload('flygaca-logbook.csv', 'a,b\n1,2\n', 'text/csv');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(created[0].type).toBe('text/csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe('flygaca-logbook.csv');
    expect(anchors[0].href).toContain('blob:mock-url');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    vi.unstubAllGlobals();
  });
});
