-- Fly GACA initial schema — the Firestore replacement.
--
-- Collection → table mapping (old Firestore path on the right):
--   users, profiles, entitlements   ← users/{uid}
--   flights                         ← users/{uid}/logbook/{id}
--   pilot_records                   ← users/{uid}/records/{id}
--   study_progress                  ← users/{uid}/progress/summary
--   chat_credits                    ← chatCredits/{uid}
--   pack_entitlements               ← packEntitlements/{uid}.packs
--   chat_usage                      ← chatUsage/{uid}
--   waitlist                        ← waitlist/{autoid}
--   referral_codes, referrals       ← referralCodes/{code}
--   promo_codes                     ← promoCodes/{code}
--   orgs, org_seats                 ← orgs/{orgId}
--   schools, school_invites         ← schools/{schoolId}
--   checkout_intents, payments,
--   subscriptions                   ← checkoutIntents/{id}, moyasar state
--
-- Entitlement, credits and pack rows are SERVER-WRITTEN ONLY. That used to be
-- enforced by firestore.rules; here the client simply has no route that writes
-- them (see server/src/routes/account.ts).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- identity --

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL UNIQUE,
  email_verified  boolean NOT NULL DEFAULT false,
  -- NULL for accounts that only ever signed in with Google.
  password_hash   text,
  display_name    text NOT NULL DEFAULT '',
  -- Google's stable subject id; NULL until the account links Google.
  google_sub      text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Single-use, time-limited email-verification and password-reset tokens. Only
-- the SHA-256 digest is stored, so a database read cannot mint a valid link.
CREATE TABLE auth_tokens (
  digest      text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('verify', 'reset')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id, kind);

