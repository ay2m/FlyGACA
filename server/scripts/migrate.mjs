/**
 * Forward-only migration runner.
 *
 * Applies every `migrations/*.sql` not yet recorded in `schema_migrations`, in
 * filename order, each inside its own transaction. Deliberately tiny — a real
 * migration tool is worth adding when the first destructive change lands, not
 * before.
 *
 *   node --env-file=.env server/scripts/migrate.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const { rows } = await client.query('SELECT name FROM schema_migrations');
const applied = new Set(rows.map((r) => r.name));

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

let ran = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
  process.stdout.write(`Applying ${file} … `);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log('ok');
    ran += 1;
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('FAILED');
    console.error(err);
    await client.end();
    process.exit(1);
  }
}

console.log(ran === 0 ? 'Already up to date.' : `Applied ${ran} migration(s).`);
await client.end();
