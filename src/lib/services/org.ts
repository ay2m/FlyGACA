/**
 * Client for the B2B org-admin routes (`/api/org/*`) that back the
 * `/business/admin` cohort dashboard. The server re-verifies org ownership on every
 * call — this is a thin typed wrapper. Inert in the local-first build (no API base
 * URL) and best-effort: a network/permission failure resolves to a safe empty result
 * so the page can render a "no access" state rather than throw.
 */
import { apiTry } from '@/lib/services/backend';

/** One cohort member row — seat status + study readiness (mirrors school-core.CohortRow). */
export interface CohortRow {
  email: string;
  status: 'active' | 'expired' | 'invited' | 'none';
  source: string;
  coverage: string; // "covered/total"
  coveredBanks: number;
  totalBanks: number;
  examBest: number;
  ready: boolean;
  hasProgress: boolean;
  lastActive: string;
  pdplConsent: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  seatLimit: number | null;
  seatsUsed: number;
}

export interface CohortReadiness {
  orgId: string;
  name: string;
  threshold: number;
  banks: string[];
  counts: { total: number; active: number; ready: number };
  healthScore: number;
  passProbability: number;
  rows: CohortRow[];
}

/** Orgs the signed-in user owns (empty when none / not signed in / no backend). */
export async function getMyOrgs(): Promise<OrgSummary[]> {
  const data = await apiTry<{ orgs?: OrgSummary[] }>('/org/mine', {}, {});
  return data.orgs ?? [];
}

/** Cohort seat status + readiness for one org the caller owns, or null if not permitted. */
export async function getCohortReadiness(orgId: string): Promise<CohortReadiness | null> {
  return apiTry<CohortReadiness | null>(
    `/org/${encodeURIComponent(orgId)}/cohort-readiness`,
    {},
    null,
  );
}

/** Provision new seats for an org (add email invites). Returns success/error for each email. */
export async function provisionSeats(
  orgId: string,
  emails: string[],
  expiresAt?: string,
): Promise<{ results: Array<{ email: string; success: boolean; error?: string }> } | null> {
  return apiTry(
    `/org/${encodeURIComponent(orgId)}/provision-seats`,
    { method: 'POST', body: { emails, expiresAt } },
    null,
  );
}
