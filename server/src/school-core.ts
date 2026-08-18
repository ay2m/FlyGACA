/**
 * School (B2B seat) grant policy — pure helpers shared by the seat-grant script and
 * the `claimSchoolSeat` callable so the entitlement shape, roster parsing and
 * eligibility live in one testable place. Schools are sold offline (invoiced per
 * seat); seats are provisioned by an admin from the roster, and — for domains/invites
 * an admin has approved — a member's VERIFIED email can self-unlock on sign-in. The
 * grant is the top `school` tier, which satisfies every Pro feature via the plan rank.
 */
import { effectivePlan, type Entitlement } from "./billing-core.js";

/**
 * Email domains whose VERIFIED addresses self-unlock a school seat (e.g. an
 * academy's own mail domain). Empty by default — an approved domain is a per-contract
 * decision, so nothing auto-grants until an operator adds it here. Members on a shared
 * consumer domain (gmail, etc.) are covered by the invite roster instead, never this.
 */
export const APPROVED_SCHOOL_DOMAINS: readonly string[] = [];

/**
 * A school seat entitlement: the `school` tier tagged `source: "school"` so it is
 * distinguishable from a Moyasar or staff grant. `expiresAt` (ISO) sets the contract
 * end; omit it for a non-expiring seat.
 */
export function schoolEntitlement(expiresAt?: string): Entitlement {
  return expiresAt
    ? { plan: "school", source: "school", expiresAt }
    : { plan: "school", source: "school" };
}

/**
 * Parse a school roster — a CSV or a newline/comma/semicolon/space-separated list —
 * into a normalized, de-duplicated list of lowercased email addresses. Blanks, a
 * leading `email` header, and anything that isn't shaped like an address are
 * ignored, so a copy-pasted spreadsheet column works as-is.
 */
export function parseSeatEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e || e === "email") continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue; // local@domain.tld
    seen.add(e);
  }
  return [...seen];
}

/**
 * Normalize an email to its Firestore invite-doc key: trimmed + lowercased, or
 * `null` when it isn't shaped like an address. Used both to write an invite
 * (from the admin roster) and to look one up in `claimSchoolSeat`, so the two
 * always agree on the key. Emails never contain `/`, so they are valid doc ids.
 */
export function inviteKeyForEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

/**
 * Whether `email` self-unlocks a school seat by DOMAIN. Requires `emailVerified` —
 * an unverified address never qualifies, mirroring the staff/student grants, so a
 * domain match can't be spoofed by signing up as someone you aren't. The invite
 * roster is checked separately (it needs a Firestore read); this is the pure part.
 */
export function isApprovedSchoolDomain(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
  domains: readonly string[] = APPROVED_SCHOOL_DOMAINS,
): boolean {
  if (!emailVerified || !email) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return false;
  return domains.includes(e.slice(at + 1));
}

/** A roster email's seat status for the cohort report. */
export type SeatStatus =
  | "active" // has an in-force school-tier seat (school or staff grant)
  | "expired" // had a school seat whose contract end has passed
  | "invited" // on the invite roster but not yet an active seat (may lack an account)
  | "none"; // known account, but no seat and no invite

/**
 * Derive a roster email's seat status from the server data the cohort report can see:
 * the account's `entitlement` (if the account exists) and whether an invite doc is on
 * the roster. Pure so the report script and its test agree on the rules:
 *  - an in-force school-tier plan → `active` (a live school or staff grant);
 *  - a `school` plan whose `expiresAt` has passed → `expired`;
 *  - otherwise an invite on the roster → `invited` (covers not-yet-registered members);
 *  - else `none`.
 * Note: this is the SEAT dimension only. Study coverage / Mock Exam "ready" reporting
 * needs per-user progress server-side, which is local-first today (see PLAN.md §8).
 */
export function schoolSeatStatus(
  input: { entitlement?: Entitlement | null; hasInvite: boolean },
  now: Date = new Date(),
): SeatStatus {
  const ent = input.entitlement;
  if (effectivePlan(ent, now) === "school") return "active";
  if (ent?.plan === "school") return "expired"; // school plan but effectivePlan lapsed it
  if (input.hasInvite) return "invited";
  return "none";
}

/** The scores/completion projection a seat's `users/{uid}/progress/summary` holds. */
export interface ProgressSummaryLike {
  quizBest?: Record<string, number> | null;
  examBest?: number | null;
}

/** A seat's study readiness, computed from its progress summary against a pack. */
export interface Readiness {
  /** Expected banks whose best score meets the threshold. */
  coveredBanks: number;
  /** Expected banks for the pack. */
  totalBanks: number;
  /** Best Mock Exam % (0 when none). */
  examBest: number;
  /** Ready to sit: every expected bank ≥ threshold AND Mock Exam ≥ threshold. */
  ready: boolean;
}

