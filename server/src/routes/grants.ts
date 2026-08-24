/**
 * Complimentary-grant routes — staff, school seat, and the founding grandfather
 * window. Replaces the `claimStaffAccess` / `claimSchoolSeat` /
 * `claimFoundingAccess` callables.
 *
 * These, together with the billing routes, are the ONLY writers of `entitlements`.
 * Every one of them GRANTS ONLY — never a downgrade — so a comp can't clobber a
 * paying user; revocation stays deliberate (remove the allowlist entry / seat and
 * reset the row). Every domain or roster match requires a VERIFIED email: that is
 * the ownership proof, without which anyone could register `x@flygaca.com` and
 * self-grant.
 */
import { Router } from "express";
import { effectivePlan, mergeUpward } from "../billing-core.js";
import { isStaffEmail, staffEntitlement } from "../staff-core.js";
import { schoolEntitlement, inviteKeyForEmail } from "../school-core.js";
import { foundingEntitlement, isFoundingEligible } from "../founding-core.js";
import { getEntitlement, setEntitlement } from "../store.js";
import { query, queryOne } from "../db.js";
import { handler, requireUser } from "../http.js";

export const grantsRouter: Router = Router();

grantsRouter.post(
  "/staff",
  handler(async (req, res) => {
    const user = requireUser(req);
    if (!isStaffEmail(user.email, user.emailVerified)) return res.json({ granted: false });

    const current = await getEntitlement(user.uid);
    // Idempotent — only write when the staff grant isn't already in force.
    const alreadyStaff = current?.source === "staff" && effectivePlan(current) === "school";
    if (!alreadyStaff) await setEntitlement(user.uid, staffEntitlement());

    return res.json({ granted: true, plan: "school" });
  }),
);

/** A seat this account may claim, plus how to mark it claimed once granted. */
interface Seat {
  /** ISO contract end, or undefined for a non-expiring seat. */
  expiresAt: string | undefined;
  /** Records the claim against whichever roster the seat came from. */
  claim: () => Promise<void>;
}

const iso = (d: Date | null): string | undefined => d?.toISOString() ?? undefined;

/**
 * The first seat `email` can claim, in precedence order:
 *   1. an approved school DOMAIN — the per-contract `schools.domains` list, empty
 *      by default so nothing auto-grants until an operator adds one;
 *   2. a named invite on a school ROSTER;
 *   3. a B2B ORG seat provisioned against this address.
 *
 * Ordered and short-circuiting, so a domain match costs one query. Returns `null`
 * when none applies. Callers must already have established that the email is
 * verified.
 */
async function findSeat(email: string, uid: string): Promise<Seat | null> {
  const domain = email.slice(email.lastIndexOf("@") + 1);

  const domainSchool = await queryOne<{ id: string; expires_at: Date | null }>(
    "SELECT id, expires_at FROM schools WHERE $1 = ANY (domains) LIMIT 1",
    [domain],
  );
  // A domain seat has no per-member row to mark — membership IS the domain.
  if (domainSchool) {
    return { expiresAt: iso(domainSchool.expires_at), claim: async () => {} };
  }

  const invite = await queryOne<{ school_id: string; expires_at: Date | null }>(
    `SELECT si.school_id, s.expires_at
       FROM school_invites si
       JOIN schools s ON s.id = si.school_id
      WHERE si.email = $1
      LIMIT 1`,
    [email],
  );
  if (invite) {
    return {
      expiresAt: iso(invite.expires_at),
      claim: async () => {
        await query(
          "UPDATE school_invites SET claimed_by = $1 WHERE school_id = $2 AND email = $3",
          [uid, invite.school_id, email],
        );
      },
    };
  }

  const orgSeat = await queryOne<{ org_id: string; expires_at: Date | null }>(
    `SELECT org_id, expires_at FROM org_seats
      WHERE email = $1 AND status IN ('invited', 'active')
      LIMIT 1`,
    [email],
  );
  if (orgSeat) {
    return {
      expiresAt: iso(orgSeat.expires_at),
      claim: async () => {
        await query(
          "UPDATE org_seats SET status = 'active', claimed_by = $1 WHERE org_id = $2 AND email = $3",
          [uid, orgSeat.org_id, email],
        );
      },
    };
  }

  return null;
}

grantsRouter.post(
  "/school-seat",
  handler(async (req, res) => {
    const user = requireUser(req);
    // The verified email IS the ownership proof for every path below — without it
    // anyone could register an address on a contracted domain and self-grant.
    if (!user.emailVerified) return res.json({ granted: false });

    const email = inviteKeyForEmail(user.email);
    if (!email) return res.json({ granted: false });

    const seat = await findSeat(email, user.uid);
    if (!seat) return res.json({ granted: false });

    await seat.claim();
    // Merge rather than overwrite: a seat is often shorter than a plan the member
    // already bought, so a bare write would trade months of paid Pro for a 30-day
    // seat and relabel the row `source: "school"`, destroying the refund trail.
    const current = await getEntitlement(user.uid);
    await setEntitlement(user.uid, mergeUpward(current, schoolEntitlement(seat.expiresAt)));
    return res.json({ granted: true, plan: "school" });
  }),
);

grantsRouter.post(
  "/founding",
  handler(async (req, res) => {
    const user = requireUser(req);
    if (!user.emailVerified) return res.json({ granted: false });

    // Eligibility is the account's creation time — a server-only signal the
    // client cannot assert, so it can't be spoofed.
    if (!isFoundingEligible(user.createdAtMs)) return res.json({ granted: false });

    const current = await getEntitlement(user.uid);
    // The comp is for free accounts only — never touch an active paid/staff/school
    // plan or a still-running founding window. Check for actual conflicting sources,
    // not effectivePlan which includes the promo.
    if (current && current.source && ["staff", "school", "founding"].includes(current.source)) {
      return res.json({ granted: false, already: true });
    }
    if (current?.source === "moyasar" && current.expiresAt && new Date(current.expiresAt) > new Date()) {
      return res.json({ granted: false, already: true });
    }

    // One founding grant per account, ever. The PRIMARY KEY conflict is the lock,
    // so a retry or a second device can't stack days or re-grant after it lapses.
    const claimed = await queryOne<{ user_id: string }>(
      `INSERT INTO founding_grants (user_id) VALUES ($1)
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [user.uid],
    );
    if (!claimed) return res.json({ granted: false, already: true });

    await setEntitlement(user.uid, foundingEntitlement(new Date(), current));
    console.info("funnel", { event: "founding_granted", uid: user.uid });
    return res.json({ granted: true, plan: "pro" });
  }),
);
