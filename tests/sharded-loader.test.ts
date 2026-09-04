import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  loadShardedData,
  reassembleAirports,
  reassembleLibrarySearch,
  type ShardIndex,
} from '@/lib/sharded-loader';
import * as content from '@/lib/content';

vi.mock('@/lib/content');

describe('sharded-loader', () => {
  const fetchJsonMock = vi.fn();

  beforeEach(() => {
    vi.mocked(content.fetchJson).mockImplementation(fetchJsonMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadShardedData', () => {
    it('loads and reassembles data when shards are available', async () => {
      const index: ShardIndex = {
        'shard-0': { count: 2, bytes: 100, sizeMB: '0.1' },
        'shard-1': { count: 2, bytes: 100, sizeMB: '0.1' },
      };

      const shard0 = [{ id: '1' }, { id: '2' }];
      const shard1 = [{ id: '3' }, { id: '4' }];

      fetchJsonMock
        .mockResolvedValueOnce(index) // index.json
        .mockResolvedValueOnce(shard0) // shard-0.json
        .mockResolvedValueOnce(shard1); // shard-1.json

      const reassemble = (shards: unknown[], _index: ShardIndex) =>
        ({ items: (shards as unknown[]).flat() });

      const result = await loadShardedData(
        '/data/items.json',
        '/data/items-shards',
        reassemble,
      );

      expect(result).toEqual({
        items: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
      });
      expect(fetchJsonMock).toHaveBeenCalledTimes(3);
      expect(fetchJsonMock).toHaveBeenNthCalledWith(1, '/data/items-shards/index.json', undefined);
      expect(fetchJsonMock).toHaveBeenNthCalledWith(2, '/data/items-shards/shard-0.json', undefined);
      expect(fetchJsonMock).toHaveBeenNthCalledWith(3, '/data/items-shards/shard-1.json', undefined);
    });

    it('falls back to original file when shard index is not available', async () => {
      const originalData = { items: [{ id: '1' }] };

      fetchJsonMock
        .mockRejectedValueOnce(new Error('Not found')) // index.json fails
        .mockResolvedValueOnce(originalData); // original file succeeds

      const reassemble = (shards: unknown[]) => ({ items: shards });

      const result = await loadShardedData(
        '/data/items.json',
        '/data/items-shards',
        reassemble,
      );

      expect(result).toEqual(originalData);
      expect(fetchJsonMock).toHaveBeenCalledTimes(2);
      expect(fetchJsonMock).toHaveBeenNthCalledWith(1, '/data/items-shards/index.json', undefined);
      expect(fetchJsonMock).toHaveBeenNthCalledWith(2, '/data/items.json', undefined);
    });

    it('falls back to original file when any shard fetch fails', async () => {
      const index: ShardIndex = {
        'shard-0': { count: 1, bytes: 100, sizeMB: '0.1' },
      };

      const originalData = { items: [{ id: 'fallback' }] };

      fetchJsonMock
        .mockResolvedValueOnce(index) // index.json succeeds
        .mockRejectedValueOnce(new Error('Shard fetch failed')) // shard-0.json fails
        .mockResolvedValueOnce(originalData); // original file succeeds

      const reassemble = (shards: unknown[]) => ({ items: shards });

      const result = await loadShardedData(
        '/data/items.json',
        '/data/items-shards',
        reassemble,
      );

      expect(result).toEqual(originalData);
      expect(fetchJsonMock).toHaveBeenCalledTimes(3);
    });

    it('passes abort signal through to fetch calls', async () => {
      const abortSignal = new AbortController().signal;
      const originalData = { items: [] };

      fetchJsonMock.mockRejectedValueOnce(new Error('Aborted')).mockResolvedValueOnce(originalData);

      const reassemble = (shards: unknown[]) => ({ items: shards });

      await loadShardedData(
        '/data/items.json',
        '/data/items-shards',
        reassemble,
        abortSignal,
      );

      expect(fetchJsonMock).toHaveBeenCalledWith('/data/items-shards/index.json', abortSignal);
      expect(fetchJsonMock).toHaveBeenCalledWith('/data/items.json', abortSignal);
    });

    it('handles empty shard index', async () => {
      const index: ShardIndex = {};
      const reassemble = (shards: unknown[]) => ({ items: shards.flat() });

      fetchJsonMock.mockResolvedValueOnce(index);

      const result = await loadShardedData(
        '/data/items.json',
        '/data/items-shards',
        reassemble,
      );

      // With no shards, reassemble should return empty array
      expect(result).toEqual({ items: [] });
      expect(fetchJsonMock).toHaveBeenCalledOnce();
    });
  });

  describe('reassembleAirports', () => {
    it('flattens sharded airport arrays', () => {
      const shards = [
        [{ icao: 'OEJN' }, { icao: 'OEKC' }],
        [{ icao: 'OEDB' }],
      ];

      const result = reassembleAirports(shards);

      expect(result).toEqual({
        airports: [
          { icao: 'OEJN' },
          { icao: 'OEKC' },
          { icao: 'OEDB' },
        ],
      });
    });

    it('handles empty shards', () => {
      const result = reassembleAirports([]);

      expect(result).toEqual({ airports: [] });
    });

    it('handles single shard', () => {
      const shards = [[{ icao: 'OEJN' }]];

      const result = reassembleAirports(shards);

      expect(result).toEqual({ airports: [{ icao: 'OEJN' }] });
    });
  });

  describe('reassembleLibrarySearch', () => {
    it('flattens sharded search result arrays', () => {
      const shards = [
        [{ id: '1', doc: 'Part 1' }, { id: '2', doc: 'Part 2' }],
        [{ id: '3', doc: 'Part 3' }],
      ];

      const result = reassembleLibrarySearch(shards);

      expect(result).toEqual({
        entries: [
          { id: '1', doc: 'Part 1' },
          { id: '2', doc: 'Part 2' },
          { id: '3', doc: 'Part 3' },
        ],
      });
    });

    it('handles empty shards', () => {
      const result = reassembleLibrarySearch([]);

      expect(result).toEqual({ entries: [] });
    });

    it('handles entries with missing fields', () => {
      const shards = [
        [{ id: '1' }, { doc: 'Partial doc' }],
      ];

      const result = reassembleLibrarySearch(shards);

      expect(result).toEqual({
        entries: [{ id: '1' }, { doc: 'Partial doc' }],
      });
    });
  });
});
