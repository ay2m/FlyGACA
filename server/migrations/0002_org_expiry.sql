-- The self-serve Cohort sells ONE 90-day intake. The code sold a lifetime licence.
--
-- `deliver()` hand-rolled its INSERT INTO orgs and ignored `buildCohortOrg()`, the
-- pure function that already computes an `expiresAt` from COHORT_INTAKE_DAYS — and
-- there was no column to put it in. Meanwhile `provision-seats` re-dates every seat
-- it touches (`ON CONFLICT ... DO UPDATE SET expires_at = EXCLUDED.expires_at`) and
-- the seat cap counts ROWS, so an owner could re-provision the same 25 seats forever:
-- one purchase, 25 perpetually-renewed `school` accounts, for free.
--
-- Nullable rather than NOT NULL DEFAULT: orgs created before this migration, and
-- orgs granted by an operator through scripts/grant-org.mjs, are genuinely open-ended
-- contracts. NULL means "no intake window", which is what the enforcement in
-- routes/org.ts reads it as.
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN orgs.expires_at IS
  'End of the paid intake window for a self-serve cohort. NULL = open-ended (operator-granted org).';
