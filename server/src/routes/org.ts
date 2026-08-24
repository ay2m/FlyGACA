/**
 * B2B org-admin routes backing `/business/admin` — replaces the `getMyOrgs`,
 * `getCohortReadiness` and `provisionSeats` callables.
 *
 * Ownership is re-verified from the database on every call (`owner_user_id =
 * session uid`), never trusted from the request. The readiness maths itself is the
 * shared pure core (`school-core.cohortRow`), so this dashboard and the CLI report
 * agree by construction.
 */
import { Router } from "express";
import {
  parseProvisionInput,
  checkSeatLimit,
  seatExpiry,
  DEFAULT_ORG_BANKS,
} from "../org-core.js";
import { cohortRow, inviteKeyForEmail, type ProgressSummaryLike } from "../school-core.js";
import type { Entitlement } from "../billing-core.js";
import { query, queryOne } from "../db.js";
import { handler, requireUser, badRequest, forbidden, HttpError } from "../http.js";

export const orgRouter: Router = Router();

/** A path param as a plain string (Express types it as `string | string[]`). */
function param(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** The org, only if the caller owns it. Any other case is indistinguishable — 403. */
async function ownedOrg(
  orgId: string,
  uid: string,
): Promise<{ id: string; name: string; seat_limit: number | null }> {
  const org = await queryOne<{ id: string; name: string; seat_limit: number | null }>(
    "SELECT id, name, seat_limit FROM orgs WHERE id = $1 AND owner_user_id = $2",
    [orgId, uid],
  );
  if (!org) throw forbidden();
  return org;
}

orgRouter.get(
  "/mine",
  handler(async (req, res) => {
    const user = requireUser(req);
    const orgs = await query<{
      id: string;
      name: string;
      seat_limit: number | null;
      seats_used: number;
    }>(
      `SELECT o.id, o.name, o.seat_limit,
              (SELECT count(*) FROM org_seats s WHERE s.org_id = o.id) AS seats_used
         FROM orgs o
        WHERE o.owner_user_id = $1
        ORDER BY o.created_at`,
      [user.uid],
    );
    return res.json({
      orgs: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        seatLimit: o.seat_limit,
        seatsUsed: o.seats_used,
      })),
    });
  }),
);

orgRouter.get(
  "/:orgId/cohort-readiness",
  handler(async (req, res) => {
    const user = requireUser(req);
    const org = await ownedOrg(param(req.params.orgId), user.uid);
    const threshold = 75;
    const banks = [...DEFAULT_ORG_BANKS];

    // One pass over the roster, left-joining each seat's account, entitlement and
    // synced progress. Seats exist before their invitee has an account, so every
    // join is outer and the nulls are meaningful.
    const rows = await query<{
      email: string;
      pdpl_consent: boolean | null;
      status: string;
      plan: string | null;
      expires_at: Date | null;
      source: string | null;
      summary: ProgressSummaryLike | null;
      progress_updated_at: Date | null;
    }>(
      `SELECT s.email, s.pdpl_consent, s.status,
              e.plan, e.expires_at, e.source,
              sp.summary, sp.updated_at AS progress_updated_at
         FROM org_seats s
         LEFT JOIN users u  ON u.email = s.email
         LEFT JOIN entitlements e   ON e.user_id = u.id
         LEFT JOIN study_progress sp ON sp.user_id = u.id AND s.pdpl_consent = true
        WHERE s.org_id = $1
        ORDER BY s.email`,
      [org.id],
    );

    let totalHealth = 0;
    let totalProb = 0;
    const now = new Date().getTime();

    const cohort = rows.map((r) => {
      const entitlement: Entitlement | null = r.plan
        ? {
          plan: r.plan as Entitlement["plan"],
          ...(r.expires_at ? { expiresAt: r.expires_at.toISOString() } : {}),
          ...(r.source ? { source: r.source as Entitlement["source"] } : {}),
        }
        : null;
      const summary = r.summary
        ? { ...r.summary, updatedAt: r.progress_updated_at?.toISOString() }
        : null;
      
      // If status is explicitly revoked, the user should be shown as revoked
      const baseRow = cohortRow({ email: r.email, entitlement, hasInvite: r.status !== 'revoked', summary }, banks, threshold);
      const row = {
        ...baseRow,
        status: r.status === 'revoked' ? 'revoked' : baseRow.status,
        pdplConsent: !!r.pdpl_consent,
      };
      // 5-Factor Health Score
      const f1Exam = (row.examBest || 0) / 100;
      const f2Coverage = row.totalBanks > 0 ? row.coveredBanks / row.totalBanks : 0;
      
      let f3Recency = 0;
      if (r.progress_updated_at) {
        const daysSince = (now - r.progress_updated_at.getTime()) / (1000 * 3600 * 24);
        if (daysSince <= 7) f3Recency = 1;
        else if (daysSince <= 30) f3Recency = 0.5;
      }
      
      const f4Consent = row.pdplConsent ? 1 : 0;
      const f5Active = row.status === 'active' ? 1 : 0;

      const health = (0.3 * f1Exam) + (0.3 * f2Coverage) + (0.2 * f3Recency) + (0.1 * f4Consent) + (0.1 * f5Active);
      totalHealth += health;

      // Pass Probability (Logistic approximation based on exam score and coverage)
      const prob = (f1Exam * 0.7) + (f2Coverage * 0.3);
      totalProb += prob;

      return row;
    });

    const cohortHealthScore = cohort.length > 0 ? Math.round((totalHealth / cohort.length) * 100) : 0;
    const cohortPassProbability = cohort.length > 0 ? Math.round((totalProb / cohort.length) * 100) : 0;

    // Fire-and-forget: cache the pre-aggregated summary to the database (for B2B reporting pipelines)
    query(
      `INSERT INTO org_analytics_summary (org_id, health_score, pass_probability, updated_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (org_id) DO UPDATE SET health_score = EXCLUDED.health_score, pass_probability = EXCLUDED.pass_probability, updated_at = NOW()`,
      [org.id, cohortHealthScore, cohortPassProbability]
    ).catch(err => console.error("Failed to update org_analytics_summary", err));

    return res.json({
      orgId: org.id,
      name: org.name,
      threshold,
      banks,
      counts: {
        total: cohort.length,
        active: cohort.filter((c) => c.status === "active").length,
        ready: cohort.filter((c) => c.ready).length,
      },
      healthScore: cohortHealthScore,
      rows: cohort,
    });
  }),
);

