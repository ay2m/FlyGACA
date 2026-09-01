/**
 * `server/src/migrations.ts` — forward-only database migrations that apply to
 * the Postgres schema on server startup.
 *
 * Applies every migration in order inside its own transaction. On any error,
 * rolls back the current transaction and returns the error to the caller; all
 * previously successful migrations remain applied.
 */
import { getPool } from "./db.js";

export interface MigrationResult {
  ok: boolean;
  applied: string[];
  alreadyApplied: string[];
  error?: string;
}

interface Migration {
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    name: "0001_init.sql",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        email_verified boolean NOT NULL DEFAULT false,
        password_hash text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS entitlements (
        id bigserial PRIMARY KEY,
        uid text NOT NULL REFERENCES users(id),
        pack_id text NOT NULL,
        tier text NOT NULL,
        granted_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_entitlements_uid ON entitlements(uid);
    `,
  },
  {
    name: "0002_add_apple_oauth.sql",
    sql: `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS apple_id text UNIQUE;

      CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);
    `,
  },
  {
    name: "0002_founder_grant_ay2m.sql",
    sql: `
      INSERT INTO users (id, email, email_verified)
      VALUES ('ay2m', 'founders@flygaca.com', true)
      ON CONFLICT DO NOTHING;

      INSERT INTO entitlements (uid, pack_id, tier, granted_at)
      VALUES ('ay2m', 'all', 'founder', now())
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    name: "0003_pdpl_and_analytics.sql",
    sql: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id bigserial PRIMARY KEY,
        uid text NOT NULL,
        action text NOT NULL,
        resource_type text,
        resource_id text,
        timestamp timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_log_uid ON audit_log(uid);

      CREATE TABLE IF NOT EXISTS analytics_events (
        id bigserial PRIMARY KEY,
        uid text,
        event_type text NOT NULL,
        event_data jsonb,
        timestamp timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_events_uid ON analytics_events(uid);
    `,
  },
];

/**
 * Apply all unapplied migrations in order. Returns ok:true and the list of
 * applied migration names on success; ok:false and an error message on failure.
 * Each migration runs inside its own transaction; failure rolls back only the
 * current transaction, leaving previously applied migrations intact.
 *
 * Client is always released in the finally block, even on error.
 */
export async function runMigrations(): Promise<MigrationResult> {
  const pool = getPool();
  let client;

  try {
    client = await pool.connect();
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : String(err);

    return {
      ok: false,
      applied: [],
      alreadyApplied: [],
      error: errorMessage,
    };
  }

  try {
    // Create the schema_migrations table if it doesn't exist.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Get the set of already-applied migrations.
    const { rows } = await client.query(
      "SELECT name FROM schema_migrations"
    );
    const appliedSet = new Set<string>(rows.map((r) => r.name));

    // Apply each migration in order if not already applied.
    const applied: string[] = [];
    const alreadyApplied: string[] = [];

    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.name)) {
        alreadyApplied.push(migration.name);
        continue;
      }

      try {
        await client.query("BEGIN");
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          migration.name,
        ]);
        await client.query("COMMIT");
        applied.push(migration.name);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    return {
      ok: true,
      applied,
      alreadyApplied,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : String(err);

    return {
      ok: false,
      applied: [],
      alreadyApplied: [],
      error: errorMessage,
    };
  } finally {
    client.release();
  }
}
