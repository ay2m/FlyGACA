#!/usr/bin/env node
/**
 * Shard library-search.json by GACAR Part (regulatory grouping).
 * Produces public/data/library-shards/{part}.json so mobile clients fetch
 * only search results for Parts they're studying instead of the full 19 MB index.
 *
 * Parts: 1, 21, 39, 61, 67, 91, 107, 108, 111, 119, 121, 139, 141, 143 (GACAR).
 * Run after corpus update: `node scripts/shard-library-search.mjs`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const INPUT = join(root, 'public/data/library-search.json');
const SHARD_DIR = join(root, 'public/data/library-shards');

// Extract Part number from document ID (e.g., "GACAR-1-1-1" → "1")
function getPartFromDocId(docId) {
  if (!docId) return 'other';
  const match = docId.match(/^[^-]*-(\d+)/);
  return match ? match[1] : 'other';
}

try {
  const raw = JSON.parse(readFileSync(INPUT, 'utf8'));
  const { entries } = raw;

  // Group search results by Part
  const shards = {};
  let shardedCount = 0;

  for (const result of entries) {
    const part = getPartFromDocId(result.id || result.doc);
    if (!shards[part]) shards[part] = [];
    shards[part].push(result);
    shardedCount++;
  }

  // Write shard index
  mkdirSync(SHARD_DIR, { recursive: true });

  const index = {};
  for (const [part, results] of Object.entries(shards)) {
    const shardPath = join(SHARD_DIR, `part-${part}.json`);
    writeFileSync(shardPath, JSON.stringify(results, null, 2) + '\n');

    const bytes = readFileSync(shardPath).length;
    index[part] = {
      count: results.length,
      bytes,
      sizeMB: (bytes / 1024 / 1024).toFixed(2),
    };
  }

  writeFileSync(
    join(SHARD_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n'
  );

  console.log(`Sharded ${shardedCount} search results into ${Object.keys(shards).length} Parts:`);
  const sorted = Object.entries(index).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  for (const [part, info] of sorted) {
    const label = part === 'other' ? 'Other' : `Part ${part}`;
    console.log(`  ${label.padEnd(12)} ${info.count.toString().padStart(5)} results  ${info.sizeMB} MB`);
  }
  console.log(`\nTotal sharded size: ${Object.values(index).reduce((sum, p) => sum + parseFloat(p.sizeMB), 0).toFixed(1)} MB`);
  console.log(`Original: ${(readFileSync(INPUT).length / 1024 / 1024).toFixed(1)} MB`);
} catch (error) {
  console.error(`Error sharding library search: ${error.message}`);
  process.exit(1);
}
