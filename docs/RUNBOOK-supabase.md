# Supabase & PostgreSQL Runbook

**Quick reference for FlyGACA developers working with Postgres/Supabase.**

Related: [`ay2m/Office/06-operations-it/supabase-best-practices.md`](../../../Office/06-operations-it/supabase-best-practices.md) (strategic guide).

---

## Local Development

### Start Postgres (Docker)

```bash
docker run --name flygaca-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flygaca \
  -p 5432:5432 \
  -d postgres:16
```

### Apply Migrations

```bash
# From the repo root
DATABASE_URL=postgresql://postgres:postgres@localhost/flygaca \
  node server/scripts/migrate.mjs
```

### Inspect Schema

```bash
# Connect to local Postgres
psql postgresql://postgres:postgres@localhost/flygaca

# List tables
\dt

# Show users table schema
\d users

# List indexes
\di

# Show table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname='public';
```

---

## Writing Migrations

### New Migration Template

Create `server/migrations/000N_description.sql`:

```sql
-- 000N_description.sql
-- What this migration does, in plain language (one sentence).

-- Add a new column with a safe default
ALTER TABLE users ADD COLUMN new_field text NOT NULL DEFAULT '';

-- Drop an old default to allow real values in future
ALTER TABLE users ALTER COLUMN new_field DROP DEFAULT;

-- Create an index
CREATE INDEX users_new_field_idx ON users (new_field);
```

### Incremental Naming

Always increment the prefix: `0001_`, `0002_`, …, `000N_`. Files are applied in lexicographic order.

### Testing a Migration Locally

```bash
# Apply it
DATABASE_URL=... node server/scripts/migrate.mjs

# Verify with psql
psql postgresql://...
\d table_name

# Inspect audit trail
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

---

## Vector Embeddings (Captain Adel RAG)

### Prerequisites

The `pgvector` extension is created by the migration. Verify it's available:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Upserting Embeddings

The GitHub Action `docs-parser` (`.github/workflows/docs-parser.yml`) runs on content changes:

```mermaid
docs/ → GitHub Action → chunk + embed → upsert to regulation_chunks
```

To manually upsert (e.g., after fixing a chunk):

```bash
# From the repo root
node scripts/upsert-embeddings.mjs \
  --corpus public/data/rag-chunks.json \
  --api-key $OPENAI_API_KEY
```

### Querying Embeddings

From server code:

```typescript
import { getPool } from "./db.js";

const pool = getPool();
const queryEmbedding = [0.1, 0.2, ..., 0.9]; // 1536-dim vector

const chunks = await pool.query(
  "SELECT * FROM match_regulations($1, $2, $3)",
  [queryEmbedding, 8, 0.5]  // embedding, match_count, similarity_threshold
);

for (const chunk of chunks.rows) {
  console.log(`Part ${chunk.part_num}, Section: ${chunk.section}`);
  console.log(`Content: ${chunk.content}`);
  console.log(`Similarity: ${chunk.similarity.toFixed(3)}`);
}
```

### Tuning Vector Search

**`lists` parameter in `regulation_chunks_embedding_idx`:**
- Default: 100 (good for ~10k chunks)
- Formula: Tune to ~`sqrt(total_rows)` as corpus grows
- Rebuild: `REINDEX TABLE public.regulation_chunks;`

**`similarity_threshold` in queries:**
- 0.0 = return all (no filter)
- 0.5 = at least 50% cosine similarity
- 0.7+ = high confidence (use for critical citations)

---

## Transactions & Locks

### BEGIN...COMMIT

Use the `tx()` helper for multi-step mutations:

```typescript
import { tx } from "./db.js";

await tx(async (client) => {
  // Step 1: fetch and lock
  const result = await client.query(
    "SELECT * FROM entitlements WHERE user_id = $1 FOR UPDATE",
    [userId]
  );
  const entitlement = result.rows[0];

  // Step 2: conditionally mutate
  if (entitlement.credits >= cost) {
    await client.query(
      "UPDATE entitlements SET credits = credits - $1 WHERE user_id = $2",
      [cost, userId]
    );
    return { ok: true };
  }
  return { ok: false, reason: "Insufficient credits" };
});
```

**`FOR UPDATE` locks the row** so concurrent transactions can't read a stale value.

### Serializable Isolation

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
  -- statements
COMMIT;
```

Use only when absolutely necessary — Cloud Run's 60-second timeout is tight.

---

## Debugging & Monitoring

### Cloud SQL Console (GCP)

1. Go to Cloud SQL → Instances → flygaca-instance
2. Click **Databases** to see tables and sizes
3. Click **Backups** to confirm daily encrypted backups
4. Go to **Metrics** to see CPU, connections, queries

