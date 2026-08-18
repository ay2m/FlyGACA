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
import { parseProvisionInput, checkSeatLimit, DEFAULT_ORG_BANKS } from "../org-core.js";
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
      plan: string | null;
      expires_at: Date | null;
      source: string | null;
      summary: ProgressSummaryLike | null;
      progress_updated_at: Date | null;
    }>(
      `SELECT s.email,
              e.plan, e.expires_at, e.source,
              sp.summary, sp.updated_at AS progress_updated_at
         FROM org_seats s
         LEFT JOIN users u  ON u.email = s.email
         LEFT JOIN entitlements e   ON e.user_id = u.id
         LEFT JOIN study_progress sp ON sp.user_id = u.id
        WHERE s.org_id = $1
        ORDER BY s.email`,
      [org.id],
    );

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
      return cohortRow({ email: r.email, entitlement, hasInvite: true, summary }, banks, threshold);
    });

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
            [org.id, email, parsed.value.expiresAt ?? null],
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
