-- The licensed API could not be provisioned at all.
--
-- `api_keys.user_id` was NOT NULL, but scripts/mint-api-key.mjs inserts only
-- (digest, label, tier) — deliberately, and it says why: "the key is owned by no
-- user account — a partner tenant is not an app account." So every mint died with
-- 23502 not_null_violation, and the failure surfaced at the worst possible moment,
-- while onboarding a paying partner. The schema and the script disagreed; the
-- script's design is the right one, so the column gives way.
ALTER TABLE api_keys ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN api_keys.user_id IS
  'Owning account, when a key belongs to one. NULL for a partner tenant, which is not an app account.';

-- Nothing filters api_keys by user_id — there is no key-listing route, and the
-- gateway looks keys up by digest (UNIQUE). It was pure write cost on the /v1/ask
-- hot path, and it is also what made the NOT NULL above look load-bearing.
DROP INDEX IF EXISTS api_keys_user_idx;
