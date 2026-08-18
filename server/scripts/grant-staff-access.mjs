#!/usr/bin/env node
/**
 * One-off sweep granting the complimentary staff entitlement to every existing
 * account whose VERIFIED email is on the allowlist. New accounts self-unlock via
 * `POST /api/grants/staff` on sign-in; this covers accounts that predate the
 * allowlist entry.
 *
 * Grant-only, like the route: it never downgrades, so it cannot clobber a paying
 * user.
 *
 * Usage (from server/, with DATABASE_URL set):
 *   node --env-file=../.env scripts/grant-staff-access.mjs [--dry-run]
 */
import pg from "pg";

// --- staff policy (mirror of src/staff-core.ts) -------------------------------
const STAFF_EMAILS = ["ay2m@hotmail.com"];
const STAFF_DOMAINS = ["flygaca.com"];
const STAFF_ENTITLEMENT = { plan: "school", source: "staff" };
// -----------------------------------------------------------------------------

const dryRun = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// The allowlist is applied in SQL so the sweep stays one round trip regardless of
// how many accounts exist. `email_verified` is the ownership proof — without it a
// domain match could be spoofed by registering an address you don't control.
const { rows } = await client.query(
  `SELECT u.id, u.email
     FROM users u
     LEFT JOIN entitlements e ON e.user_id = u.id
    WHERE u.email_verified
      AND (lower(u.email::text) = ANY ($1::text[])
           OR split_part(lower(u.email::text), '@', 2) = ANY ($2::text[]))
      AND (e.source IS DISTINCT FROM 'staff' OR e.plan IS DISTINCT FROM 'school')
    ORDER BY u.email`,
  [STAFF_EMAILS, STAFF_DOMAINS],
);

for (const u of rows) {
  console.log(`${dryRun ? "[dry-run] would grant" : "granting"} school/staff → ${u.email} (${u.id})`);
  if (!dryRun) {
    await client.query(
      `INSERT INTO entitlements (user_id, plan, expires_at, source, updated_at)
       VALUES ($1, $2, NULL, $3, now())
       ON CONFLICT (user_id) DO UPDATE SET
         plan = EXCLUDED.plan, expires_at = NULL, source = EXCLUDED.source, updated_at = now()`,
      [u.id, STAFF_ENTITLEMENT.plan, STAFF_ENTITLEMENT.source],
    );
  }
}

await client.end();
console.log(`\nDone. ${dryRun ? "Would grant" : "Granted"} ${rows.length} account(s).`);
process.exit(0);