-- Transient state for the Google OAuth round trip (CSRF state + return URL).
CREATE TABLE oauth_states (
  state       text PRIMARY KEY,
  return_to   text NOT NULL DEFAULT '/',
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------- account --

CREATE TABLE profiles (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  home_base          text NOT NULL DEFAULT '',
  licence_type       text NOT NULL DEFAULT '',
  medical_expiry     text NOT NULL DEFAULT '',
  last_flight_review text NOT NULL DEFAULT '',
  role               text NOT NULL DEFAULT '',
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE flights (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id        text NOT NULL,
  date      text NOT NULL DEFAULT '',
  type      text NOT NULL DEFAULT '',
  reg       text NOT NULL DEFAULT '',
  "from"    text NOT NULL DEFAULT '',
  "to"      text NOT NULL DEFAULT '',
  total     text NOT NULL DEFAULT '',
  pic       text NOT NULL DEFAULT '',
  night     text NOT NULL DEFAULT '',
  ifr       text NOT NULL DEFAULT '',
  ldg       text NOT NULL DEFAULT '',
  night_ldg text NOT NULL DEFAULT '',
  appr      text NOT NULL DEFAULT '',
  remarks   text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE pilot_records (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id        text NOT NULL,
  category  text NOT NULL DEFAULT '',
  title     text NOT NULL DEFAULT '',
  ref       text NOT NULL DEFAULT '',
  issued    text NOT NULL DEFAULT '',
  expires   text NOT NULL DEFAULT '',
  remarks   text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- Scores + completion only, never answers (see src/lib/studyProgress.ts).
CREATE TABLE study_progress (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------ entitlement --

CREATE TABLE entitlements (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan       text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'school')),
  expires_at timestamptz,
  source     text CHECK (source IN ('moyasar', 'revenuecat', 'school', 'staff', 'founding')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_credits (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance    integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pack_entitlements (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id    text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_id)
);

-- Free-tier daily quota. `user_key` is the uid for signed-in callers and a
-- hashed client IP for anonymous ones, so both share one counter table.
CREATE TABLE chat_usage (
  user_key   text NOT NULL,
  day        date NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_key, day)
);

-- --------------------------------------------------------------- referrals --

CREATE TABLE referral_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  count      integer NOT NULL DEFAULT 0,
  months     jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per rewarded conversion; the UNIQUE redeemer keeps the reward one-time.
CREATE TABLE referral_redemptions (
  redeemer_user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code             text NOT NULL REFERENCES referral_codes(code) ON DELETE CASCADE,
  rewarded_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE promo_codes (
  code            text PRIMARY KEY,
  type            text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value           integer NOT NULL,
  active          boolean NOT NULL DEFAULT false,
  applies_to      text[],
  expires_at      timestamptz,
  max_redemptions integer,
  redeemed        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- B2B / orgs --

CREATE TABLE orgs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_limit    integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orgs_owner_idx ON orgs (owner_user_id);

-- A seat is addressed by EMAIL, not user id: seats are provisioned before the
-- invitee has an account, and claimed on their first verified sign-in.
CREATE TABLE org_seats (
  org_id     uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email      citext NOT NULL,
  status     text NOT NULL DEFAULT 'invited'
             CHECK (status IN ('invited', 'active', 'expired', 'revoked')),
  source     text NOT NULL DEFAULT 'invite',
  expires_at timestamptz,
  claimed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, email)
);
CREATE INDEX org_seats_email_idx ON org_seats (email);

CREATE TABLE schools (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  -- Verified addresses on these domains self-claim a seat.
  domains    citext[] NOT NULL DEFAULT '{}',
  seat_limit integer,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE school_invites (
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email      citext NOT NULL,
  claimed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, email)
);
CREATE INDEX school_invites_email_idx ON school_invites (email);

-- ----------------------------------------------------------------- billing --

-- The server-priced intent behind one checkout. The confirm leg re-derives the
-- kind and amount from HERE, never from the client's callback URL.
CREATE TABLE checkout_intents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  cadence      text,
  pack_id      text,
  org_name     text,
  ref_code     text,
  promo_code   text,
  amount       integer NOT NULL,
  list_amount  integer,
  currency     text NOT NULL DEFAULT 'SAR',
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  payment_id   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkout_intents_user_idx ON checkout_intents (user_id);
CREATE INDEX checkout_intents_payment_idx ON checkout_intents (payment_id);

CREATE TABLE payments (
  id          text PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  intent_id   uuid REFERENCES checkout_intents(id) ON DELETE SET NULL,
  amount      integer NOT NULL,
  currency    text NOT NULL DEFAULT 'SAR',
  status      text NOT NULL,
  kind        text,
  raw         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_user_idx ON payments (user_id);

-- Auto-renewal state for the token-charging engine. Moyasar has no hosted
-- billing portal, so this table IS the subscription.
CREATE TABLE subscriptions (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan            text NOT NULL,
  cadence         text NOT NULL CHECK (cadence IN ('monthly', 'annual')),
  auto_renew      boolean NOT NULL DEFAULT true,
  -- Moyasar card token for the saved card; NULL disables renewal.
  card_token      text,
  next_renewal_at timestamptz,
  last_renewal_at timestamptz,
  failure_count   integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_due_idx ON subscriptions (next_renewal_at)
  WHERE auto_renew AND card_token IS NOT NULL;

-- ---------------------------------------------------------------- capture --

-- Write-only from the client's perspective: no route ever reads it back.
CREATE TABLE waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext NOT NULL,
  topic      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 👍/👎 on a Captain Adel answer, for offline quality review.
CREATE TABLE answer_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  rating     text NOT NULL CHECK (rating IN ('up', 'down')),
  session    text,
  question   text,
  answer     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Programmatic API access (the /developers surface).
CREATE TABLE api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 of the key; the plaintext is shown once at creation.
  digest      text NOT NULL UNIQUE,
  label       text NOT NULL DEFAULT '',
  tier        text NOT NULL DEFAULT 'free',
  revoked_at  timestamptz,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_user_idx ON api_keys (user_id);

-- One founding grant per account, ever. The PRIMARY KEY is the lock: a retry or a
-- second device cannot stack extra days or re-grant after the window lapses.
CREATE TABLE founding_grants (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly meter for the licensed /v1 API, one row per key per calendar month.
CREATE TABLE api_usage (
  digest       text NOT NULL,
  month        text NOT NULL,
  count        integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  PRIMARY KEY (digest, month)
);
