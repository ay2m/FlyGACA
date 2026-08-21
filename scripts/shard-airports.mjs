#!/usr/bin/env node
/**
 * Shard airports-extra.json by ICAO prefix region (2-letter prefix groups).
 * Produces public/data/airports-shards/{region}.json so mobile clients fetch
 * only the aerodromes they need instead of downloading the full 21 MB index.
 *
 * Regions: SA (Saudi), AE/OM/QA/KW/BH (Gulf), Others (EG, ET, etc.).
 * Run after corpus update: `node scripts/shard-airports.mjs`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const INPUT = join(root, 'public/data/airports-extra.json');
const SHARD_DIR = join(root, 'public/data/airports-shards');

// ICAO prefix → shard region mapping
const PREFIX_TO_REGION = {
  // Saudi Arabia
  O: 'sa',
  // Gulf neighbors (UAE, Oman, Qatar, Kuwait, Bahrain)
  OM: 'gulf',
  UR: 'gulf', // deprecated, included for compat
  // Middle East / Africa
  EG: 'mena',
  ET: 'mena',
  HE: 'mena',
  // Default
  _default: 'other',
};

function getRegionForAirport(icaoCode) {
  if (!icaoCode || icaoCode.length < 1) return PREFIX_TO_REGION._default;

  const twoLetter = icaoCode.substring(0, 2);
  const oneLetter = icaoCode.substring(0, 1);

  return PREFIX_TO_REGION[twoLetter] || PREFIX_TO_REGION[oneLetter] || PREFIX_TO_REGION._default;
}

try {
  const raw = JSON.parse(readFileSync(INPUT, 'utf8'));
  const { airports } = raw;

  // Group airports by region
  const shards = {};
  let shardedCount = 0;

  for (const airport of airports) {
    const icao = airport.icao;
    const region = getRegionForAirport(icao);
    if (!shards[region]) shards[region] = [];
    shards[region].push(airport);
    shardedCount++;
  }

  // Write shard index (list of available regions + their sizes)
  mkdirSync(SHARD_DIR, { recursive: true });

  const index = {};
  for (const [region, airports] of Object.entries(shards)) {
    const shardPath = join(SHARD_DIR, `${region}.json`);
    writeFileSync(shardPath, JSON.stringify(airports, null, 2) + '\n');

    const bytes = readFileSync(shardPath).length;
    index[region] = {
      count: Object.keys(airports).length,
      bytes,
      sizeMB: (bytes / 1024 / 1024).toFixed(2),
    };
  }

  writeFileSync(
    join(SHARD_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n'
  );

  console.log(`Sharded ${shardedCount} airports into ${Object.keys(shards).length} regions:`);
  for (const [region, info] of Object.entries(index)) {
    console.log(`  ${region.padEnd(6)} ${info.count.toString().padStart(4)} airports  ${info.sizeMB} MB`);
  }
  console.log(`\nTotal sharded size: ${Object.values(index).reduce((sum, r) => sum + parseFloat(r.sizeMB), 0).toFixed(1)} MB`);
  console.log(`Original: ${(readFileSync(INPUT).length / 1024 / 1024).toFixed(1)} MB`);
} catch (error) {
  console.error(`Error sharding airports: ${error.message}`);
  process.exit(1);
}