orgRouter.post(
  "/:orgId/provision-seats",
  handler(async (req, res) => {
    const user = requireUser(req);
    const parsed = parseProvisionInput({ orgId: param(req.params.orgId), ...(req.body ?? {}) });
    if (!parsed.ok) throw badRequest(parsed.code);

    const org = await ownedOrg(parsed.value.orgId, user.uid);

    if (org.seat_limit !== null) {
      const used = await queryOne<{ count: number }>(
        "SELECT count(*)::int AS count FROM org_seats WHERE org_id = $1",
        [org.id],
      );
      const verdict = checkSeatLimit({
        seatsUsed: used?.count ?? 0,
        seatLimit: org.seat_limit,
        requested: parsed.value.emails.length,
      });
      if (!verdict.ok) throw new HttpError(429, "resource-exhausted", verdict.message);
    }

    const results = await Promise.all(
      parsed.value.emails.map(async (raw) => {
        const email = inviteKeyForEmail(raw);
        if (!email) return { email: raw, success: false, error: "invalid-email" };
        try {
          await query(
            `INSERT INTO org_seats (org_id, email, status, source, expires_at)
             VALUES ($1, $2, 'invited', 'invite', $3)
             ON CONFLICT (org_id, email) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
            [org.id, email, seatExpiry(parsed.value.expiresAt)],
          );
          return { email, success: true };
        } catch (err) {
          console.error("provisionSeats failed for", email, err);
          return { email, success: false, error: "write-failed" };
        }
      }),
    );

    return res.json({ results });
  }),
);

orgRouter.post(
  "/:orgId/revoke-seat",
  handler(async (req, res) => {
    const user = requireUser(req);
    const orgId = param(req.params.orgId);
    const rawEmail = req.body?.email;
    const email = inviteKeyForEmail(typeof rawEmail === "string" ? rawEmail : "");

    if (!email) throw badRequest("invalid-email");

    const org = await ownedOrg(orgId, user.uid);

    // Get the seat to find if it's claimed
    const seat = await queryOne<{ claimed_by: string | null }>(
      "SELECT claimed_by FROM org_seats WHERE org_id = $1 AND email = $2",
      [org.id, email],
    );

    if (!seat) {
      throw new HttpError(404, "not-found", "Seat not found");
    }

    // Begin transaction? We can just run queries, they are sequential.
    // If it's claimed, remove the school entitlement
    if (seat.claimed_by) {
      await query(
        "DELETE FROM entitlements WHERE user_id = $1 AND plan = 'school' AND source IN ('school', 'invite')",
        [seat.claimed_by]
      );
    }

    // Update seat status to revoked
    await query(
      "UPDATE org_seats SET status = 'revoked', claimed_by = NULL WHERE org_id = $1 AND email = $2",
      [org.id, email]
    );

    return res.json({ success: true });
  }),
);
