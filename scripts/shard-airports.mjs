#!/usr/bin/env node
/**
 * Shard airports-extra.json by ICAO prefix region.
 * Produces public/data/airports-shards/{region}.json with minified JSON so that:
 * 1. Assets remain well under Cloudflare's 25 MiB asset limit.
 * 2. Mobile clients download smaller, regional chunks on demand.
 *
 * Regions: sa (Saudi), gulf (GCC), mena (Middle East/North Africa),
 * europe (Europe), namerica (North America), samerica (South America),
 * africa (Sub-Saharan Africa), asia (Asia/Far East), oceania (Pacific/Australia), other.
 *
 * Run after corpus update: `node scripts/shard-airports.mjs`
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const INPUT = join(root, 'public/data/airports-extra.json');
const SHARD_DIR = join(root, 'public/data/airports-shards');

function getRegionForAirport(icaoCode) {
  if (!icaoCode || icaoCode.length < 1) return 'other';

  const p1 = icaoCode[0].toUpperCase();
  const p2 = icaoCode.substring(0, 2).toUpperCase();

  // Saudi Arabia
  if (p2 === 'OE' || (p1 === 'O' && !['OM', 'OB', 'OK', 'OT', 'OO', 'OJ', 'OR', 'OS', 'OI'].includes(p2))) {
    if (p2 === 'OE') return 'sa';
  }
  // Gulf neighbors (UAE, Oman, Qatar, Kuwait, Bahrain)
  if (['OM', 'OB', 'OK', 'OT', 'OO', 'UR'].includes(p2)) return 'gulf';
  // MENA (Egypt, Jordan, Iraq, Syria, Iran, etc.)
  if (['EG', 'ET', 'HE', 'LL', 'OJ', 'OR', 'OS', 'OI'].includes(p2)) return 'mena';
  // Africa
  if (['H', 'D', 'F', 'G'].includes(p1)) return 'africa';
  // Europe
  if (['E', 'L', 'U'].includes(p1)) return 'europe';
  // North America (US, Canada, Pacific US)
  if (['K', 'C', 'P'].includes(p1)) return 'namerica';
  // South & Central America / Caribbean
  if (['S', 'M', 'T'].includes(p1)) return 'samerica';
  // Asia
  if (['R', 'V', 'W', 'Z', 'O'].includes(p1)) return 'asia';
  // Oceania
  if (['Y', 'A', 'N'].includes(p1)) return 'oceania';

  return 'other';
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

  // Clean and recreate shard directory
  rmSync(SHARD_DIR, { recursive: true, force: true });
  mkdirSync(SHARD_DIR, { recursive: true });

  const index = {};
  for (const [region, list] of Object.entries(shards)) {
    const shardPath = join(SHARD_DIR, `${region}.json`);
    // Minify JSON to ensure compact transfer & Cloudflare Workers 25MB compliance
    writeFileSync(shardPath, JSON.stringify(list));

    const bytes = readFileSync(shardPath).length;
    index[region] = {
      count: list.length,
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
    console.log(`  ${region.padEnd(10)} ${info.count.toString().padStart(5)} airports  ${info.sizeMB} MB`);
  }
  console.log(`\nTotal sharded size: ${Object.values(index).reduce((sum, r) => sum + parseFloat(r.sizeMB), 0).toFixed(1)} MB`);
  console.log(`Original: ${(readFileSync(INPUT).length / 1024 / 1024).toFixed(1)} MB`);
} catch (error) {
  console.error(`Error sharding airports: ${error.message}`);
  process.exit(1);
}
