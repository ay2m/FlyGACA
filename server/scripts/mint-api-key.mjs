#!/usr/bin/env node
/**
 * Mint a licensed Captain Adel API key for a partner tenant. Inserts into
 * `api_keys` (only the SHA-256 digest is stored — the raw key is shown here
 * EXACTLY ONCE) and prints the key to copy to the partner. The gateway's
 * `POST /v1/ask` looks the digest up, enforces the tier's monthly quota, and
 * meters usage (see src/gateway.ts + api-tier-core.ts).
 *
 * The key format + tier list below MIRROR src/api-key-core.ts and
 * api-tier-core.ts — keep them in sync.
 *
 * Usage (from server/, with DATABASE_URL set):
 *   node --env-file=../.env scripts/mint-api-key.mjs --tenant "Acme Aviation" --tier growth
 *
 * Flags: --tenant "<name>" (required) · --tier starter|growth|enterprise (default
 * starter) · --dry-run (mint + hash + print, but write nothing).
 */
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

// --- key + tier policy (mirror of api-key-core.ts / api-tier-core.ts) ----------
const API_KEY_PREFIX = "flygaca_live_";
const newApiKey = () => API_KEY_PREFIX + randomBytes(24).toString("hex");
const hashApiKey = (key) => createHash("sha256").update(key.trim()).digest("hex");
const keyPreview = (key) => key.slice(0, API_KEY_PREFIX.length + 6);
const TIERS = ["starter", "growth", "enterprise"];
// -------------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = args.includes("--dry-run");
const tenant = opt("tenant", "");
const tier = opt("tier", "starter");

if (!tenant) {
  console.error('Missing --tenant. Usage: node scripts/mint-api-key.mjs --tenant "Acme" --tier growth');
  process.exit(1);
}
if (!TIERS.includes(tier)) {
  console.error(`Invalid --tier "${tier}". Expected one of: ${TIERS.join(", ")}.`);
  process.exit(1);
}

const key = newApiKey();
const hash = hashApiKey(key);

console.log(`Tenant : ${tenant}`);
console.log(`Tier   : ${tier}`);
console.log(`Preview: ${keyPreview(key)}…`);
console.log(`Digest : ${hash}`);

if (dryRun) {
  console.log("\n[dry-run] no row written.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// The key is owned by no user account — a partner tenant is not an app account.
// `label` carries the tenant name for the operator's benefit.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `INSERT INTO api_keys (digest, label, tier) VALUES ($1, $2, $3)
   ON CONFLICT (digest) DO NOTHING`,
  [hash, tenant, tier],
);
await client.end();

console.log("\n✅ Key minted. Copy it to the partner NOW — it is not stored and cannot be shown again:\n");
console.log(`   ${key}\n`);
process.exit(0);
