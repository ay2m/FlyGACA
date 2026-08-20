/**
 * B2B org seat-provisioning policy — the pure, Firebase-free rules behind the
 * seat-provisioning route (`routes/org.ts`). Per the repo convention
 * ("every business rule lives in a pure `*-core.ts`"), the request validation,
 * the seat-limit guardrail, and the invite assembly live here so they are
 * unit-testable in isolation; the route stays a thin Postgres wrapper.
 *
 * The seat-limit check is the money/access guardrail: it decides whether an
 * owner may add N more members without exceeding the seats they were invoiced
 * for, so a regression is either over-provisioning (unbilled seats) or a false
 * block. Keeping it pure means that decision has a regression net.
 */
import { inviteKeyForEmail } from "./school-core.js";

/** The validated shape of a `provisionSeats` request. */
export interface ProvisionInput {
  orgId: string;
  emails: string[];
  expiresAt?: string;
}

/** Why a `provisionSeats` request was rejected (maps 1:1 to the callable's `invalid-argument` codes). */
export type ProvisionInputError =
  | "orgId-required"
  | "emails-required"
  | "expiresAt-must-be-ISO-string";

export type ParseResult =
  | { ok: true; value: ProvisionInput }
  | { ok: false; code: ProvisionInputError };

/** Max emails per `provisionSeats` call — a batch cap so one request can't write
 * an unbounded roster of invites (cost/abuse guardrail alongside the seat limit). */
export const MAX_PROVISION_EMAILS = 100;

/**
 * Validate the raw callable payload. Pure so the wrapper can map the failure
 * `code` straight onto an `HttpsError("invalid-argument", code)` and the rules
 * are tested without a Firebase runtime. `orgId` must be a non-empty string,
 * `emails` a non-empty array of at most MAX_PROVISION_EMAILS addresses, and
 * `expiresAt` — when present — a string.
 */
/** A parseable ISO instant no further out than one intake window from `now`. */
export function isSeatExpiry(value: unknown, now: Date = new Date()): value is string {
  if (typeof value !== "string") return false;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return false;
  return t <= now.getTime() + COHORT_INTAKE_DAYS * 24 * 60 * 60 * 1000;
}

