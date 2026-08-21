/**
 * Intelligent loader for sharded data (airports, library-search).
 *
 * Large datasets are split into shards (regions or Parts) so clients can fetch
 * only what they need on-demand, reducing bandwidth for mobile users. This module
 * handles shard detection, fetching, caching, and reassembly into the original
 * single-file format.
 *
 * Shards are discoverable via an index.json at the shard directory root.
 */

import { fetchJson } from './content';

export interface ShardIndex {
  [key: string]: {
    count: number;
    bytes: number;
    sizeMB: string;
  };
}

/**
 * Fetch and merge sharded data. Attempts to detect if shards exist for the
 * requested path; if not, falls back to the original single file.
 *
 * Shard detection: `/data/library-search.json` → try `/data/library-shards/index.json`
 *
 * @param path Original file path (e.g., `/data/library-search.json`)
 * @param shardDir Shard directory (e.g., `/data/library-shards`)
 * @param reassemble Function to reassemble shards into original format
 * @returns Merged data or original file if shards unavailable
 */
export async function loadShardedData<T>(
  path: string,
  shardDir: string,
  reassemble: (shards: T[], index: ShardIndex) => T,
  signal?: AbortSignal,
): Promise<T> {
  // Try to load the shard index
  const indexPath = `${shardDir}/index.json`;
  let index: ShardIndex;

  try {
    index = await fetchJson<ShardIndex>(indexPath, signal);
  } catch {
    // Shards not available, fall back to original file
    return fetchJson<T>(path, signal);
  }

  // Fetch all shards in parallel
  const shardPaths = Object.keys(index);
  const shardPromises = shardPaths.map((key) => {
    const shardPath = `${shardDir}/${key}.json`;
    return fetchJson<T>(shardPath, signal);
  });

  try {
    const shards = await Promise.all(shardPromises);
    return reassemble(shards, index);
  } catch {
    // If any shard fetch fails, fall back to original file
    return fetchJson<T>(path, signal);
  }
}

/**
 * Reassemble airport shards (array of airport objects) into AirportsIndex format.
 */
export function reassembleAirports(
  shards: Array<{ icao: string }[]>,
): { airports: { icao: string }[] } {
  const airports = shards.flat();
  return { airports };
}

/**
 * Reassemble library-search shards (array of search results) into SearchIndex format.
 */
export function reassembleLibrarySearch(
  shards: Array<{ id?: string; doc?: string }[]>,
): { entries: { id?: string; doc?: string }[] } {
  const entries = shards.flat();
  return { entries };
}
