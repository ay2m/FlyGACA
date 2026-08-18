#!/usr/bin/env node
/**
 * Create (or update) a Fly GACA B2B org — the `orgs` row the `/business/admin`
 * cohort dashboard reads. Sets the org's name, its owner, and seat limit. The
 * owner is given by email and resolved to a user id (they must have signed up).
 * Idempotent; safe to re-run to change settings.
 *
 * Usage (from server/, with DATABASE_URL set):
 *   node --env-file=../.env scripts/grant-org.mjs --id=<uuid> --name="Riyadh Flight Academy" \
 *     --owner=head@academy.edu.sa [--seat-limit=25]
 *
 * Omit --id to create a new org (its generated id is printed). Provision seats
 * into it afterwards with grant-school-seats.mjs --org=<id>.
 */
import pg from "pg";

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const id = arg("id");
const name = arg("name");
const owner = arg("owner");
const seatLimit = arg("seat-limit") ? Number.parseInt(arg("seat-limit"), 10) : null;

if (!name || !owner) {
  console.error('Usage: grant-org.mjs --name="Academy" --owner=head@academy.edu.sa [--id=<uuid>] [--seat-limit=25]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: users } = await client.query("SELECT id FROM users WHERE email = $1", [
  owner.trim().toLowerCase(),
]);
if (users.length === 0) {
  console.error(`No account for ${owner}. They must sign up before owning an org.`);
  await client.end();
  process.exit(1);
}

const { rows } = id
  ? await client.query(
      `INSERT INTO orgs (id, name, owner_user_id, seat_limit) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, owner_user_id = EXCLUDED.owner_user_id,
         seat_limit = EXCLUDED.seat_limit
       RETURNING id`,
      [id, name, users[0].id, seatLimit],
    )
  : await client.query(
      "INSERT INTO orgs (name, owner_user_id, seat_limit) VALUES ($1, $2, $3) RETURNING id",
      [name, users[0].id, seatLimit],
    );

await client.end();
console.log(`✅ org ${rows[0].id} — "${name}", owner ${owner}, seat limit ${seatLimit ?? "none"}`);
process.exit(0);