/** The seat expiry to persist: the owner's value when sound, else the intake window. */
export function seatExpiry(requested: string | undefined, now: Date = new Date()): string {
  return isSeatExpiry(requested, now)
    ? requested
    : new Date(now.getTime() + COHORT_INTAKE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function parseProvisionInput(data: unknown): ParseResult {
  const d = (data ?? {}) as { orgId?: unknown; emails?: unknown; expiresAt?: unknown };
  if (typeof d.orgId !== "string" || !d.orgId) {
    return { ok: false, code: "orgId-required" };
  }
  if (!Array.isArray(d.emails) || d.emails.length === 0 || d.emails.length > MAX_PROVISION_EMAILS) {
    return { ok: false, code: "emails-required" };
  }
  // A seat is a dated contract line, so the date has to be real. `typeof === "string"`
  // alone let an owner post `"9999-12-31"` — or omit it entirely, which reaches
  // `schoolEntitlement(undefined)` and mints a NON-EXPIRING top-tier grant. One 90-day
  // cohort purchase then converts into permanent `school` accounts, so the intake
  // window is the ceiling and the default.
  if (d.expiresAt !== undefined && !isSeatExpiry(d.expiresAt)) {
    return { ok: false, code: "expiresAt-must-be-ISO-string" };
  }
  return {
    ok: true,
    value: {
      orgId: d.orgId,
      emails: d.emails as string[],
      expiresAt: d.expiresAt as string | undefined,
    },
  };
}

export type SeatLimitResult = { ok: true } | { ok: false; message: string };

/**
 * Whether adding `requested` members keeps the org within its `seatLimit`.
 * `seatsUsed + requested` may equal the limit (a full org is fine) but not
 * exceed it. The failure `message` mirrors the callable's `resource-exhausted`
 * text verbatim, so the wrapper stays a passthrough.
 */
export function checkSeatLimit(args: {
  seatsUsed: number;
  seatLimit: number;
  requested: number;
}): SeatLimitResult {
  const { seatsUsed, seatLimit, requested } = args;
  if (seatsUsed + requested > seatLimit) {
    return {
      ok: false,
      message: `seat-limit-exceeded: ${seatsUsed}/${seatLimit} used, requested ${requested}`,
    };
  }
  return { ok: true };
}

/** Seats included in one self-serve Cohort purchase (docs/b2b/PLAN.md §5 "Starter —
 * Cohort"). MUST mirror the tier's published seat cap on /schools and /pricing. */
export const COHORT_SEAT_LIMIT = 25;

/** Days the purchased intake window covers, from the purchase date — informational
 * only (seats keep their own optional per-invite expiry set via provisionSeats). */
export const COHORT_INTAKE_DAYS = 90;

/** Default quiz banks a freshly-created org reports on — the AIP prep pack (the B2B
 * beachhead product; see docs/b2b/PLAN.md §2). Also the `getCohortReadiness` fallback
 * for any org whose `banks` field is unset. */
export const DEFAULT_ORG_BANKS = ["aip-ais", "airspace"] as const;

/** The `orgs/{orgId}` doc a self-serve Cohort purchase creates. Pure so the shape is
 * unit-tested against the Starter tier definition without a Firebase runtime; the
 * billing callable (`grantForIntent` in billing.ts) just picks an id and writes this
 * verbatim on a successful `cohort` checkout. */
export interface CohortOrgDoc {
  name: string;
  ownerUids: string[];
  seatLimit: number;
  passThreshold: number;
  banks: string[];
  source: "moyasar";
  createdAt: string;
  /** End of the purchased intake window — informational; each invited seat keeps its
   * own optional expiry, set by the owner via provisionSeats. */
  expiresAt: string;
}

/**
 * Build the org doc for a freshly-purchased Cohort: the buyer becomes the sole owner
 * of a 25-seat, 90-day-intake org they can immediately invite members into via the
 * existing `provisionSeats` callable — no ops-script step required. `name` falls back
 * to a generic label when blank so a stale/tampered checkout intent can't crash
 * fulfilment (the callable validates non-blank before charging).
 */
export function buildCohortOrg(
  uid: string,
  name: string | null | undefined,
  now: Date = new Date(),
): CohortOrgDoc {
  const trimmed = (name ?? "").trim().slice(0, 120);
  return {
    name: trimmed || "Untitled cohort",
    ownerUids: [uid],
    seatLimit: COHORT_SEAT_LIMIT,
    passThreshold: 75,
    banks: [...DEFAULT_ORG_BANKS],
    source: "moyasar",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COHORT_INTAKE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** A `schoolInvites/{key}` document plus the doc-id key it is written under. */
export interface BuiltInvite {
  key: string;
  doc: { email: string; orgId: string; createdAt: string; expiresAt?: string };
}

/**
 * Assemble the invite doc for one roster email, or `null` when the address is
 * malformed (the caller records that as a per-email failure). The doc `email`
 * and the doc-id `key` are the same normalized (trimmed + lowercased) address,
 * so a re-provision of the same email is idempotent under `set({ merge: true })`.
 * `now` is injectable so the `createdAt` timestamp is deterministic in tests.
 */
export function buildInvite(
  email: string,
  orgId: string,
  opts: { expiresAt?: string; now?: Date } = {},
): BuiltInvite | null {
  const key = inviteKeyForEmail(email);
  if (!key) return null;
  const doc: BuiltInvite["doc"] = {
    email: key,
    orgId,
    createdAt: (opts.now ?? new Date()).toISOString(),
  };
  if (opts.expiresAt) doc.expiresAt = opts.expiresAt;
  return { key, doc };
}
