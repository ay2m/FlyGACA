#!/usr/bin/env node
/**
 * Provision (or revoke) Fly GACA school seats. Grants the non-expiring (or
 * contract-dated) `school` entitlement to every account whose email is on the
 * roster you pass, AND writes an `org_seats` row so a roster member who hasn't
 * signed up yet self-unlocks on first verified sign-in (via
 * `POST /api/grants/school-seat`) instead of needing a re-run. Schools are
 * invoiced offline, so this is the day-one seat mechanism. Idempotent.
 * `--revoke` clears both the entitlement and the seat.
 *
 * The email parsing + entitlement shape MIRROR src/school-core.ts.
 *
 * Usage (from server/, with DATABASE_URL set):
 *   node --env-file=../.env scripts/grant-school-seats.mjs --file=roster.csv --org=<orgId> \
 *     [--expires=2027-06-30] [--dry-run] [--revoke]
 *   node --env-file=../.env scripts/grant-school-seats.mjs --emails="a@x.com,b@y.com" --org=<orgId>
 *
 * roster.csv: one email per line (a leading "email" header is ignored). Emails with
 * no Fly GACA account yet get a seat row and unlock when they sign in.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

// --- mirror of src/school-core.ts --------------------------------------------
function parseSeatEmails(text) {
  const seen = new Set();
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || e === "email") continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue;
    seen.add(e);
  }
  return [...seen];
}
// -----------------------------------------------------------------------------

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const dryRun = process.argv.includes("--dry-run");
const revoke = process.argv.includes("--revoke");
const orgId = arg("org");
const expires = arg("expires");
const file = arg("file");
const emails = arg("emails");

const roster = parseSeatEmails(file ? readFileSync(file, "utf8") : (emails ?? ""));
if (roster.length === 0) {
  console.error("No valid emails. Pass --file=roster.csv or --emails=\"a@x.com,b@y.com\".");
  process.exit(1);
}
if (!orgId) {
  console.error("Missing --org=<orgId>. Create one with grant-org.mjs first.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let seats = 0;
let entitled = 0;
for (const email of roster) {
  console.log(`${dryRun ? "[dry-run] " : ""}${revoke ? "revoking" : "granting"} seat → ${email}`);
  if (dryRun) continue;

  if (revoke) {
    await client.query("DELETE FROM org_seats WHERE org_id = $1 AND email = $2", [orgId, email]);
  } else {
    await client.query(
      `INSERT INTO org_seats (org_id, email, status, source, expires_at)
       VALUES ($1, $2, 'invited', 'roster', $3)
       ON CONFLICT (org_id, email) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [orgId, email, expires ?? null],
    );
  }
  seats += 1;

  // Accounts that already exist get the entitlement immediately; the rest claim
  // it on first verified sign-in.
  const { rows } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
  if (rows.length === 0) continue;

  if (revoke) {
    await client.query(
      "UPDATE entitlements SET plan = 'free', expires_at = NULL, source = NULL, updated_at = now() WHERE user_id = $1 AND source = 'school'",
      [rows[0].id],
    );
  } else {
    await client.query(
      `INSERT INTO entitlements (user_id, plan, expires_at, source, updated_at)
       VALUES ($1, 'school', $2, 'school', now())
       ON CONFLICT (user_id) DO UPDATE SET
         plan = 'school', expires_at = EXCLUDED.expires_at, source = 'school', updated_at = now()`,
      [rows[0].id, expires ?? null],
    );
  }
  entitled += 1;
}

await client.end();
console.log(
  `\nDone. ${dryRun ? "Would process" : "Processed"} ${seats} seat(s); ` +
    `${entitled} had an existing account.`,
);
process.exit(0);
