import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchJson } from '@/lib/content';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const jsonRes = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

describe('fetchJson', () => {
  it('resolves the parsed body for an OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({ parts: [1, 2] })));
    await expect(fetchJson('/data/x.json')).resolves.toEqual({ parts: [1, 2] });
  });

  it('throws a load error naming the path on a non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' } as Response),
    );
    await expect(fetchJson('/data/x.json')).rejects.toThrow('Failed to load /data/x.json: 404');
  });

  it('surfaces a malformed body as a parse error, not a downstream crash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      } as unknown as Response),
    );
    await expect(fetchJson('/data/x.json')).rejects.toThrow(/Failed to parse \/data\/x\.json/);
  });

  it('rejects a well-formed body the optional validator refuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({ nope: true })));
    const isParts = (d: unknown): d is { parts: number[] } =>
      !!d && typeof d === 'object' && Array.isArray((d as { parts?: unknown }).parts);
    await expect(fetchJson('/data/x.json', undefined, isParts)).rejects.toThrow(
      'Failed to validate /data/x.json: unexpected shape',
    );
    await expect(fetchJson('/data/y.json', undefined, undefined)).resolves.toEqual({ nope: true });
  });
});