/**
 * Compute a seat's study readiness from its progress summary (or null when the seat
 * has synced nothing yet). Pure, so the cohort report and its test agree: a seat is
 * `ready` when it has covered every expected quiz bank at `threshold` AND scored at
 * least `threshold` on the Mock Exam. Mirrors the readiness definition in
 * DELIVERY-PLAYBOOK.md. `expectedBanks` is the pack's quiz banks (e.g. the AIP pack's
 * `aip-ais` + `airspace`); `threshold` is the org's pass mark (default 75).
 */
export function schoolReadiness(
  summary: ProgressSummaryLike | null | undefined,
  expectedBanks: readonly string[],
  threshold = 75,
): Readiness {
  const quizBest = summary?.quizBest ?? {};
  const examBest = summary?.examBest ?? 0;
  const coveredBanks = expectedBanks.filter((b) => (quizBest[b] ?? 0) >= threshold).length;
  const totalBanks = expectedBanks.length;
  const ready = totalBanks > 0 && coveredBanks === totalBanks && examBest >= threshold;
  return { coveredBanks, totalBanks, examBest, ready };
}

/** One row of the cohort dashboard/report for a member — seat status + readiness. */
export interface CohortRow {
  email: string;
  status: SeatStatus;
  source: string;
  coverage: string; // "covered/total"
  coveredBanks: number;
  totalBanks: number;
  examBest: number;
  ready: boolean;
  /** null when the member has synced no progress yet (dashboard shows "—"). */
  hasProgress: boolean;
  lastActive: string;
}

/**
 * Assemble a cohort row from the server data the dashboard/report sees for one
 * member. Pure so the `getCohortReadiness` callable and the CLI report agree exactly
 * — both feed it `{entitlement, hasInvite, summary}` and the pack's expected banks.
 */
export function cohortRow(
  input: {
    email: string;
    entitlement?: Entitlement | null;
    hasInvite: boolean;
    summary?: (ProgressSummaryLike & { updatedAt?: string }) | null;
  },
  expectedBanks: readonly string[],
  threshold = 75,
  now: Date = new Date(),
): CohortRow {
  const status = schoolSeatStatus({ entitlement: input.entitlement, hasInvite: input.hasInvite }, now);
  const r = schoolReadiness(input.summary, expectedBanks, threshold);
  return {
    email: input.email,
    status,
    source: input.entitlement?.source ?? "",
    coverage: `${r.coveredBanks}/${r.totalBanks}`,
    coveredBanks: r.coveredBanks,
    totalBanks: r.totalBanks,
    examBest: r.examBest,
    ready: r.ready,
    hasProgress: !!input.summary,
    lastActive: input.summary?.updatedAt ? String(input.summary.updatedAt).slice(0, 10) : "",
  };
}

export interface SchoolDoc {
  id?: string;
  name: string;
  ownerUids: string[];
  adminUids: string[];
  instructorUids: string[];
  seatLimit: number;
  allocatedSeats: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RosterDoc {
  cadetUid: string;
  cadetEmail: string;
  cohortId?: string | null;
  licenseStatus: "active" | "revoked" | "expired" | "pending";
  seatAllocated: boolean;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
  pdplConsent: {
    consent: boolean;
    consentedAt: string;
    consentVersion: string;
  };
}

export interface SchoolAuditLog {
  auditId: string;
  action: "GRANT_LICENCE" | "REVOKE_LICENCE" | "UPDATE_ROSTER" | "RECOMPUTE_ANALYTICS";
  actorUid: string;
  targetCadetUid?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export function isSchoolStaff(
  school: { ownerUids?: string[]; adminUids?: string[]; instructorUids?: string[] } | null | undefined,
  uid: string | null | undefined,
): boolean {
  if (!school || !uid) return false;
  const owners = school.ownerUids ?? [];
  const admins = school.adminUids ?? [];
  const instructors = school.instructorUids ?? [];
  return owners.includes(uid) || admins.includes(uid) || instructors.includes(uid);
}

export function isSchoolAdmin(
  school: { ownerUids?: string[]; adminUids?: string[] } | null | undefined,
  uid: string | null | undefined,
): boolean {
  if (!school || !uid) return false;
  const owners = school.ownerUids ?? [];
  const admins = school.adminUids ?? [];
  return owners.includes(uid) || admins.includes(uid);
}

export function canAllocateSeat(allocatedSeats: number, seatLimit: number): boolean {
  if (!Number.isFinite(allocatedSeats) || !Number.isFinite(seatLimit)) return false;
  return allocatedSeats < seatLimit;
}