### Query Logs (Local Dev)

```bash
# Enable query logging
export DEBUG_QUERIES=1
npm run dev
```

Logs will show:
```
[DB] SELECT * FROM users WHERE email = $1 {0ms}
[DB] UPDATE entitlements SET ... WHERE user_id = $1 {15ms}
```

Queries over 100ms are warnings to optimize.

### Slow Query Analysis

```sql
-- Find slow queries
SELECT query, calls, total_time / calls AS avg_time_ms
FROM pg_stat_statements
WHERE total_time > 1000  -- >1 second
ORDER BY total_time DESC;

-- Reset stats
SELECT pg_stat_statements_reset();
```

---

## PDPL Compliance

### Audit Trail

Every mutation of `users`, `flight_hours`, or `study_progress` should log an audit record:

```typescript
await client.query(
  `INSERT INTO audit_log (user_id, action, resource, new_val)
   VALUES ($1, $2, $3, $4)`,
  [userId, "flight_added", "flights", JSON.stringify(flightData)]
);
```

### Data Retention

- **Default:** 2 years post-engagement
- **Right to be forgotten:** Call delete procedure → cascade deletes all user data
- **Anonymization:** Remove name, email from audit logs used in reports

### What NOT to Store

- ❌ Passport numbers
- ❌ Phone numbers
- ❌ Home addresses
- ❌ Voice/audio recordings
- ❌ Biometric data
- ❌ Flight routes or ADS-B data

**Learner data columns only:** `name`, `email`, `progress`, `flight_hours`, `study_state`.

---

## Common Tasks

### Add a Column

```sql
-- server/migrations/000N_add_column.sql
ALTER TABLE users ADD COLUMN new_field text NOT NULL DEFAULT '';
```

Then update TypeScript types in `server/src/contract.ts` or model files.

### Create an Index

```sql
-- server/migrations/000N_index_for_queries.sql
CREATE INDEX users_email_verified_idx ON users (email_verified) WHERE NOT email_verified;
```

Partial indexes (with `WHERE`) are faster on tables with many rows.

### Rename a Column

```sql
-- server/migrations/000N_rename_column.sql
ALTER TABLE users RENAME COLUMN old_name TO new_name;
```

Update code to reference `new_name` in the same PR.

### Drop a Column (Destructive)

```sql
-- server/migrations/000N_drop_column.sql
ALTER TABLE old_table DROP COLUMN old_field;
```

Only after:
- Confirming no code references it
- Running tests against the schema
- Getting sign-off from the team

### Backfill Data

```sql
-- server/migrations/000N_backfill_data.sql
-- Backfill study_progress for users who have flight_hours
WITH active_users AS (
  SELECT DISTINCT user_id FROM flight_hours
)
INSERT INTO study_progress (user_id, summary)
SELECT user_id, '{"packages":{}}'::jsonb
FROM active_users
ON CONFLICT DO NOTHING;
```

Backfills are slow on big tables — run in the migration so they're part of the deploy, not a post-deploy job.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `migrate.mjs` hangs | Check database is running: `docker ps \| grep postgres` |
| "column does not exist" | Check `schema_migrations` table; migration may not have applied |
| Slow query on large table | Check indexes exist: `\di` in psql |
| Vector similarity always 0 | Confirm embedding is 1536-dim; check `pgvector` extension |
| Connection timeout (Cloud Run) | Confirm `host=/cloudsql/…` in `DATABASE_URL`; not a network IP |
| `ON DELETE CASCADE` fails | Check foreign key references valid row; use `RESTRICT` if you need to prevent deletion |
| Transaction deadlock | Reduce lock duration; query in sorted order to avoid lock order conflicts |

---

## Performance Tips

1. **Index hot tables:** `users`, `entitlements`, `flight_hours` — add indexes on filter columns
2. **Batch inserts:** Use `INSERT INTO … VALUES (…), (…), (…)` instead of multiple roundtrips
3. **Analyze after bulk ops:** `ANALYZE table_name;` updates optimizer stats
4. **Use `LIMIT` with `OFFSET` for pagination:** `SELECT * FROM users LIMIT 50 OFFSET 100;`
5. **Avoid `SELECT *`:** Fetch only the columns you need to reduce network overhead

---

## References

- **PostgreSQL Docs:** https://www.postgresql.org/docs/16/
- **pgvector Guide:** https://github.com/pgvector/pgvector
- **node-postgres (pg):** https://node-postgres.com/
- **Strategic Guide:** [`ay2m/Office/06-operations-it/supabase-best-practices.md`](../../../Office/06-operations-it/supabase-best-practices.md)

