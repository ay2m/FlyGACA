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
import { effectivePlan } from "../billing-core.js";
import { isStaffEmail, staffEntitlement } from "../staff-core.js";
import { isApprovedSchoolDomain, schoolEntitlement, inviteKeyForEmail } from "../school-core.js";
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

grantsRouter.post(
  "/school-seat",
  handler(async (req, res) => {
    const user = requireUser(req);
    if (!user.emailVerified) return res.json({ granted: false });

    const key = inviteKeyForEmail(user.email);
    if (!key) return res.json({ granted: false });

    // Two independent paths to a seat: an approved school domain, or a named
    // invite on a roster. The domain list is per-contract and empty by default.
    const domainSchool = await queryOne<{ id: string; expires_at: Date | null }>(
      `SELECT id, expires_at FROM schools
        WHERE $1 = ANY (domains)
        LIMIT 1`,
      [key.slice(key.lastIndexOf("@") + 1)],
    );
    const domainMatch =
      domainSchool !== null &&
      isApprovedSchoolDomain(user.email, user.emailVerified, [
        key.slice(key.lastIndexOf("@") + 1),
      ]);

    const invite = await queryOne<{ school_id: string; expires_at: Date | null }>(
      `SELECT si.school_id, s.expires_at
         FROM school_invites si
         JOIN schools s ON s.id = si.school_id
        WHERE si.email = $1
        LIMIT 1`,
      [key],
    );

    const seatSource = domainMatch ? domainSchool : invite;
    if (!seatSource) {
      // Also honour a B2B org seat provisioned against this address.
      const orgSeat = await queryOne<{ org_id: string; expires_at: Date | null }>(
        `SELECT org_id, expires_at FROM org_seats
          WHERE email = $1 AND status IN ('invited', 'active')
          LIMIT 1`,
        [key],
      );
      if (!orgSeat) return res.json({ granted: false });

      await query(
        `UPDATE org_seats SET status = 'active', claimed_by = $2
          WHERE org_id = $3 AND email = $1`,
        [key, user.uid, orgSeat.org_id],
      );
      await setEntitlement(
        user.uid,
        schoolEntitlement(orgSeat.expires_at?.toISOString() ?? undefined),
      );
      return res.json({ granted: true, plan: "school" });
    }

    if (invite && !domainMatch) {
      await query("UPDATE school_invites SET claimed_by = $2 WHERE email = $1", [key, user.uid]);
    }
    await setEntitlement(
      user.uid,
      schoolEntitlement(seatSource.expires_at?.toISOString() ?? undefined),
    );
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
    // plan or a still-running founding window.
    if (effectivePlan(current) !== "free") return res.json({ granted: false, already: true });

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
